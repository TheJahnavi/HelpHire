import fs from 'fs';

async function testCompleteFlow() {
  try {
    console.log('=== Testing Complete Upload Flow ===\n');
    
    // Read the test resume file
    const resumeText = fs.readFileSync('./test-resume.txt', 'utf8');
    console.log('Resume text length:', resumeText.length);
    
    // Test data extraction
    console.log('\n1. Testing data extraction...');
    const extractResponse = await fetch('http://localhost:5002/api/hr/upload/extract-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        resumeText: resumeText
      })
    });
    
    if (!extractResponse.ok) {
      throw new Error(`Extract failed with status ${extractResponse.status}`);
    }
    
    const extractData = await extractResponse.json();
    console.log('✓ Extract successful');
    console.log('Extracted candidate:', extractData.name);
    
    // Test saving candidate to database
    console.log('\n2. Testing candidate saving...');
    const saveResponse = await fetch('http://localhost:5002/api/hr/upload/save-candidates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        candidates: [{
          id: 'test-candidate-1',
          name: extractData.name,
          email: extractData.email,
          skills: extractData.skills,
          experience: extractData.total_experience,
          matchPercentage: 85,
          jobTitle: 'Software Engineer',
          jobId: '1',
          status: 'Resume Reviewed'
        }]
      })
    });
    
    if (!saveResponse.ok) {
      throw new Error(`Save failed with status ${saveResponse.status}`);
    }
    
    const saveData = await saveResponse.json();
    console.log('✓ Save successful');
    console.log('Save response:', saveData.message);
    
    if (saveData.candidates && saveData.candidates.length > 0) {
      console.log('Added candidate ID:', saveData.candidates[0].id);
    }
    
    console.log('\n=== Complete Flow Test Successful ===');
    console.log('The upload functionality is now working correctly!');
    
  } catch (error) {
    console.error('Error in complete flow test:', error);
  }
}

testCompleteFlow();