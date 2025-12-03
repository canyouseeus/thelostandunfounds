/**
 * Storefront Registration Modal
 * Collects Amazon storefront ID after subdomain is created
 */

import { useState, useEffect } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';

interface StorefrontRegistrationProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (storefrontId: string) => void;
  subdomain: string; // User's subdomain URL
  required?: boolean; // If true, user cannot close without completing
}

export default function StorefrontRegistration({ 
  isOpen, 
  onClose, 
  onSuccess,
  subdomain,
  required = false 
}: StorefrontRegistrationProps) {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [storefrontId, setStorefrontId] = useState('');
  const [storefrontError, setStorefrontError] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      // Check if user already has storefront ID
      const userMetadata = user.user_metadata || {};
      const existingStorefrontId = userMetadata.amazon_storefront_id;
      if (existingStorefrontId) {
        setStorefrontId(existingStorefrontId);
      }
    }
  }, [isOpen, user]);

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
    // Prevent changes if already set
    if (user?.user_metadata?.amazon_storefront_id) {
      return;
    }
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
    // Check if already set - if so, just proceed without saving
    const userMetadata = user?.user_metadata || {};
    const existingStorefrontId = userMetadata.amazon_storefront_id;

    if (existingStorefrontId) {
      // Already set, just proceed
      onSuccess(existingStorefrontId);
      onClose();
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

      // Store storefront ID in user metadata
      if (user) {
        const { error } = await supabase.auth.updateUser({
          data: {
            amazon_storefront_id: normalizedStorefrontId,
          },
        });

        if (error) throw error;
      }

      success('Amazon Storefront ID saved!');
      onSuccess(normalizedStorefrontId);
      onClose();
    } catch (err: any) {
      console.error('Error saving storefront ID:', err);
      showError(err.message || 'Failed to save Amazon Storefront ID. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  // Generate blog URL in path-based format (NOT subdomain)
  const blogUrl = subdomain ? `https://www.thelostandunfounds.com/blog/${subdomain}` : '';

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={required ? undefined : onClose}
    >
      <div 
        className="bg-black/50 border border-white rounded-none p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">
              Register Your Amazon Storefront
            </h2>
            <p className="text-white/60 text-sm mt-1">
              Now that you have your blog URL, you can register it with Amazon Associates.
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
          {blogUrl && (
            <div className="bg-green-900/20 border border-white rounded-none p-4">
              <p className="text-white/80 text-sm mb-2">Your Blog URL:</p>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={blogUrl}
                  readOnly
                  className="flex-1 px-4 py-2 bg-black/50 border border-white rounded-none text-white text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(blogUrl);
                      setCopied(true);
                      success('Blog URL copied to clipboard!');
                      setTimeout(() => setCopied(false), 2000);
                    } catch (err) {
                      showError('Failed to copy URL. Please copy manually.');
                    }
                  }}
                  className="bg-white text-black px-4 py-2 rounded-none hover:bg-white/90 transition-colors font-semibold flex items-center gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <div className="bg-blue-500/10 border border-white rounded-none p-3 mt-3">
                <p className="text-blue-300 text-xs font-semibold mb-1.5">📋 For Amazon Associates Registration:</p>
                <ol className="text-white/80 text-xs space-y-1 list-decimal list-inside">
                  <li>Click the "Copy" button above to copy your blog URL</li>
                  <li>Go to <a href="https://affiliate-program.amazon.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">affiliate-program.amazon.com</a></li>
                  <li>When asked for your website URL, paste: <code className="block mt-1 px-2 py-1 bg-black/50 border border-white rounded-none font-mono text-xs break-all">{blogUrl}</code></li>
                  <li>Complete your Amazon Associates registration</li>
                </ol>
              </div>
            </div>
          )}

          <div>
            <label className="block text-white/80 text-sm mb-2">
              Amazon Storefront ID or URL *
              {user?.user_metadata?.amazon_storefront_id && (
                <span className="text-white/50 text-xs font-normal ml-2">(Cannot be changed)</span>
              )}
            </label>
            <input
              type="text"
              value={storefrontId}
              onChange={(e) => handleStorefrontChange(e.target.value)}
              onBlur={handleStorefrontBlur}
              className="w-full px-4 py-2 bg-black/50 border border-white rounded-none text-white focus:border-white focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="https://www.amazon.com/shop/yourstorefront or yourstorefront"
              required
              disabled={saving || !!user?.user_metadata?.amazon_storefront_id}
              readOnly={!!user?.user_metadata?.amazon_storefront_id}
            />
            {storefrontError && (
              <p className="text-red-400 text-xs mt-1">{storefrontError}</p>
            )}
            {storefrontId && validateAmazonStorefront(storefrontId) && !storefrontError && (
              <p className="text-green-400 text-xs mt-1">Valid storefront format</p>
            )}
            {user?.user_metadata?.amazon_storefront_id && (
              <p className="text-yellow-400 text-xs mt-1">This value is set and cannot be changed.</p>
            )}
            <p className="text-white/50 text-xs mt-2">
              After registering with Amazon Associates using your blog URL above, enter your Storefront ID here. Examples:
            </p>
            <ul className="text-white/40 text-xs mt-1 list-disc list-inside space-y-1">
              <li>Full URL: <span className="font-mono text-white/60">https://www.amazon.com/shop/yourstorefront</span></li>
              <li>Storefront ID only: <span className="font-mono text-white/60">yourstorefront</span></li>
            </ul>
          </div>

          <div className="bg-blue-900/20 border border-white rounded-none p-3">
            <p className="text-blue-300 text-xs">
              <strong>Don't have an Amazon Associates account yet?</strong> Register at <a href="https://affiliate-program.amazon.com/" target="_blank" rel="noopener noreferrer" className="underline">affiliate-program.amazon.com</a> using your blog URL: <span className="font-mono">{blogUrl}</span>
            </p>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              onClick={handleSubmit}
              disabled={saving || !!storefrontError || !storefrontId.trim()}
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
