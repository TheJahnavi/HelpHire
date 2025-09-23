import 'dotenv/config';
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Debug logging
console.log('Vercel entry file loaded');
console.log('__dirname:', __dirname);

// Add a simple test endpoint
export const config = {
  api: {
    bodyParser: true,
  },
};

export default function handler(req: any, res: any) {
  // Handle API routes - these should be handled by vercel-handler.js
  if (req.url.startsWith('/api/')) {
    // This shouldn't happen as API routes are handled by vercel-handler.js
    // But just in case, return a 404
    res.status(404).json({ message: 'API route not found' });
    return;
  }
  
  // Serve index.html for all non-API routes (for client-side routing)
  // Serve the index.html file
  // When compiled, this file will be in dist/, so we need to look in dist/public
  const indexPath = path.join(__dirname, 'public', 'index.html');
  
  // Check if file exists
  if (!fs.existsSync(indexPath)) {
    console.error('index.html not found at:', indexPath);
    res.status(500).json({ 
      message: 'index.html not found',
      path: indexPath
    });
    return;
  }

  console.log('Serving index.html from:', indexPath);
  // Read the file and send it as response
  fs.readFile(indexPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading index.html:', err);
      res.status(500).json({ 
        message: 'Error reading index.html',
        error: err.message
      });
      return;
    }
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(data);
  });
}