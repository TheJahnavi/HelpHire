// server/vercel-entry.ts
import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("Vercel entry file loaded");
console.log("__dirname:", __dirname);

export const config = {
  api: {
    bodyParser: true,
  },
};

export default function handler(req: any, res: any) {
  // Handle API routes - these should be handled by vercel-handler.ts
  if (req.url.startsWith("/api/")) {
    // This should not happen as API routes are handled by vercel-handler.ts
    res.status(404).json({ message: "API route not found" });
    return;
  }

  // For all other routes, serve the SPA index.html
  const indexPath = path.join(__dirname, "public", "index.html");
  
  console.log("Checking for index.html at:", indexPath);
  
  if (!fs.existsSync(indexPath)) {
    console.error("index.html not found at:", indexPath);
    res.status(500).json({
      message: "index.html not found",
      path: indexPath,
      __dirname: __dirname
    });
    return;
  }

  console.log("Serving index.html from:", indexPath);
  
  fs.readFile(indexPath, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading index.html:", err);
      res.status(500).json({
        message: "Error reading index.html",
        error: err.message
      });
      return;
    }

    res.setHeader("Content-Type", "text/html");
    res.status(200).send(data);
  });
}