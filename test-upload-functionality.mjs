// Test script to verify upload and add page functionality
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

// Sample resume content
const sampleResume1 = `John Doe
john.doe@example.com

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
B.S. in Computer Science | University of Technology | 2014 - 2018`;

const sampleResume2 = `Jane Smith
jane.smith@example.com

PROFESSIONAL SUMMARY
Experienced QA Automation Engineer with 4 years of experience in test automation frameworks. Proficient in Selenium, Playwright, and API testing tools.

TECHNICAL SKILLS
Python, Java, Selenium WebDriver, Playwright, Pytest, REST API Testing, Postman, Jira, TestRail, Git, Jenkins, Docker

PROFESSIONAL EXPERIENCE
QA Automation Engineer | Quality First Inc. | 2021 - Present
- Developed and maintained test automation frameworks using Python and Selenium
- Created API test suites for microservices using Pytest
- Integrated automated tests into CI/CD pipeline using Jenkins

QA Engineer | TestPro Solutions | 2019 - 2021
- Executed manual and automated test cases for web applications
- Reported and tracked bugs using Jira and TestRail
- Collaborated with development teams to ensure quality releases

EDUCATION
B.S. in Software Engineering | State University | 2015 - 2019`;

async function testExtractData() {
  try {
    console.log('Testing extract data endpoint...');
    
    const response = await fetch('http://localhost:5003/api/hr/upload/extract-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        resumeText: sampleResume1
      })
    });
    
    const data = await response.json();
    console.log('Extract Data Response for John Doe:', JSON.stringify(data, null, 2));
    
    if (data.name) {
      console.log('✅ Extract data successful for John Doe');
      return data;
    } else {
      console.log('❌ Extract data failed for John Doe');
      return null;
    }
  } catch (error) {
    console.error('Error in extract data test for John Doe:', error);
    return null;
  }
}

async function testExtractDataForSecondCandidate() {
  try {
    console.log('\nTesting extract data endpoint for second candidate...');
    
    const response = await fetch('http://localhost:5003/api/hr/upload/extract-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        resumeText: sampleResume2
      })
    });
    
    const data = await response.json();
    console.log('Extract Data Response for Jane Smith:', JSON.stringify(data, null, 2));
    
    if (data.name) {
      console.log('✅ Extract data successful for Jane Smith');
      return data;
    } else {
      console.log('❌ Extract data failed for Jane Smith');
      return null;
    }
  } catch (error) {
    console.error('Error in extract data test for Jane Smith:', error);
    return null;
  }
}

async function testMatchCandidates(extractedData) {
  try {
    console.log('\nTesting match candidates endpoint...');
    
    // Sample job data - in a real scenario, this would come from the database
    const mockJobData = {
      jobTitle: "Senior Software Engineer",
      jobDescription: "We are looking for a Senior Software Engineer with experience in JavaScript, React, and Node.js. The candidate should have experience leading teams and implementing CI/CD pipelines.",
      skills: ["JavaScript", "React", "Node.js", "CI/CD", "Team Leadership"]
    };
    
    const response = await fetch('http://localhost:5003/api/hr/upload/match-candidates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // In a real scenario, we would need to simulate authentication
        // For this test, we'll bypass authentication by using the non-authenticated endpoint
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
      return data.matches[0];
    } else {
      console.log('❌ Match candidates failed');
      return null;
    }
  } catch (error) {
    console.error('Error in match candidates test:', error);
    return null;
  }
}

async function testGenerateQuestions(extractedData) {
  try {
    console.log('\nTesting generate questions endpoint...');
    
    const response = await fetch('http://localhost:5003/api/hr/upload/generate-questions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        candidate: extractedData,
        jobId: 1 // Mock job ID
      })
    });
    
    const data = await response.json();
    console.log('Generate Questions Response:', JSON.stringify(data, null, 2));
    
    if (data.questions) {
      console.log('✅ Generate questions successful');
    } else {
      console.log('❌ Generate questions failed');
    }
  } catch (error) {
    console.error('Error in generate questions test:', error);
  }
}

async function main() {
  console.log('Starting upload functionality test...\n');
  
  // Test extract data for first candidate
  const extractedData1 = await testExtractData();
  
  // Test extract data for second candidate
  const extractedData2 = await testExtractDataForSecondCandidate();
  
  if (extractedData1) {
    // Test match candidates
    const matchResult = await testMatchCandidates(extractedData1);
    
    // Test generate questions
    await testGenerateQuestions(extractedData1);
  }
  
  console.log('\nTest completed.');
}

main();