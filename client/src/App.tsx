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
import Jobs from "@/pages/Jobs";
import Candidates from "@/pages/Candidates";
import Upload from "@/pages/Upload";
import Profile from "@/pages/Profile";
import NotificationsPage from "@/pages/NotificationsPage";
import Layout from "@/components/Layout";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          {/* Role-based dashboard routing */}
          {user?.role === "Super Admin" && (
            <Route path="/super-admin/dashboard" component={HRDashboard} />
          )}
          {user?.role === "Company Admin" && (
            <Route path="/company-admin/dashboard" component={HRDashboard} />
          )}
          
          {/* HR routes */}
          <Route path="/" component={HRDashboard} />
          <Route path="/hr/dashboard" component={HRDashboard} />
          <Route path="/hr/jobs" component={Jobs} />
          <Route path="/hr/candidates" component={Candidates} />
          <Route path="/hr/upload" component={Upload} />
          <Route path="/hr/profile" component={Profile} />
          <Route path="/hr/notifications" component={NotificationsPage} />
        </>
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
