// Simple test script to verify upload functionality
import { writeFileSync } from 'fs';
import { join } from 'path';

// Create a simple test resume
const testResume = `John Doe
john.doe@example.com

PROFESSIONAL SUMMARY
Experienced software engineer with 5 years of experience in web development. Proficient in JavaScript, React, Node.js, and Python. Strong problem-solving skills and ability to work in agile environments.

WORK EXPERIENCE
Senior Software Engineer | Tech Solutions Inc. | Jan 2022 - Present
- Developed and maintained web applications using React and Node.js
- Collaborated with cross-functional teams to deliver high-quality software solutions
- Implemented RESTful APIs and integrated with third-party services
- Technologies: JavaScript, React, Node.js, Express, MongoDB

Software Developer | Innovate Corp. | Jun 2020 - Dec 2021
- Built responsive user interfaces using React and Redux
- Participated in code reviews and mentored junior developers
- Optimized application performance by 30%
- Technologies: JavaScript, React, Python, Django, PostgreSQL

EDUCATION
B.S. in Computer Science | University of Technology | 2016 - 2020

SKILLS
JavaScript, React, Node.js, Python, Django, PostgreSQL, MongoDB, HTML, CSS, Git`;

// Write test resume to file
writeFileSync(join(process.cwd(), 'test-resume.txt'), testResume);
console.log('Test resume created successfully');