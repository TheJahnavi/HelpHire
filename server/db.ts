import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Check if we're using a Neon database or a standard PostgreSQL database
const isNeon = process.env.DATABASE_URL.includes('neon') || process.env.DATABASE_URL.includes('vercel');

let db;

if (isNeon) {
  // Use Neon-specific connection
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle({ client: pool, schema });
} else {
  // Use standard PostgreSQL connection
  // For Supabase, Railway, Render, etc.
  const { Pool } = await import('pg');
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Required for many cloud providers
    }
  });
  db = drizzle({ client: pool, schema });
}

export { db };