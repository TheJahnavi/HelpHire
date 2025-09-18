import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Log environment variables for debugging
  console.log('Environment variables in Vercel function:');
  console.log('  VERCEL:', process.env.VERCEL);
  console.log('  DATABASE_URL set:', !!process.env.DATABASE_URL);
  if (process.env.DATABASE_URL) {
    console.log('  DATABASE_URL length:', process.env.DATABASE_URL.length);
    console.log('  DATABASE_URL starts with:', process.env.DATABASE_URL.substring(0, 50));
  }

  return res.status(200).json({ 
    status: 'ok', 
    message: 'Environment variables check',
    timestamp: new Date().toISOString(),
    DATABASE_URL_SET: !!process.env.DATABASE_URL,
    VERCEL_ENV: process.env.VERCEL,
    DATABASE_URL_LENGTH: process.env.DATABASE_URL ? process.env.DATABASE_URL.length : 0
  });
}