import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { insertJobSchema, insertCandidateSchema, insertNotificationSchema, insertTodoSchema, type User } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import mammoth from "mammoth";
import { extractResumeData, calculateJobMatch, generateInterviewQuestions, type ExtractedCandidate } from "./gemini";

// Setup multer for file uploads
const upload = multer({
  dest: 'uploads/',
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
function setupSession(app: Express) {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      maxAge: sessionTtl,
    },
  }));
}

// Authentication middleware
const isAuthenticated = (req: any, res: any, next: any) => {
  if (req.session && req.session.user) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session middleware
  setupSession(app);

  // Auth routes
  app.post('/api/auth/signup', async (req, res) => {
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

  app.post('/api/auth/login', async (req, res) => {
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
      const user = await storage.getUser(sessionUser.id);
      
      if (!user || !user.companyId) {
        return res.status(404).json({ message: "User or company not found" });
      }

      // Get comprehensive dashboard data filtered by HR user
      const jobStats = await storage.getJobStats(user.companyId, sessionUser.id);
      const candidateStats = await storage.getCandidateStats(user.companyId, sessionUser.id);
      const pipelineData = await storage.getPipelineData(user.companyId, sessionUser.id);
      const chartData = await storage.getChartData(user.companyId, sessionUser.id);

      res.json({
        jobStats,
        candidateStats,
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
      const user = await storage.getUser(sessionUser.id);
      
      if (!user || !user.companyId) {
        return res.status(404).json({ message: "User or company not found" });
      }

      const jobs = await storage.getJobsByHRUser(user.companyId, sessionUser.id);
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      res.status(500).json({ message: "Failed to fetch jobs" });
    }
  });

  app.post('/api/jobs', isAuthenticated, async (req: any, res) => {
    try {
      const sessionUser = req.session.user;
      const user = await storage.getUser(sessionUser.id);
      
      if (!user || !user.companyId) {
        return res.status(404).json({ message: "User or company not found" });
      }

      console.log("Request body:", req.body);
      console.log("User details:", { userId: sessionUser.id, companyId: user.companyId });
      
      const jobData = insertJobSchema.parse({
        ...req.body,
        addedByUserId: sessionUser.id,
        companyId: user.companyId,
      });
      
      console.log("Parsed job data:", jobData);
      
      const job = await storage.createJob(jobData);

      // Create notification for all company users about new job
      await storage.createNotificationForCompany(
        user.companyId,
        `New job "${job.jobTitle}" has been posted by ${user.firstName || user.name}`
      );

      res.json(job);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Job creation validation error:", error.errors);
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error creating job:", error);
      res.status(500).json({ message: "Failed to create job" });
    }
  });

  app.put('/api/jobs/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      const job = await storage.updateJob(id, updateData);

      // Get user and create notification for all company users about job update
      const sessionUser = req.session.user;
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
      
      const result = await storage.deleteJob(id);
      if (!result.success) {
        return res.status(400).json({ message: result.message || "Failed to delete job" });
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
        const pdf = (await import('pdf-parse')).default;
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
      if (!files || files.length === 0) {
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
            throw new Error(`Insufficient text content extracted from ${file.originalname}`);
          }

          console.log(`Extracted ${resumeText.length} characters from ${file.originalname}`);
          
          // Use Gemini AI to extract candidate data from the actual resume text
          const extractedData = await extractResumeData(resumeText);
          const candidateId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          extractedCandidates.push({
            ...extractedData,
            id: candidateId
          });

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
      }

      res.json(response);

    } catch (error) {
      console.error("Error in resume upload:", error);
      res.status(500).json({ message: "Failed to process resumes" });
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
          
          matchResults.push({
            candidateId: candidate.id,
            ...matchResult
          });
        } catch (error) {
          console.error(`Error matching candidate ${candidate.id}:`, error);
          matchResults.push({
            candidateId: candidate.id,
            name: candidate.name,
            matchPercentage: 0,
            summary: "Error calculating match",
            strengthsBehindReasons: [],
            lagBehindReasons: [{
              reason: "Processing error occurred",
              points: -100,
              gaps: "Unable to analyze candidate data"
            }]
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

      res.json({ questions });
    } catch (error) {
      console.error("Error generating interview questions:", error);
      res.status(500).json({ message: "Failed to generate interview questions" });
    }
  });

  // Add candidates to database  
  app.post('/api/candidates/add', async (req: any, res) => {
    try {
      const { candidates, jobId } = req.body;
      
      console.log("=== DEBUG: Adding Candidates to Database ===");
      console.log("Number of candidates:", candidates.length);
      console.log("Job ID:", jobId);
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
            hr_handling_user_id: 'hr-001',
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
            hrHandlingUserId: 'hr-001',
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

  const httpServer = createServer(app);
  return httpServer;
}