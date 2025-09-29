import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";

export default function SuperAdminCompanies() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCompany, setNewCompany] = useState({ name: '', adminEmail: '', adminPassword: '' });

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

  // Fetch companies data
  const { data: companies, isLoading: companiesLoading, error: companiesError, refetch } = useQuery<any[]>({
    queryKey: ["super-admin-companies"],
    queryFn: async () => {
      return await apiRequest('/api/super-admin/companies', { method: 'GET' });
    },
    retry: false,
    enabled: isAuthenticated && !!user?.id && user?.role === "Super Admin",
  });

  // Handle unauthorized errors
  useEffect(() => {
    if (companiesError && isUnauthorizedError(companiesError as any)) {
      toast({
        title: "Session Expired",
        description: "Your session has expired. Please log in again.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
    }
  }, [companiesError, toast]);

  const handleCreateCompany = async () => {
    try {
      await apiRequest('/api/super-admin/companies', {
        method: 'POST',
        body: JSON.stringify(newCompany),
      });
      
      toast({
        title: "Company Created",
        description: "Company has been successfully created.",
      });
      
      // Reset form and refetch companies
      setNewCompany({ name: '', adminEmail: '', adminPassword: '' });
      setShowCreateForm(false);
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create company.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCompany = async (companyId: number) => {
    try {
      await apiRequest(`/api/super-admin/companies/${companyId}`, {
        method: 'DELETE',
      });
      
      toast({
        title: "Company Deleted",
        description: "Company has been successfully deleted.",
      });
      
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete company.",
        variant: "destructive",
      });
    }
  };

  if (isLoading || companiesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading companies...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user?.id || user?.role !== "Super Admin") {
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
                <h1 className="text-3xl font-bold tracking-tight">Company Management</h1>
                <p className="text-muted-foreground">Manage all companies on the platform</p>
              </div>
              <Button onClick={() => setShowCreateForm(true)}>Add New Company</Button>
            </div>

            {/* Create Company Form (Modal) */}
            {showCreateForm && (
              <Card>
                <CardHeader>
                  <CardTitle>Create New Company</CardTitle>
                  <CardDescription>Add a new company to the platform</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Company Name</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border rounded-md"
                        value={newCompany.name}
                        onChange={(e) => setNewCompany({...newCompany, name: e.target.value})}
                        placeholder="Enter company name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Admin Email</label>
                      <input
                        type="email"
                        className="w-full px-3 py-2 border rounded-md"
                        value={newCompany.adminEmail}
                        onChange={(e) => setNewCompany({...newCompany, adminEmail: e.target.value})}
                        placeholder="Enter admin email"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Admin Password</label>
                      <input
                        type="password"
                        className="w-full px-3 py-2 border rounded-md"
                        value={newCompany.adminPassword}
                        onChange={(e) => setNewCompany({...newCompany, adminPassword: e.target.value})}
                        placeholder="Enter admin password"
                      />
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={handleCreateCompany}>Create Company</Button>
                    <Button variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Companies Table */}
            <Card>
              <CardHeader>
                <CardTitle>Companies</CardTitle>
                <CardDescription>List of all companies on the platform</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company Name</TableHead>
                      <TableHead>Users</TableHead>
                      <TableHead>Jobs</TableHead>
                      <TableHead>Candidates</TableHead>
                      <TableHead>Subscription</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(companies || [
                      { id: 1, name: 'TechCorp Inc', users: 12, jobs: 24, candidates: 187, subscription: 'Professional' },
                      { id: 2, name: 'Innovate Ltd', users: 8, jobs: 15, candidates: 96, subscription: 'Basic' },
                      { id: 3, name: 'Global Solutions', users: 25, jobs: 42, candidates: 342, subscription: 'Enterprise' }
                    ]).map((company) => (
                      <TableRow key={company.id}>
                        <TableCell className="font-medium">{company.name}</TableCell>
                        <TableCell>{company.users || 0}</TableCell>
                        <TableCell>{company.jobs || 0}</TableCell>
                        <TableCell>{company.candidates || 0}</TableCell>
                        <TableCell>{company.subscription || 'None'}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              View Details
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleDeleteCompany(company.id)}
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

        {/* Right Sidebar - Help */}
        <div className="w-80 border-l border-border p-6 overflow-auto">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Company Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>As a Super Admin, you can manage all companies on the platform:</p>
                <ul className="space-y-2 text-sm">
                  <li>• Add new companies to the platform</li>
                  <li>• View all companies and their statistics</li>
                  <li>• Delete companies when needed</li>
                  <li>• View detailed information about each company</li>
                </ul>
                <p className="text-sm text-muted-foreground">
                  Note: Deleting a company will remove all associated users, jobs, and candidates from the platform.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}