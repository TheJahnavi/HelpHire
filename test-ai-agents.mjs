// Test script to verify AI agents are working properly
import fetch from 'node-fetch';

// Sample resume text for testing
const sampleResume = `
John Doe
john.doe@email.com

PROFESSIONAL SUMMARY
Results-driven Software Engineer with 5 years of experience in developing scalable web applications using JavaScript, Python, and React. Skilled in Agile methodologies and CI/CD pipelines.

TECHNICAL SKILLS
JavaScript, Python, React, Node.js, Express, PostgreSQL, MongoDB, Docker, Kubernetes, AWS, Git, HTML, CSS

PROFESSIONAL EXPERIENCE
Senior Software Engineer | Tech Corp | 2020 - Present
- Led a team of 5 developers in building a customer portal using React and Node.js
- Implemented CI/CD pipelines reducing deployment time by 40%
- Developed RESTful APIs serving 10,000+ daily active users

Software Engineer | Innovate Ltd. | 2018 - 2020
- Developed and maintained e-commerce platform using Python and Django
- Integrated payment processing systems with Stripe and PayPal
- Collaborated with UX designers to implement responsive web designs

EDUCATION
B.S. in Computer Science | University of Technology | 2014 - 2018
`;

async function testExtractData() {
  try {
    console.log('Testing extract data endpoint...');
    
    const response = await fetch('http://localhost:5003/api/hr/upload/extract-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        resumeText: sampleResume
      })
    });
    
    const data = await response.json();
    console.log('Extract Data Response:', JSON.stringify(data, null, 2));
    
    if (data.name) {
      console.log('✅ Extract data successful');
      return data;
    } else {
      console.log('❌ Extract data failed');
      return null;
    }
  } catch (error) {
    console.error('Error in extract data test:', error);
    return null;
  }
}

async function testMatchCandidates(extractedData) {
  try {
    console.log('\nTesting match candidates endpoint...');
    
    // Sample job data
    const jobData = {
      jobTitle: "Senior Software Engineer",
      jobDescription: "We are looking for a Senior Software Engineer with experience in JavaScript, React, and Node.js. The candidate should have experience leading teams and implementing CI/CD pipelines.",
      skills: ["JavaScript", "React", "Node.js", "CI/CD", "Team Leadership"]
    };
    
    // For this test, we'll need to create a mock job first
    // Let's just test the matching with mock data
    const response = await fetch('http://localhost:5003/api/hr/upload/match-candidates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        candidates: [extractedData],
        jobId: 1 // Mock job ID
      })
    });
    
    const data = await response.json();
    console.log('Match Candidates Response:', JSON.stringify(data, null, 2));
    
    if (data.matches) {
      console.log('✅ Match candidates successful');
    } else {
      console.log('❌ Match candidates failed');
    }
  } catch (error) {
    console.error('Error in match candidates test:', error);
  }
}

async function main() {
  console.log('Starting AI agents test...\n');
  
  const extractedData = await testExtractData();
  
  if (extractedData) {
    await testMatchCandidates(extractedData);
  }
  
  console.log('\nTest completed.');
}

main();