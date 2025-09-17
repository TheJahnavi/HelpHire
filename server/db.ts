import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle, type NeonDatabase } from 'drizzle-orm/neon-serverless';
import * as schema from "../shared/schema.js";

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

// Function to sanitize DATABASE_URL
function sanitizeDatabaseUrl(url: string): string {
  console.log('Original DATABASE_URL:', url);
  
  // Remove any shell command prefixes like 'psql ' or 'psql%20'
  let sanitized = url.replace(/^psql\s*(['"]?)/i, '').replace(/^psql%20(['"]?)/i, '');
  
  // Remove any trailing quotes
  sanitized = sanitized.replace(/['"]$/, '');
  
  // Remove channel_binding parameter if present
  sanitized = sanitized.replace(/&channel_binding=require/g, '');
  sanitized = sanitized.replace(/\?channel_binding=require&/, '?');
  sanitized = sanitized.replace(/\?channel_binding=require$/, '');
  
  console.log('Sanitized DATABASE_URL:', sanitized);
  return sanitized;
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
    // Log the database URL (without sensitive information) for debugging
    console.log('DATABASE_URL is set. Length:', process.env.DATABASE_URL.length);
    console.log('DATABASE_URL starts with:', process.env.DATABASE_URL.substring(0, 50));
    
    // Check if the URL contains encoded characters
    if (process.env.DATABASE_URL.includes('%20')) {
      console.warn('DATABASE_URL contains encoded spaces (%20) which may cause issues');
    }
    
    // Sanitize the DATABASE_URL before using it
    const sanitizedUrl = sanitizeDatabaseUrl(process.env.DATABASE_URL);
    
    pool = new Pool({ connectionString: sanitizedUrl });
    db = drizzle({ client: pool, schema });
  } else {
    console.warn("DATABASE_URL not set - database functionality will be limited");
    db = null;
  }
} catch (error) {
  console.error("Failed to initialize database connection:", error);
  console.error("DATABASE_URL value:", process.env.DATABASE_URL);
  db = null;
}

export { pool, db };