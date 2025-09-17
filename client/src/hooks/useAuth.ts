import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { getCurrentUser } from "@/lib/authUtils";

export function useAuth() {
  // For Vercel deployment, we'll use localStorage instead of API calls for authentication state
  const user = getCurrentUser();
  const isLoading = false; // No async loading needed for localStorage

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}