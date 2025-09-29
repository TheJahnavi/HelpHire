const axios = require('axios');

async function testEndpoints() {
  try {
    console.log('Testing Super Admin Dashboard Endpoint...');
    const superAdminResponse = await axios.get('http://localhost:5004/api/super-admin/dashboard-stats');
    console.log('Super Admin Dashboard Response:', superAdminResponse.data);
    
    console.log('\nTesting Company Admin Dashboard Endpoint...');
    const companyAdminResponse = await axios.get('http://localhost:5004/api/company-admin/dashboard-stats');
    console.log('Company Admin Dashboard Response:', companyAdminResponse.data);
    
    console.log('\nTesting Company Admin Chart Data Endpoint...');
    const chartDataResponse = await axios.get('http://localhost:5004/api/company-admin/chart-data');
    console.log('Company Admin Chart Data Response:', chartDataResponse.data);
  } catch (error) {
    console.error('Error testing endpoints:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Status code:', error.response.status);
    }
  }
}

testEndpoints();