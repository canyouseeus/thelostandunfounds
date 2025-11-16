/**
 * Protected Route Component
 * Wraps routes that require authentication or admin access
 */

import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/Loading';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  // For admin routes, let the Admin component handle the login prompt
  // For other protected routes, redirect to home if not authenticated
  if (!user && !requireAdmin) {
    return <Navigate to="/" replace />;
  }

  // For admin routes, always render children (Admin component will handle auth)
  // For other routes, render children if authenticated
  return <>{children}</>;
}

