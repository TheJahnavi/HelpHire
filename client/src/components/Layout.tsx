import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckSquare, Moon, Sun, Brain } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Notifications from "@/pages/Notifications";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { isAuthenticated, user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [location] = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);

  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ["/api/notifications"],
    enabled: isAuthenticated,
  });

  const unreadCount = notifications?.filter((n: any) => !n.readStatus).length || 0;

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const isActive = (path: string) => location === path;

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 bg-card shadow-sm z-50 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Brain className="text-primary-foreground" size={20} />
              </div>
              <span className="text-xl font-bold text-foreground">Smart Hiring</span>
            </div>

            {/* Navigation Items */}
            {isAuthenticated && (
              <div className="hidden md:flex items-center space-x-8">
                <Link href="/hr/jobs" data-testid="nav-jobs">
                  <span
                    className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer ${
                      isActive("/hr/jobs") ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    Jobs
                  </span>
                </Link>
                <Link href="/hr/candidates" data-testid="nav-candidates">
                  <span
                    className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer ${
                      isActive("/hr/candidates") ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    Candidates
                  </span>
                </Link>
                <Link href="/hr/upload" data-testid="nav-upload">
                  <span
                    className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer ${
                      isActive("/hr/upload") ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    Upload & Add
                  </span>
                </Link>
              </div>
            )}

            {/* Right Side Items */}
            <div className="flex items-center space-x-4">
              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                data-testid="theme-toggle"
              >
                {theme === "light" ? (
                  <Moon className="h-5 w-5" />
                ) : (
                  <Sun className="h-5 w-5" />
                )}
              </Button>

              {isAuthenticated ? (
                <>
                  {/* Notifications */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowNotifications(true)}
                    className="relative"
                    data-testid="notifications-button"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                      >
                        {unreadCount}
                      </Badge>
                    )}
                  </Button>

                  {/* User Profile */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-8 w-8 rounded-full" data-testid="user-menu">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.name || ""} />
                          <AvatarFallback>
                            {user?.name?.charAt(0) || user?.email?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                      <DropdownMenuItem asChild>
                        <Link href="/hr/profile">
                          <span className="w-full cursor-pointer" data-testid="profile-link">Profile</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/hr/notifications">
                          <span className="w-full cursor-pointer" data-testid="notifications-link">Notifications</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a href="/api/logout" data-testid="logout-button">
                          Logout
                        </a>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <div className="flex items-center space-x-3">
                  <Button variant="ghost" asChild data-testid="login-button">
                    <a href="/api/login">Login</a>
                  </Button>
                  <Button asChild data-testid="signup-button">
                    <a href="/api/login">Sign Up</a>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-16">
        {children}
      </div>

      {/* Notifications Modal */}
      {showNotifications && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <Notifications onClose={() => setShowNotifications(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
