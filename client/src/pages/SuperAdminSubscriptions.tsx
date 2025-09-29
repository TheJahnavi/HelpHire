import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";

export default function SuperAdminSubscriptions() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

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

  // Fetch subscription plans
  const { data: plans, isLoading: plansLoading, error: plansError } = useQuery<any[]>({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      return await apiRequest('/api/super-admin/subscription-plans', { method: 'GET' });
    },
    retry: false,
    enabled: isAuthenticated && !!user?.id && user?.role === "Super Admin",
  });

  // Fetch company subscriptions
  const { data: companySubscriptions, isLoading: subscriptionsLoading, error: subscriptionsError } = useQuery<any[]>({
    queryKey: ["company-subscriptions"],
    queryFn: async () => {
      return await apiRequest('/api/super-admin/company-subscriptions', { method: 'GET' });
    },
    retry: false,
    enabled: isAuthenticated && !!user?.id && user?.role === "Super Admin",
  });

  // Handle unauthorized errors
  useEffect(() => {
    if ((plansError || subscriptionsError) && 
        (isUnauthorizedError(plansError as any) || isUnauthorizedError(subscriptionsError as any))) {
      toast({
        title: "Session Expired",
        description: "Your session has expired. Please log in again.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
    }
  }, [plansError, subscriptionsError, toast]);

  if (isLoading || plansLoading || subscriptionsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading subscription data...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user?.id || user?.role !== "Super Admin") {
    return null;
  }

  const handleCreatePlan = () => {
    // In a real implementation, this would open a modal to create a new plan
    toast({
      title: "Create New Plan",
      description: "Opening plan creation form...",
    });
    // Simulate opening a form
    setTimeout(() => {
      alert("In a real implementation, this would open a form to create a new subscription plan");
    }, 1000);
  };

  const handleEditPlan = (planId: string) => {
    // In a real implementation, this would open a modal to edit the plan
    toast({
      title: "Edit Plan",
      description: "Opening plan edit form...",
    });
    // Simulate opening a form
    setTimeout(() => {
      alert(`In a real implementation, this would open a form to edit plan ${planId}`);
    }, 1000);
  };

  const handleDeletePlan = (planId: string) => {
    // In a real implementation, this would delete the plan
    toast({
      title: "Delete Plan",
      description: "Deleting subscription plan...",
    });
    // Simulate deletion
    setTimeout(() => {
      alert(`In a real implementation, this would delete plan ${planId}`);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen pt-16">
        {/* Main Content */}
        <div className="flex-1 p-6 pr-80 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Subscription Management</h1>
                <p className="text-muted-foreground">Manage subscription plans and company subscriptions</p>
              </div>
              <Button onClick={handleCreatePlan}>Create New Plan</Button>
            </div>

            {/* Subscription Plans Section */}
            <Card>
              <CardHeader>
                <CardTitle>Subscription Plans</CardTitle>
                <CardDescription>Manage available subscription plans</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plan Name</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Features</TableHead>
                      <TableHead>Companies</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(plans || [
                      { id: '1', name: 'Basic', price: 49, features: 'Up to 50 jobs, 5 HR users', companyCount: 25 },
                      { id: '2', name: 'Professional', price: 99, features: 'Up to 200 jobs, 20 HR users', companyCount: 15 },
                      { id: '3', name: 'Enterprise', price: 'Custom', features: 'Unlimited jobs, Unlimited HR users', companyCount: 8 }
                    ]).map((plan) => (
                      <TableRow key={plan.id}>
                        <TableCell className="font-medium">{plan.name}</TableCell>
                        <TableCell>${plan.price}/month</TableCell>
                        <TableCell>{plan.features}</TableCell>
                        <TableCell>{plan.companyCount} companies</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => handleEditPlan(plan.id)}>
                              Edit
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDeletePlan(plan.id)}>
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

            {/* Company Subscriptions Section */}
            <Card>
              <CardHeader>
                <CardTitle>Company Subscriptions</CardTitle>
                <CardDescription>View all company subscriptions</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Renewal Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(companySubscriptions || [
                      { id: '1', company: 'TechCorp Inc', plan: 'Professional', price: 99, renewalDate: '2023-12-15', status: 'Active' },
                      { id: '2', company: 'Innovate Ltd', plan: 'Basic', price: 49, renewalDate: '2023-11-30', status: 'Active' },
                      { id: '3', company: 'Global Solutions', plan: 'Enterprise', price: 'Custom', renewalDate: '2024-01-20', status: 'Active' }
                    ]).map((subscription) => (
                      <TableRow key={subscription.id}>
                        <TableCell className="font-medium">{subscription.company}</TableCell>
                        <TableCell>{subscription.plan}</TableCell>
                        <TableCell>${subscription.price}/month</TableCell>
                        <TableCell>{new Date(subscription.renewalDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            subscription.status === 'Active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {subscription.status}
                          </span>
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
                <CardTitle>Subscription Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>As a Super Admin, you can manage subscription plans and view all company subscriptions.</p>
                <ul className="space-y-2 text-sm">
                  <li>• Create new subscription plans</li>
                  <li>• Edit existing plans</li>
                  <li>• Delete unused plans</li>
                  <li>• View all company subscriptions</li>
                  <li>• Monitor renewal dates</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}