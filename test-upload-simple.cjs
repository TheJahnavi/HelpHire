const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Test the resume upload functionality
async function testResumeUpload() {
  try {
    // Read the test resume file
    const resumePath = path.join(__dirname, 'test-resume.txt');
    const resumeContent = fs.readFileSync(resumePath, 'utf-8');
    
    console.log('Resume content:', resumeContent);
    
    // Test the AI extraction directly
    const { extractResumeData } = await import('./server/gemini.ts');
    
    const extractedData = await extractResumeData(resumeContent);
    console.log('Extracted data:', JSON.stringify(extractedData, null, 2));
  } catch (error) {
    console.error('Error testing resume upload:', error);
  }
}

testResumeUpload();