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
}

export default function UserBlog() {
  const { subdomain } = useParams<{ subdomain: string }>();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<{ name?: string; email?: string } | null>(null);

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
      const { data: postsData, error: postsError } = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, published_at, created_at, seo_title, seo_description, author_id')
        .eq('subdomain', userSubdomain)
        .eq('published', true)
        .order('published_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100);

      if (postsError) {
        console.error('Error loading user blog posts:', postsError);
        setError('Failed to load blog posts');
        return;
      }

      setPosts(postsData || []);

      // Try to get user info from the first post's author_id
      if (postsData && postsData.length > 0 && postsData[0].author_id) {
        // Note: We can't directly query auth.users, but we can try to get email from user metadata
        // For now, we'll just use the subdomain as the display name
        setUserInfo({ name: userSubdomain });
      } else {
        setUserInfo({ name: userSubdomain });
      }
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

  const displayName = userInfo?.name || subdomain || 'User';
  const blogTitle = `${displayName}'s Blog | THE LOST ARCHIVES`;
  const blogDescription = `Articles and insights from ${displayName} on THE LOST ARCHIVES.`;

  return (
    <>
      <Helmet>
        <title>{blogTitle}</title>
        <link rel="canonical" href={`https://${subdomain}.thelostandunfounds.com`} />
        <meta name="description" content={blogDescription} />
        <meta property="og:title" content={blogTitle} />
        <meta property="og:description" content={blogDescription} />
        <meta property="og:url" content={`https://${subdomain}.thelostandunfounds.com`} />
        <meta property="og:type" content="website" />
      </Helmet>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-4 tracking-wide">
            {displayName}'s Blog
          </h1>
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
