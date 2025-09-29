const http = require('http');

// Function to make HTTP request and log response
function makeRequest(url, callback) {
  console.log(`Making request to: ${url}`);
  
  const options = {
    hostname: 'localhost',
    port: 5004,
    path: url,
    method: 'GET'
  };
  
  const req = http.request(options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log(`Response: ${data}`);
      if (callback) callback();
    });
  });
  
  req.on('error', (error) => {
    console.error(`Request error: ${error.message}`);
    if (callback) callback();
  });
  
  req.end();
}

// Test the endpoints
makeRequest('/api/super-admin/dashboard-stats?role=Super%20Admin', () => {
  makeRequest('/api/company-admin/dashboard-stats?role=Company%20Admin', () => {
    makeRequest('/api/company-admin/chart-data?role=Company%20Admin', () => {
      console.log('All tests completed');
    });
  });
});