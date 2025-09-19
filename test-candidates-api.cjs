const http = require('http');

// First, let's login to get session information
const loginData = {
  email: "hr1@techcorp.com",
  password: "hrpassword123",
  role: "HR",
  company: "TechCorp Inc"
};

const loginPostData = JSON.stringify(loginData);

const loginOptions = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(loginPostData)
  }
};

const loginReq = http.request(loginOptions, (res) => {
  console.log(`Login Status: ${res.statusCode}`);
  
  let loginData = '';
  res.on('data', (chunk) => {
    loginData += chunk;
  });
  
  res.on('end', () => {
    console.log(`Login Response: ${loginData}`);
    
    // Now test candidates endpoint
    const candidatesOptions = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/candidates',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const candidatesReq = http.request(candidatesOptions, (res) => {
      console.log(`Candidates Status: ${res.statusCode}`);
      
      let candidatesData = '';
      res.on('data', (chunk) => {
        candidatesData += chunk;
      });
      
      res.on('end', () => {
        console.log(`Candidates Response: ${candidatesData}`);
      });
    });

    candidatesReq.on('error', (error) => {
      console.error('Candidates Error:', error.message);
    });

    candidatesReq.end();
  });
});

loginReq.on('error', (error) => {
  console.error('Login Error:', error.message);
});

loginReq.write(loginPostData);
loginReq.end();