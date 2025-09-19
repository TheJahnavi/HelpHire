const fs = require('fs');
const path = require('path');
const http = require('http');
require('dotenv').config();

// Test the resume upload functionality with fallback
async function testUploadWithFallback() {
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
    console.log('Response body:', JSON.stringify(response.body, null, 2));
    
    // Check if we got mock data as fallback
    if (response.body.candidates && response.body.candidates.length > 0) {
      console.log('✅ Successfully received candidate data (fallback mechanism working)');
    } else if (response.body.errors && response.body.errors.length > 0) {
      console.log('⚠️  Received errors but request was processed');
    } else {
      console.log('❌ No data received');
    }
    
  } catch (error) {
    console.error('Error testing upload:', error);
  }
}

testUploadWithFallback();