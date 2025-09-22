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
    start_year?: number;
    end_year?: number;
    projects: string[];
  }[];
  total_experience: string; // Changed to string to match the requirement
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

    // Build the prompt string without using template literals to avoid syntax errors
    const prompt = 
`### **Ultra-Detailed Prompt for Agent 1: Resume Data Extraction**

**Objective:** Act as a specialized, **highly deterministic** data extraction agent. Analyze the provided resume text and extract every specified detail with **absolute precision and consistency**. The output must be a JSON object that exactly matches the specified structure and content.

**Input:** Raw text content from one or more resumes.

**Output Structure (Targeting Image 1):**

\`\`\`json
{
  "name": "Jane Smith",
  "email": "jane.smith@email.com",
  "portfolio_link": [
    "https://github.com/janedoe",
    "https://www.janedoe.me"
  ],
  "skills": [
    "Python",
    "JavaScript",
    "Selenium WebDriver",
    "Playwright",
    "Robot Framework",
    "Pytest",
    "Pytest-BDD",
    "GitLab CI",
    "Jenkins",
    "Postman",
    "RESTful APIs",
    "requests library",
    "Jira",
    "TestRail",
    "Zephyr",
    "Agile",
    "Scrum",
    "BDD (Behavior-Driven Development)"
  ],
  "experience": [
    {
      "job_title": "Lead Automation QA",
      "company": "Tech Corp",
      "duration": "3 yr",
      "start_year": 2021,
      "end_year": 2024,
      "projects": [
        "Led a team of 5 in developing automated testing frameworks.",
        "Reduced bug count by 25% through improved test coverage."
      ]
    },
    {
      "job_title": "Automation Tester",
      "company": "Innovate Ltd.",
      "duration": "2 yr",
      "start_year": 2019,
      "end_year": 2021,
      "projects": [
        "Developed and maintained regression test suites.",
        "Integrated testing into CI/CD pipeline."
      ]
    }
  ],
  "total_experience": "4 years total",
  "summary": "Results-driven Automation Tester with over 4 years of experience in quality assurance and test..."
}
\`\`\`

**Execution Strategy (Strict Order):**

1.  **Extract Name:** Locate the full name, typically at the top. Store it in \`name\`.

2.  **Extract Email:** Find the primary email address. Store it in \`email\`.

3.  **Extract Portfolio Links:** Identify all URLs (e.g., GitHub, LinkedIn, personal website). Store them as an array of strings in \`portfolio_link\`. If none, use an empty array \`[]\`.

4.  **Extract Skills (Comprehensive List):** Scan the entire resume for keywords related to technical skills, tools, methodologies (e.g., Agile, Scrum, BDD), and soft skills. Collect *all* unique skills into a flat array of strings in \`skills\`. Maintain original capitalization from the resume if possible.

5.  **Extract Experience (Detailed & Structured):**

      * Go through each work experience entry.

      * For each entry, extract \`job_title\`, \`company\`, \`duration\`, \`start_year\`, \`end_year\`.

      * For each role, extract a list of \`projects\` or key \`responsibilities\`/\`achievements\` as bullet points. Store these as an array of strings.

      * Ensure the structure matches the \`experience\` array of objects precisely.

6.  **Calculate Total Experience:** Sum the durations of all extracted \`experience\` entries. If \`duration\` is not explicit, use \`end_year - start_year\`. Format the total as a string, e.g., "4 years total". Store in \`total_experience\`.

7.  **Extract/Generate Summary:** Look for an existing "Summary" or "Objective" section. If found, extract it directly, ensuring it is no more than 5 lines. If no explicit summary is present, generate a concise, professional summary (max 5 lines) based *only* on the extracted \`skills\` and \`experience\`.

**Conditions/Checks:**

* **Consistency is Non-Negotiable**: For the exact same resume text, your JSON output **must be identical every time**. This is paramount.

* **Accuracy & No Hallucination**: **EXTRACT ONLY THE DATA PRESENT IN THE RESUME.** Do not invent any information or make assumptions. If a specific data point is missing in the resume (e.g., portfolio link), its value *must* be \`null\` or an empty array/string, *never* a placeholder or invented value.

* **Output Format Enforcement**: The output must be a perfectly valid JSON object conforming strictly to the \`Output Structure\` provided above.

**Validation Instructions:**

1. **Self-Verification Process:** Before returning the JSON, perform these checks:
   - Verify that \`name\` is a non-empty string
   - Verify that \`email\` is a valid email format or empty string
   - Verify that \`portfolio_link\` is an array of strings (URLs) or empty array
   - Verify that \`skills\` is an array of strings (skills) or empty array
   - Verify that \`experience\` is an array of objects with required fields
   - Verify that \`total_experience\` is a string in the format "X years total"
   - Verify that \`summary\` is a string with maximum 5 lines

2. **Error Handling:** If any required field cannot be extracted, use appropriate default values:
   - \`name\`: "Unknown"
   - \`email\`: ""
   - \`portfolio_link\`: []
   - \`skills\`: []
   - \`experience\`: []
   - \`total_experience\`: "0 years total"
   - \`summary\`: "No summary available"

3. **Final Output Format:** Return ONLY the JSON object, with no additional text, explanations, or markdown formatting.

**Resume Content:**
${resumeText}

**IMPORTANT:** Return ONLY valid JSON with the exact structure shown above. Ensure temperature=0.0 for maximum determinism. Do not include any additional text, markdown, or explanations in your response. Only return the JSON object.`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.0, // Set to 0.0 for maximum determinism
      max_tokens: 2000,
    });

    const rawJson = response.choices[0]?.message?.content || "";
    if (!rawJson) {
      throw new Error("Empty response from OpenAI");
    }

    // Clean up the response to ensure it's valid JSON
    const cleanedResponse = rawJson.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
    
    // Parse and validate the response
    const parsedData = JSON.parse(cleanedResponse);
    
    return {
      name: parsedData.name || "Unknown",
      email: parsedData.email || "",
      portfolio_link: Array.isArray(parsedData.portfolio_link) ? parsedData.portfolio_link : [],
      skills: Array.isArray(parsedData.skills) ? parsedData.skills : [],
      experience: Array.isArray(parsedData.experience) ? parsedData.experience : [],
      total_experience: parsedData.total_experience || "0 years total",
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
      throw new Error('Access forbidden to OpenAI API. Please check your API key permissions. Error: ' + error.message);
    } else if (error.status === 429) {
      throw new Error('Rate limit exceeded for OpenAI API. Please try again later. Error: ' + error.message);
    } else if (error.status === 500) {
      throw new Error('OpenAI API server error. Please try again later. Error: ' + error.message);
    } else {
      throw new Error('Failed to extract resume data: ' + (error.message || error));
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
    'Swift', 'Kotlin', 'Go', 'Rust', 'Scala', 'Haskell', 'Elixir', 'Clojure',
    'Selenium', 'Playwright', 'Cypress', 'Jest', 'Mocha', 'Chai', 'Pytest',
    'Jenkins', 'GitLab CI', 'GitHub Actions', 'CircleCI', 'Travis CI',
    'Agile', 'Scrum', 'Kanban', 'Waterfall', 'BDD', 'TDD', 'CI/CD'
  ];
  
  const skills = skillKeywords.filter(skill => 
    resumeText.toLowerCase().includes(skill.toLowerCase())
  );
  
  // Extract experience years (simple pattern matching)
  const experienceMatches = resumeText.match(/(\d+)\s*(?:year|yr)s?/gi);
  let totalExperience = "0 years total";
  if (experienceMatches && experienceMatches.length > 0) {
    // Find the highest number as total experience
    const years = experienceMatches.map(match => parseInt(match)).filter(num => !isNaN(num));
    if (years.length > 0) {
      const maxYears = Math.max(...years);
      totalExperience = maxYears + " years total";
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

    // Build candidate data JSON string
    const candidateDataJson = JSON.stringify({
      name: candidate.name,
      email: candidate.email,
      portfolio_link: candidate.portfolio_link,
      skills: candidate.skills,
      experience: candidate.experience,
      total_experience: candidate.total_experience,
      summary: candidate.summary
    }, null, 2);

    // Build job data JSON string
    const jobDataJson = JSON.stringify({
      title: jobTitle,
      required_skills: jobSkills,
      description: jobDescription,
      experience_required: jobExperience || '',
      notes: jobNotes || ''
    }, null, 2);

    const prompt = 
`### **Ultra-Detailed Prompt for Agent 2: Resume-to-Job Match Analysis**

**Objective:** Act as a precise, consistent, and deterministic AI agent to analyze a candidate's qualifications against a specific job role. Generate a comprehensive match analysis where the numerical scores are mathematically linked and the output is perfectly reproducible.

**Input:**

1.  **Candidate Data:** The complete JSON object from Agent 1's output.

2.  **Job Data:** The JSON object containing the job's \`title\`, \`description\`, and \`required_skills\`.

**Output Structure (Targeting Image 2):**

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
      "Strong skills in JavaScript and Python are directly relevant to the tech stack.",
      "Experience with CI/CD pipelines is a major asset for this position.",
      "Portfolio links demonstrate a strong personal commitment to professional development."
    ]
  },
  "areas_for_improvement": {
    "score": 25,
    "description": [
      "Lacks specific experience with the Jenkins CI tool, which is a required skill.",
      "Resume does not mention experience with performance testing, a key responsibility.",
      "Projects listed do not directly align with the company's industry."
    ]
  }
}
\`\`\`

**Execution Strategy (Strict Order):**

1.  **Cross-Reference Data:** Meticulously compare \`Candidate Data.skills\`, \`Candidate Data.experience\` (including \`job_title\`, \`company\`, \`projects\`), and \`Candidate Data.summary\` against \`Job Data.required_skills\` and \`Job Data.description\`.

2.  **Calculate \`match_percentage\` (Quantitative and Qualitative):**

      * **Skills Match (Weighted):** Identify all candidate skills directly matching \`Job Data.required_skills\`. Give higher weight to exact matches of required skills. Consider \`total_experience\` and depth of experience with those skills from \`experience.projects\`.

      * **Experience Match (Alignment):** Evaluate how well the candidate's \`job_title\`s and \`experience.projects\` align with the responsibilities in \`Job Data.description\`. Look for specific keywords and phrases.

      * **Summary Relevance:** Briefly assess how well \`Candidate Data.summary\` positions the candidate for the role.

      * Combine these factors into a single, objective numerical \`match_percentage\` from 0-100.

3.  **Generate \`strengths\` (Justification):**

      * Create a list of at least **five (5)** distinct, specific points that directly contributed to the \`match_percentage\`.

      * These points **must be verifiable** from the \`Candidate Data\` and directly relevant to the \`Job Data\`.

      * The \`strengths.score\` **must be exactly equal** to the \`match_percentage\` value.

4.  **Generate \`areas_for_improvement\` (Gaps Analysis):**

      * Create a list of specific reasons or missing qualifications. These **must be explicit requirements** from \`Job Data.required_skills\` or \`Job Data.description\` that are **not evident** in the \`Candidate Data\`.

      * The \`areas_for_improvement.score\` **must be exactly equal** to \`100 - match_percentage\`.

**Conditions/Checks:**

* **Consistency is Non-Negotiable**: For the same input data, the entire output JSON object, including all scores and lists, **must be identical every time**.

* **Mathematical Linkage (Critical)**: \`match_percentage\` === \`strengths.score\` **AND** \`areas_for_improvement.score\` === \`100 - match_percentage\`. This is a strict verification point.

* **Source Data**: Your analysis must be based **only** on the provided \`Candidate Data\` and \`Job Data\`.

* **Completeness**: \`strengths.description\` must have at least 5 points.

**Validation Instructions:**

1. **Self-Verification Process:** Before returning the JSON, perform these checks:
   - Verify that \`candidate_name\` matches the input candidate name
   - Verify that \`candidate_email\` matches the input candidate email
   - Verify that \`match_percentage\` is a number between 0-100
   - Verify that \`strengths.score\` exactly equals \`match_percentage\`
   - Verify that \`areas_for_improvement.score\` exactly equals \`100 - match_percentage\`
   - Verify that \`strengths.description\` has at least 5 distinct points
   - Verify that \`areas_for_improvement.description\` has relevant gap analysis points

2. **Error Handling:** If any calculation cannot be performed, use appropriate default values:
   - \`match_percentage\`: 0
   - \`strengths.score\`: 0
   - \`areas_for_improvement.score\`: 100
   - \`strengths.description\`: ["Unable to calculate strengths"]
   - \`areas_for_improvement.description\`: ["Unable to calculate areas for improvement"]

3. **Final Output Format:** Return ONLY the JSON object, with no additional text, explanations, or markdown formatting.

**Candidate Data:**
${candidateDataJson}

**Job Data:**
${jobDataJson}

**IMPORTANT:** Return ONLY valid JSON with the exact structure shown above. Ensure temperature=0.0 for maximum determinism. Do not include any additional text, markdown, or explanations in your response. Only return the JSON object.`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.0, // Set to 0.0 for maximum determinism
      max_tokens: 2500,
    });

    const rawJson = response.choices[0]?.message?.content || "";
    if (!rawJson) {
      throw new Error("Empty response from OpenAI");
    }

    // Clean up the response to ensure it's valid JSON
    const cleanedResponse = rawJson.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
    
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
      throw new Error('Access forbidden to OpenAI API. Please check your API key permissions. Error: ' + error.message);
    } else if (error.status === 429) {
      throw new Error('Rate limit exceeded for OpenAI API. Please try again later. Error: ' + error.message);
    } else if (error.status === 500) {
      throw new Error('OpenAI API server error. Please try again later. Error: ' + error.message);
    } else {
      throw new Error('Failed to calculate job match: ' + (error.message || error));
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
    strengths: {
      score: matchPercentage,
      description: [
        'Skills match: ' + matchingSkills.length + ' out of ' + requiredSkills.length + ' required skills',
        'Total experience: ' + (candidate.total_experience || 'Not specified'),
        'Relevant portfolio links: ' + (candidate.portfolio_link.length > 0 ? 'Yes' : 'No'),
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

    // Build candidate data JSON string
    const candidateDataJson = JSON.stringify({
      name: candidate.name,
      email: candidate.email,
      portfolio_link: candidate.portfolio_link,
      skills: candidate.skills,
      experience: candidate.experience,
      total_experience: candidate.total_experience,
      summary: candidate.summary
    }, null, 2);

    // Build job data JSON string
    const jobDataJson = JSON.stringify({
      title: jobTitle,
      required_skills: requiredSkills,
      description: jobDescription
    }, null, 2);

    const prompt = 
`### **Ultra-Detailed Prompt for Agent 3: Interview Question Generation**

**Objective:** Act as an expert interview question generator, creating a curated, **consistent**, and **highly relevant** list of questions.

**Input:**

1.  **Candidate Data:** The complete JSON object from Agent 1's output.

2.  **Job Data:** The JSON object containing the job's \`title\`, \`description\`, and \`required_skills\`.

**Output Structure:**

The output must be a single JSON object with the following three keys, each containing an array of strings (the questions). Each category *must* have exactly 5 questions.

\`\`\`json
{
  "technical_questions": [
    "Given your experience with [Specific Skill from Resume, e.g., Python] and [Another Skill, e.g., Pytest], how would you approach building an automated test suite for [Scenario relevant to Job Description or Candidate Project]?",
    "Describe a challenging bug you identified while working on [Specific Project from Resume]. What steps did you take to debug and resolve it using [Specific Technical Tool/Skill]?",
    "How would you design a testing framework for [Specific Technology from Job Description] based on your experience with [Candidate's Relevant Skill]?",
    "Walk me through how you would optimize test execution time for a large test suite, considering your experience with [Specific CI/CD Tool from Resume].",
    "Explain how you would implement test data management in an automated testing environment, drawing from your work on [Specific Project from Resume]."
  ],
  "behavioral_questions": [
    "As a [Candidate's Job Title, e.g., Lead Automation QA] at [Candidate's Company], describe a time you had to influence team members to adopt a new testing methodology. What was the outcome?",
    "Tell me about a project at [Candidate's Company] where you faced significant technical challenges. How did you demonstrate leadership and problem-solving skills to overcome them?",
    "Describe a situation where you had to manage competing priorities while working on [Specific Project from Resume]. How did you ensure quality was maintained?",
    "Give me an example of how you mentored or coached junior team members in [Specific Skill from Resume]. What approach did you take?",
    "Tell me about a time when you had to adapt your testing approach due to changing project requirements during [Specific Project from Resume]."
  ],
  "job_specific_questions": [
    "Our [Job Description specific project/feature] relies heavily on [Specific Technology from Job Description]. How would your experience with [Candidate's Relevant Skill] contribute to its success?",
    "The [Job Title] role requires managing a high volume of [Specific Task from Job Description]. How would you leverage your [Candidate's relevant experience, e.g., CI/CD expertise] to streamline this process?",
    "Given your experience with [Specific Skill from Resume], how would you approach [Specific Responsibility from Job Description]?",
    "Our team uses [Specific Methodology/Tool from Job Description]. How does your experience with [Candidate's Relevant Experience] prepare you to contribute effectively?",
    "What challenges do you anticipate when working on [Specific Project/Task from Job Description], and how would your background in [Candidate's Experience] help you address them?"
  ]
}
\`\`\`

**Execution Strategy (Strict Order):**

1.  **Generate Technical Questions (5 questions):**

      * Review \`Candidate Data.skills\` and \`Candidate Data.experience.projects\`.

      * Review \`Job Data.required_skills\`.

      * Formulate 5 questions that specifically test the candidate's practical application of their *stated* technical skills (e.g., Python, Playwright, GitLab CI) in scenarios relevant to their past projects or the job description.

      * **Verification:** Each question *must* reference at least one specific skill or tool from the \`Candidate Data\` and/or \`Job Data\`.

2.  **Generate Behavioral Questions (5 questions):**

      * Review \`Candidate Data.experience\` (especially \`job_title\`s and \`projects\`) and \`Candidate Data.summary\`.

      * Formulate 5 questions about their past work behavior and soft skills (e.g., leadership, problem-solving, teamwork, adaptability).

      * **Crucially:** Each question *must* tie back to a specific past role, project, or achievement mentioned in the \`Candidate Data\`. Avoid generic behavioral questions.

3.  **Generate Job-Specific Questions (5 questions):**

      * Review \`Job Data.description\` and \`Job Data.required_skills\` in detail.

      * Formulate 5 questions directly related to the specific responsibilities, challenges, or unique aspects of *this particular job role*.

      * **Verification:** Each question *must* reference an element directly from the \`Job Data.description\` or \`Job Data.required_skills\`.

**Conditions/Checks:**

* **Consistency is Non-Negotiable**: For the same input data, the set of questions generated **must be identical every time**.

* **Specificity**: Questions must be **directly tailored**. Do not generate generic questions.

* **Format**: Each category (\`technical_questions\`, \`behavioral_questions\`, \`job_specific_questions\`) must contain exactly 5 unique questions.

* **Open-ended**: All questions must be open-ended, not answerable with a simple "yes" or "no."

**Validation Instructions:**

1. **Self-Verification Process:** Before returning the JSON, perform these checks:
   - Verify that \`technical_questions\` has exactly 5 questions
   - Verify that \`behavioral_questions\` has exactly 5 questions
   - Verify that \`job_specific_questions\` has exactly 5 questions
   - Verify that each question references specific candidate data or job data
   - Verify that all questions are open-ended and not yes/no questions

2. **Error Handling:** If questions cannot be generated, use appropriate default values:
   - \`technical_questions\`: ["Technical question 1", "Technical question 2", "Technical question 3", "Technical question 4", "Technical question 5"]
   - \`behavioral_questions\`: ["Behavioral question 1", "Behavioral question 2", "Behavioral question 3", "Behavioral question 4", "Behavioral question 5"]
   - \`job_specific_questions\`: ["Job-specific question 1", "Job-specific question 2", "Job-specific question 3", "Job-specific question 4", "Job-specific question 5"]

3. **Final Output Format:** Return ONLY the JSON object, with no additional text, explanations, or markdown formatting.

**Candidate Data:**
${candidateDataJson}

**Job Data:**
${jobDataJson}

**IMPORTANT:** Return ONLY valid JSON with the exact structure shown above. Ensure temperature=0.0 for maximum determinism. Do not include any additional text, markdown, or explanations in your response. Only return the JSON object with exactly 5 questions for each category.`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.0, // Set to 0.0 for maximum determinism
      max_tokens: 3000,
    });

    const rawJson = response.choices[0]?.message?.content || "";
    if (!rawJson) {
      throw new Error("Empty response from OpenAI");
    }

    // Clean up the response to ensure it's valid JSON
    const cleanedResponse = rawJson.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
    
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
      throw new Error('Access forbidden to OpenAI API. Please check your API key permissions. Error: ' + error.message);
    } else if (error.status === 429) {
      throw new Error('Rate limit exceeded for OpenAI API. Please try again later. Error: ' + error.message);
    } else if (error.status === 500) {
      throw new Error('OpenAI API server error. Please try again later. Error: ' + error.message);
    } else {
      throw new Error('Failed to generate interview questions: ' + (error.message || error));
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
    "What experience do you have with " + requiredSkills.slice(0, 3).join(', ') + "?",
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
    "What interests you most about the " + jobTitle + " position?",
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