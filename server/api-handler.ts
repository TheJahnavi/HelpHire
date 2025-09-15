import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from './storage';
import bcrypt from 'bcryptjs';
import { insertJobSchema, insertCandidateSchema, insertNotificationSchema, insertTodoSchema, type User } from '@shared/schema';
import { z } from 'zod';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Parse the URL to determine which endpoint to handle
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const path = url.pathname;
    const method = req.method || 'GET';

    // Route handling
    if (path === '/api/health' && method === 'GET') {
      return res.status(200).json({ 
        status: 'ok', 
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        DATABASE_URL_SET: !!process.env.DATABASE_URL,
        VERCEL_ENV: process.env.VERCEL
      });
    }

    // Auth routes
    if (path === '/api/auth/signup' && method === 'POST') {
      return handleSignup(req, res);
    }

    if (path === '/api/auth/login' && method === 'POST') {
      return handleLogin(req, res);
    }

    if (path === '/api/auth/user' && method === 'GET') {
      return handleGetUser(req, res);
    }

    if (path === '/api/auth/logout' && method === 'POST') {
      return handleLogout(req, res);
    }

    // User profile routes
    if (path.startsWith('/api/users/') && method === 'PUT') {
      return handleUpdateUser(req, res);
    }

    // Job routes
    if (path === '/api/jobs' && method === 'GET') {
      return handleGetJobs(req, res);
    }

    if (path === '/api/jobs' && method === 'POST') {
      return handleCreateJob(req, res);
    }

    if (path.startsWith('/api/jobs/') && method === 'PUT') {
      return handleUpdateJob(req, res);
    }

    if (path.startsWith('/api/jobs/') && method === 'DELETE') {
      return handleDeleteJob(req, res);
    }

    // Candidate routes
    if (path === '/api/candidates' && method === 'GET') {
      return handleGetCandidates(req, res);
    }

    if (path === '/api/candidates' && method === 'POST') {
      return handleCreateCandidate(req, res);
    }

    if (path.startsWith('/api/candidates/') && method === 'PUT') {
      return handleUpdateCandidate(req, res);
    }

    if (path.startsWith('/api/candidates/') && method === 'DELETE') {
      return handleDeleteCandidate(req, res);
    }

    // Dashboard stats
    if (path === '/api/dashboard/stats' && method === 'GET') {
      return handleGetDashboardStats(req, res);
    }

    // Default 404
    return res.status(404).json({ message: 'Endpoint not found' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}

// Auth handlers
async function handleSignup(req: VercelRequest, res: VercelResponse) {
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

async function handleLogin(req: VercelRequest, res: VercelResponse) {
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

    // For Vercel deployment, we'll just return the user data
    // In a real application, you would set up proper session management
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
}

async function handleGetUser(req: VercelRequest, res: VercelResponse) {
  try {
    // In a real implementation, you would verify the session/token
    // For now, we'll return a mock user
    const user = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'HR',
      companyId: 1
    };
    return res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({ message: "Failed to fetch user" });
  }
}

async function handleLogout(req: VercelRequest, res: VercelResponse) {
  // In a real implementation, you would destroy the session
  return res.status(200).json({ message: "Logged out successfully" });
}

async function handleUpdateUser(req: VercelRequest, res: VercelResponse) {
  try {
    // In a real implementation, you would verify the session and update the user
    return res.status(200).json({ message: "User updated successfully" });
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).json({ message: "Failed to update user" });
  }
}

// Job handlers
async function handleGetJobs(req: VercelRequest, res: VercelResponse) {
  try {
    // Mock jobs data for testing
    const jobs = [
      {
        id: 1,
        jobTitle: 'Software Engineer',
        addedByUserId: 'user-1',
        hrHandlingUserId: 'user-1',
        jobDescription: 'Develop web applications',
        skills: ['JavaScript', 'React', 'Node.js'],
        experience: '3+ years',
        note: 'Frontend focus',
        positionsCount: 2,
        jobStatus: 'active',
        companyId: 1,
        createdAt: new Date().toISOString()
      }
    ];
    return res.status(200).json(jobs);
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return res.status(500).json({ message: "Failed to fetch jobs" });
  }
}

