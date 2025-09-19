const fs = require('fs');
const path = require('path');

// Test the resume upload functionality
async function testResumeUpload() {
  try {
    // Read the test resume file
    const resumePath = path.join(__dirname, 'test-resume.txt');
    const resumeBuffer = fs.readFileSync(resumePath);
    
    // Create a FormData object to simulate file upload
    const FormData = require('form-data');
    const form = new FormData();
    form.append('resumes', resumeBuffer, {
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