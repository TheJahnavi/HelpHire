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

  // Determine the dashboard path based on user role
  const getDashboardPath = () => {
    if (!user) return "/";
    
    switch (user.role) {
      case "Super Admin":
        return "/super-admin";
      case "Company Admin":
        return "/company-admin";
      default:
        return "/hr/dashboard";
    }
  };

  // Get navigation items based on user role
  const getNavItems = () => {
    if (!user) return [];
    
    switch (user.role) {
      case "Super Admin":
        return [
          { name: "Dashboard", path: "/super-admin" },
          { name: "Companies", path: "/super-admin/companies" },
          { name: "Users", path: "/super-admin/users" },
          { name: "Subscriptions", path: "/super-admin/subscriptions" },
        ];
      case "Company Admin":
        return [
          { name: "Dashboard", path: "/company-admin" },
          { name: "Jobs", path: "/company-admin/jobs" },
          { name: "HR Users", path: "/company-admin/hr-users" },
          { name: "Subscription", path: "/company-admin/subscription" },
        ];
      default:
        return [
          { name: "Dashboard", path: "/hr/dashboard" },
          { name: "Jobs", path: "/hr/jobs" },
          { name: "Candidates", path: "/hr/candidates" },
          { name: "Upload & Add", path: "/hr/upload" },
        ];
    }
  };

  // Get dropdown menu items based on user role
  const getDropdownMenuItems = () => {
    if (!user) return [];
    
    const baseItems = [
      { name: "Profile", path: "/profile" },
      { name: "Notifications", path: "/notifications" },
    ];
    
    // Add role-specific items
    if (user.role === "Company Admin") {
      baseItems.splice(1, 0, { name: "Subscription", path: "/company-admin/subscription" });
    }
    
    return baseItems;
  };

  const dashboardPath = getDashboardPath();
  const navItems = getNavItems();
  const dropdownMenuItems = getDropdownMenuItems();

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 bg-card shadow-sm z-50 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href={isAuthenticated ? dashboardPath : "/"}>
              <div className="flex items-center space-x-3 cursor-pointer" data-testid="nav-logo">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                  <Brain className="text-primary-foreground" size={20} />
                </div>
                <span className="text-xl font-bold text-foreground">Smart Hiring</span>
              </div>
            </Link>

            {/* Navigation Items */}
            {isAuthenticated && (
              <div className="hidden md:flex items-center space-x-8">
                {navItems.map((item) => (
                  <Link key={item.path} href={item.path} data-testid={`nav-${item.name.toLowerCase()}`}>
                    <span
                      className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer ${
                        isActive(item.path) ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {item.name}
                    </span>
                  </Link>
                ))}
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
                      {dropdownMenuItems.map((item) => (
                        <DropdownMenuItem key={item.path} asChild>
                          <Link href={item.path}>
                            <span className="w-full cursor-pointer" data-testid={`${item.name.toLowerCase()}-link`}>
                              {item.name}
                            </span>
                          </Link>
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuItem 
                        onClick={async () => {
                          try {
                            await fetch('/api/auth/logout', { method: 'POST' });
                            window.location.href = '/login';
                          } catch (error) {
                            console.error('Logout failed:', error);
                          }
                        }}
                        data-testid="logout-button"
                      >
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <div className="flex items-center space-x-3">
                  <Button variant="ghost" asChild data-testid="login-button">
                    <Link href="/login">
                      <span>Login</span>
                    </Link>
                  </Button>
                  <Button asChild data-testid="signup-button">
                    <Link href="/signup">
                      <span>Sign Up</span>
                    </Link>
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