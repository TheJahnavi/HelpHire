// Test script to verify gemini.js imports are working
import { extractResumeData, calculateJobMatch, generateInterviewQuestions } from './server/gemini.js';

console.log('Testing gemini.js imports...');

// Check if functions are properly imported
console.log('extractResumeData:', typeof extractResumeData);
console.log('calculateJobMatch:', typeof calculateJobMatch);
console.log('generateInterviewQuestions:', typeof generateInterviewQuestions);

if (typeof extractResumeData === 'function' && 
    typeof calculateJobMatch === 'function' && 
    typeof generateInterviewQuestions === 'function') {
  console.log('✅ All functions imported successfully');
} else {
  console.log('❌ Some functions failed to import');
}

// Test with a simple resume
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

async function testFunctions() {
  try {
    console.log('\nTesting extractResumeData...');
    const extracted = await extractResumeData(sampleResume);
    console.log('Extracted data:', JSON.stringify(extracted, null, 2));
    
    console.log('\n✅ All tests passed');
  } catch (error) {
    console.error('❌ Error in tests:', error);
  }
}

testFunctions();