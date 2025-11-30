/**
 * User Profile Page
 * View and edit user account information
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { User, Mail, Calendar, Shield, Key } from 'lucide-react';
import { LoadingSpinner, SkeletonCard } from '../components/Loading';
import { formatDate } from '../utils/helpers';
import { SubscriptionTier } from '../types/index';
import { isAdmin } from '../utils/admin';

export default function Profile() {
  const { user, tier, loading: authLoading } = useAuth();
  const { success, error: showError } = useToast();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (user?.email) {
      // Use author_name from user_metadata if available, otherwise extract from email
      const authorName = user.user_metadata?.author_name;
      const emailName = user.email.split('@')[0];
      setDisplayName(authorName || emailName);
    }
  }, [user]);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        const admin = await isAdmin();
        setUserIsAdmin(admin);
        // Redirect admins to admin dashboard
        if (admin) {
          navigate('/admin', { replace: true });
        }
      }
    };
    checkAdminStatus();
  }, [user, navigate]);

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // TODO: Update user profile in database
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate API call
      success('Profile updated successfully');
      setIsEditing(false);
    } catch (err) {
      showError('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      showError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      showError('Password must be at least 6 characters');
      return;
    }

    setPasswordLoading(true);
    try {
      const { supabase } = await import('../lib/supabase');
      
      // Update password using Supabase
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        showError(error.message || 'Failed to update password');
        return;
      }

      success('Password updated successfully');
      setShowPasswordChange(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showError('Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SkeletonCard />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-white/70">Please sign in to view your profile.</p>
        </div>
      </div>
    );
  }

  const tierColors: Record<SubscriptionTier, string> = {
    free: 'text-white/60 bg-white/5 border-white/10',
    premium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
    pro: 'text-purple-400 bg-purple-400/10 border-purple-400/30',
  };

  const tierLabels: Record<SubscriptionTier, string> = {
    free: 'Free',
    premium: 'Premium',
    pro: 'Pro',
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">PROFILE</h1>
        <p className="text-white/70">Manage your account information</p>
      </div>

      <div className="space-y-6">
        {/* Account Information */}
        <div className="bg-black/50 border border-white/10 rounded-none p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <User className="w-5 h-5" />
                Account Information
              </h2>
              {userIsAdmin && (
                <div className="px-4 py-2 bg-black/50 border border-white/10 rounded-none text-white">
                  ADMIN
                </div>
              )}
            </div>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-white text-black font-semibold rounded-none hover:bg-white/90 transition text-sm"
              >
                Edit
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Email
              </label>
              <div className="flex items-center gap-2 px-4 py-2 bg-black/50 border border-white/10 rounded-none">
                <Mail className="w-4 h-4 text-white/60" />
                <span className="text-white">{user.email}</span>
              </div>
              <p className="text-xs text-white/40 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Author Name (Username)
              </label>
              {isEditing ? (
                <div>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-none text-white placeholder-white/40 focus:outline-none focus:border-white/30"
                    placeholder="Your author name"
                    disabled={!!user.user_metadata?.author_name}
                  />
                  {user.user_metadata?.author_name && (
                    <p className="text-xs text-yellow-400 mt-1">Author name cannot be changed after registration</p>
                  )}
                </div>
              ) : (
                <div className="px-4 py-2 bg-black/50 border border-white/10 rounded-none text-white">
                  {displayName || 'Not set'}
                </div>
              )}
            </div>

            {isEditing && (
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="px-4 py-2 bg-white text-black font-semibold rounded-none hover:bg-white/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading && <LoadingSpinner size="sm" />}
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setDisplayName(user.email?.split('@')[0] || '');
                  }}
                  className="px-4 py-2 bg-black/50 border border-white/10 text-white font-semibold rounded-none hover:border-white/30 transition"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Password Change */}
        <div className="bg-black/50 border border-white/10 rounded-none p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Key className="w-5 h-5" />
              Change Password
            </h2>
            {!showPasswordChange && (
              <button
                onClick={() => setShowPasswordChange(true)}
                className="px-4 py-2 bg-white text-black font-semibold rounded-none hover:bg-white/90 transition text-sm"
              >
                Change Password
              </button>
            )}
          </div>

          {showPasswordChange ? (
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-none text-white placeholder-white/40 focus:outline-none focus:border-white/30"
                  placeholder="Enter current password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-none text-white placeholder-white/40 focus:outline-none focus:border-white/30"
                  placeholder="Enter new password (min. 6 characters)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-none text-white placeholder-white/40 focus:outline-none focus:border-white/30"
                  placeholder="Confirm new password"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="px-4 py-2 bg-white text-black font-semibold rounded-none hover:bg-white/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {passwordLoading && <LoadingSpinner size="sm" />}
                  Update Password
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordChange(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className="px-4 py-2 bg-black/50 border border-white/10 text-white font-semibold rounded-none hover:border-white/30 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <p className="text-white/60 text-sm">Click "Change Password" to update your password</p>
          )}
        </div>

        {/* Subscription Information */}
        <div className="bg-black/50 border border-white/10 rounded-none p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Subscription
          </h2>

          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-none border ${tierColors[tier]}`}>
            <span className="font-semibold">{tierLabels[tier]} Tier</span>
          </div>

          {tier === 'free' && (
            <div className="mt-4">
              <a
                href="/tools"
                className="text-white/80 hover:text-white text-sm underline"
              >
                Upgrade to unlock more features →
              </a>
            </div>
          )}
        </div>

        {/* Account Details */}
        <div className="bg-black/50 border border-white/10 rounded-none p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Account Details
          </h2>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-white/60">User ID</span>
              <span className="text-white font-mono text-xs">{user.id}</span>
            </div>
            {user.created_at && (
              <div className="flex justify-between">
                <span className="text-white/60">Member since</span>
                <span className="text-white">{formatDate(user.created_at)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

