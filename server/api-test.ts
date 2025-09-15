import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Test database connection
    if (!db) {
      return res.status(500).json({ 
        error: 'Database connection not available',
        DATABASE_URL_SET: !!process.env.DATABASE_URL,
        VERCEL_ENV: process.env.VERCEL
      });
    }
    
    res.status(200).json({ 
      message: 'Database connection successful',
      DATABASE_URL_SET: !!process.env.DATABASE_URL,
      VERCEL_ENV: process.env.VERCEL
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Database connection failed',
      message: (error as Error).message,
      DATABASE_URL_SET: !!process.env.DATABASE_URL,
      VERCEL_ENV: process.env.VERCEL
    });
  }
}