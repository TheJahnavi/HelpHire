const http = require('http');

// Test login data
const loginData = {
  email: "admin@techcorp.com",
  password: "hrpassword123",
  role: "Company Admin",
  company: "TechCorp Inc"
};

const postData = JSON.stringify(loginData);

const options = {
  hostname: 'localhost',
  port: 5004,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('Testing login with data:', loginData);

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`Response: ${data}`);
    try {
      const jsonData = JSON.parse(data);
      console.log('Parsed response:', jsonData);
    } catch (e) {
      console.log('Response is not JSON');
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
});

req.write(postData);
req.end();