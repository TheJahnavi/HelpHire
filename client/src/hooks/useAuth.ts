import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { getCurrentUser, isAuthenticated, isSessionValid } from "@/lib/authUtils";

export function useAuth() {
  // Check session validity by calling the backend
  const { data: user, isLoading, isError } = useQuery<User | null>({
    queryKey: ['auth-user'],
    queryFn: async () => {
      // In serverless environment, we rely on localStorage and periodic validation
      const storedUser = getCurrentUser();
      if (!storedUser) return null;
      
      // Validate session periodically
      const isValid = await isSessionValid();
      if (isValid) {
        return getCurrentUser();
      }
      return null;
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchInterval: 15 * 60 * 1000, // 15 minutes
  });

  return {
    user: user || getCurrentUser(),
    isLoading,
    isAuthenticated: isAuthenticated(),
  };
}