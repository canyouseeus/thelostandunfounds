/**
 * Subdomain Registration Modal
 * Allows users to set their custom subdomain once during signup
 */

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';

interface SubdomainRegistrationProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (subdomain: string) => void;
  required?: boolean; // If true, user cannot close without setting subdomain
}

export default function SubdomainRegistration({ 
  isOpen, 
  onClose, 
  onSuccess,
  required = false 
}: SubdomainRegistrationProps) {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [subdomain, setSubdomain] = useState('');
  const [subdomainError, setSubdomainError] = useState('');
  const [checkingSubdomain, setCheckingSubdomain] = useState(false);
  const [registering, setRegistering] = useState(false);

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
        } else {
          throw error;
        }
        return;
      }

      success(`Your subdomain ${subdomain}.thelostandunfounds.com has been registered!`);
      onSuccess(subdomain.toLowerCase().trim());
      onClose();
    } catch (err: any) {
      console.error('Error registering subdomain:', err);
      showError(err.message || 'Failed to register subdomain. Please try again.');
    } finally {
      setRegistering(false);
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
              Choose Your Blog Subdomain
            </h2>
            <p className="text-white/60 text-sm mt-1">
              This will be your permanent blog URL. You can only set this once.
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
              Your Blog Subdomain *
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={subdomain}
                onChange={(e) => handleSubdomainChange(e.target.value)}
                onBlur={() => checkSubdomainAvailability(subdomain)}
                className="flex-1 px-4 py-2 bg-black/50 border border-white/10 rounded-none text-white focus:border-white/30 focus:outline-none"
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
              <p className="text-green-400 text-xs mt-1">Available</p>
            )}
            <p className="text-white/50 text-xs mt-2">
              Your blog will be available at: <span className="text-white/70 font-mono">{subdomain || 'your-blog-name'}.thelostandunfounds.com</span>
            </p>
            <p className="text-white/40 text-xs mt-1">
              • 3-63 characters • Lowercase letters, numbers, and hyphens only • Cannot start or end with hyphen
            </p>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              onClick={handleRegister}
              disabled={registering || checkingSubdomain || !!subdomainError || !subdomain}
              className="flex-1 px-6 py-2 bg-white text-black font-semibold rounded-none hover:bg-white/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {registering ? 'Registering...' : 'Register Subdomain'}
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
