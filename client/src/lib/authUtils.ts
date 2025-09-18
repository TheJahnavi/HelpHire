export function isUnauthorizedError(error: any): boolean {
  // Handle both Error objects and response objects
  if (error instanceof Error) {
    return /^401: .*Unauthorized/.test(error.message);
  }
  
  // Handle response objects
  if (error && typeof error === 'object') {
    if (error.status === 401) return true;
    if (error.message && typeof error.message === 'string') {
      return error.message.includes('Unauthorized') || error.message.includes('401');
    }
  }
  
  return false;
}

// Get current user from localStorage
export function getCurrentUser() {
  const userStr = localStorage.getItem("user");
  return userStr ? JSON.parse(userStr) : null;
}

// Check if user is authenticated (checks both localStorage and session validity)
export function isAuthenticated() {
  const user = getCurrentUser();
  if (!user) return false;
  
  // Additional check could be implemented here if needed
  return true;
}

// Check if session is still valid by calling backend
export async function isSessionValid(): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/user', { 
      credentials: 'include' 
    });
    
    if (!response.ok) {
      // If we get a 401, clear localStorage
      if (response.status === 401) {
        localStorage.removeItem("user");
      }
      return false;
    }
    
    // Update localStorage with fresh user data
    const userData = await response.json();
    localStorage.setItem("user", JSON.stringify(userData));
    return true;
  } catch (error) {
    // Network error or other issue, assume session might still be valid
    // but don't update localStorage
    return getCurrentUser() !== null;
  }
}

// Login function
export async function login(email: string, password: string, role: string, company: string) {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email, password, role, company }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Login failed');
    }
    
    const data = await response.json();
    localStorage.setItem("user", JSON.stringify(data.user));
    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

// Signup function
export async function signup(name: string, email: string, password: string, role: string, company: string) {
  try {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email, password, role, company }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Signup failed');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Signup error:', error);
    throw error;
  }
}

// Logout user
export function logout() {
  localStorage.removeItem("user");
  // Call backend logout endpoint to destroy session
  fetch('/api/auth/logout', { 
    method: 'POST',
    credentials: 'include'
  }).catch(() => {
    // Ignore errors in logout
  });
  window.location.href = "/login";
}

// Get user role
export function getUserRole() {
  const user = getCurrentUser();
  return user ? user.role : null;
}