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
      years: number;
    }[];
  };
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
  name: string;
  matchPercentage: number;
  "percentage match summary": string;
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
  years: z.number(),
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
  name: z.string(),
  matchPercentage: z.number().min(0).max(100),
  "percentage match summary": z.string(),
  strengthsBehindReasons: z.array(strengthsBehindReasonSchema),
  lagBehindReasons: z.array(lagBehindReasonSchema),
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

  // Mutation to handle file upload and AI data extraction
  const uploadMutation = useMutation({
    mutationFn: async ({ files, jobId }: { files: File[]; jobId: string }) => {
      if (!jobId) {
        throw new Error("Please select a job role first");
      }
      
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("resumes", file);
      });

      // Upload resumes and extract data
      const extractResult = await apiRequest("/api/upload/resumes", {
        method: "POST",
        body: formData,
      });

      // Automatically trigger matching after extraction
      const matchResult = await apiRequest("/api/ai/match-candidates", {
        method: "POST",
        body: JSON.stringify({
          candidates: extractResult.candidates,
          jobId: jobId,
        }),
        headers: { "Content-Type": "application/json" },
      });

      return { ...extractResult, matches: matchResult.matches };
    },
    onSuccess: (data) => {
      const candidatesWithIds = data.candidates.map((candidate: any, index: number) => ({
        ...candidate,
        id: candidate.id || `temp_${Date.now()}_${index}`,
      }));
      
      setExtractedCandidates(candidatesWithIds);
      setMatchResults(data.matches.map((match: any, index: number) => ({
        ...match,
        candidateId: candidatesWithIds[index]?.id || `temp_${Date.now()}_${index}`,
      })));
      setCurrentStep("matched");
      
      toast({
        title: "Success",
        description: `Extracted and matched ${data.candidates.length} candidates`,
      });
    },
    onError: (error: any) => {
      console.error("Upload error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to process resumes. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Legacy match mutation (keeping for backward compatibility)
  const matchMutation = useMutation({
    mutationFn: async ({
      candidates,
      jobId,
    }: {
      candidates: ExtractedCandidate[];
      jobId: string;
    }) => {
      return apiRequest("/api/ai/match-candidates", {
        method: "POST",
        body: { candidates, jobId },
      });
    },
    onSuccess: (data) => {
      const matchesWithIds = data.matches.map((match: any, index: number) => ({
        ...match,
        candidateId: extractedCandidates[index]?.id || `temp_${Date.now()}_${index}`,
      }));
      
      setMatchResults(matchesWithIds);
      setCurrentStep("matched");
      
      toast({
        title: "Success",
        description: `Matched ${data.matches.length} candidates against job requirements`,
      });
    },
    onError: (error: any) => {
      console.error("Match error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to match candidates",
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
    mutationFn: async (selectedCandidateIds: string[]) => {
      const selectedData = selectedCandidateIds.map(id => {
        const candidate = extractedCandidates.find(c => c.id === id);
        const match = matchResults.find(m => m.candidateId === id);
        
        if (!candidate || !match) {
          throw new Error(`Missing data for candidate ${id}`);
        }

        const candidateData = {
          candidate_name: candidate.name,
          email: candidate.email,
          job_id: parseInt(selectedJobId),
          candidate_skills: candidate.skills,
          candidate_experience: candidate.experience,
          match_percentage: match.matchPercentage,
          status: "resume_reviewed",
          hr_handling_user_id: "hr-001", // Current user
          report_link: "",
          interview_link: "",
        };

        // Debug logging
        console.log("Final candidate data for submission:", candidateData);
        
        return candidateData;
      });

      return apiRequest("/api/candidates", {
        method: "POST",
        body: JSON.stringify({ candidates: selectedData }),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      setCurrentStep("added");
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      toast({
        title: "Success",
        description: "Selected candidates have been added to the system",
      });
    },
    onError: (error: any) => {
      console.error("Add candidates error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add candidates",
        variant: "destructive",
      });
    },
  });

  // Event handlers
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(e.target.files);
  };

  const handleUpload = () => {
    if (selectedFiles && selectedFiles.length > 0 && selectedJobId) {
      const files = Array.from(selectedFiles);
      uploadMutation.mutate({ files, jobId: selectedJobId });
    } else {
      toast({
        title: "Error",
        description: "Please select both files and a job role before uploading",
        variant: "destructive",
      });
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
    if (selectedCandidates.length > 0) {
      addCandidatesMutation.mutate(selectedCandidates);
    } else {
      toast({
        title: "Error",
        description: "Please select at least one candidate to add",
        variant: "destructive",
      });
    }
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

              {/* Job Selection */}
              <div className="space-y-2">
                <label htmlFor="job-select" className="text-sm font-medium">
                  Select Job Role:
                </label>
                <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                  <SelectTrigger
                    id="job-select"
                    className="w-full"
                    data-testid="select-job-role"
                  >
                    <SelectValue placeholder="Choose a job role" />
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
              </div>

              <Button
                onClick={handleUpload}
                disabled={!selectedFiles || !selectedJobId || uploadMutation.isPending}
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
                            - {project.name} ({project.years} years):{" "}
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
                                <AlertDescription>{match["percentage match summary"]}</AlertDescription>
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
