"use client";

import { useState, useMemo, ChangeEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@radix-ui/react-progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Upload as UploadIcon,
  FileText,
  Brain,
  CheckCircle,
  AlertCircle,
  Users,
  Trash2,
  Search,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { z } from "zod";

// Updated interfaces to include new fields
interface ExtractedCandidate {
  id: string;
  name: string;
  email: string;
  skills: string[];
  experience: {
    years: number;
    projects: {
      name: string;
      skills: string[];
    }[];
  }; // Updated experience object
  summary: string;
}

interface StrengthsBehindReason {
  reason: string;
  points: number;
  "experience list": string[];
}

interface LagBehindReason {
  reason: string;
  points: number;
  gaps: string;
}

interface JobMatch {
  candidateId: string;
  matchPercentage: number;
  summary: string;
  strengthsBehindReasons?: StrengthsBehindReason[];
  lagBehindReasons?: LagBehindReason[];
}

interface InterviewQuestions {
  technical: string[];
  behavioral: string[];
  jobSpecific: string[];
}

// Zod schema for the AI's structured response
const projectSchema = z.object({
  name: z.string(),
  skills: z.array(z.string()),
});

const experienceSchema = z.object({
  years: z.number().int().min(0),
  projects: z.array(projectSchema),
});

const extractedCandidateSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  skills: z.array(z.string()),
  experience: experienceSchema,
  summary: z.string(),
});

// Zod schema for the detailed match report
const strengthsBehindReasonSchema = z.object({
  reason: z.string(),
  points: z.number(),
  "experience list": z.array(z.string()),
});

const lagBehindReasonSchema = z.object({
  reason: z.string(),
  points: z.number(),
  gaps: z.string(),
});

const jobMatchSchema = z.object({
  candidateId: z.string(),
  matchPercentage: z.number().min(0).max(100),
  summary: z.string(),
  strengthsBehindReasons: z.array(strengthsBehindReasonSchema).optional(),
  lagBehindReasons: z.array(lagBehindReasonSchema).optional(),
});

