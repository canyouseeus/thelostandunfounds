/**
 * User Profile Page
 * View and edit user account information
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { User, Mail, Calendar, Shield } from 'lucide-react';
import { LoadingSpinner, SkeletonCard } from '../components/Loading';
import { formatDate } from '../utils/helpers';
import { SubscriptionTier } from '../types/index';

export default function Profile() {
  const { user, tier, loading: authLoading } = useAuth();
  const { success, error: showError } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.email) {
      // Extract name from email (before @) as default display name
      const emailName = user.email.split('@')[0];
      setDisplayName(emailName);
    }
  }, [user]);

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
        <h1 className="text-4xl font-bold text-white mb-2">Profile</h1>
        <p className="text-white/70">Manage your account information</p>
      </div>

      <div className="space-y-6">
        {/* Account Information */}
        <div className="bg-black border border-white/10 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <User className="w-5 h-5" />
              Account Information
            </h2>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition text-sm"
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
              <div className="flex items-center gap-2 px-4 py-2 bg-black border border-white/10 rounded-lg">
                <Mail className="w-4 h-4 text-white/60" />
                <span className="text-white">{user.email}</span>
              </div>
              <p className="text-xs text-white/40 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Display Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-2 bg-black border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/30"
                  placeholder="Your display name"
                />
              ) : (
                <div className="px-4 py-2 bg-black border border-white/10 rounded-lg text-white">
                  {displayName || 'Not set'}
                </div>
              )}
            </div>

            {isEditing && (
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="px-4 py-2 bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading && <LoadingSpinner size="sm" />}
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setDisplayName(user.email?.split('@')[0] || '');
                  }}
                  className="px-4 py-2 bg-black border border-white/10 text-white font-semibold rounded-lg hover:border-white/30 transition"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Subscription Information */}
        <div className="bg-black border border-white/10 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Subscription
          </h2>

          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${tierColors[tier]}`}>
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
        <div className="bg-black border border-white/10 rounded-lg p-6">
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

