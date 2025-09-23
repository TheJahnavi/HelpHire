import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Brain } from "lucide-react";
import { Link } from "wouter";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
  role: z.enum(["Super Admin", "Company Admin", "HR"], {
    required_error: "Please select a role",
  }),
  company: z.string().optional(),
}).refine((data) => {
  // Company is required for non-Super Admin roles
  if (data.role !== "Super Admin" && !data.company) {
    return false;
  }
  return true;
}, {
  message: "Company is required for Company Admin and HR roles",
  path: ["company"],
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      role: undefined,
      company: "",
    },
  });

  const selectedRole = form.watch("role");
  const showCompanyField = selectedRole && selectedRole !== "Super Admin";

  // Pre-fill HR credentials when HR role is selected
  useEffect(() => {
    if (selectedRole === "HR") {
      form.setValue("email", "hr1@techcorp.com");
      form.setValue("password", "hrpassword123");
      form.setValue("company", "TechCorp Inc");
    }
  }, [selectedRole, form]);

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      // Make login request without x-user-id header since we don't have a user yet
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Login failed");
      }
      
      const result = await response.json();
      
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });

      // Store user data in localStorage
      localStorage.setItem("user", JSON.stringify(result.user));
      
      // Redirect based on role after a short delay to ensure state is updated
      setTimeout(() => {
        if (data.role === "Super Admin") {
          window.location.href = "/super-admin/dashboard";
        } else if (data.role === "Company Admin") {
          window.location.href = "/company-admin/dashboard";
        } else {
          // For HR users, redirect to the main dashboard
          window.location.href = "/hr/dashboard";
        }
      }, 100);
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-primary/10 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
            <Brain className="text-primary-foreground" size={32} />
          </div>
          <CardTitle className="text-2xl">Smart Hiring</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                {...form.register("email")}
                data-testid="email-input"
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={form.watch("role") || ""}
                onValueChange={(value) => form.setValue("role", value as any)}
              >
                <SelectTrigger data-testid="role-select">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Super Admin">Super Admin</SelectItem>
                  <SelectItem value="Company Admin">Company Admin</SelectItem>
                  <SelectItem value="HR">HR</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.role && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.role.message}
                </p>
              )}
            </div>

            {/* Company (conditional) */}
            {showCompanyField && (
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  placeholder="Enter your company name"
                  {...form.register("company")}
                  data-testid="company-input"
                />
                {form.formState.errors.company && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.company.message}
                  </p>
                )}
              </div>
            )}

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                {...form.register("password")}
                data-testid="password-input"
              />
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
              data-testid="login-button"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <p className="text-muted-foreground">
              Don't have an account?{" "}
              <Link href="/signup">
                <span className="text-primary hover:underline cursor-pointer">
                  Sign up
                </span>
              </Link>
            </p>
            <p className="mt-2">
              <Link href="/">
                <span className="text-primary hover:underline cursor-pointer">
                  Back to Home
                </span>
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}