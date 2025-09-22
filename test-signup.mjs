// Test script to verify signup functionality
import fetch from 'node-fetch';

async function testSignup() {
  try {
    console.log('Testing signup endpoint...');
    
    const response = await fetch('http://localhost:5003/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test HR User',
        email: 'testhr@example.com',
        password: 'testpassword123',
        role: 'HR',
        company: 'Test Company'
      })
    });
    
    const data = await response.json();
    console.log('Signup Response:', JSON.stringify(data, null, 2));
    
    if (data.userId) {
      console.log('✅ Signup successful');
      return data.userId;
    } else {
      console.log('❌ Signup failed');
      return null;
    }
  } catch (error) {
    console.error('Error in signup test:', error);
    return null;
  }
}

async function main() {
  console.log('Starting signup test...\n');
  
  const userId = await testSignup();
  
  if (userId) {
    console.log('User ID:', userId);
  }
  
  console.log('\nTest completed.');
}

main();