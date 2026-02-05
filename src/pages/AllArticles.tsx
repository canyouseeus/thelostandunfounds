/**
 * All Articles Page - Shows all blog posts
 */

import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../lib/supabase';
import { LoadingOverlay } from '../components/Loading';
import { BlogCard } from '../components/BlogCard';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content?: string | null; // Content field for generating excerpt if missing
  published_at: string | null;
  created_at: string;
  seo_title: string | null;
  seo_description: string | null;
  subdomain?: string | null;
}

export default function AllArticles() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  // Set isMounted to false on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Loading all blog posts...');

      // Load all native posts (subdomain IS NULL)
      let queryPromise = supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, content, published_at, created_at, seo_title, seo_description, published, status, subdomain')
        .is('subdomain', null)
        .order('published_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100);

      // Try to filter by published
      try {
        queryPromise = queryPromise.eq('published', true);
      } catch (e) {
        console.warn('Published column filter not available, will filter client-side');
      }

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout after 15 seconds')), 15000)
      );

      // Execute query
      const result = await Promise.race([queryPromise, timeoutPromise]) as Promise<any>;

      if (!isMounted.current) return;

      const { data, error: queryError } = result;

      console.log('✅ Query completed:', {
        length: data?.length,
        queryError
      });

      if (queryError && queryError.code !== 'PGRST116' && queryError.code !== '42P01') {
        console.error('Error loading posts:', queryError);
        const errorMsg = queryError.message || 'Failed to load blog posts';
        const errorCode = queryError.code ? ` (Code: ${queryError.code})` : '';
        setError(`${errorMsg}${errorCode}`);
      }

      // Filter posts: only published posts
      const publishedPosts = (data || []).filter((post: any) => {
        try {
          const isPublished = post.published === true ||
            (post.published === undefined && post.status === 'published');
          return isPublished;
        } catch (e) {
          return false;
        }
      });

      setPosts(publishedPosts || []);
      console.log('✅ Posts set:', {
        count: publishedPosts.length
      });
    } catch (err: any) {
      if (!isMounted.current) return;
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        console.log('🚫 Query aborted (likely due to unmount/navigate)');
        return;
      }
      console.error('❌ Error loading blog posts:', err);
      const errorMsg = err?.message || 'Failed to load blog posts';
      setError(errorMsg);
      setPosts([]);
    } finally {
      if (isMounted.current) {
        console.log('🏁 loadPosts finally block - setting loading to false');
        setLoading(false);
      }
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const extractFirstImage = (content?: string | null) => {
    if (!content) return null;
    const markdownMatch = content.match(/!\[[^\]]*?\]\((https?:\/\/[^\s)]+?\.(?:png|jpe?g|gif|webp))\)/i);
    if (markdownMatch) return markdownMatch[1];
    const urlMatch = content.match(/(https?:\/\/[^\s]+?\.(?:png|jpe?g|gif|webp))/i);
    if (urlMatch) return urlMatch[1];
    return null;
  };

  const buildPreviewExcerpt = (post: BlogPost) => {
    if (post.excerpt && post.excerpt.trim().length > 0) {
      const preview = post.excerpt.trim().replace(/\s+/g, ' ');
      return preview.length > 220
        ? preview.substring(0, 220).replace(/\s+\S*$/, '') + '...'
        : preview;
    }
    const source = (post.content || '').trim();
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

  const buildExpandedIntro = (post: BlogPost) => {
    const source = (post.content || post.excerpt || '').trim();
    if (!source) return '';
    const firstParagraph = source.split(/\n\n+/)[0]?.trim() || '';
    return firstParagraph.substring(0, 420);
  };

  if (loading) {
    return <LoadingOverlay />;
  }

  const blogDescription = 'All articles from THE LOST ARCHIVES. Revealing findings from the frontier and beyond. Intel from the field on development, AI, and building in the age of information.';

  return (
    <>
      <Helmet>
        <title>All Articles | THE LOST ARCHIVES | THE LOST+UNFOUNDS</title>
        <link rel="canonical" href="https://www.thelostandunfounds.com/thelostarchives/all" />
        <meta name="description" content={blogDescription} />
        <meta property="og:title" content="All Articles | THE LOST ARCHIVES | THE LOST+UNFOUNDS" />
        <meta property="og:description" content={blogDescription} />
        <meta property="og:url" content="https://www.thelostandunfounds.com/thelostarchives/all" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="All Articles | THE LOST ARCHIVES | THE LOST+UNFOUNDS" />
        <meta name="twitter:description" content={blogDescription} />
      </Helmet>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-2 tracking-wide">
                ALL ARTICLES
              </h1>
              <p className="text-white/60 text-sm">
                THE LOST ARCHIVES
              </p>
            </div>
            <Link
              to="/thelostarchives"
              className="text-white/60 hover:text-white text-sm font-medium transition"
            >
              ← Back to Latest
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-white rounded-none p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* All Posts Grid */}
        {posts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {posts.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {posts.length === 0 && (
          <div className="text-white/60 text-lg">
            <p>No posts yet. Check back soon for intel from the field.</p>
          </div>
        )}
      </div>
    </>
  );
}
