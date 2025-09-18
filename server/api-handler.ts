import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from "./storage.js";
import bcrypt from "bcryptjs";
import { insertJobSchema, insertCandidateSchema, insertNotificationSchema, insertTodoSchema } from "../shared/schema.js";
import { z } from "zod";
import path from "path";
import * as fs from "fs";
import * as mammoth from "mammoth";
import { extractResumeData, calculateJobMatch } from "./gemini.js";

// Add debugging at the top of the file
console.log('api-handler.ts: Starting import process');

// Log environment variables for debugging
console.log('api-handler.ts: Environment variables:');
console.log('  VERCEL:', process.env.VERCEL);
console.log('  DATABASE_URL set:', !!process.env.DATABASE_URL);
if (process.env.DATABASE_URL) {
  console.log('  DATABASE_URL length:', process.env.DATABASE_URL.length);
  console.log('  DATABASE_URL starts with:', process.env.DATABASE_URL.substring(0, 50));
}

// Use dynamic async imports for ES modules with .js extensions
let db: any = null;

// Load modules asynchronously with .js extensions
const modulesLoaded = Promise.all([
  import('./db.js').then(module => {
    db = module;
    console.log('api-handler.ts: Successfully imported db');
  }).catch(error => {
    console.error('api-handler.ts: Failed to import db:', error);
    db = null;
  })
]).then(() => {
  console.log('api-handler.ts: All modules loaded');
  console.log('api-handler.ts: DB available:', !!db);
});

// Helper function to parse resume files
async function parseResumeFile(file: any): Promise<string> {
  const fileExtension = path.extname(file.filename).toLowerCase();
  
  try {
    if (fileExtension === '.pdf') {
      // Parse PDF file using dynamic import
      const pdfModule = await import('pdf-parse');
      const pdf = 'default' in pdfModule ? pdfModule.default : pdfModule;
      const pdfData = await pdf(file);
      return pdfData.text;
    } else if (fileExtension === '.docx') {
      // Parse DOCX file
      const result = await mammoth.extractRawText({ buffer: file });
      return result.value;
    } else if (fileExtension === '.txt') {
      // Parse TXT file
      return file.toString();
    } else {
      throw new Error(`Unsupported file type: ${fileExtension}`);
    }
  } catch (parseError) {
    console.error(`Failed to parse ${file.filename}:`, parseError);
    throw new Error(`Could not extract text from ${file.filename}: ${parseError}`);
  }
}

