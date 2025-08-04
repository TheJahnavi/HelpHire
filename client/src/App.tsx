import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import HRDashboard from "@/pages/HRDashboard";
import Jobs from "@/pages/Jobs";
import Candidates from "@/pages/Candidates";
import Upload from "@/pages/Upload";
import Profile from "@/pages/Profile";
import Notifications from "@/pages/Notifications";
import Layout from "@/components/Layout";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={HRDashboard} />
          <Route path="/hr/dashboard" component={HRDashboard} />
          <Route path="/hr/jobs" component={Jobs} />
          <Route path="/hr/candidates" component={Candidates} />
          <Route path="/hr/upload" component={Upload} />
          <Route path="/hr/profile" component={Profile} />
          <Route path="/hr/notifications" component={Notifications} />
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
