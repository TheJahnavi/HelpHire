import OpenAI from 'openai';

// Define the ExtractedCandidate interface
export interface ExtractedCandidate {
  name: string;
  email: string;
  portfolio_link: string[];
  skills: string[];
  experience: Array<{
    company: string;
    position: string;
    duration: string;
    start_year?: number;
    end_year?: number;
    description: string;
  }>;
  total_experience: string;
  summary: string;
}

// Define the MatchResult interface
export interface MatchResult {
  candidate_name: string;
  candidate_email: string;
  match_percentage: number;
  strengths: {
    description: string[];
  };
  areas_for_improvement: {
    description: string[];
  };
}

// Define the InterviewQuestions interface
export interface InterviewQuestions {
  technical: string[];
  behavioral: string[];
  scenario_based: string[];
}

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || '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',
  baseURL: 'https://openrouter.ai/api/v1',
});

// Agent 1: Extract Resume Data
export async function extractResumeData(resumeText: string): Promise<ExtractedCandidate> {
  try {
    const prompt = `
Act as a specialized data extraction agent. Analyze the provided resume content and extract key information with high accuracy. The output must be a single JSON object.

Input: Raw text content from a single resume.

Output Requirements:
Extract the following data points and format them into a single, comprehensive JSON object.

name: The full name of the candidate.

email: The primary email address of the candidate.

portfolio_link: Any URLs found (e.g., GitHub, personal website, LinkedIn) as an array of strings. If no links are found, return null.

skills: A comprehensive list of all skills mentioned. Return as an array of strings.

experience: A detailed, structured breakdown of the candidate's work history. For each role, extract:

job_title: The title of the position.

company: The company name.

duration: The duration of the role (e.g., "3 years," "2021-2024").

projects: A list of projects, key responsibilities, or quantifiable achievements for that role, as an array of strings.

total_experience: The total number of years of professional experience, calculated from the listed jobs. The output should be a single string (e.g., "5 years").

summary: A concise, professional summary of the resume. The summary must be a single paragraph and no more than five lines long.

Instructions & Constraints:

You must parse the text and return only a JSON object. No conversational language, introductory phrases, or explanations.

For experience, ensure all projects and responsibilities are listed as a detailed array of strings, not a single summarized string.

If a field (like portfolio_link) is not found, its value must be null.

The final output should be a complete and valid JSON object.

RESUME TEXT:
${resumeText}

RESPONSE FORMAT (Return only valid JSON, no markdown, no extra text):
{
  "name": "string",
  "email": "string",
  "portfolio_link": ["string URLs or null"],
  "skills": ["string array of technical skills or empty array"],
  "experience": [
    {
      "job_title": "string",
      "company": "string",
      "duration": "string (e.g. '2020 - Present' or '2 years')",
      "projects": ["string array of projects/responsibilities"]
    }
  ],
  "total_experience": "string (e.g. '4 years total')",
  "summary": "string (professional summary - max 5 lines)"
}
`;

    const response = await openai.chat.completions.create({
      model: "deepseek/deepseek-r1-0528-qwen3-8b:free",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.0,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    
    // Validate and ensure all required fields are present
    return {
      name: parsed.name || "Unknown",
      email: parsed.email || "",
      portfolio_link: Array.isArray(parsed.portfolio_link) ? parsed.portfolio_link : [],
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      experience: Array.isArray(parsed.experience) ? parsed.experience : [],
      total_experience: parsed.total_experience || "0 years total",
      summary: parsed.summary || "No summary available"
    };
  } catch (error) {
    console.error("Error in extractResumeData:", error);
    // Fallback method for data extraction
    return fallbackExtractResumeData(resumeText);
  }
}

// Agent 2: Calculate Job Match
export async function calculateJobMatch(
  candidate: ExtractedCandidate,
  jobTitle: string,
  requiredSkills: string[],
  jobDescription: string,
  experienceRequired: string,
  additionalNotes: string
): Promise<MatchResult> {
  try {
    const prompt = `
Act as a specialized AI agent to analyze a candidate's qualifications against a specific job role. The output must be a structured JSON object.

Input:

Candidate Data: A JSON object with the candidate's skills, experience, and summary from Agent 1.

Job Data: A JSON object with the job's title, description, and required_skills.

Instructions & Constraints:
The analysis must be based only on the provided Candidate Data and Job Data. Do not use external knowledge.

Analysis and Output Generation:
Your primary task is to act as a comparative engine, generating a comprehensive match analysis. The final output must be a single JSON object with the following keys:

candidate_name: The full name of the candidate.

candidate_email: The email address of the candidate.

match_percentage: A single numerical score (0-100) representing the overall match. The score must be justified by the strengths and areas_for_improvement you provide.

strengths: An array of at least five specific points. Each point must directly justify the match percentage by highlighting a clear alignment between a candidate's resume detail and a job requirement.

areas_for_improvement: An array of specific reasons or missing qualifications that contribute to the difference from a 100% match. Each point must identify a requirement from the job description that is not mentioned in the candidate's resume.

Example for strengths and areas_for_improvement:

Strength: "The candidate has 5 years of experience as a 'Lead Automation QA,' aligning perfectly with the job's senior role requirement."

Weakness: "The job description requires experience with 'SQL database management,' which was not mentioned in the candidate's resume."

CANDIDATE PROFILE:
Name: ${candidate.name}
Email: ${candidate.email}
Summary: ${candidate.summary}
Skills: ${candidate.skills.join(', ')}
Experience: ${candidate.total_experience}
Work History:
${candidate.experience.map(exp => 
  "- " + exp.position + " at " + exp.company + " (" + exp.duration + ")\n  " + exp.description
).join('\n')}

JOB POSTING:
Title: ${jobTitle}
Required Skills: ${requiredSkills.join(', ')}
Description: ${jobDescription}
Experience Required: ${experienceRequired}
Additional Notes: ${additionalNotes}

RESPONSE FORMAT (Return only valid JSON, no markdown, no extra text):
{
  "candidate_name": "string",
  "candidate_email": "string",
  "match_percentage": number (0-100),
  "strengths": {
    "description": ["string array of specific strengths with evidence - at least 5 points"]
  },
  "areas_for_improvement": {
    "description": ["string array of specific improvement areas with suggestions - at least 5 points"]
  }
}
`;

    const response = await openai.chat.completions.create({
      model: "deepseek/deepseek-r1-0528-qwen3-8b:free",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.0,
      max_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    
    // Validate and ensure all required fields are present
    return {
      candidate_name: parsed.candidate_name || candidate.name || "Unknown",
      candidate_email: parsed.candidate_email || candidate.email || "",
      match_percentage: typeof parsed.match_percentage === 'number' ? parsed.match_percentage : 0,
      strengths: {
        description: Array.isArray(parsed.strengths?.description) ? parsed.strengths.description : []
      },
      areas_for_improvement: {
        description: Array.isArray(parsed.areas_for_improvement?.description) ? parsed.areas_for_improvement.description : []
      }
    };
  } catch (error) {
    console.error("Error in calculateJobMatch:", error);
    // Return a default match result with 0% match
    return {
      candidate_name: candidate.name || "Unknown",
      candidate_email: candidate.email || "",
      match_percentage: 0,
      strengths: {
        description: []
      },
      areas_for_improvement: {
        description: ["Error calculating match: " + (error instanceof Error ? error.message : 'Unknown error')]
      }
    };
  }
}

// Agent 3: Generate Interview Questions
export async function generateInterviewQuestions(
  candidate: ExtractedCandidate,
  jobTitle: string,
  jobDescription: string,
  requiredSkills: string[]
): Promise<InterviewQuestions> {
  try {
    const prompt = `
Act as an expert interview question generator. Create a curated list of questions based on a candidate's profile and a specific job role's requirements. The questions must be categorized for different interview stages. The output must be a structured JSON object.

Input:

Candidate Data: The JSON object containing the candidate's skills, experience, and projects from Agent 1.

Job Data: The JSON object containing the job's title, description, and required_skills.

Instructions & Constraints:

The questions must be tailored to the specific skills, projects, and experiences mentioned in the candidate's resume and the requirements in the job description.

Generate a minimum of five unique questions for each category.

Do not generate questions that can be answered with a simple "yes" or "no."

Do not generate generic questions like "Tell me about yourself."

Question Categories and Content:

Technical Questions:

Focus: Test the candidate's stated technical skills and their experience with specific technologies from their resume. Questions should be based on the candidate's projects and past roles.

Behavioral Questions:

Focus: Explore the candidate's past work behavior and soft skills. These questions must be tied to specific scenarios from the candidate's experience section.

Job-Specific Questions:

Focus: Relate directly to the responsibilities and challenges of the job role. Use details from the job_description to formulate these.

CANDIDATE PROFILE:
Name: ${candidate.name}
Email: ${candidate.email}
Summary: ${candidate.summary}
Skills: ${candidate.skills.join(', ')}
Experience: ${candidate.total_experience}
Work History:
${candidate.experience.map(exp => 
  "- " + exp.position + " at " + exp.company + " (" + exp.duration + ")\n  " + exp.description
).join('\n')}

JOB POSTING:
Title: ${jobTitle}
Required Skills: ${requiredSkills.join(', ')}
Description: ${jobDescription}

RESPONSE FORMAT (Return only valid JSON, no markdown, no extra text):
{
  "technical": ["string array of technical questions - minimum 5 unique questions"],
  "behavioral": ["string array of behavioral questions - minimum 5 unique questions"],
  "job_specific": ["string array of job-specific questions - minimum 5 unique questions"]
}
`;

    const response = await openai.chat.completions.create({
      model: "deepseek/deepseek-r1-0528-qwen3-8b:free",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.0,
      max_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    
    // Validate and ensure all required fields are present
    return {
      technical: Array.isArray(parsed.technical) ? parsed.technical : [],
      behavioral: Array.isArray(parsed.behavioral) ? parsed.behavioral : [],
      job_specific: Array.isArray(parsed.job_specific) ? parsed.job_specific : []
    };
  } catch (error) {
    console.error("Error in generateInterviewQuestions:", error);
    // Return default empty questions
    return {
      technical: [],
      behavioral: [],
      job_specific: []
    };
  }
}

// Fallback method for data extraction when AI fails
function fallbackExtractResumeData(resumeText: string): ExtractedCandidate {
  console.log("Using fallback method for resume data extraction");
  
  // Extract name (first line that looks like a name)
  let name = "Unknown";
  const nameLines = resumeText.split('\n').slice(0, 3); // Check first 3 lines
  for (const line of nameLines) {
    const trimmedLine = line.trim();
    // Simple heuristic: name is likely to be title case and not contain @ or numbers
    if (trimmedLine && !trimmedLine.includes('@') && !/\d/.test(trimmedLine) && 
        trimmedLine.split(' ').every(word => word.charAt(0) === word.charAt(0).toUpperCase())) {
      name = trimmedLine;
      break;
    }
  }
  
  // Extract email
  let email = "";
  const emailMatch = resumeText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    email = emailMatch[0];
  }
  
  // Extract skills (look for "skills" or "technical skills")
  let skills: string[] = [];
  try {
    const skillsPattern = new RegExp("(SKILLS|TECHNICAL\\s+SKILLS|TECHNOLOGIES|TOOLS)\\s*\\n\\s*([^\\n].*?)(?=\\n\\n|\\n[A-Z]|\\n\\d+\\.|\\n-|$)", "i");
    const skillsMatch = resumeText.match(skillsPattern);
    if (skillsMatch) {
      // Split by commas, "and", or newlines and clean up
      skills = skillsMatch[2]
        .split(/,\s*|\s+and\s+|\n/)
        .map(skill => skill.trim())
        .filter(skill => skill.length > 1);
    }
  } catch (e) {
    // If regex fails, use a simpler approach
    const skillsLines = resumeText.split('\n');
    const skillsIndex = skillsLines.findIndex(line => 
      line.includes('SKILLS') || 
      line.includes('TECHNICAL SKILLS') || 
      line.includes('TECHNOLOGIES') ||
      line.includes('TOOLS')
    );
    if (skillsIndex !== -1 && skillsIndex + 1 < skillsLines.length) {
      const skillsText = skillsLines[skillsIndex + 1].trim();
      skills = skillsText.split(/,\s*|\s+and\s+/).map(skill => skill.trim()).filter(skill => skill.length > 1) || [];
    }
  }
  
  // Extract summary (look for PROFESSIONAL SUMMARY or similar)
  let summary = "Extracted using fallback method due to AI service unavailability.";
  try {
    const summaryPattern = new RegExp("(PROFESSIONAL\\s+SUMMARY|SUMMARY|PROFILE|OVERVIEW)\\s*\\n\\s*([^\\n].*?)(?=\\n\\n|\\n[A-Z]|\\n\\d+\\.|\\n-|$)", "i");
    const summaryMatch = resumeText.match(summaryPattern);
    if (summaryMatch) {
      summary = summaryMatch[2].trim();
    }
  } catch (e) {
    // If regex fails, use a simpler approach
    const summaryLines = resumeText.split('\n');
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
  
  // Extract experience
  let experience: ExtractedCandidate['experience'] = [];
  let totalExperience = "0 years total";
  
  try {
    // Look for experience/work section
    const experienceSections = resumeText.match(/(EXPERIENCE|WORK\\s+HISTORY|EMPLOYMENT\\s+HISTORY)(.*?)(?=\\n[A-Z][A-Z]+\\s+[A-Z]|$)/i);
    if (experienceSections) {
      const experienceText = experienceSections[2];
      // Extract job entries (simplified pattern)
      const jobEntries = experienceText.split(/\n\s*\n/).filter(entry => entry.trim().length > 20);
      for (const entry of jobEntries) {
        const lines = entry.split('\n').map(line => line.trim()).filter(line => line);
        if (lines.length >= 2) {
          const positionCompany = lines[0].split('|').map(part => part.trim());
          const position = positionCompany[0] || "Not specified";
          const company = positionCompany[1] || "Not specified";
          const duration = lines[1] || "Not specified";
          const description = lines.slice(2).join(' ') || "No description available";
          
          experience.push({
            company,
            position,
            duration,
            description
          });
        }
      }
    }
    
    // Calculate total experience from experience entries
    if (experience.length > 0) {
      let totalYears = 0;
      for (const job of experience) {
        // Try to extract years from duration
        const yearMatch = job.duration.match(/(\d+)\s*year/i);
        if (yearMatch) {
          totalYears += parseInt(yearMatch[1]);
        }
      }
      totalExperience = `${totalYears} years total`;
    }
  } catch (e) {
    console.error("Error extracting experience:", e);
    // Keep empty experience array
  }
  
  return {
    name,
    email,
    portfolio_link: [],
    skills,
    experience,
    total_experience: totalExperience,
    summary
  };
}