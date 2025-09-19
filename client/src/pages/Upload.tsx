"use client";

import { useState, ChangeEvent, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Upload as UploadIcon,
  FileText,
  Brain,
  CheckCircle,
  AlertCircle,
  Users,
  Loader2,
  MessageSquare,
  X,
} from "lucide-react";

interface ExtractedCandidate {
  id: string;
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
  total_experience: string;
  summary: string;
}

interface JobMatch {
  candidateId: string;
  candidate_name: string;
  candidate_email: string;
  match_percentage: number;
  strengths: string[];
  areas_for_improvement: string[];
}

interface InterviewQuestions {
  technical: string[];
  behavioral: string[];
  jobSpecific: string[];
}

// Add new interface for the candidate data to be added to database
interface CandidateToAdd {
  id: string;
  name: string;
  email: string;
  skills: string[];
  experience: number;
  matchPercentage: number;
  jobTitle: string;
  jobId: string;
  hrHandlingUserId: string;
  status: string;
  reportLink: string | null;
  interviewLink: string | null;
}

type UploadStep = "upload" | "extracted" | "matched" | "added";

export default function Upload() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState<UploadStep>("upload");
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [extractedCandidates, setExtractedCandidates] = useState<ExtractedCandidate[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [matchResults, setMatchResults] = useState<JobMatch[]>([]);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set());
  const [showInterviewQuestions, setShowInterviewQuestions] = useState<{[key: string]: InterviewQuestions}>({});
  const [isQuestionsDialogOpen, setIsQuestionsDialogOpen] = useState(false);
  const [selectedCandidateForQuestions, setSelectedCandidateForQuestions] = useState<string | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch available jobs
  const { data: allJobs = [], isLoading: jobsLoading } = useQuery<any[]>({
    queryKey: ["/api/jobs"],
  });

  // Filter jobs to show only those handled by the logged-in user
  // In development mode, show all jobs for the company
  const jobs = process.env.NODE_ENV === 'development' 
    ? allJobs 
    : allJobs.filter(job => job.hrHandlingUserId === user?.id);

  // Client-side file parsing function
  const parseFileContent = async (file: File): Promise<string> => {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          if (fileExtension === 'pdf') {
            // For PDF files, we'll use pdf-parse library
            const arrayBuffer = e.target?.result as ArrayBuffer;
            
            // Dynamically import pdf-parse to avoid server-side issues
            const pdf = await import('pdf-parse');
            try {
              // Convert ArrayBuffer to Buffer for pdf-parse
              const buffer = Buffer.from(arrayBuffer);
              const data = await pdf.default(buffer);
              resolve(data.text);
            } catch (parseError) {
              reject(new Error(`Failed to parse PDF: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`));
            }
          } else if (fileExtension === 'docx') {
            // For DOCX files, we'll use mammoth library
            const arrayBuffer = e.target?.result as ArrayBuffer;
            
            // Dynamically import mammoth to avoid server-side issues
            const mammoth = await import('mammoth');
            try {
              const result = await mammoth.default.extractRawText({ arrayBuffer });
              resolve(result.value);
            } catch (parseError) {
              reject(new Error(`Failed to parse DOCX: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`));
            }
          } else if (fileExtension === 'txt') {
            // For TXT files, we can parse directly
            const content = e.target?.result as string;
            resolve(content);
          } else {
            reject(new Error(`Unsupported file type: ${fileExtension}`));
          }
        } catch (error) {
          reject(new Error(`Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      if (fileExtension === 'pdf' || fileExtension === 'docx') {
        // For binary files, read as array buffer
        reader.readAsArrayBuffer(file);
      } else {
        // For text files, read as text
        reader.readAsText(file);
      }
    });
  };

  // Client-side candidate extraction function using AI
  const extractCandidateData = async (text: string, filename: string): Promise<ExtractedCandidate> => {
    try {
      // Send the text to the backend AI service for processing
      const response = await apiRequest("/api/ai/extract-resume", {
        method: "POST",
        body: { 
          resumeText: text,
          filename: filename
        },
      });
      
      // Validate and return the extracted data
      if (!response || !response.name) {
        throw new Error('Failed to extract candidate data from resume');
      }
      
      return {
        id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: response.name || 'Unknown Candidate',
        email: response.email || '',
        portfolio_link: Array.isArray(response.portfolio_link) ? response.portfolio_link : [],
        skills: Array.isArray(response.skills) ? response.skills : [],
        experience: Array.isArray(response.experience) ? response.experience : [],
        total_experience: response.total_experience || '',
        summary: response.summary || 'No summary available'
      };
    } catch (error) {
      console.error("Error extracting candidate data:", error);
      throw new Error(`Failed to extract candidate data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Step 1: Upload and extract data
  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const extractedCandidates: ExtractedCandidate[] = [];
      const processingErrors: string[] = [];

      // Process each file individually
      for (const file of files) {
        try {
          // Parse the file content
          const content = await parseFileContent(file);
          
          if (!content || content.trim().length < 50) {
            throw new Error(`Insufficient text content extracted from ${file.name}`);
          }
          
          // Extract candidate data using AI
          const candidateData = await extractCandidateData(content, file.name);
          extractedCandidates.push({
            ...candidateData,
            id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          });
        } catch (error) {
          const errorMessage = `Error processing file ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          processingErrors.push(errorMessage);
          console.error(errorMessage);
        }
      }

      return {
        candidates: extractedCandidates,
        errors: processingErrors,
        message: processingErrors.length > 0 
          ? `Processed ${extractedCandidates.length} of ${files.length} files successfully`
          : `Extracted data from ${extractedCandidates.length} resumes`
      };
    },
    onSuccess: (data) => {
      // Check if we have candidates in the response
      const candidatesArray = data.candidates || [];
      const candidatesWithIds = candidatesArray.map((candidate: any, index: number) => ({
        ...candidate,
        id: candidate.id || `temp_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
      }));
      
      setExtractedCandidates(candidatesWithIds);
      setCurrentStep("extracted");
      
      // Show appropriate message based on number of candidates extracted
      if (candidatesWithIds.length > 0) {
        toast({
          title: "Success",
          description: data.message || `Extracted data from ${candidatesWithIds.length} resumes`,
        });
      } else {
        toast({
          title: "Extraction Failed",
          description: "Files uploaded but no candidate data was extracted. Please check file formats and content.",
          variant: "destructive",
        });
      }
      
      // Show any processing errors as warnings
      if (data.errors && data.errors.length > 0) {
        data.errors.forEach(error => {
          toast({
            title: "Warning",
            description: error,
            variant: "destructive",
          });
        });
      }
    },
    onError: (error: any) => {
      // Log more detailed error information
      const errorMessage = error.message || error.toString() || "Failed to process resumes. Please try again.";
      
      // Check if it's a network error
      if (error instanceof TypeError && error.message.includes('fetch')) {
        toast({
          title: "Network Error",
          description: "Unable to connect to the server. Please check your internet connection.",
          variant: "destructive",
        });
      } else if (error.message && (error.message.includes('not supported') || error.message.includes('Vercel serverless functions') || error.message.includes('deployment environment'))) {
        // Handle Vercel environment limitation
        toast({
          title: "Feature Limited in Deployment Environment",
          description: "Full resume processing requires local development environment. Please run 'npm run dev' locally for complete functionality.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: `Failed to process resumes: ${errorMessage}`,
          variant: "destructive",
        });
      }
    },
  });

  // Step 2: Analyze and match candidates
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
      // Ensure we have matches data
      if (!data || !data.matches || !Array.isArray(data.matches)) {
        toast({
          title: "Error",
          description: "Invalid match data received from server",
          variant: "destructive",
        });
        return;
      }
      
      // Process matches to ensure proper candidate ID matching
      const matchesWithIds = data.matches.map((match: any) => {
        // Find the corresponding candidate by id
        const candidate = extractedCandidates.find(c => c.id === match.candidateId);
        
        // Ensure we have all required fields
        return {
          candidateId: match.candidateId || (candidate?.id || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`),
          candidate_name: match.candidate_name || candidate?.name || "Unknown",
          candidate_email: match.candidate_email || candidate?.email || "",
          match_percentage: match.match_percentage || 0,
          strengths: Array.isArray(match.strengths) ? match.strengths : [],
          areas_for_improvement: Array.isArray(match.areas_for_improvement) ? match.areas_for_improvement : []
        };
      });
      
      setMatchResults(matchesWithIds);
      setCurrentStep("matched");
      
      toast({
        title: "Success",
        description: `Matched ${matchesWithIds.length} candidates against job requirements`,
      });
    },
    onError: (error: any) => {
      // Log more detailed error information
      const errorMessage = error.message || error.toString() || "Failed to match candidates";
      
      // Check if it's a network error
      if (error instanceof TypeError && error.message.includes('fetch')) {
        toast({
          title: "Network Error",
          description: "Unable to connect to the server. Please check your internet connection.",
          variant: "destructive",
        });
      } else if (error.message && (error.message.includes('not supported') || error.message.includes('Vercel serverless functions') || error.message.includes('deployment environment'))) {
        // Handle Vercel environment limitation
        toast({
          title: "Feature Limited in Deployment Environment",
          description: "Full resume processing requires local development environment. Please run 'npm run dev' locally for complete functionality.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: `Failed to match candidates: ${errorMessage}`,
          variant: "destructive",
        });
      }
    },
  });

  // Interview questions generation
  const questionsMutation = useMutation({
    mutationFn: async (candidateId: string) => {
      const candidate = extractedCandidates.find(c => c.id === candidateId);
      if (!candidate) {
        throw new Error("Candidate not found");
      }

      return apiRequest("/api/ai/generate-questions", {
        method: "POST",
        body: { candidate, jobId: parseInt(selectedJobId) },
      });
    },
    onSuccess: (data, candidateId) => {
      // Validate the response data
      if (!data || !data.questions) {
        toast({
          title: "Error",
          description: "Invalid interview questions data received from server",
          variant: "destructive",
        });
        return;
      }
      
      // Ensure all question categories are properly structured
      const validatedQuestions = {
        technical: Array.isArray(data.questions.technical) ? data.questions.technical : [],
        behavioral: Array.isArray(data.questions.behavioral) ? data.questions.behavioral : [],
        jobSpecific: Array.isArray(data.questions.jobSpecific) ? data.questions.jobSpecific : []
      };
      
      setShowInterviewQuestions(prev => ({
        ...prev,
        [candidateId]: validatedQuestions,
      }));
      setSelectedCandidateForQuestions(candidateId);
      setIsQuestionsDialogOpen(true);
    },
    onError: (error: any) => {
      // Log more detailed error information
      const errorMessage = error.message || error.toString() || "Failed to generate interview questions";
      
      // Check if it's a network error
      if (error instanceof TypeError && error.message.includes('fetch')) {
        toast({
          title: "Network Error",
          description: "Unable to connect to the server. Please check your internet connection.",
          variant: "destructive",
        });
      } else if (error.message && (error.message.includes('not supported') || error.message.includes('Vercel serverless functions') || error.message.includes('deployment environment'))) {
        // Handle Vercel environment limitation
        toast({
          title: "Feature Limited in Deployment Environment",
          description: "Full resume processing requires local development environment. Please run 'npm run dev' locally for complete functionality.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: `Failed to generate interview questions: ${errorMessage}`,
          variant: "destructive",
        });
      }
    },
  });

  // Step 3: Add selected candidates to database
  const addCandidatesMutation = useMutation({
    mutationFn: async (selectedIds: string[]) => {
      const selectedData = selectedIds.map(id => {
        const candidate = extractedCandidates.find(c => c.id === id);
        const match = matchResults.find(m => m.candidateId === id);
        const selectedJob = jobs.find((job: any) => job.id.toString() === selectedJobId);
        
        if (!candidate || !match) {
          throw new Error(`Missing data for candidate ${id}`);
        }

        // Calculate total years of experience from the experience array
        const totalExperience = candidate.experience.reduce((total, job) => {
          const durationMatch = job.duration.match(/(\d+)/);
          return total + (durationMatch ? parseInt(durationMatch[1]) : 0);
        }, 0);

        return {
          id: candidate.id,
          name: match.candidate_name || candidate.name,
          email: match.candidate_email || candidate.email,
          skills: candidate.skills,
          experience: totalExperience,
          matchPercentage: match.match_percentage,
          jobTitle: selectedJob?.jobTitle || "",
          jobId: selectedJobId,
          hrHandlingUserId: user?.id || "",
          status: "resume_reviewed",
          reportLink: null,
          interviewLink: null,
        };
      });

      return apiRequest("/api/candidates/add", {
        method: "POST",
        body: { candidates: selectedData, jobId: selectedJobId },
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
      // Log more detailed error information
      const errorMessage = error.message || error.toString() || "Failed to add candidates";
      
      // Check if it's a network error
      if (error instanceof TypeError && error.message.includes('fetch')) {
        toast({
          title: "Network Error",
          description: "Unable to connect to the server. Please check your internet connection.",
          variant: "destructive",
        });
      } else if (error.message && (error.message.includes('not supported') || error.message.includes('Vercel serverless functions') || error.message.includes('deployment environment'))) {
        // Handle Vercel environment limitation
        toast({
          title: "Feature Limited in Deployment Environment",
          description: "Full resume processing requires local development environment. Please run 'npm run dev' locally for complete functionality.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: `Failed to add candidates: ${errorMessage}`,
          variant: "destructive",
        });
      }
    },
  });

  // Event handlers
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(e.target.files);
  };

  const handleUploadAndExtract = () => {
    if (selectedFiles && selectedFiles.length > 0) {
      const files = Array.from(selectedFiles);
      
      // Validate file types before upload
      const validFiles = files.filter(file => {
        const extension = file.name.split('.').pop()?.toLowerCase();
        return ['pdf', 'docx', 'txt'].includes(extension || '');
      });
      
      if (validFiles.length !== files.length) {
        toast({
          title: "Warning",
          description: `${files.length - validFiles.length} invalid files were filtered out. Only PDF, DOCX, and TXT files are supported.`,
        });
      }
      
      if (validFiles.length > 0) {
        uploadMutation.mutate(validFiles);
      } else {
        toast({
          title: "Error",
          description: "No valid files to upload. Please select PDF, DOCX, or TXT files.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Error",
        description: "Please select at least one file to upload",
        variant: "destructive",
      });
    }
  };

  const handleAnalyzeAndMatch = () => {
    if (!selectedJobId) {
      toast({
        title: "Error",
        description: "Please select a job role first",
        variant: "destructive",
      });
      return;
    }

    if (extractedCandidates.length === 0) {
      toast({
        title: "Error",
        description: "No candidates to analyze",
        variant: "destructive",
      });
      return;
    }

    // Validate that all candidates have proper IDs
    const validCandidates = extractedCandidates.filter(candidate => candidate.id);
    if (validCandidates.length !== extractedCandidates.length) {
      toast({
        title: "Warning",
        description: "Some candidates are missing proper IDs. This may affect matching.",
        variant: "destructive",
      });
    }

    matchMutation.mutate({
      candidates: validCandidates,
      jobId: selectedJobId,
    });
  };

  const handleAddSelected = () => {
    if (selectedCandidateIds.size === 0) {
      toast({
        title: "Error",
        description: "Please select at least one candidate",
        variant: "destructive",
      });
      return;
    }

    addCandidatesMutation.mutate(Array.from(selectedCandidateIds));
  };

  const toggleCandidateSelection = (candidateId: string) => {
    const newSelection = new Set(selectedCandidateIds);
    if (newSelection.has(candidateId)) {
      newSelection.delete(candidateId);
    } else {
      newSelection.add(candidateId);
    }
    setSelectedCandidateIds(newSelection);
  };

  const resetFlow = () => {
    setCurrentStep("upload");
    setSelectedFiles(null);
    setExtractedCandidates([]);
    setSelectedJobId("");
    setMatchResults([]);
    setSelectedCandidateIds(new Set());
    setShowInterviewQuestions({});
    setIsQuestionsDialogOpen(false);
    setSelectedCandidateForQuestions(null);
  };

  const handleGenerateQuestions = (candidateId: string) => {
    if (!selectedJobId) {
      toast({
        title: "Error",
        description: "Job role is required to generate questions",
        variant: "destructive",
      });
      return;
    }
    questionsMutation.mutate(candidateId);
  };

  // Helper function to format experience for display
  const formatExperience = (experience: ExtractedCandidate['experience']) => {
    return experience.map((job, index) => (
      <div key={index} className="mb-2">
        <div className="font-semibold">{job.job_title} at {job.company}</div>
        <div className="text-sm text-muted-foreground">{job.duration}</div>
        <ul className="list-disc list-inside text-sm mt-1">
          {job.projects.map((project, projIndex) => (
            <li key={projIndex}>{project}</li>
          ))}
        </ul>
      </div>
    ));
  };

  // Helper function to format strengths for display
  const formatStrengths = (strengths: string[]) => {
    return (
      <ul className="list-disc list-inside text-sm">
        {strengths.slice(0, 5).map((strength, index) => (
          <li key={index}>{strength}</li>
        ))}
      </ul>
    );
  };

  // Helper function to format areas for improvement for display
  const formatAreasForImprovement = (areas: string[]) => {
    return (
      <ul className="list-disc list-inside text-sm">
        {areas.slice(0, 5).map((area, index) => (
          <li key={index}>{area}</li>
        ))}
      </ul>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Resume Upload & Analysis</h1>
        <p className="text-muted-foreground">
          Upload resumes, analyze candidate data, and match with job requirements
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex justify-center space-x-4 mb-8">
        <div className={`flex items-center space-x-2 ${currentStep === "upload" ? "text-primary" : currentStep === "extracted" || currentStep === "matched" || currentStep === "added" ? "text-green-600" : "text-muted-foreground"}`}>
          <UploadIcon className="w-5 h-5" />
          <span>Upload & Extract</span>
        </div>
        <div className={`flex items-center space-x-2 ${currentStep === "extracted" ? "text-primary" : currentStep === "matched" || currentStep === "added" ? "text-green-600" : "text-muted-foreground"}`}>
          <Brain className="w-5 h-5" />
          <span>Analyze & Match</span>
        </div>
        <div className={`flex items-center space-x-2 ${currentStep === "matched" ? "text-primary" : currentStep === "added" ? "text-green-600" : "text-muted-foreground"}`}>
          <Users className="w-5 h-5" />
          <span>Select & Add</span>
        </div>
      </div>

      {/* Step 1: Upload and Extract */}
      {currentStep === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UploadIcon className="w-5 h-5" />
              Step 1: Upload Resume Files
            </CardTitle>
            <CardDescription>
              Select PDF or DOCX resume files to extract candidate data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Input
                  type="file"
                  multiple
                  accept=".pdf,.docx,.txt"
                  onChange={handleFileChange}
                  className="mb-4"
                  data-testid="input-resume-files"
                />
                {selectedFiles && (
                  <div className="text-sm text-muted-foreground">
                    Selected {selectedFiles.length} file(s)
                  </div>
                )}
              </div>
              <Button
                onClick={handleUploadAndExtract}
                disabled={uploadMutation.isPending}
                className="w-full"
                data-testid="button-upload-extract"
              >
                {uploadMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Upload and Extract Data
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Show Extracted Candidates */}
      {currentStep === "extracted" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Step 2: Extracted Candidates
            </CardTitle>
            <CardDescription>
              Review extracted candidate data and select job role for analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Job Selection */}
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Select Job Role</label>
                  <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                    <SelectTrigger data-testid="select-job-role">
                      <SelectValue placeholder="Choose a job role..." />
                    </SelectTrigger>
                    <SelectContent>
                      {jobs.map((job: any) => (
                        <SelectItem key={job.id} value={job.id.toString()}>
                          {job.jobTitle}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="pb-1">
                  <Button 
                    onClick={handleAnalyzeAndMatch} 
                    disabled={!selectedJobId || matchMutation.isPending}
                    data-testid="button-analyze-match"
                  >
                    {matchMutation.isPending && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Analyze & Match
                  </Button>
                </div>
              </div>

              {/* Results Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Select</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Skills</TableHead>
                      <TableHead>Experience</TableHead>
                      <TableHead>Summary</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {extractedCandidates.map((candidate) => (
                      <TableRow key={candidate.id} data-testid={`candidate-row-${candidate.id}`}>
                        <TableCell>
                          <Checkbox
                            checked={selectedCandidateIds.has(candidate.id)}
                            onCheckedChange={() => toggleCandidateSelection(candidate.id)}
                            data-testid={`checkbox-select-${candidate.id}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{candidate.name}</TableCell>
                        <TableCell>{candidate.email}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {candidate.skills.map((skill, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-md">
                            {formatExperience(candidate.experience)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-md text-sm">
                            {candidate.summary}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {extractedCandidates.length === 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No candidates extracted</AlertTitle>
                  <AlertDescription>
                    Upload resume files to extract candidate data.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Show Match Results */}
      {currentStep === "matched" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Step 3: Match Results
            </CardTitle>
            <CardDescription>
              Review candidate matches and select candidates to add
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Match Results Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Select</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="w-32">Match %</TableHead>
                      <TableHead>Strengths</TableHead>
                      <TableHead>Areas for Improvement</TableHead>
                      <TableHead className="w-32">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matchResults.map((match) => {
                      const candidate = extractedCandidates.find(c => c.id === match.candidateId);
                      return (
                        <TableRow key={match.candidateId} data-testid={`match-row-${match.candidateId}`}>
                          <TableCell>
                            <Checkbox
                              checked={selectedCandidateIds.has(match.candidateId)}
                              onCheckedChange={() => toggleCandidateSelection(match.candidateId)}
                              data-testid={`checkbox-select-match-${match.candidateId}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{match.candidate_name}</TableCell>
                          <TableCell>{match.candidate_email}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={match.match_percentage >= 80 ? "default" : match.match_percentage >= 60 ? "secondary" : "destructive"}
                              className="text-xs"
                            >
                              {match.match_percentage}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {formatStrengths(match.strengths)}
                          </TableCell>
                          <TableCell>
                            {formatAreasForImprovement(match.areas_for_improvement)}
                          </TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleGenerateQuestions(match.candidateId)}
                                  disabled={questionsMutation.isPending}
                                  data-testid={`button-interview-questions-${match.candidateId}`}
                                >
                                  <MessageSquare className="w-4 h-4 mr-1" />
                                  Questions
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Interview Questions for {match.candidate_name}</DialogTitle>
                                  <DialogDescription>
                                    Generated based on candidate profile and job requirements
                                  </DialogDescription>
                                </DialogHeader>
                                {showInterviewQuestions[match.candidateId] ? (
                                  <div className="space-y-6">
                                    <div>
                                      <h3 className="text-lg font-semibold mb-2">Technical Questions</h3>
                                      <ul className="list-decimal list-inside space-y-2">
                                        {showInterviewQuestions[match.candidateId].technical.map((question, index) => (
                                          <li key={index}>{question}</li>
                                        ))}
                                      </ul>
                                    </div>
                                    <div>
                                      <h3 className="text-lg font-semibold mb-2">Behavioral Questions</h3>
                                      <ul className="list-decimal list-inside space-y-2">
                                        {showInterviewQuestions[match.candidateId].behavioral.map((question, index) => (
                                          <li key={index}>{question}</li>
                                        ))}
                                      </ul>
                                    </div>
                                    <div>
                                      <h3 className="text-lg font-semibold mb-2">Job-Specific Questions</h3>
                                      <ul className="list-decimal list-inside space-y-2">
                                        {showInterviewQuestions[match.candidateId].jobSpecific.map((question, index) => (
                                          <li key={index}>{question}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex justify-center items-center h-24">
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center">
                <Button variant="outline" onClick={resetFlow}>
                  <X className="w-4 h-4 mr-2" />
                  Reset
                </Button>
                <Button 
                  onClick={handleAddSelected}
                  disabled={selectedCandidateIds.size === 0 || addCandidatesMutation.isPending}
                  data-testid="button-add-selected"
                >
                  {addCandidatesMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Add Selected Candidates
                </Button>
              </div>

              {matchResults.length === 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No matches found</AlertTitle>
                  <AlertDescription>
                    Analyze candidates against a job role to see match results.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Success Message */}
      {currentStep === "added" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Success!
            </CardTitle>
            <CardDescription>
              Selected candidates have been added to the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>
                  {selectedCandidateIds.size} candidate(s) have been successfully added to the candidates list.
                </AlertDescription>
              </Alert>
              <div className="flex justify-center">
                <Button onClick={resetFlow} data-testid="button-reset-flow">
                  Process More Resumes
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}