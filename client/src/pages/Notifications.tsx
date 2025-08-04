import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, CheckCircle, Clock, X, Users, FileText, Calendar } from "lucide-react";

interface NotificationsProps {
  onClose?: () => void;
}

export default function Notifications({ onClose }: NotificationsProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const { data: notifications = [], isLoading: notificationsLoading } = useQuery<any[]>({
    queryKey: ["/api/notifications"],
    retry: false,
  });

  const { data: todos = [], isLoading: todosLoading } = useQuery<any[]>({
    queryKey: ["/api/todos"],
    retry: false,
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to mark notifications as read",
        variant: "destructive",
      });
    },
  });

  const updateTodoMutation = useMutation({
    mutationFn: async ({ id, isCompleted }: { id: number; isCompleted: boolean }) => {
      await apiRequest("PUT", `/api/todos/${id}`, { isCompleted });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/todos"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    },
  });

  const handleToggleTodo = (id: number, isCompleted: boolean) => {
    updateTodoMutation.mutate({ id, isCompleted: !isCompleted });
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  };

  const getNotificationIcon = (message: string) => {
    if (message.toLowerCase().includes("candidate")) return <Users className="h-4 w-4" />;
    if (message.toLowerCase().includes("interview")) return <Calendar className="h-4 w-4" />;
    if (message.toLowerCase().includes("report")) return <FileText className="h-4 w-4" />;
    return <Bell className="h-4 w-4" />;
  };

  const unreadNotifications = notifications?.filter((n: any) => !n.readStatus) || [];
  const readNotifications = notifications?.filter((n: any) => n.readStatus) || [];
  const incompleteTodos = todos?.filter((t: any) => !t.isCompleted) || [];

  if (isLoading || !isAuthenticated) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="h-full flex">
      {/* To-Do Section (Left) */}
      <div className="flex-1 p-6 border-r border-border">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground" data-testid="tasks-title">
            {incompleteTodos.length} tasks
          </h2>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} data-testid="close-modal">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-4">
            {/* 360° Review Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">360° Review</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-foreground">Write reviews for</span>
                  <Button size="sm" data-testid="write-reviews-button">
                    Write reviews
                  </Button>
                </div>
                <div className="flex -space-x-1">
                  <Avatar className="w-8 h-8 border-2 border-background">
                    <AvatarFallback className="text-xs">JD</AvatarFallback>
                  </Avatar>
                  <Avatar className="w-8 h-8 border-2 border-background">
                    <AvatarFallback className="text-xs">SM</AvatarFallback>
                  </Avatar>
                  <Avatar className="w-8 h-8 border-2 border-background">
                    <AvatarFallback className="text-xs">AB</AvatarFallback>
                  </Avatar>
                  <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                    <span className="text-xs">+3</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sample Tasks */}
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-start space-x-3">
                    <Checkbox className="mt-1" data-testid="direct-report-task" />
                    <div>
                      <span className="text-sm text-foreground">Turn on updates for your new direct report</span>
                      <div className="flex items-center mt-2">
                        <Avatar className="w-6 h-6 mr-2">
                          <AvatarFallback className="text-xs">FG</AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-muted-foreground">Fletcher Guerrero</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-start space-x-3">
                    <Checkbox className="mt-1" data-testid="goals-task" />
                    <span className="text-sm text-foreground">Update your 8 goals</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dynamic Tasks from API */}
            {todosLoading ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">Loading tasks...</p>
                </CardContent>
              </Card>
            ) : incompleteTodos.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Your Tasks</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {incompleteTodos.map((todo: any) => (
                    <div key={todo.id} className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg">
                      <Checkbox
                        checked={todo.isCompleted}
                        onCheckedChange={() => handleToggleTodo(todo.id, todo.isCompleted)}
                        className="mt-1"
                        data-testid={`todo-${todo.id}`}
                      />
                      <span className={`text-sm ${todo.isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {todo.task}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-foreground mb-2">All caught up!</h3>
                  <p className="text-sm text-muted-foreground">No pending tasks at the moment.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        <div className="mt-6">
          <Button variant="ghost" size="sm" data-testid="view-more-tasks">
            View more tasks
          </Button>
        </div>
      </div>

      {/* Notifications Section (Right) */}
      <div className="w-80 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground" data-testid="notifications-title">
            Notifications
          </h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={unreadNotifications.length === 0}
            data-testid="mark-all-read"
          >
            Mark all as read
          </Button>
        </div>

        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-4">
            {notificationsLoading ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">Loading notifications...</p>
              </div>
            ) : notifications && notifications.length > 0 ? (
              <>
                {/* Unread Notifications */}
                {unreadNotifications.map((notification: any) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg border-l-4 ${
                      notification.message.toLowerCase().includes('deadline') || notification.message.toLowerCase().includes('reminder')
                        ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500'
                        : 'bg-primary/5 border-primary'
                    }`}
                    data-testid={`notification-${notification.id}`}
                  >
                    <div className="flex items-start space-x-2">
                      <div className="mt-1">
                        {getNotificationIcon(notification.message)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTimestamp(notification.timestamp)}
                        </p>
                      </div>
                      {!notification.readStatus && (
                        <Badge variant="secondary" className="ml-2">
                          New
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}

                {/* Read Notifications */}
                {readNotifications.slice(0, 5).map((notification: any) => (
                  <div
                    key={notification.id}
                    className="p-3 bg-muted/50 rounded-lg"
                    data-testid={`notification-${notification.id}`}
                  >
                    <div className="flex items-start space-x-2">
                      <div className="mt-1 text-muted-foreground">
                        {getNotificationIcon(notification.message)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTimestamp(notification.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="text-center py-8">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-lg font-medium text-foreground mb-2">No notifications</h3>
                <p className="text-sm text-muted-foreground">You're all caught up!</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {notifications && notifications.length > 5 && (
          <div className="mt-6">
            <Button variant="ghost" size="sm" data-testid="see-more-notifications">
              See more notifications
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
