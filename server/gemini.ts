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
  strengths: {
    score: number;
    description: string[];
  };
  areas_for_improvement: {
    score: number;
    description: string[];
  };
}

export interface InterviewQuestions {
  technical_questions: string[];
  behavioral_questions: string[];
  job_specific_questions: string[];
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

**Objective:** Act as a precise, consistent, and deterministic AI agent to analyze a candidate's qualifications against a specific job role. Generate a comprehensive match analysis with mathematically linked scores.

**Input:**

1.  **Candidate Data:** The JSON object from Agent 1.

2.  **Job Data:** The JSON object containing the job's title, description, and required qualifications.

**Output Structure:**

The output must be a single JSON object with the following fields and precise scoring logic:

\`\`\`json
{
  "candidate_name": "Jane Smith",
  "candidate_email": "jane.smith@email.com",
  "match_percentage": 75,
  "strengths": {
    "score": 75,
    "description": [
      "5 years of experience in automation testing, matching the job's requirement.",
      "Proven experience leading a QA team, a key leadership requirement for this role.",
      "Strong skills in JavaScript and Python are directly relevant to the tech stack."
    ]
  },
  "areas_for_improvement": {
    "score": 25,
    "description": [
      "Lacks specific experience with the Jenkins CI tool.",
      "Resume does not mention experience with performance testing.",
      "Projects listed do not directly align with the company's industry."
    ]
  }
}
\`\`\`

**Logic and Verification:**

  * **Process in Steps:**

    1.  **First, calculate \`match_percentage\`**: Analyze the candidate's extracted \`skills\`, \`experience\` (including project descriptions), and \`summary\`. Compare these directly against the job's \`required_skills\` and \`description\`. Assign a final numerical score from 0 to 100 based on this holistic comparison.

    2.  **Second, calculate \`strengths\`**: Based **on the exact same criteria used for the \`match_percentage\`**, generate a list of at least five specific points that justify the score. The \`strengths.score\` **must be exactly equal** to the \`match_percentage\` value.

    3.  **Third, calculate \`areas_for_improvement\`**: Identify every skill, responsibility, or qualification in the job description that is **not present** in the candidate's profile. The \`areas_for_improvement.score\` **must be exactly equal** to \`100 - match_percentage\`.

  * **Conditions/Checks:**

      * **Consistency is Non-Negotiable**: For the same input data, the output JSON object, including all scores and lists, **must be identical every time**.

      * **Mathematical Verification**: The condition \`match_percentage === strengths.score\` must always be true. The condition \`areas_for_improvement.score === 100 - match_percentage\` must always be true.

      * **Source Data**: Your analysis must be based **only** on the provided \`Candidate Data\` and \`Job Data\`.


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
      strengths: {
        score: parsedData.strengths?.score || 0,
        description: Array.isArray(parsedData.strengths?.description) ? parsedData.strengths.description : []
      },
      areas_for_improvement: {
        score: parsedData.areas_for_improvement?.score || 0,
        description: Array.isArray(parsedData.areas_for_improvement?.description) ? parsedData.areas_for_improvement.description : []
      }
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
    strengths: {
      score: matchPercentage,
      description: [
        `Skills match: ${matchingSkills.length} out of ${requiredSkills.length} required skills`,
        `Total experience: ${candidate.total_experience || 'Not specified'} years`,
        `Relevant portfolio links: ${candidate.portfolio_link.length > 0 ? 'Yes' : 'No'}`,
        "Fallback analysis due to AI service unavailability",
        "Detailed matching requires AI processing"
      ]
    },
    areas_for_improvement: {
      score: 100 - matchPercentage,
      description: [
        "Detailed analysis requires AI processing",
        "Experience level assessment limited without AI",
        "Specific skill gap analysis not available in fallback mode",
        "Fallback method used due to AI service unavailability",
        "Full analysis requires proper AI configuration"
      ]
    }
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

**Objective:** Act as an expert interview question generator, creating a curated, **consistent**, and relevant list of questions.

**Input:**

1.  **Candidate Data:** The JSON object from Agent 1.

2.  **Job Data:** The JSON object containing the job's title, description, and required skills.

**Output Structure:**

The output must be a single JSON object with the following three keys, each containing an array of strings (the questions).

\`\`\`json
{
  "technical_questions": [
    "Question 1",
    "Question 2"
  ],
  "behavioral_questions": [
    "Question 1",
    "Question 2"
  ],
  "job_specific_questions": [
    "Question 1",
    "Question 2"
  ]
}
\`\`\`

**Logic and Verification:**

  * **Process in Steps:**

    1.  **First, generate Technical Questions**: Read the candidate's \`skills\` list and \`experience\` descriptions. Formulate 5 questions that test their practical application of these skills, specifically in the context of their listed projects or responsibilities.

    2.  **Second, generate Behavioral Questions**: Use the candidate's \`experience\` and \`summary\` to craft 5 questions about their past behavior. Focus on scenarios related to their listed \`job_title\`s or key achievements.

    3.  **Third, generate Job-Specific Questions**: Read the \`job_description\` from the job data. Formulate 5 questions that directly address the specific responsibilities, challenges, or unique aspects of this particular role.

  * **Conditions/Checks:**

      * **Consistency is Non-Negotiable**: The set of questions generated **must be identical** for the same input data every time.

      * **Relevance**: Questions must be **directly tailored**. Do not generate generic questions.

      * **Content Check**: Ensure all questions are open-ended and not answerable with a simple "yes" or "no."


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
  "technical_questions": ["Question 1", "Question 2", ...],
  "behavioral_questions": ["Question 1", "Question 2", ...],
  "job_specific_questions": ["Question 1", "Question 2", ...]
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
      technical_questions: Array.isArray(parsedData.technical_questions) ? parsedData.technical_questions : [],
      behavioral_questions: Array.isArray(parsedData.behavioral_questions) ? parsedData.behavioral_questions : [],
      job_specific_questions: Array.isArray(parsedData.job_specific_questions) ? parsedData.job_specific_questions : []
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
    technical_questions: technicalQuestions,
    behavioral_questions: behavioralQuestions,
    job_specific_questions: jobSpecificQuestions
  };
}