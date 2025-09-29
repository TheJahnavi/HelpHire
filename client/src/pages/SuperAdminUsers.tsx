import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";

export default function SuperAdminUsers() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'HR', companyId: '' });

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

  // Fetch users data
  const { data: users, isLoading: usersLoading, error: usersError, refetch } = useQuery<any[]>({
    queryKey: ["super-admin-users"],
    queryFn: async () => {
      return await apiRequest('/api/super-admin/users', { method: 'GET' });
    },
    retry: false,
    enabled: isAuthenticated && !!user?.id && user?.role === "Super Admin",
  });

  // Fetch companies for dropdown
  const { data: companies } = useQuery<any[]>({
    queryKey: ["super-admin-companies-dropdown"],
    queryFn: async () => {
      return await apiRequest('/api/super-admin/companies', { method: 'GET' });
    },
    retry: false,
    enabled: isAuthenticated && !!user?.id && user?.role === "Super Admin",
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
      await apiRequest('/api/super-admin/users', {
        method: 'POST',
        body: JSON.stringify(newUser),
      });
      
      toast({
        title: "User Created",
        description: "User has been successfully created.",
      });
      
      // Reset form and refetch users
      setNewUser({ name: '', email: '', role: 'HR', companyId: '' });
      setShowCreateForm(false);
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create user.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await apiRequest(`/api/super-admin/users/${userId}`, {
        method: 'DELETE',
      });
      
      toast({
        title: "User Deleted",
        description: "User has been successfully deleted.",
      });
      
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete user.",
        variant: "destructive",
      });
    }
  };

  if (isLoading || usersLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading users...</p>
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
                <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
                <p className="text-muted-foreground">Manage all users on the platform</p>
              </div>
              <Button onClick={() => setShowCreateForm(true)}>Add New User</Button>
            </div>

            {/* Create User Form (Modal) */}
            {showCreateForm && (
              <Card>
                <CardHeader>
                  <CardTitle>Create New User</CardTitle>
                  <CardDescription>Add a new user to the platform</CardDescription>
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
                      <label className="block text-sm font-medium mb-1">Role</label>
                      <select
                        className="w-full px-3 py-2 border rounded-md"
                        value={newUser.role}
                        onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                      >
                        <option value="HR">HR</option>
                        <option value="Company Admin">Company Admin</option>
                        <option value="Super Admin">Super Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Company</label>
                      <select
                        className="w-full px-3 py-2 border rounded-md"
                        value={newUser.companyId}
                        onChange={(e) => setNewUser({...newUser, companyId: e.target.value})}
                      >
                        <option value="">Select a company</option>
                        {(companies || []).map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={handleCreateUser}>Create User</Button>
                    <Button variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Users Table */}
            <Card>
              <CardHeader>
                <CardTitle>Users</CardTitle>
                <CardDescription>List of all users on the platform</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Jobs Handled</TableHead>
                      <TableHead>Candidates</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(users || [
                      { id: '1', name: 'John Smith', email: 'john.smith@techcorp.com', role: 'HR', company: 'TechCorp Inc', jobsHandled: 12, candidates: 87, status: 'Active' },
                      { id: '2', name: 'Sarah Johnson', email: 'sarah.johnson@techcorp.com', role: 'Company Admin', company: 'TechCorp Inc', jobsHandled: 0, candidates: 0, status: 'Active' },
                      { id: '3', name: 'Michael Brown', email: 'michael.brown@innovate.com', role: 'HR', company: 'Innovate Ltd', jobsHandled: 8, candidates: 64, status: 'Active' },
                      { id: '4', name: 'Admin User', email: 'admin@system.com', role: 'Super Admin', company: '', jobsHandled: 0, candidates: 0, status: 'Active' }
                    ]).map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.role}</TableCell>
                        <TableCell>{user.company || 'N/A'}</TableCell>
                        <TableCell>{user.jobsHandled || 0}</TableCell>
                        <TableCell>{user.candidates || 0}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            user.status === 'Active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {user.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              Edit
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleDeleteUser(user.id)}
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
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>As a Super Admin, you can manage all users on the platform:</p>
                <ul className="space-y-2 text-sm">
                  <li>• Add new users to any company</li>
                  <li>• Assign roles (HR, Company Admin, Super Admin)</li>
                  <li>• View all users and their statistics</li>
                  <li>• Edit or delete users when needed</li>
                </ul>
                <p className="text-sm text-muted-foreground">
                  Note: Be careful when assigning Super Admin roles as they have full access to the platform.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}