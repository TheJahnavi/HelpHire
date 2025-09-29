import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";

export default function CompanyAdminJobs() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingJob, setEditingJob] = useState<any>(null);
  const [jobForm, setJobForm] = useState({
    jobTitle: '',
    jobDescription: '',
    location: '',
    jobStatus: 'active'
  });

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

  // Fetch jobs data
  const { data: jobs, isLoading: jobsLoading, error: jobsError, refetch } = useQuery<any[]>({
    queryKey: ["company-jobs"],
    queryFn: async () => {
      return await apiRequest('/api/company-admin/jobs', { method: 'GET' });
    },
    retry: false,
    enabled: isAuthenticated && !!user?.id && user?.role === "Company Admin",
  });

  // Handle unauthorized errors
  useEffect(() => {
    if (jobsError && isUnauthorizedError(jobsError as any)) {
      toast({
        title: "Session Expired",
        description: "Your session has expired. Please log in again.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
    }
  }, [jobsError, toast]);

  const handleCreateJob = async () => {
    try {
      await apiRequest('/api/company-admin/jobs', {
        method: 'POST',
        body: JSON.stringify(jobForm),
      });
      
      toast({
        title: "Job Created",
        description: "Job has been successfully created.",
      });
      
      // Reset form and refetch jobs
      setJobForm({ jobTitle: '', jobDescription: '', location: '', jobStatus: 'active' });
      setShowCreateForm(false);
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create job.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateJob = async () => {
    try {
      await apiRequest(`/api/company-admin/jobs/${editingJob.id}`, {
        method: 'PUT',
        body: JSON.stringify(jobForm),
      });
      
      toast({
        title: "Job Updated",
        description: "Job has been successfully updated.",
      });
      
      // Reset form and refetch jobs
      setJobForm({ jobTitle: '', jobDescription: '', location: '', jobStatus: 'active' });
      setEditingJob(null);
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update job.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteJob = async (jobId: number) => {
    try {
      await apiRequest(`/api/company-admin/jobs/${jobId}`, {
        method: 'DELETE',
      });
      
      toast({
        title: "Job Deleted",
        description: "Job has been successfully deleted.",
      });
      
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete job.",
        variant: "destructive",
      });
    }
  };

  const openEditForm = (job: any) => {
    setEditingJob(job);
    setJobForm({
      jobTitle: job.jobTitle,
      jobDescription: job.jobDescription,
      location: job.location,
      jobStatus: job.jobStatus
    });
  };

  if (isLoading || jobsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading jobs...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user?.id || user?.role !== "Company Admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen pt-16">
        {/* Main Content */}
        <div className="flex-1 p-6 pr-80 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Job Management</h1>
                <p className="text-muted-foreground">Manage all job postings for your company</p>
              </div>
              <Button onClick={() => setShowCreateForm(true)}>Add New Job</Button>
            </div>

            {/* Create/Edit Job Form (Modal) */}
            {(showCreateForm || editingJob) && (
              <Card>
                <CardHeader>
                  <CardTitle>{editingJob ? "Edit Job" : "Create New Job"}</CardTitle>
                  <CardDescription>{editingJob ? "Update job details" : "Add a new job posting for your company"}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Job Title</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border rounded-md"
                        value={jobForm.jobTitle}
                        onChange={(e) => setJobForm({...jobForm, jobTitle: e.target.value})}
                        placeholder="Enter job title"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Location</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border rounded-md"
                        value={jobForm.location}
                        onChange={(e) => setJobForm({...jobForm, location: e.target.value})}
                        placeholder="Enter job location"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Status</label>
                      <select
                        className="w-full px-3 py-2 border rounded-md"
                        value={jobForm.jobStatus}
                        onChange={(e) => setJobForm({...jobForm, jobStatus: e.target.value})}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Job Description</label>
                    <textarea
                      className="w-full px-3 py-2 border rounded-md"
                      rows={4}
                      value={jobForm.jobDescription}
                      onChange={(e) => setJobForm({...jobForm, jobDescription: e.target.value})}
                      placeholder="Enter job description"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={editingJob ? handleUpdateJob : handleCreateJob}>
                      {editingJob ? "Update Job" : "Create Job"}
                    </Button>
                    <Button variant="outline" onClick={() => {
                      setShowCreateForm(false);
                      setEditingJob(null);
                      setJobForm({ jobTitle: '', jobDescription: '', location: '', jobStatus: 'active' });
                    }}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Jobs Table */}
            <Card>
              <CardHeader>
                <CardTitle>Jobs</CardTitle>
                <CardDescription>List of all job postings for your company</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job Title</TableHead>
                      <TableHead>Positions Opened</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Handled By</TableHead>
                      <TableHead>Posted Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(jobs || []).map((job) => (
                      <TableRow key={job.id}>
                        <TableCell className="font-medium">{job.jobTitle}</TableCell>
                        <TableCell>{job.positions || 0}</TableCell>
                        <TableCell>{job.location}</TableCell>
                        <TableCell>{job.handledBy || "N/A"}</TableCell>
                        <TableCell>{job.postedDate ? new Date(job.postedDate).toLocaleDateString() : "N/A"}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            job.jobStatus === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {job.jobStatus}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openEditForm(job)}
                            >
                              Edit
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => handleDeleteJob(job.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}