import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Briefcase, Clock, CheckSquare } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, FunnelChart, Funnel, LabelList } from "recharts";
import { Link } from "wouter";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

// Helper function to get stage colors
const getStageColor = (stage: string) => {
  const colors: Record<string, string> = {
    'Applied': '#8884d8',
    'Resume Reviewed': '#83a6ed',
    'Interview Scheduled': '#8dd1e1',
    'Technical Round': '#82ca9d',
    'Final Round': '#a4de6c',
    'Hired': '#ffc658',
    'Rejected': '#ff8042'
  };
  return colors[stage] || '#8884d8';
};

export default function HRDashboard() {
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

  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery<{
    jobStats: { total: number; active: number };
    candidateStats: Array<{ status: string; count: number }>;
    pipelineData: Array<{ stage: string; count: number }>;
    chartData: Array<{ month: string; opened: number; filled: number }>;
  }>({
    queryKey: ["/api/dashboard/stats"],
    retry: false,
    enabled: isAuthenticated, // Only fetch if authenticated
  });

  const { data: todos = [], isLoading: todosLoading, error: todosError } = useQuery<any[]>({
    queryKey: ["/api/todos"],
    retry: false,
    enabled: isAuthenticated, // Only fetch if authenticated
  });

  // Handle unauthorized errors
  useEffect(() => {
    if (statsError && isUnauthorizedError(statsError as any)) {
      toast({
        title: "Session Expired",
        description: "Your session has expired. Please log in again.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
    }
    
    if (todosError && isUnauthorizedError(todosError as any)) {
      toast({
        title: "Session Expired",
        description: "Your session has expired. Please log in again.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
    }
  }, [statsError, todosError, toast]);

  if (isLoading || statsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Prepare chart data
  const chartData = stats?.chartData || [];
  const pipelineData = stats?.pipelineData || [];
  const candidateStats = stats?.candidateStats || [];

  // Calculate candidates in process (not hired or not selected)
  const candidatesInProcess = candidateStats
    .filter(stat => stat.status !== 'hired' && stat.status !== 'not_selected')
    .reduce((sum, stat) => sum + Number(stat.count), 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen pt-16">
        {/* Main Content */}
        <div className="flex-1 p-6 pr-80 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">HR Dashboard</h1>
                <p className="text-muted-foreground">Welcome back, {user?.name || user?.email}</p>
              </div>
            </div>

            {/* Quick Stats Cards - Clickable with proper redirection and filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Total Candidates Card - Redirects to /hr/candidates with hr_handling_user_id filter */}
              <Link href={`/hr/candidates?hr=${user?.id}`} data-testid="total-candidates-card">
                <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {candidateStats.reduce((sum, stat) => sum + Number(stat.count), 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">All candidates</p>
                  </CardContent>
                </Card>
              </Link>

              {/* Total Job Positions Card - Redirects to /hr/jobs with hr_handling_user_id filter */}
              <Link href={`/hr/jobs?hr=${user?.id}`} data-testid="total-jobs-card">
                <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.jobStats?.total || 0}</div>
                    <p className="text-xs text-muted-foreground">Active: {stats?.jobStats?.active || 0}</p>
                  </CardContent>
                </Card>
              </Link>

              {/* Candidates in Process Card - Redirects to /hr/candidates with filters */}
              <Link href={`/hr/candidates?hr=${user?.id}&status=process`} data-testid="candidates-in-process-card">
                <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Candidates in Process</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{candidatesInProcess}</div>
                    <p className="text-xs text-muted-foreground">Not hired or rejected</p>
                  </CardContent>
                </Card>
              </Link>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Stacked Column Chart: Jobs Opened vs Filled */}
              <Card>
                <CardHeader>
                  <CardTitle>Jobs Opened vs Filled</CardTitle>
                  <CardDescription>Monthly comparison of job openings and fills</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--background))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "6px"
                        }}
                      />
                      <Bar dataKey="opened" fill="hsl(220, 70%, 50%)" name="Jobs Opened" />
                      <Bar dataKey="filled" fill="hsl(142, 76%, 36%)" name="Jobs Filled" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Funnel Chart: Hiring Pipeline */}
              <Card>
                <CardHeader>
                  <CardTitle>Hiring Pipeline</CardTitle>
                  <CardDescription>Visual representation of candidate progression</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <FunnelChart>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--background))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "6px"
                        }}
                      />
                      <Funnel
                        dataKey="value"
                        nameKey="name"
                        data={pipelineData.map(item => ({
                          value: item.count,
                          name: item.stage,
                          fill: getStageColor(item.stage)
                        }))}
                        isAnimationActive
                      >
                        <LabelList position="right" fill="#000" stroke="none" dataKey="name" />
                        <LabelList position="left" fill="#000" stroke="none" dataKey="value" />
                      </Funnel>
                    </FunnelChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Bar Chart: Candidate Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Candidate Status Distribution</CardTitle>
                <CardDescription>Candidates at each status in the hiring process</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={candidateStats}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="status" />
                    <YAxis />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--background))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px"
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(262, 70%, 50%)" name="Candidates">
                      {candidateStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getStageColor(entry.status)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Sidebar - To-Do List */}
        <div className="w-80 border-l border-border p-6 overflow-auto">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-4">To-Do List</h2>
              <div className="space-y-3">
                {todosLoading ? (
                  <p className="text-muted-foreground">Loading tasks...</p>
                ) : todos.length === 0 ? (
                  <p className="text-muted-foreground">No pending tasks</p>
                ) : (
                  todos.map((todo: any) => (
                    <div key={todo.id} className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg">
                      <Checkbox
                        id={`todo-${todo.id}`}
                        checked={todo.isCompleted}
                        className="mt-1"
                      />
                      <label
                        htmlFor={`todo-${todo.id}`}
                        className={`text-sm ${todo.isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}
                      >
                        {todo.task}
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <Link href="/hr/upload">
                  <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardContent className="flex items-center p-4">
                      <Users className="h-5 w-5 mr-3 text-muted-foreground" />
                      <span>Upload Resumes</span>
                    </CardContent>
                  </Card>
                </Link>
                <Link href="/hr/jobs">
                  <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardContent className="flex items-center p-4">
                      <Briefcase className="h-5 w-5 mr-3 text-muted-foreground" />
                      <span>Manage Jobs</span>
                    </CardContent>
                  </Card>
                </Link>
                <Link href="/hr/candidates">
                  <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardContent className="flex items-center p-4">
                      <CheckSquare className="h-5 w-5 mr-3 text-muted-foreground" />
                      <span>Review Candidates</span>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}