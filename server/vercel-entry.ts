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

// Try multiple possible paths for the dist directory
const possiblePaths = [
  path.join(__dirname, '..', 'dist', 'public'),
  path.join(__dirname, 'dist', 'public'),
  path.join(process.cwd(), 'dist', 'public'),
  path.join(process.cwd(), 'public')
];

let staticPath = '';
for (const possiblePath of possiblePaths) {
  console.log('Checking path:', possiblePath);
  if (fs.existsSync(possiblePath)) {
    staticPath = possiblePath;
    console.log('Found static path:', staticPath);
    break;
  }
}

if (!staticPath) {
  console.error('Could not find dist/public directory in any of the expected locations');
  console.log('Current working directory:', process.cwd());
  console.log('Directory contents of current dir:', fs.readdirSync(process.cwd()));
  try {
    console.log('Directory contents of __dirname:', fs.readdirSync(__dirname));
  } catch (error) {
    console.log('Could not read __dirname:', error);
  }
  try {
    console.log('Directory contents of parent dir:', fs.readdirSync(path.join(__dirname, '..')));
  } catch (error) {
    console.log('Could not read parent dir:', error);
  }
}

const app: Express = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files from the dist/public directory
if (staticPath) {
  console.log('Serving static files from:', staticPath);
  app.use(express.static(staticPath));
} else {
  console.warn('Static file serving disabled due to missing dist/public directory');
}

// Simple API routes that don't depend on database or session
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    DATABASE_URL_SET: !!process.env.DATABASE_URL,
    VERCEL_ENV: process.env.VERCEL,
    staticPath,
    cwd: process.cwd(),
    __dirname
  });
});

// Serve index.html for all non-API routes (for client-side routing)
app.get("*", (req, res) => {
  // Don't serve index.html for API routes
  if (req.url.startsWith('/api/')) {
    return res.status(404).json({ message: "API route not found" });
  }
  
  // If we couldn't find the static path, return an error
  if (!staticPath) {
    return res.status(500).json({ 
      message: 'Static files directory not found',
      possiblePaths,
      cwd: process.cwd()
    });
  }
  
  // Serve the index.html file
  const indexPath = path.join(staticPath, 'index.html');
  
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