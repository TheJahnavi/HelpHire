# Admin Feature Test Plan

## Overview
This document outlines the comprehensive test plan for verifying all implemented admin features for both Company Admin and Super Admin roles.

## Test Environment
- Client URL: http://localhost:5174
- Server URL: http://localhost:5004
- Database: PostgreSQL (connected via DATABASE_URL)

## Test Cases

### 1. Authentication & Role-based Access

#### 1.1 Company Admin Login
- [ ] Login with credentials:
  - Email: admin@techcorp.com
  - Password: hrpassword123
  - Company: TechCorp Inc
  - Role: Company Admin
- [ ] Verify redirected to Company Admin dashboard
- [ ] Verify navigation menu shows Company Admin items

#### 1.2 Super Admin Login
- [ ] Login with credentials:
  - Email: superadmin@smarthire.com
  - Password: hrpassword123
  - Role: Super Admin
- [ ] Verify redirected to Super Admin dashboard
- [ ] Verify navigation menu shows Super Admin items

#### 1.3 Role-based Access Control
- [ ] Company Admin cannot access Super Admin routes
- [ ] Super Admin cannot access Company Admin routes (without proper company context)
- [ ] Unauthenticated users redirected to login

### 2. Company Admin Features

#### 2.1 Dashboard (`/company-admin`)
- [ ] Verify dashboard loads correctly
- [ ] Verify stats cards display:
  - Total Jobs
  - Active Jobs
  - Total Candidates
  - HR Users
- [ ] Verify charts display:
  - Applications Over Time
  - Candidate Status Breakdown
- [ ] Verify API endpoints return correct data:
  - `/api/company-admin/dashboard-stats`
  - `/api/company-admin/chart-data`

#### 2.2 Job Management (`/company-admin/jobs`)
- [ ] Verify jobs table displays with columns:
  - Job Title
  - No. of Positions Opened
  - Location
  - Handled By
  - Posted Date
  - Status
  - Actions
- [ ] Verify Create Job functionality
- [ ] Verify Edit Job functionality
- [ ] Verify Delete Job functionality
- [ ] Verify API endpoint `/api/company-admin/jobs` returns correct data

#### 2.3 HR User Management (`/company-admin/hr-users`)
- [ ] Verify HR users table displays with columns:
  - Name
  - Email
  - Count of Jobs Handled
  - Count of Candidates
  - Company
  - Status
  - Actions
- [ ] Verify Create HR User functionality
- [ ] Verify Delete HR User functionality
- [ ] Verify API endpoint `/api/company-admin/hr-users` returns correct data

#### 2.4 Subscription Management (`/company-admin/subscription`)
- [ ] Verify subscription information displays:
  - Plan Name
  - Price
  - Renewal Date
- [ ] Verify subscription management buttons:
  - Upgrade/Downgrade Plan
  - Cancel Subscription
- [ ] Verify API endpoint `/api/company/subscription` returns correct data

### 3. Super Admin Features

#### 3.1 Dashboard (`/super-admin`)
- [ ] Verify dashboard loads correctly
- [ ] Verify stats cards display:
  - Total Companies
  - Total Users
  - Total Jobs
  - New Users
- [ ] Verify charts display:
  - New Companies Over Time
  - Jobs Posted Per Company
  - User Roles Breakdown
- [ ] Verify API endpoint `/api/super-admin/dashboard-stats` returns correct data

#### 3.2 Companies Management (`/super-admin/companies`)
- [ ] Verify companies table displays correctly
- [ ] Verify Add Company functionality
- [ ] Verify Delete Company functionality (with cascading delete)
- [ ] Verify API endpoint `/api/super-admin/companies` returns correct data

#### 3.3 User Management (`/super-admin/users`)
- [ ] Verify users table displays all users
- [ ] Verify API endpoint `/api/super-admin/users` returns correct data

#### 3.4 Subscription Management (`/super-admin/subscriptions`)
- [ ] Verify subscription plans table displays
- [ ] Verify company subscriptions table displays
- [ ] Verify API endpoint `/api/super-admin/subscriptions` returns correct data

### 4. Shared Admin Features

#### 4.1 Profile (`/profile`)
- [ ] Verify user profile information displays:
  - Name
  - Email
  - Role
- [ ] Verify password update functionality
- [ ] Verify API endpoint `/api/user/profile` works correctly

#### 4.2 Notifications (`/notifications`)
- [ ] Verify notifications table displays
- [ ] Verify API endpoint `/api/user/notifications` returns correct data

### 5. Backend API Endpoints

#### 5.1 Company Admin Endpoints
- [ ] `/api/company-admin/dashboard-stats` - Returns dashboard statistics
- [ ] `/api/company-admin/chart-data` - Returns chart data
- [ ] `/api/company-admin/jobs` - Returns company jobs
- [ ] `/api/company-admin/jobs` (POST) - Creates new job
- [ ] `/api/company-admin/jobs/:id` (PUT) - Updates job
- [ ] `/api/company-admin/jobs/:id` (DELETE) - Deletes job
- [ ] `/api/company-admin/hr-users` - Returns HR users
- [ ] `/api/company-admin/hr-users` (POST) - Creates HR user
- [ ] `/api/company-admin/hr-users/:id` (DELETE) - Deletes HR user
- [ ] `/api/company/subscription` - Returns subscription info

#### 5.2 Super Admin Endpoints
- [ ] `/api/super-admin/dashboard-stats` - Returns dashboard statistics
- [ ] `/api/super-admin/companies` - Returns all companies
- [ ] `/api/super-admin/companies` (POST) - Creates new company
- [ ] `/api/super-admin/companies/:id` (DELETE) - Deletes company with cascading delete
- [ ] `/api/super-admin/users` - Returns all users
- [ ] `/api/super-admin/subscriptions` - Returns subscription information

#### 5.3 Shared Endpoints
- [ ] `/api/user/profile` - Returns user profile
- [ ] `/api/user/profile` (PUT) - Updates user profile
- [ ] `/api/user/notifications` - Returns user notifications

### 6. Database Operations

#### 6.1 Cascading Delete
- [ ] Verify deleting a company removes all associated:
  - Users
  - Jobs
  - Candidates
  - Notifications
  - Todos
- [ ] Verify no foreign key constraint violations

### 7. UI/UX Components

#### 7.1 Top Navigation Bar
- [ ] Verify application logo displays correctly
- [ ] Verify search bar functionality
- [ ] Verify bell icon for notifications
- [ ] Verify user avatar/name dropdown
- [ ] Verify responsive design

#### 7.2 Cards/Widgets
- [ ] Verify dashboard cards display correctly
- [ ] Verify dark mode support
- [ ] Verify consistent styling

#### 7.3 Data Tables
- [ ] Verify sortable columns
- [ ] Verify search functionality
- [ ] Verify pagination
- [ ] Verify responsive design

#### 7.4 Pop-up Modals
- [ ] Verify all forms open in modals
- [ ] Verify confirmation prompts for delete actions
- [ ] Verify proper validation
- [ ] Verify responsive design

## Test Execution

### Manual Testing
1. Navigate to http://localhost:5174
2. Test each role login
3. Navigate through all pages
4. Test all CRUD operations
5. Verify data displays correctly
6. Test error scenarios

### API Testing
1. Use curl or Postman to test all endpoints
2. Verify authentication requirements
3. Verify data format and structure
4. Test error responses

## Success Criteria
- All pages load without errors
- All API endpoints return correct data
- Role-based access control works correctly
- All CRUD operations function properly
- UI/UX meets requirements
- No console errors in browser
- No server errors in logs