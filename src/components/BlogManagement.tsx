/**
 * Blog Management Component
 * Admin interface for creating and editing blog posts
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useToast } from './Toast';
import { LoadingOverlay } from './Loading';
import { isAdminEmail } from '../utils/admin';
import { DocumentTextIcon, PlusIcon, PencilSquareIcon, TrashIcon, EyeIcon, EyeSlashIcon, CalendarIcon } from '@heroicons/react/24/outline';
import RichTextEditor from './RichTextEditor';
import { unescapeContent } from '../utils/blogUtils';
import { AdminBentoCard } from './ui/admin-bento-card';
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
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  og_image_url: string | null;
  featured_image?: string | null; // Support existing field
  author_id?: string | null;
  user_id?: string | null;
  blog_column?: string | null;
  subdomain?: string | null;
  amazon_affiliate_links?: any[] | null;
}

const BLOG_COLUMNS = [
  { value: 'main', label: 'Main Blog (The Lost Archives)' },
  { value: 'bookclub', label: 'Book Club' },
  { value: 'gearheads', label: 'GearHeads' },
  { value: 'borderlands', label: 'Edge of the Borderlands' },
  { value: 'science', label: 'Mad Scientists' },
  { value: 'newtheory', label: 'New Theory' }
];

export default function BlogManagement() {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isBookClubPost, setIsBookClubPost] = useState(false);
  const [userSubdomain, setUserSubdomain] = useState<string | null>(null);
  const [formData, setFormData] = useState({
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
  });

  // Unpublish Reason Modal State
  const [isUnpublishing, setIsUnpublishing] = useState(false);
  const [unpublishReason, setUnpublishReason] = useState('');
  const [targetPostId, setTargetPostId] = useState<string | null>(null);
  const [isProcessingUnpublish, setIsProcessingUnpublish] = useState(false);

  useEffect(() => {
    loadPosts();
    loadUserSubdomain();
  }, []);

  const loadUserSubdomain = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_subdomains')
        .select('subdomain')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data?.subdomain) {
        setUserSubdomain(data.subdomain);
      }
    } catch (err) {
      // Table might not exist - that's okay
      console.warn('Error loading subdomain:', err);
    }
  };

  const loadPosts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*, author_id, user_id, subdomain, blog_column')
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
        published: post.published !== undefined
          ? post.published
          : (post.status === 'published')
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
    const source = (content || '').trim();
    if (!source) return '';
    const sentences = source
      .replace(/\s+/g, ' ')
      .split(/(?<=[.!?])\s+/)
      .filter(Boolean);
    const candidate = sentences.slice(0, 2).join(' ');
    const preview = candidate || sentences[0] || source;
    return preview.length > 220
      ? preview.substring(0, 220).replace(/\s+\S*$/, '') + '...'
      : preview;
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleTitleChange = (title: string) => {
    setFormData({
      ...formData,
      title,
      slug: formData.slug || generateSlug(title),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      showError('You must be logged in to create/edit posts');
      return;
    }

    try {
      // Set published_at when publishing for the first time
      const shouldSetPublishedAt = formData.published && (!editingPost || !editingPost.published_at);

      const autoExcerpt = (!formData.excerpt || formData.excerpt.trim().length === 0)
        ? buildGeneratedSummary(formData.content)
        : formData.excerpt;

      const postData = {
        ...formData,
        slug: formData.slug || generateSlug(formData.title),
        published_at: shouldSetPublishedAt
          ? new Date().toISOString()
          : editingPost?.published_at || null,
        status: formData.published ? 'published' : 'draft', // Keep status in sync
        author_id: editingPost ? (editingPost.author_id || editingPost.user_id) : user.id,
        user_id: editingPost ? (editingPost.user_id || editingPost.author_id) : user.id,
        excerpt: autoExcerpt || null,
        seo_title: formData.seo_title || null,
        seo_description: formData.seo_description || null,
        seo_keywords: formData.seo_keywords || null,
        og_image_url: formData.og_image_url || null,
        blog_column: formData.blog_column || null,
        // Set subdomain if creating a book club post
        subdomain: isBookClubPost && userSubdomain ? userSubdomain : (editingPost?.subdomain || null),
      };

      if (editingPost) {
        // Update existing post
        const { error } = await supabase
          .from('blog_posts')
          .update(postData)
          .eq('id', editingPost.id);

        if (error) throw error;
        success('Post updated successfully');
      } else {
        // Create new post
        const { error } = await supabase
          .from('blog_posts')
          .insert([postData]);

        if (error) throw error;
        success('Post created successfully');
      }

      // Reset form
      setFormData({
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
      });
      setEditingPost(null);
      setIsCreating(false);
      setIsBookClubPost(false);
      loadPosts();
    } catch (err: any) {
      console.error('Error saving post:', err);
      showError(err.message || 'Failed to save post');
    }
  };

  const handleEdit = (post: BlogPost) => {
    setEditingPost(post);
    setIsCreating(true);
    setIsBookClubPost(!!post.subdomain);
    // Handle both published boolean and status field for backward compatibility
    const isPublished = post.published !== undefined
      ? post.published
      : (post.status === 'published');

    setFormData({
      title: post.title,
      slug: post.slug,
      content: unescapeContent(post.content),
      excerpt: post.excerpt || '',
      published: isPublished,
      seo_title: post.seo_title || '',
      seo_description: post.seo_description || '',
      seo_keywords: post.seo_keywords || '',
      og_image_url: post.og_image_url || post.featured_image || '',
      blog_column: post.blog_column || (post.subdomain ? 'bookclub' : 'main'),
    });

    // Scroll to top so user sees the editor form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      success('Post deleted successfully');
      loadPosts();
    } catch (err: any) {
      console.error('Error deleting post:', err);
      showError(err.message || 'Failed to delete post');
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
        .update({
          published: false,
          status: 'draft'
        })
        .eq('id', targetPostId);

      if (updateError) throw updateError;

      // 3. Revert submission status if linked
      let submissionId = post.submission_id;

      // Fallback: If submission_id is missing, try to find a matching submission by title
      if (!submissionId) {
        console.log(`No submission_id for post "${post.title}", attempting title-based lookup...`);
        const { data: matchedSub } = await supabase
          .from('blog_submissions')
          .select('id')
          .eq('title', post.title)
          .maybeSingle();

        if (matchedSub) {
          submissionId = matchedSub.id;
          console.log(`Found matching submission ID: ${submissionId}`);

          // Link it in the database for future use
          await supabase
            .from('blog_posts')
            .update({ submission_id: submissionId })
            .eq('id', targetPostId);
        }
      }

      if (submissionId) {
        // Fetch submission details for the email
        const { data: submission, error: subError } = await supabase
          .from('blog_submissions')
          .select('author_email, author_name, title')
          .eq('id', submissionId)
          .single();

        if (!subError && submission) {
          // Revert submission status
          await supabase
            .from('blog_submissions')
            .update({
              status: 'pending',
              rejected_reason: unpublishReason
            })
            .eq('id', submissionId);

          // Send notification email via API
          try {
            await fetch('/api/blog/submission-unpublished', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                authorEmail: submission.author_email,
                authorName: submission.author_name,
                articleTitle: submission.title,
                unpublishReason: unpublishReason
              })
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
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return <LoadingOverlay message="Loading Blog Posts" />;
  }

  // Separate posts into categories
  const currentUserId = user?.id;
  const isAdmin = user?.email ? isAdminEmail(user.email) : false;

  // THE LOST ARCHIVES posts: ALL posts without subdomain
  // Since admin is the only writer, show all posts without subdomain
  const lostArchivesPosts = posts.filter((post) => {
    return !post.subdomain; // All posts without subdomain are THE LOST ARCHIVES
  });

  // All admin posts (including book club posts) - for admin, this is all posts
  const adminPosts = isAdmin
    ? posts
    : posts.filter((post) => {
      const postAuthorId = post.author_id || post.user_id;
      return postAuthorId === currentUserId;
    });

  // Admin's book club posts (admin posts with subdomain)
  const adminBookClubPosts = posts.filter((post) => {
    const postAuthorId = post.author_id || post.user_id;
    return postAuthorId === currentUserId && post.subdomain;
  });

  // Other users' book club posts (not admin)
  const bookClubPosts = posts.filter((post) => {
    const postAuthorId = post.author_id || post.user_id;
    return post.subdomain && postAuthorId !== currentUserId;
  });

  // Other users' regular posts (not admin, no subdomain)
  const regularPosts = posts.filter((post) => {
    const postAuthorId = post.author_id || post.user_id;
    return !post.subdomain && postAuthorId !== currentUserId;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <DocumentTextIcon className="w-5 h-5" />
          Blog Management
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Create/Edit Form */}
        {isCreating && (
          <AdminBentoCard
            title={editingPost ? 'Edit Post' : isBookClubPost ? 'Create New Book Club Post' : 'Create New Post'}
            className="md:col-span-2"
          >
            {isBookClubPost && !editingPost && userSubdomain && (
              <div className="mb-8 p-4 bg-white/5 border-l-2 border-white/20">
                <p className="text-white text-[10px] font-bold uppercase tracking-widest">
                  Target Destination: <span className="text-blue-400">{userSubdomain}.thelostandunfounds.com</span>
                </p>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-white/80 text-xs uppercase tracking-wider mb-2 font-medium">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder-white/20 focus:border-white focus:outline-none transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-white/80 text-xs uppercase tracking-wider mb-2 font-medium">Slug</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder-white/20 focus:border-white focus:outline-none transition-colors"
                  placeholder="auto-generated-from-title"
                />
              </div>

              <div>
                <label className="block text-white/80 text-xs uppercase tracking-wider mb-2 font-medium">Content</label>
                <div className="border border-white/5">
                  <RichTextEditor
                    content={formData.content}
                    onChange={(html, links) => {
                      setFormData({ ...formData, content: html });
                    }}
                    placeholder="Write your post content here..."
                  />
                </div>
                <p className="text-white/40 text-[10px] mt-2 uppercase tracking-tight">Select text and click "Add Product Link" to add affiliate links.</p>
              </div>

              <div>
                <label className="block text-white/80 text-xs uppercase tracking-wider mb-2 font-medium">Excerpt (optional)</label>
                <textarea
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder-white/20 focus:border-white focus:outline-none transition-colors"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-white/80 text-xs uppercase tracking-wider mb-2 font-medium">Column Classification</label>
                <select
                  value={formData.blog_column}
                  onChange={(e) => setFormData({ ...formData, blog_column: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder-white/20 focus:border-white focus:outline-none transition-colors"
                >
                  {BLOG_COLUMNS.map(column => (
                    <option key={column.value} value={column.value} className="bg-black">
                      {column.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/80 text-xs uppercase tracking-wider mb-2 font-medium">SEO Title (optional)</label>
                  <input
                    type="text"
                    value={formData.seo_title}
                    onChange={(e) => setFormData({ ...formData, seo_title: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder-white/20 focus:border-white focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-xs uppercase tracking-wider mb-2 font-medium">OG Image URL (optional)</label>
                  <input
                    type="url"
                    value={formData.og_image_url}
                    onChange={(e) => setFormData({ ...formData, og_image_url: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder-white/20 focus:border-white focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white/80 text-xs uppercase tracking-wider mb-2 font-medium">SEO Description (optional)</label>
                <textarea
                  value={formData.seo_description}
                  onChange={(e) => setFormData({ ...formData, seo_description: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder-white/20 focus:border-white focus:outline-none transition-colors"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-white/80 text-xs uppercase tracking-wider mb-2 font-medium">SEO Keywords (optional)</label>
                <input
                  type="text"
                  value={formData.seo_keywords}
                  onChange={(e) => setFormData({ ...formData, seo_keywords: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder-white/20 focus:border-white focus:outline-none transition-colors"
                  placeholder="keyword1, keyword2, keyword3"
                />
              </div>

              <div className="flex items-center gap-3 py-2">
                <div className="w-5 h-5 border border-white/20 flex items-center justify-center transition-colors group-hover:border-white/40">
                  <input
                    type="checkbox"
                    id="published"
                    checked={formData.published}
                    onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                    className="opacity-0 absolute w-full h-full cursor-pointer z-10"
                  />
                  {formData.published && <div className="w-3 h-3 bg-white" />}
                </div>
                <label htmlFor="published" className="text-white/40 text-[10px] font-black uppercase tracking-widest cursor-pointer select-none group-hover:text-white transition-colors">
                  Publish immediately
                </label>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-8 py-4 bg-white text-black font-black uppercase tracking-widest text-[10px] hover:bg-white/90 transition-all"
                >
                  {editingPost ? 'UPDATE PUBLISHED CONTENT' : 'CREATE & DEPLOY POST'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setIsBookClubPost(false);
                    setEditingPost(null);
                    setFormData({
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
                    });
                  }}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold uppercase tracking-widest text-xs transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </AdminBentoCard>
        )}

        {/* THE LOST ARCHIVES Section (Admin's regular posts - no subdomain) */}
        <AdminBentoCard
          title="THE LOST ARCHIVES"
          action={
            <button
              onClick={() => {
                setIsCreating(true);
                setIsBookClubPost(false);
                setEditingPost(null);
                setFormData({
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
                });
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-white text-black text-[10px] font-bold uppercase tracking-widest hover:bg-white/90 transition shadow-sm"
            >
              <PlusIcon className="w-3 h-3" />
              NEW POST
            </button>
          }
        >
          <div id="lost-archives-posts" className="divide-y divide-white/5">
            {lostArchivesPosts.length === 0 ? (
              <p className="text-white/40 text-sm py-4">No THE LOST ARCHIVES posts yet.</p>
            ) : (
              lostArchivesPosts
                .sort((a, b) => {
                  const dateA = a.published_at || a.created_at;
                  const dateB = b.published_at || b.created_at;
                  return new Date(dateB).getTime() - new Date(dateA).getTime();
                })
                .map((post) => (
                  <div
                    key={post.id}
                    className="group/item py-4 flex items-start justify-between gap-4 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="text-white font-medium text-sm md:text-base leading-tight truncate">
                          {post.title}
                        </h4>
                        <span className={cn(
                          "flex-shrink-0 px-1.5 py-0.5 text-[8px] uppercase tracking-widest font-bold border",
                          post.published
                            ? "text-green-400 border-green-400/30 bg-green-400/5"
                            : "text-amber-400 border-amber-400/30 bg-amber-400/5"
                        )}>
                          {post.published ? 'Published' : 'Draft'}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-[10px] text-white/40 uppercase tracking-wider mb-2">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3" />
                          {formatDate(post.published_at || post.created_at)}
                        </span>
                      </div>

                      {post.excerpt && (
                        <p className="text-white/60 text-xs line-clamp-2 leading-relaxed text-left">
                          {post.excerpt}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {post.published && (
                        <>
                          <a
                            href={`/thelostarchives/${post.slug}`}
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
                      )}
                      <button
                        onClick={() => handleEdit(post)}
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
        </AdminBentoCard>



        <AdminBentoCard
          title="BOOK CLUB POSTS"
          action={
            <button
              onClick={() => {
                setIsCreating(true);
                setIsBookClubPost(true);
                setEditingPost(null);
                setFormData({
                  title: '',
                  slug: '',
                  content: '',
                  excerpt: '',
                  published: false,
                  seo_title: '',
                  seo_description: '',
                  seo_keywords: '',
                  og_image_url: '',
                  blog_column: 'bookclub',
                });
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-white text-black text-[10px] font-bold uppercase tracking-widest hover:bg-white/90 transition shadow-sm"
            >
              <PlusIcon className="w-3 h-3" />
              NEW BOOK CLUB POST
            </button>
          }
        >
          <div id="book-club-posts" className="divide-y divide-white/5">
            {bookClubPosts.length === 0 ? (
              <p className="text-white/40 text-sm py-4">No book club posts yet.</p>
            ) : (
              bookClubPosts
                .sort((a, b) => {
                  const dateA = a.published_at || a.created_at;
                  const dateB = b.published_at || b.created_at;
                  return new Date(dateB).getTime() - new Date(dateA).getTime();
                })
                .map((post) => (
                  <div
                    key={post.id}
                    className="group/item py-4 flex items-start justify-between gap-4 transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="text-white font-medium text-sm md:text-base leading-tight truncate">
                          {post.title}
                        </h4>
                        <span className={cn(
                          "flex-shrink-0 px-1.5 py-0.5 text-[8px] uppercase tracking-widest font-bold border",
                          post.published
                            ? "text-green-400 border-green-400/30 bg-green-400/5"
                            : "text-amber-400 border-amber-400/30 bg-amber-400/5"
                        )}>
                          {post.published ? 'Published' : 'Draft'}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-[10px] text-white/40 uppercase tracking-wider mb-2">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3" />
                          {formatDate(post.published_at || post.created_at)}
                        </span>
                        {post.subdomain && (
                          <span className="text-blue-400/60 border-l border-white/10 pl-4">
                            {post.subdomain}
                          </span>
                        )}
                      </div>

                      {post.excerpt && (
                        <p className="text-white/60 text-xs line-clamp-2 leading-relaxed">
                          {post.excerpt}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {post.published && (
                        <>
                          <a
                            href={`/blog/${post.subdomain}/${post.slug}`}
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
                      )}
                      <button
                        onClick={() => handleEdit(post)}
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
        </AdminBentoCard>

        {/* Empty State */}
        {adminPosts.length === 0 && bookClubPosts.length === 0 && !isCreating && (
          <div className="md:col-span-2">
            <AdminBentoCard title="STATUS">
              <p className="text-white/40 text-sm py-8 text-center uppercase tracking-widest">No blog posts found.</p>
            </AdminBentoCard>
          </div>
        )}
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
    </div >
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
      <div className="bg-[#0A0A0A] border border-white/5 p-10 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300">
        <h3 className="text-xl font-black text-white uppercase tracking-[0.3em] mb-4">Unpublish Article</h3>
        <p className="text-white/30 mb-10 text-[10px] leading-relaxed uppercase tracking-[0.15em] font-medium">
          This operation will revert the post to DRAFT status and return the source material to the REVIEW CYCLE.
          Author notification is required.
        </p>

        <div className="mb-10">
          <label className="block text-white/20 text-[9px] uppercase tracking-[0.3em] mb-3 font-black">Reason for Withdrawal</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-4 py-4 bg-white/5 border border-white/10 text-white focus:border-white transition-colors outline-none h-40 resize-none text-xs uppercase tracking-widest"
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
