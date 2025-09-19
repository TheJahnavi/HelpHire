const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Mock function to simulate resume data extraction
function mockExtractResumeData(resumeText) {
  // Simple parsing logic to extract basic information
  const lines = resumeText.split('\n').filter(line => line.trim() !== '');
  
  // Extract name (first line that looks like a name)
  const name = lines.find(line => line.match(/^[A-Z][a-z]+ [A-Z][a-z]+$/)) || 'Unknown Candidate';
  
  // Extract email
  const email = lines.find(line => line.includes('@')) || 'unknown@example.com';
  
  // Extract skills (simple keyword matching)
  const skillKeywords = ['javascript', 'python', 'java', 'react', 'angular', 'node', 'sql', 'html', 'css'];
  const skills = skillKeywords.filter(skill => 
    resumeText.toLowerCase().includes(skill.toLowerCase())
  );
  
  // Extract experience (simple pattern matching)
  const experienceMatch = resumeText.match(/(\d+)\s*(?:years?|yrs?)/i);
  const experienceYears = experienceMatch ? parseInt(experienceMatch[1]) : 0;
  
  return {
    name,
    email,
    portfolio_link: [],
    skills,
    experience: [
      {
        job_title: 'Software Developer',
        company: 'Tech Corp',
        duration: `${experienceYears} years`,
        projects: [
          'Developed web applications using React and Node.js',
          'Implemented RESTful APIs for mobile applications'
        ]
      }
    ],
    total_experience: `${experienceYears} years`,
    summary: `Experienced developer with ${experienceYears} years of experience in web development. Proficient in JavaScript, React, and Node.js.`
  };
}

// Test the resume upload functionality
async function testResumeUpload() {
  try {
    // Read the test resume file
    const resumePath = path.join(__dirname, 'test-resume.txt');
    const resumeContent = fs.readFileSync(resumePath, 'utf-8');
    
    console.log('Resume content:', resumeContent);
    
    // Test the mock extraction
    const extractedData = mockExtractResumeData(resumeContent);
    console.log('Extracted data:', JSON.stringify(extractedData, null, 2));
    
    // Test the file upload endpoint
    const FormData = require('form-data');
    const form = new FormData();
    form.append('resumes', fs.readFileSync(resumePath), {
      filename: 'test-resume.txt',
      contentType: 'text/plain'
    });
    
    // Send the request to the server
    const response = await fetch('http://localhost:5000/api/upload/resumes', {
      method: 'POST',
      body: form
    });
    
    const result = await response.json();
    console.log('Upload result:', result);
    
    if (result.candidates && result.candidates.length > 0) {
      console.log('Successfully extracted candidate data:');
      console.log(JSON.stringify(result.candidates[0], null, 2));
    } else {
      console.log('No candidates extracted');
    }
  } catch (error) {
    console.error('Error testing resume upload:', error);
  }
}

testResumeUpload();