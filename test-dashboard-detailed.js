// Detailed test script for dashboard endpoints
console.log('Testing dashboard endpoints with detailed error information...');

// Function to test an endpoint with detailed error info
async function testEndpoint(url, role) {
  try {
    console.log(`\nTesting ${role} dashboard endpoint: ${url}`);
    // Add role parameter to URL for development testing
    const testUrl = `${url}${url.includes('?') ? '&' : '?'}role=${encodeURIComponent(role)}`;
    
    const response = await fetch(testUrl, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Status: ${response.status}`);
    console.log(`Status Text: ${response.statusText}`);
    
    // Get response headers
    console.log('Response Headers:');
    for (let [key, value] of response.headers) {
      console.log(`  ${key}: ${value}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      console.log('Response Data:', JSON.stringify(data, null, 2));
    } else {
      const text = await response.text();
      console.log('Response Text:', text);
    }
  } catch (error) {
    console.log('Request failed:');
    console.log('Error Name:', error.name);
    console.log('Error Message:', error.message);
    console.log('Error Stack:', error.stack);
  }
}

// Test Super Admin dashboard endpoint
testEndpoint('http://localhost:5004/api/super-admin/dashboard-stats', 'Super Admin');

// Test Company Admin dashboard endpoints
testEndpoint('http://localhost:5004/api/company-admin/dashboard-stats', 'Company Admin');
testEndpoint('http://localhost:5004/api/company-admin/chart-data', 'Company Admin');

console.log('\nTest completed. Check the results above.');