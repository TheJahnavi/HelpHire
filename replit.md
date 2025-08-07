# Smart Hiring Web Application

## Overview

This is a comprehensive AI-powered smart hiring web application built with a modern full-stack architecture. The application serves multiple user roles (Super Admin, Company Admin, HR) and provides intelligent resume matching, automated AI interviews, and performance reporting capabilities. The system is designed to be mobile-friendly with a professional, high-end aesthetic supporting both light and dark themes.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite for build tooling
- **UI Library**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Theme Support**: Custom theme provider supporting light/dark modes with system preference detection

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Replit OAuth integration with session management
- **File Handling**: Multer for resume upload processing (PDF/DOCX support)
- **Session Storage**: PostgreSQL-based session store using connect-pg-simple

### Database Design
The application uses a PostgreSQL database with the following core entities:
- **Users**: Multi-role system (Super Admin, Company Admin, HR) with company associations
- **Companies**: Organization management with logo support
- **Jobs**: Position management with skills arrays and experience requirements
- **Candidates**: Applicant tracking with AI matching percentages and resume storage
- **Notifications**: Real-time user notifications system
- **Todos**: Task management for HR workflows
- **Sessions**: Secure session storage for authentication

### Key Features Architecture
- **Multi-role Dashboard**: Role-based UI rendering with different permissions and views
- **AI-Powered Resume Processing**: Real PDF/DOCX parsing with Gemini AI extraction and analysis
- **Intelligent Job Matching**: AI-driven candidate-to-job matching with percentage scores and gap analysis
- **Interview Question Generation**: Tailored technical and behavioral questions based on candidate profiles
- **Real-time Notifications**: Live updates for application status changes
- **Responsive Design**: Mobile-first approach with professional theming
- **File Upload System**: Multi-file resume processing with automated cleanup and error handling

### Development Environment
- **Build System**: Vite with hot module replacement for development
- **Type Safety**: Comprehensive TypeScript coverage across frontend and backend
- **Code Organization**: Monorepo structure with shared schema definitions
- **Path Aliases**: Configured for clean imports (@/ for client, @shared for common code)

## External Dependencies

### Core Infrastructure
- **Database**: PostgreSQL (configured for Neon serverless)
- **Authentication**: Replit OAuth service integration
- **Session Management**: PostgreSQL-backed session storage

### UI and Frontend Libraries
- **Design System**: Radix UI primitives with shadcn/ui components
- **Charts**: Recharts for data visualization
- **Icons**: Lucide React icon library
- **Form Handling**: React Hook Form with Zod validation

### Backend Services
- **Database Driver**: Neon serverless PostgreSQL client
- **AI Services**: Google Gemini 2.0 Flash for resume analysis, job matching, and question generation
- **File Processing**: pdf-parse for PDF extraction, mammoth for DOCX parsing, multer for multipart forms
- **Session Store**: connect-pg-simple for PostgreSQL session persistence

### Development Tools
- **Build Tool**: Vite with React plugin
- **Database Migrations**: Drizzle Kit for schema management
- **Type Validation**: Zod for runtime type checking
- **Development**: Replit-specific plugins for runtime error handling and cartography

The architecture is designed to scale with the business needs while maintaining type safety and developer experience. The separation of concerns between client, server, and shared code enables maintainable development practices.