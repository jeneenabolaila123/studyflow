import apiClient from './client';

export const authAPI = {
  // Register new user
  register: (data) => apiClient.post('/auth/register', data),

  // Verify email with code
  verifyCode: (email, code) =>
    apiClient.post('/auth/verify-code', { email, code }),

  // Resend verification code
  resendCode: (email) =>
    apiClient.post('/auth/send-verification-code', { email }),

  // Login
  login: (email, password) =>
    apiClient.post('/auth/login', { email, password }),

  // Get current user
  getMe: () => apiClient.get('/auth/me'),

  // Logout
  logout: () => apiClient.post('/auth/logout'),

  // Request password reset
  forgotPassword: (email) =>
    apiClient.post('/auth/forgot-password', { email }),

  // Reset password with code
  resetPassword: (email, code, password, password_confirmation) =>
    apiClient.post('/auth/reset-password', {
      email,
      code,
      password,
      password_confirmation,
    }),
};

export const adminAPI = {
  // Get admin stats
  getStats: () => apiClient.get('/admin/stats'),

  // Get all users
  getUsers: (params) => apiClient.get('/admin/users', { params }),

  // Get single user
  getUser: (userId) => apiClient.get(`/admin/users/${userId}`),

  // Create user
  createUser: (data) =>
    apiClient.post('/admin/users', data),

  // Update user
  updateUser: (userId, data) =>
    apiClient.put(`/admin/users/${userId}`, data),

  // Delete user
  deleteUser: (userId) =>
    apiClient.delete(`/admin/users/${userId}`),

  // Change user role
  changeUserRole: (userId, isAdmin) =>
    apiClient.post(`/admin/users/${userId}/change-role`, { is_admin: isAdmin }),

  // Change user status
  changeUserStatus: (userId, status) =>
    apiClient.post(`/admin/users/${userId}/change-status`, { status }),

  // Manually verify user email
  verifyUserEmail: (userId) =>
    apiClient.post(`/admin/users/${userId}/verify-email`),

  // Resend verification code to user
  resendVerificationToUser: (userId) =>
    apiClient.post(`/admin/users/${userId}/resend-verification`),
};
