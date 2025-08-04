import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Briefcase, Clock, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--muted))', 'hsl(var(--accent))'];

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
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    retry: false,
  });

  const { data: todos, isLoading: todosLoading } = useQuery({
    queryKey: ["/api/todos"],
    retry: false,
  });

  const { data: notifications } = useQuery({
    queryKey: ["/api/notifications"],
    retry: false,
  });

  // Mock chart data
  const jobsData = [
    { month: 'Jan', opened: 12, filled: 8 },
    { month: 'Feb', opened: 8, filled: 6 },
    { month: 'Mar', opened: 15, filled: 12 },
    { month: 'Apr', opened: 10, filled: 7 },
    { month: 'May', opened: 14, filled: 10 },
    { month: 'Jun', opened: 9, filled: 7 },
  ];

  const pipelineData = [
    { name: 'Applied', value: 450 },
    { name: 'Screening', value: 320 },
    { name: 'Interview', value: 180 },
    { name: 'Offer', value: 90 },
    { name: 'Hired', value: 65 },
  ];

  const statusData = [
    { status: 'Resume Reviewed', count: 89 },
    { status: 'Interview Scheduled', count: 67 },
    { status: 'Technical Round', count: 45 },
    { status: 'Final Round', count: 32 },
    { status: 'Decision Pending', count: 18 },
  ];

  if (isLoading || !isAuthenticated) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="welcome-header">
            Welcome, {user?.name || user?.firstName}! 👋
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening with your hiring process today.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="hover:shadow-md transition-shadow cursor-pointer" data-testid="total-candidates-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Candidates</p>
                      <p className="text-3xl font-bold text-foreground">
                        {statsLoading ? "..." : stats?.totalCandidates || 0}
                      </p>
                      <p className="text-sm text-green-600">+12.5% from last month</p>
                    </div>
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Users className="text-primary" size={24} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer" data-testid="total-jobs-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Job Positions</p>
                      <p className="text-3xl font-bold text-foreground">
                        {statsLoading ? "..." : stats?.totalJobs || 0}
                      </p>
                      <p className="text-sm text-green-600">+3 new this week</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                      <Briefcase className="text-blue-500" size={24} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer" data-testid="candidates-in-process-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Candidates in Process</p>
                      <p className="text-3xl font-bold text-foreground">
                        {statsLoading ? "..." : stats?.candidatesInProcess || 0}
                      </p>
                      <p className="text-sm text-yellow-600">Active interviews</p>
                    </div>
                    <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
                      <Clock className="text-yellow-500" size={24} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Jobs Opened vs Filled Chart */}
              <Card data-testid="jobs-chart">
                <CardHeader>
                  <CardTitle>Jobs Opened vs Filled</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={jobsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="opened" fill="hsl(var(--primary))" name="Jobs Opened" />
                      <Bar dataKey="filled" fill="hsl(var(--secondary))" name="Jobs Filled" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Hiring Pipeline Funnel */}
              <Card data-testid="pipeline-chart">
                <CardHeader>
                  <CardTitle>Hiring Pipeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pipelineData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pipelineData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Candidate Status Bar Chart */}
            <Card data-testid="status-chart">
              <CardHeader>
                <CardTitle>Candidate Status Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={statusData} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="status" type="category" width={120} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* To-Do List */}
            <Card data-testid="todo-list">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Tasks</CardTitle>
                  <Button variant="ghost" size="sm" data-testid="view-more-tasks">
                    View more
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {todosLoading ? (
                  <p className="text-sm text-muted-foreground">Loading tasks...</p>
                ) : todos && todos.length > 0 ? (
                  todos.slice(0, 3).map((todo: any) => (
                    <div key={todo.id} className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg">
                      <Checkbox
                        checked={todo.isCompleted}
                        className="mt-1"
                        data-testid={`todo-checkbox-${todo.id}`}
                      />
                      <span className={`text-sm ${todo.isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {todo.task}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No tasks available</p>
                )}
                
                {/* Sample task items for demonstration */}
                <div className="space-y-3">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">360° Review</span>
                      <Button size="sm" variant="outline" data-testid="write-reviews-button">
                        Write reviews
                      </Button>
                    </div>
                    <div className="flex -space-x-1">
                      <Avatar className="w-6 h-6 border-2 border-background">
                        <AvatarFallback className="text-xs">JD</AvatarFallback>
                      </Avatar>
                      <Avatar className="w-6 h-6 border-2 border-background">
                        <AvatarFallback className="text-xs">SM</AvatarFallback>
                      </Avatar>
                      <Avatar className="w-6 h-6 border-2 border-background">
                        <AvatarFallback className="text-xs">AB</AvatarFallback>
                      </Avatar>
                      <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                        <span className="text-xs">+3</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Turn on updates for your new direct report</span>
                      <Checkbox data-testid="direct-report-checkbox" />
                    </div>
                    <div className="flex items-center mt-2">
                      <Avatar className="w-6 h-6 mr-2">
                        <AvatarFallback className="text-xs">FG</AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-muted-foreground">Fletcher Guerrero</span>
                    </div>
                  </div>

                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Update your 8 goals</span>
                      <Checkbox data-testid="goals-checkbox" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Manager & Team Section */}
            <Card data-testid="team-section">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Manager</CardTitle>
                  <Button variant="ghost" size="sm" data-testid="view-org-chart">
                    View org chart
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarFallback>JC</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">John Camacho</span>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">Team</h4>
                  <div className="flex -space-x-1 mb-4">
                    <Avatar className="w-8 h-8 border-2 border-background">
                      <AvatarFallback className="text-xs">AM</AvatarFallback>
                    </Avatar>
                    <Avatar className="w-8 h-8 border-2 border-background">
                      <AvatarFallback className="text-xs">SL</AvatarFallback>
                    </Avatar>
                    <Avatar className="w-8 h-8 border-2 border-background">
                      <AvatarFallback className="text-xs">FG</AvatarFallback>
                    </Avatar>
                    <div className="w-8 h-8 rounded-full bg-primary border-2 border-background flex items-center justify-center">
                      <span className="text-primary-foreground text-xs font-medium">FG</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-background flex items-center justify-center">
                      <span className="text-white text-xs font-medium">SL</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                      <span className="text-xs">+1</span>
                    </div>
                  </div>
                </div>

                {/* 1:1s Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-muted-foreground">1:1s</h4>
                    <Button variant="ghost" size="sm" data-testid="add-one-on-one">
                      Add 1:1
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs">AM</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Alivia Mora</p>
                        <p className="text-xs text-muted-foreground">Tomorrow @ 1:00 PM • 4 talking points</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs">SL</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Sara Livingstein</p>
                        <p className="text-xs text-muted-foreground">Tomorrow @ 1:30 PM • 4 talking points</p>
                      </div>
                    </div>
                  </div>

                  <Button variant="ghost" size="sm" className="mt-4" data-testid="show-more-meetings">
                    Show more
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
