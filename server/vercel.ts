import 'dotenv/config';
import express from "express";
import { registerRoutes } from "./routes";
import { serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Export the app for Vercel
export default app;

// Register routes
registerRoutes(app).then(() => {
  // Serve static files
  serveStatic(app);
  
  log("Vercel server initialized");
});