import apiClient from "./client";

export const authAPI = {
  login: (credentials) => apiClient.post("/auth/login", credentials),
  register: (data) => apiClient.post("/auth/register", data),
  logout: () => apiClient.post("/auth/logout"),
  me: () => apiClient.get("/auth/me"),
};

export const adminAPI = {
  getDashboard: () => apiClient.get("/admin/dashboard"),
  getUsers: (params) => apiClient.get("/admin/users", { params }),
  createUser: (data) => apiClient.post("/admin/users", data),
  updateUser: (userId, data) => apiClient.put(`/admin/users/${userId}`, data),
  deleteUser: (userId) => apiClient.delete(`/admin/users/${userId}`),

  toggleAdmin: (userId) =>
    apiClient.patch(`/admin/users/${userId}/toggle-admin`),

  toggleStatus: (userId) =>
    apiClient.patch(`/admin/users/${userId}/toggle-status`),

  getNotes: (params) => apiClient.get("/admin/notes", { params }),
  updateNote: (noteId, data) => apiClient.put(`/admin/notes/${noteId}`, data),
  deleteNote: (noteId) => apiClient.delete(`/admin/notes/${noteId}`),

  toggleFeaturedNote: (noteId) =>
    apiClient.patch(`/admin/notes/${noteId}/toggle-featured`),
};

export default {
  authAPI,
  adminAPI,
};