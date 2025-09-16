export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

// Get current user from localStorage (for Vercel deployment)
export function getCurrentUser() {
  const userStr = localStorage.getItem("user");
  return userStr ? JSON.parse(userStr) : null;
}

// Check if user is authenticated
export function isAuthenticated() {
  return !!getCurrentUser();
}

// Logout user
export function logout() {
  localStorage.removeItem("user");
  window.location.href = "/login";
}

// Get user role
export function getUserRole() {
  const user = getCurrentUser();
  return user ? user.role : null;
}