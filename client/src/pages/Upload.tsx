import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload as UploadIcon, FileText, Brain, CheckCircle, AlertCircle, Users } from "lucide-react";

interface ExtractedCandidate {
  id: string;
  name: string;
  email: string;
  skills: string[];
  experience: string;
  projects: string[];
  summary: string;
}

interface JobMatch {
  candidateId: string;
  matchPercentage: number;
  summary: string;
  strengths: string[];
  gaps: string[];
}

interface InterviewQuestions {
  technical: string[];
  behavioral: string[];
  jobSpecific: string[];
}

export default function Upload() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [extractedCandidates, setExtractedCandidates] = useState<ExtractedCandidate[]>([]);
  const [matchResults, setMatchResults] = useState<JobMatch[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [showQuestions, setShowQuestions] = useState<{[key: string]: InterviewQuestions}>({});
  const [currentStep, setCurrentStep] = useState<'upload' | 'extracted' | 'matched' | 'added'>('upload');

  // Fetch available jobs
  const { data: jobs } = useQuery({
    queryKey: ['/api/jobs'],
  });

  // Upload and extract resumes
  const uploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('resumes', file);
      });
      return apiRequest('/api/upload/resumes', {
        method: 'POST',
        body: formData,
      });
    },
    onSuccess: (data) => {
      setExtractedCandidates(data.candidates);
      setCurrentStep('extracted');
      toast({
        title: "Success",
        description: `Extracted ${data.candidates.length} candidate profiles using AI`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to process resumes. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Match candidates to job
  const matchMutation = useMutation({
    mutationFn: async ({ candidates, jobId }: { candidates: ExtractedCandidate[], jobId: string }) => {
      return apiRequest('/api/ai/match-candidates', {
        method: 'POST',
        body: { candidates, jobId: parseInt(jobId) },
      });
    },
    onSuccess: (data) => {
      setMatchResults(data.matches);
      setCurrentStep('matched');
      toast({
        title: "AI Analysis Complete",
        description: "Candidates matched against job requirements",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to match candidates. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Generate interview questions
  const questionsMutation = useMutation({
    mutationFn: async ({ candidate, jobId }: { candidate: ExtractedCandidate, jobId: string }) => {
      return apiRequest('/api/ai/generate-questions', {
        method: 'POST',
        body: { candidate, jobId: parseInt(jobId) },
      });
    },
    onSuccess: (data, variables) => {
      setShowQuestions(prev => ({
        ...prev,
        [variables.candidate.id]: data.questions
      }));
      toast({
        title: "Interview Questions Generated",
        description: "AI-tailored questions ready for interview",
      });
    },
  });

  // Add candidates to database
  const addCandidatesMutation = useMutation({
    mutationFn: async () => {
      const candidatesWithMatches = extractedCandidates.map(candidate => {
        const match = matchResults.find(m => m.candidateId === candidate.id);
        return {
          ...candidate,
          matchPercentage: match?.matchPercentage || 0
        };
      });

      return apiRequest('/api/candidates/add', {
        method: 'POST',
        body: { 
          candidates: candidatesWithMatches, 
          jobId: selectedJobId 
        },
      });
    },
    onSuccess: (data) => {
      setCurrentStep('added');
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      toast({
        title: "Candidates Added",
        description: data.message,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add candidates to database",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(e.target.files);
  };

  const handleUpload = () => {
    if (selectedFiles && selectedFiles.length > 0) {
      uploadMutation.mutate(selectedFiles);
    }
  };

  const handleMatch = () => {
    if (selectedJobId && extractedCandidates.length > 0) {
      matchMutation.mutate({ candidates: extractedCandidates, jobId: selectedJobId });
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

  const getMatchColor = (percentage: number) => {
    if (percentage >= 80) return "bg-green-500";
    if (percentage >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

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
            Upload resumes and let AI extract candidate data, match skills, and generate interview questions
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center">
          <div className="flex items-center space-x-4">
            {[
              { step: 'upload', label: 'Upload', icon: UploadIcon },
              { step: 'extracted', label: 'Extract', icon: FileText },
              { step: 'matched', label: 'Match', icon: Brain },
              { step: 'added', label: 'Complete', icon: CheckCircle }
            ].map(({ step, label, icon: Icon }, index) => (
              <div key={step} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  currentStep === step || ['extracted', 'matched', 'added'].indexOf(currentStep) > ['upload', 'extracted', 'matched', 'added'].indexOf(step)
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="ml-2 text-sm font-medium">{label}</span>
                {index < 3 && <div className="ml-4 w-8 h-0.5 bg-gray-200" />}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: File Upload */}
        {currentStep === 'upload' && (
          <Card data-testid="card-upload">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UploadIcon className="h-5 w-5" />
                Upload Resume Files
              </CardTitle>
              <CardDescription>
                Select PDF or DOCX resume files for AI analysis. Multiple files supported.
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
                  <p className="text-sm text-gray-500">PDF or DOCX files up to 10MB each</p>
                </label>
              </div>

              {selectedFiles && (
                <div className="space-y-2">
                  <h4 className="font-medium">Selected Files:</h4>
                  {Array.from(selectedFiles).map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                      <span className="text-sm">{file.name}</span>
                      <Badge variant="secondary">{(file.size / 1024 / 1024).toFixed(2)} MB</Badge>
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
                {uploadMutation.isPending ? "Processing..." : "Upload & Extract Data"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Extracted Candidates */}
        {currentStep === 'extracted' && (
          <div className="space-y-6">
            <Card data-testid="card-job-selection">
              <CardHeader>
                <CardTitle>Select Job Position</CardTitle>
                <CardDescription>Choose which job to match candidates against</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                  <SelectTrigger data-testid="select-job">
                    <SelectValue placeholder="Select a job position" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobs?.map((job: any) => (
                      <SelectItem key={job.id} value={job.id.toString()}>
                        {job.jobTitle} - {job.jobLocation}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleMatch} 
                  disabled={!selectedJobId || matchMutation.isPending}
                  className="mt-4 w-full"
                  data-testid="button-match-candidates"
                >
                  {matchMutation.isPending ? "Analyzing Match..." : "Analyze Job Match"}
                </Button>
              </CardContent>
            </Card>

            {/* Extracted Candidates List */}
            <div className="grid gap-4">
              {extractedCandidates.map((candidate) => (
                <Card key={candidate.id} data-testid={`card-candidate-${candidate.id}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {candidate.name}
                      <Badge variant="outline">{candidate.email}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400">Skills</h4>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {candidate.skills.map((skill, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400">Experience</h4>
                      <p className="text-sm mt-1">{candidate.experience}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400">Summary</h4>
                      <p className="text-sm mt-1">{candidate.summary}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Matched Results */}
        {currentStep === 'matched' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">AI Matching Results</h2>
              <Button 
                onClick={handleAddCandidates}
                disabled={addCandidatesMutation.isPending}
                data-testid="button-add-candidates"
              >
                {addCandidatesMutation.isPending ? "Adding..." : "Add to Database"}
              </Button>
            </div>

            <div className="grid gap-4">
              {extractedCandidates.map((candidate) => {
                const match = matchResults.find(m => m.candidateId === candidate.id);
                const questions = showQuestions[candidate.id];
                
                return (
                  <Card key={candidate.id} data-testid={`card-match-${candidate.id}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        {candidate.name}
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <div className="text-2xl font-bold text-green-600">
                              {match?.matchPercentage || 0}%
                            </div>
                            <div className="text-xs text-gray-500">Match Score</div>
                          </div>
                          <div className={`w-2 h-8 rounded ${getMatchColor(match?.matchPercentage || 0)}`} />
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
                          
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-medium text-green-700 dark:text-green-400 mb-2">Strengths</h4>
                              <ul className="text-sm space-y-1">
                                {match.strengths.map((strength, index) => (
                                  <li key={index} className="flex items-center gap-2">
                                    <CheckCircle className="h-3 w-3 text-green-500" />
                                    {strength}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <h4 className="font-medium text-orange-700 dark:text-orange-400 mb-2">Areas to Explore</h4>
                              <ul className="text-sm space-y-1">
                                {match.gaps.map((gap, index) => (
                                  <li key={index} className="flex items-center gap-2">
                                    <AlertCircle className="h-3 w-3 text-orange-500" />
                                    {gap}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
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
                          {questionsMutation.isPending ? "Generating..." : "Generate Interview Questions"}
                        </Button>
                      </div>

                      {questions && (
                        <div className="mt-4 space-y-3">
                          <h4 className="font-medium">AI-Generated Interview Questions</h4>
                          <div className="grid gap-3">
                            <div>
                              <h5 className="text-sm font-medium text-blue-600">Technical Questions</h5>
                              <ul className="text-sm mt-1 space-y-1">
                                {questions.technical.map((q, i) => (
                                  <li key={i} className="border-l-2 border-blue-200 pl-2">{q}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <h5 className="text-sm font-medium text-purple-600">Behavioral Questions</h5>
                              <ul className="text-sm mt-1 space-y-1">
                                {questions.behavioral.map((q, i) => (
                                  <li key={i} className="border-l-2 border-purple-200 pl-2">{q}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <h5 className="text-sm font-medium text-green-600">Role-Specific Questions</h5>
                              <ul className="text-sm mt-1 space-y-1">
                                {questions.jobSpecific.map((q, i) => (
                                  <li key={i} className="border-l-2 border-green-200 pl-2">{q}</li>
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
        {currentStep === 'added' && (
          <Card data-testid="card-success">
            <CardContent className="text-center py-12">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-700 dark:text-green-400 mb-2">
                Candidates Successfully Added!
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                All candidates have been processed and added to the database with AI-generated insights.
              </p>
              <Button 
                onClick={() => {
                  setCurrentStep('upload');
                  setExtractedCandidates([]);
                  setMatchResults([]);
                  setSelectedJobId("");
                  setShowQuestions({});
                  setSelectedFiles(null);
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