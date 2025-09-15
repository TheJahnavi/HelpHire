import 'dotenv/config';
import express from "express";
import { registerRoutes } from "./routes";
import { serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add a simple test endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Register routes (without waiting for the promise to resolve)
registerRoutes(app);

// Serve static files
serveStatic(app);

log("Vercel server initialized");

// Export the app for Vercel
export default app;