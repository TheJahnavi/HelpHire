import 'dotenv/config';
import express, { type Express } from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Debug logging
console.log('Vercel entry file loaded');
console.log('__dirname:', __dirname);
console.log('dist path:', path.join(__dirname, '..', 'dist', 'public'));

const app: Express = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files from the dist/public directory
const staticPath = path.join(__dirname, '..', 'dist', 'public');
console.log('Static path:', staticPath);
app.use(express.static(staticPath));

// Add a simple test endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    DATABASE_URL_SET: !!process.env.DATABASE_URL,
    VERCEL_ENV: process.env.VERCEL,
    staticPath
  });
});

// API routes - explicitly handle them before the catch-all
app.get('/api/*', (req, res) => {
  // This will be handled by the serverless functions
  res.status(404).json({ message: "API route not found in vercel-entry" });
});

// Serve index.html for all non-API routes (for client-side routing)
app.get("*", (req, res) => {
  // Don't serve index.html for API routes
  if (req.url.startsWith('/api/')) {
    return res.status(404).json({ message: "API route not found" });
  }

  // Serve the index.html file
  const indexPath = path.join(__dirname, '..', 'dist', 'public', 'index.html');
  
  // Check if file exists
  if (!fs.existsSync(indexPath)) {
    console.error('index.html not found at:', indexPath);
    return res.status(500).json({ 
      message: 'index.html not found',
      path: indexPath,
      staticPath
    });
  }

  console.log('Serving index.html from:', indexPath);
  res.sendFile(indexPath);
});

console.log("Vercel server initialized");

// Export the app for Vercel
export default app;