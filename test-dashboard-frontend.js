// Test script that simulates frontend requests with proper session handling
console.log('Testing dashboard endpoints with session simulation...');

async function testWithSession(role) {
  console.log(`\n=== Testing ${role} Dashboard ===`);
  
  // First, let's create a session by accessing the auth endpoint
  try {
    const authResponse = await fetch(`http://localhost:5004/api/auth/user?role=${encodeURIComponent(role)}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Auth Status: ${authResponse.status}`);
    
    if (authResponse.ok) {
      const authData = await authResponse.json();
      console.log('Auth Data:', JSON.stringify(authData, null, 2));
    } else {
      console.log('Auth failed:', await authResponse.text());
    }
    
    // Now test the dashboard endpoints with the same session
    console.log(`\n--- Testing ${role} Dashboard Stats ---`);
    const dashboardResponse = await fetch(`http://localhost:5004/api/${role.toLowerCase().replace(' ', '-')}/dashboard-stats?role=${encodeURIComponent(role)}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Dashboard Status: ${dashboardResponse.status}`);
    
    if (dashboardResponse.ok) {
      const dashboardData = await dashboardResponse.json();
      console.log('Dashboard Data:', JSON.stringify(dashboardData, null, 2));
    } else {
      console.log('Dashboard failed:', await dashboardResponse.text());
    }
    
    // For Company Admin, also test chart data
    if (role === 'Company Admin') {
      console.log(`\n--- Testing Company Admin Chart Data ---`);
      const chartResponse = await fetch(`http://localhost:5004/api/company-admin/chart-data?role=${encodeURIComponent(role)}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`Chart Status: ${chartResponse.status}`);
      
      if (chartResponse.ok) {
        const chartData = await chartResponse.json();
        console.log('Chart Data:', JSON.stringify(chartData, null, 2));
      } else {
        console.log('Chart failed:', await chartResponse.text());
      }
    }
  } catch (error) {
    console.log('Request failed:', error.message);
  }
}

// Test both roles
testWithSession('Super Admin');
testWithSession('Company Admin');

console.log('\nTest completed. Check the results above.');