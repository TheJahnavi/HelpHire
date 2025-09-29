const fetch = require('node-fetch');

async function testLogin() {
  try {
    // Test login as Company Admin
    const loginResponse = await fetch('http://localhost:5004/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@techcorp.com',
        password: 'hrpassword123',
        role: 'Company Admin',
        company: 'TechCorp Inc'
      })
    });

    console.log('Login status:', loginResponse.status);
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('Login successful:', loginData);
      
      // Test accessing dashboard stats
      const dashboardResponse = await fetch('http://localhost:5004/api/company-admin/dashboard-stats', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log('Dashboard stats status:', dashboardResponse.status);
      
      if (dashboardResponse.ok) {
        const dashboardData = await dashboardResponse.json();
        console.log('Dashboard stats:', JSON.stringify(dashboardData, null, 2));
      } else {
        console.log('Failed to fetch dashboard stats');
      }
    } else {
      console.log('Login failed:', await loginResponse.text());
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testLogin();