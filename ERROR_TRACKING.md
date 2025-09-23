# Error Tracking and Solutions

This document tracks repeated errors encountered in the SmartHire project and their solutions to prevent future occurrences.

## 1. FUNCTION_INVOCATION_FAILED

### Error:
Vercel deployment fails with `FUNCTION_INVOCATION_FAILED` error.

### Cause:
TypeScript files were not being properly compiled for Vercel serverless functions.

### Solution:
1. Updated build process to properly compile TypeScript files using esbuild
2. Ensured all serverless function files are compiled to JavaScript before deployment
3. Verified that the vercel.json configuration correctly points to the compiled files

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

## 3. API Routes Not Working (404 NOT_FOUND)

### Error:
API endpoints like `/api/auth/login` return 404 NOT_FOUND errors.

### Cause:
Incorrect routing configuration in `vercel.json` where API routes were not being directed to the correct handler.

### Solution:
1. Updated `vercel.json` to properly route API requests to `server/vercel-handler.ts`:
   ```json
   {
     "src": "/api/(.*)",
     "dest": "/server/vercel-handler.ts"
   }
   ```
2. Ensured `server/vercel-handler.ts` properly handles all API routes
3. Removed API route handling from `server/vercel-entry.ts` to prevent conflicts

## 4. Environment Variable Issues

### Error:
Application fails to start or functions incorrectly due to missing or incorrect environment variables.

### Cause:
Environment variables not properly set in Vercel dashboard or not synchronized with local `.env` file.

### Solution:
1. Ensure all required environment variables are set in Vercel dashboard
2. Synchronize environment variables between local `.env` file and Vercel dashboard
3. Verify that sensitive variables like `DATABASE_URL` and `OPENROUTER_API_KEY` are correctly configured

## 5. File Upload Issues

### Error:
File upload functionality fails in production environment.

### Cause:
Vercel serverless functions have limitations with file uploads and temporary file storage.

### Solution:
1. Implement different handling for file uploads in development vs production
2. Use Vercel's recommended approach for file handling in serverless environments
3. Provide clear error messages to users when file uploads are not supported in production

## 6. Port Conflict Issues

### Error:
Server fails to start due to port already being in use.

### Cause:
Previous server instances not properly terminated or multiple services trying to use the same port.

### Solution:
1. Change port configuration in `.env` file to use an available port
2. Ensure proper termination of previous server instances
3. Use process managers to handle server lifecycle

## 7. Database Connection Issues

### Error:
Application fails to connect to the database.

### Cause:
Incorrect database URL configuration or network connectivity issues.

### Solution:
1. Verify `DATABASE_URL` is correctly formatted and accessible
2. Check database credentials and permissions
3. Ensure the database service is running and accessible from the application environment

## 8. AI Agent API Connection Issues

### Error:
AI agents fail to return proper responses, falling back to mock data.

### Cause:
API key issues, network connectivity problems, or incorrect API endpoint configuration.

### Solution:
1. Verify `OPENROUTER_API_KEY` is correctly set and valid
2. Check Vercel logs for specific error messages
3. Ensure the AI API endpoint is correctly configured in `server/gemini.ts`
4. Test API connectivity independently to verify the key and endpoint are working

## Prevention Strategies

1. **Regular Testing**: Test all critical functionality after each deployment
2. **Environment Synchronization**: Keep local and production environments synchronized
3. **Error Monitoring**: Implement proper error logging and monitoring
4. **Documentation**: Keep this document updated with new issues and solutions
5. **Code Reviews**: Implement code review processes to catch potential issues before deployment