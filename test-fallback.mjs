// Test the improved fallback method
import { exec } from 'child_process';

// Sample resume content
const sampleResume = `John Doe
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

console.log('Testing improved fallback method...');

// We'll test by making a direct API call to the extract-data endpoint
fetch('http://localhost:5003/api/hr/upload/extract-data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    resumeText: sampleResume
  })
})
.then(response => response.json())
.then(data => {
  console.log('Extracted Data:');
  console.log(JSON.stringify(data, null, 2));
  
  // Check if experience is being extracted
  if (data.experience && data.experience.length > 0) {
    console.log('✅ Experience data extracted successfully');
  } else {
    console.log('❌ Experience data not extracted');
  }
  
  // Check if summary is being extracted
  if (data.summary && !data.summary.includes('fallback method')) {
    console.log('✅ Summary extracted successfully');
  } else {
    console.log('❌ Summary not extracted properly');
  }
})
.catch(error => {
  console.error('Error:', error);
});