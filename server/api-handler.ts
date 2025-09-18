import type { VercelRequest, VercelResponse } from '@vercel/node';

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
let storage: any = null;
let db: any = null;

// Load modules asynchronously with .js extensions
Promise.all([
  import('./db.js').then(module => {
    db = module;
    console.log('api-handler.ts: Successfully imported db');
  }).catch(error => {
    console.error('api-handler.ts: Failed to import db:', error);
    db = null;
  }),
  import('./storage.js').then(module => {
    storage = module.storage;
    console.log('api-handler.ts: Successfully imported storage');
  }).catch(error => {
    console.error('api-handler.ts: Failed to import storage:', error);
    storage = null;
  })
]).then(() => {
  console.log('api-handler.ts: All modules loaded');
}).catch(error => {
  console.error('api-handler.ts: Error loading modules:', error);
});

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

    // Wait for storage to be loaded if it's still loading
    let attempts = 0;
    while (!storage && attempts < 20) {
      await new Promise(resolve => setTimeout(resolve, 50));
      attempts++;
    }

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
    
    // Handle GET requests for specific API endpoints
    if (method === 'GET') {
      // For dashboard stats and other protected endpoints, we'll check for user ID in headers
      const userId = req.headers['x-user-id'] as string;
      
      if (url === '/api/dashboard/stats') {
        // Return mock data for now - in a real implementation, you would fetch real data
        return res.status(200).json({
          jobStats: { total: 15, active: 10 },
          candidateStats: [
            { status: 'applied', count: 30 },
            { status: 'interview_scheduled', count: 15 },
            { status: 'hired', count: 5 },
            { status: 'rejected', count: 10 }
          ],
          pipelineData: [
            { stage: 'Applied', count: 30 },
            { stage: 'Resume Reviewed', count: 25 },
            { stage: 'Interview Scheduled', count: 15 },
            { stage: 'Technical Round', count: 10 },
            { stage: 'Final Round', count: 7 },
            { stage: 'Hired', count: 5 }
          ],
          chartData: [
            { month: 'Jan', opened: 6, filled: 3 },
            { month: 'Feb', opened: 8, filled: 4 },
            { month: 'Mar', opened: 7, filled: 2 },
            { month: 'Apr', opened: 10, filled: 5 },
            { month: 'May', opened: 11, filled: 4 },
            { month: 'Jun', opened: 15, filled: 7 }
          ]
        });
      } else if (url === '/api/todos') {
        // Return mock todos data
        return res.status(200).json([
          { id: 1, task: 'Review new candidate applications', isCompleted: false },
          { id: 2, task: 'Schedule interviews for frontend developers', isCompleted: true },
          { id: 5, task: 'Follow up with candidates from yesterday', isCompleted: false },
          { id: 6, task: 'Update hiring pipeline report', isCompleted: false }
        ]);
      } else if (url === '/api/notifications') {
        // Return mock notifications data
        return res.status(200).json([
          { id: 1, message: 'New candidate application received', timestamp: '2023-06-15T10:30:00Z', readStatus: false },
          { id: 4, message: 'Candidate profile updated', timestamp: '2023-06-15T09:15:00Z', readStatus: false },
          { id: 5, message: 'Interview feedback submitted', timestamp: '2023-06-15T08:45:00Z', readStatus: true }
        ]);
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