/**
 * Blog Management Component
 * Admin console for authoring, organising and maintaining blog posts.
 */

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useToast } from './Toast';
import { LoadingOverlay } from './Loading';
import {
  DocumentTextIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  CalendarIcon,
  MagnifyingGlassIcon,
  DocumentDuplicateIcon,
  ArrowLeftIcon,
  ArrowUpTrayIcon,
  LinkIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import RichTextEditor from './RichTextEditor';
import { unescapeContent } from '../utils/blogUtils';
import { ExpandableScreen, ExpandableScreenTrigger, ExpandableScreenContent } from './ui/expandable-screen';
import { Sparkline, CHART_ACCENTS } from './ui/viz';
import { cn } from './ui/utils';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  published: boolean;
  status?: string; // 'draft' | 'published' - optional for backward compatibility
  published_at: string | null;
  created_at: string;
  updated_at?: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  og_image_url: string | null;
  featured_image?: string | null; // Support existing field
  author_id?: string | null;
  user_id?: string | null;
  author_name?: string | null;
  blog_column?: string | null;
  subdomain?: string | null;
  tags?: string[] | null;
  amazon_affiliate_links?: any[] | null;
}

const BLOG_COLUMNS = [
  { value: 'main', label: 'The Lost Archives' },
  { value: 'gearheads', label: 'GearHeads' },
  { value: 'borderlands', label: 'Edge of the Borderlands' },
  { value: 'science', label: 'Mad Scientists' },
  { value: 'newtheory', label: 'New Theory' },
];

const COLUMN_LABEL: Record<string, string> = BLOG_COLUMNS.reduce(
  (acc, c) => ({ ...acc, [c.value]: c.label }),
  {} as Record<string, string>
);

type StatusFilter = 'all' | 'published' | 'draft';
type SortKey = 'newest' | 'oldest' | 'title' | 'updated';

const EMPTY_FORM = {
  title: '',
  slug: '',
  content: '',
  excerpt: '',
  published: false,
  seo_title: '',
  seo_description: '',
  seo_keywords: '',
  og_image_url: '',
  blog_column: 'main',
  author_name: '',
  tags: '',
  published_at: '',
};

type FormState = typeof EMPTY_FORM;

interface PostStat {
  id: string;
  slug: string;
  title: string;
  published: boolean;
  blog_column: string;
  published_at: string;
  views: number;
  uniqueVisitors: number;
  reads: number;
  readRate: number;
  avgSeconds: number;
}

interface BlogAnalytics {
  days: number;
  totals: { views: number; uniqueVisitors: number; reads: number; readRate: number; avgSeconds: number } | null;
  trend: { date: string; count: number }[];
  sources: { source: string; count: number }[];
  posts: PostStat[];
}

// --- Small helpers -----------------------------------------------------------

