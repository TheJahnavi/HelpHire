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
  apiKey: process.env.OPENAI_API_KEY || 'your-openrouter-api-key-here',
  baseURL: 'https://openrouter.ai/api/v1',
});

// Agent 1: Extract Resume Data
export async function extractResumeData(resumeText: string): Promise<ExtractedCandidate> {
  try {
    const prompt = `
You are an expert HR resume parser. Your task is to extract comprehensive candidate information from the provided resume text with maximum accuracy and precision. Follow these instructions exactly and respond only with valid JSON.

INSTRUCTIONS:
1. Extract all information with 100% accuracy. If uncertain, mark as "Not specified".
2. Follow the exact JSON structure provided below. Do not add or remove fields.
3. For arrays, provide complete lists. If none, return empty array [].
4. For experience, extract each job with company, position, duration, and detailed description.
5. Calculate total experience as a string like "X years total".
6. Extract professional summary/profile/overview section exactly as written.
7. Extract all technical skills as an array of strings.
8. Extract portfolio links (GitHub, LinkedIn, personal website) as array of URLs.
9. Extract email address exactly as written.

RESUME TEXT:
${resumeText}

RESPONSE FORMAT (Return only valid JSON, no markdown, no extra text):
{
  "name": "string",
  "email": "string",
  "portfolio_link": ["string URLs or empty array"],
  "skills": ["string array of technical skills or empty array"],
  "experience": [
    {
      "company": "string",
      "position": "string",
      "duration": "string (e.g. '2020 - Present' or '2 years')",
      "start_year": "number (if determinable) or null",
      "end_year": "number (if determinable) or null",
      "description": "string (detailed responsibilities and achievements)"
    }
  ],
  "total_experience": "string (e.g. '4 years total')",
  "summary": "string (professional summary/profile/overview section)"
}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
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
You are an expert HR recruiter tasked with precisely calculating how well a candidate matches a job posting. Follow these instructions exactly and respond only with valid JSON.

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

INSTRUCTIONS:
1. Calculate a precise match percentage (0-100) based on skills, experience, and job requirements.
2. Identify 3-5 key strengths that make this candidate a good fit (be specific and cite evidence from their resume).
3. Identify 3-5 specific areas where the candidate could improve to better match the role (be constructive and specific).
4. Base your analysis solely on the provided information. Do not make assumptions.
5. Return only valid JSON, no markdown, no extra text.

RESPONSE FORMAT:
{
  "candidate_name": "string",
  "candidate_email": "string",
  "match_percentage": number (0-100),
  "strengths": {
    "description": ["string array of specific strengths with evidence"]
  },
  "areas_for_improvement": {
    "description": ["string array of specific improvement areas with suggestions"]
  }
}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
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
You are an expert HR interviewer tasked with generating targeted interview questions for a candidate based on their resume and the job requirements. Follow these instructions exactly and respond only with valid JSON.

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

INSTRUCTIONS:
1. Generate 3-5 technical questions that test the candidate's proficiency in the required skills.
2. Generate 3-5 behavioral questions that assess soft skills and cultural fit.
3. Generate 2-3 scenario-based questions that test problem-solving abilities in job-specific contexts.
4. Ensure questions are relevant to both the candidate's background and job requirements.
5. Base your questions solely on the provided information. Do not make assumptions.
6. Return only valid JSON, no markdown, no extra text.

RESPONSE FORMAT:
{
  "technical": ["string array of technical questions"],
  "behavioral": ["string array of behavioral questions"],
  "scenario_based": ["string array of scenario-based questions"]
}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
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
      scenario_based: Array.isArray(parsed.scenario_based) ? parsed.scenario_based : []
    };
  } catch (error) {
    console.error("Error in generateInterviewQuestions:", error);
    // Return default empty questions
    return {
      technical: [],
      behavioral: [],
      scenario_based: []
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