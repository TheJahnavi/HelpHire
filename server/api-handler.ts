import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from './storage';

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
    // Log environment info for debugging
    console.log('Environment info:', {
      VERCEL: process.env.VERCEL,
      DATABASE_URL_SET: !!process.env.DATABASE_URL,
      NODE_ENV: process.env.NODE_ENV
    });

    const url = req.url || '/';
    const method = req.method || 'GET';

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