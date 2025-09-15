# SmartHire - AI-Powered Hiring Platform

## Overview

SmartHire is a professional multi-role login smart hiring web application designed to streamline the recruitment process for HR professionals and hiring managers. It enables efficient candidate data extraction via AI, job management, and user-friendly dashboards.

## Features

- **Multi-role Authentication**: Secure login for Super Admin, Company Admin, and HR roles
- **AI Resume Processing**: Upload resumes (PDF/DOCX) and extract structured data using Google Gemini AI
- **Job Management**: Create, view, and manage job postings with skill requirements
- **Candidate Management**: Add, edit, and track candidate profiles with AI-powered matching
- **Intelligent Matching**: AI-driven candidate-to-job matching with percentage scores
- **Interview Question Generation**: AI-generated technical and behavioral questions
- **Notifications System**: Real-time updates and alerts
- **Dashboard UI**: Role-specific dashboards with data visualization
- **Profile Management**: User profile editing and settings

## Technology Stack

### Frontend
- React 18.3.1
- Vite 5.4.19
- Tailwind CSS 3.4.17
- React Query 5.60.5
- TypeScript 5.6.3
- Wouter for routing

### Backend
- Express 4.21.2
- TypeScript Node.js backend
- Drizzle ORM 0.39.1
- PostgreSQL (Neon DB)
- Google Gemini API for resume parsing

### Database
- PostgreSQL (via @neondatabase/serverless)
- Drizzle ORM for schema and migrations

### Authentication
- Express Session with Connect-PG-Simple
- Passport.js Local Strategy

## Prerequisites

- Node.js 20.x
- PostgreSQL database (Neon recommended)
- Google Gemini API key

## Free Database Options

### 1. Neon Database (Recommended)
Neon is a serverless PostgreSQL that works seamlessly with this application.

**Free Tier Benefits:**
- 1 GB of storage
- 10 million rows of data
- Up to 500 compute hours per month

**Setup Steps:**
1. Go to [neon.tech](https://neon.tech) and sign up for a free account
2. Create a new project
3. Copy the connection string from the dashboard
4. Add it to your `.env` file as `DATABASE_URL`

### 2. Supabase
Another excellent PostgreSQL option with a generous free tier.

**Free Tier Benefits:**
- 500 MB database space
- 500 MB file storage
- Up to 2 GB bandwidth per month

### 3. Railway
Simple PostgreSQL database with a $5/month credit for free accounts.

## Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd SmartHire
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Copy the `.env.example` file to `.env` and update the values:
   ```bash
   cp .env.example .env
   ```
   
   Update the following variables in `.env`:
   - `DATABASE_URL`: Your PostgreSQL database connection string
   - `SESSION_SECRET`: A random secret string for session encryption
   - `GEMINI_API_KEY`: Your Google Gemini API key
   - `PORT`: Server port (default: 5000)

4. **Set up the database**
   ```bash
   npm run db:push
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Build for production**
   ```bash
   npm run build
   ```

7. **Run in production mode**
   ```bash
   npm start
   ```

## Database Schema

The application uses the following tables:
- `users`: User accounts with roles and company associations
- `companies`: Organization information
- `jobs`: Job postings with requirements
- `candidates`: Candidate profiles linked to jobs
- `notifications`: User notifications
- `todos`: Task management
- `sessions`: Session storage for authentication

## Available Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run start`: Run production server
- `npm run db:push`: Push database schema changes
- `npm run check`: Type check with TypeScript

## Project Structure

```
SmartHire/
├── client/           # React frontend
│   └── src/
│       ├── components/  # UI components
│       ├── hooks/       # Custom hooks
│       ├── lib/         # Utility functions
│       ├── pages/       # Page components
│       ├── App.tsx      # Main app component
│       └── main.tsx     # Entry point
├── server/           # Express backend
│   ├── db.ts         # Database connection
│   ├── gemini.ts     # AI integration
│   ├── index.ts      # Server entry point
│   ├── routes.ts     # API routes
│   ├── storage.ts    # Data access layer
│   └── vite.ts       # Vite integration
├── shared/           # Shared code
│   └── schema.ts     # Database schema
├── uploads/          # File uploads (temporary)
└── drizzle.config.ts # Drizzle ORM configuration
```

## Hosting Options

### Replit (Simplest)
1. Push code to GitHub
2. Import into Replit
3. Add environment variables in the dashboard
4. Run the application

### Vercel + Render
1. Deploy frontend to Vercel
2. Deploy backend to Render
3. Configure environment variables on both platforms

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## License

MIT