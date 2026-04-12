import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader } from '../ui/UIComponents';

export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <Loader fullscreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return children || <Outlet />;
};

export const VerifiedRoute = ({ children }) => {
  const { isAuthenticated, isVerified, loading } = useAuth();

  if (loading) {
    return <Loader fullscreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (!isVerified) {
    return <Navigate to="/verify-email" />;
  }

  return children || <Outlet />;
};

export const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return <Loader fullscreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" />;
  }

  return children || <Outlet />;
};

export const GuestOnlyRoute = ({ children }) => {
  const { isAuthenticated, loading, isAdmin } = useAuth();

  if (loading) {
    return <Loader fullscreen />;
  }

  if (isAuthenticated) {
    return <Navigate to={isAdmin ? '/admin' : '/dashboard'} />;
  }

  return children || <Outlet />;
};
