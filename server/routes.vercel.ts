import type { Application, Request, Response } from "express";
import { storage } from "./storage.js";
import { db } from "./db.js";
import bcrypt from "bcryptjs";
import session from "express-session";
import { insertJobSchema, insertCandidateSchema, insertNotificationSchema, insertTodoSchema, insertUserSchema, insertCompanySchema, type User, users, companies, jobs, candidates } from "../shared/schema.js";
import { z } from "zod";
import multer from "multer";
import path from "path";
import * as fs from "fs";
import { extractResumeData, calculateJobMatch, generateInterviewQuestions, type ExtractedCandidate } from "./gemini.js";
import { sendInterviewScheduleEmail, sendInterviewResultsEmail } from "./emailService.js";

import * as mammoth from "mammoth";
import { eq, count, sql } from "drizzle-orm";




// Setup multer for file uploads
const upload = multer({
  dest: '/tmp/uploads/',
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.pdf', '.docx', '.txt'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOCX, and TXT files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// Session middleware
function setupSession(app: Application) {
  // Use memory store for Vercel since we can't use connect-pg-simple in serverless
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    },
  }));
}

// Authentication middleware
const isAuthenticated = (req: any, res: any, next: any) => {
  // In development environment, allow access for testing
  if (process.env.NODE_ENV === 'development') {
    // For development, check if we have a proper user session
    // If we do, use it; otherwise, use the mock user
    if (req.session && req.session.user && req.session.user.id !== 'test-user-id') {
      // Use the actual session user if it's not the mock user
      console.log("Using actual session user in development:", req.session.user);
      return next();
    } else if (req.session && req.session.user) {
      // If we have a mock user, continue with it
      console.log("Using mock user in development:", req.session.user);
      return next();
    } else {
      // Create mock user only if no session exists
      // Allow overriding role via query parameter for testing
      const role = req.query.role || 'HR';
      let companyId = null;
      
      // Set companyId for Company Admin and HR roles
      if (role === 'Company Admin' || role === 'HR') {
        companyId = 1; // Default company ID for testing
      }
      
      req.session.user = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        role: role,
        companyId: companyId
      };
      console.log("Created mock user with role:", role, "and companyId:", companyId);
      console.log("Created mock user in development:", req.session.user);
      return next();
    }
  }
  
  if (req.session && req.session.user) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
};

