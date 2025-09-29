# AI-Driven Candidate Interview System Implementation

## Overview
This document summarizes the implementation of the AI-Driven Candidate Interview System for the SmartHire platform. The system enables automated scheduling and conducting of AI-powered interviews for candidates.

## Components Implemented

### 1. Database Schema Updates
- **File**: `shared/schema.ts`
- **Changes**: Added new fields to the `candidates` table:
  - `interviewStatus`: varchar(50) with default 'applied'
  - `interviewDatetime`: timestamp for candidate-selected time
  - `meetingLink`: text for unique AI interview URL
  - `transcriptUrl`: text for stored interview transcript
  - `reportUrl`: text for stored AI-generated report
  - `schedulerToken`: varchar(64) unique token for public scheduling

### 2. Backend Storage Layer
- **File**: `server/storage.ts`
- **New Functions**:
  - `updateCandidateStatus(id, status)`: Updates both status and interviewStatus
  - `updateInterviewSchedule(token, datetime, link)`: Updates interview scheduling details
  - `updateInterviewResults(id, transcriptUrl, reportUrl)`: Updates interview results
  - `getCandidateForAI(id)`: Retrieves candidate with job description
  - `getReadyInterviews()`: Gets interviews ready to start

### 3. Email Service
- **File**: `server/emailService.ts`
- **Functions**:
  - `sendInterviewScheduleEmail(candidate)`: Sends scheduling email to candidate
  - `sendInterviewResultsEmail(candidate)`: Sends results email to candidate and HR

### 4. Scheduler Service
- **File**: `server/scheduler.ts`
- **Functions**:
  - `runInterviewCheck()`: Checks for interviews ready to start (runs every minute)
  - `triggerAIInterviewAgent(candidateId)`: Triggers external AI interview service

### 5. AI Logic Enhancements
- **File**: `server/gemini.ts`
- **New Functions**:
  - `generateInterviewQuestionsForAI(jobDescription, candidateResumeText)`: Generates interview questions
  - `generateInterviewReport(transcript, jobDescription)`: Generates interview analysis report

### 6. API Routes
- **File**: `server/routes.vercel.ts`
- **New Endpoints**:
  - `POST /api/candidates/:id/trigger-interview` (HR Role Only)
    - Validates HR ownership of candidate
    - Generates schedulerToken
    - Updates candidate status
    - Sends scheduling email
  - `POST /api/public/schedule-interview` (Public, Token Auth)
    - Validates schedulerToken
    - Generates meetingLink
    - Updates interview schedule
    - Sends confirmation emails
  - `POST /api/internal/interview-callback` (Internal/API Key Auth)
    - Validates API key
    - Receives interview results
    - Updates candidate records
    - Sends results emails

### 7. Frontend Components
- **Files**: 
  - `client/src/pages/InterviewSchedule.tsx`: Public scheduling interface
  - `client/src/App.tsx`: Added route for interview scheduling
  - `client/src/pages/Candidates.tsx`: Added "Trigger AI Interview" option
- **Features**:
  - Public scheduling page with datetime picker
  - Integration with candidate status management
  - Route handling for interview scheduling

### 8. Client API Integration
- **File**: `client/src/lib/api.ts`
- **New Method**:
  - `triggerInterview(candidateId)`: Client-side method to trigger AI interviews

## Workflow

1. **HR Trigger**: HR user selects "Trigger AI Interview" for a candidate with 'Resume Reviewed' status
2. **Token Generation**: System generates unique schedulerToken and sends email to candidate
3. **Candidate Scheduling**: Candidate clicks link, selects datetime, and confirms interview
4. **Interview Preparation**: System generates meetingLink and prepares for AI interview
5. **Automated Start**: Scheduler checks for ready interviews and triggers AI service
6. **Interview Conduct**: AI service conducts interview and generates transcript
7. **Report Generation**: AI analyzes transcript and generates report
8. **Results Delivery**: System updates candidate record and sends results to candidate and HR

## Security Considerations

- Scheduler tokens are unique and time-limited
- API endpoints have appropriate role-based access controls
- Internal callback uses API key authentication
- All communications use HTTPS in production

## Future Enhancements

- Integration with video conferencing platforms
- Real-time interview transcription
- Advanced sentiment analysis in reports
- Multi-language support for interviews
- Calendar integration for scheduling

## Testing

The system has been tested for:
- Database schema compatibility
- API endpoint functionality
- Email service integration
- Frontend component rendering
- Workflow completion

All components are functioning as expected and ready for production deployment.