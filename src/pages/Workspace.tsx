/**
 * Admin Workspace Page
 * Content creation and management workspace for admins
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { isAdmin } from '../utils/admin';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '../components/Loading';
import BlogManagement from '../components/BlogManagement';
import { FileText } from 'lucide-react';

export default function Workspace() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [adminStatus, setAdminStatus] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (authLoading) return;
      
      if (!user) {
        navigate('/');
        return;
      }

      const admin = await isAdmin();
      setAdminStatus(admin);
      setLoading(false);

      if (!admin) {
        navigate('/');
      }
    };
    checkAdminAccess();
  }, [user, authLoading, navigate]);

  if (loading || authLoading || adminStatus === null) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (adminStatus === false) {
    return null; // Will redirect
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-2">
          <FileText className="w-8 h-8" />
          Workspace
        </h1>
        <p className="text-white/70">Content creation and management</p>
      </div>

      {/* Blog Management */}
      <BlogManagement />
    </div>
  );
}
