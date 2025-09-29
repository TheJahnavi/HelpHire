// Test script for dashboard endpoints
console.log('Testing dashboard endpoints...');

// Function to test an endpoint
async function testEndpoint(url, role) {
  try {
    console.log(`\nTesting ${role} dashboard endpoint: ${url}`);
    // Add role parameter to URL for development testing
    const testUrl = `${url}${url.includes('?') ? '&' : '?'}role=${encodeURIComponent(role)}`;
    
    const response = await fetch(testUrl);
    console.log(`Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Response:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('Error:', errorText);
    }
  } catch (error) {
    console.log('Request failed:', error.message);
  }
}

// Test Super Admin dashboard endpoint
testEndpoint('http://localhost:5004/api/super-admin/dashboard-stats', 'Super Admin');

// Test Company Admin dashboard endpoints
testEndpoint('http://localhost:5004/api/company-admin/dashboard-stats', 'Company Admin');
testEndpoint('http://localhost:5004/api/company-admin/chart-data', 'Company Admin');

console.log('\nTest completed. Check the results above.');