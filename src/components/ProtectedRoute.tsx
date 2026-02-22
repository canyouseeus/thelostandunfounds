/**
 * Protected Route Component
 * Wraps routes that require authentication or admin access
 */

import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoadingOverlay } from '../components/Loading';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingOverlay />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (requireAdmin) {
    // Admin check will be done in the Admin component itself
    // This just ensures user is authenticated
    return <>{children}</>;
  }

  return <>{children}</>;
}

