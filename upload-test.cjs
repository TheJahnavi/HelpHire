const fs = require('fs');
const path = require('path');

async function testUpload() {
  try {
    // Read the test resume file
    const resumeBuffer = fs.readFileSync('test-resume.txt');
    
    // Create FormData
    const formData = new FormData();
    formData.append('resumes', new Blob([resumeBuffer]), 'test-resume.txt');
    
    // Make the upload request
    console.log('Uploading resume...');
    const response = await fetch('http://localhost:5000/api/upload/resumes', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    console.log('Upload response:', result);
  } catch (error) {
    console.error('Error during upload test:', error.message);
  }
}

testUpload();