const stripHtml = (html: string) => (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const countWords = (html: string) => {
  const text = stripHtml(html);
  return text ? text.split(' ').length : 0;
};

const readingTime = (html: string) => Math.max(1, Math.round(countWords(html) / 225));

/** Convert a DB timestamp into the value a datetime-local input expects. */
const toLocalInputValue = (value: string | null | undefined) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

// --- Component ---------------------------------------------------------------

export default function BlogManagement() {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<FormState>(EMPTY_FORM);
  const [pristineForm, setPristineForm] = useState<FormState>(EMPTY_FORM);

  // Library controls
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [columnFilter, setColumnFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkWorking, setIsBulkWorking] = useState(false);

  // Screens
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

  // Analytics
  const [analytics, setAnalytics] = useState<BlogAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsRange, setAnalyticsRange] = useState(30);

  // Unpublish reason modal
  const [isUnpublishing, setIsUnpublishing] = useState(false);
  const [unpublishReason, setUnpublishReason] = useState('');
  const [targetPostId, setTargetPostId] = useState<string | null>(null);
  const [isProcessingUnpublish, setIsProcessingUnpublish] = useState(false);

  useEffect(() => {
    loadPosts();
  }, []);

  useEffect(() => {
    loadAnalytics(analyticsRange);
  }, [analyticsRange]);

  const loadAnalytics = async (days: number) => {
    try {
      setAnalyticsLoading(true);
      const res = await fetch(`/api/admin/analytics/blog-stats?days=${days}`);
      const data = await res.json();
      if (data?.success) {
        setAnalytics({
          days: data.days,
          totals: data.totals,
          trend: data.trend || [],
          sources: data.sources || [],
          posts: data.posts || [],
        });
      } else {
        setAnalytics(null);
      }
    } catch (err) {
      console.error('Error loading blog analytics:', err);
      setAnalytics(null);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const loadPosts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .order('published_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading posts:', error);
        showError('Failed to load blog posts');
        return;
      }

      // Ensure published field exists (for backward compatibility with status field)
      const postsWithPublished = (data || []).map((post: any) => ({
        ...post,
        published: post.published !== undefined && post.published !== null
          ? post.published
          : post.status === 'published',
      }));

      setPosts(postsWithPublished);
    } catch (err) {
      console.error('Error loading posts:', err);
      showError('Failed to load blog posts');
    } finally {
      setLoading(false);
    }
  };

  // Generate a short summary from content if no excerpt provided
  const buildGeneratedSummary = (content: string) => {
    const source = stripHtml(content);
    if (!source) return '';
    const sentences = source.split(/(?<=[.!?])\s+/).filter(Boolean);
    const candidate = sentences.slice(0, 2).join(' ');
    const preview = candidate || sentences[0] || source;
    return preview.length > 220
      ? preview.substring(0, 220).replace(/\s+\S*$/, '') + '...'
      : preview;
  };

  const generateSlug = (title: string) =>
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

  const isDirty = useMemo(
    () => JSON.stringify(formData) !== JSON.stringify(pristineForm),
    [formData, pristineForm]
  );

  const openEditor = (post: BlogPost | null, preset?: Partial<FormState>) => {
    const next: FormState = post
      ? {
        title: post.title,
        slug: post.slug,
        content: unescapeContent(post.content),
        excerpt: post.excerpt || '',
        published: post.published !== undefined ? post.published : post.status === 'published',
        seo_title: post.seo_title || '',
        seo_description: post.seo_description || '',
        seo_keywords: post.seo_keywords || '',
        og_image_url: post.og_image_url || post.featured_image || '',
        // The book club is retired: legacy posts open reclassified into the main archive.
        blog_column: !post.blog_column || post.blog_column === 'bookclub' ? 'main' : post.blog_column,
        author_name: post.author_name || '',
        tags: (post.tags || []).join(', '),
        published_at: toLocalInputValue(post.published_at),
      }
      : { ...EMPTY_FORM, ...preset };

    setEditingPost(post);
    setFormData(next);
    setPristineForm(next);
    setIsCreating(true);
  };

  const closeEditor = () => {
    if (isDirty && !confirm('You have unsaved changes. Discard them?')) return;
    setIsCreating(false);
    setEditingPost(null);
    setFormData(EMPTY_FORM);
    setPristineForm(EMPTY_FORM);
  };

  const handleTitleChange = (title: string) => {
    setFormData({
      ...formData,
      title,
      // Only auto-fill the slug while it is still tracking the title
      slug: !formData.slug || formData.slug === generateSlug(formData.title)
        ? generateSlug(title)
        : formData.slug,
    });
  };

  const slugConflict = useMemo(() => {
    const slug = formData.slug || generateSlug(formData.title);
    if (!slug) return null;
    return posts.find((p) => p.slug === slug && p.id !== editingPost?.id) || null;
  }, [formData.slug, formData.title, posts, editingPost]);

  const buildPostData = (overrides: Partial<{ published: boolean }> = {}) => {
    const published = overrides.published ?? formData.published;
    const explicitDate = formData.published_at ? new Date(formData.published_at).toISOString() : null;
    const shouldStamp = published && !explicitDate && !editingPost?.published_at;

    return {
      title: formData.title,
      slug: formData.slug || generateSlug(formData.title),
      content: formData.content,
      published,
      status: published ? 'published' : 'draft',
      published_at: explicitDate || (shouldStamp ? new Date().toISOString() : editingPost?.published_at || null),
      author_id: editingPost ? editingPost.author_id || editingPost.user_id : user!.id,
      user_id: editingPost ? editingPost.user_id || editingPost.author_id : user!.id,
      excerpt:
        (formData.excerpt && formData.excerpt.trim()) || buildGeneratedSummary(formData.content) || null,
      seo_title: formData.seo_title || null,
      seo_description: formData.seo_description || null,
      seo_keywords: formData.seo_keywords || null,
      og_image_url: formData.og_image_url || null,
      blog_column: formData.blog_column || 'main',
      author_name: formData.author_name || null,
      tags: formData.tags
        ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : null,
      subdomain: editingPost?.subdomain || null,
      updated_at: new Date().toISOString(),
    };
  };

  const savePost = async (publishOverride?: boolean) => {
    if (!user) {
      showError('You must be logged in to create/edit posts');
      return;
    }
    if (!formData.title.trim()) {
      showError('A title is required');
      return;
    }
    if (slugConflict) {
      showError(`Slug already used by "${slugConflict.title}", pick another`);
      return;
    }

    try {
      setIsSaving(true);
      const postData = buildPostData(
        publishOverride === undefined ? {} : { published: publishOverride }
      );

      if (editingPost) {
        const { error } = await supabase.from('blog_posts').update(postData).eq('id', editingPost.id);
        if (error) throw error;
        success(postData.published ? 'Post updated and live' : 'Draft saved');
      } else {
        const { error } = await supabase.from('blog_posts').insert([postData]);
        if (error) throw error;
        success(postData.published ? 'Post published' : 'Draft created');
      }

      setIsCreating(false);
      setEditingPost(null);
      setFormData(EMPTY_FORM);
      setPristineForm(EMPTY_FORM);
      loadPosts();
    } catch (err: any) {
      console.error('Error saving post:', err);
      showError(err.message || 'Failed to save post');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    savePost();
  };

  const handleDuplicate = async (post: BlogPost) => {
    if (!user) return;
    try {
      const copy = {
        title: `${post.title} (Copy)`,
        slug: `${post.slug}-copy-${Date.now().toString(36)}`,
        content: post.content,
        excerpt: post.excerpt,
        published: false,
        status: 'draft',
        published_at: null,
        seo_title: post.seo_title,
        seo_description: post.seo_description,
        seo_keywords: post.seo_keywords,
        og_image_url: post.og_image_url,
        blog_column: post.blog_column || 'main',
        author_name: post.author_name,
        tags: post.tags,
        author_id: user.id,
        user_id: user.id,
      };
      const { error } = await supabase.from('blog_posts').insert([copy]);
      if (error) throw error;
      success('Duplicated as a draft');
      loadPosts();
    } catch (err: any) {
      console.error('Error duplicating post:', err);
      showError(err.message || 'Failed to duplicate post');
    }
  };

  const handlePublishNow = async (post: BlogPost) => {
    try {
      const { error } = await supabase
        .from('blog_posts')
        .update({
          published: true,
          status: 'published',
          published_at: post.published_at || new Date().toISOString(),
        })
        .eq('id', post.id);
      if (error) throw error;
      success('Post published');
      loadPosts();
    } catch (err: any) {
      showError(err.message || 'Failed to publish post');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const { error } = await supabase.from('blog_posts').delete().eq('id', id);
      if (error) throw error;
      success('Post deleted successfully');
      setSelectedIds((prev) => prev.filter((s) => s !== id));
      loadPosts();
    } catch (err: any) {
      console.error('Error deleting post:', err);
      showError(err.message || 'Failed to delete post');
    }
  };

  const runBulk = async (action: 'publish' | 'draft' | 'delete') => {
    if (selectedIds.length === 0) return;
    if (action === 'delete' && !confirm(`Delete ${selectedIds.length} post(s)? This cannot be undone.`)) return;

    try {
      setIsBulkWorking(true);
      if (action === 'delete') {
        const { error } = await supabase.from('blog_posts').delete().in('id', selectedIds);
        if (error) throw error;
        success(`${selectedIds.length} post(s) deleted`);
      } else {
        const publish = action === 'publish';
        const patch: Record<string, any> = {
          published: publish,
          status: publish ? 'published' : 'draft',
        };
        if (publish) patch.published_at = new Date().toISOString();
        const { error } = await supabase.from('blog_posts').update(patch).in('id', selectedIds);
        if (error) throw error;
        success(`${selectedIds.length} post(s) ${publish ? 'published' : 'moved to draft'}`);
      }
      setSelectedIds([]);
      loadPosts();
    } catch (err: any) {
      console.error('Bulk action failed:', err);
      showError(err.message || 'Bulk action failed');
    } finally {
      setIsBulkWorking(false);
    }
  };

  const handleUnpublish = async () => {
    if (!targetPostId || !unpublishReason.trim()) {
      showError('Please provide a reason for unpublishing');
      return;
    }

    try {
      setIsProcessingUnpublish(true);

      // 1. Get the post details to find the submission_id and author info
      const { data: post, error: fetchError } = await supabase
        .from('blog_posts')
        .select('*, submission_id')
        .eq('id', targetPostId)
        .single();

      if (fetchError) throw fetchError;

      // 2. Update the post to draft status
      const { error: updateError } = await supabase
        .from('blog_posts')
        .update({ published: false, status: 'draft' })
        .eq('id', targetPostId);

      if (updateError) throw updateError;

      // 3. Revert submission status if linked
      let submissionId = post.submission_id;

      // Fallback: If submission_id is missing, try to find a matching submission by title
      if (!submissionId) {
        const { data: matchedSub } = await supabase
          .from('blog_submissions')
          .select('id')
          .eq('title', post.title)
          .maybeSingle();

        if (matchedSub) {
          submissionId = matchedSub.id;
          // Link it in the database for future use
          await supabase
            .from('blog_posts')
            .update({ submission_id: submissionId })
            .eq('id', targetPostId);
        }
      }

      if (submissionId) {
        const { data: submission, error: subError } = await supabase
          .from('blog_submissions')
          .select('author_email, author_name, title')
          .eq('id', submissionId)
          .single();

        if (!subError && submission) {
          await supabase
            .from('blog_submissions')
            .update({ status: 'pending', rejected_reason: unpublishReason })
            .eq('id', submissionId);

          try {
            await fetch('/api/blog/submission-unpublished', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                authorEmail: submission.author_email,
                authorName: submission.author_name,
                articleTitle: submission.title,
                unpublishReason,
              }),
            });
          } catch (emailErr) {
            console.error('Failed to send unpublish notification email:', emailErr);
            // Don't block the UI if email fails
          }
        }
      }

      success('Post unpublished successfully and returned to review');
      loadPosts();
      setIsUnpublishing(false);
      setUnpublishReason('');
      setTargetPostId(null);
    } catch (err: any) {
      console.error('Error unpublishing post:', err);
      showError(err.message || 'Failed to unpublish post');
    } finally {
      setIsProcessingUnpublish(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not published';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const postUrl = (post: BlogPost) =>
    post.subdomain ? `/blog/${post.subdomain}/${post.slug}` : `/thelostarchives/${post.slug}`;

  // --- Derived data ----------------------------------------------------------

  const visiblePosts = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = posts.slice();

    if (statusFilter !== 'all') {
      list = list.filter((p) => (statusFilter === 'published' ? p.published : !p.published));
    }
    if (columnFilter !== 'all') {
      list = list.filter((p) => (p.blog_column || 'main') === columnFilter);
    }
    if (term) {
      list = list.filter((p) =>
        [p.title, p.slug, p.excerpt || '', p.author_name || '', (p.tags || []).join(' ')]
          .join(' ')
          .toLowerCase()
          .includes(term)
      );
    }

    const time = (p: BlogPost) => new Date(p.published_at || p.created_at).getTime();
    switch (sortKey) {
      case 'oldest':
        list.sort((a, b) => time(a) - time(b));
        break;
      case 'title':
        list.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'updated':
        list.sort(
          (a, b) =>
            new Date(b.updated_at || b.created_at).getTime() -
            new Date(a.updated_at || a.created_at).getTime()
        );
        break;
      default:
        list.sort((a, b) => time(b) - time(a));
    }
    return list;
  }, [posts, search, statusFilter, columnFilter, sortKey]);

  const stats = useMemo(() => {
    const published = posts.filter((p) => p.published);
    const lastPublished = published
      .map((p) => p.published_at)
      .filter(Boolean)
      .sort()
      .pop();
    const missingSeo = posts.filter((p) => !p.seo_description || !p.seo_title).length;
    return {
      total: posts.length,
      published: published.length,
      drafts: posts.length - published.length,
      lastPublished: lastPublished ? formatDate(lastPublished) : '—',
      missingSeo,
    };
  }, [posts]);

  const statBySlug = useMemo(() => {
    const map = new Map<string, PostStat>();
    for (const stat of analytics?.posts || []) map.set(stat.slug, stat);
    return map;
  }, [analytics]);

  const allVisibleSelected =
    visiblePosts.length > 0 && visiblePosts.every((p) => selectedIds.includes(p.id));

  const toggleSelectAll = () => {
    setSelectedIds(allVisibleSelected ? [] : visiblePosts.map((p) => p.id));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  if (loading) {
    return <LoadingOverlay message="Loading Blog Posts" />;
  }

  const inputClass =
    'w-full px-4 py-3 bg-white/5 text-white placeholder-white/20 focus:bg-white/10 focus:outline-none transition-colors';
  const wordCount = countWords(formData.content);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 uppercase tracking-wide">
          <DocumentTextIcon className="w-5 h-5" />
          Blog Management
        </h2>
        <button
          onClick={() => openEditor(null)}
          className="flex items-center gap-2 px-4 py-2 bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-white/90 transition"
        >
          <PlusIcon className="w-3 h-3" />
          New Post
        </button>
      </div>

      {/* ---------------------------------------------------------------- Editor */}
      <ExpandableScreen isOpen={isCreating} onOpenChange={(open) => { if (!open) closeEditor(); }}>
        <ExpandableScreenContent className="overflow-x-hidden">
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="max-w-3xl mx-auto w-full px-4 sm:px-8 pt-20 pb-16">
              <button
                onClick={closeEditor}
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-white/40 hover:text-white transition-all duration-300 ease-out group w-fit mb-6"
              >
                <ArrowLeftIcon className="w-3 h-3 group-hover:-translate-x-1 transition-transform duration-300" />
                Blog Management
              </button>

              <div className="flex items-center justify-between gap-3 mb-8">
                <div className="flex items-center gap-3">
                  <DocumentTextIcon className="w-5 h-5 text-white/40" />
                  <h2 className="text-xl font-black uppercase tracking-wide text-white">
                    {editingPost ? 'Edit Post' : 'Create New Post'}
                  </h2>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                  {wordCount} words · {readingTime(formData.content)} min read
                  {isDirty && <span className="text-amber-400"> · Unsaved</span>}
                </span>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-white/80 text-xs uppercase tracking-wider mb-2 font-medium">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-xs uppercase tracking-wider mb-2 font-medium">Slug</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className={inputClass}
                    placeholder="auto-generated-from-title"
                  />
                  <p className="text-white/30 text-[10px] mt-2 tracking-tight text-left">
                    /thelostarchives/{formData.slug || generateSlug(formData.title) || '…'}
                  </p>
                  {slugConflict && (
                    <p className="text-red-400 text-[10px] mt-1 uppercase tracking-widest font-bold text-left">
                      Slug already used by "{slugConflict.title}"
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-white/80 text-xs uppercase tracking-wider mb-2 font-medium">Content</label>
                  <div className="bg-white/5">
                    <RichTextEditor
                      content={formData.content}
                      onChange={(html) => setFormData({ ...formData, content: html })}
                      placeholder="Write your post content here..."
                    />
                  </div>
                  <p className="text-white/40 text-[10px] mt-2 uppercase tracking-tight text-left">
                    Select text and click "Add Product Link" to add affiliate links.
                  </p>
                </div>

                <div>
                  <label className="block text-white/80 text-xs uppercase tracking-wider mb-2 font-medium">
                    Excerpt (optional: auto-generated if blank)
                  </label>
                  <textarea
                    value={formData.excerpt}
                    onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                    className={inputClass}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/80 text-xs uppercase tracking-wider mb-2 font-medium">Column</label>
                    <select
                      value={formData.blog_column}
                      onChange={(e) => setFormData({ ...formData, blog_column: e.target.value })}
                      className={inputClass}
                    >
                      {BLOG_COLUMNS.map((column) => (
                        <option key={column.value} value={column.value} className="bg-black">
                          {column.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-white/80 text-xs uppercase tracking-wider mb-2 font-medium">Byline (optional)</label>
                    <input
                      type="text"
                      value={formData.author_name}
                      onChange={(e) => setFormData({ ...formData, author_name: e.target.value })}
                      className={inputClass}
                      placeholder="Author name shown on the post"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/80 text-xs uppercase tracking-wider mb-2 font-medium">Tags (comma separated)</label>
                    <input
                      type="text"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      className={inputClass}
                      placeholder="essay, archive, field-notes"
                    />
                  </div>

                  <div>
                    <label className="block text-white/80 text-xs uppercase tracking-wider mb-2 font-medium">Publish date</label>
                    <input
                      type="datetime-local"
                      value={formData.published_at}
                      onChange={(e) => setFormData({ ...formData, published_at: e.target.value })}
                      className={inputClass}
                    />
                    <p className="text-white/30 text-[10px] mt-2 tracking-tight text-left">
                      Leave blank to stamp the current time on publish. Back-dating changes ordering only: posts go live as soon as they are published.
                    </p>
                  </div>
                </div>

                {/* SEO block */}
                <div className="bg-white/5 p-4 space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Search & Social</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white/80 text-xs uppercase tracking-wider mb-2 font-medium">
                        SEO Title <span className="text-white/30">{formData.seo_title.length}/60</span>
                      </label>
                      <input
                        type="text"
                        value={formData.seo_title}
                        onChange={(e) => setFormData({ ...formData, seo_title: e.target.value })}
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="block text-white/80 text-xs uppercase tracking-wider mb-2 font-medium">OG Image URL</label>
                      <input
                        type="url"
                        value={formData.og_image_url}
                        onChange={(e) => setFormData({ ...formData, og_image_url: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-white/80 text-xs uppercase tracking-wider mb-2 font-medium">
                      SEO Description <span className="text-white/30">{formData.seo_description.length}/160</span>
                    </label>
                    <textarea
                      value={formData.seo_description}
                      onChange={(e) => setFormData({ ...formData, seo_description: e.target.value })}
                      className={inputClass}
                      rows={2}
                    />
                  </div>

                  <div>
                    <label className="block text-white/80 text-xs uppercase tracking-wider mb-2 font-medium">SEO Keywords</label>
                    <input
                      type="text"
                      value={formData.seo_keywords}
                      onChange={(e) => setFormData({ ...formData, seo_keywords: e.target.value })}
                      className={inputClass}
                      placeholder="keyword1, keyword2, keyword3"
                    />
                  </div>

                  {/* Search result preview */}
                  <div className="bg-black/40 p-4 text-left">
                    <p className="text-[9px] uppercase tracking-[0.3em] text-white/30 mb-2">Preview</p>
                    <p className="text-blue-400 text-sm truncate">
                      {formData.seo_title || formData.title || 'Untitled post'}
                    </p>
                    <p className="text-green-400/70 text-[11px] truncate">
                      thelostandunfounds.com/thelostarchives/{formData.slug || generateSlug(formData.title)}
                    </p>
                    <p className="text-white/50 text-xs line-clamp-2 mt-1">
                      {formData.seo_description || formData.excerpt || buildGeneratedSummary(formData.content) || 'No description yet.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 py-2 group">
                  <div className="w-5 h-5 bg-white/10 flex items-center justify-center transition-colors group-hover:bg-white/20 relative">
                    <input
                      type="checkbox"
                      id="published"
                      checked={formData.published}
                      onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                    />
                    {formData.published && <div className="w-3 h-3 bg-white" />}
                  </div>
                  <label
                    htmlFor="published"
                    className="text-white/40 text-[10px] font-black uppercase tracking-widest cursor-pointer select-none group-hover:text-white transition-colors"
                  >
                    Published
                  </label>
                </div>

                <div className="flex flex-wrap gap-4 pt-4">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => savePost(false)}
                    className="px-6 py-4 bg-white/10 hover:bg-white/20 text-white font-black uppercase tracking-widest text-[10px] transition disabled:opacity-50"
                  >
                    Save Draft
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => savePost(true)}
                    className="flex-1 min-w-[200px] px-8 py-4 bg-white text-black font-black uppercase tracking-widest text-[10px] hover:bg-white/90 transition-all disabled:opacity-50"
                  >
                    {isSaving ? 'Saving…' : editingPost ? 'Update & Publish' : 'Publish Post'}
                  </button>
                  <button
                    type="button"
                    onClick={closeEditor}
                    className="px-6 py-4 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white font-black uppercase tracking-widest text-[10px] transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ExpandableScreenContent>
      </ExpandableScreen>

      {/* ----------------------------------------------------------------- Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ------------------------------------------------------------ Library */}
        <ExpandableScreen isOpen={libraryOpen} onOpenChange={setLibraryOpen}>
          <ExpandableScreenTrigger className="block w-full h-full text-left cursor-pointer">
            <ConsoleTile
              icon={<DocumentTextIcon className="w-4 h-4" />}
              label="The Lost Archives"
              primary={stats.total}
              caption={`${stats.published} published · ${stats.drafts} drafts`}
              detail={stats.missingSeo > 0 ? `${stats.missingSeo} missing SEO` : `Last published ${stats.lastPublished}`}
            />
          </ExpandableScreenTrigger>

          <ExpandableScreenContent className="overflow-x-hidden">
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              <div className="max-w-5xl mx-auto w-full px-4 sm:px-8 pt-20 pb-16 space-y-4">
          {/* Screen heading */}
          <div className="flex items-center justify-between gap-3 mb-8">
            <div className="flex items-center gap-3">
              <DocumentTextIcon className="w-5 h-5 text-white/40" />
              <h2 className="text-xl font-black uppercase tracking-wide text-white">The Lost Archives</h2>
            </div>
            <button
              onClick={() => openEditor(null)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-white/90 transition"
            >
              <PlusIcon className="w-3 h-3" />
              New Post
            </button>
          </div>

          {/* Post counts */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-white/5">
            {[
              { label: 'Total', value: stats.total },
              { label: 'Published', value: stats.published },
              { label: 'Drafts', value: stats.drafts },
              { label: 'Needs SEO', value: stats.missingSeo },
              { label: 'Last Published', value: stats.lastPublished },
            ].map((stat) => (
              <div key={stat.label} className="bg-black p-4 text-left">
                <p className="text-[9px] uppercase tracking-[0.25em] text-white/40 mb-1">{stat.label}</p>
                <p className="text-xl md:text-2xl font-black text-white tabular-nums leading-none">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="w-4 h-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="SEARCH TITLE, SLUG, TAG, BYLINE…"
                className="w-full pl-9 pr-4 py-2.5 bg-white/5 text-white placeholder-white/25 text-[10px] uppercase tracking-widest focus:bg-white/10 focus:outline-none transition-colors"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {(['all', 'published', 'draft'] as StatusFilter[]).map((value) => (
                <button
                  key={value}
                  onClick={() => setStatusFilter(value)}
                  className={cn(
                    'px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-colors',
                    statusFilter === value ? 'bg-white text-black' : 'bg-white/5 text-white/50 hover:bg-white/10'
                  )}
                >
                  {value}
                </button>
              ))}

              <select
                value={columnFilter}
                onChange={(e) => setColumnFilter(e.target.value)}
                className="px-3 py-2 bg-white/5 text-white/70 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:bg-white/10"
              >
                <option value="all" className="bg-black">All columns</option>
                {BLOG_COLUMNS.map((c) => (
                  <option key={c.value} value={c.value} className="bg-black">{c.label}</option>
                ))}
              </select>

              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="px-3 py-2 bg-white/5 text-white/70 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:bg-white/10"
              >
                <option value="newest" className="bg-black">Newest</option>
                <option value="oldest" className="bg-black">Oldest</option>
                <option value="updated" className="bg-black">Recently edited</option>
                <option value="title" className="bg-black">Title A, Z</option>
              </select>
            </div>
          </div>

          {/* Bulk bar */}
          <div className="flex flex-wrap items-center gap-3 bg-white/5 px-3 py-2">
            <button
              onClick={toggleSelectAll}
              className="text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white transition-colors"
            >
              {allVisibleSelected ? 'Clear selection' : 'Select all'}
            </button>
            <span className="text-[10px] uppercase tracking-widest text-white/30">
              {selectedIds.length} selected · {visiblePosts.length} shown
            </span>
            {selectedIds.length > 0 && (
              <div className="flex flex-wrap gap-2 ml-auto">
                <button
                  disabled={isBulkWorking}
                  onClick={() => runBulk('publish')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-widest transition disabled:opacity-50"
                >
                  <ArrowUpTrayIcon className="w-3 h-3" /> Publish
                </button>
                <button
                  disabled={isBulkWorking}
                  onClick={() => runBulk('draft')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-widest transition disabled:opacity-50"
                >
                  <EyeSlashIcon className="w-3 h-3" /> Draft
                </button>
                <button
                  disabled={isBulkWorking}
                  onClick={() => runBulk('delete')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-400/10 hover:bg-red-400/20 text-red-400 text-[10px] font-black uppercase tracking-widest transition disabled:opacity-50"
                >
                  <TrashIcon className="w-3 h-3" /> Delete
                </button>
              </div>
            )}
          </div>

          {/* List */}
          <div id="lost-archives-posts" className="space-y-1">
            {visiblePosts.length === 0 ? (
              <p className="text-white/40 text-sm py-6 text-left">
                {posts.length === 0 ? 'No posts yet: start one with NEW POST.' : 'No posts match these filters.'}
              </p>
            ) : (
              visiblePosts.map((post) => (
                <div
                  key={post.id}
                  className={cn(
                    'group/item p-3 flex items-start gap-3 transition-colors text-left',
                    selectedIds.includes(post.id) ? 'bg-white/10' : 'hover:bg-white/5'
                  )}
                >
                  <div className="w-4 h-4 mt-1 bg-white/10 flex items-center justify-center flex-shrink-0 relative">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(post.id)}
                      onChange={() => toggleSelect(post.id)}
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                      aria-label={`Select ${post.title}`}
                    />
                    {selectedIds.includes(post.id) && <div className="w-2.5 h-2.5 bg-white" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="text-white font-medium text-sm md:text-base leading-tight truncate">
                        {post.title}
                      </h4>
                      <span
                        className={cn(
                          'flex-shrink-0 px-1.5 py-0.5 text-[8px] uppercase tracking-widest font-bold',
                          post.published ? 'text-green-400 bg-green-400/5' : 'text-amber-400 bg-amber-400/5'
                        )}
                      >
                        {post.published ? 'Published' : 'Draft'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-white/40 uppercase tracking-wider mb-2">
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3" />
                        {formatDate(post.published_at || post.created_at)}
                      </span>
                      <span>{COLUMN_LABEL[post.blog_column || 'main'] || post.blog_column}</span>
                      <span className="flex items-center gap-1 normal-case tracking-tight text-white/30">
                        <LinkIcon className="w-3 h-3" />/{post.slug}
                      </span>
                      {post.author_name && <span>{post.author_name}</span>}
                      <span>{countWords(post.content)} words</span>
                      {statBySlug.has(post.slug) && (
                        <span className="text-blue-400/70">
                          {statBySlug.get(post.slug)!.views} views · {statBySlug.get(post.slug)!.reads} reads
                        </span>
                      )}
                      {(!post.seo_title || !post.seo_description) && (
                        <span className="text-amber-400/70">Needs SEO</span>
                      )}
                    </div>

                    {post.excerpt && (
                      <p className="text-white/60 text-xs line-clamp-2 leading-relaxed text-left">{post.excerpt}</p>
                    )}

                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {post.tags.map((tag) => (
                          <span key={tag} className="px-2 py-0.5 bg-white/5 text-white/40 text-[9px] uppercase tracking-widest">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {post.published ? (
                      <>
                        <a
                          href={postUrl(post)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-white/30 hover:text-white hover:bg-white/5 transition-all"
                          title="View post"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => {
                            setTargetPostId(post.id);
                            setIsUnpublishing(true);
                          }}
                          className="p-2 text-amber-500/40 hover:text-amber-400 hover:bg-amber-400/10 transition-all"
                          title="Unpublish"
                        >
                          <EyeSlashIcon className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handlePublishNow(post)}
                        className="p-2 text-green-400/50 hover:text-green-400 hover:bg-green-400/10 transition-all"
                        title="Publish now"
                      >
                        <ArrowUpTrayIcon className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDuplicate(post)}
                      className="p-2 text-white/30 hover:text-white hover:bg-white/5 transition-all"
                      title="Duplicate as draft"
                    >
                      <DocumentDuplicateIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openEditor(post)}
                      className="p-2 text-white/30 hover:text-white hover:bg-white/5 transition-all"
                      title="Edit post"
                    >
                      <PencilSquareIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="p-2 text-red-500/40 hover:text-red-400 hover:bg-red-400/10 transition-all"
                      title="Delete post"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
              </div>
            </div>
          </ExpandableScreenContent>
        </ExpandableScreen>

        {/* ---------------------------------------------------------- Analytics */}
        <ExpandableScreen isOpen={analyticsOpen} onOpenChange={setAnalyticsOpen}>
          <ExpandableScreenTrigger className="block w-full h-full text-left cursor-pointer">
            <ConsoleTile
              icon={<ChartBarIcon className="w-4 h-4" />}
              label="Blog Analytics"
              primary={analyticsLoading ? '…' : (analytics?.totals?.views ?? 0).toLocaleString()}
              caption={`Views · last ${analyticsRange} days`}
              detail={
                analytics?.totals
                  ? `${analytics.totals.uniqueVisitors} readers · ${Math.round(analytics.totals.readRate)}% read through`
                  : 'No traffic recorded yet'
              }
            >
              {(analytics?.trend?.length || 0) > 1 && (
                <div className={cn('h-12 w-full mt-3', CHART_ACCENTS.analytics)}>
                  <Sparkline values={analytics!.trend.map((t) => t.count)} />
                </div>
              )}
            </ConsoleTile>
          </ExpandableScreenTrigger>

          <ExpandableScreenContent className="overflow-x-hidden">
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              <div className="max-w-5xl mx-auto w-full px-4 sm:px-8 pt-20 pb-16 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <ChartBarIcon className="w-5 h-5 text-white/40" />
                    <h2 className="text-xl font-black uppercase tracking-wide text-white">Blog Analytics</h2>
                  </div>
                  <div className="flex gap-2">
                    {[7, 30, 90].map((days) => (
                      <button
                        key={days}
                        onClick={() => setAnalyticsRange(days)}
                        className={cn(
                          'px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-colors',
                          analyticsRange === days ? 'bg-white text-black' : 'bg-white/5 text-white/50 hover:bg-white/10'
                        )}
                      >
                        {days}D
                      </button>
                    ))}
                  </div>
                </div>

                {analyticsLoading ? (
                  <p className="text-white/40 text-sm text-left">Loading analytics…</p>
                ) : !analytics?.totals ? (
                  <p className="text-white/40 text-sm text-left">
                    No blog traffic recorded in this window yet. Views are collected on every article
                    page load: figures appear here once readers arrive.
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-white/5">
                      {[
                        { label: 'Views', value: analytics.totals.views.toLocaleString() },
                        { label: 'Readers', value: analytics.totals.uniqueVisitors.toLocaleString() },
                        { label: 'Finished', value: analytics.totals.reads.toLocaleString() },
                        { label: 'Read Rate', value: `${Math.round(analytics.totals.readRate)}%` },
                        { label: 'Avg Time', value: `${analytics.totals.avgSeconds}s` },
                      ].map((stat) => (
                        <div key={stat.label} className="bg-black p-4 text-left">
                          <p className="text-[9px] uppercase tracking-[0.25em] text-white/40 mb-1">{stat.label}</p>
                          <p className="text-xl md:text-2xl font-black text-white tabular-nums leading-none">{stat.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="bg-white/5 p-5">
                      <p className="text-[9px] uppercase tracking-[0.3em] text-white/40 mb-4">
                        Daily views · last {analytics.days} days
                      </p>
                      <div className={cn('h-32 w-full', CHART_ACCENTS.analytics)}>
                        <Sparkline values={analytics.trend.map((t) => t.count)} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white/5 p-5">
                        <p className="text-[9px] uppercase tracking-[0.3em] text-white/40 mb-4">Where readers come from</p>
                        {analytics.sources.length === 0 ? (
                          <p className="text-white/30 text-xs text-left">No data yet</p>
                        ) : (
                          <div className="space-y-2">
                            {analytics.sources.map((source) => (
                              <div key={source.source} className="flex items-center justify-between bg-white/5 px-3 py-2">
                                <span className="text-xs text-white/80">{source.source}</span>
                                <span className="text-xs font-mono text-white/50">{source.count}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="bg-white/5 p-5">
                        <p className="text-[9px] uppercase tracking-[0.3em] text-white/40 mb-4">Top posts</p>
                        {analytics.posts.filter((p) => p.views > 0).length === 0 ? (
                          <p className="text-white/30 text-xs text-left">No post views yet</p>
                        ) : (
                          <div className="space-y-2">
                            {analytics.posts.filter((p) => p.views > 0).slice(0, 5).map((post) => (
                              <div key={post.id} className="flex items-center justify-between bg-white/5 px-3 py-2 gap-3">
                                <span className="text-xs text-white/80 truncate">{post.title}</span>
                                <span className="text-xs font-mono text-white/50 flex-shrink-0">{post.views}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Per-post table */}
                    <div className="bg-white/5 p-5">
                      <p className="text-[9px] uppercase tracking-[0.3em] text-white/40 mb-4">Every post</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="text-[9px] uppercase tracking-[0.2em] text-white/30">
                              <th className="py-2 pr-4 font-black">Post</th>
                              <th className="py-2 px-2 font-black tabular-nums">Views</th>
                              <th className="py-2 px-2 font-black tabular-nums">Readers</th>
                              <th className="py-2 px-2 font-black tabular-nums">Finished</th>
                              <th className="py-2 px-2 font-black tabular-nums">Read %</th>
                              <th className="py-2 pl-2 font-black tabular-nums">Avg Time</th>
                            </tr>
                          </thead>
                          <tbody>
                            {analytics.posts.map((post) => (
                              <tr key={post.id} className="text-xs text-white/70">
                                <td className="py-2 pr-4 max-w-[240px] truncate">
                                  <a
                                    href={`/thelostarchives/${post.slug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-white transition-colors"
                                  >
                                    {post.title}
                                  </a>
                                  {!post.published && (
                                    <span className="ml-2 text-[8px] uppercase tracking-widest text-amber-400">Draft</span>
                                  )}
                                </td>
                                <td className="py-2 px-2 tabular-nums text-white">{post.views}</td>
                                <td className="py-2 px-2 tabular-nums">{post.uniqueVisitors}</td>
                                <td className="py-2 px-2 tabular-nums">{post.reads}</td>
                                <td className="py-2 px-2 tabular-nums">{Math.round(post.readRate)}%</td>
                                <td className="py-2 pl-2 tabular-nums">{post.avgSeconds}s</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </ExpandableScreenContent>
        </ExpandableScreen>
      </div>

      <UnpublishModal
        isOpen={isUnpublishing}
        onClose={() => {
          setIsUnpublishing(false);
          setUnpublishReason('');
          setTargetPostId(null);
        }}
        onConfirm={handleUnpublish}
        reason={unpublishReason}
        setReason={setUnpublishReason}
        isProcessing={isProcessingUnpublish}
      />
    </div>
  );
}

/**
 * At-a-glance face for a management screen. Clicking it opens the full screen;
 * it is a face, not a collapsible panel, so nothing expands in place.
 */
function ConsoleTile({
  icon,
  label,
  primary,
  caption,
  detail,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  primary: React.ReactNode;
  caption: string;
  detail?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-white/5 hover:bg-white/10 transition-colors p-5 h-full flex flex-col text-left">
      <div className="flex items-center gap-2 text-white/50 mb-6">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-[0.25em]">{label}</span>
      </div>
      <p className="text-4xl font-black text-white tabular-nums leading-none">{primary}</p>
      <p className="text-[10px] uppercase tracking-widest text-white/40 mt-2">{caption}</p>
      {detail && <p className="text-[10px] uppercase tracking-widest text-white/25 mt-1">{detail}</p>}
      {children}
    </div>
  );
}

// Separate component for the Unpublish Reason Modal
function UnpublishModal({
  isOpen,
  onClose,
  onConfirm,
  reason,
  setReason,
  isProcessing
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  reason: string;
  setReason: (r: string) => void;
  isProcessing: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in duration-300">
      <div className="bg-[#0A0A0A] p-10 w-full max-w-lg animate-in zoom-in-95 duration-300">
        <h3 className="text-xl font-black text-white uppercase tracking-[0.3em] mb-4">Unpublish Article</h3>
        <p className="text-white/30 mb-10 text-[10px] leading-relaxed uppercase tracking-[0.15em] font-medium text-left">
          This operation will revert the post to DRAFT status and return the source material to the REVIEW CYCLE.
          Author notification is required.
        </p>

        <div className="mb-10">
          <label className="block text-white/20 text-[9px] uppercase tracking-[0.3em] mb-3 font-black">Reason for Withdrawal</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-4 py-4 bg-white/5 text-white focus:bg-white/10 transition-colors outline-none h-40 resize-none text-xs uppercase tracking-widest"
            placeholder="EXPLAIN THE REASON FOR WITHDRAWAL..."
            autoFocus
          />
        </div>

        <div className="flex gap-4">
          <button
            onClick={onConfirm}
            disabled={isProcessing || !reason.trim()}
            className="flex-1 px-6 py-4 bg-white text-black font-black uppercase tracking-widest text-[10px] hover:bg-white/90 transition-all disabled:opacity-50"
          >
            {isProcessing ? 'PROCESSING...' : 'UNPUBLISH & NOTIFY'}
          </button>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-6 py-4 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white font-black uppercase tracking-widest text-[10px] transition-all"
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}
