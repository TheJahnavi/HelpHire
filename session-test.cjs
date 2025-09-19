const http = require('http');

// Test the candidates endpoint with proper session handling
async function testCandidatesEndpoint() {
  console.log('Testing candidates endpoint with proper session handling...\n');
  
  // Step 1: Login to get session
  console.log('Step 1: Logging in...');
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

  return new Promise((resolve, reject) => {
    const loginReq = http.request(loginOptions, (res) => {
      console.log(`Login Status: ${res.statusCode}`);
      
      // Get cookies from response headers
      const cookies = res.headers['set-cookie'];
      console.log('Cookies received:', cookies);
      
      let loginData = '';
      res.on('data', (chunk) => {
        loginData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('Login successful\n');
          
          // Step 2: Test candidates endpoint with session cookie
          testCandidatesWithSession(cookies)
            .then(result => {
              if (result) {
                console.log('✅ Candidates endpoint test passed\n');
                resolve(true);
              } else {
                console.log('❌ Candidates endpoint test failed\n');
                resolve(false);
              }
            })
            .catch(error => {
              console.error('Test error:', error);
              resolve(false);
            });
        } else {
          console.log('Login failed\n');
          console.log(`Response: ${loginData}`);
          resolve(false);
        }
      });
    });

    loginReq.on('error', (error) => {
      console.error('Login Error:', error.message);
      reject(error);
    });

    loginReq.write(loginPostData);
    loginReq.end();
  });
}

// Test candidates endpoint with session cookie
function testCandidatesWithSession(cookies) {
  console.log('Step 2: Testing candidates endpoint with session...\n');
  
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/candidates',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies ? cookies.join('; ') : ''
    }
  };

  return new Promise((resolve) => {
    const req = http.request(options, (res) => {
      console.log(`Candidates Status: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('Candidates data received');
          console.log('Data length:', data.length);
          resolve(true);
        } else {
          console.log(`Candidates failed: ${data}`);
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.error('Candidates Error:', error.message);
      resolve(false);
    });

    req.end();
  });
}

// Run the test
testCandidatesEndpoint()
  .then(result => {
    if (result) {
      console.log('🎉 Candidates endpoint test completed successfully!');
    } else {
      console.log('❌ Candidates endpoint test failed!');
    }
  })
  .catch(error => {
    console.error('Test failed with error:', error);
  });