import type { Application, Request, Response } from "express";
import { storage } from "./storage.js";
import bcrypt from "bcryptjs";
import session from "express-session";
import { insertJobSchema, insertCandidateSchema, insertNotificationSchema, insertTodoSchema, type User } from "../shared/schema.js";
import { z } from "zod";
import multer from "multer";
import path from "path";
import * as fs from "fs";
import { extractResumeData, calculateJobMatch, generateInterviewQuestions, type ExtractedCandidate } from "./gemini.js";
import * as mammoth from "mammoth";

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
    // For development, we'll mock a user session
    if (!req.session.user) {
      req.session.user = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'HR',
        companyId: null  // We'll set this properly in the route handlers
      };
    }
    return next();
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
      const user = await storage.getUser(sessionUser.id);
      
      if (!user || !user.companyId) {
        return res.status(404).json({ message: "User or company not found" });
      }

      const candidates = await storage.getCandidatesByHRUser(sessionUser.id, user.companyId);
      res.json(candidates);
    } catch (error) {
      console.error("Error fetching candidates:", error);
      res.status(500).json({ message: "Failed to fetch candidates" });
    }
  });

  app.post('/api/candidates', isAuthenticated, async (req: any, res) => {
    try {
      const sessionUser = req.session.user;
      const candidateData = insertCandidateSchema.parse({
        ...req.body,
        hrHandlingUserId: sessionUser.id,
      });
      
      const candidate = await storage.createCandidate(candidateData);
      res.json(candidate);
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
            // Fallback to mock extraction
            extractedData = {
              name: 'Mock Candidate',
              email: 'mock@example.com',
              portfolio_link: [],
              skills: ['JavaScript', 'React', 'Node.js'],
              experience: [
                {
                  job_title: 'Software Developer',
                  company: 'Tech Corp',
                  duration: '3 years',
                  projects: [
                    'Developed web applications',
                    'Implemented RESTful APIs'
                  ]
                }
              ],
              total_experience: '3 years',
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
      res.status(500).json({ message: "Failed to add candidates" });
    }
  });
}