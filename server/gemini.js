// server/gemini.ts
import OpenAI from "openai";
var openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || "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",
  baseURL: "https://openrouter.ai/api/v1"
});
async function extractResumeData(resumeText) {
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
      temperature: 0,
      max_tokens: 2e3
    });
    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
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
    return fallbackExtractResumeData(resumeText);
  }
}
async function calculateJobMatch(candidate, jobTitle, requiredSkills, jobDescription, experienceRequired, additionalNotes) {
  try {
    const prompt = `
You are an expert HR recruiter tasked with precisely calculating how well a candidate matches a job posting. Follow these instructions exactly and respond only with valid JSON.

CANDIDATE PROFILE:
Name: ${candidate.name}
Email: ${candidate.email}
Summary: ${candidate.summary}
Skills: ${candidate.skills.join(", ")}
Experience: ${candidate.total_experience}
Work History:
${candidate.experience.map(
      (exp) => "- " + exp.position + " at " + exp.company + " (" + exp.duration + ")\n  " + exp.description
    ).join("\n")}

JOB POSTING:
Title: ${jobTitle}
Required Skills: ${requiredSkills.join(", ")}
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
      temperature: 0,
      max_tokens: 1500
    });
    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    return {
      candidate_name: parsed.candidate_name || candidate.name || "Unknown",
      candidate_email: parsed.candidate_email || candidate.email || "",
      match_percentage: typeof parsed.match_percentage === "number" ? parsed.match_percentage : 0,
      strengths: {
        description: Array.isArray(parsed.strengths?.description) ? parsed.strengths.description : []
      },
      areas_for_improvement: {
        description: Array.isArray(parsed.areas_for_improvement?.description) ? parsed.areas_for_improvement.description : []
      }
    };
  } catch (error) {
    console.error("Error in calculateJobMatch:", error);
    return {
      candidate_name: candidate.name || "Unknown",
      candidate_email: candidate.email || "",
      match_percentage: 0,
      strengths: {
        description: []
      },
      areas_for_improvement: {
        description: ["Error calculating match: " + (error instanceof Error ? error.message : "Unknown error")]
      }
    };
  }
}
async function generateInterviewQuestions(candidate, jobTitle, jobDescription, requiredSkills) {
  try {
    const prompt = `
You are an expert HR interviewer tasked with generating targeted interview questions for a candidate based on their resume and the job requirements. Follow these instructions exactly and respond only with valid JSON.

CANDIDATE PROFILE:
Name: ${candidate.name}
Email: ${candidate.email}
Summary: ${candidate.summary}
Skills: ${candidate.skills.join(", ")}
Experience: ${candidate.total_experience}
Work History:
${candidate.experience.map(
      (exp) => "- " + exp.position + " at " + exp.company + " (" + exp.duration + ")\n  " + exp.description
    ).join("\n")}

JOB POSTING:
Title: ${jobTitle}
Required Skills: ${requiredSkills.join(", ")}
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
      temperature: 0,
      max_tokens: 1500
    });
    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    return {
      technical: Array.isArray(parsed.technical) ? parsed.technical : [],
      behavioral: Array.isArray(parsed.behavioral) ? parsed.behavioral : [],
      scenario_based: Array.isArray(parsed.scenario_based) ? parsed.scenario_based : []
    };
  } catch (error) {
    console.error("Error in generateInterviewQuestions:", error);
    return {
      technical: [],
      behavioral: [],
      scenario_based: []
    };
  }
}
function fallbackExtractResumeData(resumeText) {
  console.log("Using fallback method for resume data extraction");
  let name = "Unknown";
  const nameLines = resumeText.split("\n").slice(0, 3);
  for (const line of nameLines) {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.includes("@") && !/\d/.test(trimmedLine) && trimmedLine.split(" ").every((word) => word.charAt(0) === word.charAt(0).toUpperCase())) {
      name = trimmedLine;
      break;
    }
  }
  let email = "";
  const emailMatch = resumeText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    email = emailMatch[0];
  }
  let skills = [];
  try {
    const skillsPattern = new RegExp("(SKILLS|TECHNICAL\\s+SKILLS|TECHNOLOGIES|TOOLS)\\s*\\n\\s*([^\\n].*?)(?=\\n\\n|\\n[A-Z]|\\n\\d+\\.|\\n-|$)", "i");
    const skillsMatch = resumeText.match(skillsPattern);
    if (skillsMatch) {
      skills = skillsMatch[2].split(/,\s*|\s+and\s+|\n/).map((skill) => skill.trim()).filter((skill) => skill.length > 1);
    }
  } catch (e) {
    const skillsLines = resumeText.split("\n");
    const skillsIndex = skillsLines.findIndex(
      (line) => line.includes("SKILLS") || line.includes("TECHNICAL SKILLS") || line.includes("TECHNOLOGIES") || line.includes("TOOLS")
    );
    if (skillsIndex !== -1 && skillsIndex + 1 < skillsLines.length) {
      const skillsText = skillsLines[skillsIndex + 1].trim();
      skills = skillsText.split(/,\s*|\s+and\s+/).map((skill) => skill.trim()).filter((skill) => skill.length > 1) || [];
    }
  }
  let summary = "Extracted using fallback method due to AI service unavailability.";
  try {
    const summaryPattern = new RegExp("(PROFESSIONAL\\s+SUMMARY|SUMMARY|PROFILE|OVERVIEW)\\s*\\n\\s*([^\\n].*?)(?=\\n\\n|\\n[A-Z]|\\n\\d+\\.|\\n-|$)", "i");
    const summaryMatch = resumeText.match(summaryPattern);
    if (summaryMatch) {
      summary = summaryMatch[2].trim();
    }
  } catch (e) {
    const summaryLines = resumeText.split("\n");
    const summaryIndex = summaryLines.findIndex(
      (line) => line.includes("PROFESSIONAL SUMMARY") || line.includes("SUMMARY") || line.includes("PROFILE") || line.includes("OVERVIEW")
    );
    if (summaryIndex !== -1 && summaryIndex + 1 < summaryLines.length) {
      summary = summaryLines[summaryIndex + 1].trim() || summary;
    }
  }
  let experience = [];
  let totalExperience = "0 years total";
  try {
    const experienceSections = resumeText.match(/(EXPERIENCE|WORK\\s+HISTORY|EMPLOYMENT\\s+HISTORY)(.*?)(?=\\n[A-Z][A-Z]+\\s+[A-Z]|$)/i);
    if (experienceSections) {
      const experienceText = experienceSections[2];
      const jobEntries = experienceText.split(/\n\s*\n/).filter((entry) => entry.trim().length > 20);
      for (const entry of jobEntries) {
        const lines = entry.split("\n").map((line) => line.trim()).filter((line) => line);
        if (lines.length >= 2) {
          const positionCompany = lines[0].split("|").map((part) => part.trim());
          const position = positionCompany[0] || "Not specified";
          const company = positionCompany[1] || "Not specified";
          const duration = lines[1] || "Not specified";
          const description = lines.slice(2).join(" ") || "No description available";
          experience.push({
            company,
            position,
            duration,
            description
          });
        }
      }
    }
    if (experience.length > 0) {
      let totalYears = 0;
      for (const job of experience) {
        const yearMatch = job.duration.match(/(\d+)\s*year/i);
        if (yearMatch) {
          totalYears += parseInt(yearMatch[1]);
        }
      }
      totalExperience = `${totalYears} years total`;
    }
  } catch (e) {
    console.error("Error extracting experience:", e);
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
export {
  calculateJobMatch,
  extractResumeData,
  generateInterviewQuestions
};
