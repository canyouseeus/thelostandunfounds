/**
 * Book Club Page - Collection of user-submitted articles
 * Shows all published articles from user blogs (subdomain blogs)
 */

import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../lib/supabase';
import { LoadingOverlay } from '../components/Loading';
import { BookOpenIcon } from '@heroicons/react/24/outline';
import { BlogCard } from '../components/BlogCard';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content?: string | null; // Content field for generating excerpt if missing
  published_at: string | null;
  created_at: string;
  subdomain: string | null;
  author_id: string | null;
  amazon_affiliate_links?: any[] | null;
}

export default function BookClub() {
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
    loadBookClubPosts();
  }, []);

  const loadBookClubPosts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Create a timeout promise to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout after 15 seconds')), 15000)
      );

      // Load all published posts that belong to the "bookclub" column
      // Fallback: if blog_column is null but post has a subdomain, it's also considered book club
      const queryPromise = supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, content, published_at, created_at, subdomain, author_id, amazon_affiliate_links, blog_column')
        .eq('published', true)
        .or('blog_column.eq.bookclub,and(blog_column.is.null,subdomain.not.is.null)')
        .order('published_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100);

      // Race the query against the timeout
      const { data, error: fetchError } = await Promise.race([queryPromise, timeoutPromise]) as any;

      if (!isMounted.current) return;

      if (fetchError) {
        console.error('Error loading book club posts:', fetchError);
        setError('Failed to load articles');
        return;
      }

      setPosts(data || []);
    } catch (err: any) {
      if (!isMounted.current) return;
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        console.log('🚫 Query aborted (likely due to unmount/navigate)');
        return;
      }
      console.error('Error loading book club:', err);
      setError(err.message || 'Failed to load articles');
    } finally {
      if (isMounted.current) {
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
      day: 'numeric',
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
    const stripHtml = (html: string) => {
      if (!html) return '';
      return html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
    };

    if (post.excerpt && post.excerpt.trim().length > 0) {
      const preview = stripHtml(post.excerpt);
      return preview.length > 220
        ? preview.substring(0, 220).replace(/\s+\S*$/, '') + '...'
        : preview;
    }
    const source = (post.content || '').trim();
    if (!source) return '';
    const cleanSource = stripHtml(source);
    const sentences = cleanSource
      .split(/(?<=[.!?])\s+/)
      .filter(Boolean);
    const candidate = sentences.slice(0, 2).join(' ');
    const preview = candidate || sentences[0] || cleanSource;
    return preview.length > 220
      ? preview.substring(0, 220).replace(/\s+\S*$/, '') + '...'
      : preview;
  };

  const buildExpandedIntro = (post: BlogPost) => {
    const stripHtml = (html: string) => {
      if (!html) return '';
      return html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
    };

    const source = (post.content || post.excerpt || '').trim();
    if (!source) return '';
    const cleanSource = stripHtml(source);
    const firstParagraph = cleanSource.split(/\n\n+/)[0]?.trim() || '';
    return firstParagraph.substring(0, 420);
  };

  // No longer grouping by author - show all posts in a flat list

  if (loading) {
    return <LoadingOverlay />;
  }

  const description = 'A collection of articles from contributors. Each article features four books with Amazon affiliate links.';

  return (
    <>
      <Helmet>
        <title>BOOK CLUB | THE LOST ARCHIVES | THE LOST+UNFOUNDS</title>
        <link rel="canonical" href="https://www.thelostandunfounds.com/book-club" />
        <meta name="description" content={description} />
        <meta property="og:title" content="BOOK CLUB | THE LOST ARCHIVES" />
        <meta property="og:description" content={description} />
        <meta property="og:url" content="https://www.thelostandunfounds.com/book-club" />
        <meta property="og:type" content="website" />
      </Helmet>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-4 tracking-wide">
            BOOK CLUB
          </h1>
          <p className="text-white/60 text-sm max-w-lg mx-auto text-justify leading-relaxed">
            Each article features four books connecting ideas across different works and sharing personal reflections.
          </p>
          <div className="mt-6">
            <Link
              to="/submit/bookclub"
              className="inline-block px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-none text-white text-sm font-medium transition"
            >
              Submit Your Article →
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500/50 rounded-none p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {posts.length === 0 ? (
          <div className="text-center py-12">
            <BookOpenIcon className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/60 text-lg mb-4">No articles yet.</p>
            <p className="text-white/50 text-sm mb-6">
              Be the first to contribute! Submit your article with four book recommendations.
            </p>
            <Link
              to="/submit/bookclub"
              className="inline-block px-6 py-2 bg-white text-black font-semibold rounded-none hover:bg-white/90 transition"
            >
              Submit the First Article
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {posts.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