async function handleCreateJob(req: VercelRequest, res: VercelResponse) {
  try {
    // In a real implementation, you would create the job in the database
    return res.status(200).json({ message: "Job created successfully" });
  } catch (error) {
    console.error("Error creating job:", error);
    return res.status(500).json({ message: "Failed to create job" });
  }
}

async function handleUpdateJob(req: VercelRequest, res: VercelResponse) {
  try {
    // In a real implementation, you would update the job in the database
    return res.status(200).json({ message: "Job updated successfully" });
  } catch (error) {
    console.error("Error updating job:", error);
    return res.status(500).json({ message: "Failed to update job" });
  }
}

async function handleDeleteJob(req: VercelRequest, res: VercelResponse) {
  try {
    // In a real implementation, you would delete the job from the database
    return res.status(200).json({ message: "Job deleted successfully" });
  } catch (error) {
    console.error("Error deleting job:", error);
    return res.status(500).json({ message: "Failed to delete job" });
  }
}

// Candidate handlers
async function handleGetCandidates(req: VercelRequest, res: VercelResponse) {
  try {
    // Mock candidates data for testing
    const candidates = [
      {
        id: 1,
        candidateName: 'John Doe',
        email: 'john@example.com',
        jobId: 1,
        candidateSkills: ['JavaScript', 'React'],
        candidateExperience: 3,
        matchPercentage: 85,
        resumeUrl: '/resumes/john.pdf',
        hrHandlingUserId: 'user-1',
        status: 'resume_reviewed',
        reportLink: null,
        interviewLink: null,
        technicalPersonEmail: null,
        createdAt: new Date().toISOString()
      }
    ];
    return res.status(200).json(candidates);
  } catch (error) {
    console.error("Error fetching candidates:", error);
    return res.status(500).json({ message: "Failed to fetch candidates" });
  }
}

async function handleCreateCandidate(req: VercelRequest, res: VercelResponse) {
  try {
    // In a real implementation, you would create the candidate in the database
    return res.status(200).json({ message: "Candidate created successfully" });
  } catch (error) {
    console.error("Error creating candidate:", error);
    return res.status(500).json({ message: "Failed to create candidate" });
  }
}

async function handleUpdateCandidate(req: VercelRequest, res: VercelResponse) {
  try {
    // In a real implementation, you would update the candidate in the database
    return res.status(200).json({ message: "Candidate updated successfully" });
  } catch (error) {
    console.error("Error updating candidate:", error);
    return res.status(500).json({ message: "Failed to update candidate" });
  }
}

async function handleDeleteCandidate(req: VercelRequest, res: VercelResponse) {
  try {
    // In a real implementation, you would delete the candidate from the database
    return res.status(200).json({ message: "Candidate deleted successfully" });
  } catch (error) {
    console.error("Error deleting candidate:", error);
    return res.status(500).json({ message: "Failed to delete candidate" });
  }
}

// Dashboard handlers
async function handleGetDashboardStats(req: VercelRequest, res: VercelResponse) {
  try {
    // Mock dashboard stats for testing
    const stats = {
      jobStats: {
        total: 5,
        active: 3
      },
      candidateStats: [
        { status: 'applied', count: 10 },
        { status: 'resume_reviewed', count: 5 },
        { status: 'interview_scheduled', count: 3 },
        { status: 'hired', count: 1 }
      ],
      pipelineData: [
        { stage: 'applied', count: 10 },
        { stage: 'resume_reviewed', count: 5 },
        { stage: 'interview_scheduled', count: 3 },
        { stage: 'hired', count: 1 }
      ],
      chartData: [
        { month: 'Jan', opened: 20, filled: 5 },
        { month: 'Feb', opened: 15, filled: 8 },
        { month: 'Mar', opened: 25, filled: 12 }
      ]
    };
    return res.status(200).json(stats);
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return res.status(500).json({ message: "Failed to fetch dashboard stats" });
  }
}