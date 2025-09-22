// Test script to directly test AI functionality
import dotenv from 'dotenv';
dotenv.config();

// Import the AI functions directly
import { extractResumeData } from './server/dist/gemini.js';

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

console.log('Testing AI functionality directly...');
console.log('OPENROUTER_API_KEY:', process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET');

async function testAI() {
  try {
    console.log('\nTesting extractResumeData...');
    const result = await extractResumeData(sampleResume);
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAI();