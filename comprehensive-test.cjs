const http = require('http');

// Test the complete HR user flow
async function testHRFlow() {
  console.log('Starting HR User Flow Test...\n');
  
  // Step 1: Login
  console.log('Step 1: Logging in as HR user...');
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
      
      let loginData = '';
      res.on('data', (chunk) => {
        loginData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✓ Login successful\n');
          
          // Step 2: Test dashboard stats
          testDashboardStats()
            .then(dashboardResult => {
              if (dashboardResult) {
                console.log('✓ Dashboard stats test passed\n');
                
                // Step 3: Test jobs endpoint
                return testJobsEndpoint();
              } else {
                console.log('✗ Dashboard stats test failed\n');
                return false;
              }
            })
            .then(jobsResult => {
              if (jobsResult) {
                console.log('✓ Jobs endpoint test passed\n');
                
                // Step 4: Test candidates endpoint
                return testCandidatesEndpoint();
              } else {
                console.log('✗ Jobs endpoint test failed\n');
                return false;
              }
            })
            .then(candidatesResult => {
              if (candidatesResult) {
                console.log('✓ Candidates endpoint test passed\n');
                console.log('All tests passed! HR User Flow is working correctly.');
                resolve(true);
              } else {
                console.log('✗ Candidates endpoint test failed\n');
                console.log('HR User Flow test completed with some failures.');
                resolve(false);
              }
            })
            .catch(error => {
              console.error('Test error:', error);
              resolve(false);
            });
        } else {
          console.log('✗ Login failed\n');
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

// Test dashboard stats endpoint
function testDashboardStats() {
  console.log('Step 2: Testing dashboard stats endpoint...');
  
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/dashboard/stats',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  return new Promise((resolve) => {
    const req = http.request(options, (res) => {
      console.log(`Dashboard Stats Status: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('Dashboard stats data received');
          resolve(true);
        } else {
          console.log(`Dashboard stats failed: ${data}`);
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.error('Dashboard Stats Error:', error.message);
      resolve(false);
    });

    req.end();
  });
}

// Test jobs endpoint
function testJobsEndpoint() {
  console.log('Step 3: Testing jobs endpoint...');
  
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/jobs',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  return new Promise((resolve) => {
    const req = http.request(options, (res) => {
      console.log(`Jobs Status: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('Jobs data received');
          resolve(true);
        } else {
          console.log(`Jobs failed: ${data}`);
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.error('Jobs Error:', error.message);
      resolve(false);
    });

    req.end();
  });
}

// Test candidates endpoint
function testCandidatesEndpoint() {
  console.log('Step 4: Testing candidates endpoint...');
  
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/candidates',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
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
testHRFlow()
  .then(result => {
    if (result) {
      console.log('\n🎉 All HR User Flow tests passed! The application is working correctly.');
    } else {
      console.log('\n❌ Some HR User Flow tests failed. Please check the application.');
    }
  })
  .catch(error => {
    console.error('Test failed with error:', error);
  });