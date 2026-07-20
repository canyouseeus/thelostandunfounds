/**
 * Protected Route Component
 * Wraps routes that require authentication or admin access
 */

import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isAdminEmail } from '../utils/admin';
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

  // requireAdmin gates to admin accounts (previously only checked auth).
  if (requireAdmin && !isAdminEmail(user.email || '')) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

