/**
 * Blog Listing Page - THE LOST ARCHIVES
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
}

export default function Blog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Starting to load blog posts...');
      
      // Load main blog posts - don't select subdomain since column doesn't exist yet
      // This will show all existing articles (backward compatible)
      let queryPromise = supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, published_at, created_at, seo_title, seo_description, published, status')
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
      
      let { data, error: fetchError } = await Promise.race([
        queryPromise,
        timeoutPromise
      ]) as any;
      
      console.log('✅ Query completed:', { dataLength: data?.length, error: fetchError });


      if (fetchError) {
        console.error('Error loading blog posts:', fetchError);
        // Don't show error if table doesn't exist yet - just show empty state
        if (fetchError.code !== 'PGRST116' && fetchError.code !== '42P01') {
          // Show detailed error for debugging
          const errorMsg = fetchError.message || 'Failed to load blog posts';
          const errorCode = fetchError.code ? ` (Code: ${fetchError.code})` : '';
          setError(`${errorMsg}${errorCode}`);
          console.error('Full error details:', {
            code: fetchError.code,
            message: fetchError.message,
            details: fetchError.details,
            hint: fetchError.hint
          });
        }
        setPosts([]);
        return;
      }

      // Filter posts: only published posts
      // Note: We're not filtering by subdomain here since the column doesn't exist yet
      // Once you run the migration, we can add subdomain filtering
      const publishedPosts = (data || []).filter((post: any) => {
        try {
          // Check if published
          const isPublished = post.published === true || 
            (post.published === undefined && post.status === 'published');
          
          return isPublished;
        } catch (e) {
          return false;
        }
      });

      setPosts(publishedPosts || []);
      console.log('✅ Posts set:', publishedPosts.length);
    } catch (err: any) {
      console.error('❌ Error loading blog posts:', err);
      const errorMsg = err?.message || 'Failed to load blog posts';
      setError(errorMsg);
      setPosts([]);
    } finally {
      console.log('🏁 loadPosts finally block - setting loading to false');
      setLoading(false);
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

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  const blogDescription = 'Revealing findings from the frontier and beyond. Intel from the field on development, AI, and building in the age of information.';

  return (
    <>
      <Helmet>
        <title>THE LOST ARCHIVES | THE LOST+UNFOUNDS</title>
        <link rel="canonical" href="https://www.thelostandunfounds.com/thelostarchives" />
        <meta name="description" content={blogDescription} />
        <meta property="og:title" content="THE LOST ARCHIVES | THE LOST+UNFOUNDS" />
        <meta property="og:description" content={blogDescription} />
        <meta property="og:url" content="https://www.thelostandunfounds.com/thelostarchives" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="THE LOST ARCHIVES | THE LOST+UNFOUNDS" />
        <meta name="twitter:description" content={blogDescription} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Blog",
            "name": "THE LOST ARCHIVES",
            "description": blogDescription,
            "url": "https://www.thelostandunfounds.com/thelostarchives",
            "publisher": {
              "@type": "Organization",
              "name": "THE LOST+UNFOUNDS",
              "url": "https://www.thelostandunfounds.com"
            }
          })}
        </script>
      </Helmet>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-4 tracking-wide">
            THE LOST ARCHIVES
          </h1>
          <p className="text-white/60 text-sm mb-4">
            Official articles from THE LOST+UNFOUNDS
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              to="/book-club"
              className="inline-block px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-none text-white text-sm font-medium transition"
            >
              View BOOK CLUB →
            </Link>
            <Link
              to="/submit-article"
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
        <div className="text-white/60 text-lg text-center">
          <p>No posts yet. Check back soon for intel from the field.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {posts.map((post) => (
            <Link
              key={post.id}
              to={`/thelostarchives/${post.slug}`}
              className="group"
            >
              <article className="bg-black/50 border-2 border-white/10 rounded-lg p-5 h-full flex flex-col hover:border-white/30 hover:shadow-lg hover:shadow-white/10 transition-all duration-300 transform hover:-translate-y-1">
                {/* Card Header - Title Area */}
                <div className="mb-4 pb-3 border-b border-white/10">
                  <h2 className="text-base font-black text-white mb-2 tracking-wide group-hover:text-white/90 transition whitespace-nowrap overflow-hidden text-ellipsis">
                    {post.title}
                  </h2>
                </div>
                
                {/* Card Body - Excerpt */}
                {post.excerpt && (
                  <div className="flex-1 mb-4">
                    <p className="text-white/60 text-sm leading-relaxed line-clamp-4 text-left">
                      {post.excerpt}
                    </p>
                  </div>
                )}
                
                {/* Card Footer - Date and Read More */}
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
