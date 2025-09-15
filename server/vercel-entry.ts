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

// Serve static files directly
const distPath = path.resolve(__dirname, "..", "dist", "public");

if (fs.existsSync(distPath)) {
  console.log("Serving static files from:", distPath);
  app.use(express.static(distPath));
  
  // Fall through to index.html for client-side routing
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
} else {
  console.warn("Could not find the build directory at:", distPath);
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