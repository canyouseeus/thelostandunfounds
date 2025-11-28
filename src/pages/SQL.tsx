/**
 * SQL Scripts Page
 * Displays SQL scripts for deployment
 * Auto-locks after 5 minutes of inactivity
 */

import { useState, useEffect, useRef } from 'react';
import { useToast } from '../components/Toast';
import { Copy, Check, Clock, Lock } from 'lucide-react';

// Extend window for debug logs
declare global {
  interface Window {
    __DEBUG_LOGS__?: Array<{
      type: string;
      message: string;
      stack?: string;
      timestamp: string;
    }>;
  }
}

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

interface SQLScript {
  name: string;
  filename: string;
  content: string;
  description?: string;
  modified?: string;
  modifiedRelative?: string;
  createdAt: number; // Timestamp when script was added
}

export default function SQL() {
  // Initialize debug logging immediately
  if (typeof window !== 'undefined' && !window.__DEBUG_LOGS__) {
    window.__DEBUG_LOGS__ = [];
  }
  
  const logToDebug = (type: 'log' | 'error' | 'warn' | 'info', message: string, details?: any) => {
    if (typeof window !== 'undefined') {
      if (!window.__DEBUG_LOGS__) {
        window.__DEBUG_LOGS__ = [];
      }
      window.__DEBUG_LOGS__.push({
        type,
        message: typeof message === 'string' ? message : JSON.stringify(message),
        stack: details?.stack || (details ? JSON.stringify(details, null, 2) : undefined),
        timestamp: new Date().toISOString()
      });
    }
    console[type](`[SQL Page]`, message, details || '');
  };

  logToDebug('info', 'SQL component rendering...');
  
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
    try {
      logToDebug('info', 'Starting to load SQL scripts...');
      const now = Date.now();
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      
      // Get or create script timestamps from localStorage (24-hour timer starts from first view)
      const getScriptTimestamp = (filename: string): number => {
        const storageKey = `sql_script_${filename}_timestamp`;
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          return parseInt(stored, 10);
        }
        // First time seeing this script - set timestamp to now
        localStorage.setItem(storageKey, now.toString());
        return now;
      };
      
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

      // Load create-blog-post-all-for-a-dream script
      let allForADreamContent = '';
      try {
        const allForADreamResponse = await fetch('/sql/create-blog-post-all-for-a-dream.sql');
        if (allForADreamResponse.ok) {
          allForADreamContent = await allForADreamResponse.text();
        }
      } catch (fetchError) {
        console.warn('Could not fetch All For A Dream blog post file:', fetchError);
      }

      // Load create-blog-post-artificial-intelligence-the-job-killer script
      let aiJobKillerContent = '';
      try {
        const aiJobKillerResponse = await fetch('/sql/create-blog-post-artificial-intelligence-the-job-killer.sql');
        if (aiJobKillerResponse.ok) {
          const contentType = aiJobKillerResponse.headers.get('content-type');
          aiJobKillerContent = await aiJobKillerResponse.text();
          console.log('AI Job Killer script loaded:', {
            ok: aiJobKillerResponse.ok,
            contentType,
            contentLength: aiJobKillerContent.length,
            startsWithSQL: aiJobKillerContent.trim().startsWith('--')
          });
        } else {
          console.warn('AI Job Killer script fetch failed:', aiJobKillerResponse.status, aiJobKillerResponse.statusText);
        }
      } catch (fetchError) {
        console.error('Could not fetch Artificial Intelligence: The Job Killer blog post file:', fetchError);
      }

      // Load create-blog-post-our-tech-stack script
      let techStackContent = '';
      try {
        const techStackResponse = await fetch('/sql/create-blog-post-our-tech-stack.sql');
        if (techStackResponse.ok) {
          const contentType = techStackResponse.headers.get('content-type');
          techStackContent = await techStackResponse.text();
          console.log('Tech Stack script loaded:', {
            ok: techStackResponse.ok,
            contentType,
            contentLength: techStackContent.length,
            startsWithSQL: techStackContent.trim().startsWith('--')
          });
        } else {
          console.warn('Tech Stack script fetch failed:', techStackResponse.status, techStackResponse.statusText);
        }
      } catch (fetchError) {
        console.error('Could not fetch Our Tech Stack blog post file:', fetchError);
      }

      // Load check-blog-post-exists script (with fallback)
      let checkPostContent = '';
      try {
        const checkPostResponse = await fetch('/sql/check-blog-post-exists.sql');
        if (checkPostResponse.ok) {
          const text = await checkPostResponse.text();
          // Check if we got HTML instead of SQL
          if (!text.trim().startsWith('<!')) {
            checkPostContent = text;
          }
        }
      } catch (fetchError) {
        console.warn('Could not fetch check-blog-post-exists file:', fetchError);
      }
      
      // Fallback: embed the diagnostic script directly
      if (!checkPostContent || checkPostContent.includes('File not found') || checkPostContent.trim().startsWith('<!')) {
        checkPostContent = `-- Check if the blog post exists and its status
-- Run this in Supabase SQL Editor to diagnose why posts aren't showing

SELECT 
  id,
  title,
  slug,
  published,
  status,
  published_at,
  created_at,
  CASE 
    WHEN published = true THEN '✅ Published'
    WHEN published = false THEN '❌ Not Published'
    ELSE '⚠️ Published field is NULL'
  END as publish_status,
  CASE
    WHEN status = 'published' THEN '✅ Status Published'
    ELSE '❌ Status: ' || COALESCE(status, 'NULL')
  END as status_check
FROM blog_posts
WHERE slug = 'artificial-intelligence-the-job-killer'
ORDER BY created_at DESC;

-- Also check all posts
SELECT 
  COUNT(*) as total_posts,
  COUNT(*) FILTER (WHERE published = true) as published_count,
  COUNT(*) FILTER (WHERE status = 'published') as status_published_count,
  COUNT(*) FILTER (WHERE published = true AND status = 'published') as both_published_count
FROM blog_posts;`;
      }

      // Load update-blog-post-if-exists script (with fallback)
      let updatePostContent = '';
      try {
        const updatePostResponse = await fetch('/sql/update-blog-post-if-exists.sql');
        if (updatePostResponse.ok) {
          const text = await updatePostResponse.text();
          // Check if we got HTML instead of SQL
          if (!text.trim().startsWith('<!')) {
            updatePostContent = text;
          }
        }
      } catch (fetchError) {
        console.warn('Could not fetch update-blog-post-if-exists file:', fetchError);
      }
      
      // Fallback: embed the update script directly (truncated for brevity, full version in file)
      if (!updatePostContent || updatePostContent.includes('File not found') || updatePostContent.trim().startsWith('<!')) {
        updatePostContent = `-- Update the blog post if it already exists
-- Run this if the INSERT said "success" but no rows were returned

UPDATE blog_posts
SET
  published = true,
  status = 'published',
  published_at = COALESCE(published_at, NOW()),
  updated_at = NOW()
WHERE slug = 'artificial-intelligence-the-job-killer'
  AND (published = false OR published IS NULL OR status != 'published');

-- Verify the update
SELECT 
  id,
  title,
  slug,
  published,
  status,
  published_at
FROM blog_posts
WHERE slug = 'artificial-intelligence-the-job-killer';`;
      }

      const allScripts: SQLScript[] = [
        {
          name: 'Blog Schema Migration',
          filename: 'blog-schema-migration.sql',
          content: migrationContent,
          description: 'Adds missing fields (published, SEO fields, og_image_url) to blog_posts table. Handles missing author_id column. Run this FIRST in Supabase SQL Editor.',
          createdAt: getScriptTimestamp('blog-schema-migration.sql')
        },
        {
          name: 'Our Tech Stack: Building with Creativity and Autonomy',
          filename: 'create-blog-post-our-tech-stack.sql',
          content: techStackContent || '// File not found - check public/sql folder',
          description: 'Creates the blog post "Our Tech Stack: Building with Creativity and Autonomy" - an overview of the technology stack powering THE LOST+UNFOUNDS platform. From front-end deployment with Vercel to back-end infrastructure with Supabase and Railway. Run this AFTER the migration script. Works with any schema version.',
          createdAt: getScriptTimestamp('create-blog-post-our-tech-stack.sql')
        },
        {
          name: 'Create First Blog Post',
          filename: 'create-first-blog-post.sql',
          content: blogPostContent || '// File not found - check public folder',
          description: 'Creates your first blog post about Cursor IDE. Run this AFTER the migration script. Works with any schema version.',
          createdAt: getScriptTimestamp('create-first-blog-post.sql')
        },
        {
          name: 'ALL FOR A DREAM',
          filename: 'create-blog-post-all-for-a-dream.sql',
          content: allForADreamContent || '// File not found - check public/sql folder',
          description: 'Creates the blog post "ALL FOR A DREAM" - a personal reflection on resilience, change, and the pursuit of a dream. Run this AFTER the migration script. Works with any schema version.',
          createdAt: getScriptTimestamp('create-blog-post-all-for-a-dream.sql')
        },
        {
          name: 'Artificial Intelligence: The Job Killer',
          filename: 'create-blog-post-artificial-intelligence-the-job-killer.sql',
          content: aiJobKillerContent || '// File not found - check public/sql folder',
          description: 'Creates the blog post "Artificial Intelligence: The Job Killer" - a reflection on how AI, like technological progress throughout history, frees humanity from repetitive tasks and opens new possibilities. Run this AFTER the migration script. Works with any schema version.',
          createdAt: getScriptTimestamp('create-blog-post-artificial-intelligence-the-job-killer.sql')
        },
        {
          name: 'Check Blog Post Exists',
          filename: 'check-blog-post-exists.sql',
          content: checkPostContent || '// File not found - check public/sql folder',
          description: 'Diagnostic script to check if a blog post exists and verify its published status. Run this to see why posts might not be showing on your blog page.',
          createdAt: getScriptTimestamp('check-blog-post-exists.sql')
        },
        {
          name: 'Update Blog Post If Exists',
          filename: 'update-blog-post-if-exists.sql',
          content: updatePostContent || '// File not found - check public/sql folder',
          description: 'Updates the "Artificial Intelligence: The Job Killer" blog post if it already exists. Sets published=true and status=published. Run this if the INSERT script said "success" but no rows were returned.',
          createdAt: getScriptTimestamp('update-blog-post-if-exists.sql')
        }
      ];

      // TEMPORARILY DISABLE 24-HOUR FILTER FOR DEBUGGING - Show all scripts
      // Filter out scripts older than 24 hours from when they were first viewed
      // BUT always show scripts even if content failed to load (so user can see what's available)
      const recentScripts = allScripts.filter(script => {
        // TEMPORARY: Show all scripts for debugging
        // TODO: Re-enable 24-hour filter after confirming scripts show
        
        // Log for debugging
        console.log('Script check:', {
          name: script.name,
          hasContent: !!script.content && !script.content.includes('File not found') && !script.content.trim().startsWith('<!'),
          contentLength: script.content?.length || 0,
          createdAt: new Date(script.createdAt).toISOString()
        });
        
        // Show all scripts for now
        return true;
        
        // Original filter logic (disabled temporarily):
        // const age = now - script.createdAt;
        // const ageHours = age / (1000 * 60 * 60);
        // const shouldShow = age < TWENTY_FOUR_HOURS && age >= 0;
        // return shouldShow;
      });

      console.log('SQL Scripts Summary:', {
        totalScripts: allScripts.length,
        scriptsWithContent: allScripts.filter(s => s.content && !s.content.includes('File not found') && !s.content.trim().startsWith('<!')).length,
        recentScripts: recentScripts.length,
        scriptNames: recentScripts.map(s => s.name),
        allScriptNames: allScripts.map(s => s.name)
      });
      
      // Force set scripts even if array is empty for debugging
      if (recentScripts.length === 0 && allScripts.length > 0) {
        console.error('WARNING: All scripts filtered out! Showing all scripts anyway.');
        console.log('All scripts:', allScripts);
        setScripts(allScripts);
      } else {
        console.log('Setting scripts:', recentScripts.length, 'scripts');
        setScripts(recentScripts);
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error loading SQL scripts';
      const errorStack = error?.stack || JSON.stringify(error, null, 2);
      logToDebug('error', `Failed to load SQL scripts: ${errorMessage}`, { stack: errorStack, error });
      console.error('Error loading SQL scripts:', error);
      // Set empty array on error so user sees "No SQL scripts found"
      setScripts([]);
      // Redirect to debug page if there's a critical error
      if (error?.message?.includes('404') || error?.code === 'NOT_FOUND') {
        logToDebug('error', '404 error detected - SQL page not found. Check routing.', error);
      }
    }
  };

  useEffect(() => {
    try {
      logToDebug('info', 'SQL component mounted, loading scripts...');
      console.log('SQL component mounted, loading scripts...');
      loadScripts().then(() => {
        logToDebug('info', `Scripts loaded, current scripts state: ${scripts.length}`);
        console.log('Scripts loaded, current scripts state:', scripts.length);
      }).catch(err => {
        logToDebug('error', 'Failed to load scripts in useEffect', err);
        console.error('Failed to load scripts:', err);
      });
      startActivityTracking();
    } catch (error: any) {
      logToDebug('error', 'Error in SQL component useEffect', error);
      console.error('Error in SQL component useEffect:', error);
    }

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
              <p className="text-white/40 text-sm mt-2">Check browser console for debug info.</p>
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
