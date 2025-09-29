import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";  
import { ThemeProvider } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import HRDashboard from "@/pages/HRDashboard";
import CompanyAdminDashboard from "@/pages/CompanyAdminDashboard";
import SuperAdminDashboard from "@/pages/SuperAdminDashboard";
import CompanyAdminJobs from "@/pages/CompanyAdminJobs";
import CompanyAdminHRUsers from "@/pages/CompanyAdminHRUsers";
import CompanyAdminSubscription from "@/pages/CompanyAdminSubscription";
import SuperAdminCompanies from "@/pages/SuperAdminCompanies";
import SuperAdminUsers from "@/pages/SuperAdminUsers";
import SuperAdminSubscriptions from "@/pages/SuperAdminSubscriptions";
import Jobs from "@/pages/Jobs";
import Candidates from "@/pages/Candidates";
import Upload from "@/pages/Upload";
import Profile from "@/pages/Profile";
import NotificationsPage from "@/pages/NotificationsPage";
import InterviewSchedule from "@/pages/InterviewSchedule"; // New import
import Layout from "@/components/Layout";

// Test component to verify routing is working
function TestPage() {
  return (
    <div style={{ padding: "20px", textAlign: "center" }}>
      <h1>Test Page</h1>
      <p>If you can see this, routing is working correctly.</p>
    </div>
  );
}

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  return (
    <Switch>
      {/* Test route */}
      <Route path="/test" component={TestPage} />
      
      {/* Public routes - always accessible */}
      <Route path="/login" component={Login} />
      <Route path="/signin" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/interview/schedule" component={InterviewSchedule} /> {/* New public route */}
      
      {/* For unauthenticated users, show landing page for root path */}
      {!isAuthenticated && !isLoading && (
        <Route path="/" component={Landing} />
      )}
      
      {/* For authenticated users, show dashboard routes */}
      {isAuthenticated && !isLoading && (
        <>
          {/* Role-based dashboard routing - ORDER MATTERS! */}
          {user?.role === "Super Admin" && (
            <>
              <Route path="/super-admin/dashboard" component={SuperAdminDashboard} />
              <Route path="/super-admin/companies" component={SuperAdminCompanies} />
              <Route path="/super-admin/users" component={SuperAdminUsers} />
              <Route path="/super-admin/subscriptions" component={SuperAdminSubscriptions} />
              {/* Redirect root path to Super Admin dashboard */}
              <Route path="/" component={SuperAdminDashboard} />
            </>
          )}
          {user?.role === "Company Admin" && (
            <>
              <Route path="/company-admin/dashboard" component={CompanyAdminDashboard} />
              <Route path="/company-admin/jobs" component={CompanyAdminJobs} />
              <Route path="/company-admin/hr-users" component={CompanyAdminHRUsers} />
              <Route path="/company-admin/subscription" component={CompanyAdminSubscription} />
              {/* Redirect root path to Company Admin dashboard */}
              <Route path="/" component={CompanyAdminDashboard} />
            </>
          )}
          {user?.role === "HR" && (
            <>
              <Route path="/hr/dashboard" component={HRDashboard} />
              <Route path="/hr/jobs" component={Jobs} />
              <Route path="/hr/candidates" component={Candidates} />
              <Route path="/hr/upload" component={Upload} />
              <Route path="/hr/profile" component={Profile} />
              <Route path="/hr/notifications" component={NotificationsPage} />
              {/* Redirect root path to HR dashboard */}
              <Route path="/" component={HRDashboard} />
            </>
          )}
          
          {/* Shared admin routes */}
          <Route path="/profile" component={Profile} />
          <Route path="/notifications" component={NotificationsPage} />
        </>
      )}
      
      {/* Fallback routes */}
      {!isAuthenticated && !isLoading && (
        <Route component={Landing} />
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Layout>
            <Router />
          </Layout>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;