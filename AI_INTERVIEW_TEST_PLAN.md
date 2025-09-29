# AI-Driven Candidate Interview System Test Plan

## Overview
This document outlines the test plan for verifying the AI-Driven Candidate Interview System implementation.

## Test Environment
- Local development environment
- PostgreSQL database
- Node.js backend
- React frontend
- Port 5004 for backend API

## Test Cases

### 1. Database Schema Verification
- [ ] Verify all new columns exist in candidates table:
  - interview_status
  - interview_datetime
  - meeting_link
  - transcript_url
  - report_url
  - scheduler_token

### 2. Backend API Endpoints

#### 2.1 Trigger Interview Endpoint
- [ ] Test POST /api/candidates/:id/trigger-interview
- [ ] Verify HR role authentication requirement
- [ ] Check scheduler token generation
- [ ] Verify email notification simulation

#### 2.2 Public Scheduling Endpoint
- [ ] Test POST /api/public/schedule-interview
- [ ] Verify token validation
- [ ] Check meeting link generation
- [ ] Verify interview status update

#### 2.3 Internal Callback Endpoint
- [ ] Test POST /api/internal/interview-callback
- [ ] Verify API key authentication
- [ ] Check transcript and report URL storage
- [ ] Verify interview completion status

### 3. Backend Functions

#### 3.1 Storage Functions
- [ ] updateCandidateStatus(id, status)
- [ ] updateInterviewSchedule(token, datetime, link)
- [ ] updateInterviewResults(id, transcriptUrl, reportUrl)
- [ ] getCandidateForAI(id)
- [ ] getReadyInterviews()

#### 3.2 Email Service
- [ ] sendInterviewScheduleEmail(candidate)
- [ ] sendInterviewResultsEmail(candidate)

#### 3.3 Scheduler Service
- [ ] runInterviewCheck()
- [ ] triggerAIInterviewAgent(candidateId)

#### 3.4 AI Logic
- [ ] generateInterviewQuestionsForAI(jobDescription, candidateResumeText)
- [ ] generateInterviewReport(transcript, jobDescription)

### 4. Frontend Components

#### 4.1 HR Dashboard Integration
- [ ] Verify "Trigger AI Interview" button appears for "Resume Reviewed" candidates
- [ ] Check interview status display in candidate list
- [ ] Verify transcript and report link visibility when available

#### 4.2 Public Scheduling Page
- [ ] Test InterviewSchedule page rendering
- [ ] Verify token parameter handling
- [ ] Check datetime selection functionality
- [ ] Verify scheduling confirmation flow

### 5. End-to-End Workflow

#### 5.1 Happy Path
1. [ ] HR triggers AI interview for candidate
2. [ ] System generates scheduler token
3. [ ] Candidate receives scheduling email (simulated)
4. [ ] Candidate visits scheduling page
5. [ ] Candidate selects interview datetime
6. [ ] System generates meeting link
7. [ ] Interview is scheduled in database
8. [ ] Scheduler detects ready interview
9. [ ] AI interview agent is triggered
10. [ ] Interview is conducted (simulated)
11. [ ] Transcript and report are generated
12. [ ] Results are stored in database
13. [ ] Candidate and HR receive results emails (simulated)

#### 5.2 Error Cases
- [ ] Invalid scheduler token handling
- [ ] Expired scheduler token handling
- [ ] Invalid API key for internal callback
- [ ] Missing required parameters
- [ ] Database connection errors

## Manual Testing Instructions

### Test 1: HR Dashboard Integration
1. Log in as HR user
2. Navigate to Candidates page
3. Find a candidate with "Resume Reviewed" status
4. Verify "Trigger AI Interview" option is available
5. Click the option and verify success message

### Test 2: Public Scheduling Page
1. Get a scheduler token from the database or logs
2. Visit http://localhost:5004/interview/schedule?token=[TOKEN]
3. Select a datetime for the interview
4. Submit the form
5. Verify scheduling confirmation

### Test 3: Internal Callback
1. Prepare a POST request to /api/internal/interview-callback
2. Include required headers (API key)
3. Include candidateId, transcriptUrl, and reportUrl in body
4. Send request
5. Verify database update

## Automated Testing
- [ ] Unit tests for backend functions
- [ ] Integration tests for API endpoints
- [ ] Frontend component tests
- [ ] End-to-end workflow tests

## Success Criteria
- All test cases pass
- No errors in application logs
- Database schema correctly updated
- All new features function as expected
- No regression in existing functionality

## Rollback Plan
If issues are found:
1. Revert database schema changes
2. Remove new API endpoints
3. Restore previous frontend components
4. Document issues and fix before re-deployment