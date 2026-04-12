import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api/endpoints';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('authToken');

    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
      setIsAuthenticated(true);
    }

    setLoading(false);
  }, []);

  const login = (userData, token) => {
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setToken(token);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
  };

  const updateUser = (userData) => {
    setUser((currentUser) => {
      const nextUser = currentUser ? { ...currentUser, ...userData } : userData;
      localStorage.setItem('user', JSON.stringify(nextUser));
      return nextUser;
    });
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated,
    login,
    logout,
    updateUser,
    isAdmin: user?.is_admin || false,
    isVerified: user?.is_verified || false,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
