import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CloudUpload, FileText, Search, Plus, Download, FileCheck, X } from "lucide-react";
import { useLocation } from "wouter";

interface ExtractedCandidate {
  filename: string;
  candidateName: string;
  email: string;
  skills: string[];
  experience: string;
  selected: boolean;
  matchPercentage?: number;
  reportUrl?: string;
}

export default function Upload() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [extractedCandidates, setExtractedCandidates] = useState<ExtractedCandidate[]>([]);
  const [matchedCandidates, setMatchedCandidates] = useState<ExtractedCandidate[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [matchingProgress, setMatchingProgress] = useState(0);
  const [showExtractedResults, setShowExtractedResults] = useState(false);
  const [showMatchedResults, setShowMatchedResults] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: jobs = [], isLoading: jobsLoading } = useQuery<any[]>({
    queryKey: ["/api/jobs"],
    retry: false,
  });

  const uploadResumesMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach(file => formData.append('resumes', file));
      
      const response = await fetch('/api/upload/resumes', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setExtractedCandidates(data.files.map((file: any) => ({
        ...file,
        selected: false,
      })));
      setShowExtractedResults(true);
      setIsExtracting(false);
      setExtractionProgress(100);
      toast({
        title: "Success",
        description: "Resume data extracted successfully",
      });
    },
    onError: (error) => {
      setIsExtracting(false);
      setExtractionProgress(0);
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to extract resume data",
        variant: "destructive",
      });
    },
  });

  const matchCandidatesMutation = useMutation({
    mutationFn: async ({ jobId, candidates }: { jobId: string; candidates: ExtractedCandidate[] }) => {
      const response = await apiRequest("POST", "/api/ai/match-candidates", {
        jobId,
        candidates: candidates.filter(c => c.selected),
      });
      return response.json();
    },
    onSuccess: (data) => {
      setMatchedCandidates(data.matchedCandidates.map((candidate: any) => ({
        ...candidate,
        selected: false,
      })));
      setShowMatchedResults(true);
      setIsMatching(false);
      setMatchingProgress(100);
      toast({
        title: "Success",
        description: "AI matching completed successfully",
      });
    },
    onError: (error) => {
      setIsMatching(false);
      setMatchingProgress(0);
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to match candidates",
        variant: "destructive",
      });
    },
  });

  const addCandidatesMutation = useMutation({
    mutationFn: async (candidates: ExtractedCandidate[]) => {
      const selectedCandidates = candidates.filter(c => c.selected);
      const job = jobs?.find((j: any) => j.id.toString() === selectedJobId);
      
      for (const candidate of selectedCandidates) {
        await apiRequest("POST", "/api/candidates", {
          candidateName: candidate.candidateName,
          email: candidate.email,
          jobId: parseInt(selectedJobId),
          candidateSkills: candidate.skills,
          candidateExperience: candidate.experience,
          matchPercentage: candidate.matchPercentage,
          reportLink: candidate.reportUrl,
          status: 'applied',
        });
      }
      
      return selectedCandidates;
    },
    onSuccess: (candidates) => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      toast({
        title: "Success",
        description: `${candidates.length} candidates added successfully`,
      });
      setLocation("/hr/candidates");
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to add candidates",
        variant: "destructive",
      });
    },
  });

  const selectedJob = jobs?.find((job: any) => job.id.toString() === selectedJobId);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => {
      const extension = file.name.toLowerCase().split('.').pop();
      return extension === 'pdf' || extension === 'docx';
    });

    if (validFiles.length !== files.length) {
      toast({
        title: "Invalid Files",
        description: "Only PDF and DOCX files are allowed",
        variant: "destructive",
      });
    }

    setUploadedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleExtractData = () => {
    if (uploadedFiles.length === 0) {
      toast({
        title: "No Files",
        description: "Please upload resume files first",
        variant: "destructive",
      });
      return;
    }

    setIsExtracting(true);
    setExtractionProgress(0);
    
    // Simulate progress
    const progressInterval = setInterval(() => {
      setExtractionProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 200);

    uploadResumesMutation.mutate(uploadedFiles);
  };

  const handleScanAndMatch = () => {
    if (!selectedJobId) {
      toast({
        title: "No Job Selected",
        description: "Please select a job position first",
        variant: "destructive",
      });
      return;
    }

    const selectedCandidates = extractedCandidates.filter(c => c.selected);
    if (selectedCandidates.length === 0) {
      toast({
        title: "No Candidates Selected",
        description: "Please select candidates to match",
        variant: "destructive",
      });
      return;
    }

    setIsMatching(true);
    setMatchingProgress(0);
    
    // Simulate progress
    const progressInterval = setInterval(() => {
      setMatchingProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 15;
      });
    }, 300);

    matchCandidatesMutation.mutate({
      jobId: selectedJobId,
      candidates: selectedCandidates,
    });
  };

  const handleAddSelectedCandidates = () => {
    const selectedCandidates = matchedCandidates.filter(c => c.selected);
    if (selectedCandidates.length === 0) {
      toast({
        title: "No Candidates Selected",
        description: "Please select candidates to add",
        variant: "destructive",
      });
      return;
    }

    addCandidatesMutation.mutate(selectedCandidates);
  };

  const toggleExtractedCandidate = (index: number) => {
    setExtractedCandidates(prev => 
      prev.map((candidate, i) => 
        i === index ? { ...candidate, selected: !candidate.selected } : candidate
      )
    );
  };

  const toggleMatchedCandidate = (index: number) => {
    setMatchedCandidates(prev => 
      prev.map((candidate, i) => 
        i === index ? { ...candidate, selected: !candidate.selected } : candidate
      )
    );
  };

  const toggleAllExtracted = (checked: boolean) => {
    setExtractedCandidates(prev => 
      prev.map(candidate => ({ ...candidate, selected: checked }))
    );
  };

  const toggleAllMatched = (checked: boolean) => {
    setMatchedCandidates(prev => 
      prev.map(candidate => ({ ...candidate, selected: checked }))
    );
  };

  if (isLoading || !isAuthenticated) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground" data-testid="page-title">
            Upload & Add Candidates
          </h1>
          <p className="text-muted-foreground mt-1">
            Upload resumes and let AI match them with job requirements
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Controls */}
          <div className="lg:col-span-1 space-y-6">
            {/* Job Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Select Job Position</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                  <SelectTrigger data-testid="job-selector">
                    <SelectValue placeholder="Select a job position..." />
                  </SelectTrigger>
                  <SelectContent>
                    {jobsLoading ? (
                      <SelectItem value="loading" disabled>Loading jobs...</SelectItem>
                    ) : jobs?.length === 0 ? (
                      <SelectItem value="none" disabled>No jobs available</SelectItem>
                    ) : (
                      jobs?.map((job: any) => (
                        <SelectItem key={job.id} value={job.id.toString()}>
                          {job.jobTitle}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                
                {/* Job Details Display */}
                {selectedJob && (
                  <Card className="bg-muted/50" data-testid="job-details">
                    <CardContent className="p-4">
                      <h4 className="font-medium text-foreground mb-2">{selectedJob.jobTitle}</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        <strong>Skills:</strong> {selectedJob.skills?.join(', ') || 'Not specified'}
                      </p>
                      <p className="text-sm text-muted-foreground mb-2">
                        <strong>Experience:</strong> {selectedJob.experience || 'Not specified'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedJob.jobDescription || 'No description available'}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>

            {/* Resume Upload */}
            <Card>
              <CardHeader>
                <CardTitle>Upload Resumes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div 
                  className="upload-zone rounded-lg p-8 text-center cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="upload-zone"
                >
                  <CloudUpload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-2">Drop resume files here or click to browse</p>
                  <p className="text-sm text-muted-foreground">Supports PDF and DOCX files</p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    accept=".pdf,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                    data-testid="file-input"
                  />
                </div>
                
                {/* Uploaded Files List */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-2" data-testid="uploaded-files">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center">
                          <FileText className="h-5 w-5 text-blue-500 mr-3" />
                          <span className="text-sm text-foreground">{file.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          data-testid={`remove-file-${index}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                <Button 
                  className="w-full" 
                  onClick={handleExtractData}
                  disabled={uploadedFiles.length === 0 || isExtracting}
                  data-testid="extract-data-button"
                >
                  {isExtracting ? (
                    <>
                      <FileCheck className="mr-2 h-4 w-4 animate-spin" />
                      Extracting Data...
                    </>
                  ) : (
                    <>
                      <FileCheck className="mr-2 h-4 w-4" />
                      Extract Data
                    </>
                  )}
                </Button>
                
                {isExtracting && (
                  <div className="space-y-2">
                    <Progress value={extractionProgress} className="w-full" />
                    <p className="text-sm text-muted-foreground text-center">
                      Extracting resume data... {extractionProgress}%
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <Button
                  className="w-full"
                  onClick={handleScanAndMatch}
                  disabled={!showExtractedResults || extractedCandidates.filter(c => c.selected).length === 0 || isMatching}
                  data-testid="scan-match-button"
                >
                  {isMatching ? (
                    <>
                      <Search className="mr-2 h-4 w-4 animate-spin" />
                      Scanning & Matching...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Scan and Match
                    </>
                  )}
                </Button>
                
                {isMatching && (
                  <div className="space-y-2">
                    <Progress value={matchingProgress} className="w-full" />
                    <p className="text-sm text-muted-foreground text-center">
                      AI matching in progress... {matchingProgress}%
                    </p>
                  </div>
                )}
                
                <Button
                  className="w-full"
                  variant="secondary"
                  onClick={handleAddSelectedCandidates}
                  disabled={!showMatchedResults || matchedCandidates.filter(c => c.selected).length === 0}
                  data-testid="add-candidates-button"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Selected Candidates
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Results Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Extraction Results */}
            {showExtractedResults && (
              <Card data-testid="extraction-results">
                <CardHeader className="border-b">
                  <CardTitle>Extracted Data</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Review and select candidates for matching
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={extractedCandidates.length > 0 && extractedCandidates.every(c => c.selected)}
                              onCheckedChange={toggleAllExtracted}
                              data-testid="select-all-extracted"
                            />
                          </TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Skills</TableHead>
                          <TableHead>Experience</TableHead>
                          <TableHead>Resume</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {extractedCandidates.map((candidate, index) => (
                          <TableRow key={index} data-testid={`extracted-candidate-${index}`}>
                            <TableCell>
                              <Checkbox
                                checked={candidate.selected}
                                onCheckedChange={() => toggleExtractedCandidate(index)}
                                data-testid={`select-extracted-${index}`}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{candidate.candidateName}</TableCell>
                            <TableCell>{candidate.email}</TableCell>
                            <TableCell>{candidate.skills.join(', ')}</TableCell>
                            <TableCell>{candidate.experience}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" data-testid={`download-resume-${index}`}>
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Matching Results */}
            {showMatchedResults && (
              <Card data-testid="matching-results">
                <CardHeader className="border-b">
                  <CardTitle>AI Matching Results</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Candidates ranked by compatibility with job requirements
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={matchedCandidates.length > 0 && matchedCandidates.every(c => c.selected)}
                              onCheckedChange={toggleAllMatched}
                              data-testid="select-all-matched"
                            />
                          </TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Skills</TableHead>
                          <TableHead>Experience</TableHead>
                          <TableHead>Match %</TableHead>
                          <TableHead>Report</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {matchedCandidates.map((candidate, index) => (
                          <TableRow key={index} data-testid={`matched-candidate-${index}`}>
                            <TableCell>
                              <Checkbox
                                checked={candidate.selected}
                                onCheckedChange={() => toggleMatchedCandidate(index)}
                                data-testid={`select-matched-${index}`}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{candidate.candidateName}</TableCell>
                            <TableCell>{candidate.email}</TableCell>
                            <TableCell>{candidate.skills.join(', ')}</TableCell>
                            <TableCell>{candidate.experience}</TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <span className={`text-sm font-medium ${
                                  (candidate.matchPercentage || 0) >= 80 ? 'text-green-600' :
                                  (candidate.matchPercentage || 0) >= 60 ? 'text-yellow-600' :
                                  'text-red-600'
                                }`}>
                                  {Math.round(candidate.matchPercentage || 0)}%
                                </span>
                                <Progress
                                  value={candidate.matchPercentage || 0}
                                  className="w-16 h-2"
                                />
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" data-testid={`view-report-${index}`}>
                                <FileText className="h-4 w-4 mr-1" />
                                View Report
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Empty State */}
            {!showExtractedResults && !showMatchedResults && (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <CloudUpload className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No Results Yet</h3>
                  <p className="text-muted-foreground text-center">
                    Upload resume files and extract data to see results here
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
