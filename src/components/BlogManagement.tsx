/**
 * Blog Management Component
 * Admin interface for creating and editing blog posts
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useToast } from './Toast';
import { LoadingSpinner } from './Loading';
import { isAdminEmail } from '../utils/admin';
import { FileText, Plus, Edit, Trash2, Eye, EyeOff, Calendar } from 'lucide-react';
import RichTextEditor from './RichTextEditor';

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
      content: post.content,
      excerpt: post.excerpt || '',
      published: isPublished,
      seo_title: post.seo_title || '',
      seo_description: post.seo_description || '',
      seo_keywords: post.seo_keywords || '',
      og_image_url: post.og_image_url || post.featured_image || '',
      blog_column: post.blog_column || 'main',
    });
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
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
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
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Blog Management
        </h2>
      </div>

      {/* Create/Edit Form */}
      {isCreating && (
        <div className="bg-black/50 border border-white rounded-none p-6">
          <h3 className="text-lg font-bold text-white mb-4">
            {editingPost ? 'Edit Post' : isBookClubPost ? 'Create New Book Club Post' : 'Create New Post'}
          </h3>
          {isBookClubPost && !editingPost && userSubdomain && (
            <div className="mb-4 p-3 bg-blue-900/20 border border-white rounded-none">
              <p className="text-blue-300 text-sm">
                This post will be published to the Book Club with subdomain: <span className="font-mono">{userSubdomain}</span>
              </p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-white/80 text-sm mb-2">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="w-full px-4 py-2 bg-black/50 border border-white rounded-none text-white focus:border-white focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-white/80 text-sm mb-2">Slug</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="w-full px-4 py-2 bg-black/50 border border-white rounded-none text-white focus:border-white focus:outline-none"
                placeholder="auto-generated-from-title"
              />
            </div>

            <div>
              <label className="block text-white/80 text-sm mb-2">Content</label>
              <RichTextEditor
                content={formData.content}
                onChange={(html, links) => {
                  setFormData({ ...formData, content: html });
                }}
                placeholder="Write your post content here..."
              />
              <p className="text-white/50 text-xs mt-2">Select text and click "Add Product Link" to add affiliate links.</p>
            </div>

            <div>
              <label className="block text-white/80 text-sm mb-2">Excerpt (optional)</label>
              <textarea
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                className="w-full px-4 py-2 bg-black/50 border border-white rounded-none text-white focus:border-white focus:outline-none"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-white/80 text-sm mb-2">Column Classification</label>
              <select
                value={formData.blog_column}
                onChange={(e) => setFormData({ ...formData, blog_column: e.target.value })}
                className="w-full px-4 py-2 bg-black/50 border border-white rounded-none text-white focus:border-white focus:outline-none"
              >
                {BLOG_COLUMNS.map(column => (
                  <option key={column.value} value={column.value}>
                    {column.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white/80 text-sm mb-2">SEO Title (optional)</label>
                <input
                  type="text"
                  value={formData.seo_title}
                  onChange={(e) => setFormData({ ...formData, seo_title: e.target.value })}
                  className="w-full px-4 py-2 bg-black/50 border border-white rounded-none text-white focus:border-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-white/80 text-sm mb-2">OG Image URL (optional)</label>
                <input
                  type="url"
                  value={formData.og_image_url}
                  onChange={(e) => setFormData({ ...formData, og_image_url: e.target.value })}
                  className="w-full px-4 py-2 bg-black/50 border border-white rounded-none text-white focus:border-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-white/80 text-sm mb-2">SEO Description (optional)</label>
              <textarea
                value={formData.seo_description}
                onChange={(e) => setFormData({ ...formData, seo_description: e.target.value })}
                className="w-full px-4 py-2 bg-black/50 border border-white rounded-none text-white focus:border-white focus:outline-none"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-white/80 text-sm mb-2">SEO Keywords (optional)</label>
              <input
                type="text"
                value={formData.seo_keywords}
                onChange={(e) => setFormData({ ...formData, seo_keywords: e.target.value })}
                className="w-full px-4 py-2 bg-black/50 border border-white rounded-none text-white focus:border-white focus:outline-none"
                placeholder="keyword1, keyword2, keyword3"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="published"
                checked={formData.published}
                onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="published" className="text-white/80 text-sm">
                Publish immediately
              </label>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="px-6 py-2 bg-white text-black font-semibold rounded-none hover:bg-white/90 transition"
              >
                {editingPost ? 'Update Post' : 'Create Post'}
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
                className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-none text-white transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* THE LOST ARCHIVES Section (Admin's regular posts - no subdomain) */}
      <div className="bg-black/50 border border-white rounded-none p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">THE LOST ARCHIVES</h3>
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
            className="px-4 py-2 bg-white text-black font-semibold rounded-none hover:bg-white/90 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            NEW POST
          </button>
        </div>
        {lostArchivesPosts.length === 0 ? (
          <p className="text-white/60">No THE LOST ARCHIVES posts yet. Create your first post above.</p>
        ) : (
          <div className="space-y-4">
            {lostArchivesPosts
              .sort((a, b) => {
                const dateA = a.published_at || a.created_at;
                const dateB = b.published_at || b.created_at;
                return new Date(dateB).getTime() - new Date(dateA).getTime();
              })
              .map((post) => (
                <div
                  key={post.id}
                  className="bg-black/30 border border-white rounded-none p-4 hover:border-white transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-white font-bold text-lg mb-2">{post.title}</h4>
                      <div className="flex items-center gap-4 text-sm text-white/60 mb-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(post.published_at || post.created_at)}
                        </span>
                        <span className={`px-2 py-1 rounded-none text-xs ${post.published
                          ? 'bg-green-400/20 text-green-400 border border-white'
                          : 'bg-yellow-400/20 text-yellow-400 border border-white'
                          }`}>
                          {post.published ? 'Published' : 'Draft'}
                        </span>
                      </div>
                      {post.excerpt && (
                        <p className="text-white/70 text-sm">{post.excerpt.substring(0, 100)}...</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {post.published && (
                        <>
                          <a
                            href={`/thelostarchives/${post.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-white/10 rounded-none transition"
                            title="View post"
                          >
                            <Eye className="w-4 h-4 text-white/60" />
                          </a>
                          <button
                            onClick={() => {
                              setTargetPostId(post.id);
                              setIsUnpublishing(true);
                            }}
                            className="p-2 hover:bg-yellow-500/20 rounded-none transition"
                            title="Unpublish (revert to review)"
                          >
                            <EyeOff className="w-4 h-4 text-yellow-400" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleEdit(post)}
                        className="p-2 hover:bg-white/10 rounded-none transition"
                        title="Edit post"
                      >
                        <Edit className="w-4 h-4 text-white/60" />
                      </button>
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="p-2 hover:bg-red-500/20 rounded-none transition"
                        title="Delete post"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* My Book Club Posts Section (Admin's book club posts) */}
      {adminBookClubPosts.length > 0 && (
        <div className="bg-black/50 border border-white rounded-none p-6">
          <h3 className="text-lg font-bold text-white mb-4">MY BOOK CLUB POSTS</h3>
          <div className="space-y-4">
            {adminBookClubPosts.map((post) => (
              <div
                key={post.id}
                className="bg-black/30 border border-white rounded-none p-4 hover:border-white transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-white font-bold text-lg mb-2">{post.title}</h4>
                    <div className="flex items-center gap-4 text-sm text-white/60 mb-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(post.published_at || post.created_at)}
                      </span>
                      <span className={`px-2 py-1 rounded-none text-xs ${post.published
                        ? 'bg-green-400/20 text-green-400 border border-white'
                        : 'bg-yellow-400/20 text-yellow-400 border border-white'
                        }`}>
                        {post.published ? 'Published' : 'Draft'}
                      </span>
                      {post.subdomain && (
                        <span className="px-2 py-1 rounded-none text-xs bg-blue-400/20 text-blue-400 border border-white">
                          {post.subdomain}
                        </span>
                      )}
                    </div>
                    {post.excerpt && (
                      <p className="text-white/70 text-sm">{post.excerpt.substring(0, 100)}...</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {post.published && (
                      <>
                        <a
                          href={`/blog/${post.subdomain}/${post.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-white/10 rounded-none transition"
                          title="View post"
                        >
                          <Eye className="w-4 h-4 text-white/60" />
                        </a>
                        <button
                          onClick={() => {
                            setTargetPostId(post.id);
                            setIsUnpublishing(true);
                          }}
                          className="p-2 hover:bg-yellow-500/20 rounded-none transition"
                          title="Unpublish (revert to draft)"
                        >
                          <EyeOff className="w-4 h-4 text-yellow-400" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleEdit(post)}
                      className="p-2 hover:bg-white/10 rounded-none transition"
                      title="Edit post"
                    >
                      <Edit className="w-4 h-4 text-white/60" />
                    </button>
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="p-2 hover:bg-red-500/20 rounded-none transition"
                      title="Delete post"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Book Club Posts Section */}
      <div className="bg-black/50 border border-white rounded-none p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Book Club Posts</h3>
          <a
            href="/submit-article"
            className="px-4 py-2 bg-white text-black font-semibold rounded-none hover:bg-white/90 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            NEW BOOK CLUB POST
          </a>
        </div>
        {bookClubPosts.length === 0 ? (
          <p className="text-white/60">No book club posts yet.</p>
        ) : (
          <div className="space-y-4">
            {bookClubPosts.map((post) => (
              <div
                key={post.id}
                className="bg-black/30 border border-white rounded-none p-4 hover:border-white transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-white font-bold text-lg mb-2">{post.title}</h4>
                    <div className="flex items-center gap-4 text-sm text-white/60 mb-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(post.published_at || post.created_at)}
                      </span>
                      <span className={`px-2 py-1 rounded-none text-xs ${post.published
                        ? 'bg-green-400/20 text-green-400 border border-white'
                        : 'bg-yellow-400/20 text-yellow-400 border border-white'
                        }`}>
                        {post.published ? 'Published' : 'Draft'}
                      </span>
                      {post.subdomain && (
                        <span className="px-2 py-1 rounded-none text-xs bg-blue-400/20 text-blue-400 border border-white">
                          {post.subdomain}
                        </span>
                      )}
                    </div>
                    {post.excerpt && (
                      <p className="text-white/70 text-sm">{post.excerpt.substring(0, 100)}...</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {post.published && (
                      <>
                        <a
                          href={`/blog/${post.subdomain}/${post.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-white/10 rounded-none transition"
                          title="View post"
                        >
                          <Eye className="w-4 h-4 text-white/60" />
                        </a>
                        <button
                          onClick={() => {
                            setTargetPostId(post.id);
                            setIsUnpublishing(true);
                          }}
                          className="p-2 hover:bg-yellow-500/20 rounded-none transition"
                          title="Unpublish (revert to draft)"
                        >
                          <EyeOff className="w-4 h-4 text-yellow-400" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleEdit(post)}
                      className="p-2 hover:bg-white/10 rounded-none transition"
                      title="Edit post"
                    >
                      <Edit className="w-4 h-4 text-white/60" />
                    </button>
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="p-2 hover:bg-red-500/20 rounded-none transition"
                      title="Delete post"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>


      {/* Empty State */}
      {adminPosts.length === 0 && bookClubPosts.length === 0 && (
        <div className="bg-black/50 border border-white rounded-none p-6">
          <p className="text-white/60">No posts yet.</p>
        </div>
      )}

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

// Separate component for the Unpublish Reason Modal
function UnpublishModal({
  isOpen,
  onClose,
  onConfirm,
  reason,
  setReason,
  isProcessing
}: {
  isOpen: boolean,
  onClose: () => void,
  onConfirm: () => void,
  reason: string,
  setReason: (r: string) => void,
  isProcessing: boolean
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
      <div className="bg-black border border-white p-6 w-full max-w-md animate-fade-in">
        <h3 className="text-xl font-bold text-white mb-4">Unpublish Article</h3>
        <p className="text-white/70 mb-4 text-sm">
          This will move the post to drafts and return the original submission to the review cycle.
          The author will be notified via email with the reason provided below.
        </p>

        <div className="mb-6">
          <label className="block text-white/80 text-sm mb-2">Reason for unpublishing</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-4 py-2 bg-black border border-white rounded-none text-white focus:outline-none h-32"
            placeholder="Explain why this article is being unpublished..."
            autoFocus
          />
        </div>

        <div className="flex gap-4">
          <button
            onClick={onConfirm}
            disabled={isProcessing || !reason.trim()}
            className="flex-1 px-6 py-2 bg-white text-black font-semibold rounded-none hover:bg-white/90 transition disabled:opacity-50"
          >
            {isProcessing ? 'Processing...' : 'Unpublish & Notify'}
          </button>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-none transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
