/**
 * User Blog Page - Shows posts for a specific user subdomain
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../lib/supabase';
import { LoadingOverlay } from '../components/Loading'; // Updated import
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
  author_id: string | null;
  author_name?: string | null;
}

const extractFirstImage = (content?: string | null) => {
  if (!content) return null;
  const markdownMatch = content.match(/!\[[^\]]*?\]\((https?:\/\/[^\s)]+?\.(?:png|jpe?g|gif|webp))\)/i);
  if (markdownMatch) return markdownMatch[1];
  const urlMatch = content.match(/(https?:\/\/[^\s]+?\.(?:png|jpe?g|gif|webp))/i);
  if (urlMatch) return urlMatch[1];
  return null;
};

const buildPreviewExcerpt = (post: BlogPost) => {
  // Use excerpt if available, otherwise use content
  const source = (post.excerpt || post.content || '').trim();
  if (!source) return '';

  // Strip HTML tags and replace with space, then collapse whitespace
  const stripped = source.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();

  if (stripped.length > 0) {
    return stripped.length > 220
      ? stripped.substring(0, 220).replace(/\s+\S*$/, '') + '...'
      : stripped;
  }
  return '';
};

const buildExpandedIntro = (post: BlogPost) => {
  const source = (post.content || post.excerpt || '').trim();
  if (!source) return '';

  // Strip HTML tags and replace with space, then collapse whitespace
  const stripped = source.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();

  return stripped.substring(0, 420);
};

export default function UserBlog() {
  const { subdomain } = useParams<{ subdomain: string }>();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<{ name?: string; email?: string } | null>(null);
  const [blogTitle, setBlogTitle] = useState<string | null>(null);
  const [blogTitleDisplay, setBlogTitleDisplay] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    if (subdomain) {
      loadUserBlog(subdomain);
    }
    return () => {
      isMounted.current = false;
    };
  }, [subdomain]);

  const loadUserBlog = async (userSubdomain: string) => {
    try {
      setLoading(true);
      setError(null);

      // Load posts for this subdomain
      // Try multiple query strategies to handle different schema versions
      let postsData;
      let postsError;

      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout after 15 seconds')), 15000)
      );

      // Strategy 1: Try with published field and author_name
      const query1 = supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, content, published_at, created_at, seo_title, seo_description, author_id, author_name')
        .eq('subdomain', userSubdomain)
        .eq('published', true)
        .order('published_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100);

      // Race the first strategy
      let result: any = await Promise.race([query1, timeoutPromise]);

      if (!isMounted.current) return;

      postsData = result.data;
      postsError = result.error;

      // Strategy 2: If that failed, try without author_name
      if (postsError && (postsError.message?.includes('author_name') || postsError.message?.includes('column'))) {
        result = await supabase
          .from('blog_posts')
          .select('id, title, slug, excerpt, content, published_at, created_at, seo_title, seo_description, author_id')
          .eq('subdomain', userSubdomain)
          .eq('published', true)
          .order('published_at', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(100);

        if (!isMounted.current) return;
        postsData = result.data;
        postsError = result.error;
      }

      // Strategy 3: If published column doesn't exist, try with status field
      if (postsError && (postsError.message?.includes('published') || postsError.message?.includes('column'))) {
        result = await supabase
          .from('blog_posts')
          .select('id, title, slug, excerpt, content, published_at, created_at, seo_title, seo_description, author_id, author_name')
          .eq('subdomain', userSubdomain)
          .eq('status', 'published')
          .order('published_at', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(100);

        if (!isMounted.current) return;
        postsData = result.data;
        postsError = result.error;
      }

      // Strategy 4: Last resort - get all posts for this subdomain and filter client-side
      if (postsError) {
        result = await supabase
          .from('blog_posts')
          .select('id, title, slug, excerpt, content, published_at, created_at, seo_title, seo_description, author_id, author_name, published, status')
          .eq('subdomain', userSubdomain)
          .order('published_at', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(100);

        if (!isMounted.current) return;
        if (result.data) {
          // Filter client-side for published posts
          postsData = result.data.filter((post: any) =>
            post.published === true || (post.published === undefined && post.status === 'published')
          );
          postsError = null;
        } else {
          postsError = result.error;
        }
      }

      if (postsError) {
        console.error('Error loading user blog posts:', postsError);
        setError(`Failed to load blog posts: ${postsError.message || 'Unknown error'}`);
        return;
      }

      setPosts(postsData || []);

      // Get author_name from the first post if available
      if (postsData && postsData.length > 0) {
        const firstPost = postsData[0] as any;
        if (firstPost.author_name) {
          setAuthorName(firstPost.author_name);
        }
      }

      // Load blog title and author_name from user_subdomains
      const { data: subdomainData } = await supabase
        .from('user_subdomains')
        .select('blog_title, blog_title_display, author_name, user_id')
        .eq('subdomain', userSubdomain)
        .maybeSingle();

      if (!isMounted.current) return;

      // Use display version for UI, normalized version for SEO/metadata
      if (subdomainData?.blog_title_display) {
        setBlogTitleDisplay(subdomainData.blog_title_display);
        setBlogTitle(subdomainData.blog_title || subdomainData.blog_title_display);
      } else if (subdomainData?.blog_title) {
        setBlogTitle(subdomainData.blog_title);
        setBlogTitleDisplay(subdomainData.blog_title);
      }

      // Get author_name from user_subdomains if available
      if (subdomainData?.author_name && !authorName) {
        setAuthorName(subdomainData.author_name);
      }

      // If we have posts but no author_name yet, try to get it from the posts
      if (!authorName && postsData && postsData.length > 0) {
        // Check all posts for author_name
        for (const post of postsData) {
          const postAny = post as any;
          if (postAny.author_name) {
            setAuthorName(postAny.author_name);
            break;
          }
        }
      }

      // If still no author_name, try to get it from user metadata via a post's author_id
      if (!authorName && postsData && postsData.length > 0 && postsData[0].author_id) {
        // We can't directly query auth.users, but we can check if there's a way to get it
        // For now, we'll use the subdomain as fallback
      }

      // Set user info
      setUserInfo({ name: authorName || userSubdomain });
    } catch (err: any) {
      if (!isMounted.current) return;
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        console.log('🚫 Query aborted (likely due to unmount/navigate)');
        return;
      }
      console.error('Error loading user blog:', err);
      setError(err.message || 'Failed to load blog');
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

  if (loading) {
    return <LoadingOverlay message={`Loading ${subdomain || 'blog'}...`} />;
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-900/20 border border-white rounded-none p-6">
          <h1 className="text-2xl font-bold text-white mb-4">Error</h1>
          <p className="text-red-400 mb-4">{error}</p>
          <Link
            to="/thelostarchives"
            className="text-white hover:text-white/80 transition"
          >
            ← Back to THE LOST ARCHIVES
          </Link>
        </div>
      </div>
    );
  }

  // Use styled display title for UI, normalized title for SEO/metadata
  // If using subdomain as fallback, display it in uppercase
  const displayTitle = blogTitleDisplay || blogTitle || authorName || (subdomain ? subdomain.toUpperCase() : null) || 'User';
  const pageTitle = blogTitle
    ? `${blogTitle} | COLLECTION | THE LOST ARCHIVES`
    : authorName
      ? `${authorName} | COLLECTION | THE LOST ARCHIVES`
      : `${subdomain}'s Collection | THE LOST ARCHIVES`;
  const blogDescription = blogTitle
    ? `Articles and insights from ${blogTitle} in this collection on THE LOST ARCHIVES.`
    : authorName
      ? `Articles and insights from ${authorName} in this collection on THE LOST ARCHIVES.`
      : `Articles and insights from ${subdomain} on THE LOST ARCHIVES.`;

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <link rel="canonical" href={`https://${subdomain}.thelostandunfounds.com`} />
        <meta name="description" content={blogDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={blogDescription} />
        <meta property="og:url" content={`https://${subdomain}.thelostandunfounds.com`} />
        <meta property="og:type" content="website" />
      </Helmet>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-2 tracking-wide">
            {displayTitle}
          </h1>
          <p className="text-white/60 text-lg md:text-xl mb-4">COLLECTION</p>
          <Link
            to="/thelostarchives"
            className="text-white/60 hover:text-white text-sm transition"
          >
            ← Back to THE LOST ARCHIVES
          </Link>
        </div>

        {posts.length === 0 ? (
          <div className="text-white/60 text-lg">
            <p>No posts yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {posts.map((post) => (
              <BlogCard
                key={post.id}
                post={post}
                link={subdomain ? `/blog/${subdomain}/${post.slug}` : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
