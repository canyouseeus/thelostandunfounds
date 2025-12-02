/**
 * Admin SQL Scripts Component
 * Organized, collapsible SQL scripts with copy functionality
 */

import { useState, useEffect } from 'react';
import { useToast } from './Toast';
import { Copy, Check, ChevronDown, ChevronUp, Database, FileText, Settings, Mail, User, AlertCircle } from 'lucide-react';

interface SQLScript {
  name: string;
  filename: string;
  content: string;
  description?: string;
  createdAt: number;
  category: string;
}

type Category = {
  id: string;
  name: string;
  icon: React.ReactNode;
  order: number;
};

const CATEGORIES: Category[] = [
  { id: 'setup', name: 'Setup & Migration', icon: <Settings className="w-4 h-4" />, order: 1 },
  { id: 'blog-posts', name: 'Blog Posts', icon: <FileText className="w-4 h-4" />, order: 2 },
  { id: 'tables', name: 'Tables & Schema', icon: <Database className="w-4 h-4" />, order: 3 },
  { id: 'policies', name: 'Policies & Permissions', icon: <Settings className="w-4 h-4" />, order: 4 },
  { id: 'email', name: 'Email & Tracking', icon: <Mail className="w-4 h-4" />, order: 5 },
  { id: 'user-management', name: 'User Management', icon: <User className="w-4 h-4" />, order: 6 },
  { id: 'diagnostics', name: 'Diagnostics', icon: <AlertCircle className="w-4 h-4" />, order: 7 },
];

// Category mapping function
const getCategory = (script: { name: string; filename: string; description?: string }): string => {
  const name = script.name.toLowerCase();
  const filename = script.filename.toLowerCase();
  const desc = (script.description || '').toLowerCase();

  // Setup & Migration
  if (
    name.includes('admin setup') ||
    name.includes('migration') ||
    name.includes('schema migration') ||
    filename.includes('admin-setup') ||
    filename.includes('migration')
  ) {
    return 'setup';
  }

  // Blog Posts
  if (
    name.includes('blog post') ||
    filename.includes('create-blog-post') ||
    filename.includes('update-blog-post')
  ) {
    return 'blog-posts';
  }

  // Tables & Schema
  if (
    (name.includes('table') && !name.includes('user') && !name.includes('subdomain')) ||
    (name.includes('schema') && !name.includes('migration')) ||
    (filename.includes('create-') && filename.includes('table')) ||
    (filename.includes('add-') && (name.includes('column') || name.includes('field') || name.includes('storefront')))
  ) {
    return 'tables';
  }

  // Policies & Permissions
  if (
    name.includes('rls') ||
    name.includes('policy') ||
    name.includes('permission') ||
    filename.includes('rls') ||
    filename.includes('policy')
  ) {
    return 'policies';
  }

  // Email & Tracking
  if (
    name.includes('email') ||
    name.includes('tracking') ||
    filename.includes('email') ||
    filename.includes('tracking')
  ) {
    return 'email';
  }

  // User Management
  if (
    (name.includes('user') && !name.includes('email') && !name.includes('check')) ||
    (name.includes('subdomain') && !name.includes('diagnose') && !name.includes('fix') && !name.includes('check')) ||
    (filename.includes('user') && !filename.includes('email') && !filename.includes('check')) ||
    (filename.includes('subdomain') && !filename.includes('diagnose') && !filename.includes('fix') && !filename.includes('check')) ||
    filename.includes('move-post') ||
    filename.includes('update-admin')
  ) {
    return 'user-management';
  }

  // Diagnostics
  if (
    name.includes('check') ||
    name.includes('diagnose') ||
    name.includes('fix') ||
    filename.includes('check') ||
    filename.includes('diagnose')
  ) {
    return 'diagnostics';
  }

  return 'tables'; // Default fallback
};

