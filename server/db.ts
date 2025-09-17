import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle, type NeonDatabase } from 'drizzle-orm/neon-serverless';
import * as schema from "@shared/schema";

// Set WebSocket constructor dynamically if in a Node.js environment
if (typeof window === 'undefined') {
  try {
    // Dynamically import ws only if needed
    import('ws').then((wsModule) => {
      neonConfig.webSocketConstructor = wsModule.default || wsModule;
    }).catch((error) => {
      console.warn('Could not import ws module:', error);
    });
  } catch (error) {
    console.warn('WebSocket module setup failed:', error);
  }
}

// Only throw error if we're not in a Vercel environment
if (!process.env.DATABASE_URL && process.env.VERCEL !== '1') {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create pool with error handling
let pool: Pool | undefined;
let db: NeonDatabase<typeof schema> | null = null;

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