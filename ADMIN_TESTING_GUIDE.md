# Admin Dashboard Testing Guide

## Overview
This guide provides instructions for testing the Company Admin and Super Admin dashboard implementations.

## Prerequisites
- Node.js installed
- PostgreSQL database configured
- Environment variables set in `.env` file

## Starting the Application

### 1. Start the Server
```bash
cd server
npm run dev
```
The server will start on port 5004.

### 2. Start the Client
```bash
npx vite --port 5174
```
The client will start on port 5174.

## Accessing the Application
Open your browser and navigate to: http://localhost:5174

## Test Credentials

### Company Admin
- Email: admin@techcorp.com
- Password: hrpassword123
- Company: TechCorp Inc
- Role: Company Admin

### Super Admin
- Email: superadmin@smarthire.com
- Password: hrpassword123
- Role: Super Admin

## Testing the Admin Flows

### Company Admin Testing
1. Login with Company Admin credentials
2. Navigate through the following pages:
   - Dashboard (`/company-admin`)
   - Jobs (`/company-admin/jobs`)
   - HR Users (`/company-admin/hr-users`)
   - Subscription (`/company-admin/subscription`)
   - Profile (`/profile`)
   - Notifications (`/notifications`)

### Super Admin Testing
1. Login with Super Admin credentials
2. Navigate through the following pages:
   - Dashboard (`/super-admin`)
   - Companies (`/super-admin/companies`)
   - Users (`/super-admin/users`)
   - Subscriptions (`/super-admin/subscriptions`)
   - Profile (`/profile`)
   - Notifications (`/notifications`)

## API Endpoint Testing

### Using curl
Test the health endpoint:
```bash
curl http://localhost:5004/api/health
```

Test protected endpoints (should return 403 without authentication):
```bash
curl http://localhost:5004/api/company-admin/dashboard-stats
curl http://localhost:5004/api/super-admin/companies
```

### Using the provided test scripts
Run the automated endpoint tests:
```bash
node test-admin-endpoints.cjs
node test-cascading-delete.cjs
```

## Testing Cascading Delete (Super Admin)

1. Login as Super Admin
2. Navigate to Companies page
3. Create a new company
4. Add some jobs and users to the company
5. Delete the company
6. Verify all associated data is removed

## Manual Testing Checklist

### UI/UX Components
- [ ] Top navigation bar displays correctly
- [ ] Dark mode works properly
- [ ] All pages load without errors
- [ ] Data tables display correctly
- [ ] Forms open in modals
- [ ] Validation works properly

### Company Admin Features
- [ ] Dashboard displays correct metrics
- [ ] Jobs management works (CRUD operations)
- [ ] HR users management works (Create/Delete)
- [ ] Subscription information displays correctly
- [ ] Profile updates work
- [ ] Notifications display correctly

### Super Admin Features
- [ ] Dashboard displays correct metrics
- [ ] Companies management works (Create/Delete with cascading)
- [ ] Users management displays all users
- [ ] Subscription management works
- [ ] Profile updates work
- [ ] Notifications display correctly

### Security
- [ ] Company Admin cannot access Super Admin routes
- [ ] Super Admin cannot access Company Admin routes without context
- [ ] Unauthenticated users redirected to login
- [ ] Role-based data filtering works correctly

## Troubleshooting

### Port Conflicts
If you encounter port conflicts:
1. Check which processes are using the ports:
   ```bash
   netstat -ano | findstr :5004
   netstat -ano | findstr :5174
   ```
2. Kill the conflicting processes:
   ```bash
   taskkill /PID <process_id> /F
   ```

### Database Connection Issues
1. Verify DATABASE_URL is set correctly in `.env` file
2. Ensure the database is accessible
3. Check database credentials

### Authentication Issues
1. Clear browser cookies and cache
2. Verify test credentials are correct
3. Check server logs for authentication errors

## Additional Resources
- Implementation Summary: `IMPLEMENTATION_SUMMARY.md`
- Test Plan: `admin-feature-test-plan.md`
- API Documentation: Check the route files in `server/routes.vercel.ts`