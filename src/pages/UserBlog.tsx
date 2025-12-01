/**
 * User Blog Page - Shows posts for a specific user subdomain
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from '../components/Loading';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  published_at: string | null;
  created_at: string;
  seo_title: string | null;
  seo_description: string | null;
  author_id: string | null;
  author_name: string | null;
}

export default function UserBlog() {
  const { subdomain } = useParams<{ subdomain: string }>();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<{ name?: string; email?: string } | null>(null);
  const [blogTitle, setBlogTitle] = useState<string | null>(null);
  const [blogTitleDisplay, setBlogTitleDisplay] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState<string | null>(null);

  useEffect(() => {
    if (subdomain) {
      loadUserBlog(subdomain);
    }
  }, [subdomain]);

  const loadUserBlog = async (userSubdomain: string) => {
    try {
      setLoading(true);
      setError(null);

      // Load posts for this subdomain
      // Try multiple query strategies to handle different schema versions
      let postsData;
      let postsError;
      
      // Strategy 1: Try with published field and author_name
      let result = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, published_at, created_at, seo_title, seo_description, author_id, author_name')
        .eq('subdomain', userSubdomain)
        .eq('published', true)
        .order('published_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100);
      
      postsData = result.data;
      postsError = result.error;
      
      // Strategy 2: If that failed, try without author_name
      if (postsError && (postsError.message?.includes('author_name') || postsError.message?.includes('column'))) {
        result = await supabase
          .from('blog_posts')
          .select('id, title, slug, excerpt, published_at, created_at, seo_title, seo_description, author_id')
          .eq('subdomain', userSubdomain)
          .eq('published', true)
          .order('published_at', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(100);
        
        postsData = result.data;
        postsError = result.error;
      }
      
      // Strategy 3: If published column doesn't exist, try with status field
      if (postsError && (postsError.message?.includes('published') || postsError.message?.includes('column'))) {
        result = await supabase
          .from('blog_posts')
          .select('id, title, slug, excerpt, published_at, created_at, seo_title, seo_description, author_id, author_name')
          .eq('subdomain', userSubdomain)
          .eq('status', 'published')
          .order('published_at', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(100);
        
        postsData = result.data;
        postsError = result.error;
      }
      
      // Strategy 4: Last resort - get all posts for this subdomain and filter client-side
      if (postsError) {
        result = await supabase
          .from('blog_posts')
          .select('id, title, slug, excerpt, published_at, created_at, seo_title, seo_description, author_id, author_name, published, status')
          .eq('subdomain', userSubdomain)
          .order('published_at', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(100);
        
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
      console.error('Error loading user blog:', err);
      setError(err.message || 'Failed to load blog');
    } finally {
      setLoading(false);
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
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-900/20 border border-red-500/50 rounded-none p-6">
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
  const displayTitle = blogTitleDisplay || blogTitle || authorName || subdomain || 'User';
  const pageTitle = blogTitle 
    ? `${blogTitle} | BOOK CLUB | THE LOST ARCHIVES`
    : authorName
    ? `${authorName} | BOOK CLUB | THE LOST ARCHIVES`
    : `${subdomain}'s Blog | THE LOST ARCHIVES`;
  const blogDescription = blogTitle
    ? `Articles and insights from ${blogTitle} on THE LOST ARCHIVES BOOK CLUB.`
    : authorName
    ? `Articles and insights from ${authorName} on THE LOST ARCHIVES BOOK CLUB.`
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
          <p className="text-white/60 text-lg md:text-xl mb-4">BOOK CLUB</p>
          <Link
            to="/thelostarchives"
            className="text-white/60 hover:text-white text-sm transition"
          >
            ← Back to THE LOST ARCHIVES
          </Link>
        </div>

        {posts.length === 0 ? (
          <div className="text-white/60 text-lg text-center">
            <p>No posts yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {posts.map((post) => (
              <Link
                key={post.id}
                to={`/blog/${post.slug}`}
                className="group"
              >
                <article className="bg-black/50 border-2 border-white/10 rounded-lg p-5 h-full flex flex-col hover:border-white/30 hover:shadow-lg hover:shadow-white/10 transition-all duration-300 transform hover:-translate-y-1">
                  <div className="mb-4 pb-3 border-b border-white/10">
                    <h2 className="text-base font-black text-white mb-2 tracking-wide group-hover:text-white/90 transition whitespace-nowrap overflow-hidden text-ellipsis">
                      {post.title}
                    </h2>
                  </div>

                  {post.excerpt && (
                    <div className="flex-1 mb-4">
                      <p className="text-white/60 text-sm leading-relaxed line-clamp-4 text-left">
                        {post.excerpt}
                      </p>
                    </div>
                  )}

                  <div className="mt-auto pt-3 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <time className="text-white/40 text-xs font-medium">
                        {formatDate(post.published_at || post.created_at)}
                      </time>
                      <span className="text-white/60 text-xs font-semibold group-hover:text-white transition">
                        Read →
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
