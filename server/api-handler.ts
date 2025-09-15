import type { VercelRequest, VercelResponse } from '@vercel/node';

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

    // For now, return a simple message for all other endpoints
    return res.status(200).json({ 
      message: 'API endpoint is working',
      path,
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
