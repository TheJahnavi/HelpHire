import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Briefcase, Clock, CheckSquare } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Link } from "wouter";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

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

  const { data: stats, isLoading: statsLoading } = useQuery<{
    jobStats: { total: number; active: number };
    candidateStats: Array<{ status: string; count: number }>;
    pipelineData: Array<{ stage: string; count: number }>;
    chartData: Array<{ month: string; opened: number; filled: number }>;
  }>({
    queryKey: ["/api/dashboard/stats"],
    retry: false,
  });

  const { data: todos = [], isLoading: todosLoading } = useQuery<any[]>({
    queryKey: ["/api/todos"],
    retry: false,
  });

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

            {/* Quick Stats Cards - Clickable */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Link href="/hr/jobs" data-testid="total-jobs-card">
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

              <Link href="/hr/candidates" data-testid="total-candidates-card">
                <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {candidateStats.reduce((sum, stat) => sum + Number(stat.count), 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">In pipeline</p>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/hr/notifications" data-testid="pending-tasks-card">
                <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {todos.filter((todo: any) => !todo.isCompleted).length}
                    </div>
                    <p className="text-xs text-muted-foreground">To do items</p>
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

              {/* Bar Chart: Candidate Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Candidate Status Distribution</CardTitle>
                  <CardDescription>Candidates at each status in the hiring process</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={pipelineData} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" />
                      <YAxis dataKey="stage" type="category" width={120} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--background))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "6px"
                        }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Pie Chart: Candidate Status Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Candidate Status Breakdown</CardTitle>
                <CardDescription>Visual breakdown of all candidates by status</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={candidateStats}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      label={({ status, count }) => `${status}: ${count}`}
                    >
                      {candidateStats.map((entry: any, index: number) => {
                        const colors = [
                          "hsl(220, 70%, 50%)", // Blue for Resume Reviewed
                          "hsl(32, 95%, 44%)",  // Orange for Interview Scheduled  
                          "hsl(271, 81%, 56%)", // Purple for Report Generated
                          "hsl(142, 76%, 36%)", // Green for Hired
                          "hsl(0, 84%, 60%)"    // Red for Not Selected
                        ];
                        return (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={colors[index % colors.length]} 
                          />
                        );
                      })}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--background))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px"
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Side Panel - To-Do List */}
        <div className="fixed right-0 top-16 h-full w-80 bg-card border-l border-border p-6 overflow-auto">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">To-Do List</h2>
              {todosLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : todos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No tasks found</p>
                  <p className="text-sm">You're all caught up!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todos.map((todo: any) => (
                    <div
                      key={todo.id}
                      className={`p-3 rounded-lg border ${
                        todo.isCompleted 
                          ? 'bg-muted/50 border-muted' 
                          : 'bg-background border-border'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          checked={todo.isCompleted}
                          className="mt-1"
                          data-testid={`todo-checkbox-${todo.id}`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${
                            todo.isCompleted 
                              ? 'line-through text-muted-foreground' 
                              : 'text-foreground'
                          }`}>
                            {todo.task}
                          </p>
                          {todo.createdAt && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(todo.createdAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}