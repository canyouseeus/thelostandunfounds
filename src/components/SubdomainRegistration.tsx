/**
 * Subdomain Registration Modal
 * Allows users to set their custom subdomain once during signup
 */

import { useState, useEffect } from 'react';
import { XMarkIcon, DocumentDuplicateIcon, CheckIcon } from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';

interface SubdomainRegistrationProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (subdomain: string) => void;
  required?: boolean; // If true, user cannot close without setting subdomain
  totalSteps?: number;
  currentStep?: number;
}

export default function SubdomainRegistration({
  isOpen,
  onClose,
  onSuccess,
  required = false,
  totalSteps,
  currentStep
}: SubdomainRegistrationProps) {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [subdomain, setSubdomain] = useState('');
  const [subdomainError, setSubdomainError] = useState('');
  const [checkingSubdomain, setCheckingSubdomain] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generate blog URL in path-based format (NOT subdomain)
  const blogUrl = subdomain && subdomain.length >= 3
    ? `https://www.thelostandunfounds.com/blog/${subdomain}`
    : '';

  useEffect(() => {
    if (isOpen && user?.email) {
      // Generate suggested subdomain from email
      const emailSubdomain = user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      setSubdomain(emailSubdomain);
    }
  }, [isOpen, user]);

  const validateSubdomain = (value: string): boolean => {
    const subdomainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

    if (!value) {
      setSubdomainError('Subdomain is required');
      return false;
    }

    if (value.length < 3) {
      setSubdomainError('Subdomain must be at least 3 characters');
      return false;
    }

    if (value.length > 63) {
      setSubdomainError('Subdomain must be 63 characters or less');
      return false;
    }

    if (!subdomainRegex.test(value)) {
      setSubdomainError('Subdomain can only contain lowercase letters, numbers, and hyphens. Cannot start or end with a hyphen.');
      return false;
    }

    const reserved = ['www', 'api', 'admin', 'blog', 'mail', 'ftp', 'localhost', 'test', 'staging', 'dev', 'app', 'thelostarchives', 'thelostandunfounds'];
    if (reserved.includes(value.toLowerCase())) {
      setSubdomainError('This subdomain is reserved and cannot be used');
      return false;
    }

    setSubdomainError('');
    return true;
  };

  const checkSubdomainAvailability = async (value: string): Promise<boolean> => {
    if (!validateSubdomain(value)) {
      return false;
    }

    setCheckingSubdomain(true);
    try {
      // Check if subdomain is already taken
      const [subdomainsResult, postsResult, submissionsResult] = await Promise.all([
        supabase
          .from('user_subdomains')
          .select('id')
          .eq('subdomain', value.toLowerCase())
          .limit(1),
        supabase
          .from('blog_posts')
          .select('id')
          .eq('subdomain', value.toLowerCase())
          .limit(1),
        supabase
          .from('blog_submissions')
          .select('id')
          .eq('subdomain', value.toLowerCase())
          .limit(1)
      ]);

      // Handle table not found error gracefully
      if (subdomainsResult.error) {
        if (subdomainsResult.error.message?.includes('does not exist') || subdomainsResult.error.message?.includes('schema cache')) {
          // Table doesn't exist - allow registration to proceed (will fail on insert if table missing)
          console.warn('user_subdomains table not found. Please run the SQL migration script.');
        } else {
          console.error('Error checking subdomain availability:', subdomainsResult.error);
        }
      }

      if (subdomainsResult.data && subdomainsResult.data.length > 0) {
        setSubdomainError('This subdomain is already taken');
        setCheckingSubdomain(false);
        return false;
      }

      if (postsResult.data && postsResult.data.length > 0) {
        setSubdomainError('This subdomain is already taken');
        setCheckingSubdomain(false);
        return false;
      }

      if (submissionsResult.data && submissionsResult.data.length > 0) {
        setSubdomainError('This subdomain is already taken');
        setCheckingSubdomain(false);
        return false;
      }

      setSubdomainError('');
      return true;
    } catch (err) {
      console.error('Error checking subdomain:', err);
      setSubdomainError('Could not verify subdomain availability. Please try again.');
      return false;
    } finally {
      setCheckingSubdomain(false);
    }
  };

  const handleSubdomainChange = (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSubdomain(cleaned);
    setSubdomainError('');
  };

  const handleRegister = async () => {
    if (!user) {
      showError('You must be logged in');
      return;
    }

    const isAvailable = await checkSubdomainAvailability(subdomain);
    if (!isAvailable) {
      return;
    }

    setRegistering(true);
    try {
      // Register the subdomain
      const { error } = await supabase
        .from('user_subdomains')
        .insert([{
          user_id: user.id,
          subdomain: subdomain.toLowerCase().trim(),
        }]);

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          setSubdomainError('This subdomain is already taken');
        } else if (error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
          setSubdomainError('The user_subdomains table has not been created yet. Please contact an administrator to run the SQL migration script.');
          showError('Database table missing. Please run the SQL migration script in Supabase.');
        } else {
          throw error;
        }
        setRegistering(false);
        return;
      }

      const registeredSubdomain = subdomain.toLowerCase().trim();
      success(`Your blog URL ${blogUrl} has been registered!`);
      onSuccess(registeredSubdomain);
      onClose();
    } catch (err: any) {
      console.error('Error registering subdomain:', err);
      if (err?.message?.includes('does not exist') || err?.message?.includes('schema cache')) {
        setSubdomainError('The user_subdomains table has not been created yet. Please contact an administrator to run the SQL migration script.');
        showError('Database table missing. Please run the SQL migration script in Supabase.');
      } else {
        showError(err.message || 'Failed to register subdomain. Please try again.');
      }
    } finally {
      setRegistering(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 py-8 sm:py-12 overflow-y-auto"
      onClick={required ? undefined : onClose}
    >
      <div
        className="bg-black/50 rounded-none p-8 w-full max-w-lg mx-4 animate-fade-in max-h-[calc(100vh-4rem)] sm:max-h-[calc(100vh-6rem)] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4 sm:mb-6 gap-2">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Choose Your Blog Subdomain
            </h2>
            <p className="text-white/60 text-xs sm:text-sm mt-1">
              {totalSteps && currentStep ? `Step ${currentStep} of ${totalSteps}: ` : ''}
              This will be your permanent blog URL. You can only set this once.
            </p>
          </div>
          {!required && (
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition"
              aria-label="Close"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-white/80 text-sm mb-2">
              Your Blog Subdomain *
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={subdomain}
                onChange={(e) => handleSubdomainChange(e.target.value)}
                onBlur={() => checkSubdomainAvailability(subdomain)}
                className="flex-1 px-4 py-2 bg-black/50 rounded-none text-white focus:outline-none"
                placeholder="your-blog-name"
                required
                disabled={registering}
              />
              <span className="text-white/60 text-sm whitespace-nowrap">.thelostandunfounds.com</span>
            </div>
            {subdomainError && (
              <p className="text-red-400 text-xs mt-1">{subdomainError}</p>
            )}
            {checkingSubdomain && (
              <p className="text-white/50 text-xs mt-1">Checking availability...</p>
            )}
            {!subdomainError && subdomain && !checkingSubdomain && (
              <p className="text-green-400 text-xs mt-1 flex items-center gap-1">
                <CheckIcon className="w-3 h-3" />
                Available
              </p>
            )}

            {/* Display CORRECT path-based URL */}
            {blogUrl && !subdomainError && (
              <div className="mt-4 p-3 sm:p-4 bg-black/30 rounded-none">
                <p className="text-xs sm:text-sm text-white/60 mb-2">Your blog will be available at:</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={blogUrl}
                    readOnly
                    className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-black/50 rounded-none text-white text-xs sm:text-sm font-mono"
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
                    className="bg-white text-black px-4 py-2 sm:py-3 rounded-none hover:bg-white/90 transition-colors font-semibold flex items-center justify-center gap-2 text-sm"
                  >
                    {copied ? (
                      <>
                        <CheckIcon className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <DocumentDuplicateIcon className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            <p className="text-white/40 text-xs mt-2">
              • 3-63 characters • Lowercase letters, numbers, and hyphens only • Cannot start or end with hyphen
            </p>
          </div>

          {/* Amazon Associates Instructions */}
          {blogUrl && !subdomainError && (
            <div className="bg-blue-500/10 rounded-none p-3 sm:p-4">
              <h3 className="text-sm sm:text-base font-bold text-blue-400 mb-2 flex items-center gap-2">
                📋 For Amazon Associates Registration
              </h3>
              <p className="text-white/80 text-xs sm:text-sm mb-3">
                Copy your blog URL above and use it when registering with Amazon Associates:
              </p>
              <ol className="text-white/80 text-xs space-y-1.5 list-decimal list-inside mb-3">
                <li>Click the "Copy" button above to copy your blog URL</li>
                <li>Go to your Amazon Associates account</li>
                <li>When asked for your website URL, paste:
                  <code className="block mt-1.5 px-2 py-1.5 bg-black/50 rounded-none font-mono text-xs break-all">
                    {blogUrl}
                  </code>
                </li>
                <li>Complete your Amazon Associates registration</li>
              </ol>
              <div className="bg-yellow-500/10 rounded-none p-2 sm:p-2.5 mt-3">
                <p className="text-yellow-400 text-xs font-semibold mb-1">💡 Important:</p>
                <p className="text-white/70 text-xs">
                  Use the full URL shown above (<code className="bg-black/50 px-1 py-0.5 rounded-none break-all">{blogUrl}</code>) when registering with Amazon Associates. This is your permanent blog URL.
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
            <button
              onClick={handleRegister}
              disabled={registering || checkingSubdomain || !!subdomainError || !subdomain}
              className="flex-1 px-4 sm:px-6 py-2 bg-white text-black font-semibold rounded-none hover:bg-white/90 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {registering ? 'Registering...' : 'Register Subdomain'}
            </button>
            {!required && (
              <button
                onClick={onClose}
                className="px-4 sm:px-6 py-2 bg-white/10 hover:bg-white/20 rounded text-white transition text-sm sm:text-base"
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
