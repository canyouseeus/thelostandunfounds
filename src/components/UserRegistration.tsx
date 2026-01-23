/**
 * User Registration Modal
 * Collects username (author name) - first step in registration
 */

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';

interface UserRegistrationProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (username: string) => void; // Only returns username now
  required?: boolean; // If true, user cannot close without completing
  totalSteps?: number;
  currentStep?: number;
}

export default function UserRegistration({
  isOpen,
  onClose,
  onSuccess,
  required = false,
  totalSteps,
  currentStep
}: UserRegistrationProps) {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      // Check if user already has username
      const userMetadata = user.user_metadata || {};
      const existingUsername = userMetadata.author_name;

      // If already set, populate field (read-only mode)
      if (existingUsername) {
        setUsername(existingUsername);
      } else {
        // Set default username based on email for non-admin users
        const isAdminUser = user.email === 'thelostandunfounds@gmail.com' || user.email === 'admin@thelostandunfounds.com';
        if (isAdminUser) {
          setUsername('THE LOST+UNFOUNDS');
        } else {
          const emailUsername = user.email?.split('@')[0] || '';
          setUsername(emailUsername);
        }
      }
    }
  }, [isOpen, user]);

  const validateUsername = (value: string): boolean => {
    if (!value || !value.trim()) {
      setUsernameError('Username is required');
      return false;
    }

    if (value.trim().length < 2) {
      setUsernameError('Username must be at least 2 characters');
      return false;
    }

    if (value.trim().length > 100) {
      setUsernameError('Username must be 100 characters or less');
      return false;
    }

    setUsernameError('');
    return true;
  };


  const handleSubmit = async () => {
    // Check if already set - if so, just proceed without saving
    const userMetadata = user?.user_metadata || {};
    const existingUsername = userMetadata.author_name;

    if (existingUsername) {
      // Already set, just proceed
      onSuccess(existingUsername);
      onClose();
      return;
    }

    // Validate username
    if (!validateUsername(username)) {
      return;
    }

    setSaving(true);
    try {
      // Store username in user metadata
      // This can only be set once
      if (user) {
        const { error } = await supabase.auth.updateUser({
          data: {
            author_name: username.trim(),
          },
        });

        if (error) throw error;
      }

      success('Username saved!');
      onSuccess(username.trim());
      onClose();
    } catch (err: any) {
      console.error('Error saving username:', err);
      showError(err.message || 'Failed to save username. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={required ? undefined : onClose}
    >
      <div
        className="bg-black/50 rounded-none p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">
              Choose Your Username
            </h2>
            <p className="text-white/60 text-sm mt-1">
              {totalSteps && currentStep ? `Step ${currentStep} of ${totalSteps}: ` : ''}
              Choose your author name. Next, you'll create your blog subdomain, then register your Amazon storefront.
            </p>
          </div>
          {!required && (
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-white/80 text-sm mb-2">
              Username (Author Name) *
              {user?.user_metadata?.author_name && (
                <span className="text-white/50 text-xs font-normal ml-2">(Cannot be changed)</span>
              )}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                // Prevent changes if already set
                if (user?.user_metadata?.author_name) {
                  return;
                }
                setUsername(e.target.value);
                setUsernameError('');
              }}
              onBlur={() => validateUsername(username)}
              className="w-full px-4 py-2 bg-black/50 rounded-none text-white focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="THE LOST+UNFOUNDS or Your Name"
              required
              disabled={saving || !!user?.user_metadata?.author_name}
              readOnly={!!user?.user_metadata?.author_name}
            />
            {usernameError && (
              <p className="text-red-400 text-xs mt-1">{usernameError}</p>
            )}
            {user?.user_metadata?.author_name && (
              <p className="text-yellow-400 text-xs mt-1">This value is set and cannot be changed.</p>
            )}
            <p className="text-white/50 text-xs mt-2">
              This will be your author name displayed in articles and the Amazon Affiliate Disclosure.
            </p>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              onClick={handleSubmit}
              disabled={saving || !!usernameError || !username.trim()}
              className="flex-1 px-6 py-2 bg-white text-black font-semibold rounded-none hover:bg-white/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Continue'}
            </button>
            {!required && (
              <button
                onClick={onClose}
                className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded text-white transition"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
