import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";

export default function CompanyAdminHRUsers() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '' });

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

  // Fetch HR users data
  const { data: hrUsers, isLoading: usersLoading, error: usersError, refetch } = useQuery<any[]>({
    queryKey: ["company-hr-users"],
    queryFn: async () => {
      return await apiRequest('/api/company-admin/hr-users', { method: 'GET' });
    },
    retry: false,
    enabled: isAuthenticated && !!user?.id && user?.role === "Company Admin",
  });

  // Handle unauthorized errors
  useEffect(() => {
    if (usersError && isUnauthorizedError(usersError as any)) {
      toast({
        title: "Session Expired",
        description: "Your session has expired. Please log in again.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
    }
  }, [usersError, toast]);

  const handleCreateUser = async () => {
    try {
      await apiRequest('/api/company-admin/hr-users', {
        method: 'POST',
        body: JSON.stringify(newUser),
      });
      
      toast({
        title: "User Created",
        description: "HR user has been successfully created.",
      });
      
      // Reset form and refetch users
      setNewUser({ name: '', email: '', password: '' });
      setShowCreateForm(false);
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create HR user.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await apiRequest(`/api/company-admin/hr-users/${userId}`, {
        method: 'DELETE',
      });
      
      toast({
        title: "User Deleted",
        description: "HR user has been successfully deleted.",
      });
      
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete HR user.",
        variant: "destructive",
      });
    }
  };

  if (isLoading || usersLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading HR users...</p>
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
                <h1 className="text-3xl font-bold tracking-tight">HR User Management</h1>
                <p className="text-muted-foreground">Manage HR users in your company</p>
              </div>
              <Button onClick={() => setShowCreateForm(true)}>Add New HR User</Button>
            </div>

            {/* Create User Form (Modal) */}
            {showCreateForm && (
              <Card>
                <CardHeader>
                  <CardTitle>Create New HR User</CardTitle>
                  <CardDescription>Add a new HR user to your company</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Name</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border rounded-md"
                        value={newUser.name}
                        onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                        placeholder="Enter user's name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Email</label>
                      <input
                        type="email"
                        className="w-full px-3 py-2 border rounded-md"
                        value={newUser.email}
                        onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                        placeholder="Enter user's email"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Password</label>
                      <input
                        type="password"
                        className="w-full px-3 py-2 border rounded-md"
                        value={newUser.password}
                        onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                        placeholder="Enter password"
                      />
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={handleCreateUser}>Create User</Button>
                    <Button variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* HR Users Table */}
            <Card>
              <CardHeader>
                <CardTitle>HR Users</CardTitle>
                <CardDescription>List of all HR users in your company</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Jobs Handled</TableHead>
                      <TableHead>Candidates</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(hrUsers || [
                      { id: '1', name: 'John Smith', email: 'john.smith@techcorp.com', jobsHandled: 12, candidates: 87, status: 'Active' },
                      { id: '2', name: 'Sarah Johnson', email: 'sarah.johnson@techcorp.com', jobsHandled: 8, candidates: 64, status: 'Active' },
                      { id: '3', name: 'Michael Brown', email: 'michael.brown@techcorp.com', jobsHandled: 5, candidates: 42, status: 'Active' }
                    ]).map((hrUser) => (
                      <TableRow key={hrUser.id}>
                        <TableCell className="font-medium">{hrUser.name}</TableCell>
                        <TableCell>{hrUser.email}</TableCell>
                        <TableCell>{hrUser.jobsHandled || 0}</TableCell>
                        <TableCell>{hrUser.candidates || 0}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            hrUser.status === 'Active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {hrUser.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleDeleteUser(hrUser.id)}
                          >
                            Delete
                          </Button>
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
                <CardTitle>HR User Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>As a Company Admin, you can manage HR users in your company:</p>
                <ul className="space-y-2 text-sm">
                  <li>• Add new HR users to your company</li>
                  <li>• View all HR users and their statistics</li>
                  <li>• Delete HR users when needed</li>
                </ul>
                <p className="text-sm text-muted-foreground">
                  Note: All HR users you create will be associated with your company and will have access to manage jobs and candidates within your organization.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}