// Helper function to extract files from Vercel request
async function extractFilesFromRequest(req: VercelRequest): Promise<any[]> {
  // In Vercel serverless functions, files are in req.files
  if (req.files && Array.isArray(req.files)) {
    return req.files;
  }
  
  // If files are in a property, extract them
  if (req.files) {
    const files: any[] = [];
    for (const key in req.files) {
      const fileOrFiles = req.files[key];
      if (Array.isArray(fileOrFiles)) {
        files.push(...fileOrFiles);
      } else {
        files.push(fileOrFiles);
      }
    }
    return files;
  }
  
  // If no files found, return empty array
  return [];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Id');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Log environment info for debugging
    console.log('Environment info:', {
      VERCEL: process.env.VERCEL,
      DATABASE_URL_SET: !!process.env.DATABASE_URL,
      NODE_ENV: process.env.NODE_ENV
    });

    const url = req.url || '/';
    const method = req.method || 'GET';
    const userId = req.headers['x-user-id'] as string;

    // Handle health check
    if (url === '/api/health' && method === 'GET') {
      return res.status(200).json({ 
        status: 'ok', 
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        DATABASE_URL_SET: !!process.env.DATABASE_URL,
        VERCEL_ENV: process.env.VERCEL
      });
    }

    // Wait for modules to be loaded
    await modulesLoaded;

    // Check if storage is available
    if (!storage) {
      console.error('Storage module not available');
      return res.status(500).json({ 
        message: 'Internal server error - storage module not available'
      });
    }

    // Handle auth routes
    if (url.startsWith('/api/auth/') && method === 'POST') {
      if (url === '/api/auth/login') {
        // Handle login
        try {
          const { email, password, role, company } = req.body;
          
          // Find user by email
          const user = await storage.getUserByEmail(email);
          if (!user || !user.passwordHash) {
            return res.status(401).json({ message: "Invalid credentials" });
          }

          // Import bcrypt dynamically
          const bcrypt = (await import('bcryptjs')).default;
          
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

          // For Vercel, we can't use sessions, so we'll return user data directly
          return res.status(200).json({ 
            message: "Login successful", 
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              companyId: user.companyId,
            }
          });
        } catch (error) {
          console.error("Login error:", error);
          return res.status(500).json({ message: "Failed to login" });
        }
      } else if (url === '/api/auth/signup') {
        // Handle signup
        try {
          const { name, email, password, role, company } = req.body;
          
          // Check if user already exists
          const existingUser = await storage.getUserByEmail(email);
          if (existingUser) {
            return res.status(400).json({ message: "User already exists with this email" });
          }

          // Import bcrypt dynamically
          const bcrypt = (await import('bcryptjs')).default;
          
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

          return res.status(200).json({ message: "User created successfully", userId: user.id });
        } catch (error) {
          console.error("Signup error:", error);
          return res.status(500).json({ message: "Failed to create user" });
        }
      }
    }
    
    // Require user ID for all other endpoints
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }
    
    // Get user details
    const user = await storage.getUser(userId);
    if (!user || !user.companyId) {
      return res.status(404).json({ message: "User or company not found" });
    }
    
    // Handle job routes
    if (url === '/api/jobs' && method === 'GET') {
      try {
        const jobs = await storage.getJobsByHRUser(user.companyId, userId);
        return res.status(200).json(jobs);
      } catch (error) {
        console.error("Error fetching jobs:", error);
        return res.status(500).json({ message: "Failed to fetch jobs" });
      }
    } else if (url === '/api/jobs' && method === 'POST') {
      try {
        console.log("Request body:", req.body);
        console.log("User details:", { userId: user.id, companyId: user.companyId });
        
        // Validate required fields
        if (!req.body.jobTitle || !req.body.jobDescription) {
          return res.status(400).json({ message: "Job title and description are required" });
        }
        
        const jobData = insertJobSchema.parse({
          ...req.body,
          addedByUserId: user.id,
          companyId: user.companyId,
          hrHandlingUserId: user.id, // Also set HR handling user
        });
        
        console.log("Parsed job data:", jobData);
        
        const job = await storage.createJob(jobData);

        // Create notification for all company users about new job
        await storage.createNotificationForCompany(
          user.companyId,
          `New job "${job.jobTitle}" has been posted by ${user.name}`
        );

        return res.status(200).json(job);
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
        return res.status(500).json({ 
          message: "Failed to create job",
          error: "Unknown error occurred"
        });
      }
    } else if (url.startsWith('/api/jobs/') && method === 'PUT') {
      try {
        const id = parseInt(url.split('/')[3]);
        const updateData = req.body;
        
        const job = await storage.updateJob(id, updateData);

        // Create notification for all company users about job update
        await storage.createNotificationForCompany(
          user.companyId,
          `Job "${job.jobTitle}" has been updated by ${user.name}`
        );

        return res.status(200).json(job);
      } catch (error) {
        if (error instanceof z.ZodError) {
          console.error("Job update validation error:", error.errors);
          return res.status(400).json({ message: "Invalid input", errors: error.errors });
        }
        console.error("Error updating job:", error);
        return res.status(500).json({ message: "Failed to update job" });
      }
    } else if (url.startsWith('/api/jobs/') && method === 'DELETE') {
      try {
        const id = parseInt(url.split('/')[3]);
        
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
        await storage.createNotificationForCompany(
          user.companyId,
          `Job "${job.jobTitle}" has been deleted by ${user.name}`
        );
        
        return res.status(200).json({ success: true, message: result.message || "Job deleted successfully" });
      } catch (error) {
        console.error("Error deleting job:", error);
        return res.status(500).json({ message: "Failed to delete job" });
      }
    }
    
    // Handle candidate routes
    else if (url === '/api/candidates' && method === 'GET') {
      try {
        const candidates = await storage.getCandidatesByHRUser(userId, user.companyId);
        return res.status(200).json(candidates);
      } catch (error) {
        console.error("Error fetching candidates:", error);
        return res.status(500).json({ message: "Failed to fetch candidates" });
      }
    } else if (url === '/api/candidates' && method === 'POST') {
      try {
        const candidateData = insertCandidateSchema.parse({
          ...req.body,
          hrHandlingUserId: userId,
        });
        
        const candidate = await storage.createCandidate(candidateData);
        return res.status(200).json(candidate);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ message: "Invalid input", errors: error.errors });
        }
        console.error("Error creating candidate:", error);
        return res.status(500).json({ message: "Failed to create candidate" });
      }
    } else if (url.startsWith('/api/candidates/') && method === 'PUT') {
      try {
        const id = parseInt(url.split('/')[3]);
        const updateData = req.body;
        
        const candidate = await storage.updateCandidate(id, updateData);

        // Create notification for status changes
        if (updateData.status) {
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
            `Candidate ${candidate.candidateName} has been ${statusMessage} by ${user.name}`
          );
        }

        return res.status(200).json(candidate);
      } catch (error) {
        console.error("Error updating candidate:", error);
        return res.status(500).json({ message: "Failed to update candidate" });
      }
    } else if (url.startsWith('/api/candidates/') && method === 'DELETE') {
      try {
        const id = parseInt(url.split('/')[3]);
        
        const deleted = await storage.deleteCandidate(id);
        if (!deleted) {
          return res.status(404).json({ message: "Candidate not found" });
        }
        
        return res.status(200).json({ success: true, message: "Candidate deleted successfully" });
      } catch (error) {
        console.error("Error deleting candidate:", error);
        return res.status(500).json({ message: "Failed to delete candidate" });
      }
    }
    
    // Handle file upload for candidates
    else if (url === '/api/candidates/upload' && method === 'POST') {
      try {
        // Note: In Vercel serverless functions, file upload handling is limited
        // We'll need to handle this differently in the frontend
        return res.status(501).json({ message: "File upload not implemented in this handler" });
      } catch (error) {
        console.error("Error uploading candidate:", error);
        return res.status(500).json({ message: "Failed to upload candidate" });
      }
    }
    
    // Handle resume upload and analysis
    else if (url === '/api/upload/resumes' && method === 'POST') {
      try {
        console.log("Handling resume upload request");
        console.log("Request files:", req.files);
        console.log("Request body:", req.body);
        
        // Extract files from the request
        const files = await extractFilesFromRequest(req);
        console.log("Extracted files:", files?.length || 0);
        
        if (!files || files.length === 0) {
          console.log("No files received in upload request");
          return res.status(400).json({ message: "No files uploaded" });
        }

        const extractedCandidates: any[] = [];
        const processingErrors: string[] = [];

        for (const file of files) {
          try {
            console.log(`Processing file: ${file.filename || file.originalFilename} (${file.type || file.mimetype})`);
            
            // Parse the actual file content
            const resumeText = await parseResumeFile(file);
            
            if (!resumeText || resumeText.trim().length < 50) {
              const errorMsg = `Insufficient text content extracted from ${file.filename || file.originalFilename} (${resumeText?.length || 0} characters)`;
              console.log(errorMsg);
              throw new Error(errorMsg);
            }

            console.log(`Extracted ${resumeText.length} characters from ${file.filename || file.originalFilename}`);
            
            // Use Gemini AI to extract candidate data from the actual resume text
            const extractedData = await extractResumeData(resumeText);
            const candidateId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Validate that we got meaningful data
            if (!extractedData.name || !extractedData.email) {
              const errorMsg = `Failed to extract valid candidate data from ${file.filename || file.originalFilename}`;
              console.log(errorMsg);
              throw new Error(errorMsg);
            }
            
            extractedCandidates.push({
              ...extractedData,
              id: candidateId
            });

            console.log(`Successfully processed ${file.filename || file.originalFilename} - Extracted: ${extractedData.name}`);

          } catch (error) {
            const errorMessage = `Error processing file ${file.filename || file.originalFilename}: ${error}`;
            console.error(errorMessage);
            processingErrors.push(errorMessage);
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
        return res.status(200).json(response);
      } catch (error) {
        console.error("Error in resume upload:", error);
        return res.status(500).json({ 
          message: "Failed to process resumes",
          error: error instanceof Error ? error.message : "Unknown error occurred"
        });
      }
    }
    
    // Handle job matching endpoint
    else if (url === '/api/ai/match-candidates' && method === 'POST') {
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
            
            matchResults.push({
              candidateId: candidate.id,
              ...matchResult
            });
          } catch (matchError) {
            console.error(`Error matching candidate ${candidate.id}:`, matchError);
            matchResults.push({
              candidateId: candidate.id,
              error: matchError instanceof Error ? matchError.message : 'Unknown error'
            });
          }
        }

        return res.status(200).json({ matches: matchResults });
      } catch (error) {
        console.error("Error in candidate matching:", error);
        return res.status(500).json({ 
          message: "Failed to match candidates",
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
    
    // Handle GET requests for specific API endpoints
    if (method === 'GET') {
      if (url === '/api/dashboard/stats') {
        try {
          // Get comprehensive dashboard data filtered by HR user
          const jobStats = await storage.getJobStats(user.companyId, userId);
          const candidateStats = await storage.getCandidateStats(user.companyId, userId);
          const pipelineData = await storage.getPipelineData(user.companyId, userId);
          const chartData = await storage.getChartData(user.companyId, userId);

          return res.status(200).json({
            jobStats,
            candidateStats: candidateStats.statusStats || [],
            pipelineData,
            chartData
          });
        } catch (error) {
          console.error("Error fetching dashboard stats:", error);
          return res.status(500).json({ message: "Failed to fetch dashboard stats" });
        }
      } else if (url === '/api/todos') {
        try {
          const todos = await storage.getTodosByUser(userId);
          return res.status(200).json(todos);
        } catch (error) {
          console.error("Error fetching todos:", error);
          return res.status(500).json({ message: "Failed to fetch todos" });
        }
      } else if (url === '/api/notifications') {
        try {
          const notifications = await storage.getNotificationsByUser(userId);
          return res.status(200).json(notifications);
        } catch (error) {
          console.error("Error fetching notifications:", error);
          return res.status(500).json({ message: "Failed to fetch notifications" });
        }
      }
    }

    // For other API routes, you would add similar handlers
    // For now, return a simple message
    return res.status(404).json({ 
      message: 'API endpoint not found',
      path: url,
      method,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}