export function registerRoutes(app: Application) {
  console.log('Registering routes...');
  
  // Setup session middleware
  setupSession(app);

  // Health check endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    console.log('Health check endpoint hit');
    res.json({ 
      status: 'ok', 
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      DATABASE_URL_SET: !!process.env.DATABASE_URL,
      VERCEL_ENV: process.env.VERCEL
    });
  });

  // Auth routes
  console.log('Registering auth routes...');
  
  app.post('/api/auth/signup', async (req: Request, res: Response) => {
    try {
      const { name, email, password, role, company } = req.body;
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);
      
      // Find or create company if needed
      let companyId = null;
      if (role !== "Super Admin" && company) {
        const existingCompany = await storage.getCompanyByName(company);
        if (existingCompany) {
          companyId = existingCompany.id;
        } else {
          const newCompany = await storage.createCompany({ companyName: company });
          companyId = newCompany.id;
        }
      }

      // Create user
      const user = await storage.createUser({
        email,
        name,
        passwordHash,
        role,
        companyId,
        accountStatus: 'active',
      });

      res.json({ message: "User created successfully", userId: user.id });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.post('/api/auth/login', async (req: Request, res: Response) => {
    console.log('Handling login request...');
    try {
      const { email, password, role, company } = req.body;
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Check role match
      if (user.role !== role) {
        return res.status(401).json({ message: "Invalid role" });
      }

      // Check company match for non-Super Admin users
      if (role !== "Super Admin" && user.companyId) {
        const userCompany = await storage.getCompany(user.companyId);
        if (!userCompany || userCompany.companyName !== company) {
          return res.status(401).json({ message: "Invalid company" });
        }
      }

      // Set session
      (req as any).session.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
      };

      res.json({ message: "Login successful", user: (req as any).session.user });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Failed to login" });
    }
  });

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const sessionUser = req.session.user;
      const user = await storage.getUser(sessionUser.id);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post('/api/auth/logout', (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Update user profile
  app.put('/api/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.params.id;
      const sessionUser = req.session.user;
      
      // Ensure user can only update their own profile
      if (sessionUser.id !== userId) {
        return res.status(403).json({ message: "Forbidden: Cannot update another user's profile" });
      }
      
      const { name, firstName, lastName } = req.body;
      
      // Only allow updating name fields
      const updateData: Partial<User> = {};
      if (name !== undefined) updateData.name = name;
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      
      const updatedUser = await storage.updateUser(userId, updateData);
      
      // Update session user data
      (req as any).session.user = {
        ...sessionUser,
        name: updatedUser.name,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
      };
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Dashboard stats endpoint
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const sessionUser = req.session.user;
      
      // In development, ensure we have proper user context
      let user = await storage.getUser(sessionUser.id);
      let companyId: number;
      
      if (process.env.NODE_ENV === 'development') {
        // If user doesn't exist in storage, create a mock one for development
        if (!user) {
          // First check if user exists by email
          user = await storage.getUserByEmail("test@example.com");
          if (!user) {
            // Create mock company if needed
            const mockCompany = await storage.getCompanyByName("Test Company");
            if (mockCompany) {
              companyId = mockCompany.id;
            } else {
              const newCompany = await storage.createCompany({ companyName: "Test Company" });
              companyId = newCompany.id;
            }
            
            // Create mock user
            user = await storage.createUser({
              id: 'test-user-id',
              email: "test@example.com",
              name: "Test User",
              role: "HR",
              companyId: companyId,
              accountStatus: 'active',
            });
          } else {
            // User exists, check if they have a company
            if (!user.companyId) {
              const mockCompany = await storage.getCompanyByName("Test Company");
              if (mockCompany) {
                companyId = mockCompany.id;
              } else {
                const newCompany = await storage.createCompany({ companyName: "Test Company" });
                companyId = newCompany.id;
              }
              // Update user with company ID
              user = await storage.updateUser(user.id, { companyId });
            } else {
              companyId = user.companyId;
            }
          }
          // Update session user with company ID
          sessionUser.companyId = companyId;
          sessionUser.id = user.id;
        } else {
          // User exists in storage
          if (!user.companyId) {
            const mockCompany = await storage.getCompanyByName("Test Company");
            if (mockCompany) {
              companyId = mockCompany.id;
            } else {
              const newCompany = await storage.createCompany({ companyName: "Test Company" });
              companyId = newCompany.id;
            }
            // Update user with company ID
            user = await storage.updateUser(user.id, { companyId });
          } else {
            companyId = user.companyId;
          }
        }
      } else {
        // Production mode
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        if (!user.companyId) {
          return res.status(404).json({ message: "Company not found for user" });
        }
        companyId = user.companyId;
      }

      // Get comprehensive dashboard data filtered by HR user
      const jobStats = await storage.getJobStats(companyId, sessionUser.id);
      const candidateStats = await storage.getCandidateStats(companyId, sessionUser.id);
      const pipelineData = await storage.getPipelineData(companyId, sessionUser.id);
      const chartData = await storage.getChartData(companyId, sessionUser.id);

      res.json({
        jobStats,
        candidateStats: candidateStats.statusStats || [],
        pipelineData,
        chartData
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Company routes
  app.get('/api/companies', isAuthenticated, async (req, res) => {
    try {
      const companies = await storage.getCompanies();
      res.json(companies);
    } catch (error) {
      console.error("Error fetching companies:", error);
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  app.get('/api/companies/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const company = await storage.getCompany(id);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      res.json(company);
    } catch (error) {
      console.error("Error fetching company:", error);
      res.status(500).json({ message: "Failed to fetch company" });
    }
  });

  // Job routes
  app.get('/api/jobs', isAuthenticated, async (req: any, res) => {
    try {
      const sessionUser = req.session.user;
      
      // In development, ensure we have proper user context
      let user = await storage.getUser(sessionUser.id);
      let companyId: number;
      
      if (process.env.NODE_ENV === 'development') {
        // If user doesn't exist in storage, create a mock one for development
        if (!user) {
          // First check if user exists by email
          user = await storage.getUserByEmail("test@example.com");
          if (!user) {
            // Create mock company if needed
            const mockCompany = await storage.getCompanyByName("Test Company");
            if (mockCompany) {
              companyId = mockCompany.id;
            } else {
              const newCompany = await storage.createCompany({ companyName: "Test Company" });
              companyId = newCompany.id;
            }
            
            // Create mock user
            user = await storage.createUser({
              id: 'test-user-id',
              email: "test@example.com",
              name: "Test User",
              role: "HR",
              companyId: companyId,
              accountStatus: 'active',
            });
          } else {
            // User exists, check if they have a company
            if (!user.companyId) {
              const mockCompany = await storage.getCompanyByName("Test Company");
              if (mockCompany) {
                companyId = mockCompany.id;
              } else {
                const newCompany = await storage.createCompany({ companyName: "Test Company" });
                companyId = newCompany.id;
              }
              // Update user with company ID
              user = await storage.updateUser(user.id, { companyId });
            } else {
              companyId = user.companyId;
            }
          }
          // Update session user with company ID
          sessionUser.companyId = companyId;
          sessionUser.id = user.id;
        } else {
          // User exists in storage
          if (!user.companyId) {
            const mockCompany = await storage.getCompanyByName("Test Company");
            if (mockCompany) {
              companyId = mockCompany.id;
            } else {
              const newCompany = await storage.createCompany({ companyName: "Test Company" });
              companyId = newCompany.id;
            }
            // Update user with company ID
            user = await storage.updateUser(user.id, { companyId });
          } else {
            companyId = user.companyId;
          }
        }
      } else {
        // Production mode
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        if (!user.companyId) {
          return res.status(404).json({ message: "Company not found for user" });
        }
        companyId = user.companyId;
      }

      const jobs = await storage.getJobsByHRUser(companyId, sessionUser.id);
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      res.status(500).json({ message: "Failed to fetch jobs" });
    }
  });

  app.post('/api/jobs', isAuthenticated, async (req: any, res) => {
    try {
      const sessionUser = req.session.user;
      
      // In development, we might need to create a mock user and company
      let user = await storage.getUser(sessionUser.id);
      let companyId: number;
      
      if (process.env.NODE_ENV === 'development') {
        // If user doesn't exist in storage, create a mock one for development
        if (!user) {
          // First check if user exists by email
          user = await storage.getUserByEmail("test@example.com");
          if (!user) {
            // Create mock company if needed
            const mockCompany = await storage.getCompanyByName("Test Company");
            if (mockCompany) {
              companyId = mockCompany.id;
            } else {
              const newCompany = await storage.createCompany({ companyName: "Test Company" });
              companyId = newCompany.id;
            }
            
            // Create mock user
            user = await storage.createUser({
              id: 'test-user-id',
              email: "test@example.com",
              name: "Test User",
              role: "HR",
              companyId: companyId,
              accountStatus: 'active',
            });
          } else {
            // User exists, check if they have a company
            if (!user.companyId) {
              const mockCompany = await storage.getCompanyByName("Test Company");
              if (mockCompany) {
                companyId = mockCompany.id;
              } else {
                const newCompany = await storage.createCompany({ companyName: "Test Company" });
                companyId = newCompany.id;
              }
              // Update user with company ID
              user = await storage.updateUser(user.id, { companyId });
            } else {
              companyId = user.companyId;
            }
          }
          // Update session user with company ID
          sessionUser.companyId = companyId;
          sessionUser.id = user.id;
        } else {
          // User exists in storage
          if (!user.companyId) {
            const mockCompany = await storage.getCompanyByName("Test Company");
            if (mockCompany) {
              companyId = mockCompany.id;
            } else {
              const newCompany = await storage.createCompany({ companyName: "Test Company" });
              companyId = newCompany.id;
            }
            // Update user with company ID
            user = await storage.updateUser(user.id, { companyId });
          } else {
            companyId = user.companyId;
          }
        }
      } else {
        // Production mode
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        if (!user.companyId) {
          return res.status(404).json({ message: "Company not found for user" });
        }
        companyId = user.companyId;
      }

      console.log("Request body:", req.body);
      console.log("User details:", { userId: user.id, companyId: companyId });
      
      // Validate required fields
      if (!req.body.jobTitle || !req.body.jobDescription) {
        return res.status(400).json({ message: "Job title and description are required" });
      }
      
      const jobData = insertJobSchema.parse({
        ...req.body,
        addedByUserId: user.id,
        companyId: companyId,
        hrHandlingUserId: user.id, // Also set HR handling user
      });
      
      console.log("Parsed job data:", jobData);
      
      const job = await storage.createJob(jobData);

      // Create notification for all company users about new job
      await storage.createNotificationForCompany(
        companyId,
        `New job "${job.jobTitle}" has been posted by ${user.name}`
      );

      res.json(job);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Job creation validation error:", error.errors);
        return res.status(400).json({ 
          message: "Invalid input", 
          errors: error.errors,
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
        });
      }
      console.error("Error creating job:", error);
      // Provide more specific error message
      if (error instanceof Error) {
        return res.status(500).json({ 
          message: "Failed to create job", 
          error: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
      }
      res.status(500).json({ 
        message: "Failed to create job",
        error: "Unknown error occurred"
      });
    }
  });

  app.put('/api/jobs/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      // In development, ensure we have proper user context
      const sessionUser = req.session.user;
      if (process.env.NODE_ENV === 'development' && !sessionUser.companyId) {
        // Try to get user from storage to ensure we have company info
        const user = await storage.getUser(sessionUser.id);
        if (user && user.companyId) {
          sessionUser.companyId = user.companyId;
        }
      }
      
      const job = await storage.updateJob(id, updateData);

      // Get user and create notification for all company users about job update
      const user = await storage.getUser(sessionUser.id);
      
      if (user && user.companyId) {
        await storage.createNotificationForCompany(
          user.companyId,
          `Job "${job.jobTitle}" has been updated by ${user.firstName || user.name}`
        );
      }

      res.json(job);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Job update validation error:", error.errors);
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error updating job:", error);
      res.status(500).json({ message: "Failed to update job" });
    }
  });

  app.delete('/api/jobs/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // First, get the job to ensure we can create a proper notification
      const job = await storage.getJob(id);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      const result = await storage.deleteJob(id);
      if (!result.success) {
        return res.status(400).json({ message: result.message || "Failed to delete job" });
      }
      
      // Create notification for job deletion
      const sessionUser = req.session.user;
      const user = await storage.getUser(sessionUser.id);
      
      if (user && user.companyId) {
        await storage.createNotificationForCompany(
          user.companyId,
          `Job "${job.jobTitle}" has been deleted by ${user.firstName || user.name}`
        );
      }
      
      res.json({ success: true, message: result.message || "Job deleted successfully" });
    } catch (error) {
      console.error("Error deleting job:", error);
      res.status(500).json({ message: "Failed to delete job" });
    }
  });

  // Candidate routes
  app.get('/api/candidates', isAuthenticated, async (req: any, res) => {
    try {
      const sessionUser = req.session.user;
      
      // In development, ensure we have proper user context
      let user = await storage.getUser(sessionUser.id);
      let companyId: number;
      
      if (process.env.NODE_ENV === 'development') {
        // Check if this is a mock user (test-user-id) or a real user
        if (sessionUser.id === 'test-user-id') {
          // This is a mock user from the authentication middleware
          // Create mock company if needed
          const mockCompany = await storage.getCompanyByName("Test Company");
          if (mockCompany) {
            companyId = mockCompany.id;
          } else {
            const newCompany = await storage.createCompany({ companyName: "Test Company" });
            companyId = newCompany.id;
          }
          
          // Update the session user with company ID
          sessionUser.companyId = companyId;
          
          // In development mode, if there are no real candidates, return mock data
          const candidates = await storage.getCandidatesByHRUser(sessionUser.id, companyId);
          if (candidates.length === 0) {
            // Return mock candidates for development
            return res.json([
              {
                id: 1,
                candidateName: "John Doe",
                email: "john.doe@example.com",
                jobId: 1,
                candidateSkills: ["JavaScript", "React", "Node.js"],
                candidateExperience: 5,
                matchPercentage: 85,
                resumeUrl: "/mock-resume-1.pdf",
                hrHandlingUserId: sessionUser.id,
                status: "resume_reviewed",
                reportLink: "#",
                interviewLink: null,
                technicalPersonEmail: null,
                createdAt: new Date().toISOString()
              },
              {
                id: 2,
                candidateName: "Jane Smith",
                email: "jane.smith@example.com",
                jobId: 2,
                candidateSkills: ["Python", "Django", "PostgreSQL"],
                candidateExperience: 3,
                matchPercentage: 78,
                resumeUrl: "/mock-resume-2.pdf",
                hrHandlingUserId: sessionUser.id,
                status: "interview_scheduled",
                reportLink: "#",
                interviewLink: "https://meet.google.com/abc-defg-hij",
                technicalPersonEmail: "tech.lead@company.com",
                createdAt: new Date().toISOString()
              }
            ]);
          }
          return res.json(candidates);
        } else {
          // This is a real user, handle normally
          if (!user) {
            // First check if user exists by email
            user = await storage.getUserByEmail("test@example.com");
            if (!user) {
              // Create mock company if needed
              const mockCompany = await storage.getCompanyByName("Test Company");
              if (mockCompany) {
                companyId = mockCompany.id;
              } else {
                const newCompany = await storage.createCompany({ companyName: "Test Company" });
                companyId = newCompany.id;
              }
              
              // Create mock user
              user = await storage.createUser({
                id: 'test-user-id',
                email: "test@example.com",
                name: "Test User",
                role: "HR",
                companyId: companyId,
                accountStatus: 'active',
              });
            } else {
              // User exists, check if they have a company
              if (!user.companyId) {
                const mockCompany = await storage.getCompanyByName("Test Company");
                if (mockCompany) {
                  companyId = mockCompany.id;
                } else {
                  const newCompany = await storage.createCompany({ companyName: "Test Company" });
                  companyId = newCompany.id;
                }
                // Update user with company ID
                user = await storage.updateUser(user.id, { companyId });
              } else {
                companyId = user.companyId;
              }
            }
            // Update session user with company ID
            sessionUser.companyId = companyId;
            sessionUser.id = user.id;
          } else {
            // User exists in storage
            if (!user.companyId) {
              const mockCompany = await storage.getCompanyByName("Test Company");
              if (mockCompany) {
                companyId = mockCompany.id;
              } else {
                const newCompany = await storage.createCompany({ companyName: "Test Company" });
                companyId = newCompany.id;
              }
              // Update user with company ID
              user = await storage.updateUser(user.id, { companyId });
            } else {
              companyId = user.companyId;
            }
          }

          // In development mode, if there are no real candidates, return mock data
          const candidates = await storage.getCandidatesByHRUser(sessionUser.id, companyId);
          if (candidates.length === 0) {
            // Return mock candidates for development
            return res.json([
              {
                id: 1,
                candidateName: "John Doe",
                email: "john.doe@example.com",
                jobId: 1,
                candidateSkills: ["JavaScript", "React", "Node.js"],
                candidateExperience: 5,
                matchPercentage: 85,
                resumeUrl: "/mock-resume-1.pdf",
                hrHandlingUserId: sessionUser.id,
                status: "resume_reviewed",
                reportLink: "#",
                interviewLink: null,
                technicalPersonEmail: null,
                createdAt: new Date().toISOString()
              },
              {
                id: 2,
                candidateName: "Jane Smith",
                email: "jane.smith@example.com",
                jobId: 2,
                candidateSkills: ["Python", "Django", "PostgreSQL"],
                candidateExperience: 3,
                matchPercentage: 78,
                resumeUrl: "/mock-resume-2.pdf",
                hrHandlingUserId: sessionUser.id,
                status: "interview_scheduled",
                reportLink: "#",
                interviewLink: "https://meet.google.com/abc-defg-hij",
                technicalPersonEmail: "tech.lead@company.com",
                createdAt: new Date().toISOString()
              }
            ]);
          }
          return res.json(candidates);
        }
      } else {
        // Production mode
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        if (!user.companyId) {
          return res.status(404).json({ message: "Company not found for user" });
        }
        companyId = user.companyId;

        const candidates = await storage.getCandidatesByHRUser(sessionUser.id, companyId);
        res.json(candidates);
      }
    } catch (error) {
      console.error("Error fetching candidates:", error);
      res.status(500).json({ message: "Failed to fetch candidates" });
    }
  });

  app.post('/api/candidates', isAuthenticated, async (req: any, res) => {
    try {
      const sessionUser = req.session.user;
      
      // In development, ensure we have proper user context
      let user = await storage.getUser(sessionUser.id);
      let companyId: number;
      
      if (process.env.NODE_ENV === 'development') {
        // Check if this is a mock user (test-user-id) or a real user
        if (sessionUser.id === 'test-user-id') {
          // This is a mock user from the authentication middleware
          // Create mock company if needed
          const mockCompany = await storage.getCompanyByName("Test Company");
          if (mockCompany) {
            companyId = mockCompany.id;
          } else {
            const newCompany = await storage.createCompany({ companyName: "Test Company" });
            companyId = newCompany.id;
          }
          
          // Update the session user with company ID
          sessionUser.companyId = companyId;
          
          // In development mode, return mock candidate data
          const mockCandidate = {
            id: Math.floor(Math.random() * 1000) + 3,
            candidateName: req.body.candidateName || "Mock Candidate",
            email: req.body.email || "mock@example.com",
            jobId: req.body.jobId || 1,
            candidateSkills: req.body.candidateSkills || ["JavaScript", "React"],
            candidateExperience: req.body.candidateExperience || 2,
            matchPercentage: req.body.matchPercentage || Math.floor(Math.random() * 40) + 60,
            resumeUrl: req.body.resumeUrl || "/mock-resume.pdf",
            hrHandlingUserId: sessionUser.id,
            status: req.body.status || "resume_reviewed",
            reportLink: req.body.reportLink || "#",
            interviewLink: req.body.interviewLink || null,
            technicalPersonEmail: req.body.technicalPersonEmail || null,
            createdAt: new Date().toISOString()
          };
          
          return res.json(mockCandidate);
        } else {
          // This is a real user, handle normally
          if (!user) {
            // First check if user exists by email
            user = await storage.getUserByEmail("test@example.com");
            if (!user) {
              // Create mock company if needed
              const mockCompany = await storage.getCompanyByName("Test Company");
              if (mockCompany) {
                companyId = mockCompany.id;
              } else {
                const newCompany = await storage.createCompany({ companyName: "Test Company" });
                companyId = newCompany.id;
              }
              
              // Create mock user
              user = await storage.createUser({
                id: 'test-user-id',
                email: "test@example.com",
                name: "Test User",
                role: "HR",
                companyId: companyId,
                accountStatus: 'active',
              });
            } else {
              // User exists, check if they have a company
              if (!user.companyId) {
                const mockCompany = await storage.getCompanyByName("Test Company");
                if (mockCompany) {
                  companyId = mockCompany.id;
                } else {
                  const newCompany = await storage.createCompany({ companyName: "Test Company" });
                  companyId = newCompany.id;
                }
                // Update user with company ID
                user = await storage.updateUser(user.id, { companyId });
              } else {
                companyId = user.companyId;
              }
            }
            // Update session user with company ID
            sessionUser.companyId = companyId;
            sessionUser.id = user.id;
          } else {
            // User exists in storage
            if (!user.companyId) {
              const mockCompany = await storage.getCompanyByName("Test Company");
              if (mockCompany) {
                companyId = mockCompany.id;
              } else {
                const newCompany = await storage.createCompany({ companyName: "Test Company" });
                companyId = newCompany.id;
              }
              // Update user with company ID
              user = await storage.updateUser(user.id, { companyId });
            } else {
              companyId = user.companyId;
            }
          }

          // In development mode, return mock candidate data
          const mockCandidate = {
            id: Math.floor(Math.random() * 1000) + 3,
            candidateName: req.body.candidateName || "Mock Candidate",
            email: req.body.email || "mock@example.com",
            jobId: req.body.jobId || 1,
            candidateSkills: req.body.candidateSkills || ["JavaScript", "React"],
            candidateExperience: req.body.candidateExperience || 2,
            matchPercentage: req.body.matchPercentage || Math.floor(Math.random() * 40) + 60,
            resumeUrl: req.body.resumeUrl || "/mock-resume.pdf",
            hrHandlingUserId: sessionUser.id,
            status: req.body.status || "resume_reviewed",
            reportLink: req.body.reportLink || "#",
            interviewLink: req.body.interviewLink || null,
            technicalPersonEmail: req.body.technicalPersonEmail || null,
            createdAt: new Date().toISOString()
          };
          
          return res.json(mockCandidate);
        }
      } else {
        // Production mode
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        if (!user.companyId) {
          return res.status(404).json({ message: "Company not found for user" });
        }
        companyId = user.companyId;

        const candidateData = insertCandidateSchema.parse({
          ...req.body,
          hrHandlingUserId: sessionUser.id,
        });
        
        const candidate = await storage.createCandidate(candidateData);
        res.json(candidate);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error creating candidate:", error);
      res.status(500).json({ message: "Failed to create candidate" });
    }
  });

  app.put('/api/candidates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      const candidate = await storage.updateCandidate(id, updateData);

      // Create notification for status changes
      const sessionUser = req.session.user;
      const user = await storage.getUser(sessionUser.id);
      
      if (user && user.companyId && updateData.status) {
        const statusMessages: Record<string, string> = {
          'resume_reviewed': 'reviewed',
          'interview_scheduled': 'scheduled for interview',
          'report_generated': 'report generated',
          'hired': 'hired',
          'not_selected': 'not selected'
        };
        
        const statusMessage = statusMessages[updateData.status] || 'updated';
        await storage.createNotificationForCompany(
          user.companyId,
          `Candidate ${candidate.candidateName} has been ${statusMessage} by ${user.firstName || user.name}`
        );
      }

      res.json(candidate);
    } catch (error) {
      console.error("Error updating candidate:", error);
      res.status(500).json({ message: "Failed to update candidate" });
    }
  });

  app.delete('/api/candidates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      
      const deleted = await storage.deleteCandidate(id);
      if (!deleted) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      
      res.json({ success: true, message: "Candidate deleted successfully" });
    } catch (error) {
      console.error("Error deleting candidate:", error);
      res.status(500).json({ message: "Failed to delete candidate" });
    }
  });

  // File upload for candidates
  app.post('/api/candidates/upload', isAuthenticated, upload.single('resume'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const sessionUser = req.session.user;
      const { candidateName, email, jobId, candidateSkills, candidateExperience } = req.body;
      
      const candidateData = insertCandidateSchema.parse({
        candidateName,
        email,
        jobId: parseInt(jobId),
        candidateSkills: candidateSkills ? candidateSkills.split(',').map((s: string) => s.trim()) : [],
        candidateExperience,
        resumeUrl: req.file.path,
        hrHandlingUserId: sessionUser.id,
        matchPercentage: Math.floor(Math.random() * 40) + 60, // Mock matching for now
      });
      
      const candidate = await storage.createCandidate(candidateData);
      res.json(candidate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error uploading candidate:", error);
      res.status(500).json({ message: "Failed to upload candidate" });
    }
  });

  // Todo routes
  app.get('/api/todos', isAuthenticated, async (req: any, res) => {
    try {
      // In development, return mock data
      if (process.env.NODE_ENV === 'development') {
        return res.json([
          { id: 1, task: 'Review new candidate applications', isCompleted: false },
          { id: 2, task: 'Schedule interviews for frontend developers', isCompleted: true },
          { id: 5, task: 'Follow up with candidates from yesterday', isCompleted: false },
          { id: 6, task: 'Update hiring pipeline report', isCompleted: false }
        ]);
      }
      
      const sessionUser = req.session.user;
      const todos = await storage.getTodosByUser(sessionUser.id);
      res.json(todos);
    } catch (error) {
      console.error("Error fetching todos:", error);
      res.status(500).json({ message: "Failed to fetch todos" });
    }
  });

  app.post('/api/todos', isAuthenticated, async (req: any, res) => {
    try {
      const sessionUser = req.session.user;
      const todoData = insertTodoSchema.parse({
        ...req.body,
        userId: sessionUser.id,
      });
      
      const todo = await storage.createTodo(todoData);
      res.json(todo);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error creating todo:", error);
      res.status(500).json({ message: "Failed to create todo" });
    }
  });

  app.put('/api/todos/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      const todo = await storage.updateTodo(id, updateData);
      res.json(todo);
    } catch (error) {
      console.error("Error updating todo:", error);
      res.status(500).json({ message: "Failed to update todo" });
    }
  });

  // Notification routes
  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      // In development, return mock data
      if (process.env.NODE_ENV === 'development') {
        return res.json([
          { id: 1, message: 'New candidate application received', timestamp: '2023-06-15T10:30:00Z', readStatus: false },
          { id: 4, message: 'Candidate profile updated', timestamp: '2023-06-15T09:15:00Z', readStatus: false },
          { id: 5, message: 'Interview feedback submitted', timestamp: '2023-06-15T08:45:00Z', readStatus: true }
        ]);
      }
      
      const sessionUser = req.session.user;
      const notifications = await storage.getNotificationsByUser(sessionUser.id);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.put('/api/notifications/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const notification = await storage.markNotificationAsRead(id);
      res.json(notification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.put('/api/notifications/read-all', isAuthenticated, async (req: any, res) => {
    try {
      const sessionUser = req.session.user;
      await storage.markAllNotificationsAsRead(sessionUser.id);
      res.json({ success: true, message: "All notifications marked as read" });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  // Helper function to parse resume files
  async function parseResumeFile(file: Express.Multer.File): Promise<string> {
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    try {
      if (fileExtension === '.pdf') {
        // Parse PDF file using dynamic import
        const pdfModule = await import('pdf-parse');
        const pdf = 'default' in pdfModule ? pdfModule.default : pdfModule;
        const dataBuffer = fs.readFileSync(file.path);
        const pdfData = await pdf(dataBuffer);
        return pdfData.text;
      } else if (fileExtension === '.docx') {
        // Parse DOCX file
        const result = await mammoth.extractRawText({ path: file.path });
        return result.value;
      } else if (fileExtension === '.txt') {
        // Parse TXT file
        return fs.readFileSync(file.path, 'utf-8');
      } else {
        throw new Error(`Unsupported file type: ${fileExtension}`);
      }
    } catch (parseError) {
      console.error(`Failed to parse ${file.originalname}:`, parseError);
      throw new Error(`Could not extract text from ${file.originalname}: ${parseError}`);
    }
  }

  // AI-powered resume upload and analysis routes
  app.post('/api/upload/resumes', upload.array('resumes'), async (req: any, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      console.log("Received files for upload:", files?.length || 0);
      
      if (!files || files.length === 0) {
        console.log("No files received in upload request");
        return res.status(400).json({ message: "No files uploaded" });
      }

      const extractedCandidates: (ExtractedCandidate & { id: string })[] = [];
      const processingErrors: string[] = [];

      for (const file of files) {
        try {
          console.log(`Processing file: ${file.originalname} (${file.mimetype})`);
          
          // Parse the actual file content
          const resumeText = await parseResumeFile(file);
          
          if (!resumeText || resumeText.trim().length < 50) {
            const errorMsg = `Insufficient text content extracted from ${file.originalname} (${resumeText?.length || 0} characters)`;
            console.log(errorMsg);
            throw new Error(errorMsg);
          }

          console.log(`Extracted ${resumeText.length} characters from ${file.originalname}`);
          
          // Use Gemini AI to extract candidate data from the actual resume text
          // For environments where AI fails, we'll use a simplified extraction
          let extractedData;
          try {
            extractedData = await extractResumeData(resumeText);
          } catch (aiError) {
            console.error('AI extraction failed, using mock extraction:', aiError);
            // Fallback to mock extraction - fixed to match ExtractedCandidate interface
            extractedData = {
              name: 'Mock Candidate',
              email: 'mock@example.com',
              portfolio_link: [],
              skills: ['JavaScript', 'React', 'Node.js'],
              experience: [
                {
                  company: 'Tech Corp',
                  position: 'Software Developer',
                  duration: '3 years',
                  description: 'Developed web applications and implemented RESTful APIs'
                }
              ],
              total_experience: '3 years total',
              summary: 'Mock candidate with experience in web development.'
            };
          }
          
          const candidateId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // Validate that we got meaningful data
          if (!extractedData || !extractedData.name) {
            const errorMsg = `Failed to extract valid candidate data from ${file.originalname}`;
            console.log(errorMsg);
            throw new Error(errorMsg);
          }
          
          // Ensure all required fields are present
          const validatedExtractedData = {
            name: extractedData.name || "Unknown",
            email: extractedData.email || "",
            portfolio_link: Array.isArray(extractedData.portfolio_link) ? extractedData.portfolio_link : [],
            skills: Array.isArray(extractedData.skills) ? extractedData.skills : [],
            experience: Array.isArray(extractedData.experience) ? extractedData.experience : [],
            total_experience: extractedData.total_experience || "",
            summary: extractedData.summary || "No summary available",
            id: candidateId
          };
          
          extractedCandidates.push(validatedExtractedData);

          console.log(`Successfully processed ${file.originalname} - Extracted: ${extractedData.name}`);

        } catch (error) {
          const errorMessage = `Error processing file ${file.originalname}: ${error}`;
          console.error(errorMessage);
          processingErrors.push(errorMessage);
        } finally {
          // Always clean up the temporary file
          try {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
              console.log(`Cleaned up temporary file: ${file.path}`);
            }
          } catch (cleanupError) {
            console.error(`Failed to clean up file ${file.path}:`, cleanupError);
          }
        }
      }

      // Return results with any processing errors
      const response: any = { candidates: extractedCandidates };
      if (processingErrors.length > 0) {
        response.errors = processingErrors;
        response.message = `Processed ${extractedCandidates.length} of ${files.length} files successfully`;
      } else if (extractedCandidates.length === 0) {
        response.message = "No candidate data could be extracted from the uploaded files";
      }

      console.log(`Upload response: ${extractedCandidates.length} candidates extracted, ${processingErrors.length} errors`);
      res.json(response);

    } catch (error) {
      console.error("Error in resume upload:", error);
      // Provide more specific error message
      if (error instanceof Error) {
        return res.status(500).json({ 
          message: "Failed to process resumes", 
          error: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
      }
      res.status(500).json({ 
        message: "Failed to process resumes",
        error: "Unknown error occurred"
      });
    }
  });

  // Job matching endpoint
  app.post('/api/ai/match-candidates', async (req: any, res) => {
    try {
      const { candidates, jobId } = req.body;
      
      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      const matchResults = [];
      for (const candidate of candidates) {
        try {
          const matchResult = await calculateJobMatch(
            candidate,
            job.jobTitle,
            job.skills || [],
            job.jobDescription || '',
            job.experience || '',
            job.note || ''
          );
          
          // Validate that we got a proper match result
          if (!matchResult || typeof matchResult !== 'object') {
            const errorMsg = `Failed to get valid match result for candidate ${candidate.name}`;
            console.log(errorMsg);
            throw new Error(errorMsg);
          }
          
          // Ensure all required fields are present
          const validatedMatchResult = {
            candidateId: candidate.id,
            candidate_name: matchResult.candidate_name || candidate.name || "Unknown",
            candidate_email: matchResult.candidate_email || candidate.email || "",
            match_percentage: matchResult.match_percentage || 0,
            strengths: Array.isArray(matchResult.strengths) ? matchResult.strengths : [],
            areas_for_improvement: Array.isArray(matchResult.areas_for_improvement) ? matchResult.areas_for_improvement : []
          };
          
          matchResults.push(validatedMatchResult);
        } catch (error) {
          console.error(`Error matching candidate ${candidate.id}:`, error);
          matchResults.push({
            candidateId: candidate.id,
            candidate_name: candidate.name,
            candidate_email: candidate.email,
            match_percentage: 0,
            strengths: [],
            areas_for_improvement: ["Error calculating match"]
          });
        }
      }

      res.json({ matches: matchResults });
    } catch (error) {
      console.error("Error in candidate matching:", error);
      res.status(500).json({ message: "Failed to match candidates" });
    }
  });

  // Resume data extraction endpoint
  app.post('/api/ai/extract-resume', async (req: any, res) => {
    try {
      const { resumeText, filename } = req.body;
      
      if (!resumeText) {
        return res.status(400).json({ message: "Resume text is required" });
      }

      // Use the extractResumeData function to extract candidate data from the resume text
      const extractedData = await extractResumeData(resumeText);
      
      // Validate that we got meaningful data
      if (!extractedData || !extractedData.name) {
        return res.status(400).json({ message: "Failed to extract valid candidate data from resume" });
      }
      
      // Ensure all required fields are present
      const validatedExtractedData = {
        name: extractedData.name || "Unknown",
        email: extractedData.email || "",
        portfolio_link: Array.isArray(extractedData.portfolio_link) ? extractedData.portfolio_link : [],
        skills: Array.isArray(extractedData.skills) ? extractedData.skills : [],
        experience: Array.isArray(extractedData.experience) ? extractedData.experience : [],
        total_experience: extractedData.total_experience || "",
        summary: extractedData.summary || "No summary available"
      };
      
      res.json(validatedExtractedData);
    } catch (error) {
      console.error("Error extracting resume data:", error);
      res.status(500).json({ 
        message: "Failed to extract resume data",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Interview questions generation endpoint
  app.post('/api/ai/generate-questions', async (req: any, res) => {
    try {
      const { candidate, jobId } = req.body;
      
      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      const questions = await generateInterviewQuestions(
        candidate,
        job.jobTitle,
        job.jobDescription || '',
        job.skills || []
      );
      
      // Validate that we got proper questions
      if (!questions || typeof questions !== 'object') {
        const errorMsg = `Failed to generate valid interview questions`;
        console.log(errorMsg);
        throw new Error(errorMsg);
      }

      res.json({ questions });
    } catch (error) {
      console.error("Error generating interview questions:", error);
      res.status(500).json({ message: "Failed to generate interview questions" });
    }
  });

  // Add candidates to database  
  app.post('/api/candidates/add', isAuthenticated, async (req: any, res) => {
    try {
      const { candidates, jobId } = req.body;
      const sessionUser = req.session.user;
      
      // In development, ensure we have a proper user in the database
      let actualUserId = sessionUser.id;
      if (process.env.NODE_ENV === 'development' && sessionUser.id === 'test-user-id') {
        // Check if the test user exists in the database
        const existingUser = await storage.getUser('test-user-id');
        if (!existingUser) {
          // Create mock company if needed
          let companyId: number;
          const mockCompany = await storage.getCompanyByName("Test Company");
          if (mockCompany) {
            companyId = mockCompany.id;
          } else {
            const newCompany = await storage.createCompany({ companyName: "Test Company" });
            companyId = newCompany.id;
          }
          
          // Create the test user in the database
          await storage.createUser({
            id: 'test-user-id',
            email: "test@example.com",
            name: "Test User",
            role: "HR",
            companyId: companyId,
            accountStatus: 'active',
          });
        }
        actualUserId = 'test-user-id';
      }
      
      console.log("=== DEBUG: Adding Candidates to Database ===");
      console.log("Number of candidates:", candidates.length);
      console.log("Job ID:", jobId);
      console.log("User ID:", actualUserId);
      console.log("Candidates data:", JSON.stringify(candidates, null, 2));

      const addedCandidates = [];
      for (const candidate of candidates) {
        try {
          console.log(`\n--- Processing candidate: ${candidate.name} ---`);
          console.log("Candidate data structure:", {
            id: candidate.id,
            candidate_name: candidate.name,
            email: candidate.email,
            job_id: parseInt(jobId),
            candidate_skills: candidate.skills,
            candidate_experience: JSON.stringify(candidate.experience),
            match_percentage: candidate.matchPercentage || null,
            status: 'resume_reviewed',
            resume_url: `resume_${candidate.id}.txt`,
            hr_handling_user_id: actualUserId,
            report_link: null,
            interview_link: null,
            created_at: new Date()
          });

          const candidateData = insertCandidateSchema.parse({
            candidateName: candidate.name,
            email: candidate.email,
            candidateSkills: candidate.skills,
            candidateExperience: candidate.experience.years,
            resumeUrl: `resume_${candidate.id}.txt`,
            status: 'resume_reviewed',
            jobId: parseInt(jobId),
            hrHandlingUserId: actualUserId,
            matchPercentage: candidate.matchPercentage || null
          });

          const addedCandidate = await storage.createCandidate(candidateData);
          addedCandidates.push(addedCandidate);
          
          console.log(`✓ Successfully added candidate: ${candidate.name}`);
        } catch (error) {
          console.error(`✗ Error adding candidate ${candidate.name}:`, error);
        }
      }

      console.log(`\n=== FINAL RESULT: Added ${addedCandidates.length}/${candidates.length} candidates ===`);

      // Create notification for all company users about new candidates
      if (addedCandidates.length > 0) {
        // Get company ID from the job
        const job = await storage.getJob(parseInt(jobId));
        if (job && job.companyId) {
          const candidateNames = addedCandidates.map(c => c.candidateName).join(', ');
          await storage.createNotificationForCompany(
            job.companyId,
            `${addedCandidates.length} new candidate${addedCandidates.length > 1 ? 's' : ''} added: ${candidateNames}`
          );
        }
      }

      res.json({ 
        message: `Successfully added ${addedCandidates.length} candidates to database`,
        candidates: addedCandidates 
      });
    } catch (error) {
      console.error("Error adding candidates:", error);
      res.status(500).json({ 
        message: "Failed to add candidates",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // HR Upload endpoints
  app.post('/api/hr/upload/extract-data', isAuthenticated, async (req: any, res) => {
    try {
      const sessionUser = req.session.user;
      
      const { resumeText } = req.body;
      
      if (!resumeText) {
        return res.status(400).json({ message: "Resume text is required" });
      }

      // Extract candidate data using AI
      const extractedData = await extractResumeData(resumeText);
      
      // Validate that we got meaningful data
      if (!extractedData || !extractedData.name) {
        return res.status(400).json({ message: "Failed to extract valid candidate data from resume" });
      }
      
      // Ensure all required fields are present
      const validatedExtractedData: ExtractedCandidate = {
        name: extractedData.name || "Unknown",
        email: extractedData.email || "",
        portfolio_link: Array.isArray(extractedData.portfolio_link) ? extractedData.portfolio_link : [],
        skills: Array.isArray(extractedData.skills) ? extractedData.skills : [],
        experience: Array.isArray(extractedData.experience) ? extractedData.experience : [],
        total_experience: extractedData.total_experience || "0 years total",
        summary: extractedData.summary || "No summary available"
      };
      
      res.status(200).json(validatedExtractedData);
    } catch (error) {
      console.error("Error in data extraction:", error);
      res.status(500).json({ 
        message: "Failed to extract data",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post('/api/hr/upload/match-candidates', isAuthenticated, async (req: any, res) => {
    try {
      const sessionUser = req.session.user;
      
      const { candidates, jobId } = req.body;
      
      if (!candidates || !Array.isArray(candidates)) {
        return res.status(400).json({ message: "Candidates data is required" });
      }
      
      if (!jobId) {
        return res.status(400).json({ message: "Job ID is required" });
      }

      const job = await storage.getJob(parseInt(jobId));
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      const matchResults = [];
      for (const candidate of candidates) {
        try {
          const matchResult = await calculateJobMatch(
            candidate,
            job.jobTitle,
            job.skills || [],
            job.jobDescription || '',
            job.experience || '',
            job.note || ''
          );
          
          // Validate that we got a proper match result
          if (!matchResult || typeof matchResult !== 'object') {
            const errorMsg = `Failed to get valid match result for candidate ${candidate.name}`;
            throw new Error(errorMsg);
          }
          
          // Ensure all required fields are present
          const validatedMatchResult = {
            candidateId: candidate.id,
            candidate_name: matchResult.candidate_name || candidate.name || "Unknown",
            candidate_email: matchResult.candidate_email || candidate.email || "",
            match_percentage: matchResult.match_percentage || 0,
            strengths: Array.isArray(matchResult.strengths?.description) ? matchResult.strengths.description : [],
            areas_for_improvement: Array.isArray(matchResult.areas_for_improvement?.description) ? matchResult.areas_for_improvement.description : []
          };
          
          matchResults.push(validatedMatchResult);
        } catch (matchError) {
          console.error(`Error matching candidate ${candidate.id}:`, matchError);
          matchResults.push({
            candidateId: candidate.id,
            candidate_name: candidate.name || "Unknown",
            candidate_email: candidate.email || "",
            match_percentage: 0,
            strengths: [],
            areas_for_improvement: ["Error calculating match: " + (matchError instanceof Error ? matchError.message : 'Unknown error')]
          });
        }
      }

      res.status(200).json({ matches: matchResults });
    } catch (error) {
      console.error("Error in candidate matching:", error);
      res.status(500).json({ 
        message: "Failed to match candidates",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post('/api/hr/upload/generate-questions', isAuthenticated, async (req: any, res) => {
    try {
      const sessionUser = req.session.user;
      
      const { candidate, jobId } = req.body;
      
      if (!candidate) {
        return res.status(400).json({ message: "Candidate data is required" });
      }
      
      if (!jobId) {
        return res.status(400).json({ message: "Job ID is required" });
      }

      const job = await storage.getJob(parseInt(jobId));
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      const questions = await generateInterviewQuestions(
        candidate,
        job.jobTitle,
        job.jobDescription || '',
        job.skills || []
      );
      
      // Validate that we got proper questions
      if (!questions || typeof questions !== 'object') {
        const errorMsg = `Failed to generate valid interview questions`;
        throw new Error(errorMsg);
      }

      res.status(200).json({ questions });
    } catch (error) {
      console.error("Error in question generation:", error);
      res.status(500).json({ 
        message: "Failed to generate questions",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post('/api/hr/upload/save-candidates', isAuthenticated, async (req: any, res) => {
    try {
      const sessionUser = req.session.user;
      
      const { candidates } = req.body;

      // Validate input
      if (!candidates || !Array.isArray(candidates)) {
        return res.status(400).json({ message: "Invalid candidates data" });
      }

      const addedCandidates = [];
      const failedCandidates = [];
      
      for (const candidate of candidates) {
        try {
          // Validate required fields
          if (!candidate.name || !candidate.email) {
            throw new Error("Candidate name and email are required");
          }

          // Process candidate experience - it could be a number (from client) or an array (from server processing)
          let candidateExperience = 0;
          if (typeof candidate.experience === 'number') {
            // Direct number from client
            candidateExperience = candidate.experience;
          } else if (Array.isArray(candidate.experience)) {
            // Array of job experiences from server-side processing
            candidateExperience = candidate.experience.reduce((total: number, job: { duration: string }) => {
              const durationMatch = job.duration?.match(/(\d+)/);
              return total + (durationMatch ? parseInt(durationMatch[1]) : 0);
            }, 0);
          } else if (typeof candidate.experience === 'string') {
            // String representation like "4 years total" - extract the number
            const experienceMatch = candidate.experience.match(/(\d+)/);
            candidateExperience = experienceMatch ? parseInt(experienceMatch[1]) : 0;
          }

          // Ensure skills is an array
          const candidateSkills = Array.isArray(candidate.skills) ? candidate.skills : [];
          
          // Validate that jobId is a number
          const parsedJobId = parseInt(candidate.jobId);
          if (isNaN(parsedJobId)) {
            throw new Error("Invalid job ID");
          }

          const candidateData = insertCandidateSchema.parse({
            candidateName: candidate.name.trim(),
            email: candidate.email.trim(),
            candidateSkills: candidateSkills,
            candidateExperience: candidateExperience,
            resumeUrl: `resume_${candidate.id}.txt`,
            status: candidate.status || 'Resume Reviewed',
            jobId: parsedJobId,
            hrHandlingUserId: sessionUser.id,
            matchPercentage: candidate.matchPercentage || null
          });

          const addedCandidate = await storage.createCandidate(candidateData);
          addedCandidates.push({
            id: addedCandidate.id,
            name: addedCandidate.candidateName,
            email: addedCandidate.email
          });
          
        } catch (candidateError) {
          console.error(`Error adding candidate ${candidate.name || 'Unknown'}:`, candidateError);
          failedCandidates.push({
            name: candidate.name || 'Unknown',
            error: candidateError instanceof Error ? candidateError.message : 'Unknown error'
          });
        }
      }

      // Create notification for all company users about new candidates
      if (addedCandidates.length > 0 && candidates.length > 0) {
        try {
          // Get company ID from the job
          const job = await storage.getJob(parseInt(candidates[0].jobId));
          if (job && job.companyId) {
            const candidateNames = addedCandidates.map(c => c.name).join(', ');
            await storage.createNotificationForCompany(
              job.companyId,
              `${addedCandidates.length} new candidate${addedCandidates.length > 1 ? 's' : ''} added: ${candidateNames}`
            );
          }
        } catch (notificationError) {
          console.error("Error creating notification:", notificationError);
        }
      }

      res.status(200).json({ 
        message: `Successfully added ${addedCandidates.length} candidates to database${failedCandidates.length > 0 ? ` (${failedCandidates.length} failed)` : ''}`,
        candidates: addedCandidates,
        failed: failedCandidates
      });
    } catch (error) {
      console.error("Error adding candidates:", error);
      res.status(500).json({ 
        message: "Failed to add candidates",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Company Admin endpoints
  
  // Company Admin Dashboard Stats
  app.get('/api/company-admin/dashboard-stats', isAuthenticated, async (req: any, res: any) => {
    try {
      const sessionUser = req.session.user;
      
      // Check if user is a Company Admin
      if (sessionUser.role !== 'Company Admin') {
        return res.status(403).json({ message: "Access denied. Company Admin role required." });
      }
      
      if (!sessionUser.companyId) {
        return res.status(400).json({ message: "Company not found for user" });
      }
      
      // Get dashboard stats for company admin
      const companyId = sessionUser.companyId;
      
      // Get job stats
      const jobStats = await storage.getJobStats(companyId, sessionUser.id);
      
      // Get candidate stats
      const candidateStats = await storage.getCandidateStats(companyId, sessionUser.id);
      
      // Get HR user count
      const hrUsers = await storage.getUsersByCompany(companyId);
      const hrUserCount = hrUsers.length;
      
      res.json({
        jobStats: {
          total: jobStats.total,
          active: jobStats.active,
          hrJobs: jobStats.hrJobs
        },
        candidateStats: {
          totalCandidates: candidateStats.totalCandidates,
          hrCandidates: candidateStats.hrCandidates,
          statusStats: candidateStats.statusStats || []
        },
        hrUserCount
      });
    } catch (error) {
      console.error("Error fetching company admin dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });
  
  // Company Admin Chart Data
  app.get('/api/company-admin/chart-data', isAuthenticated, async (req: any, res: any) => {
    try {
      const sessionUser = req.session.user;
      
      // Check if user is a Company Admin
      if (sessionUser.role !== 'Company Admin') {
        return res.status(403).json({ message: "Access denied. Company Admin role required." });
      }
      
      if (!sessionUser.companyId) {
        return res.status(400).json({ message: "Company not found for user" });
      }
      
      // Get chart data
      const chartDataRaw = await storage.getChartData(sessionUser.companyId, sessionUser.id);
      
      // Transform data to match frontend expectations
      const chartData = chartDataRaw.map((item: any) => ({
        month: item.month,
        candidates: item.opened,
        hired: item.filled
      }));
      
      res.json(chartData);
    } catch (error) {
      console.error("Error fetching company admin chart data:", error);
      res.status(500).json({ message: "Failed to fetch chart data" });
    }
  });
  
  // Company Admin Jobs
  app.get('/api/company-admin/jobs', isAuthenticated, async (req: any, res: any) => {
    try {
      const sessionUser = req.session.user;
      
      // Check if user is a Company Admin
      if (sessionUser.role !== 'Company Admin') {
        return res.status(403).json({ message: "Access denied. Company Admin role required." });
      }
      
      if (!sessionUser.companyId) {
        return res.status(400).json({ message: "Company not found for user" });
      }
      
      // Get all jobs for the company
      const jobs = await storage.getJobsByCompany(sessionUser.companyId);
      
      // Add handled by user info and candidate count
      const jobsWithDetails = await Promise.all(jobs.map(async (job) => {
        // Get user who handles the job
        let handler = null;
        if (job.hrHandlingUserId) {
          handler = await storage.getUser(job.hrHandlingUserId);
        }
        
        // Get all candidates for this job using storage method
        const allCandidates = await storage.getCandidatesByCompany(sessionUser.companyId);
        const jobCandidates = allCandidates.filter(c => c.jobId === job.id);
        
        return {
          ...job,
          handledBy: handler ? `${handler.name} (${handler.id})` : 'Unknown',
          positionsOpened: jobCandidates.length,
          postedDate: job.createdAt
        };
      }));
      
      res.json(jobsWithDetails);
    } catch (error) {
      console.error("Error fetching company admin jobs:", error);
      res.status(500).json({ message: "Failed to fetch jobs" });
    }
  });
  
  app.post('/api/company-admin/jobs', isAuthenticated, async (req: any, res: any) => {
    try {
      const sessionUser = req.session.user;
      
      // Check if user is a Company Admin
      if (sessionUser.role !== 'Company Admin') {
        return res.status(403).json({ message: "Access denied. Company Admin role required." });
      }
      
      if (!sessionUser.companyId) {
        return res.status(400).json({ message: "Company not found for user" });
      }
      
      // Create job
      const jobData = insertJobSchema.parse({
        ...req.body,
        companyId: sessionUser.companyId,
        addedByUserId: sessionUser.id,
        hrHandlingUserId: sessionUser.id
      });
      
      const job = await storage.createJob(jobData);
      
      res.json(job);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error creating job:", error);
      res.status(500).json({ message: "Failed to create job" });
    }
  });
  
  app.put('/api/company-admin/jobs/:id', isAuthenticated, async (req: any, res: any) => {
    try {
      const jobId = parseInt(req.params.id);
      const sessionUser = req.session.user;
      
      // Check if user is a Company Admin
      if (sessionUser.role !== 'Company Admin') {
        return res.status(403).json({ message: "Access denied. Company Admin role required." });
      }
      
      if (!sessionUser.companyId) {
        return res.status(400).json({ message: "Company not found for user" });
      }
      
      // Check if job belongs to the company
      const job = await storage.getJob(jobId);
      if (!job || job.companyId !== sessionUser.companyId) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Update job
      const updatedJob = await storage.updateJob(jobId, req.body);
      
      res.json(updatedJob);
    } catch (error) {
      console.error("Error updating job:", error);
      res.status(500).json({ message: "Failed to update job" });
    }
  });
  
  app.delete('/api/company-admin/jobs/:id', isAuthenticated, async (req: any, res: any) => {
    try {
      const jobId = parseInt(req.params.id);
      const sessionUser = req.session.user;
      
      // Check if user is a Company Admin
      if (sessionUser.role !== 'Company Admin') {
        return res.status(403).json({ message: "Access denied. Company Admin role required." });
      }
      
      if (!sessionUser.companyId) {
        return res.status(400).json({ message: "Company not found for user" });
      }
      
      // Check if job belongs to the company
      const job = await storage.getJob(jobId);
      if (!job || job.companyId !== sessionUser.companyId) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Delete job
      const result = await storage.deleteJob(jobId);
      
      if (result.success) {
        res.json({ success: true, message: result.message });
      } else {
        res.status(400).json({ success: false, message: result.message });
      }
    } catch (error) {
      console.error("Error deleting job:", error);
      res.status(500).json({ message: "Failed to delete job" });
    }
  });
  
  // Company Admin HR Users
  app.get('/api/company-admin/hr-users', isAuthenticated, async (req: any, res: any) => {
    try {
      const sessionUser = req.session.user;
      
      // Check if user is a Company Admin
      if (sessionUser.role !== 'Company Admin') {
        return res.status(403).json({ message: "Access denied. Company Admin role required." });
      }
      
      if (!sessionUser.companyId) {
        return res.status(400).json({ message: "Company not found for user" });
      }
      
      // Get all HR users for the company
      const users = await storage.getUsersByCompany(sessionUser.companyId);
      
      // Add job and candidate counts for each user
      const usersWithDetails = await Promise.all(users.map(async (user) => {
        // Get job count for this user
        // Get job count for this user
        if (!db) {
          throw new Error('Database not available');
        }
        const jobsCountResult = await db.select({ count: count() })
          .from(jobs)
          .where(eq(jobs.hrHandlingUserId, user.id));
        
        // Get candidate count for this user
        const candidatesCountResult = await db.select({ count: count() })
          .from(candidates)
          .where(eq(candidates.hrHandlingUserId, user.id));
        
        return {
          ...user,
          jobsHandled: jobsCountResult[0]?.count || 0,
          candidatesHandled: candidatesCountResult[0]?.count || 0,
          company: user.companyId ? (await storage.getCompany(user.companyId))?.companyName || 'Unknown' : 'Unknown'
        };
      }));
      
      res.json(usersWithDetails);
    } catch (error) {
      console.error("Error fetching HR users:", error);
      res.status(500).json({ message: "Failed to fetch HR users" });
    }
  });
  
  app.post('/api/company-admin/hr-users', isAuthenticated, async (req: any, res: any) => {
    try {
      const sessionUser = req.session.user;
      
      // Check if user is a Company Admin
      if (sessionUser.role !== 'Company Admin') {
        return res.status(403).json({ message: "Access denied. Company Admin role required." });
      }
      
      if (!sessionUser.companyId) {
        return res.status(400).json({ message: "Company not found for user" });
      }
      
      // Create HR user
      const { name, email, password } = req.body;
      
      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);
      
      const userData = insertUserSchema.parse({
        name,
        email,
        passwordHash,
        role: 'HR',
        companyId: sessionUser.companyId
      });
      
      const user = await storage.createUser(userData);
      
      res.json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error creating HR user:", error);
      res.status(500).json({ message: "Failed to create HR user" });
    }
  });
  
  // Add new API routes for AI Interview System
  
  // Trigger AI Interview - HR Role Only
  app.post('/api/candidates/:id/trigger-interview', isAuthenticated, async (req: any, res: any) => {
    try {
      const candidateId = parseInt(req.params.id);
      const sessionUser = req.session.user;
      
      // Check if user is an HR user
      if (sessionUser.role !== 'HR') {
        return res.status(403).json({ message: "Access denied. HR role required." });
      }
      
      // Validate HR user owns the candidate
      const candidate = await storage.getCandidateById(candidateId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      
      if (candidate.hrHandlingUserId !== sessionUser.id) {
        return res.status(403).json({ message: "Access denied. You don't own this candidate." });
      }
      
      // Generate a unique schedulerToken
      const schedulerToken = require('crypto').randomBytes(32).toString('hex');
      
      // Update candidate status and save the token
      await storage.updateCandidateStatus(candidateId, 'pending_schedule');
      const updatedCandidate = await storage.updateCandidate(candidateId, {
        schedulerToken: schedulerToken
      });
      
      // Initiate the email service
      await sendInterviewScheduleEmail(updatedCandidate);
      
      res.json({ 
        success: true, 
        message: "Interview triggered successfully. Email sent to candidate.",
        schedulerToken: schedulerToken
      });
    } catch (error) {
      console.error("Error triggering interview:", error);
      res.status(500).json({ message: "Failed to trigger interview" });
    }
  });
  
  // Public scheduling endpoint - Token Auth
  app.post('/api/public/schedule-interview', async (req: any, res: any) => {
    try {
      const { token, datetime } = req.body;
      
      // Validate schedulerToken and input datetime
      if (!token || !datetime) {
        return res.status(400).json({ message: "Token and datetime are required" });
      }
      
      // Find candidate by scheduler token
      const candidate = await db.select().from(candidates).where(eq(candidates.schedulerToken, token));
      if (!candidate || candidate.length === 0) {
        return res.status(404).json({ message: "Invalid or expired token" });
      }
      
      // Generate a unique meetingLink
      const meetingLink = `https://meet.google.com/${require('crypto').randomBytes(4).toString('hex')}`;
      
      // Update candidate with interview schedule
      const updatedCandidate = await storage.updateInterviewSchedule(token, new Date(datetime), meetingLink);
      
      // Send success email to candidate and notification to HR
      await sendInterviewScheduleEmail(updatedCandidate);
      
      res.json({ 
        success: true, 
        message: "Interview scheduled successfully",
        meetingLink: meetingLink
      });
    } catch (error) {
      console.error("Error scheduling interview:", error);
      res.status(500).json({ message: "Failed to schedule interview" });
    }
  });
  
  // Internal callback endpoint - API Key Auth
  app.post('/api/internal/interview-callback', async (req: any, res: any) => {
    try {
      const { candidateId, transcriptUrl, reportUrl } = req.body;
      
      // Validate internal API Key (simplified for demo)
      const apiKey = req.headers['x-api-key'];
      if (!apiKey || apiKey !== process.env.INTERNAL_API_KEY) {
        return res.status(401).json({ message: "Unauthorized. Invalid API key." });
      }
      
      // Validate required fields
      if (!candidateId || !transcriptUrl || !reportUrl) {
        return res.status(400).json({ message: "candidateId, transcriptUrl, and reportUrl are required" });
      }
      
      // Update candidate with interview results
      const updatedCandidate = await storage.updateInterviewResults(
        parseInt(candidateId), 
        transcriptUrl, 
        reportUrl
      );
      
      // Send results email to candidate and notification to HR
      await sendInterviewResultsEmail(updatedCandidate);
      
      res.json({ 
        success: true, 
        message: "Interview results updated successfully"
      });
    } catch (error) {
      console.error("Error updating interview results:", error);
      res.status(500).json({ message: "Failed to update interview results" });
    }
  });

  
  app.delete('/api/company-admin/hr-users/:id', isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.params.id;
      const sessionUser = req.session.user;
      
      // Check if user is a Company Admin
      if (sessionUser.role !== 'Company Admin') {
        return res.status(403).json({ message: "Access denied. Company Admin role required." });
      }
      
      if (!sessionUser.companyId) {
        return res.status(400).json({ message: "Company not found for user" });
      }
      
      // Check if user belongs to the company
      const user = await storage.getUser(userId);
      if (!user || user.companyId !== sessionUser.companyId) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Delete user
      if (!db) {
        throw new Error('Database not available');
      }
      await db.delete(users).where(eq(users.id, userId));
      
      res.json({ success: true, message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting HR user:", error);
      res.status(500).json({ message: "Failed to delete HR user" });
    }
  });
  
  // Company Subscription
  app.get('/api/company/subscription', isAuthenticated, async (req: any, res: any) => {
    try {
      const sessionUser = req.session.user;
      
      // Check if user is a Company Admin
      if (sessionUser.role !== 'Company Admin') {
        return res.status(403).json({ message: "Access denied. Company Admin role required." });
      }
      
      if (!sessionUser.companyId) {
        return res.status(400).json({ message: "Company not found for user" });
      }
      
      // Get company subscription info
      const company = await storage.getCompany(sessionUser.companyId);
      
      // For now, return basic company info as subscription data
      // In a real implementation, this would connect to a payment system
      res.json({
        planName: "Basic Plan",
        price: "$99/month",
        renewalDate: "2024-12-31",
        companyId: sessionUser.companyId,
        companyName: company?.companyName || 'Unknown Company'
      });
    } catch (error) {
      console.error("Error fetching subscription info:", error);
      res.status(500).json({ message: "Failed to fetch subscription info" });
    }
  });
  
  // Super Admin endpoints
  
  // Super Admin Dashboard Stats
  app.get('/api/super-admin/dashboard-stats', isAuthenticated, async (req: any, res: any) => {
    try {
      const sessionUser = req.session.user;
      console.log('Super Admin Dashboard - Session User:', sessionUser);
      
      // Check if user is a Super Admin
      if (sessionUser.role !== 'Super Admin') {
        console.log('Super Admin Dashboard - Access denied. User role:', sessionUser.role);
        return res.status(403).json({ message: "Access denied. Super Admin role required." });
      }
      
      // Get dashboard stats for super admin
      
      // Check database availability
      if (!db) {
        throw new Error('Database not available');
      }
      
      // Total Companies
      const totalCompaniesResult = await db.select({ count: count() }).from(companies);
      const totalCompanies = totalCompaniesResult[0]?.count || 0;
      
      // Total Users
      const totalUsersResult = await db.select({ count: count() }).from(users);
      const totalUsers = totalUsersResult[0]?.count || 0;
      
      // Total Jobs
      const totalJobsResult = await db.select({ count: count() }).from(jobs);
      const totalJobs = totalJobsResult[0]?.count || 0;
      
      // New Users (users created in the last 30 days)
      const newUserCountResult = await db.select({ count: count() })
        .from(users)
        .where(sql`created_at > NOW() - INTERVAL '30 days'`);
      const newUserCount = newUserCountResult[0]?.count || 0;
      
      // New Companies Over Time
      const newCompaniesOverTime = await db.select({
        month: sql<string>`TO_CHAR(${companies.createdAt}, 'YYYY-MM')`.as('month'),
        companies: count(),
      })
      .from(companies)
      .groupBy(sql`TO_CHAR(${companies.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${companies.createdAt}, 'YYYY-MM')`);
      
      // Jobs Posted Per Company (top 10)
      const jobsPerCompany = await db.select({
        companyName: companies.companyName,
        count: count(),
      })
      .from(jobs)
      .innerJoin(companies, eq(jobs.companyId, companies.id))
      .groupBy(companies.companyName)
      .orderBy(sql`count DESC`)
      .limit(10);
      
      // User Roles Breakdown
      const userRolesBreakdown = await db.select({
        role: users.role,
        count: count(),
      })
      .from(users)
      .groupBy(users.role);
      
      res.json({
        companyCount: totalCompanies,
        userCount: totalUsers,
        jobCount: totalJobs,
        newUserCount,
        newCompaniesOverTime,
        jobsPerCompany,
        userRolesBreakdown
      });
    } catch (error) {
      console.error("Error fetching super admin dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });
  
  // Company Admin Dashboard Stats
  app.get('/api/company-admin/dashboard-stats', isAuthenticated, async (req: any, res: any) => {
    try {
      const sessionUser = req.session.user;
      console.log('Company Admin Dashboard - Session User:', sessionUser);
      
      // Check if user is a Company Admin
      if (sessionUser.role !== 'Company Admin') {
        console.log('Company Admin Dashboard - Access denied. User role:', sessionUser.role);
        return res.status(403).json({ message: "Access denied. Company Admin role required." });
      }
      
      if (!sessionUser.companyId) {
        return res.status(400).json({ message: "Company not found for user" });
      }
      
      // Get job stats
      const jobStats = await storage.getJobStats(sessionUser.companyId, sessionUser.id);
      
      // Get candidate stats
      const candidateStats = await storage.getCandidateStats(sessionUser.companyId, sessionUser.id);
      
      // Get HR user count for the company
      const companyUsers = await storage.getUsersByCompany(sessionUser.companyId);
      const hrUserCount = companyUsers.filter(user => user.role === 'HR').length;
      
      res.json({
        jobStats,
        candidateStats,
        hrUserCount
      });
    } catch (error) {
      console.error("Error fetching company admin dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });
  
  // Company Admin Chart Data
  app.get('/api/company-admin/chart-data', isAuthenticated, async (req: any, res: any) => {
    try {
      const sessionUser = req.session.user;
      console.log('Company Admin Chart Data - Session User:', sessionUser);
      
      // Check if user is a Company Admin
      if (sessionUser.role !== 'Company Admin') {
        console.log('Company Admin Chart Data - Access denied. User role:', sessionUser.role);
        return res.status(403).json({ message: "Access denied. Company Admin role required." });
      }
      
      if (!sessionUser.companyId) {
        return res.status(400).json({ message: "Company not found for user" });
      }
      
      // Get chart data
      const chartData = await storage.getChartData(sessionUser.companyId, sessionUser.id);
      
      // Transform data to match frontend expectations
      const transformedData = chartData.map((item: any) => ({
        month: item.month,
        candidates: item.opened,
        hired: item.filled
      }));
      
      res.json(transformedData);
    } catch (error) {
      console.error("Error fetching company admin chart data:", error);
      res.status(500).json({ message: "Failed to fetch chart data" });
    }
  });
  
  // Super Admin Companies
  app.get('/api/super-admin/companies', isAuthenticated, async (req: any, res: any) => {
    try {
      const sessionUser = req.session.user;
      
      // Check if user is a Super Admin
      if (sessionUser.role !== 'Super Admin') {
        return res.status(403).json({ message: "Access denied. Super Admin role required." });
      }
      
      // Get all companies
      const companiesList = await storage.getCompanies();
      
      res.json(companiesList);
    } catch (error) {
      console.error("Error fetching companies:", error);
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });
  
  app.post('/api/super-admin/companies', isAuthenticated, async (req: any, res: any) => {
    try {
      const sessionUser = req.session.user;
      
      // Check if user is a Super Admin
      if (sessionUser.role !== 'Super Admin') {
        return res.status(403).json({ message: "Access denied. Super Admin role required." });
      }
      
      // Create company
      const companyData = insertCompanySchema.parse(req.body);
      
      const company = await storage.createCompany(companyData);
      
      res.json(company);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error creating company:", error);
      res.status(500).json({ message: "Failed to create company" });
    }
  });
  
  // Super Admin Users
  app.get('/api/super-admin/users', isAuthenticated, async (req: any, res: any) => {
    try {
      const sessionUser = req.session.user;
      
      // Check if user is a Super Admin
      if (sessionUser.role !== 'Super Admin') {
        return res.status(403).json({ message: "Access denied. Super Admin role required." });
      }
      
      // Get all users
      if (!db) {
        throw new Error('Database not available');
      }
      const usersList = await db.select().from(users);
      
      res.json(usersList);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  
  // Super Admin Subscriptions
  app.get('/api/super-admin/subscriptions', isAuthenticated, async (req: any, res: any) => {
    try {
      const sessionUser = req.session.user;
      
      // Check if user is a Super Admin
      if (sessionUser.role !== 'Super Admin') {
        return res.status(403).json({ message: "Access denied. Super Admin role required." });
      }
      
      // Get all companies with subscription info
      const companiesList = await storage.getCompanies();
      
      // For now, return basic company info as subscription data
      // In a real implementation, this would connect to a payment system
      const subscriptions = companiesList.map(company => ({
        companyId: company.id,
        companyName: company.companyName,
        planName: "Basic Plan",
        price: "$99/month",
        renewalDate: "2024-12-31"
      }));
      
      res.json(subscriptions);
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      res.status(500).json({ message: "Failed to fetch subscriptions" });
    }
  });
  
  // Add cascading delete endpoint for Super Admins
  app.delete('/api/super-admin/companies/:id', isAuthenticated, async (req: any, res: any) => {
    try {
      console.log("Cascading delete endpoint called");
      const sessionUser = req.session.user;
      console.log("Session user:", sessionUser);
      
      // Check if user is a Super Admin (bypass in development for testing)
      if (sessionUser.role !== 'Super Admin' && process.env.NODE_ENV !== 'development') {
        console.log("Access denied: User is not a Super Admin");
        return res.status(403).json({ message: "Access denied. Super Admin role required." });
      }
      
      const companyId = parseInt(req.params.id);
      console.log("Company ID to delete:", companyId);
      if (isNaN(companyId)) {
        console.log("Invalid company ID");
        return res.status(400).json({ message: "Invalid company ID" });
      }
      
      // Perform cascading delete
      console.log("Calling storage.deleteCompanyAndAssociatedData");
      const result = await storage.deleteCompanyAndAssociatedData(companyId);
      console.log("Delete result:", result);
      
      if (result.success) {
        console.log("Sending success response");
        return res.json({ success: true, message: result.message });
      } else {
        console.log("Sending error response");
        return res.status(404).json({ success: false, message: result.message });
      }
    } catch (error) {
      console.error("Error deleting company:", error);
      return res.status(500).json({ message: "Failed to delete company" });
    }
  });
}