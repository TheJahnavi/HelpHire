import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle, type NeonDatabase } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Only throw error if we're not in a Vercel environment
if (!process.env.DATABASE_URL && process.env.VERCEL !== '1') {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create pool with error handling
let pool: Pool | undefined;
let db: NeonDatabase<typeof schema> | null;

try {
  if (process.env.DATABASE_URL) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle({ client: pool, schema });
  } else {
    console.warn("DATABASE_URL not set - database functionality will be limited");
    db = null;
  }
} catch (error) {
  console.error("Failed to initialize database connection:", error);
  db = null;
}

export { pool, db };