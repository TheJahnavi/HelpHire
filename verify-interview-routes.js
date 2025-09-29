// Script to verify that the new interview routes are properly registered
import fetch from 'node-fetch';

async function verifyInterviewRoutes() {
  console.log('Verifying AI Interview System Routes...\n');

  try {
    // Test the health endpoint first to make sure server is running
    console.log('1. Testing Health Endpoint...');
    const healthResponse = await fetch('http://localhost:5004/api/health');
    console.log('   Status:', healthResponse.status);
    if (healthResponse.ok) {
      console.log('   ✅ Health endpoint is accessible');
    } else {
      console.log('   ❌ Health endpoint is not accessible');
      return;
    }

    // Test the new interview trigger endpoint (OPTIONS method to check if it exists)
    console.log('\n2. Checking Interview Trigger Endpoint...');
    const triggerResponse = await fetch('http://localhost:5004/api/candidates/1/trigger-interview', {
      method: 'OPTIONS'
    });
    console.log('   Status:', triggerResponse.status);
    if (triggerResponse.status !== 404) {
      console.log('   ✅ Interview trigger endpoint is registered');
    } else {
      console.log('   ❌ Interview trigger endpoint is not registered');
    }

    // Test the public scheduling endpoint (OPTIONS method)
    console.log('\n3. Checking Public Scheduling Endpoint...');
    const scheduleResponse = await fetch('http://localhost:5004/api/public/schedule-interview', {
      method: 'OPTIONS'
    });
    console.log('   Status:', scheduleResponse.status);
    if (scheduleResponse.status !== 404) {
      console.log('   ✅ Public scheduling endpoint is registered');
    } else {
      console.log('   ❌ Public scheduling endpoint is not registered');
    }

    // Test the internal callback endpoint (OPTIONS method)
    console.log('\n4. Checking Internal Callback Endpoint...');
    const callbackResponse = await fetch('http://localhost:5004/api/internal/interview-callback', {
      method: 'OPTIONS'
    });
    console.log('   Status:', callbackResponse.status);
    if (callbackResponse.status !== 404) {
      console.log('   ✅ Internal callback endpoint is registered');
    } else {
      console.log('   ❌ Internal callback endpoint is not registered');
    }

    console.log('\n✅ Route verification completed!');
    console.log('\n📝 Note: These tests only verify that the routes are registered.');
    console.log('   Full functionality testing requires authenticated requests.');

  } catch (error) {
    console.error('Error verifying routes:', error.message);
    console.log('\n⚠️  This might be because the server is not running on port 5004');
  }
}

// Run the verification
verifyInterviewRoutes();