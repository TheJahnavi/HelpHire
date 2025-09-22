// Test script to verify login functionality
import fetch from 'node-fetch';

async function testLogin() {
  try {
    console.log('Testing login endpoint...');
    
    const response = await fetch('http://localhost:5003/api/auth/login', {
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
    
    const data = await response.json();
    console.log('Login Response:', JSON.stringify(data, null, 2));
    
    if (data.user) {
      console.log('✅ Login successful');
      return data.user;
    } else {
      console.log('❌ Login failed');
      return null;
    }
  } catch (error) {
    console.error('Error in login test:', error);
    return null;
  }
}

async function main() {
  console.log('Starting login test...\n');
  
  const user = await testLogin();
  
  if (user) {
    console.log('User data:', JSON.stringify(user, null, 2));
  }
  
  console.log('\nTest completed.');
}

main();