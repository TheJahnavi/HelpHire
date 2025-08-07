import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface ExtractedCandidate {
  name: string;
  email: string;
  skills: string[];
  experience: string;
  projects: string[];
  summary: string;
}

export interface JobMatchResult {
  matchPercentage: number;
  summary: string;
  strengths: string[];
  gaps: string[];
}

export interface InterviewQuestions {
  technical: string[];
  behavioral: string[];
  jobSpecific: string[];
}

export async function extractResumeData(resumeText: string): Promise<ExtractedCandidate> {
  try {
    const prompt = `
    Analyze this resume text and extract the following information in JSON format:
    
    {
      "name": "Full name of the candidate",
      "email": "Email address if found",
      "skills": ["array", "of", "technical", "skills"],
      "experience": "Brief summary of work experience (2-3 sentences)",
      "projects": ["array", "of", "key", "projects"],
      "summary": "One paragraph professional summary"
    }
    
    Resume text:
    ${resumeText}
    
    Return only valid JSON, no additional text.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            name: { type: "string" },
            email: { type: "string" },
            skills: { type: "array", items: { type: "string" } },
            experience: { type: "string" },
            projects: { type: "array", items: { type: "string" } },
            summary: { type: "string" }
          },
          required: ["name", "email", "skills", "experience", "projects", "summary"]
        }
      },
      contents: prompt,
    });

    const rawJson = response.text;
    if (!rawJson) {
      throw new Error("Empty response from Gemini");
    }

    return JSON.parse(rawJson);
  } catch (error) {
    console.error("Error extracting resume data:", error);
    throw new Error(`Failed to extract resume data: ${error}`);
  }
}

export async function calculateJobMatch(
  candidate: ExtractedCandidate,
  jobTitle: string,
  jobDescription: string,
  requiredSkills: string[],
  requiredExperience: string
): Promise<JobMatchResult> {
  try {
    const prompt = `
    As a hiring expert, analyze how well this candidate matches the job requirements:
    
    CANDIDATE:
    Name: ${candidate.name}
    Skills: ${candidate.skills.join(", ")}
    Experience: ${candidate.experience}
    Projects: ${candidate.projects.join(", ")}
    
    JOB REQUIREMENTS:
    Title: ${jobTitle}
    Description: ${jobDescription}
    Required Skills: ${requiredSkills.join(", ")}
    Required Experience: ${requiredExperience}
    
    Provide analysis in JSON format:
    {
      "matchPercentage": number (0-100),
      "summary": "2-3 sentence overall match assessment",
      "strengths": ["array", "of", "candidate", "strengths"],
      "gaps": ["array", "of", "missing", "requirements"]
    }
    
    Return only valid JSON, no additional text.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            matchPercentage: { type: "number" },
            summary: { type: "string" },
            strengths: { type: "array", items: { type: "string" } },
            gaps: { type: "array", items: { type: "string" } }
          },
          required: ["matchPercentage", "summary", "strengths", "gaps"]
        }
      },
      contents: prompt,
    });

    const rawJson = response.text;
    if (!rawJson) {
      throw new Error("Empty response from Gemini");
    }

    return JSON.parse(rawJson);
  } catch (error) {
    console.error("Error calculating job match:", error);
    throw new Error(`Failed to calculate job match: ${error}`);
  }
}

export async function generateInterviewQuestions(
  candidate: ExtractedCandidate,
  jobTitle: string,
  jobDescription: string,
  requiredSkills: string[]
): Promise<InterviewQuestions> {
  try {
    const prompt = `
    Generate tailored interview questions for this candidate and job:
    
    CANDIDATE:
    Name: ${candidate.name}
    Skills: ${candidate.skills.join(", ")}
    Experience: ${candidate.experience}
    Projects: ${candidate.projects.join(", ")}
    
    JOB:
    Title: ${jobTitle}
    Description: ${jobDescription}
    Required Skills: ${requiredSkills.join(", ")}
    
    Generate questions in JSON format:
    {
      "technical": ["5-6 technical questions based on required skills"],
      "behavioral": ["4-5 behavioral questions"],
      "jobSpecific": ["3-4 questions specific to this role and candidate's background"]
    }
    
    Return only valid JSON, no additional text.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            technical: { type: "array", items: { type: "string" } },
            behavioral: { type: "array", items: { type: "string" } },
            jobSpecific: { type: "array", items: { type: "string" } }
          },
          required: ["technical", "behavioral", "jobSpecific"]
        }
      },
      contents: prompt,
    });

    const rawJson = response.text;
    if (!rawJson) {
      throw new Error("Empty response from Gemini");
    }

    return JSON.parse(rawJson);
  } catch (error) {
    console.error("Error generating interview questions:", error);
    throw new Error(`Failed to generate interview questions: ${error}`);
  }
}