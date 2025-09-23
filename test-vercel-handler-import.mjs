// Test script to verify vercel-handler.ts can import gemini.js functions
import { extractResumeData, calculateJobMatch, generateInterviewQuestions } from './server/gemini.js';

console.log('Testing vercel-handler imports...');

// Check if functions are properly imported
console.log('extractResumeData:', typeof extractResumeData);
console.log('calculateJobMatch:', typeof calculateJobMatch);
console.log('generateInterviewQuestions:', typeof generateInterviewQuestions);

if (typeof extractResumeData === 'function' && 
    typeof calculateJobMatch === 'function' && 
    typeof generateInterviewQuestions === 'function') {
  console.log('✅ All functions imported successfully in vercel-handler');
} else {
  console.log('❌ Some functions failed to import in vercel-handler');
}