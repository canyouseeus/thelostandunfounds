/**
 * SQL Scripts Page
 * Displays SQL scripts for deployment
 * Auto-locks after 5 minutes of inactivity
 */

import { useState, useEffect, useRef } from 'react';
import { useToast } from '../components/Toast';
import { Copy, Check, Clock, Lock } from 'lucide-react';

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

interface SQLScript {
  name: string;
  filename: string;
  content: string;
  description?: string;
}

export default function SQL() {
  const { success } = useToast();
  const [scripts, setScripts] = useState<SQLScript[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(INACTIVITY_TIMEOUT);
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

-- Update RLS policies to work with published field
DROP POLICY IF EXISTS "Anyone can view published posts" ON blog_posts;
CREATE POLICY "Anyone can view published posts"
  ON blog_posts
  FOR SELECT
  USING (
    published = true 
    OR (author_id IS NOT NULL AND auth.uid() = author_id)
    OR (author_id IS NULL AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND is_admin = true
    ))
  );

-- Policy: Only admins can insert posts
DROP POLICY IF EXISTS "Admins can insert posts" ON blog_posts;
CREATE POLICY "Admins can insert posts"
  ON blog_posts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND is_admin = true
    )
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid() AND email = 'admin@thelostandunfounds.com'
    )
  );

-- Policy: Only admins can update posts
DROP POLICY IF EXISTS "Admins can update posts" ON blog_posts;
CREATE POLICY "Admins can update posts"
  ON blog_posts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND is_admin = true
    )
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid() AND email = 'admin@thelostandunfounds.com'
    )
  );

-- Policy: Only admins can delete posts
DROP POLICY IF EXISTS "Admins can delete posts" ON blog_posts;
CREATE POLICY "Admins can delete posts"
  ON blog_posts
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND is_admin = true
    )
    OR EXISTS (
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

    // Track user activity
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    const handleActivity = () => {
      if (!isLocked) {
        resetTimeout();
      }
    };

    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    resetTimeout();

    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  };

  const loadScripts = async () => {
    try {
      // Load blog schema migration from public folder
      let migrationContent = '';
      try {
        const migrationResponse = await fetch('/blog-schema-migration.sql');
        if (migrationResponse.ok) {
          migrationContent = await migrationResponse.text();
        }
      } catch (fetchError) {
        console.warn('Could not fetch migration file:', fetchError);
      }

      // If file wasn't loaded, use default content
      if (!migrationContent) {
        migrationContent = await getDefaultMigrationContent();
      }

      // Load create-first-blog-post script
      let blogPostContent = '';
      try {
        const blogPostResponse = await fetch('/create-first-blog-post.sql');
        if (blogPostResponse.ok) {
          blogPostContent = await blogPostResponse.text();
        }
      } catch (fetchError) {
        console.warn('Could not fetch blog post file:', fetchError);
      }

      const loadedScripts: SQLScript[] = [
        {
          name: 'Blog Schema Migration',
          filename: 'blog-schema-migration.sql',
          content: migrationContent,
          description: 'Adds missing fields (published, SEO fields, og_image_url) to blog_posts table. Handles missing author_id column. Run this FIRST in Supabase SQL Editor.'
        },
        {
          name: 'Create First Blog Post',
          filename: 'create-first-blog-post.sql',
          content: blogPostContent || '// File not found - check public folder',
          description: 'Creates your first blog post about Cursor IDE. Run this AFTER the migration script. Works with any schema version.'
        }
      ];

      setScripts(loadedScripts);
    } catch (error) {
      console.error('Error loading SQL scripts:', error);
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
            <div className="flex items-center gap-2 text-white/60 text-sm">
              <Clock className="w-4 h-4" />
              <span>Auto-lock in: {formatTime(timeRemaining)}</span>
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
                <pre className="bg-black/50 border border-white/10 rounded-none p-4 overflow-x-auto text-white/90 text-sm font-mono whitespace-pre-wrap break-words">
                  <code>{script.content}</code>
                </pre>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
