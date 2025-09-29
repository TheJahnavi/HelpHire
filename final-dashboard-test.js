// Final test script to verify dashboard endpoints are working correctly
import fetch from 'node-fetch';

async function testDashboardEndpoints() {
  console.log('Testing Dashboard Endpoints...\n');
  
  try {
    // Test Super Admin Dashboard
    console.log('1. Testing Super Admin Dashboard Endpoint...');
    const superAdminResponse = await fetch('http://localhost:5004/api/super-admin/dashboard-stats?role=Super%20Admin');
    const superAdminData = await superAdminResponse.json();
    console.log('Super Admin Dashboard Status:', superAdminResponse.status);
    console.log('Super Admin Dashboard Data:', JSON.stringify(superAdminData, null, 2));
    
    // Test Company Admin Dashboard
    console.log('\n2. Testing Company Admin Dashboard Endpoint...');
    const companyAdminResponse = await fetch('http://localhost:5004/api/company-admin/dashboard-stats?role=Company%20Admin');
    const companyAdminData = await companyAdminResponse.json();
    console.log('Company Admin Dashboard Status:', companyAdminResponse.status);
    console.log('Company Admin Dashboard Data:', JSON.stringify(companyAdminData, null, 2));
    
    console.log('\nDashboard endpoint tests completed successfully!');
  } catch (error) {
    console.error('Error testing dashboard endpoints:', error);
  }
}

testDashboardEndpoints();