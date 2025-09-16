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

// Enhanced static file serving with comprehensive debugging
function findStaticFilesDirectory() {
  console.log("=== Static File Directory Search ===");
  console.log("Vercel environment:", process.env.VERCEL ? 'Yes' : 'No');
  console.log("Current working directory:", process.cwd());
  console.log("Current __dirname:", __dirname);
  
  // Log directory contents for debugging
  try {
    console.log("__dirname contents:", fs.readdirSync(__dirname));
    const parentDir = path.join(__dirname, '..');
    console.log("Parent directory contents:", fs.readdirSync(parentDir));
    console.log("Current directory contents:", fs.readdirSync(process.cwd()));
  } catch (err) {
    console.error("Error reading directory contents:", err);
  }

  // Check multiple possible paths for dist/public
  const possiblePaths = [
    // Standard paths
    path.join(process.cwd(), 'dist', 'public'),
    path.join(__dirname, '..', 'dist', 'public'),
    path.join(__dirname, '..', '..', 'dist', 'public'),
    
    // Vercel-specific paths
    path.join('/var/task', 'dist', 'public'),
    path.join(process.cwd(), 'public'),
    path.join(__dirname, '..', 'public'),
    path.join(__dirname, 'public'),
    
    // Additional Vercel paths
    path.join(process.cwd(), '.vercel', 'output', 'static'),
    path.join(__dirname, '..', '.vercel', 'output', 'static'),
  ];

  let distPath = '';
  let foundPath = false;

  for (const possiblePath of possiblePaths) {
    console.log("Checking for static files at:", possiblePath);
    try {
      if (fs.existsSync(possiblePath)) {
        const stat = fs.statSync(possiblePath);
        if (stat.isDirectory()) {
          distPath = possiblePath;
          foundPath = true;
          console.log("Static files found at:", distPath);
          try {
            const contents = fs.readdirSync(distPath);
            console.log("Directory contents:", contents);
            if (contents.includes('index.html')) {
              console.log("index.html found in directory");
            } else {
              console.log("index.html NOT found in directory");
            }
          } catch (err) {
            console.error("Error reading directory contents:", err);
          }
          break;
        }
      } else {
        console.log("Path does not exist:", possiblePath);
      }
    } catch (err) {
      console.error("Error checking path:", possiblePath, err);
    }
  }

  // Additional debugging - check what's in the current directory and its parent
  try {
    console.log("=== Additional Directory Information ===");
    console.log("Current directory contents:", fs.readdirSync(process.cwd()));
    if (fs.existsSync(path.join(process.cwd(), 'dist'))) {
      console.log("Contents of dist directory:", fs.readdirSync(path.join(process.cwd(), 'dist')));
      if (fs.existsSync(path.join(process.cwd(), 'dist', 'public'))) {
        console.log("Contents of dist/public directory:", fs.readdirSync(path.join(process.cwd(), 'dist', 'public')));
      }
    }
  } catch (err) {
    console.error("Error reading directory contents:", err);
  }

  if (foundPath) {
    return distPath;
  }
  
  console.error("Static files directory not found at any of the checked paths:");
  console.error("Checked paths:", possiblePaths);
  return null;
}

const distPath = findStaticFilesDirectory();

if (distPath) {
  console.log("Serving static files from:", distPath);
  app.use(express.static(distPath));  

  // Fall through to index.html for client-side routing
  app.use("*", (req, res) => {
    console.log("Sending index.html for request:", req.url);
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  console.error("Falling back to JSON response because static files were not found");
  
  // Fallback to JSON response if static files are not found
  app.use("*", (_req, res) => {
    res.status(200).json({ 
      message: "API server is running", 
      timestamp: new Date().toISOString() 
    });
  });
}

console.log("Vercel server initialized");

// Export the app for Vercel
export default app;