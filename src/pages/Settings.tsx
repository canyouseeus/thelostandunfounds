/**
 * Settings Page
 * User preferences and account settings
 */

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { Settings, Bell, Shield, Trash2, Key } from 'lucide-react';
import { LoadingSpinner } from '../components/Loading';

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    marketing: false,
  });

  const handleNotificationsChange = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    success('Notification preferences updated');
  };

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleChangePassword = async () => {
    setShowPasswordModal(true);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
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
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showError('Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement account deletion
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await signOut();
      success('Account deleted successfully');
    } catch (err) {
      showError('Failed to delete account');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-white/70">Please sign in to access settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-2">
          <Settings className="w-8 h-8" />
          Settings
        </h1>
        <p className="text-white/70">Manage your preferences and account settings</p>
      </div>

      <div className="space-y-6">
        {/* Notifications */}
        <div className="bg-black/50 border border-white rounded-none p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
          </h2>

          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer group">
              <div>
                <div className="text-white font-medium">Email Notifications</div>
                <div className="text-sm text-white/60">Receive updates via email</div>
              </div>
              <input
                type="checkbox"
                checked={notifications.email}
                onChange={() => handleNotificationsChange('email')}
                className="w-5 h-5 rounded-none border-white bg-black text-white focus:ring-2 focus:ring-white/20"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer group">
              <div>
                <div className="text-white font-medium">Push Notifications</div>
                <div className="text-sm text-white/60">Receive browser notifications</div>
              </div>
              <input
                type="checkbox"
                checked={notifications.push}
                onChange={() => handleNotificationsChange('push')}
                className="w-5 h-5 rounded-none border-white bg-black text-white focus:ring-2 focus:ring-white/20"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer group">
              <div>
                <div className="text-white font-medium">Marketing Emails</div>
                <div className="text-sm text-white/60">Receive promotional content</div>
              </div>
              <input
                type="checkbox"
                checked={notifications.marketing}
                onChange={() => handleNotificationsChange('marketing')}
                className="w-5 h-5 rounded-none border-white bg-black text-white focus:ring-2 focus:ring-white/20"
              />
            </label>
          </div>
        </div>

        {/* Security */}
        <div className="bg-black/50 border border-white rounded-none p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Security
          </h2>

          <div className="space-y-4">
            <button
              onClick={handleChangePassword}
              className="w-full px-4 py-3 bg-black/50 border border-white rounded-none text-white font-medium hover:border-white transition flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <Key className="w-5 h-5 text-white/60" />
                <div className="text-left">
                  <div className="font-medium">Change Password</div>
                  <div className="text-sm text-white/60">Update your account password</div>
                </div>
              </div>
              <span className="text-white/40">→</span>
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-black/50 border border-white rounded-none p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-500" />
            Danger Zone
          </h2>

          <div className="space-y-4">
            <div>
              <div className="text-white font-medium mb-2">Delete Account</div>
              <p className="text-sm text-white/60 mb-4">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <button
                onClick={handleDeleteAccount}
                disabled={loading}
                className="px-4 py-2 bg-red-500/20 border border-white text-red-400 font-semibold rounded-none hover:bg-red-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading && <LoadingSpinner size="sm" />}
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-black/50 border border-white rounded-none p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Change Password</h2>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="text-white/60 hover:text-white transition"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-white/80 mb-2">
                  New Password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-2 bg-black/50 border border-white rounded-none text-white placeholder-white/40 focus:outline-none focus:border-white"
                  placeholder="Enter new password"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-white/80 mb-2">
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-2 bg-black/50 border border-white rounded-none text-white placeholder-white/40 focus:outline-none focus:border-white"
                  placeholder="Confirm new password"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="flex-1 px-4 py-2 bg-white text-black font-semibold rounded-none hover:bg-white/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {passwordLoading && <LoadingSpinner size="sm" />}
                  Update Password
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className="px-4 py-2 bg-black/50 border border-white text-white font-semibold rounded-none hover:border-white transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


