const fs = require('fs');
const path = require('path');
const http = require('http');
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
    const resumeBuffer = fs.readFileSync(resumePath);
    
    // Create multipart form data manually
    const boundary = '----FormDataBoundary' + Math.random().toString(36).substr(2);
    
    // Create the form data
    const formData = [
      `--${boundary}\r\n`,
      'Content-Disposition: form-data; name="resumes"; filename="test-resume.txt"\r\n',
      'Content-Type: text/plain\r\n\r\n',
      resumeBuffer,
      `\r\n--${boundary}--\r\n`
    ];
    
    // Combine all parts
    const formDataBuffer = Buffer.concat([
      Buffer.from(formData[0]),
      Buffer.from(formData[1]),
      Buffer.from(formData[2]),
      formData[3],
      Buffer.from(formData[4])
    ]);
    
    // Send the request
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/upload/resumes',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': formDataBuffer.length
      }
    };
    
    const response = await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: JSON.parse(data)
            });
          } catch (e) {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: data
            });
          }
        });
      });
      
      req.on('error', (e) => {
        reject(e);
      });
      
      req.write(formDataBuffer);
      req.end();
    });
    
    console.log('Response status:', response.statusCode);
    console.log('Response headers:', response.headers);
    console.log('Response body:', response.body);
    
    // Test the mock extraction directly
    const resumeContent = fs.readFileSync(resumePath, 'utf-8');
    const mockData = mockExtractResumeData(resumeContent);
    console.log('Mock extracted data:', JSON.stringify(mockData, null, 2));
    
  } catch (error) {
    console.error('Error testing resume upload:', error);
  }
}

testResumeUpload();