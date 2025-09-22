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
  total_experience: number;
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
### **Prompt for Agent 1: Resume Data Extraction**

**Objective:** Act as a specialized, deterministic data extraction agent. Analyze the provided resume content from \`.pdf\` and \`.docx\` files and extract key information with high accuracy and **consistency**. The output must be a structured JSON object.

**Input:** Raw text content from one or more resumes.

**Output Requirements:**

For each resume provided, extract the following data points and format them into a single, comprehensive object.

1.  **\`name\`**: The full name of the candidate.

2.  **\`email\`**: The primary email address of the candidate.

3.  **\`portfolio_link\`**: All URLs found that point to a personal portfolio, GitHub, or professional website. List them all as an array of strings.

4.  **\`skills\`**: A comprehensive list of all technical and soft skills mentioned in the resume. Format this as a clean, simple array of strings. Maintain the original capitalization and spelling of the skills as they appear in the resume.

5.  **\`experience\`**: A detailed, structured breakdown of the candidate's work history. This must be an array of objects. For each job listed, extract the following sub-fields:

    * \`job_title\`: The exact title of the position.

    * \`company\`: The name of the company.

    * \`duration\`: The duration of the role (e.g., "3 yr", "2021 - 2024").

    * \`projects\`: A list of projects and key responsibilities or achievements associated with the role.

6.  **\`total_experience\`**: The total number of years of professional experience, calculated from all listed jobs. Present this as a numerical value in years (e.g., \`5\`). If a specific duration isn't found, estimate based on start and end years.

7.  **\`summary\`**: A concise, professional summary, no more than **five** lines long, highlighting the candidate's key qualifications and career goals.

**Instructions & Constraints:**

* **Determinism**: Your output must be identical for the same input. Do not introduce any randomness or creative language. If you receive the same resume text twice, you must produce the same JSON object both times.

* **Accuracy**: Be meticulous in parsing data. **EXTRACT ONLY THE DATA PRESENT IN THE RESUME.** Do not imagine or create any information that is not explicitly stated.

* **Consistency**: The output format must be consistent for every resume. If a data point is not found, the value should be \`null\` or an empty array/string.

* **No Conversation**: The output should be the raw, structured JSON data only, without any conversational text or explanation.


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
      total_experience: parsedData.total_experience || 0,
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
  let totalExperience = 0;
  if (experienceMatches && experienceMatches.length > 0) {
    // Find the highest number as total experience
    const years = experienceMatches.map(match => parseInt(match)).filter(num => !isNaN(num));
    if (years.length > 0) {
      totalExperience = Math.max(...years);
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

**Objective:** Act as a precise, consistent, and deterministic AI agent to analyze a candidate's qualifications against a specific job role. Generate a comprehensive match analysis where the numerical scores are mathematically linked.

**Input:**

1.  **Candidate Data:** A JSON object from Agent 1.

2.  **Job Data:** A JSON object containing the job's title, description, and required qualifications.

**Instructions & Constraints:**

* **Consistency**: The final output must be identical for the same input data. The scores and analyses must be calculated consistently every time.

* **Objectivity**: Base your analysis **only** on the provided \`Candidate Data\` and \`Job Data\`. Do not use external knowledge or invent information.

* **No Conversation**: The output must be the raw, structured JSON object only.

**Analysis and Output Generation:**

Your primary task is to perform a detailed comparison and generate a single JSON object with the following fields and precise scoring logic:

1.  **\`match_percentage\`**: A single numerical score (0-100) representing the overall alignment of the candidate's profile with the job's requirements.

    * **Calculation Method**: Perform a semantic and quantitative analysis.

        * **Skills Alignment**: Compare the candidate's skills and experience against the job's required and preferred skills.

        * **Experience Alignment**: Analyze the candidate's job titles, companies, and project descriptions to determine how well their professional background matches the role's responsibilities.

        * **Holistic Score**: The final score is a combined, well-reasoned metric reflecting the overall strength of the match.

2.  **\`strengths\`**: An object containing a numerical score and a list of detailed points.

    * **Score**: The \`strengths.score\` **must be exactly equal** to the \`match_percentage\` value.

    * **Description**: A list of at least five specific, justifiable points. These points should highlight the candidate's qualifications that directly contributed to the \`match_percentage\` score. The first three points should be the most impactful and relevant to be displayed as a summary.

3.  **\`areas_for_improvement\`**: An object containing a numerical score and a list of detailed points.

    * **Score**: The \`areas_for_improvement.score\` **must be exactly equal** to \`100 - match_percentage\`.

    * **Description**: A list of specific reasons or missing qualifications that explain why the candidate's score is less than 100. These points should be based on job requirements not found in the candidate's resume. The first three points should be the most critical for the role.


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
  "total_experience": ${candidate.total_experience},
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
  const candidateExperienceYears = candidate.total_experience || 0;
  const jobExperienceMatch = jobDescription.toLowerCase().includes('experience') ? 70 : 50;
  
  // Combined match percentage
  const matchPercentage = Math.round((skillMatchPercentage + jobExperienceMatch) / 2);
  
  return {
    candidate_name: candidate.name,
    candidate_email: candidate.email,
    match_percentage: matchPercentage,
    strengths: [
      `Skills match: ${matchingSkills.length} out of ${requiredSkills.length} required skills`,
      `Total experience: ${candidate.total_experience || 'Not specified'} years`,
      `Relevant portfolio links: ${candidate.portfolio_link.length > 0 ? 'Yes' : 'No'}`,
      "Fallback analysis due to AI service unavailability",
      "Detailed matching requires AI processing"
    ],
    areas_for_improvement: [
      "Detailed analysis requires AI processing",
      "Experience level assessment limited without AI",
      "Specific skill gap analysis not available in fallback mode",
      "Fallback method used due to AI service unavailability",
      "Full analysis requires proper AI configuration"
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

**Objective:** Act as an expert interview question generator, creating a curated, **consistent** list of questions.

**Input:**

1.  **Candidate Data:** The JSON object from Agent 1.

2.  **Job Data:** The JSON object containing the job's title, description, and required skills.

**Instructions & Constraints:**

* **Consistency**: For the same input data, you must generate the exact same set of questions every time.

* **Specificity**: Questions must be tailored to the specific skills and experience in the candidate's resume and the job description.

* **No Vague Questions**: Do not generate questions that can be answered with a simple "yes" or "no."

**Question Categories and Content:**

* **Technical Questions**: Focus on the candidate's stated technical skills and their experience with specific technologies or tools.

* **Behavioral Questions**: Explore the candidate's past work behavior and soft skills, tied to scenarios from their resume.

* **Job-Specific Questions**: Directly relate to the specific responsibilities and challenges of the job role being filled.


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
  "total_experience": ${candidate.total_experience},
  "summary": "${candidate.summary}"
}

Job Data:
{
  "title": "${jobTitle}",
  "required_skills": [${requiredSkills.map(s => `"${s}"`).join(', ')}],
  "description": "${jobDescription}"
}

Return only valid JSON with the following structure:
{
  "technical": ["Question 1", "Question 2", ...],
  "behavioral": ["Question 1", "Question 2", ...],
  "jobSpecific": ["Question 1", "Question 2", ...]
}

Generate a minimum of 5 questions for each category.
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
      technical: Array.isArray(parsedData.technical) ? parsedData.technical : [],
      behavioral: Array.isArray(parsedData.behavioral) ? parsedData.behavioral : [],
      jobSpecific: Array.isArray(parsedData.jobSpecific) ? parsedData.jobSpecific : []
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