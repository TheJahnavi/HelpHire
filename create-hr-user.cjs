const http = require('http');

// Data for the HR user
const userData = {
  email: "hr1@techcorp.com",
  password: "hrpassword123",
  company: "TechCorp Inc"
};

const postData = JSON.stringify(userData);

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/setup/hr',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`Response: ${data}`);
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
});

req.write(postData);
req.end();