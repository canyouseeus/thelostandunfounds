/**
 * Blog Listing Page - THE LOST ARCHIVES
 */

import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../lib/supabase';
import { LoadingOverlay } from '../components/Loading'; // Updated import
import { BlogCard } from '../components/BlogCard';
import MarketplaceBanner from '../components/events/MarketplaceBanner';

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
  blog_column?: string | null;
}

export default function Blog() {
  const [mainPosts, setMainPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    loadPosts();
    return () => {
      isMounted.current = false;
    };
  }, []);

  const loadPosts = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Starting to load blog posts...');

      // THE LOST ARCHIVES is the only column shown publicly. The other
      // columns (Book Club, Gearheads, Borderlands, Science, New Theory)
      // live behind admin-gated pages (/book-club, /gearheads, etc.) with
      // no public "view all" page, so posts in them had no reachable
      // internal link path and were flagged by Ahrefs as orphan pages.
      // Per request, only Main column posts are queried/rendered here now.
      let query = supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, content, published_at, created_at, seo_title, seo_description, published, status, subdomain, blog_column')
        .order('published_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(3)
        // Main: blog_column is 'main' OR (null column AND null subdomain)
        .or('blog_column.eq.main,and(blog_column.is.null,subdomain.is.null)');

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout after 15 seconds')), 15000)
      );

      const result = await Promise.race([query, timeoutPromise]) as any;

      if (!isMounted.current) return;

      const { data, error: queryError } = result;
      if (queryError && queryError.code !== 'PGRST116' && queryError.code !== '42P01') {
        console.error('Error loading main posts:', queryError);
      }

      const publishedMainPosts = (data || []).filter((post: any) => {
        try {
          return post.published === true || (post.published === undefined && post.status === 'published');
        } catch (e) {
          return false;
        }
      });

      setMainPosts(publishedMainPosts);

      console.log('✅ Posts loaded');

    } catch (err: any) {
      if (!isMounted.current) return;
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        console.log('🚫 Query aborted (likely due to unmount/navigate)');
        return;
      }
      console.error('❌ Error loading blog posts:', err);
      // Only set error if it's not a timeout/abort loop issue
      setError(err?.message || 'Failed to load blog posts');
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

  // Build preview (shorter, sentence-based) and expanded intro (full intro paragraph).
  const buildPreviewExcerpt = (post: BlogPost) => {
    // Helper to strip HTML tags and handle escaped characters
    const stripHtml = (html: string) => {
      if (!html) return '';
      // Remove excessive backslashes and escaped quotes that might come from corrupted DB entries
      const unescaped = html.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      // Strip tags
      return unescaped.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
    };

    // Prefer the stored excerpt if present; otherwise derive from content.
    if (post.excerpt && post.excerpt.trim().length > 0) {
      const preview = stripHtml(post.excerpt);
      return preview.length > 220
        ? preview.substring(0, 220).replace(/\s+\S*$/, '') + '...'
        : preview;
    }

    const source = stripHtml(post.content || '');
    if (!source) return '';
    const sentences = source
      .split(/(?<=[.!?])\s+/)
      .filter(Boolean);
    const candidate = sentences.slice(0, 2).join(' ');
    const preview = candidate || sentences[0] || source;
    return preview.length > 220
      ? preview.substring(0, 220).replace(/\s+\S*$/, '') + '...'
      : preview;
  };

  const buildExpandedIntro = (post: BlogPost) => {
    const stripHtml = (html: string) => {
      if (!html) return '';
      const unescaped = html.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      return unescaped.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
    };

    const source = (post.content || post.excerpt || '').trim();
    if (!source) return '';

    // If it's HTML, we should try to get the first paragraph text
    const firstParagraph = source.split(/\n\n+/)[0] || source.split(/<\/p>/)[0] || '';
    const stripped = stripHtml(firstParagraph);
    return stripped.substring(0, 420);
  };

  if (loading) {
    return <LoadingOverlay message="Intializing The Lost Archives..." />;
  }

  const blogDescription = 'THE LOST ARCHIVES - Revealing findings from the frontier and beyond. Intel from the field on development, AI, and building in the age of information.';

  return (
    <>
      <Helmet>
        <title>THE LOST+UNFOUNDS | The Lost Archives</title>
        <link rel="canonical" href="https://www.thelostandunfounds.com/thelostarchives" />
        <meta name="description" content={blogDescription} />
        <meta property="og:title" content="THE LOST+UNFOUNDS | The Lost Archives" />
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

      <MarketplaceBanner surface="blog" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-12">
        <div className="text-center mb-8">
          <h1 className="font-black text-white mb-4 tracking-wide whitespace-nowrap text-[clamp(2rem,6vw,4rem)]">
            THE LOST ARCHIVES
          </h1>
          <p className="text-white/60 text-sm mb-4">
            Official articles from <strong className="font-bold text-white">THE LOST+UNFOUNDS</strong>
          </p>
          <div className="flex items-center justify-center gap-4 flex-nowrap whitespace-nowrap">
            <Link
              to="/submit/main"
              className="inline-flex items-center justify-center w-40 sm:w-48 py-2 bg-white hover:bg-white/90 border border-white/20 rounded-none text-black text-xs sm:text-sm font-medium transition"
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

        {/* Sections Helper */}
        {(() => {
          const renderSection = (title: string, posts: BlogPost[], viewAllLink: string | null) => {
            if (posts.length === 0) return null;
            return (
              <div className="mb-12">
                <div className="mb-6 flex flex-col gap-2">
                  <h2 className="text-xl font-bold text-white whitespace-nowrap">{title}</h2>
                  {viewAllLink && (
                    <Link
                      to={viewAllLink}
                      className="text-white/60 hover:text-white text-sm font-medium transition whitespace-nowrap flex-shrink-0"
                    >
                      View All →
                    </Link>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {posts.map((post) => (
                    <BlogCard key={post.id} post={post} />
                  ))}
                </div>
              </div>
            );
          };

          return renderSection('From THE LOST ARCHIVES', mainPosts, '/thelostarchives/all');
        })()}

        {/* Empty State */}
        {mainPosts.length === 0 &&
          bookClubPosts.length === 0 &&
          gearHeadsPosts.length === 0 &&
          borderlandsPosts.length === 0 &&
          sciencePosts.length === 0 &&
          newTheoryPosts.length === 0 && (
            <div className="text-white/60 text-lg">
              <p>No posts yet. Check back soon for intel from the field.</p>
            </div>
          )}
      </div>
    </>
  );
}
