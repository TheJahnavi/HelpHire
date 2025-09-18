import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getCurrentUser } from "@/lib/authUtils";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  options: {
    method: string;
    body?: FormData | unknown;
    headers?: Record<string, string>;
  }
): Promise<any> {
  const isFormData = options.body instanceof FormData;
  
  // Get current user to include user ID in headers
  const currentUser = getCurrentUser();
  
  const res = await fetch(url, {
    method: options.method,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      'x-user-id': currentUser?.id || '',
      ...options.headers,
    },
    body: isFormData ? (options.body as FormData) : (options.body ? JSON.stringify(options.body) : undefined),
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return await res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Get current user to include user ID in headers
    const currentUser = getCurrentUser();
    
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
      headers: {
        'x-user-id': currentUser?.id || ''
      }
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});