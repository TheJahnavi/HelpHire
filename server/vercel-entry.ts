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

// Function to find the dist/public directory
function findDistPublicDir(): string | null {
  // In Vercel, files are typically at /var/task
  const possiblePaths = [
    path.join(__dirname, "..", "dist", "public"),
    path.join(__dirname, "..", "..", "dist", "public"),
    path.join(process.cwd(), "dist", "public"),
    "/var/task/dist/public",
    "/var/task/public",
    path.join("/var/task", process.env.VERCEL_PROJECT_ID || "", "dist", "public"),
  ];

  for (const possiblePath of possiblePaths) {
    console.log(`Checking for static files at: ${possiblePath}`);
    if (fs.existsSync(possiblePath)) {
      console.log(`Found static files at: ${possiblePath}`);
      return possiblePath;
    }
  }

  console.warn("Could not find static files in any of the expected locations");
  console.log("Current working directory:", process.cwd());
  console.log("__dirname:", __dirname);
  console.log("Environment VERCEL:", process.env.VERCEL);
  
  // List contents of parent directories to help debug
  try {
    const parentDir = path.join(__dirname, "..");
    if (fs.existsSync(parentDir)) {
      console.log("Contents of parent directory:", fs.readdirSync(parentDir));
    }
    
    const cwdContents = fs.readdirSync(process.cwd());
    console.log("Contents of current working directory:", cwdContents);
    
    if (fs.existsSync("/var/task")) {
      console.log("Contents of /var/task:", fs.readdirSync("/var/task"));
    }
  } catch (err) {
    console.log("Error reading directory contents:", err);
  }
  
  return null;
}

const distPath = findDistPublicDir();

if (distPath) {
  console.log("Serving static files from:", distPath);
  app.use(express.static(distPath));
  
  // Fall through to index.html for client-side routing
  app.use("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
} else {
  console.warn("Could not find the build directory. Serving API only.");
  // If no static files, just return a simple message
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