/**
 * SQL Scripts Page
 * Displays SQL scripts for deployment
 * Auto-locks after 5 minutes of inactivity
 */

import { useState, useEffect, useRef } from 'react';
import { useToast } from '../components/Toast';
import { Copy, Check, Clock, Lock, RefreshCw } from 'lucide-react';

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

interface SQLScript {
  name: string;
  filename: string;
  content: string;
  description?: string;
  modified?: string;
  modifiedRelative?: string;
}

export default function SQL() {
  const { success } = useToast();
  const [scripts, setScripts] = useState<SQLScript[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(INACTIVITY_TIMEOUT);
  const [isLoading, setIsLoading] = useState(false);
  const lastActivityRef = useRef<number>(Date.now());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const getDefaultMigrationContent = async () => {
    // Try to load from file first
    try {
      const response = await fetch('/blog-schema-migration.sql');
      if (response.ok) {
        return await response.text();
      }
    } catch (e) {
      // Fall through to default
    }
    
    // Return the updated migration content
    return `-- Migration: Add missing fields to blog_posts table
-- Run this in Supabase SQL Editor to add SEO fields and published boolean
-- This migrates the existing blog_posts table to support the new blog functionality

-- First, ensure author_id column exists (it might not if table was created differently)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'blog_posts' AND column_name = 'author_id'
  ) THEN
    ALTER TABLE blog_posts 
    ADD COLUMN author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    
    -- Set author_id to NULL for existing posts (can be updated later)
    UPDATE blog_posts SET author_id = NULL WHERE author_id IS NULL;
  END IF;
END $$;

-- Add published boolean field (derived from status)
ALTER TABLE blog_posts 
ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT false;

-- Update published field based on existing status
UPDATE blog_posts 
SET published = (status = 'published')
WHERE published IS NULL OR published = false;

-- Make published field NOT NULL after setting values
ALTER TABLE blog_posts 
ALTER COLUMN published SET NOT NULL,
ALTER COLUMN published SET DEFAULT false;

-- Add SEO fields
ALTER TABLE blog_posts 
ADD COLUMN IF NOT EXISTS seo_title TEXT,
ADD COLUMN IF NOT EXISTS seo_description TEXT,
ADD COLUMN IF NOT EXISTS seo_keywords TEXT;

-- Add og_image_url field (alternative to featured_image)
ALTER TABLE blog_posts 
ADD COLUMN IF NOT EXISTS og_image_url TEXT;

-- Create index on published field for faster queries
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_boolean ON blog_posts(published);

-- Create a trigger to keep status and published in sync
CREATE OR REPLACE FUNCTION sync_blog_post_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If status changes, update published
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status != OLD.status THEN
      NEW.published = (NEW.status = 'published');
    END IF;
  END IF;
  
  -- If published changes, update status
  IF NEW.published != OLD.published THEN
    IF NEW.published = true THEN
      NEW.status = 'published';
      -- Set published_at if not already set
      IF NEW.published_at IS NULL THEN
        NEW.published_at = NOW();
      END IF;
    ELSE
      NEW.status = 'draft';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS sync_blog_post_status_trigger ON blog_posts;
CREATE TRIGGER sync_blog_post_status_trigger
  BEFORE INSERT OR UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION sync_blog_post_status();

-- Drop ALL existing policies to start fresh and avoid conflicts
-- Drop all possible policy names that might exist
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Drop all policies on blog_posts table
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'blog_posts' AND schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON blog_posts', r.policyname);
  END LOOP;
END $$;

-- Policy: Anyone can view published posts (using published field)
-- NO user_roles check - completely avoids recursion
CREATE POLICY "Anyone can view published posts"
  ON blog_posts
  FOR SELECT
  USING (
    -- Anonymous users can read published posts
    published = true
    -- OR authenticated users who are the author can read their own posts (even if not published)
    OR (auth.uid() IS NOT NULL AND author_id IS NOT NULL AND auth.uid() = author_id)
  );

-- Policy: Only admins can insert posts
-- Check email directly - NO user_roles table access
CREATE POLICY "Admins can insert posts"
  ON blog_posts
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid() AND email = 'admin@thelostandunfounds.com'
    )
  );

-- Policy: Only admins can update posts
-- Check email directly - NO user_roles table access
CREATE POLICY "Admins can update posts"
  ON blog_posts
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid() AND email = 'admin@thelostandunfounds.com'
    )
  );

-- Policy: Only admins can delete posts
-- Check email directly - NO user_roles table access
CREATE POLICY "Admins can delete posts"
  ON blog_posts
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid() AND email = 'admin@thelostandunfounds.com'
    )
  );

-- Grant permissions
GRANT SELECT ON blog_posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON blog_posts TO authenticated;

-- Ensure table is in publication for realtime (if needed)
DO $$
BEGIN
  -- Check if table is already in publication before adding
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'blog_posts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE blog_posts;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;`;
  };

  const startActivityTracking = () => {
    try {
      const resetTimeout = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);

        lastActivityRef.current = Date.now();
        setIsLocked(false);
        setTimeRemaining(INACTIVITY_TIMEOUT);

        // Start countdown
        countdownRef.current = setInterval(() => {
          const elapsed = Date.now() - lastActivityRef.current;
          const remaining = Math.max(0, INACTIVITY_TIMEOUT - elapsed);
          setTimeRemaining(remaining);

          if (remaining === 0) {
            setIsLocked(true);
            if (countdownRef.current) clearInterval(countdownRef.current);
          }
        }, 1000);

        // Set lock timeout
        timeoutRef.current = setTimeout(() => {
          setIsLocked(true);
          if (countdownRef.current) clearInterval(countdownRef.current);
        }, INACTIVITY_TIMEOUT);
      };

      // Track user activity - use touch events for iPad
      const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'touchmove', 'click'];
      const handleActivity = () => {
        if (!isLocked) {
          resetTimeout();
        }
      };

      activityEvents.forEach(event => {
        try {
          document.addEventListener(event, handleActivity, { passive: true });
        } catch (e) {
          // Ignore errors for unsupported events
        }
      });

      resetTimeout();

      return () => {
        activityEvents.forEach(event => {
          try {
            document.removeEventListener(event, handleActivity);
          } catch (e) {
            // Ignore cleanup errors
          }
        });
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
      };
    } catch (error) {
      console.error('Error setting up activity tracking:', error);
      // Don't break the component if activity tracking fails
      return () => {};
    }
  };

  const loadScripts = async () => {
    setIsLoading(true);
    try {
      // Fetch the most recent SQL file from the API
      const response = await fetch('/api/sql/latest');
      
      if (!response.ok) {
        // Try to parse error details from response
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          if (errorData.details) {
            errorMessage += ` - ${errorData.details}`;
          }
        } catch {
          // If response isn't JSON, use status text
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // Validate response data
      if (!data.filename || !data.content) {
        throw new Error('Invalid response format from API');
      }
      
      // Format the filename as a display name (remove extension, capitalize words)
      const displayName = data.filename
        .replace(/\.sql$/i, '')
        .replace(/[-_]/g, ' ')
        .split(' ')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

      const loadedScripts: SQLScript[] = [
        {
          name: displayName,
          filename: data.filename,
          content: data.content,
          description: `Most recently published SQL file${data.modifiedRelative ? ` (${data.modifiedRelative})` : ''}`,
          modified: data.modified,
          modifiedRelative: data.modifiedRelative
        }
      ];

      setScripts(loadedScripts);
    } catch (error) {
      console.error('Error loading latest SQL script:', error);
      // Fallback: show error message with retry option
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setScripts([{
        name: 'Error Loading SQL',
        filename: 'error',
        content: `Failed to load the latest SQL file.\n\nError: ${errorMessage}\n\nPlease check the API endpoint or try refreshing the page.`,
        description: 'Click the refresh button or reload the page to try again.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadScripts();
    startActivityTracking();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const handleUnlock = () => {
    lastActivityRef.current = Date.now();
    setIsLocked(false);
    setTimeRemaining(INACTIVITY_TIMEOUT);
    startActivityTracking();
  };

  const copyToClipboard = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      success('SQL script copied to clipboard!');
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">
          SQL Scripts
        </h1>
        <div className="flex items-center justify-between">
          <p className="text-white/70">Database migration and setup scripts</p>
          {!isLocked && (
            <div className="flex items-center gap-4">
              <button
                onClick={loadScripts}
                disabled={isLoading}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded text-white text-sm transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh SQL scripts"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <div className="flex items-center gap-2 text-white/60 text-sm">
                <Clock className="w-4 h-4" />
                <span>Auto-lock in: {formatTime(timeRemaining)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lock Screen */}
      {isLocked && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-black/50 border border-white/10 rounded-none p-8 max-w-md w-full mx-4">
            <div className="flex flex-col items-center text-center">
              <Lock className="w-16 h-16 text-yellow-400 mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Session Locked</h2>
              <p className="text-white/70 mb-6">
                This page has been locked due to inactivity. Click below to unlock.
              </p>
              <button
                onClick={handleUnlock}
                className="px-6 py-3 bg-white text-black font-semibold rounded-none hover:bg-white/90 transition"
              >
                Unlock Page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scripts List */}
      {!isLocked && (
        <div className="space-y-6">
          {scripts.length === 0 ? (
            <div className="bg-black/50 border border-white/10 rounded-none p-6">
              <p className="text-white/60">No SQL scripts found.</p>
            </div>
          ) : (
            scripts.map((script, index) => (
              <div
                key={index}
                className="bg-black/50 border border-white/10 rounded-none p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-1">{script.name}</h2>
                    <p className="text-white/60 text-sm mb-2">{script.filename}</p>
                    {script.description && (
                      <p className="text-white/70 text-sm">{script.description}</p>
                    )}
                    {script.modified && (
                      <p className="text-white/50 text-xs mt-1">
                        Modified: {new Date(script.modified).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => copyToClipboard(script.content, index)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded text-white text-sm transition flex items-center gap-2"
                  >
                    {copiedIndex === index ? (
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
                <pre className="bg-black/50 border border-white/10 rounded-none p-4 overflow-x-auto text-white/90 text-sm font-mono whitespace-pre-wrap break-words text-left">
                  <code className="text-left">{script.content}</code>
                </pre>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
