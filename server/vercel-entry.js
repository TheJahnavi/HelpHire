// server/vercel-entry.ts
import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
console.log("Vercel entry file loaded");
console.log("__dirname:", __dirname);
console.log("dist path:", path.join(__dirname, "..", "dist", "public"));
var app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
var staticPath = path.join(__dirname, "..", "dist", "public");
console.log("Static path:", staticPath);
app.use(express.static(staticPath));
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Server is running",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    DATABASE_URL_SET: !!process.env.DATABASE_URL,
    VERCEL_ENV: process.env.VERCEL,
    staticPath
  });
});
app.get("*", (req, res) => {
  const indexPath = path.join(__dirname, "..", "dist", "public", "index.html");
  if (!fs.existsSync(indexPath)) {
    console.error("index.html not found at:", indexPath);
    return res.status(500).json({
      message: "index.html not found",
      path: indexPath,
      staticPath
    });
  }
  console.log("Serving index.html from:", indexPath);
  res.sendFile(indexPath);
});
console.log("Vercel server initialized");
var vercel_entry_default = app;
export {
  vercel_entry_default as default
};