export default function Upload() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State for managing the UI flow and data
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [extractedCandidates, setExtractedCandidates] = useState<
    ExtractedCandidate[]
  >([]);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [matchResults, setMatchResults] = useState<JobMatch[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [showQuestions, setShowQuestions] = useState<{
    [key: string]: InterviewQuestions;
  }>({});
  const [currentStep, setCurrentStep] = useState<
    "upload" | "extracted" | "matched" | "added"
  >("upload");
  const [filterTerm, setFilterTerm] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("default");

  // Fetch available jobs from the API
  const { data: jobs } = useQuery({
    queryKey: ["/api/jobs"],
  });

  // Function to read file content as base64
  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  // Mutation to handle file upload and data extraction
  const uploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const allExtractedCandidates: ExtractedCandidate[] = [];

      for (const file of Array.from(files)) {
        const base64Data = await readFileAsBase64(file);
        const mimeType = file.type;
        const prompt = "Extract the key details from this resume. Provide the name, email, skills, and a detailed experience section including the total years and a list of projects with their associated skills. Also, provide a summary. Provide the response as a JSON object.";

        // API call to the Gemini model with a structured schema
        const payload = {
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: base64Data.split(',')[1],
                  },
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: extractedCandidateSchema,
          },
        };
        const apiKey = "";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

        // Exponential backoff for API retries
        let response;
        for (let i = 0; i < 3; i++) {
          try {
            response = await fetch(apiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            if (response.status !== 429) break; // Break if not a rate limit error
            await new Promise(res => setTimeout(res, Math.pow(2, i) * 1000));
          } catch (e) {
            if (i === 2) throw e;
            await new Promise(res => setTimeout(res, Math.pow(2, i) * 1000));
          }
        }
        if (!response?.ok) {
          throw new Error(`API call failed with status: ${response?.status}`);
        }
        const result = await response.json();
        const jsonString = result?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (jsonString) {
          try {
            const extractedData = JSON.parse(jsonString);
            const validatedData = extractedCandidateSchema.parse(extractedData);
            allExtractedCandidates.push({
              ...validatedData,
              id: crypto.randomUUID(), // Add a unique ID
            });
          } catch (e) {
            console.error("Failed to parse or validate AI response:", e);
          }
        }
      }
      return { candidates: allExtractedCandidates };
    },
    onSuccess: (data) => {
      setExtractedCandidates(data.candidates);
      setCurrentStep("extracted");
      toast({
        title: "Success",
        description: `Extracted ${data.candidates.length} candidate profiles using AI`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description:
          error.message || "Failed to process resumes. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation to handle candidate matching against a job
  const matchMutation = useMutation({
    mutationFn: async ({
      candidates,
      jobId,
    }: {
      candidates: ExtractedCandidate[];
      jobId: string;
    }) => {
      const job = jobs.find((j: any) => j.id.toString() === jobId);
      if (!job) {
        throw new Error("Job not found.");
      }

      const allMatches: JobMatch[] = [];

      for (const candidate of candidates) {
        const prompt = `You are an expert HR analyst. Compare the following candidate's resume data with the job description.

        Candidate Resume Data:
        Name: ${candidate.name}
        Skills: ${candidate.skills.join(", ")}
        Experience: ${candidate.experience.years} years. Projects: ${candidate.experience.projects.map(p => p.name).join(", ")}
        Summary: ${candidate.summary}

        Job Description:
        Title: ${job.jobTitle}
        Requirements: ${job.jobDescription}

        Provide a match report as a JSON object, calculating a match percentage and providing a summary. Also, list specific strengths and lags based on the provided schemas.`;

        // API call to the Gemini model with a structured schema for the match report
        const payload = {
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: jobMatchSchema,
          },
        };

        const apiKey = "";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

        let response;
        for (let i = 0; i < 3; i++) {
          try {
            response = await fetch(apiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            if (response.status !== 429) break;
            await new Promise(res => setTimeout(res, Math.pow(2, i) * 1000));
          } catch (e) {
            if (i === 2) throw e;
            await new Promise(res => setTimeout(res, Math.pow(2, i) * 1000));
          }
        }
        if (!response?.ok) {
          throw new Error(`API call failed with status: ${response?.status}`);
        }
        const result = await response.json();
        const jsonString = result?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (jsonString) {
          try {
            const matchData = JSON.parse(jsonString);
            const validatedMatch = jobMatchSchema.parse({ ...matchData, candidateId: candidate.id });
            allMatches.push(validatedMatch);
          } catch (e) {
            console.error("Failed to parse or validate AI match response:", e);
          }
        }
      }
      return { matches: allMatches };
    },
    onSuccess: (data: any) => {
      setMatchResults(data.matches);
      setCurrentStep("matched");
      toast({
        title: "AI Analysis Complete",
        description: "Candidates matched against job requirements",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description:
          error.message || "Failed to match candidates. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation to generate interview questions
  const questionsMutation = useMutation({
    mutationFn: async ({
      candidate,
      jobId,
    }: {
      candidate: ExtractedCandidate;
      jobId: string;
    }) => {
      return apiRequest("/api/ai/generate-questions", {
        method: "POST",
        body: { candidate, jobId: parseInt(jobId) },
      });
    },
    onSuccess: (data, variables) => {
      setShowQuestions((prev) => ({
        ...prev,
        [variables.candidate.id]: data.questions,
      }));
      toast({
        title: "Interview Questions Generated",
        description: "AI-tailored questions ready for interview",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate questions",
        variant: "destructive",
      });
    },
  });

  // Mutation to add selected candidates to the database
  const addCandidatesMutation = useMutation({
    mutationFn: async () => {
      const candidatesToSubmit = extractedCandidates
        .filter((candidate) => selectedCandidates.includes(candidate.id))
        .map((candidate) => {
          const match = matchResults.find(
            (m) => m.candidateId === candidate.id,
          );

          // Debugging log to verify all data is captured
          console.log("Candidate data to be added:", {
            id: crypto.randomUUID(),
            candidate_name: candidate.name,
            email: candidate.email,
            job_id: parseInt(selectedJobId),
            candidate_skills: candidate.skills.join(","),
            candidate_experience: candidate.experience.years.toString(),
            match_percentage: match?.matchPercentage || 0,
            status: "resume_reviewed",
            resume_url: "",
            hr_handling_user_id: "",
            report_link: "",
            interview_link: "",
            created_at: new Date().toISOString(),
          });

          return {
            // Using crypto.randomUUID() to generate a unique ID
            id: crypto.randomUUID(),
            candidate_name: candidate.name,
            email: candidate.email,
            job_id: parseInt(selectedJobId),
            candidate_skills: candidate.skills.join(","), // Assuming skills are stored as a comma-separated string
            candidate_experience: candidate.experience.years.toString(),
            match_percentage: match?.matchPercentage || 0,
            status: "resume_reviewed", // Setting the status as requested
            resume_url: "",
            hr_handling_user_id: "",
            report_link: "",
            interview_link: "",
            created_at: new Date().toISOString(),
          };
        });

      // This is a placeholder for a database or API call,
      // as we are storing data temporarily.
      return new Promise((resolve) => {
        setTimeout(() => {
          console.log("Simulating adding candidates to DB:", candidatesToSubmit);
          resolve({ success: true, count: candidatesToSubmit.length });
        }, 1000);
      });
    },
    onSuccess: (data) => {
      setCurrentStep("added");
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      toast({
        title: "Candidates Added",
        description: `Successfully added ${selectedCandidates.length} candidate(s) to the database.`,
      });
      setExtractedCandidates((prev) =>
        prev.filter((candidate) => !selectedCandidates.includes(candidate.id))
      );
      setSelectedCandidates([]);
      setMatchResults((prev) =>
        prev.filter((match) => !selectedCandidates.includes(match.candidateId))
      );
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add candidates to database",
        variant: "destructive",
      });
    },
  });

  // Event handlers
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(e.target.files);
  };

  const handleUpload = () => {
    if (selectedFiles && selectedFiles.length > 0) {
      uploadMutation.mutate(selectedFiles);
    }
  };

  const handleMatch = () => {
    if (selectedJobId && extractedCandidates.length > 0) {
      matchMutation.mutate({
        candidates: extractedCandidates,
        jobId: selectedJobId,
      });
    }
  };

  const handleGenerateQuestions = (candidate: ExtractedCandidate) => {
    if (selectedJobId) {
      questionsMutation.mutate({ candidate, jobId: selectedJobId });
    }
  };

  const handleAddCandidates = () => {
    addCandidatesMutation.mutate();
  };

  // New event handlers for candidate selection and deletion
  const handleSelectCandidate = (candidateId: string) => {
    setSelectedCandidates((prev) =>
      prev.includes(candidateId)
        ? prev.filter((id) => id !== candidateId)
        : [...prev, candidateId],
    );
  };

  const handleDeleteCandidate = (candidateId: string) => {
    setExtractedCandidates((prev) => prev.filter((c) => c.id !== candidateId));
    setSelectedCandidates((prev) => prev.filter((id) => id !== candidateId));
    setMatchResults((prev) =>
      prev.filter((m) => m.candidateId !== candidateId),
    );
  };

  // Utility function to determine progress bar color
  const getMatchColor = (percentage: number) => {
    if (percentage >= 80) return "bg-green-500";
    if (percentage >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  // Memoized and sorted/filtered candidates to improve performance
  const displayedCandidates = useMemo(() => {
    let filtered = extractedCandidates;

    // Filter logic
    if (filterTerm) {
      filtered = filtered.filter(
        (candidate) =>
          candidate.name.toLowerCase().includes(filterTerm.toLowerCase()) ||
          candidate.email.toLowerCase().includes(filterTerm.toLowerCase()) ||
          candidate.skills.some((skill) =>
            skill.toLowerCase().includes(filterTerm.toLowerCase()),
          ),
      );
    }

    // Sort logic
    const candidatesWithMatch = filtered.map((candidate) => {
      const match = matchResults.find((m) => m.candidateId === candidate.id);
      return { ...candidate, matchPercentage: match?.matchPercentage || 0 };
    });

    if (sortBy === "name") {
      candidatesWithMatch.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "match_asc") {
      candidatesWithMatch.sort((a, b) => a.matchPercentage - b.matchPercentage);
    } else if (sortBy === "match_desc") {
      candidatesWithMatch.sort((a, b) => b.matchPercentage - a.matchPercentage);
    }

    return candidatesWithMatch;
  }, [extractedCandidates, matchResults, filterTerm, sortBy]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center justify-center gap-2">
            <Brain className="h-8 w-8 text-blue-600" />
            AI-Powered Resume Analysis
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Upload resumes and let AI extract candidate data, match skills, and
            generate interview questions
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center">
          <div className="flex items-center space-x-4">
            {[
              { step: "upload", label: "Upload", icon: UploadIcon },
              { step: "extracted", label: "Extract", icon: FileText },
              { step: "matched", label: "Match", icon: Brain },
              { step: "added", label: "Complete", icon: CheckCircle },
            ].map(({ step, label, icon: Icon }, index) => (
              <div key={step} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full ${
                    currentStep === step ||
                    ["extracted", "matched", "added"].indexOf(currentStep) >
                      ["upload", "extracted", "matched", "added"].indexOf(step)
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className="ml-2 text-sm font-medium">{label}</span>
                {index < 3 && <div className="ml-4 w-8 h-0.5 bg-gray-200" />}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: File Upload */}
        {currentStep === "upload" && (
          <Card data-testid="card-upload">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UploadIcon className="h-5 w-5" />
                Upload Resume Files
              </CardTitle>
              <CardDescription>
                Select PDF or DOCX resume files for AI analysis. Multiple files
                supported.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  data-testid="input-file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <UploadIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                    Click to select resume files
                  </p>
                  <p className="text-sm text-gray-500">
                    PDF or DOCX files up to 10MB each
                  </p>
                </label>
              </div>

              {selectedFiles && (
                <div className="space-y-2">
                  <h4 className="font-medium">Selected Files:</h4>
                  {Array.from(selectedFiles).map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded"
                    >
                      <span className="text-sm">{file.name}</span>
                      <Badge variant="secondary">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              <Button
                onClick={handleUpload}
                disabled={!selectedFiles || uploadMutation.isPending}
                className="w-full"
                data-testid="button-upload-resumes"
              >
                {uploadMutation.isPending
                  ? "Processing..."
                  : "Upload & Extract Data"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Extracted Candidates */}
        {currentStep === "extracted" && (
          <div className="space-y-6">
            <Card data-testid="card-job-selection">
              <CardHeader>
                <CardTitle>Select Job Position</CardTitle>
                <CardDescription>
                  Choose which job to match candidates against
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                  <SelectTrigger data-testid="select-job">
                    <SelectValue placeholder="Select a job position" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobs && Array.isArray(jobs)
                      ? jobs.map((job: any) => (
                          <SelectItem key={job.id} value={job.id.toString()}>
                            {job.jobTitle}
                          </SelectItem>
                        ))
                      : null}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleMatch}
                  disabled={!selectedJobId || matchMutation.isPending}
                  className="mt-4 w-full"
                  data-testid="button-match-candidates"
                >
                  {matchMutation.isPending
                    ? "Analyzing Match..."
                    : "Analyze Job Match"}
                </Button>
              </CardContent>
            </Card>

            {/* Extracted Candidates List */}
            <div className="grid gap-4">
              {extractedCandidates.map((candidate) => (
                <Card
                  key={candidate.id}
                  data-testid={`card-candidate-${candidate.id}`}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {candidate.name}
                      <Badge variant="outline">{candidate.email}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400">
                        Skills
                      </h4>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {candidate.skills.map((skill, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="text-xs"
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400">
                        Experience
                      </h4>
                      <p className="text-sm mt-1">
                        Total years of experience: {candidate.experience.years}{" "}
                        years
                      </p>
                      <ul className="text-sm mt-2 space-y-1">
                        {candidate.experience.projects.map((project, index) => (
                          <li key={index}>
                            - {project.name}:{" "}
                            {project.skills.join(", ")}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400">
                        Summary
                      </h4>
                      <p className="text-sm mt-1">{candidate.summary}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Matched Results */}
        {currentStep === "matched" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <h2 className="text-2xl font-bold">AI Matching Results</h2>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Filter by name or skill..."
                  value={filterTerm}
                  onChange={(e) => setFilterTerm(e.target.value)}
                  className="max-w-xs"
                  data-testid="input-filter-candidates"
                />
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger
                    className="w-[180px]"
                    data-testid="select-sort"
                  >
                    <SelectValue placeholder="Sort By" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="match_asc">
                      Match % (Low to High)
                    </SelectItem>
                    <SelectItem value="match_desc">
                      Match % (High to Low)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAddCandidates}
                  disabled={
                    selectedCandidates.length === 0 ||
                    addCandidatesMutation.isPending
                  }
                  data-testid="button-add-candidates"
                >
                  {addCandidatesMutation.isPending
                    ? "Adding..."
                    : `Add Selected (${selectedCandidates.length})`}
                </Button>
              </div>
            </div>

            <div className="grid gap-4">
              {displayedCandidates.map((candidate) => {
                const match = matchResults.find(
                  (m) => m.candidateId === candidate.id,
                );
                const questions = showQuestions[candidate.id];

                return (
                  <Card
                    key={candidate.id}
                    data-testid={`card-match-${candidate.id}`}
                    className="relative"
                  >
                    {/* Checkbox for selection */}
                    <div className="absolute top-4 left-4">
                      <Checkbox
                        checked={selectedCandidates.includes(candidate.id)}
                        onCheckedChange={() =>
                          handleSelectCandidate(candidate.id)
                        }
                        aria-label={`Select ${candidate.name}`}
                      />
                    </div>
                    {/* Delete button */}
                    <div className="absolute top-4 right-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteCandidate(candidate.id)}
                      >
                        <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-500" />
                      </Button>
                    </div>
                    <CardHeader className="pt-4 px-6 pb-2">
                          <CardTitle className="flex items-center justify-between">
                            <div className="ml-8">{candidate.name}</div>
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <div className="text-2xl font-bold text-green-600">
                                  {match?.matchPercentage || 0}%
                                </div>
                                <div className="text-xs text-gray-500">
                                  Match Score
                                </div>
                              </div>
                              <div
                                className={`w-2 h-8 rounded ${getMatchColor(match?.matchPercentage || 0)}`}
                              />
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {match && (
                            <>
                              <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{match.summary}</AlertDescription>
                              </Alert>

                              {/* Strengths and Gaps section using the new structure */}
                              {match.strengthsBehindReasons && match.strengthsBehindReasons.length > 0 && (
                                <Alert>
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                  <AlertTitle>Strengths Report</AlertTitle>
                                  <AlertDescription>
                                    <ul className="list-disc list-inside space-y-1">
                                      {match.strengthsBehindReasons.map((strength, index) => (
                                        <li key={index}>
                                          {strength.reason} (+{strength.points} points)
                                          <ul className="list-disc list-inside ml-4">
                                            {strength["experience list"].map((exp, expIndex) => (
                                              <li key={expIndex}>{exp}</li>
                                            ))}
                                          </ul>
                                        </li>
                                      ))}
                                    </ul>
                                  </AlertDescription>
                                </Alert>
                              )}

                              {match.lagBehindReasons && match.lagBehindReasons.length > 0 && (
                                <Alert variant="destructive">
                                  <AlertCircle className="h-4 w-4" />
                                  <AlertTitle>Match Score Lag Report</AlertTitle>
                                  <AlertDescription>
                                    <ul className="list-disc list-inside space-y-1">
                                      {match.lagBehindReasons.map((reason, index) => (
                                        <li key={index}>
                                          {reason.reason} ({-reason.points} points)
                                          <ul className="list-disc list-inside ml-4">
                                            <li>Gaps: {reason.gaps}</li>
                                          </ul>
                                        </li>
                                      ))}
                                    </ul>
                                  </AlertDescription>
                                </Alert>
                              )}
                            </>
                          )}

                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleGenerateQuestions(candidate)}
                              disabled={questionsMutation.isPending}
                              data-testid={`button-generate-questions-${candidate.id}`}
                            >
                              {questionsMutation.isPending
                                ? "Generating..."
                                : "Generate Interview Questions"}
                            </Button>
                          </div>

                          {questions && (
                            <div className="mt-4 space-y-3">
                              <h4 className="font-medium">
                                AI-Generated Interview Questions
                              </h4>
                              <div className="grid gap-3">
                                <div>
                                  <h5 className="text-sm font-medium text-blue-600">
                                    Technical Questions
                                  </h5>
                                  <ul className="text-sm mt-1 space-y-1">
                                    {questions.technical.map((q, i) => (
                                      <li
                                        key={i}
                                        className="border-l-2 border-blue-200 pl-2"
                                      >
                                        {q}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <h5 className="text-sm font-medium text-purple-600">
                                    Behavioral Questions
                                  </h5>
                                  <ul className="text-sm mt-1 space-y-1">
                                    {questions.behavioral.map((q, i) => (
                                      <li
                                        key={i}
                                        className="border-l-2 border-purple-200 pl-2"
                                      >
                                        {q}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <h5 className="text-sm font-medium text-green-600">
                                    Role-Specific Questions
                                  </h5>
                                  <ul className="text-sm mt-1 space-y-1">
                                    {questions.jobSpecific.map((q, i) => (
                                      <li
                                        key={i}
                                        className="border-l-2 border-green-200 pl-2"
                                      >
                                        {q}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 4: Success */}
            {currentStep === "added" && (
              <Card data-testid="card-success">
                <CardContent className="text-center py-12">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-green-700 dark:text-green-400 mb-2">
                    Candidates Successfully Added!
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">
                    You have successfully added {selectedCandidates.length}
                    candidate(s) to the database.
                  </p>
                  <Button
                    onClick={() => {
                      setCurrentStep("upload");
                      setExtractedCandidates([]);
                      setMatchResults([]);
                      setSelectedJobId("");
                      setShowQuestions({});
                      setSelectedFiles(null);
                      setSelectedCandidates([]); // Clear the selection
                    }}
                    data-testid="button-upload-more"
                  >
                    Upload More Resumes
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      );
    }
