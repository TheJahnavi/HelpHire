import fs from 'fs';

async function testAPI() {
  try {
    // Test health endpoint
    console.log('Testing health endpoint...');
    const healthResponse = await fetch('http://localhost:5002/api/health');
    const healthData = await healthResponse.json();
    console.log('Health response:', healthData);
    
    // Read the test resume file
    const resumeText = fs.readFileSync('./test-resume.txt', 'utf8');
    console.log('\nResume text length:', resumeText.length);
    
    // Test data extraction
    console.log('\nTesting data extraction...');
    const extractResponse = await fetch('http://localhost:5002/api/hr/upload/extract-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: In a real scenario, we would need a valid session cookie
        // For now, we're relying on the development mode mock authentication
      },
      body: JSON.stringify({
        resumeText: resumeText
      })
    });
    
    console.log('Extract response status:', extractResponse.status);
    console.log('Extract response headers:', [...extractResponse.headers.entries()]);
    
    const extractData = await extractResponse.json();
    console.log('Extract response:', extractData);
    
    // Test match candidates endpoint with mock data
    console.log('\nTesting match candidates...');
    const matchResponse = await fetch('http://localhost:5002/api/hr/upload/match-candidates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        candidates: [extractData],
        jobId: 1 // Mock job ID
      })
    });
    
    console.log('Match response status:', matchResponse.status);
    const matchData = await matchResponse.json();
    console.log('Match response:', JSON.stringify(matchData, null, 2));
    
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testAPI();