import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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

interface EditCandidateModalProps {
  candidate?: any;
  onClose: () => void;
}

export default function EditCandidateModal({ candidate, onClose }: EditCandidateModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    candidateName: candidate?.candidateName || "",
    email: candidate?.email || "",
    jobId: candidate?.jobId || null,
    candidateExperience: candidate?.candidateExperience || "",
    candidateSkills: candidate?.candidateSkills || [],
    status: candidate?.status || "applied",
    matchPercentage: candidate?.matchPercentage || 0,
    resumeUrl: candidate?.resumeUrl || "",
    interviewLink: candidate?.interviewLink || "",
    technicalPersonEmail: candidate?.technicalPersonEmail || ""
  });

  const [newSkill, setNewSkill] = useState("");
  const [newStatus, setNewStatus] = useState(candidate?.status || "applied");

  const { data: jobs = [] } = useQuery<any[]>({
    queryKey: ["/api/jobs"],
    retry: false,
  });

  const updateCandidateMutation = useMutation({
    mutationFn: async (candidateData: any) => {
      return await apiRequest(`/api/candidates/${candidate.id}`, { 
        method: "PUT", 
        body: candidateData
      });
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
          window.location.href = "/api/login";
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
      candidateSkills: prev.candidateSkills.filter((skill: string) => skill !== skillToRemove)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.candidateName.trim()) {
      toast({
        title: "Validation Error",
        description: "Full name is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.email.trim()) {
      toast({
        title: "Validation Error",
        description: "Email address is required",
        variant: "destructive",
      });
      return;
    }

    const submitData = {
      ...formData,
      status: newStatus,
      candidateExperience: typeof formData.candidateExperience === 'object' 
        ? JSON.stringify(formData.candidateExperience) 
        : formData.candidateExperience
    };

    updateCandidateMutation.mutate(submitData);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSkill();
    }
  };

  const getJobTitle = (jobId: number) => {
    const job = jobs?.find((j: any) => j.id === jobId);
    return job?.jobTitle || 'Unknown Position';
  };

  const getStatusOptions = () => {
    const currentStatus = formData.status;
    const baseOptions = [
      { value: "applied", label: "Applied" },
      { value: "resume_reviewed", label: "Resume Reviewed" },
      { value: "interview_scheduled", label: "Interview Scheduled" },
      { value: "report_generated", label: "Report Generated" },
      { value: "hired", label: "Hired" },
      { value: "not_selected", label: "Not Selected" }
    ];

    // Show logical progression based on current status
    switch (currentStatus) {
      case "applied":
        return baseOptions.filter(opt => ["applied", "resume_reviewed", "not_selected"].includes(opt.value));
      case "resume_reviewed":
        return baseOptions.filter(opt => ["resume_reviewed", "interview_scheduled", "not_selected"].includes(opt.value));
      case "interview_scheduled":
        return baseOptions.filter(opt => ["interview_scheduled", "report_generated", "not_selected"].includes(opt.value));
      case "report_generated":
        return baseOptions.filter(opt => ["report_generated", "hired", "not_selected"].includes(opt.value));
      default:
        return baseOptions;
    }
  };

  const formatExperience = (experience: any) => {
    if (typeof experience === 'string') {
      try {
        const parsed = JSON.parse(experience);
        return `${parsed.years || 0} years`;
      } catch {
        return experience;
      }
    }
    return experience?.years ? `${experience.years} years` : "0 years";
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto" data-testid="edit-candidate-modal">
        <DialogHeader>
          <DialogTitle data-testid="modal-title">
            Edit Candidate
          </DialogTitle>
          <DialogDescription>
            Update candidate status and information for {candidate?.candidateName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="candidateName">Full Name *</Label>
              <Input
                id="candidateName"
                placeholder="Enter candidate's full name"
                value={formData.candidateName}
                onChange={(e) => handleInputChange("candidateName", e.target.value)}
                data-testid="input-candidate-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="candidate@example.com"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                data-testid="input-email"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="jobPosition">Job Position *</Label>
              <Select value={formData.jobId?.toString() || ""} onValueChange={(value) => handleInputChange("jobId", parseInt(value))}>
                <SelectTrigger data-testid="select-job-position">
                  <SelectValue placeholder="Select a job position" />
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

            <div className="space-y-2">
              <Label htmlFor="experience">Candidates Experience *</Label>
              <Input
                id="experience"
                placeholder="e.g., 5 years"
                value={formatExperience(formData.candidateExperience)}
                onChange={(e) => handleInputChange("candidateExperience", e.target.value)}
                data-testid="input-experience"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Skills</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add a skill and press Enter"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyPress={handleKeyPress}
                data-testid="input-new-skill"
              />
              <Button type="button" onClick={addSkill} data-testid="button-add-skill">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.candidateSkills.map((skill: string, index: number) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {skill}
                  <X 
                    className="w-3 h-3 cursor-pointer hover:text-destructive" 
                    onClick={() => removeSkill(skill)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} disabled>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={formData.status}>
                    {formData.status.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="matchPercentage">Match Percentage</Label>
              <Input
                id="matchPercentage"
                placeholder="e.g., 85"
                value={formData.matchPercentage}
                disabled
                data-testid="input-match-percentage"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="resumeUrl">Resume Summary</Label>
              <Input
                id="resumeUrl"
                placeholder="https://example.com/resume..."
                value={formData.resumeUrl}
                onChange={(e) => handleInputChange("resumeUrl", e.target.value)}
                data-testid="input-resume-url"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newStatus">Status</Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger data-testid="select-new-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getStatusOptions().map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Conditional fields based on status */}
          {(newStatus === "interview_scheduled") && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="interviewLink">Interview Link</Label>
                <Input
                  id="interviewLink"
                  placeholder="https://meet.google.com/..."
                  value={formData.interviewLink}
                  onChange={(e) => handleInputChange("interviewLink", e.target.value)}
                  data-testid="input-interview-link"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="technicalPersonEmail">Technical Person Email</Label>
                <Input
                  id="technicalPersonEmail"
                  type="email"
                  placeholder="tech@company.com"
                  value={formData.technicalPersonEmail}
                  onChange={(e) => handleInputChange("technicalPersonEmail", e.target.value)}
                  data-testid="input-technical-email"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={updateCandidateMutation.isPending}
              data-testid="button-save-changes"
            >
              {updateCandidateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}