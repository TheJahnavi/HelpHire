# Error Tracking and Solutions

This document tracks repeated errors encountered in the SmartHire project and their solutions.

## 1. FUNCTION_INVOCATION_FAILED with 500 Status

### Error:
```
SyntaxError: The requested module './gemini.js' does not provide an export named 'calculateJobMatch'
    at ModuleJob._instantiate (node:internal/modules/esm/module_job:182:21)
```

### Cause:
The `gemini.js` file didn't have proper exports for the AI agent functions because the TypeScript file wasn't compiled correctly.

### Solution:
1. Recompiled `gemini.ts` using esbuild with correct settings:
   ```bash
   npx esbuild server/gemini.ts --platform=node --bundle --format=esm --outfile=server/gemini.js --external:openai
   ```
2. Created a build script (`build-vercel.mjs`) that compiles all necessary TypeScript files:
   - `gemini.ts` → `gemini.js`
   - `storage.ts` → `storage.js`
   - `schema.ts` → `schema.js`
3. Updated `package.json` to include a `vercel-build` script that runs the build script before the regular build process.

## 2. Login Page Not Accessible (404 NOT_FOUND)

### Error:
Login page shows 404 NOT_FOUND error.

### Cause:
Incorrect routing configuration in `vercel.json`. The routes were pointing directly to static files instead of the entry point that handles serving static files.

### Solution:
1. Updated `vercel.json` to use `server/vercel-entry.ts` as the destination for all routes:
   ```json
   {
     "src": "/api/(.*)",
     "dest": "/server/vercel-entry.ts"
   },
   {
     "src": "/(.*)",
     "dest": "/server/vercel-entry.ts"
   }
   ```
2. Ensured `server/vercel-entry.ts` properly serves static files from `dist/public` directory.

## 3. Environment Variable Issues

### Error:
API calls fail due to missing or incorrect API keys.

### Cause:
Environment variables not synchronized between local `.env` files and production platform settings.

### Solution:
1. Ensure `OPENAI_API_KEY` is set in both local `.env` file and Vercel dashboard.
2. Verify the API key format and validity through direct API testing.
3. Check that environment variable names match exactly (e.g., `OPENAI_API_KEY` vs `OPENROUTER_API_KEY`).

## 4. File Upload Issues in Vercel

### Error:
File uploads fail in Vercel serverless functions.

### Cause:
Using `multer` for file uploads is incompatible with Vercel serverless functions.

### Solution:
1. Implement custom file extraction from raw request body using buffer processing.
2. Handle file uploads by directly processing the request body and extracting files based on content-type and boundary.
3. Remove `multer` usage in Vercel serverless functions.

## 5. Port Configuration Issues

### Error:
Application not accessible on expected port.

### Cause:
Environment variables in `.env` files not taking precedence over hardcoded values.

### Solution:
1. Ensure port configuration is read from environment variables.
2. Set `PORT` in `.env` file to desired port number.
3. Update application code to use `process.env.PORT` with fallback value.

## 6. Missing API Routes

### Error:
Frontend cannot communicate with backend API endpoints.

### Cause:
Critical API routes missing from route configurations.

### Solution:
1. Ensure all API routes are properly defined in both regular and Vercel-specific route handlers.
2. Verify that route patterns match frontend expectations.
3. Test API endpoints independently to confirm they're accessible.

## 7. AI Agent Determinism Issues

### Error:
AI agents returning inconsistent results for identical inputs.

### Cause:
Temperature parameter not set to 0.0 for deterministic output.

### Solution:
1. Set `temperature=0.0` in all AI agent calls to ensure deterministic output.
2. Verify that prompts are explicit and detailed enough to guide the AI.
3. Test AI agents with identical inputs to confirm consistent results.

## 8. Serverless Function Error Handling

### Error:
`FUNCTION_INVOCATION_FAILED` errors due to unhandled exceptions.

### Cause:
Missing proper error handling in Vercel serverless functions.

### Solution:
1. Implement `try/catch` blocks in all Vercel serverless functions.
2. Log errors for debugging purposes.
3. Return appropriate error responses to clients.
4. Handle edge cases and invalid inputs gracefully.

## 9. Module Import Issues

### Error:
`ERR_MODULE_NOT_FOUND` when importing modules in serverless functions.

### Cause:
Attempting to import TypeScript (.ts) files directly at runtime.

### Solution:
1. Compile TypeScript files to JavaScript before deployment.
2. Ensure import statements reference compiled JavaScript (.js) files.
3. Use build process to ensure correct file extensions in import statements.

## 10. Database Connection Issues

### Error:
Database functionality limited or unavailable.

### Cause:
`DATABASE_URL` environment variable not set or incorrect.

### Solution:
1. Ensure `DATABASE_URL` is set in both local `.env` file and production environment.
2. Verify database connection string format and credentials.
3. Test database connectivity independently.
4. Implement fallback mechanisms for when database is unavailable.