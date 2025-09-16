import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface AddCandidateModalProps {
  candidate?: any;
  onClose: () => void;
}

export default function AddCandidateModal({ candidate, onClose }: AddCandidateModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!candidate;

  const [formData, setFormData] = useState({
    candidateName: candidate?.candidateName || "",
    email: candidate?.email || "",
    jobId: candidate?.jobId?.toString() || "",
    candidateExperience: candidate?.candidateExperience || "",
    status: candidate?.status || "applied",
    resumeUrl: candidate?.resumeUrl || "",
    candidateSkills: candidate?.candidateSkills || [],
    matchPercentage: candidate?.matchPercentage || "",
    reportLink: candidate?.reportLink || "",
    interviewLink: candidate?.interviewLink || "",
  });

  const [newSkill, setNewSkill] = useState("");

  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ["/api/jobs"],
    retry: false,
  });

  const createCandidateMutation = useMutation({
    mutationFn: async (candidateData: any) => {
      const response = await apiRequest("POST", "/api/candidates", candidateData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      toast({
        title: "Success",
        description: "Candidate added successfully",
      });
      onClose();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to add candidate",
        variant: "destructive",
      });
    },
  });

  const updateCandidateMutation = useMutation({
    mutationFn: async (candidateData: any) => {
      const response = await apiRequest("PUT", `/api/candidates/${candidate.id}`, candidateData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      toast({
        title: "Success",
        description: "Candidate updated successfully",
      });
      onClose();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update candidate",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addSkill = () => {
    if (newSkill.trim() && !formData.candidateSkills.includes(newSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        candidateSkills: [...prev.candidateSkills, newSkill.trim()]
      }));
      setNewSkill("");
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      candidateSkills: prev.candidateSkills.filter(skill => skill !== skillToRemove)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.candidateName.trim()) {
      toast({
        title: "Validation Error",
        description: "Candidate name is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.email.trim()) {
      toast({
        title: "Validation Error",
        description: "Email is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.jobId) {
      toast({
        title: "Validation Error",
        description: "Job position is required",
        variant: "destructive",
      });
      return;
    }

    const submitData = {
      ...formData,
      jobId: parseInt(formData.jobId),
      matchPercentage: formData.matchPercentage ? parseFloat(formData.matchPercentage.toString()) : null,
    };

    if (isEditing) {
      updateCandidateMutation.mutate(submitData);
    } else {
      createCandidateMutation.mutate(submitData);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSkill();
    }
  };

  const getJobTitle = (jobId: string) => {
    const job = (jobs as any[])?.find((j: any) => j.id.toString() === jobId);
    return job?.jobTitle || "";
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto" data-testid="add-candidate-modal">
        <DialogHeader>
          <DialogTitle data-testid="modal-title">
            {isEditing ? "Edit Candidate" : "Add New Candidate"}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the candidate details below." : "Fill in the details to add a new candidate."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="candidateName">Full Name *</Label>
              <Input
                id="candidateName"
                value={formData.candidateName}
                onChange={(e) => handleInputChange("candidateName", e.target.value)}
                placeholder="Enter candidate's full name"
                required
                data-testid="candidate-name-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="candidate@example.com"
                required
                data-testid="email-input"
              />
            </div>
          </div>

          {/* Job Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="jobId">Job Position *</Label>
              <Select value={formData.jobId} onValueChange={(value) => handleInputChange("jobId", value)}>
                <SelectTrigger data-testid="job-select">
                  <SelectValue placeholder="Select a job position" />
                </SelectTrigger>
                <SelectContent>
                  {jobsLoading ? (
                    <SelectItem value="loading" disabled>Loading jobs...</SelectItem>
                  ) : (jobs as any[])?.length === 0 ? (
                    <SelectItem value="none" disabled>No jobs available</SelectItem>
                  ) : (
                    (jobs as any[])?.map((job: any) => (
                      <SelectItem key={job.id} value={job.id.toString()}>
                        {job.jobTitle}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="candidateExperience">Experience</Label>
              <Input
                id="candidateExperience"
                value={formData.candidateExperience}
                onChange={(e) => handleInputChange("candidateExperience", e.target.value)}
                placeholder="e.g., 5 years"
                data-testid="experience-input"
              />
            </div>
          </div>

          {/* Skills */}
          <div className="space-y-2">
            <Label>Skills</Label>
            <div className="flex space-x-2">
              <Input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Add a skill and press Enter"
                data-testid="skills-input"
              />
              <Button type="button" onClick={addSkill} data-testid="add-skill-button">
                Add
              </Button>
            </div>
            {formData.candidateSkills.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.candidateSkills.map((skill: string, index: number) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {skill}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeSkill(skill)}
                      data-testid={`remove-skill-${index}`}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Status and Matching */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
                <SelectTrigger data-testid="status-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="applied">Applied</SelectItem>
                  <SelectItem value="resume_reviewed">Resume Reviewed</SelectItem>
                  <SelectItem value="interview_scheduled">Interview Scheduled</SelectItem>
                  <SelectItem value="technical_round">Technical Round</SelectItem>
                  <SelectItem value="final_round">Final Round</SelectItem>
                  <SelectItem value="hired">Hired</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="matchPercentage">Match Percentage</Label>
              <Input
                id="matchPercentage"
                type="number"
                min="0"
                max="100"
                value={formData.matchPercentage}
                onChange={(e) => handleInputChange("matchPercentage", e.target.value)}
                placeholder="e.g., 85"
                data-testid="match-percentage-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="resumeUrl">Resume URL</Label>
              <Input
                id="resumeUrl"
                type="url"
                value={formData.resumeUrl}
                onChange={(e) => handleInputChange("resumeUrl", e.target.value)}
                placeholder="https://example.com/resume.pdf"
                data-testid="resume-url-input"
              />
            </div>
          </div>

          {/* Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reportLink">Report Link</Label>
              <Input
                id="reportLink"
                type="url"
                value={formData.reportLink}
                onChange={(e) => handleInputChange("reportLink", e.target.value)}
                placeholder="https://example.com/report.pdf"
                data-testid="report-link-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="interviewLink">Interview Link</Label>
              <Input
                id="interviewLink"
                type="url"
                value={formData.interviewLink}
                onChange={(e) => handleInputChange("interviewLink", e.target.value)}
                placeholder="https://meet.google.com/xyz"
                data-testid="interview-link-input"
              />
            </div>
          </div>

          <DialogFooter className="flex space-x-2">
            <Button type="button" variant="outline" onClick={onClose} data-testid="cancel-button">
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createCandidateMutation.isPending || updateCandidateMutation.isPending}
              data-testid="submit-button"
            >
              {isEditing ? "Update Candidate" : "Add Candidate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