export default function AdminSQLScripts() {
  const { success } = useToast();
  const [scripts, setScripts] = useState<SQLScript[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedScripts, setExpandedScripts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Load all scripts (reusing logic from SQL.tsx)
  useEffect(() => {
    loadScripts();
  }, []);

  const getScriptTimestamp = (filename: string): number => {
    const storageKey = `sql_script_${filename}_timestamp`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      return parseInt(stored, 10);
    }
    const now = Date.now();
    localStorage.setItem(storageKey, now.toString());
    return now;
  };

  const loadScripts = async () => {
    try {
      setLoading(true);
      
      // Load all script files (same as SQL.tsx)
      const scriptLoaders = [
        { name: 'blog-schema-migration.sql', path: '/blog-schema-migration.sql' },
        { name: 'create-first-blog-post.sql', path: '/create-first-blog-post.sql' },
        { name: 'create-blog-post-all-for-a-dream.sql', path: '/sql/create-blog-post-all-for-a-dream.sql' },
        { name: 'create-blog-post-artificial-intelligence-the-job-killer.sql', path: '/sql/create-blog-post-artificial-intelligence-the-job-killer.sql' },
        { name: 'create-blog-post-building-a-creative-brand-that-rewards-people-for-life.sql', path: '/sql/create-blog-post-building-a-creative-brand-that-rewards-people-for-life.sql' },
        { name: 'create-blog-post-our-tech-stack.sql', path: '/sql/create-blog-post-our-tech-stack.sql' },
        { name: 'create-blog-post-join-the-lost-archives-book-club.sql', path: '/sql/create-blog-post-join-the-lost-archives-book-club.sql' },
        { name: 'check-blog-post-exists.sql', path: '/sql/check-blog-post-exists.sql' },
        { name: 'update-blog-post-if-exists.sql', path: '/sql/update-blog-post-if-exists.sql' },
        { name: 'create-newsletter-campaigns-table.sql', path: '/sql/create-newsletter-campaigns-table.sql' },
        { name: 'create-brand-assets-storage-bucket.sql', path: '/sql/create-brand-assets-storage-bucket.sql' },
        { name: 'comprehensive-admin-setup.sql', path: '/sql/comprehensive-admin-setup.sql' },
        { name: 'create-blog-submissions-table.sql', path: '/sql/create-blog-submissions-table.sql' },
        { name: 'fix-blog-submissions-rls-policies.sql', path: '/sql/fix-blog-submissions-rls-policies.sql' },
        { name: 'add-publication-email-tracking.sql', path: '/sql/add-publication-email-tracking.sql' },
        { name: 'add-welcome-email-tracking.sql', path: '/sql/add-welcome-email-tracking.sql' },
        { name: 'diagnose-user-subdomain-connections.sql', path: '/sql/diagnose-user-subdomain-connections.sql' },
        { name: 'fix-user-subdomain-connections.sql', path: '/sql/fix-user-subdomain-connections.sql' },
        { name: 'check-user-subdomain-email-status.sql', path: '/sql/check-user-subdomain-email-status.sql' },
        { name: 'add-emails-to-user-roles-from-submissions.sql', path: '/sql/add-emails-to-user-roles-from-submissions.sql' },
        { name: 'ensure-author-name-column-exists.sql', path: '/sql/ensure-author-name-column-exists.sql' },
        { name: 'fix-blog-posts-rls-policies.sql', path: '/sql/fix-blog-posts-rls-policies.sql' },
        { name: 'setup-admin-user.sql', path: '/sql/setup-admin-user.sql' },
        { name: 'update-admin-username-and-subdomain.sql', path: '/sql/update-admin-username-and-subdomain.sql' },
        { name: 'move-post-to-book-club.sql', path: '/sql/move-post-to-book-club.sql' },
        { name: 'add-amazon-storefront-id.sql', path: '/sql/add-amazon-storefront-id.sql' },
        { name: 'create-user-subdomains-table.sql', path: '/sql/create-user-subdomains-table.sql' },
        { name: 'add-blog-title-to-user-subdomains.sql', path: '/sql/add-blog-title-to-user-subdomains.sql' },
        { name: 'add-user-subdomain-support.sql', path: '/sql/add-user-subdomain-support.sql' },
      ];

      const loadedScripts: SQLScript[] = [];

      // Load all scripts in parallel
      await Promise.all(
        scriptLoaders.map(async (loader) => {
          try {
            const response = await fetch(loader.path);
            if (response.ok) {
              const text = await response.text();
              if (!text.trim().startsWith('<!')) {
                // Extract script metadata from filename
                const scriptName = loader.name
                  .replace('.sql', '')
                  .replace(/^create-/, '')
                  .replace(/^add-/, '')
                  .replace(/^fix-/, '')
                  .replace(/^update-/, '')
                  .replace(/^check-/, '')
                  .replace(/^diagnose-/, '')
                  .replace(/^setup-/, '')
                  .replace(/^move-/, '')
                  .split('-')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ');

                loadedScripts.push({
                  name: scriptName,
                  filename: loader.name,
                  content: text,
                  description: '',
                  createdAt: getScriptTimestamp(loader.name),
                  category: getCategory({ name: scriptName, filename: loader.name }),
                });
              }
            }
          } catch (error) {
            console.warn(`Failed to load ${loader.name}:`, error);
          }
        })
      );

      // Add scripts with proper metadata (matching SQL.tsx structure)
      const allScripts: SQLScript[] = [
        {
          name: 'Comprehensive Admin Setup - FIX ALL ADMIN PERMISSIONS',
          filename: 'comprehensive-admin-setup.sql',
          content: loadedScripts.find(s => s.filename === 'comprehensive-admin-setup.sql')?.content || '// File not found',
          description: 'CRITICAL: Run this first if you\'re having admin permission issues.',
          createdAt: getScriptTimestamp('comprehensive-admin-setup.sql'),
          category: 'setup',
        },
        {
          name: 'Blog Schema Migration',
          filename: 'blog-schema-migration.sql',
          content: loadedScripts.find(s => s.filename === 'blog-schema-migration.sql')?.content || '// File not found',
          description: 'Adds missing fields (published, SEO fields, og_image_url) to blog_posts table.',
          createdAt: getScriptTimestamp('blog-schema-migration.sql'),
          category: 'setup',
        },
        {
          name: 'Join THE LOST ARCHIVES BOOK CLUB and Share Your Love of Books',
          filename: 'create-blog-post-join-the-lost-archives-book-club.sql',
          content: loadedScripts.find(s => s.filename === 'create-blog-post-join-the-lost-archives-book-club.sql')?.content || '// File not found',
          description: 'Creates the blog post "Join THE LOST ARCHIVES BOOK CLUB and Share Your Love of Books"',
          createdAt: getScriptTimestamp('create-blog-post-join-the-lost-archives-book-club.sql'),
          category: 'blog-posts',
        },
        {
          name: 'Building a Creative Brand That Rewards People for Life',
          filename: 'create-blog-post-building-a-creative-brand-that-rewards-people-for-life.sql',
          content: loadedScripts.find(s => s.filename === 'create-blog-post-building-a-creative-brand-that-rewards-people-for-life.sql')?.content || '// File not found',
          description: 'Creates the blog post "Building a Creative Brand That Rewards People for Life"',
          createdAt: getScriptTimestamp('create-blog-post-building-a-creative-brand-that-rewards-people-for-life.sql'),
          category: 'blog-posts',
        },
        {
          name: 'Our Tech Stack: Building with Creativity and Autonomy',
          filename: 'create-blog-post-our-tech-stack.sql',
          content: loadedScripts.find(s => s.filename === 'create-blog-post-our-tech-stack.sql')?.content || '// File not found',
          description: 'Creates the blog post "Our Tech Stack: Building with Creativity and Autonomy"',
          createdAt: getScriptTimestamp('create-blog-post-our-tech-stack.sql'),
          category: 'blog-posts',
        },
        {
          name: 'ALL FOR A DREAM',
          filename: 'create-blog-post-all-for-a-dream.sql',
          content: loadedScripts.find(s => s.filename === 'create-blog-post-all-for-a-dream.sql')?.content || '// File not found',
          description: 'Creates the blog post "ALL FOR A DREAM"',
          createdAt: getScriptTimestamp('create-blog-post-all-for-a-dream.sql'),
          category: 'blog-posts',
        },
        {
          name: 'Artificial Intelligence: The Job Killer',
          filename: 'create-blog-post-artificial-intelligence-the-job-killer.sql',
          content: loadedScripts.find(s => s.filename === 'create-blog-post-artificial-intelligence-the-job-killer.sql')?.content || '// File not found',
          description: 'Creates the blog post "Artificial Intelligence: The Job Killer"',
          createdAt: getScriptTimestamp('create-blog-post-artificial-intelligence-the-job-killer.sql'),
          category: 'blog-posts',
        },
        {
          name: 'Create First Blog Post',
          filename: 'create-first-blog-post.sql',
          content: loadedScripts.find(s => s.filename === 'create-first-blog-post.sql')?.content || '// File not found',
          description: 'Creates your first blog post about Cursor IDE.',
          createdAt: getScriptTimestamp('create-first-blog-post.sql'),
          category: 'blog-posts',
        },
        {
          name: 'Blog Submissions Table',
          filename: 'create-blog-submissions-table.sql',
          content: loadedScripts.find(s => s.filename === 'create-blog-submissions-table.sql')?.content || '// File not found',
          description: 'Creates the blog_submissions table to allow people to submit articles.',
          createdAt: getScriptTimestamp('create-blog-submissions-table.sql'),
          category: 'tables',
        },
        {
          name: 'Newsletter Campaigns Table',
          filename: 'create-newsletter-campaigns-table.sql',
          content: loadedScripts.find(s => s.filename === 'create-newsletter-campaigns-table.sql')?.content || '// File not found',
          description: 'Creates the newsletter_campaigns table to track newsletter sends.',
          createdAt: getScriptTimestamp('create-newsletter-campaigns-table.sql'),
          category: 'tables',
        },
        {
          name: 'User Subdomains Table',
          filename: 'create-user-subdomains-table.sql',
          content: loadedScripts.find(s => s.filename === 'create-user-subdomains-table.sql')?.content || '// File not found',
          description: 'Creates the user_subdomains table to store each user\'s custom subdomain.',
          createdAt: getScriptTimestamp('create-user-subdomains-table.sql'),
          category: 'tables',
        },
        {
          name: 'Create Brand Assets Storage Bucket',
          filename: 'create-brand-assets-storage-bucket.sql',
          content: loadedScripts.find(s => s.filename === 'create-brand-assets-storage-bucket.sql')?.content || '// File not found',
          description: 'Sets up RLS policies for the brand-assets storage bucket.',
          createdAt: getScriptTimestamp('create-brand-assets-storage-bucket.sql'),
          category: 'tables',
        },
        {
          name: 'Add Amazon Storefront ID',
          filename: 'add-amazon-storefront-id.sql',
          content: loadedScripts.find(s => s.filename === 'add-amazon-storefront-id.sql')?.content || '// File not found',
          description: 'Adds amazon_storefront_id column to blog_submissions and blog_posts tables.',
          createdAt: getScriptTimestamp('add-amazon-storefront-id.sql'),
          category: 'tables',
        },
        {
          name: 'Add Blog Title to User Subdomains',
          filename: 'add-blog-title-to-user-subdomains.sql',
          content: loadedScripts.find(s => s.filename === 'add-blog-title-to-user-subdomains.sql')?.content || '// File not found',
          description: 'Adds blog_title field to user_subdomains table.',
          createdAt: getScriptTimestamp('add-blog-title-to-user-subdomains.sql'),
          category: 'tables',
        },
        {
          name: 'Ensure author_name Column Exists',
          filename: 'ensure-author-name-column-exists.sql',
          content: loadedScripts.find(s => s.filename === 'ensure-author-name-column-exists.sql')?.content || '// File not found',
          description: 'Ensures the author_name column exists in blog_posts table.',
          createdAt: getScriptTimestamp('ensure-author-name-column-exists.sql'),
          category: 'tables',
        },
        {
          name: 'Fix Blog Submissions RLS Policies',
          filename: 'fix-blog-submissions-rls-policies.sql',
          content: loadedScripts.find(s => s.filename === 'fix-blog-submissions-rls-policies.sql')?.content || '// File not found',
          description: 'Fixes permission errors when approving blog submissions.',
          createdAt: getScriptTimestamp('fix-blog-submissions-rls-policies.sql'),
          category: 'policies',
        },
        {
          name: 'Fix Blog Posts RLS Policies',
          filename: 'fix-blog-posts-rls-policies.sql',
          content: loadedScripts.find(s => s.filename === 'fix-blog-posts-rls-policies.sql')?.content || '// File not found',
          description: 'Fixes permission errors when publishing blog posts.',
          createdAt: getScriptTimestamp('fix-blog-posts-rls-policies.sql'),
          category: 'policies',
        },
        {
          name: 'Add Publication Email Tracking',
          filename: 'add-publication-email-tracking.sql',
          content: loadedScripts.find(s => s.filename === 'add-publication-email-tracking.sql')?.content || '// File not found',
          description: 'Adds publication_email_sent_at column to blog_submissions table.',
          createdAt: getScriptTimestamp('add-publication-email-tracking.sql'),
          category: 'email',
        },
        {
          name: 'Add Welcome Email Tracking',
          filename: 'add-welcome-email-tracking.sql',
          content: loadedScripts.find(s => s.filename === 'add-welcome-email-tracking.sql')?.content || '// File not found',
          description: 'Adds welcome_email_sent_at column to user_subdomains table.',
          createdAt: getScriptTimestamp('add-welcome-email-tracking.sql'),
          category: 'email',
        },
        {
          name: 'Setup Admin User',
          filename: 'setup-admin-user.sql',
          content: loadedScripts.find(s => s.filename === 'setup-admin-user.sql')?.content || '// File not found',
          description: 'Ensures thelostandunfounds@gmail.com is properly recognized as admin.',
          createdAt: getScriptTimestamp('setup-admin-user.sql'),
          category: 'user-management',
        },
        {
          name: 'Update Admin Username and Subdomain',
          filename: 'update-admin-username-and-subdomain.sql',
          content: loadedScripts.find(s => s.filename === 'update-admin-username-and-subdomain.sql')?.content || '// File not found',
          description: 'Updates the username and subdomain for admin user.',
          createdAt: getScriptTimestamp('update-admin-username-and-subdomain.sql'),
          category: 'user-management',
        },
        {
          name: 'User Subdomain Support',
          filename: 'add-user-subdomain-support.sql',
          content: loadedScripts.find(s => s.filename === 'add-user-subdomain-support.sql')?.content || '// File not found',
          description: 'Adds subdomain and Amazon affiliate links support to blog_posts table.',
          createdAt: getScriptTimestamp('add-user-subdomain-support.sql'),
          category: 'user-management',
        },
        {
          name: 'Move Post to Book Club',
          filename: 'move-post-to-book-club.sql',
          content: loadedScripts.find(s => s.filename === 'move-post-to-book-club.sql')?.content || '// File not found',
          description: 'Moves a post to the Book Club collection by adding a subdomain.',
          createdAt: getScriptTimestamp('move-post-to-book-club.sql'),
          category: 'user-management',
        },
        {
          name: 'Add Emails to user_roles from blog_submissions',
          filename: 'add-emails-to-user-roles-from-submissions.sql',
          content: loadedScripts.find(s => s.filename === 'add-emails-to-user-roles-from-submissions.sql')?.content || '// File not found',
          description: 'Populates user_roles.email for users who have subdomains but no email.',
          createdAt: getScriptTimestamp('add-emails-to-user-roles-from-submissions.sql'),
          category: 'user-management',
        },
        {
          name: 'Check Blog Post Exists',
          filename: 'check-blog-post-exists.sql',
          content: loadedScripts.find(s => s.filename === 'check-blog-post-exists.sql')?.content || '// File not found',
          description: 'Diagnostic script to check if a blog post exists and verify its published status.',
          createdAt: getScriptTimestamp('check-blog-post-exists.sql'),
          category: 'diagnostics',
        },
        {
          name: 'Update Blog Post If Exists',
          filename: 'update-blog-post-if-exists.sql',
          content: loadedScripts.find(s => s.filename === 'update-blog-post-if-exists.sql')?.content || '// File not found',
          description: 'Updates a blog post if it already exists.',
          createdAt: getScriptTimestamp('update-blog-post-if-exists.sql'),
          category: 'diagnostics',
        },
        {
          name: 'Diagnose User-Subdomain Connections',
          filename: 'diagnose-user-subdomain-connections.sql',
          content: loadedScripts.find(s => s.filename === 'diagnose-user-subdomain-connections.sql')?.content || '// File not found',
          description: 'Diagnostic script to identify why users aren\'t connected to their subdomains.',
          createdAt: getScriptTimestamp('diagnose-user-subdomain-connections.sql'),
          category: 'diagnostics',
        },
        {
          name: 'Fix User-Subdomain Connections',
          filename: 'fix-user-subdomain-connections.sql',
          content: loadedScripts.find(s => s.filename === 'fix-user-subdomain-connections.sql')?.content || '// File not found',
          description: 'Automatically links users to their subdomains by matching emails.',
          createdAt: getScriptTimestamp('fix-user-subdomain-connections.sql'),
          category: 'diagnostics',
        },
        {
          name: 'Check User-Subdomain-Email Status',
          filename: 'check-user-subdomain-email-status.sql',
          content: loadedScripts.find(s => s.filename === 'check-user-subdomain-email-status.sql')?.content || '// File not found',
          description: 'Diagnostic query to check if users are linked to subdomains and email status.',
          createdAt: getScriptTimestamp('check-user-subdomain-email-status.sql'),
          category: 'diagnostics',
        },
      ];

      // Sort by category order, then by createdAt (newest first)
      const sortedScripts = allScripts.sort((a, b) => {
        const categoryA = CATEGORIES.find(c => c.id === a.category);
        const categoryB = CATEGORIES.find(c => c.id === b.category);
        const orderA = categoryA?.order || 999;
        const orderB = categoryB?.order || 999;
        
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        
        return b.createdAt - a.createdAt;
      });

      setScripts(sortedScripts);
      
      // Expand all categories by default
      setExpandedCategories(new Set(CATEGORIES.map(c => c.id)));
    } catch (error) {
      console.error('Error loading SQL scripts:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const toggleScript = (scriptId: string) => {
    setExpandedScripts(prev => {
      const next = new Set(prev);
      if (next.has(scriptId)) {
        next.delete(scriptId);
      } else {
        next.add(scriptId);
      }
      return next;
    });
  };

  const copyToClipboard = async (content: string, scriptId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(scriptId);
      success('SQL script copied to clipboard!');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getScriptsByCategory = (categoryId: string) => {
    return scripts.filter(script => script.category === categoryId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white/60">Loading SQL scripts...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {CATEGORIES.map(category => {
        const categoryScripts = getScriptsByCategory(category.id);
        if (categoryScripts.length === 0) return null;

        const isExpanded = expandedCategories.has(category.id);

        return (
          <div key={category.id} className="bg-black/50 border border-white/10 rounded-none">
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(category.id)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition"
            >
              <div className="flex items-center gap-3">
                {category.icon}
                <h3 className="text-lg font-bold text-white">{category.name}</h3>
                <span className="px-2 py-1 bg-white/10 text-white/60 text-xs rounded">
                  {categoryScripts.length}
                </span>
              </div>
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-white/60" />
              ) : (
                <ChevronDown className="w-5 h-5 text-white/60" />
              )}
            </button>

            {/* Category Scripts */}
            {isExpanded && (
              <div className="border-t border-white/10">
                {categoryScripts.map((script, index) => {
                  const scriptId = `${category.id}-${index}`;
                  const isScriptExpanded = expandedScripts.has(scriptId);

                  return (
                    <div key={scriptId} className="border-b border-white/5 last:border-b-0">
                      {/* Script Header (always visible) */}
                      <div className="px-6 py-4 flex items-start justify-between gap-4 hover:bg-white/5 transition">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-white font-semibold">{script.name}</h4>
                          </div>
                          <p className="text-white/60 text-sm mb-1">{script.filename}</p>
                          {script.description && (
                            <p className="text-white/70 text-sm">{script.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Copy Button - Always visible */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(script.content, scriptId);
                            }}
                            className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded text-white text-sm transition flex items-center gap-2"
                            title="Copy script"
                          >
                            {copiedId === scriptId ? (
                              <>
                                <Check className="w-4 h-4" />
                                <span className="hidden sm:inline">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4" />
                                <span className="hidden sm:inline">Copy</span>
                              </>
                            )}
                          </button>
                          {/* Expand/Collapse Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleScript(scriptId);
                            }}
                            className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded text-white text-sm transition"
                            title={isScriptExpanded ? "Collapse" : "Expand"}
                          >
                            {isScriptExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Script Content (collapsible) */}
                      {isScriptExpanded && (
                        <div className="px-6 pb-4">
                          <pre className="bg-black/50 border border-white/10 rounded-none p-4 overflow-x-auto text-white/90 text-sm font-mono whitespace-pre-wrap break-words text-left max-h-96 overflow-y-auto">
                            <code>{script.content}</code>
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {scripts.length === 0 && (
        <div className="bg-black/50 border border-white/10 rounded-none p-6">
          <p className="text-white/60">No SQL scripts found.</p>
        </div>
      )}
    </div>
  );
}
