import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from "./storage.js";
import bcrypt from "bcryptjs";
import { insertJobSchema, insertCandidateSchema, insertNotificationSchema, insertTodoSchema } from "../shared/schema.js";
import { z } from "zod";
import { extractResumeData, calculateJobMatch, generateInterviewQuestions, type ExtractedCandidate } from "./gemini.js";
import fs from 'fs';
import * as mammoth from 'mammoth';
import path from 'path';

// Helper function to parse resume files
async function parseResumeFile(buffer: Buffer, filename: string): Promise<string> {
  const fileExtension = path.extname(filename).toLowerCase();
  
  try {
    if (fileExtension === '.pdf') {
      // For PDF files in Vercel, we'll need to handle differently
      // Return a message indicating PDF parsing requires local environment
      throw new Error('PDF parsing requires local development environment. Please use "npm run dev" for PDF files.');
    } else if (fileExtension === '.docx') {
      // For DOCX files, we'll need to write to a temporary file first
      const tempPath = `/tmp/${Date.now()}_${filename}`;
      fs.writeFileSync(tempPath, buffer);
      
      try {
        const result = await mammoth.extractRawText({ path: tempPath });
        // Clean up temp file
        fs.unlinkSync(tempPath);
        return result.value;
      } catch (error) {
        // Clean up temp file even if parsing fails
        fs.unlinkSync(tempPath);
        throw error;
      }
    } else if (fileExtension === '.txt') {
      // For TXT files, we can parse directly from buffer
      return buffer.toString('utf-8');
    } else {
      throw new Error(`Unsupported file type: ${fileExtension}`);
    }
  } catch (parseError) {
    console.error(`Failed to parse ${filename}:`, parseError);
    throw new Error(`Could not extract text from ${filename}: ${parseError}`);
  }
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
    // Extract URL without query parameters for routing
    const fullUrl = req.url || '/';
    const url = fullUrl.split('?')[0];  // Remove query parameters if any
    const method = req.method || 'GET';
    const userId = req.headers['x-user-id'] as string;

    // Debug logging
    console.log('Vercel Handler - URL:', fullUrl);
    console.log('Vercel Handler - Clean URL:', url);
    console.log('Vercel Handler - Method:', method);
    console.log('Vercel Handler - Body:', req.body);

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
    
    // Handle AI endpoints that don't require authentication
    if ((url === '/api/ai/match-candidates' || url === '/api/ai/generate-questions' || url === '/api/ai/extract-resume') && method === 'POST') {
      // These endpoints don't require user authentication, handle them directly
      if (url === '/api/ai/match-candidates') {
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

          return res.status(200).json({ matches: matchResults });
        } catch (error) {
          console.error("Error in candidate matching:", error);
          return res.status(500).json({ 
            message: "Failed to match candidates",
            error: error instanceof Error ? error.message : "Unknown error"
          });
        }
      } else if (url === '/api/ai/generate-questions') {
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
            throw new Error(errorMsg);
          }

          return res.status(200).json({ questions });
        } catch (error) {
          console.error("Error generating interview questions:", error);
          return res.status(500).json({ 
            message: "Failed to generate interview questions",
            error: error instanceof Error ? error.message : "Unknown error"
          });
        }
      } else if (url === '/api/ai/extract-resume') {
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
            total_experience: extractedData.total_experience || "0 years total",
            summary: extractedData.summary || "No summary available"
          };
          
          return res.status(200).json(validatedExtractedData);
        } catch (error) {
          console.error("Error extracting resume data:", error);
          return res.status(500).json({ 
            message: "Failed to extract resume data",
            error: error instanceof Error ? error.message : "Unknown error"
          });
        }
      }
    }
    
    // Require user ID for all other endpoints EXCEPT AI endpoints
    // AI endpoints are already handled above
    if (!userId && !((url === '/api/ai/match-candidates' || url === '/api/ai/generate-questions' || url === '/api/ai/extract-resume') && method === 'POST')) {
      return res.status(400).json({ message: "User ID is required" });
    }
    
    // Get user details (only if user ID is required for this endpoint)
    let user = null;
    if (userId && !((url === '/api/ai/match-candidates' || url === '/api/ai/generate-questions' || url === '/api/ai/extract-resume') && method === 'POST')) {
      user = await storage.getUser(userId);
      if (!user || !user.companyId) {
        return res.status(404).json({ message: "User or company not found" });
      }
    }
    
    // Handle job routes
    if (url === '/api/jobs' && method === 'GET') {
      try {
        if (!user || !user.companyId) {
          return res.status(404).json({ message: "User not found" });
        }
        const jobs = await storage.getJobsByHRUser(user.companyId, userId);
        return res.status(200).json(jobs);
      } catch (error) {
        console.error("Error fetching jobs:", error);
        return res.status(500).json({ message: "Failed to fetch jobs" });
      }
    } else if (url === '/api/jobs' && method === 'POST') {
      try {
        if (!user || !user.companyId) {
          return res.status(404).json({ message: "User not found" });
        }
        // Validate required fields
        if (!req.body.jobTitle || !req.body.jobDescription) {
          return res.status(400).json({ message: "Job title and description are required" });
        }
        
        const jobData = insertJobSchema.parse({
          ...req.body,
          addedByUserId: user.id,
          companyId: user.companyId,
          hrHandlingUserId: user.id,
        });
        
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
        return res.status(500).json({ 
          message: "Failed to create job",
          error: error instanceof Error ? error.message : "Unknown error occurred"
        });
      }
    } else if (url.startsWith('/api/jobs/') && method === 'PUT') {
      try {
        if (!user || !user.companyId) {
          return res.status(404).json({ message: "User not found" });
        }
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
        if (!user || !user.companyId) {
          return res.status(404).json({ message: "User not found" });
        }
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
        if (!user || !user.companyId) {
          return res.status(404).json({ message: "User not found" });
        }
        const candidates = await storage.getCandidatesByHRUser(userId, user.companyId);
        return res.status(200).json(candidates);
      } catch (error) {
        console.error("Error fetching candidates:", error);
        return res.status(500).json({ message: "Failed to fetch candidates" });
      }
    } else if (url === '/api/candidates' && method === 'POST') {
      try {
        if (!user || !user.companyId) {
          return res.status(404).json({ message: "User not found" });
        }
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
        if (!user || !user.companyId) {
          return res.status(404).json({ message: "User not found" });
        }
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
        if (!user || !user.companyId) {
          return res.status(404).json({ message: "User not found" });
        }
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
    
    // Handle dashboard stats
    else if (url === '/api/dashboard/stats' && method === 'GET') {
      try {
        if (!user || !user.companyId) {
          return res.status(404).json({ message: "User not found" });
        }
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
    }
    
    // Handle todos
    else if (url === '/api/todos' && method === 'GET') {
      try {
        if (!user || !user.companyId) {
          return res.status(404).json({ message: "User not found" });
        }
        const todos = await storage.getTodosByUser(userId);
        return res.status(200).json(todos);
      } catch (error) {
        console.error("Error fetching todos:", error);
        return res.status(500).json({ message: "Failed to fetch todos" });
      }
    } else if (url === '/api/todos' && method === 'POST') {
      try {
        if (!user || !user.companyId) {
          return res.status(404).json({ message: "User not found" });
        }
        const todoData = insertTodoSchema.parse({
          ...req.body,
          userId: userId,
        });
        
        const todo = await storage.createTodo(todoData);
        return res.status(200).json(todo);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ message: "Invalid input", errors: error.errors });
        }
        console.error("Error creating todo:", error);
        return res.status(500).json({ message: "Failed to create todo" });
      }
    } else if (url.startsWith('/api/todos/') && method === 'PUT') {
      try {
        if (!user || !user.companyId) {
          return res.status(404).json({ message: "User not found" });
        }
        const id = parseInt(url.split('/')[3]);
        const updateData = req.body;
        
        const todo = await storage.updateTodo(id, updateData);
        return res.status(200).json(todo);
      } catch (error) {
        console.error("Error updating todo:", error);
        return res.status(500).json({ message: "Failed to update todo" });
      }
    }
    
    // Handle notifications
    else if (url === '/api/notifications' && method === 'GET') {
      try {
        if (!user || !user.companyId) {
          return res.status(404).json({ message: "User not found" });
        }
        const notifications = await storage.getNotificationsByUser(userId);
        return res.status(200).json(notifications);
      } catch (error) {
        console.error("Error fetching notifications:", error);
        return res.status(500).json({ message: "Failed to fetch notifications" });
      }
    } else if (url.startsWith('/api/notifications/') && method === 'PUT') {
      try {
        if (!user || !user.companyId) {
          return res.status(404).json({ message: "User not found" });
        }
        if (url.endsWith('/read-all')) {
          // Mark all notifications as read
          await storage.markAllNotificationsAsRead(userId);
          return res.status(200).json({ success: true, message: "All notifications marked as read" });
        } else if (url.includes('/read')) {
          // Mark specific notification as read
          const id = parseInt(url.split('/')[3]);
          const notification = await storage.markNotificationAsRead(id);
          return res.status(200).json(notification);
        }
      } catch (error) {
        console.error("Error updating notifications:", error);
        return res.status(500).json({ message: "Failed to update notifications" });
      }
    }
    
    // Handle resume upload endpoint
    else if (url === '/api/upload/resumes' && method === 'POST') {
      try {
        // For Vercel environment, we'll return an error message indicating file uploads are not supported
        // Vercel serverless functions have limitations with file uploads
        return res.status(400).json({ 
          message: "File upload is not supported in the deployed environment. Please use the development environment (npm run dev) for resume upload functionality.",
          error: "Vercel serverless function limitation"
        });
      } catch (error) {
        console.error('Error in resume upload:', error);
        return res.status(500).json({ 
          message: 'Failed to process resume upload request',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    // Handle HR Upload endpoints
    else if (url === '/api/hr/upload/extract-data' && method === 'POST') {
      try {
        if (!user || !user.companyId) {
          return res.status(404).json({ message: "User not found" });
        }
        
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
        
        return res.status(200).json(validatedExtractedData);
      } catch (error) {
        console.error("Error in data extraction:", error);
        return res.status(500).json({ 
          message: "Failed to extract data",
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    } else if (url === '/api/hr/upload/match-candidates' && method === 'POST') {
      try {
        if (!user || !user.companyId) {
          return res.status(404).json({ message: "User not found" });
        }
        
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

        return res.status(200).json({ matches: matchResults });
      } catch (error) {
        console.error("Error in candidate matching:", error);
        return res.status(500).json({ 
          message: "Failed to match candidates",
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    } else if (url === '/api/hr/upload/generate-questions' && method === 'POST') {
      try {
        if (!user || !user.companyId) {
          return res.status(404).json({ message: "User not found" });
        }
        
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

        return res.status(200).json({ questions });
      } catch (error) {
        console.error("Error in question generation:", error);
        return res.status(500).json({ 
          message: "Failed to generate questions",
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    } else if (url === '/api/hr/upload/save-candidates' && method === 'POST') {
      try {
        if (!user || !user.companyId) {
          return res.status(404).json({ message: "User not found" });
        }
        
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
              hrHandlingUserId: userId,
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
          // Get company ID from the job
          const job = await storage.getJob(parseInt(candidates[0].jobId));
          if (job && job.companyId) {
            const candidateNames = addedCandidates.map(c => c.name).join(', ');
            await storage.createNotificationForCompany(
              job.companyId,
              `${addedCandidates.length} new candidate${addedCandidates.length > 1 ? 's' : ''} added: ${candidateNames}`
            );
          }
        }

        return res.status(200).json({ 
          message: `Successfully added ${addedCandidates.length} candidates to database${failedCandidates.length > 0 ? ` (${failedCandidates.length} failed)` : ''}`,
          candidates: addedCandidates,
          failed: failedCandidates
        });
      } catch (error) {
        console.error("Error adding candidates:", error);
        return res.status(500).json({ 
          message: "Failed to add candidates",
          error: error instanceof Error ? error.message : 'Unknown error'
        });
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