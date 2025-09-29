import { apiRequest } from "./queryClient";

// Create an axios-like API client using our apiRequest function
const api = {
  get: (url: string) => apiRequest(url, { method: 'GET' }),
  post: (url: string, data?: any) => apiRequest(url, { method: 'POST', body: data }),
  put: (url: string, data?: any) => apiRequest(url, { method: 'PUT', body: data }),
  delete: (url: string) => apiRequest(url, { method: 'DELETE' }),
  // Add new API client method for triggering interviews
  triggerInterview: (candidateId: string) => {
    return apiRequest(`/api/candidates/${candidateId}/trigger-interview`, { method: 'POST' });
  }
};

export default api;