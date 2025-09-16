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

// Debug endpoint to see file structure
app.get('/api/debug-paths', (req, res) => {
  const debugInfo: any = {
    cwd: process.cwd(),
    __dirname: __dirname,
    env: process.env.VERCEL ? 'Vercel Environment' : 'Local Environment',
    checkedPaths: []
  };

  // Check multiple possible paths
  const possiblePaths = [
    path.resolve(__dirname, "..", "dist", "public"),
    path.resolve(__dirname, "..", "..", "dist", "public"),
    path.resolve(process.cwd(), "dist", "public"),
    path.resolve("/var/task/dist/public"),
    path.resolve(__dirname, "..", "dist"),
    path.resolve(__dirname, "..", "..", "dist"),
    path.resolve(process.cwd(), "dist"),
    path.resolve("/var/task/dist"),
  ];

  for (const possiblePath of possiblePaths) {
    const exists = fs.existsSync(possiblePath);
    debugInfo.checkedPaths.push({
      path: possiblePath,
      exists: exists,
      isDirectory: exists ? fs.statSync(possiblePath).isDirectory() : false,
      files: exists && fs.statSync(possiblePath).isDirectory() ? fs.readdirSync(possiblePath) : []
    });
  }

  res.json(debugInfo);
});

// Serve static files directly - check multiple possible paths
const possiblePaths = [
  path.resolve(__dirname, "..", "dist", "public"),  // Local development
  path.resolve(__dirname, "..", "..", "dist", "public"),  // Vercel deployment
  path.resolve(process.cwd(), "dist", "public"),  // Alternative path
  path.resolve("/var/task/dist/public"),  // Vercel specific path
  path.resolve(__dirname, "..", "dist"),  // Fallback paths
  path.resolve(__dirname, "..", "..", "dist"),
  path.resolve(process.cwd(), "dist"),
];

let distPath = "";
for (const possiblePath of possiblePaths) {
  console.log("Checking path:", possiblePath);
  if (fs.existsSync(possiblePath)) {
    const stat = fs.statSync(possiblePath);
    if (stat.isDirectory()) {
      // Check if this directory has the files we need
      const files = fs.readdirSync(possiblePath);
      if (files.includes('index.html') || files.includes('public')) {
        distPath = possiblePath;
        console.log("Found static files at:", distPath);
        break;
      } else if (files.length > 0) {
        // If it has files but no index.html, it might be the public directory itself
        distPath = possiblePath;
        console.log("Found directory with files at:", distPath);
        break;
      }
    }
  }
}

if (distPath) {
  console.log("Serving static files from:", distPath);
  app.use(express.static(distPath));
  
  // Fall through to index.html for client-side routing
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
} else {
  console.warn("Could not find the build directory. Checked paths:", possiblePaths);
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