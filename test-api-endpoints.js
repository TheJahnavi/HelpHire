// Simple test script to verify API endpoints are working
import fetch from 'node-fetch';

async function testApiEndpoints() {
  try {
    console.log('Testing API health endpoint...');
    
    // Test health endpoint
    const healthResponse = await fetch('http://localhost:5004/api/health');
    const healthData = await healthResponse.json();
    console.log('Health endpoint response:', healthData);
    
    if (healthData.status === 'ok') {
      console.log('✅ Health endpoint is working');
    } else {
      console.log('❌ Health endpoint is not working');
    }
    
    // Test login endpoint
    console.log('\nTesting login endpoint...');
    const loginResponse = await fetch('http://localhost:5004/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'hr1@techcorp.com',
        password: 'hrpassword123',
        role: 'HR',
        company: 'TechCorp Inc'
      })
    });
    
    console.log('Login response status:', loginResponse.status);
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('Login endpoint response:', loginData);
      console.log('✅ Login endpoint is working');
    } else {
      const errorData = await loginResponse.json();
      console.log('Login endpoint error:', errorData);
      console.log('❌ Login endpoint is not working');
    }
    
  } catch (error) {
    console.error('Error testing API endpoints:', error);
  }
}

testApiEndpoints();