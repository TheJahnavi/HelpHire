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

export interface InterviewQuestions {
  technical: string[];
  behavioral: string[];
  scenario_based: string[];
}

export function extractResumeData(resumeText: string): Promise<ExtractedCandidate>;
export function calculateJobMatch(
  candidate: ExtractedCandidate,
  jobTitle: string,
  requiredSkills: string[],
  jobDescription: string,
  experienceRequired: string,
  additionalNotes: string
): Promise<MatchResult>;
export function generateInterviewQuestions(
  candidate: ExtractedCandidate,
  jobTitle: string,
  jobDescription: string,
  requiredSkills: string[]
): Promise<InterviewQuestions>;