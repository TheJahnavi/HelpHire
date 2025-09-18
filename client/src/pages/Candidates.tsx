import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, UserCheck, UserX, Upload, Edit, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AddCandidateModal from "@/components/AddCandidateModal";
import EditCandidateModal from "@/components/EditCandidateModal";
import { useLocation } from "wouter";

export default function Candidates() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [positionFilter, setPositionFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);

  // Parse query parameters from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hrParam = urlParams.get('hr');
    const statusParam = urlParams.get('status');
    
    if (statusParam) {
      setStatusFilter(statusParam);
    }
    
    // Note: We don't need to set hrFilter because the backend already filters by logged-in user
    // The hr parameter is just for consistency with dashboard redirection
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  const { data: candidates = [], isLoading: candidatesLoading } = useQuery<any[]>({
    queryKey: ["/api/candidates"],
    queryFn: async () => {
      return await apiRequest('/api/candidates', { method: 'GET' });
    },
    retry: false,
    enabled: isAuthenticated && !!user?.id,
  });

  const { data: jobs = [] } = useQuery<any[]>({
    queryKey: ["/api/jobs"],
    queryFn: async () => {
      return await apiRequest('/api/jobs', { method: 'GET' });
    },
    retry: false,
    enabled: isAuthenticated && !!user?.id,
  });

  // Status update mutation with proper validation
  const updateCandidateMutation = useMutation({
    mutationFn: async ({ id, status, interviewLink, technicalPersonEmail }: { id: number; status: string; interviewLink?: string; technicalPersonEmail?: string }) => {
      // Validate required fields based on status
      if (status === 'interview_scheduled' && (!interviewLink || !technicalPersonEmail)) {
        throw new Error("Interview link and technical person email are required when scheduling an interview");
      }
      
      return apiRequest(`/api/candidates/${id}`, { method: "PUT", body: { status, interviewLink, technicalPersonEmail } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      toast({
        title: "Success",
        description: "Candidate status updated successfully",
      });
    },
    onError: (error: any) => {
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
        description: error.message || "Failed to update candidate status",
        variant: "destructive",
      });
    },
  });

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingCandidate(null);
  };

  const handleEditCandidate = (candidate: any) => {
    setEditingCandidate(candidate);
  };

  const handleDeleteCandidate = (candidate: any) => {
    setSelectedCandidate(candidate);
    setShowDeleteDialog(true);
  };

  const deleteCandidateMutation = useMutation({
    mutationFn: async (candidateId: number) => {
      await apiRequest(`/api/candidates/${candidateId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      setShowDeleteDialog(false);
      setSelectedCandidate(null);
      toast({
        title: "Success",
        description: "Candidate deleted successfully",
      });
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
        description: "Failed to delete candidate",
        variant: "destructive",
      });
    },
  });

  const handleConfirmDelete = () => {
    if (selectedCandidate) {
      deleteCandidateMutation.mutate(selectedCandidate.id);
    }
  };

  // Get available status options based on current status
  const getAvailableStatusOptions = (currentStatus: string) => {
    switch (currentStatus?.toLowerCase()) {
      case 'resume_reviewed':
        return [
          { value: 'resume_reviewed', label: 'Resume Reviewed' },
          { value: 'interview_scheduled', label: 'Schedule Interview' }
        ];
      case 'interview_scheduled':
        return [
          { value: 'report_generated', label: 'Report Generated' }
        ];
      case 'report_generated':
        return [
          { value: 'hired', label: 'Hired' },
          { value: 'not_selected', label: 'Not Selected' }
        ];
      case 'hired':
      case 'not_selected':
        // No further transitions allowed
        return [
          { value: currentStatus, label: currentStatus === 'hired' ? 'Hired' : 'Not Selected' }
        ];
      default:
        return [
          { value: 'resume_reviewed', label: 'Resume Reviewed' }
        ];
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'resume_reviewed':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Resume Reviewed</Badge>;
      case 'interview_scheduled':
        return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">Interview Scheduled</Badge>;
      case 'report_generated':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Report Generated</Badge>;
      case 'hired':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Hired</Badge>;
      case 'not_selected':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Not Selected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getJobTitle = (jobId: number) => {
    const job = jobs?.find((j: any) => j.id === jobId);
    return job?.jobTitle || 'Unknown Position';
  };

  // Filter candidates to show only those handled by the logged-in user
  const filteredCandidates = candidates?.filter((candidate: any) => {
    const matchesSearch = candidate.candidateName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         candidate.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || candidate.status === statusFilter;
    const matchesPosition = positionFilter === "all" || candidate.jobId?.toString() === positionFilter;
    // Add filter for HR handling user
    const matchesHrUser = candidate.hrHandlingUserId === user?.id;
    
    return matchesSearch && matchesStatus && matchesPosition && matchesHrUser;
  }) || [];

  if (isLoading || !isAuthenticated) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header with enhanced styling */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3" data-testid="page-title">
              Candidates ({filteredCandidates.length})
            </h1>
            <p className="text-muted-foreground mt-1">Manage and review candidate applications</p>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild data-testid="upload-add-button">
              <a href="/hr/upload">
                <Plus className="mr-2 h-4 w-4" />
                Upload and Add
              </a>
            </Button>
          </div>
        </div>

        {/* Table Card */}
        <Card>
          {/* Table Controls */}
          <CardHeader className="border-b">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search candidates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 max-w-sm"
                  data-testid="search-input"
                />
              </div>
              
              {/* Filters */}
              <div className="flex space-x-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]" data-testid="status-filter">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="resume_reviewed">Resume Reviewed</SelectItem>
                    <SelectItem value="interview_scheduled">Interview Scheduled</SelectItem>
                    <SelectItem value="report_generated">Report Generated</SelectItem>
                    <SelectItem value="hired">Hired</SelectItem>
                    <SelectItem value="not_selected">Not Selected</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={positionFilter} onValueChange={setPositionFilter}>
                  <SelectTrigger className="w-[160px]" data-testid="position-filter">
                    <SelectValue placeholder="All Positions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Positions</SelectItem>
                    {jobs?.map((job: any) => (
                      <SelectItem key={job.id} value={job.id.toString()}>
                        {job.jobTitle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          {/* Candidates Table */}
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Job Position</TableHead>
                    <TableHead>Skills</TableHead>
                    <TableHead>Experience</TableHead>
                    <TableHead>Match %</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidatesLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        Loading candidates...
                      </TableCell>
                    </TableRow>
                  ) : filteredCandidates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No candidates found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCandidates.map((candidate: any) => (
                      <TableRow key={candidate.id} className="hover:bg-muted/50" data-testid={`candidate-row-${candidate.id}`}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback>
                                {candidate.candidateName?.charAt(0) || 'C'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-foreground">{candidate.candidateName}</div>
                              <div className="text-sm text-muted-foreground">{candidate.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-foreground">
                          {getJobTitle(candidate.jobId)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {candidate.candidateSkills?.join(', ') || 'No skills specified'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {candidate.candidateExperience || 'Not specified'}
                        </TableCell>
                        <TableCell>
                          {candidate.matchPercentage ? (
                            <div className="flex items-center space-x-2">
                              <span className={`text-sm font-medium ${
                                candidate.matchPercentage >= 80 ? 'text-green-600' :
                                candidate.matchPercentage >= 60 ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>
                                {Math.round(candidate.matchPercentage)}%
                              </span>
                              <Progress
                                value={candidate.matchPercentage}
                                className="w-16 h-2"
                              />
                            </div>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(candidate.status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditCandidate(candidate)}
                              className="text-blue-600 hover:text-blue-700"
                              data-testid={`edit-candidate-${candidate.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCandidate(candidate)}
                              className="text-red-600 hover:text-red-700"
                              data-testid={`delete-candidate-${candidate.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {filteredCandidates.length > 0 && (
              <div className="px-6 py-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing <span className="font-medium">1</span> to{" "}
                    <span className="font-medium">{Math.min(filteredCandidates.length, 10)}</span> of{" "}
                    <span className="font-medium">{filteredCandidates.length}</span> results
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" disabled>
                      Previous
                    </Button>
                    <Button variant="outline" size="sm" className="bg-primary text-primary-foreground">
                      1
                    </Button>
                    <Button variant="outline" size="sm" disabled>
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit Candidate Modal */}
        {showAddModal && (
          <AddCandidateModal
            candidate={editingCandidate}
            onClose={handleCloseModal}
          />
        )}

        {/* Edit Candidate Modal */}
        {editingCandidate && (
          <EditCandidateModal
            candidate={editingCandidate}
            onClose={() => setEditingCandidate(null)}
            availableStatusOptions={editingCandidate ? getAvailableStatusOptions(editingCandidate.status) : undefined}
          />
        )}

        {/* Delete Candidate Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Candidate</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {selectedCandidate?.candidateName}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleConfirmDelete}
                disabled={deleteCandidateMutation.isPending}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}