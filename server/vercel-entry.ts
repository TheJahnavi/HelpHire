import 'dotenv/config';
import express, { type Express } from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Express = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add a simple test endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    DATABASE_URL_SET: !!process.env.DATABASE_URL,
    VERCEL_ENV: process.env.VERCEL
  });
});

// Serve index.html for all non-API routes (for client-side routing)
app.get("*", (req, res) => {
  // Don't serve index.html for API routes
  if (req.url.startsWith('/api/')) {
    return res.status(404).json({ message: "API route not found" });
  }
  
  // Try multiple possible paths for index.html
  const possiblePaths = [
    path.join(__dirname, '..', 'dist', 'public', 'index.html'),
    path.join(__dirname, 'dist', 'public', 'index.html'),
    path.join(process.cwd(), 'dist', 'public', 'index.html'),
    path.join(process.cwd(), '..', 'dist', 'public', 'index.html')
  ];
  
  let indexPath = '';
  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath)) {
      indexPath = possiblePath;
      break;
    }
  }
  
  // If we still can't find the file, log all paths for debugging
  if (!indexPath) {
    console.error('Could not find index.html in any of these locations:', possiblePaths);
    return res.status(500).json({ 
      message: 'Could not find index.html', 
      attemptedPaths: possiblePaths 
    });
  }
  
  console.log('Serving index.html from:', indexPath);
  res.sendFile(indexPath);
});

console.log("Vercel server initialized");

// Export the app for Vercel
export default app;