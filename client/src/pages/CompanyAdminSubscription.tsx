import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";

export default function CompanyAdminSubscription() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

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

  // Fetch subscription data
  const { data: subscription, isLoading: subscriptionLoading, error: subscriptionError } = useQuery<{
    planName: string;
    price: number;
    renewalDate: string;
    features: string[];
  }>({
    queryKey: ["company-subscription"],
    queryFn: async () => {
      return await apiRequest('/api/company/subscription', { method: 'GET' });
    },
    retry: false,
    enabled: isAuthenticated && !!user?.id && user?.role === "Company Admin",
  });

  // Handle unauthorized errors
  useEffect(() => {
    if (subscriptionError && isUnauthorizedError(subscriptionError as any)) {
      toast({
        title: "Session Expired",
        description: "Your session has expired. Please log in again.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
    }
  }, [subscriptionError, toast]);

  if (isLoading || subscriptionLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading subscription details...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user?.id || user?.role !== "Company Admin") {
    return null;
  }

  const handleUpgrade = () => {
    // In a real implementation, this would redirect to a payment gateway
    toast({
      title: "Upgrade Subscription",
      description: "Redirecting to payment gateway...",
    });
    // Simulate redirect to payment gateway
    setTimeout(() => {
      alert("In a real implementation, this would redirect to a payment gateway like Stripe");
    }, 1000);
  };

  const handleCancel = () => {
    // In a real implementation, this would cancel the subscription
    toast({
      title: "Cancel Subscription",
      description: "Subscription cancellation request submitted.",
    });
    // Simulate cancellation
    setTimeout(() => {
      alert("In a real implementation, this would cancel the subscription through the payment gateway");
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen pt-16">
        {/* Main Content */}
        <div className="flex-1 p-6 pr-80 overflow-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Subscription Management</h1>
                <p className="text-muted-foreground">Manage your company's subscription plan</p>
              </div>
            </div>

            {/* Subscription Card */}
            <Card>
              <CardHeader>
                <CardTitle>Current Subscription</CardTitle>
                <CardDescription>Details of your company's current plan</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold">Plan Name</h3>
                    <p className="text-2xl font-bold text-primary">{subscription?.planName || "Basic Plan"}</p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Price</h3>
                    <p className="text-2xl font-bold">${subscription?.price || "49"}/month</p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Renewal Date</h3>
                    <p className="text-2xl font-bold">
                      {subscription?.renewalDate 
                        ? new Date(subscription.renewalDate).toLocaleDateString() 
                        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Plan Features</h3>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {(subscription?.features || [
                      "Up to 50 job postings",
                      "Unlimited candidate applications",
                      "5 HR user accounts",
                      "Basic analytics",
                      "Email support"
                    ]).map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <span className="mr-2 text-primary">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-wrap gap-4 pt-4">
                  <Button onClick={handleUpgrade} size="lg">
                    Upgrade/Downgrade Plan
                  </Button>
                  <Button variant="outline" onClick={handleCancel} size="lg">
                    Cancel Subscription
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Plan Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Plan Comparison</CardTitle>
                <CardDescription>Compare our subscription plans</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Basic Plan */}
                  <Card className="border-primary">
                    <CardHeader>
                      <CardTitle>Basic</CardTitle>
                      <CardDescription>For small teams</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-3xl font-bold">$49<span className="text-lg font-normal">/month</span></div>
                      <ul className="space-y-2">
                        <li className="flex items-center"><span className="mr-2 text-primary">✓</span>Up to 50 job postings</li>
                        <li className="flex items-center"><span className="mr-2 text-primary">✓</span>Unlimited candidate applications</li>
                        <li className="flex items-center"><span className="mr-2 text-primary">✓</span>5 HR user accounts</li>
                        <li className="flex items-center"><span className="mr-2 text-primary">✓</span>Basic analytics</li>
                        <li className="flex items-center"><span className="mr-2 text-primary">✓</span>Email support</li>
                      </ul>
                      <Button className="w-full" variant="outline">Current Plan</Button>
                    </CardContent>
                  </Card>

                  {/* Professional Plan */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Professional</CardTitle>
                      <CardDescription>For growing companies</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-3xl font-bold">$99<span className="text-lg font-normal">/month</span></div>
                      <ul className="space-y-2">
                        <li className="flex items-center"><span className="mr-2 text-primary">✓</span>Up to 200 job postings</li>
                        <li className="flex items-center"><span className="mr-2 text-primary">✓</span>Unlimited candidate applications</li>
                        <li className="flex items-center"><span className="mr-2 text-primary">✓</span>20 HR user accounts</li>
                        <li className="flex items-center"><span className="mr-2 text-primary">✓</span>Advanced analytics</li>
                        <li className="flex items-center"><span className="mr-2 text-primary">✓</span>Priority email support</li>
                        <li className="flex items-center"><span className="mr-2 text-primary">✓</span>Custom branding</li>
                      </ul>
                      <Button className="w-full">Upgrade to Professional</Button>
                    </CardContent>
                  </Card>

                  {/* Enterprise Plan */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Enterprise</CardTitle>
                      <CardDescription>For large organizations</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-3xl font-bold">Custom</div>
                      <ul className="space-y-2">
                        <li className="flex items-center"><span className="mr-2 text-primary">✓</span>Unlimited job postings</li>
                        <li className="flex items-center"><span className="mr-2 text-primary">✓</span>Unlimited candidate applications</li>
                        <li className="flex items-center"><span className="mr-2 text-primary">✓</span>Unlimited HR user accounts</li>
                        <li className="flex items-center"><span className="mr-2 text-primary">✓</span>Advanced analytics & reporting</li>
                        <li className="flex items-center"><span className="mr-2 text-primary">✓</span>24/7 dedicated support</li>
                        <li className="flex items-center"><span className="mr-2 text-primary">✓</span>Custom branding & integrations</li>
                        <li className="flex items-center"><span className="mr-2 text-primary">✓</span>API access</li>
                      </ul>
                      <Button className="w-full">Contact Sales</Button>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Sidebar - Help */}
        <div className="w-80 border-l border-border p-6 overflow-auto">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Need Help?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>Contact our support team for assistance with your subscription.</p>
                <Button className="w-full">Contact Support</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}