import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from "./storage.js";
import bcrypt from "bcryptjs";
import { insertJobSchema, insertCandidateSchema, insertNotificationSchema, insertTodoSchema } from "../shared/schema.js";
import { z } from "zod";
import { extractResumeData, calculateJobMatch, generateInterviewQuestions } from "./gemini.js";

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
    
    // Handle dashboard stats
    else if (url === '/api/dashboard/stats' && method === 'GET') {
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
    }
    
    // Handle todos
    else if (url === '/api/todos' && method === 'GET') {
      try {
        const todos = await storage.getTodosByUser(userId);
        return res.status(200).json(todos);
      } catch (error) {
        console.error("Error fetching todos:", error);
        return res.status(500).json({ message: "Failed to fetch todos" });
      }
    } else if (url === '/api/todos' && method === 'POST') {
      try {
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
        const notifications = await storage.getNotificationsByUser(userId);
        return res.status(200).json(notifications);
      } catch (error) {
        console.error("Error fetching notifications:", error);
        return res.status(500).json({ message: "Failed to fetch notifications" });
      }
    } else if (url.startsWith('/api/notifications/') && method === 'PUT') {
      try {
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
    
    // Handle AI matching endpoint
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
    
    // Handle interview questions generation
    else if (url === '/api/ai/generate-questions' && method === 'POST') {
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

        return res.status(200).json({ questions });
      } catch (error) {
        console.error("Error generating interview questions:", error);
        return res.status(500).json({ message: "Failed to generate interview questions" });
      }
    }
    
    // Handle resume upload endpoint
    else if (url === '/api/upload/resumes' && method === 'POST') {
      // This endpoint is not supported in the Vercel handler due to file upload limitations
      // File uploads require a different approach in serverless environments
      return res.status(400).json({ 
        message: 'Resume upload is not supported in this environment. Please use the development server for this feature.',
        error: 'Vercel serverless functions do not support multipart form data parsing required for file uploads.'
      });
    }
    
    // Handle adding candidates to database
    else if (url === '/api/candidates/add' && method === 'POST') {
      try {
        const { candidates, jobId } = req.body;
        
        console.log("=== DEBUG: Adding Candidates to Database ===");
        console.log("Number of candidates:", candidates.length);
        console.log("Job ID:", jobId);
        console.log("User ID:", userId);
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
              hr_handling_user_id: userId,
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
              hrHandlingUserId: userId,
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

        return res.status(200).json({ 
          message: `Successfully added ${addedCandidates.length} candidates to database`,
          candidates: addedCandidates 
        });
      } catch (error) {
        console.error("Error adding candidates:", error);
        return res.status(500).json({ message: "Failed to add candidates" });
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