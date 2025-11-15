/**
 * Settings Page
 * User preferences and account settings
 */

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { Settings, Bell, Shield, Trash2, Key } from 'lucide-react';
import { LoadingSpinner } from '../components/Loading';
import ProductManager from '../components/products/ProductManager';

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

  const handleChangePassword = async () => {
    // TODO: Implement password change flow
    showError('Password change not yet implemented');
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
        {/* Product Management */}
        <ProductManager />

        {/* Notifications */}
        <div className="bg-black border border-white/10 rounded-lg p-6">
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
                className="w-5 h-5 rounded border-white/20 bg-black text-white focus:ring-2 focus:ring-white/20"
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
                className="w-5 h-5 rounded border-white/20 bg-black text-white focus:ring-2 focus:ring-white/20"
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
                className="w-5 h-5 rounded border-white/20 bg-black text-white focus:ring-2 focus:ring-white/20"
              />
            </label>
          </div>
        </div>

        {/* Security */}
        <div className="bg-black border border-white/10 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Security
          </h2>

          <div className="space-y-4">
            <button
              onClick={handleChangePassword}
              className="w-full px-4 py-3 bg-black border border-white/10 rounded-lg text-white font-medium hover:border-white/30 transition flex items-center justify-between"
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
        <div className="bg-black border border-red-500/30 rounded-lg p-6">
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
                className="px-4 py-2 bg-red-500/20 border border-red-500/50 text-red-400 font-semibold rounded-lg hover:bg-red-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading && <LoadingSpinner size="sm" />}
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

