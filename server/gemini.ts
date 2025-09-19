import OpenAI from 'openai';

// Use OpenRouter for multiple AI agents access
// Get your free API key from https://openrouter.ai/keys
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'your-openrouter-api-key-here',
  baseURL: 'https://openrouter.ai/api/v1',
});

export interface ProjectData {
  name: string;
  skills: string[];
  years: number;
}

export interface ExperienceData {
  years: number;
  projects: ProjectData[];
}

export interface ExtractedCandidate {
  name: string;
  email: string;
  portfolio_link: string[];
  skills: string[];
  experience: {
    job_title: string;
    company: string;
    duration: string;
    projects: string[];
  }[];
  total_experience: string;
  summary: string;
}

export interface StrengthReason {
  reason: string;
  points: number;
  experienceList: string[];
}

export interface LagReason {
  reason: string;
  points: number;
  gaps: string;
}

export interface JobMatchResult {
  candidate_name: string;
  candidate_email: string;
  match_percentage: number;
  strengths: string[];
  areas_for_improvement: string[];
}

export interface InterviewQuestions {
  technical: string[];
  behavioral: string[];
  jobSpecific: string[];
}

export async function extractResumeData(resumeText: string): Promise<ExtractedCandidate> {
  try {
    // Check if API key is properly configured
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openrouter-api-key-here') {
      console.warn('OpenAI API key not configured, using fallback extraction method');
      // Fallback to a simple extraction method when API key is not available
      return fallbackExtractResumeData(resumeText);
    }

    const prompt = `
EXTRACT ONLY THE DATA PRESENT IN THE RESUME. Do not imagine or create any information that is not explicitly stated in the document.
-----

### **Prompt for Agent 1: Resume Data Extraction**

**Objective:** Act as a specialized data extraction agent. Analyze the provided resume content (from \`.pdf\` or \`.docx\` files) and extract key information with high accuracy. The output must be a structured JSON object or a similar data structure that is ready to be displayed in a table.

**Input:** Raw text content from one or more resumes.

**Output Requirements:**

For each resume provided, extract the following data points and format them into a single, comprehensive object.

1.  **\`name\`**: The full name of the candidate.

2.  **\`email\`**: The primary email address of the candidate.

3.  **\`portfolio_link\`**: Any URLs found that point to a personal portfolio, GitHub, or professional website. If multiple links are found, list them all as an array.

4.  **\`skills\`**: A comprehensive list of all technical and soft skills mentioned in the resume. Format this as a clean, simple array of strings.

5.  **\`experience\`**: A detailed, structured breakdown of the candidate's work history. For each job listed, extract the following sub-fields:

      * \`job_title\`: The title of the position (e.g., "Lead Automation QA").

      * \`company\`: The name of the company.

      * \`duration\`: The duration of the role (e.g., "3 yr", "2021 - 2024").

      * \`projects\`: A list of projects and key responsibilities or achievements associated with the role.

6.  **\`total_experience\`**: The total number of years of professional experience, calculated from all listed jobs.

7.  **\`summary\`**: A concise, professional summary of the resume, no more than **five** lines long. It should be a short, to-the-point paragraph highlighting the candidate's key qualifications and career goals.

**Instructions & Constraints:**

  * Be meticulous in parsing structured data from free-form text.

  * The output format must be consistent for every resume.

  * If a specific data point (e.g., portfolio link) is not found, the value should be \`null\` or an empty string, not an error.

  * Do not include any conversational text in the final output. The output should be the raw, structured data only.

  * The \`experience\` structure must be an array of objects, with each object representing a single job.

**Example of Desired Output Format:**

\`\`\`json
{
  "name": "Jane Doe",
  "email": "jane.doe@example.com",
  "portfolio_link": [
    "https://github.com/janedoe",
    "https://www.janedoe.me"
  ],
  "skills": [
    "JavaScript",
    "Python",
    "React",
    "Node.js",
    "Agile Methodology",
    "Leadership"
  ],
  "experience": [
    {
      "job_title": "Lead Automation QA",
      "company": "Tech Corp",
      "duration": "3 yr",
      "projects": [
        "Led a team of 5 in developing automated testing frameworks.",
        "Reduced bug count by 25% through improved test coverage."
      ]
    },
    {
      "job_title": "Automation Tester",
      "company": "Innovate Ltd.",
      "duration": "2 yr",
      "projects": [
        "Developed and maintained regression test suites.",
        "Integrated testing into CI/CD pipeline."
      ]
    }
  ],
  "total_experience": "5 years",
  "summary": "Highly skilled Automation QA professional with 5 years of experience in leading and building QA teams. Proficient in a range of testing methodologies and tools, with a proven track record of enhancing software quality. Seeking to leverage expertise in a challenging new role."
}
\`\`\`

Instructions & Constraints:

Adhere strictly to the required JSON structure.

The experience field must be an array of objects, with each object representing a single job.

If a specific data point (e.g., portfolio_link or summary) is not found, the value must be null or an empty array/string. Do not generate placeholder data.

The final output must be a valid JSON object containing only the extracted data. Do not include any additional conversational text or explanations.


RESUME CONTENT:
${resumeText}

Return only valid JSON, no additional text.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 1500,
    });

    const rawJson = response.choices[0]?.message?.content || "";
    if (!rawJson) {
      throw new Error("Empty response from OpenAI");
    }

    // Clean up the response to ensure it's valid JSON
    const cleanedResponse = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // Parse and validate the response
    const parsedData = JSON.parse(cleanedResponse);
    
    return {
      name: parsedData.name || "Unknown",
      email: parsedData.email || "",
      portfolio_link: Array.isArray(parsedData.portfolio_link) ? parsedData.portfolio_link : [],
      skills: Array.isArray(parsedData.skills) ? parsedData.skills : [],
      experience: Array.isArray(parsedData.experience) ? parsedData.experience : [],
      total_experience: parsedData.total_experience || "",
      summary: parsedData.summary || "No summary available"
    };
  } catch (error: any) {
    console.error("Error extracting resume data:", error);
    // Provide more specific error information
    if (error.status === 401) {
      console.warn('Authentication failed with OpenAI API, using fallback extraction method');
      // Fallback to a simple extraction method when API authentication fails
      return fallbackExtractResumeData(resumeText);
    } else if (error.status === 403) {
      throw new Error(`Access forbidden to OpenAI API. Please check your API key permissions. Error: ${error.message}`);
    } else if (error.status === 429) {
      throw new Error(`Rate limit exceeded for OpenAI API. Please try again later. Error: ${error.message}`);
    } else if (error.status === 500) {
      throw new Error(`OpenAI API server error. Please try again later. Error: ${error.message}`);
    } else {
      throw new Error(`Failed to extract resume data: ${error.message || error}`);
    }
  }
}

// Fallback method for extracting resume data when AI is not available
function fallbackExtractResumeData(resumeText: string): ExtractedCandidate {
  // Simple regex-based extraction as a fallback
  const nameMatch = resumeText.match(/(?:^|\n)([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})(?=\n)/);
  const emailMatch = resumeText.match(/[\w\.-]+@[\w\.-]+\.\w+/);
  
  // Extract skills (simple keyword matching)
  const skillKeywords = [
    'JavaScript', 'Python', 'Java', 'C++', 'React', 'Angular', 'Vue', 'Node.js', 
    'Express', 'MongoDB', 'SQL', 'PostgreSQL', 'MySQL', 'Docker', 'Kubernetes',
    'AWS', 'Azure', 'GCP', 'Git', 'HTML', 'CSS', 'TypeScript', 'PHP', 'Ruby',
    'Swift', 'Kotlin', 'Go', 'Rust', 'Scala', 'Haskell', 'Elixir', 'Clojure'
  ];
  
  const skills = skillKeywords.filter(skill => 
    resumeText.toLowerCase().includes(skill.toLowerCase())
  );
  
  // Extract experience years (simple pattern matching)
  const experienceMatches = resumeText.match(/(\d+)\s*(?:year|yr)s?/gi);
  let totalExperience = "";
  if (experienceMatches && experienceMatches.length > 0) {
    // Find the highest number as total experience
    const years = experienceMatches.map(match => parseInt(match)).filter(num => !isNaN(num));
    if (years.length > 0) {
      totalExperience = `${Math.max(...years)} years`;
    }
  }
  
  return {
    name: nameMatch ? nameMatch[1].trim() : "Unknown Candidate",
    email: emailMatch ? emailMatch[0] : "",
    portfolio_link: [],
    skills: skills,
    experience: [],
    total_experience: totalExperience,
    summary: "Extracted using fallback method due to AI service unavailability."
  };
}

export async function calculateJobMatch(candidate: ExtractedCandidate, jobTitle: string, jobSkills: string[], jobDescription: string, jobExperience?: string, jobNotes?: string): Promise<JobMatchResult> {
  try {
    // Check if API key is properly configured
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openrouter-api-key-here') {
      console.warn('OpenAI API key not configured, using fallback matching method');
      // Fallback to a simple matching method when API key is not available
      return fallbackCalculateJobMatch(candidate, jobTitle, jobSkills, jobDescription);
    }

    const prompt = `
### **Prompt for Agent 2: Resume-to-Job Match Analysis**

**Objective:** Act as a specialized AI agent to analyze a candidate's qualifications against a specific job role. Compare the extracted resume data with a provided job description and generate a detailed match analysis. The output must be a structured JSON object.

**Input:**

1.  **Candidate Data:** A JSON object containing the candidate's extracted information (name, email, skills, experience, etc.) from Agent 1.

2.  **Job Data:** A JSON object containing the job's title, description, and required qualifications from the \`jobs\` database table.

**Instructions & Constraints:**

The analysis must be based **only** on the provided \`Candidate Data\` and \`Job Data\`. Do not use external knowledge or invent information.

---

### **Analysis and Output Generation**

Your primary task is to act as a comparative engine, generating a comprehensive match analysis. The final output must be a single JSON object.

1.  **\`match_percentage\`**: Generate a single numerical score (0-100) that represents the overall match.

    * **Analysis Method**: To calculate this score, perform a semantic and quantitative analysis.

        * **Skills Matching**: Compare the candidate's \`skills\` array and skills mentioned within their \`experience\` section to the job's \`required_skills\`.

        * **Experience Alignment**: Analyze the candidate's \`job_title\`, \`company\`, and \`projects\` against the job's \`description\` to determine how well their background aligns with the role's responsibilities.

        * **Holistic Score**: The final score should be a well-reasoned metric reflecting the combined strength of the skills and experience match.

2.  **\`strengths\`**: Create a list of at least **five** specific points that directly justify the \`match_percentage\` score. These points should highlight the candidate's relevant skills, experience, and achievements that align with the job description.

    * **Source**: Extract these points directly from the candidate's resume data. For instance, if the job requires "project management experience," a strength might be "Led a team of five on a project from conception to launch."

3.  **\`areas_for_improvement\`**: Create a list of specific reasons or missing qualifications that contribute to the difference from a 100% match.

    * **Source**: Identify requirements in the job description that are not mentioned in the candidate's resume. For example, if the job requires "CI/CD pipeline expertise" but the resume doesn't mention it, that would be listed here.

---

### **Final Output Structure**

* **\`candidate_name\`**: The full name of the candidate.
* **\`candidate_email\`**: The email address of the candidate.
* **\`match_percentage\`**: A single numerical value between 0 and 100.
* **\`strengths\`**: An array of strings, with each string representing a specific point.
* **\`areas_for_improvement\`**: An array of strings, with each string representing a specific point.


Candidate Data:
{
  "name": "${candidate.name}",
  "email": "${candidate.email}",
  "portfolio_link": [${(candidate.portfolio_link || []).map(link => `"${link}"`).join(', ')}],
  "skills": [${(candidate.skills || []).map(s => `"${s}"`).join(', ')}],
  "experience": [${(candidate.experience || []).map(job => `{
    "job_title": "${job.job_title}",
    "company": "${job.company}",
    "duration": "${job.duration}",
    "projects": [${(job.projects || []).map(p => `"${p}"`).join(', ')}]
  }`).join(',')}],
  "total_experience": "${candidate.total_experience}",
  "summary": "${candidate.summary}"
}

Job Data:
{
  "title": "${jobTitle}",
  "required_skills": [${jobSkills.map(s => `"${s}"`).join(', ')}],
  "description": "${jobDescription}",
  "experience_required": "${jobExperience || ''}",
  "notes": "${jobNotes || ''}"
}

Return only valid JSON, no additional text.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const rawJson = response.choices[0]?.message?.content || "";
    if (!rawJson) {
      throw new Error("Empty response from OpenAI");
    }

    // Clean up the response to ensure it's valid JSON
    const cleanedResponse = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // Parse and validate the response
    const parsedData = JSON.parse(cleanedResponse);
    
    return {
      candidate_name: parsedData.candidate_name || candidate.name,
      candidate_email: parsedData.candidate_email || candidate.email,
      match_percentage: parsedData.match_percentage || 0,
      strengths: Array.isArray(parsedData.strengths) ? parsedData.strengths : [],
      areas_for_improvement: Array.isArray(parsedData.areas_for_improvement) ? parsedData.areas_for_improvement : []
    };
  } catch (error: any) {
    console.error("Error calculating job match:", error);
    // Provide more specific error information
    if (error.status === 401) {
      console.warn('Authentication failed with OpenAI API, using fallback matching method');
      // Fallback to a simple matching method when API authentication fails
      return fallbackCalculateJobMatch(candidate, jobTitle, jobSkills, jobDescription);
    } else if (error.status === 403) {
      throw new Error(`Access forbidden to OpenAI API. Please check your API key permissions. Error: ${error.message}`);
    } else if (error.status === 429) {
      throw new Error(`Rate limit exceeded for OpenAI API. Please try again later. Error: ${error.message}`);
    } else if (error.status === 500) {
      throw new Error(`OpenAI API server error. Please try again later. Error: ${error.message}`);
    } else {
      throw new Error(`Failed to calculate job match: ${error.message || error}`);
    }
  }
}

// Fallback method for calculating job match when AI is not available
function fallbackCalculateJobMatch(
  candidate: ExtractedCandidate, 
  jobTitle: string, 
  jobSkills: string[], 
  jobDescription: string
): JobMatchResult {
  // Simple skill matching algorithm as a fallback
  const candidateSkills = candidate.skills.map(s => s.toLowerCase());
  const requiredSkills = jobSkills.map(s => s.toLowerCase());
  
  // Calculate skill match percentage
  const matchingSkills = requiredSkills.filter(skill => 
    candidateSkills.some(candidateSkill => 
      candidateSkill.includes(skill) || skill.includes(candidateSkill)
    )
  );
  
  const skillMatchPercentage = requiredSkills.length > 0 
    ? Math.round((matchingSkills.length / requiredSkills.length) * 100) 
    : 0;
  
  // Calculate experience match (simple comparison)
  const candidateExperienceYears = parseInt(candidate.total_experience) || 0;
  const jobExperienceMatch = jobDescription.toLowerCase().includes('experience') ? 70 : 50;
  
  // Combined match percentage
  const matchPercentage = Math.round((skillMatchPercentage + jobExperienceMatch) / 2);
  
  return {
    candidate_name: candidate.name,
    candidate_email: candidate.email,
    match_percentage: matchPercentage,
    strengths: [
      `Skills match: ${matchingSkills.length} out of ${requiredSkills.length} required skills`,
      `Total experience: ${candidate.total_experience || 'Not specified'}`,
      `Relevant portfolio links: ${candidate.portfolio_link.length > 0 ? 'Yes' : 'No'}`
    ],
    areas_for_improvement: [
      "Detailed analysis requires AI processing",
      "Experience level assessment limited without AI",
      "Specific skill gap analysis not available in fallback mode"
    ]
  };
}

export async function generateInterviewQuestions(
  candidate: ExtractedCandidate,
  jobTitle: string,
  jobDescription: string,
  requiredSkills: string[]
): Promise<InterviewQuestions> {
  try {
    // Check if API key is properly configured
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openrouter-api-key-here') {
      console.warn('OpenAI API key not configured, using fallback question generation method');
      // Fallback to a simple question generation method when API key is not available
      return fallbackGenerateInterviewQuestions(candidate, jobTitle, jobDescription, requiredSkills);
    }

    const prompt = `
### **Prompt for Agent 3: Interview Question Generation**

**Objective:** Act as an expert interview question generator. Create a curated list of questions based on a candidate's profile and a specific job role's requirements. The questions must be categorized for different interview stages. The output must be a structured JSON object.

**Input:**

1.  **Candidate Data:** The JSON object containing the candidate's extracted information (skills, experience, projects, etc.) from Agent 1.

2.  **Job Data:** The JSON object containing the job's title, description, and required_skills from the jobs database table.

**Instructions & Constraints:**

* The questions must be tailored to the specific **skills and experience mentioned in the candidate's resume** and the **requirements outlined in the job description**. Do not generate generic questions.

* Generate a minimum of **five** questions for each category.

* Do not generate questions that can be answered with a simple "yes" or "no."

---

### **Question Categories and Content**

1.  **Technical Questions**:

    * **Focus**: These questions should test the candidate's stated technical skills and their experience with specific technologies or tools mentioned in their resume or the job description.

    * **Examples**: If the resume lists "Python," ask a question about Python best practices or common libraries. If a project description mentions "database optimization," ask a question about their approach to performance tuning.

2.  **Behavioral Questions**:

    * **Focus**: These questions should explore the candidate's past work behavior and soft skills. They should be tied to real-world scenarios from the candidate's experience section.

    * **Examples**: "Tell me about a time you had to resolve a conflict within a team, as a 'Lead Automation QA'?" or "Describe a difficult project you faced, and how your 'leadership' skills helped you navigate it."

3.  **Job-Specific Questions**:

    * **Focus**: These questions should directly relate to the specific responsibilities and challenges of the job role being filled. Use details from the job_description to formulate these.

    * **Examples**: "Based on our job description, what do you think would be your biggest challenge in the first 90 days?" or "How would you apply your experience with 'CI/CD pipelines' to improve our current deployment process?"

---

### **Final Output Structure**

The output must be a single JSON object with the following three keys, each containing an array of strings (the questions).

* \`technical_questions\`: [ "Question 1", "Question 2", ... ]

* \`behavioral_questions\`: [ "Question 1", "Question 2", ... ]

* \`job_specific_questions\`: [ "Question 1", "Question 2", ... ]


Candidate Data:
{
  "name": "${candidate.name}",
  "email": "${candidate.email}",
  "portfolio_link": [${(candidate.portfolio_link || []).map(link => `"${link}"`).join(', ')}],
  "skills": [${(candidate.skills || []).map(s => `"${s}"`).join(', ')}],
  "experience": [${(candidate.experience || []).map(job => `{
    "job_title": "${job.job_title}",
    "company": "${job.company}",
    "duration": "${job.duration}",
    "projects": [${(job.projects || []).map(p => `"${p}"`).join(', ')}]
  }`).join(',')}],
  "total_experience": "${candidate.total_experience}",
  "summary": "${candidate.summary}"
}

Job Data:
{
  "title": "${jobTitle}",
  "required_skills": [${requiredSkills.map(s => `"${s}"`).join(', ')}],
  "description": "${jobDescription}"
}

Return only valid JSON, no additional text.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const rawJson = response.choices[0]?.message?.content || "";
    if (!rawJson) {
      throw new Error("Empty response from OpenAI");
    }

    // Clean up the response to ensure it's valid JSON
    const cleanedResponse = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // Parse and validate the response
    const parsedData = JSON.parse(cleanedResponse);
    
    // Transform the response to match our InterviewQuestions interface
    return {
      technical: Array.isArray(parsedData.technical_questions) ? parsedData.technical_questions : [],
      behavioral: Array.isArray(parsedData.behavioral_questions) ? parsedData.behavioral_questions : [],
      jobSpecific: Array.isArray(parsedData.job_specific_questions) ? parsedData.job_specific_questions : []
    };
  } catch (error: any) {
    console.error("Error generating interview questions:", error);
    // Provide more specific error information
    if (error.status === 401) {
      console.warn('Authentication failed with OpenAI API, using fallback question generation method');
      // Fallback to a simple question generation method when API authentication fails
      return fallbackGenerateInterviewQuestions(candidate, jobTitle, jobDescription, requiredSkills);
    } else if (error.status === 403) {
      throw new Error(`Access forbidden to OpenAI API. Please check your API key permissions. Error: ${error.message}`);
    } else if (error.status === 429) {
      throw new Error(`Rate limit exceeded for OpenAI API. Please try again later. Error: ${error.message}`);
    } else if (error.status === 500) {
      throw new Error(`OpenAI API server error. Please try again later. Error: ${error.message}`);
    } else {
      throw new Error(`Failed to generate interview questions: ${error.message || error}`);
    }
  }
}

// Fallback method for generating interview questions when AI is not available
function fallbackGenerateInterviewQuestions(
  candidate: ExtractedCandidate,
  jobTitle: string,
  jobDescription: string,
  requiredSkills: string[]
): InterviewQuestions {
  // Generate generic questions based on candidate data and job requirements
  const technicalQuestions = [
    `What experience do you have with ${requiredSkills.slice(0, 3).join(', ')}?`,
    "Describe a challenging technical problem you solved in your previous role.",
    "How do you stay updated with new technologies and best practices?",
    "Walk me through your approach to debugging a complex issue.",
    "What development tools and environments are you most comfortable with?"
  ];

  const behavioralQuestions = [
    "Tell me about a time you had to work with a difficult team member.",
    "Describe a situation where you had to meet a tight deadline.",
    "How do you handle feedback and criticism of your work?",
    "Tell me about a time you had to learn a new technology quickly.",
    "Describe a situation where you had to make a difficult decision."
  ];

  const jobSpecificQuestions = [
    `What interests you most about the ${jobTitle} position?`,
    "How do you see yourself contributing to our team in the first 90 days?",
    "What challenges do you anticipate in this role, and how would you address them?",
    "How do your previous experiences prepare you for this position?",
    "What questions do you have about our company or the role?"
  ];

  return {
    technical: technicalQuestions,
    behavioral: behavioralQuestions,
    jobSpecific: jobSpecificQuestions
  };
}