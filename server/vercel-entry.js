// server/vercel-entry.ts
import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
console.log("Vercel entry file loaded");
console.log("__dirname:", __dirname);
var config = {
  api: {
    bodyParser: true
  }
};
function handler(req, res) {
  if (req.url.startsWith("/api/")) {
    res.status(404).json({ message: "API route not found" });
    return;
  }
  const indexPath = path.join(__dirname, "..", "dist", "public", "index.html");
  if (!fs.existsSync(indexPath)) {
    console.error("index.html not found at:", indexPath);
    res.status(500).json({
      message: "index.html not found",
      path: indexPath
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
export {
  config,
  handler as default
};
