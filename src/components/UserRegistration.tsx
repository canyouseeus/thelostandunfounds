/**
 * User Registration Modal
 * Collects username (author name) and Amazon storefront ID before subdomain registration
 */

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';

interface UserRegistrationProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (username: string, storefrontId: string) => void;
  required?: boolean; // If true, user cannot close without completing
}

export default function UserRegistration({ 
  isOpen, 
  onClose, 
  onSuccess,
  required = false 
}: UserRegistrationProps) {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [username, setUsername] = useState('');
  const [storefrontId, setStorefrontId] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [storefrontError, setStorefrontError] = useState('');
  const [checkingStorefront, setCheckingStorefront] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && user?.email) {
      // Set default username based on email for non-admin users
      const isAdminUser = user.email === 'thelostandunfounds@gmail.com' || user.email === 'admin@thelostandunfounds.com';
      if (isAdminUser) {
        setUsername('THE LOST+UNFOUNDS');
      } else {
        const emailUsername = user.email.split('@')[0];
        setUsername(emailUsername);
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

  const validateAmazonStorefront = (value: string): boolean => {
    if (!value || !value.trim()) {
      return false;
    }

    const trimmed = value.trim();
    
    // Check if it's a full Amazon storefront URL
    const storefrontUrlPatterns = [
      /^https?:\/\/(www\.)?amazon\.(com|co\.uk|ca|de|fr|it|es|jp|in|au|br|mx|nl|sg|ae|sa)\/(shop|stores)\/[a-zA-Z0-9_-]+/i,
      /^https?:\/\/(www\.)?amazon\.(com|co\.uk|ca|de|fr|it|es|jp|in|au|br|mx|nl|sg|ae|sa)\/.*[?&]me=([a-zA-Z0-9_-]+)/i,
    ];

    // Check if it matches any storefront URL pattern
    for (const pattern of storefrontUrlPatterns) {
      if (pattern.test(trimmed)) {
        return true;
      }
    }

    // Check if it's just a storefront ID (alphanumeric, hyphens, underscores, typically 10-20 chars)
    const storefrontIdPattern = /^[a-zA-Z0-9_-]{3,50}$/;
    if (storefrontIdPattern.test(trimmed)) {
      return true;
    }

    return false;
  };

  const extractStorefrontId = (value: string): string => {
    if (!value || !value.trim()) {
      return '';
    }

    const trimmed = value.trim();

    // If it's a URL, extract the ID
    const urlMatch = trimmed.match(/\/(shop|stores)\/([a-zA-Z0-9_-]+)/i);
    if (urlMatch && urlMatch[2]) {
      return urlMatch[2];
    }

    // Check for ?me= parameter
    const meMatch = trimmed.match(/[?&]me=([a-zA-Z0-9_-]+)/i);
    if (meMatch && meMatch[1]) {
      return meMatch[1];
    }

    // If it's just an ID, return as-is
    const storefrontIdPattern = /^[a-zA-Z0-9_-]{3,50}$/;
    if (storefrontIdPattern.test(trimmed)) {
      return trimmed;
    }

    return trimmed;
  };

  const handleStorefrontChange = (value: string) => {
    setStorefrontId(value);
    setStorefrontError('');
  };

  const handleStorefrontBlur = () => {
    if (storefrontId && !validateAmazonStorefront(storefrontId)) {
      setStorefrontError('Please enter a valid Amazon Storefront ID or URL');
    } else {
      setStorefrontError('');
    }
  };

  const handleSubmit = async () => {
    // Validate username
    if (!validateUsername(username)) {
      return;
    }

    // Validate storefront
    if (!storefrontId || !storefrontId.trim()) {
      setStorefrontError('Amazon Storefront ID is required');
      return;
    }

    if (!validateAmazonStorefront(storefrontId)) {
      setStorefrontError('Please enter a valid Amazon Storefront ID or URL');
      return;
    }

    setSaving(true);
    try {
      // Extract and normalize storefront ID
      const normalizedStorefrontId = extractStorefrontId(storefrontId);

      // Store username and storefront ID in user metadata or a user_profile table
      // For now, we'll store it in user metadata and it will be used when submitting articles
      if (user) {
        const { error } = await supabase.auth.updateUser({
          data: {
            author_name: username.trim(),
            amazon_storefront_id: normalizedStorefrontId,
          },
        });

        if (error) throw error;
      }

      success('Registration information saved!');
      onSuccess(username.trim(), normalizedStorefrontId);
      onClose();
    } catch (err: any) {
      console.error('Error saving registration:', err);
      showError(err.message || 'Failed to save registration information. Please try again.');
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
        className="bg-black/50 border border-white/10 rounded-none p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">
              Complete Your Registration
            </h2>
            <p className="text-white/60 text-sm mt-1">
              Please provide your username and Amazon storefront ID before creating your subdomain.
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
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setUsernameError('');
              }}
              onBlur={() => validateUsername(username)}
              className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-none text-white focus:border-white/30 focus:outline-none"
              placeholder="THE LOST+UNFOUNDS or Your Name"
              required
              disabled={saving}
            />
            {usernameError && (
              <p className="text-red-400 text-xs mt-1">{usernameError}</p>
            )}
            <p className="text-white/50 text-xs mt-2">
              This will be your author name displayed in articles and the Amazon Affiliate Disclosure.
            </p>
          </div>

          <div>
            <label className="block text-white/80 text-sm mb-2">
              Amazon Storefront ID or URL *
            </label>
            <input
              type="text"
              value={storefrontId}
              onChange={(e) => handleStorefrontChange(e.target.value)}
              onBlur={handleStorefrontBlur}
              className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-none text-white focus:border-white/30 focus:outline-none"
              placeholder="https://www.amazon.com/shop/yourstorefront or yourstorefront"
              required
              disabled={saving}
            />
            {storefrontError && (
              <p className="text-red-400 text-xs mt-1">{storefrontError}</p>
            )}
            {storefrontId && validateAmazonStorefront(storefrontId) && !storefrontError && (
              <p className="text-green-400 text-xs mt-1">Valid storefront format</p>
            )}
            <p className="text-white/50 text-xs mt-2">
              Enter your Amazon Associates Storefront ID or full URL. Examples:
            </p>
            <ul className="text-white/40 text-xs mt-1 list-disc list-inside space-y-1">
              <li>Full URL: <span className="font-mono text-white/60">https://www.amazon.com/shop/yourstorefront</span></li>
              <li>Storefront ID only: <span className="font-mono text-white/60">yourstorefront</span></li>
            </ul>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              onClick={handleSubmit}
              disabled={saving || !!usernameError || !!storefrontError || !username.trim() || !storefrontId.trim()}
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
