import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface ProjectData {
  name: string;
  skills: string[];
}

export interface ExperienceData {
  years: number;
  projects: ProjectData[];
}

export interface ExtractedCandidate {
  name: string;
  email: string;
  skills: string[];
  experience: ExperienceData;
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
  name: string;
  matchPercentage: number;
  summary: string;
  strengthsBehindReasons: StrengthReason[];
  lagBehindReasons: LagReason[];
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
      "experience": {
        "years": <number of years of professional experience>,
        "projects": [
          {
            "name": "Project name",
            "skills": ["skills", "used", "in", "project"]
          }
        ]
      },
      "summary": "One paragraph professional summary"
    }
    
    Resume text:
    ${resumeText}
    
    Return only valid JSON, no additional text.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            name: { type: "string" },
            email: { type: "string" },
            skills: { type: "array", items: { type: "string" } },
            experience: {
              type: "object",
              properties: {
                years: { type: "number" },
                projects: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      skills: { type: "array", items: { type: "string" } }
                    },
                    required: ["name", "skills"]
                  }
                }
              },
              required: ["years", "projects"]
            },
            summary: { type: "string" }
          },
          required: ["name", "email", "skills", "experience", "summary"]
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

export async function calculateJobMatch(candidate: ExtractedCandidate, jobTitle: string, jobSkills: string[], jobDescription: string): Promise<JobMatchResult> {
  try {
    const prompt = `
    Compare this candidate against the job requirements and provide a detailed match analysis:
    
    Candidate:
    - Name: ${candidate.name}
    - Skills: ${candidate.skills.join(', ')}
    - Experience: ${candidate.experience.years} years
    - Projects: ${candidate.experience.projects.map(p => `${p.name} (${p.skills.join(', ')})`).join('; ')}
    
    Job Requirements:
    - Title: ${jobTitle}
    - Required Skills: ${jobSkills.join(', ')}
    - Description: ${jobDescription}
    
    Provide response in JSON format:
    {
      "name": "${candidate.name}",
      "matchPercentage": <number 0-100>,
      "summary": "Brief summary of the match",
      "strengthsBehindReasons": [
        {
          "reason": "Description of strength",
          "points": <positive points earned>,
          "experienceList": ["technologies", "or", "skills", "that", "support", "this"]
        }
      ],
      "lagBehindReasons": [
        {
          "reason": "Description of gap or weakness",
          "points": <negative points deducted>,
          "gaps": "Specific missing skills or experience"
        }
      ]
    }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            name: { type: "string" },
            matchPercentage: { type: "number" },
            summary: { type: "string" },
            strengthsBehindReasons: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  reason: { type: "string" },
                  points: { type: "number" },
                  experienceList: { type: "array", items: { type: "string" } }
                },
                required: ["reason", "points", "experienceList"]
              }
            },
            lagBehindReasons: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  reason: { type: "string" },
                  points: { type: "number" },
                  gaps: { type: "string" }
                },
                required: ["reason", "points", "gaps"]
              }
            }
          },
          required: ["name", "matchPercentage", "summary", "strengthsBehindReasons", "lagBehindReasons"]
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
    Experience: ${candidate.experience.years} years
    Projects: ${candidate.experience.projects.map(p => `${p.name} (${p.skills.join(', ')})`).join('; ')}
    
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
      model: "gemini-2.5-flash",
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