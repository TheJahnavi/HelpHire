// Direct test of the fallback method
import dotenv from 'dotenv';
dotenv.config();

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

console.log('Testing fallback method directly...');

// Simple regex-based extraction as a fallback
const nameMatch = sampleResume.match(/(?:^|\n)([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})(?=\n)/);
const emailMatch = sampleResume.match(/[\w\.-]+@[\w\.-]+\.\w+/);

console.log('Name:', nameMatch ? nameMatch[1].trim() : "Not found");
console.log('Email:', emailMatch ? emailMatch[0] : "Not found");

// Extract skills (simple keyword matching)
const skillKeywords = [
  'JavaScript', 'Python', 'Java', 'C++', 'React', 'Angular', 'Vue', 'Node.js', 
  'Express', 'MongoDB', 'SQL', 'PostgreSQL', 'MySQL', 'Docker', 'Kubernetes',
  'AWS', 'Azure', 'GCP', 'Git', 'HTML', 'CSS', 'TypeScript', 'PHP', 'Ruby',
  'Swift', 'Kotlin', 'Go', 'Rust', 'Scala', 'Haskell', 'Elixir', 'Clojure',
  'Selenium', 'Playwright', 'Cypress', 'Jest', 'Mocha', 'Chai', 'Pytest',
  'Jenkins', 'GitLab CI', 'GitHub Actions', 'CircleCI', 'Travis CI',
  'Agile', 'Scrum', 'Kanban', 'Waterfall', 'BDD', 'TDD', 'CI/CD'
];

const skills = skillKeywords.filter(skill => 
  sampleResume.toLowerCase().includes(skill.toLowerCase())
);

console.log('Skills:', skills);

// Extract experience details
const experience = [];

// Look for experience patterns like "Job Title | Company | Duration"
const experiencePattern = /([A-Za-z\s]+)\s*\|\s*([A-Za-z\s]+)\s*\|\s*([\d\s\-–—]+(?:\s*(?:year|yr)s?)?)/gi;
let match;
while ((match = experiencePattern.exec(sampleResume)) !== null) {
  const [, jobTitle, company, duration] = match;
  experience.push({
    job_title: jobTitle.trim(),
    company: company.trim(),
    duration: duration.trim(),
    projects: []
  });
}

console.log('Experience:', JSON.stringify(experience, null, 2));

// Extract experience years (simple pattern matching)
const experienceMatches = sampleResume.match(/(\d+)\s*(?:year|yr)s?/gi);
let totalExperience = "0 years total";
if (experienceMatches && experienceMatches.length > 0) {
  // Find the highest number as total experience
  const years = experienceMatches.map(match => parseInt(match)).filter(num => !isNaN(num));
  if (years.length > 0) {
    const maxYears = Math.max(...years);
    totalExperience = maxYears + " years total";
  }
}

console.log('Total Experience:', totalExperience);

// Extract summary (look for PROFESSIONAL SUMMARY or similar)
let summary = "Extracted using fallback method due to AI service unavailability.";
try {
  const summaryPattern = new RegExp("(PROFESSIONAL\\s+SUMMARY|SUMMARY|PROFILE|OVERVIEW)\\s*\\n\\s*([^\\n].*?)(?=\\n\\n|\\n[A-Z]|\\n\\d+\\.|\\n-|$)", "i");
  const summaryMatch = sampleResume.match(summaryPattern);
  if (summaryMatch) {
    summary = summaryMatch[2].trim();
  }
} catch (e) {
  // If regex fails, use a simpler approach
  const summaryLines = sampleResume.split('\n');
  const summaryIndex = summaryLines.findIndex(line => 
    line.includes('PROFESSIONAL SUMMARY') || 
    line.includes('SUMMARY') || 
    line.includes('PROFILE') || 
    line.includes('OVERVIEW')
  );
  if (summaryIndex !== -1 && summaryIndex + 1 < summaryLines.length) {
    summary = summaryLines[summaryIndex + 1].trim() || summary;
  }
}

console.log('Summary:', summary);