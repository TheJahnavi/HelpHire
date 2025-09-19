const http = require('http');

console.log('=== HR USER FLOW TEST PLAN ===\n');

// Global variables to store session information
let sessionCookies = null;
let userData = null;

// Test the complete HR user flow according to the test plan
async function runHRUserTestPlan() {
  console.log('Starting HR User Flow Test Plan...\n');
  
  try {
    // 1. Login Test
    console.log('1. LOGIN TEST');
    const loginSuccess = await testLogin();
    if (!loginSuccess) {
      console.log('❌ Login test failed. Stopping test plan.\n');
      return false;
    }
    console.log('✅ Login test passed\n');
    
    // 2. Dashboard Test
    console.log('2. DASHBOARD TEST');
    const dashboardSuccess = await testDashboard();
    if (!dashboardSuccess) {
      console.log('❌ Dashboard test failed.\n');
      return false;
    }
    console.log('✅ Dashboard test passed\n');
    
    // 3. Jobs Page Test
    console.log('3. JOBS PAGE TEST');
    const jobsSuccess = await testJobs();
    if (!jobsSuccess) {
      console.log('❌ Jobs page test failed.\n');
      return false;
    }
    console.log('✅ Jobs page test passed\n');
    
    // 4. Candidates Page Test
    console.log('4. CANDIDATES PAGE TEST');
    const candidatesSuccess = await testCandidates();
    if (!candidatesSuccess) {
      console.log('❌ Candidates page test failed.\n');
      return false;
    }
    console.log('✅ Candidates page test passed\n');
    
    // 5. Profile Page Test
    console.log('5. PROFILE PAGE TEST');
    const profileSuccess = await testProfile();
    if (!profileSuccess) {
      console.log('❌ Profile page test failed.\n');
      return false;
    }
    console.log('✅ Profile page test passed\n');
    
    console.log('🎉 ALL HR USER FLOW TESTS PASSED!');
    return true;
    
  } catch (error) {
    console.error('Test plan failed with error:', error);
    return false;
  }
}

// 1. Login Test
function testLogin() {
  console.log('   Testing HR user login...');
  
  const loginData = {
    email: "hr1@techcorp.com",
    password: "hrpassword123",
    role: "HR",
    company: "TechCorp Inc"
  };

  const postData = JSON.stringify(loginData);
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve) => {
    const req = http.request(options, (res) => {
      console.log(`   Login Status: ${res.statusCode}`);
      
      // Store session cookies for future requests
      const cookies = res.headers['set-cookie'];
      if (cookies) {
        sessionCookies = cookies;
      }
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            userData = response.user;
            console.log(`   User logged in: ${userData.name} (${userData.email})`);
            resolve(true);
          } catch (parseError) {
            console.error('   Error parsing login response:', parseError);
            resolve(false);
          }
        } else {
          console.log(`   Login failed: ${data}`);
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.error('   Login Error:', error.message);
      resolve(false);
    });

    req.write(postData);
    req.end();
  });
}

// 2. Dashboard Test
function testDashboard() {
  console.log('   Testing dashboard stats endpoint...');
  
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/dashboard/stats',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookies ? sessionCookies.join('; ') : ''
    }
  };

  return new Promise((resolve) => {
    const req = http.request(options, (res) => {
      console.log(`   Dashboard Status: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            console.log(`   Dashboard data received. Jobs: ${response.jobStats?.total || 0}, Candidates: ${response.candidateStats?.length || 0}`);
            resolve(true);
          } catch (parseError) {
            console.error('   Error parsing dashboard response:', parseError);
            resolve(false);
          }
        } else {
          console.log(`   Dashboard failed: ${data}`);
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.error('   Dashboard Error:', error.message);
      resolve(false);
    });

    req.end();
  });
}

// 3. Jobs Page Test
function testJobs() {
  console.log('   Testing jobs endpoint...');
  
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/jobs',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookies ? sessionCookies.join('; ') : ''
    }
  };

  return new Promise((resolve) => {
    const req = http.request(options, (res) => {
      console.log(`   Jobs Status: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            console.log(`   Jobs data received. Total jobs: ${response.length}`);
            resolve(true);
          } catch (parseError) {
            console.error('   Error parsing jobs response:', parseError);
            resolve(false);
          }
        } else {
          console.log(`   Jobs failed: ${data}`);
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.error('   Jobs Error:', error.message);
      resolve(false);
    });

    req.end();
  });
}

// 4. Candidates Page Test
function testCandidates() {
  console.log('   Testing candidates endpoint...');
  
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/candidates',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookies ? sessionCookies.join('; ') : ''
    }
  };

  return new Promise((resolve) => {
    const req = http.request(options, (res) => {
      console.log(`   Candidates Status: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            console.log(`   Candidates data received. Total candidates: ${response.length}`);
            resolve(true);
          } catch (parseError) {
            console.error('   Error parsing candidates response:', parseError);
            resolve(false);
          }
        } else {
          console.log(`   Candidates failed: ${data}`);
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.error('   Candidates Error:', error.message);
      resolve(false);
    });

    req.end();
  });
}

// 5. Profile Page Test
function testProfile() {
  console.log('   Testing profile endpoint...');
  
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/user',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookies ? sessionCookies.join('; ') : ''
    }
  };

  return new Promise((resolve) => {
    const req = http.request(options, (res) => {
      console.log(`   Profile Status: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            console.log(`   Profile data received. User: ${response.name} (${response.email})`);
            resolve(true);
          } catch (parseError) {
            console.error('   Error parsing profile response:', parseError);
            resolve(false);
          }
        } else {
          console.log(`   Profile failed: ${data}`);
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.error('   Profile Error:', error.message);
      resolve(false);
    });

    req.end();
  });
}

// Run the complete test plan
runHRUserTestPlan()
  .then(result => {
    if (result) {
      console.log('\n=== HR USER FLOW TEST PLAN COMPLETED SUCCESSFULLY ===');
      console.log('All tests passed! The application is working correctly.');
    } else {
      console.log('\n=== HR USER FLOW TEST PLAN FAILED ===');
      console.log('Some tests failed. Please check the application.');
    }
  })
  .catch(error => {
    console.error('Test plan failed with error:', error);
  });