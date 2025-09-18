import type { Application, Request, Response } from "express";
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from './storage';
import bcrypt from 'bcryptjs';
import { insertJobSchema, insertCandidateSchema, insertNotificationSchema, insertTodoSchema, type User } from '../shared/schema';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import * as fs from 'fs';
import { extractResumeData, calculateJobMatch, generateInterviewQuestions, type ExtractedCandidate } from './gemini';
import * as mammoth from 'mammoth';

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

// Authentication middleware
const isAuthenticated = (req: VercelRequest, res: VercelResponse, next: () => void) => {
  // In development environment, allow access for testing
  if (process.env.NODE_ENV === 'development') {
    // For development, we'll mock a user session
    if (!req.headers['x-user-id']) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    next();
    return;
  }
  
  if (req.headers && req.headers['x-user-id']) {
    next();
    return;
  }
  res.status(401).json({ message: "Unauthorized" });
};

// Health check endpoint
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Route handling
  const { pathname } = new URL(req.url || '/', `http://${req.headers.host}`);
  
  try {
    // Health check endpoint
    if (pathname === '/api/health' && req.method === 'GET') {
      res.json({ 
        status: 'ok', 
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        DATABASE_URL_SET: !!process.env.DATABASE_URL,
        VERCEL_ENV: process.env.VERCEL
      });
      return;
    }
    
    // Auth routes
    if (pathname === '/api/auth/signup' && req.method === 'POST') {
      const { name, email, password, role, company } = req.body;
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        res.status(400).json({ message: "User already exists with this email" });
        return;
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
      return;
    }
    
    if (pathname === '/api/auth/login' && req.method === 'POST') {
      const { email, password, role, company } = req.body;
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user || !user.passwordHash) {
        res.status(401).json({ message: "Invalid credentials" });
        return;
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        res.status(401).json({ message: "Invalid credentials" });
        return;
      }

      // Check role match
      if (user.role !== role) {
        res.status(401).json({ message: "Invalid role" });
        return;
      }

      // Check company match for non-Super Admin users
      if (role !== "Super Admin" && user.companyId) {
        const userCompany = await storage.getCompany(user.companyId);
        if (!userCompany || userCompany.companyName !== company) {
          res.status(401).json({ message: "Invalid company" });
          return;
        }
      }

      res.json({ message: "Login successful", user: { id: user.id, email: user.email, name: user.name, role: user.role, companyId: user.companyId } });
      return;
    }
    
    if (pathname === '/api/auth/user' && req.method === 'GET') {
      const userId = req.headers['x-user-id'] as string;
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      
      const user = await storage.getUser(userId);
      res.json(user);
      return;
    }
    
    // Dashboard stats endpoint
    if (pathname === '/api/dashboard/stats' && req.method === 'GET') {
      const userId = req.headers['x-user-id'] as string;
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      
      const user = await storage.getUser(userId);
      if (!user || !user.companyId) {
        res.status(404).json({ message: "User or company not found" });
        return;
      }
      
      // Get comprehensive dashboard data filtered by HR user
      const jobStats = await storage.getJobStats(user.companyId, userId);
      const candidateStats = await storage.getCandidateStats(user.companyId, userId);
      const pipelineData = await storage.getPipelineData(user.companyId, userId);
      const chartData = await storage.getChartData(user.companyId, userId);

      res.json({
        jobStats,
        candidateStats: candidateStats.statusStats || [],
        pipelineData,
        chartData
      });
      return;
    }
    
    // Job routes
    if (pathname.startsWith('/api/jobs')) {
      const jobId = pathname.split('/')[3]; // Extract job ID from path
      
      if (req.method === 'GET' && !jobId) {
        // Get all jobs
        const userId = req.headers['x-user-id'] as string;
        if (!userId) {
          res.status(401).json({ message: "Unauthorized" });
          return;
        }
        
        const user = await storage.getUser(userId);
        if (!user || !user.companyId) {
          res.status(404).json({ message: "User or company not found" });
          return;
        }
        
        const jobs = await storage.getJobsByHRUser(user.companyId, userId);
        res.json(jobs);
        return;
      }
      
      if (req.method === 'POST' && !jobId) {
        // Create job
        const userId = req.headers['x-user-id'] as string;
        if (!userId) {
          res.status(401).json({ message: "Unauthorized" });
          return;
        }
        
        const user = await storage.getUser(userId);
        if (!user || !user.companyId) {
          res.status(404).json({ message: "User or company not found" });
          return;
        }
        
        const jobData = insertJobSchema.parse({
          ...req.body,
          addedByUserId: user.id,
          companyId: user.companyId,
          hrHandlingUserId: user.id,
        });
        
        const job = await storage.createJob(jobData);
        res.json(job);
        return;
      }
      
      if (req.method === 'PUT' && jobId) {
        // Update job
        const updateData = req.body;
        const job = await storage.updateJob(parseInt(jobId), updateData);
        res.json(job);
        return;
      }
      
      if (req.method === 'DELETE' && jobId) {
        // Delete job
        const result = await storage.deleteJob(parseInt(jobId));
        if (!result.success) {
          res.status(400).json({ message: result.message || "Failed to delete job" });
          return;
        }
        res.json({ success: true, message: result.message || "Job deleted successfully" });
        return;
      }
    }
    
    // Candidate routes
    if (pathname.startsWith('/api/candidates')) {
      const candidateId = pathname.split('/')[3]; // Extract candidate ID from path
      
      if (req.method === 'GET' && !candidateId) {
        // Get all candidates
        const userId = req.headers['x-user-id'] as string;
        if (!userId) {
          res.status(401).json({ message: "Unauthorized" });
          return;
        }
        
        const user = await storage.getUser(userId);
        if (!user || !user.companyId) {
          res.status(404).json({ message: "User or company not found" });
          return;
        }
        
        const candidates = await storage.getCandidatesByHRUser(userId, user.companyId);
        res.json(candidates);
        return;
      }
      
      if (req.method === 'POST' && !candidateId) {
        // Create candidate
        const userId = req.headers['x-user-id'] as string;
        if (!userId) {
          res.status(401).json({ message: "Unauthorized" });
          return;
        }
        
        const candidateData = insertCandidateSchema.parse({
          ...req.body,
          hrHandlingUserId: userId,
        });
        
        const candidate = await storage.createCandidate(candidateData);
        res.json(candidate);
        return;
      }
      
      if (req.method === 'PUT' && candidateId) {
        // Update candidate
        const updateData = req.body;
        const candidate = await storage.updateCandidate(parseInt(candidateId), updateData);
        res.json(candidate);
        return;
      }
      
      if (req.method === 'DELETE' && candidateId) {
        // Delete candidate
        const deleted = await storage.deleteCandidate(parseInt(candidateId));
        if (!deleted) {
          res.status(404).json({ message: "Candidate not found" });
          return;
        }
        res.json({ success: true, message: "Candidate deleted successfully" });
        return;
      }
    }
    
    // If no route matched
    res.status(404).json({ message: "Route not found" });
  } catch (error) {
    console.error("API Error:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: "Invalid input", errors: error.errors });
    } else {
      res.status(500).json({ message: "Internal server error", error: (error as Error).message });
    }
  }
}
