/**
 * Blog Listing Page - THE LOST ARCHIVES
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from '../components/Loading';
import {
  Expandable,
  ExpandableCard,
  ExpandableCardHeader,
  ExpandableCardContent,
  ExpandableCardFooter,
  ExpandableContent,
  ExpandableTrigger,
} from '../components/ui/expandable';

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

export default function Blog() {
  const [nativePosts, setNativePosts] = useState<BlogPost[]>([]);
  const [bookClubPosts, setBookClubPosts] = useState<BlogPost[]>([]);
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
      
      // Load native posts (subdomain IS NULL) - only 3 most recent
      let nativeQueryPromise = supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, content, published_at, created_at, seo_title, seo_description, published, status, subdomain')
        .is('subdomain', null)
        .order('published_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(3);
      
      // Try to filter by published
      try {
        nativeQueryPromise = nativeQueryPromise.eq('published', true);
      } catch (e) {
        console.warn('Published column filter not available, will filter client-side');
      }
      
      // Load book club posts (subdomain IS NOT NULL) - 3 most recent
      let bookClubQueryPromise = supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, content, published_at, created_at, seo_title, seo_description, published, status, subdomain')
        .not('subdomain', 'is', null)
        .order('published_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(3);
      
      try {
        bookClubQueryPromise = bookClubQueryPromise.eq('published', true);
      } catch (e) {
        console.warn('Published column filter not available for book club posts');
      }
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout after 15 seconds')), 15000)
      );
      
      // Execute both queries
      const [nativeResult, bookClubResult] = await Promise.all([
        Promise.race([nativeQueryPromise, timeoutPromise]) as Promise<any>,
        Promise.race([bookClubQueryPromise, timeoutPromise]) as Promise<any>
      ]);
      
      const { data: nativeData, error: nativeError } = nativeResult;
      const { data: bookClubData, error: bookClubError } = bookClubResult;
      
      console.log('✅ Queries completed:', { 
        nativeLength: nativeData?.length, 
        bookClubLength: bookClubData?.length,
        nativeError,
        bookClubError
      });

      if (nativeError && nativeError.code !== 'PGRST116' && nativeError.code !== '42P01') {
        console.error('Error loading native posts:', nativeError);
        const errorMsg = nativeError.message || 'Failed to load blog posts';
        const errorCode = nativeError.code ? ` (Code: ${nativeError.code})` : '';
        setError(`${errorMsg}${errorCode}`);
      }

      if (bookClubError && bookClubError.code !== 'PGRST116' && bookClubError.code !== '42P01') {
        console.error('Error loading book club posts:', bookClubError);
        // Don't set error if native posts loaded successfully
        if (!nativeError || nativeError.code === 'PGRST116' || nativeError.code === '42P01') {
          const errorMsg = bookClubError.message || 'Failed to load book club posts';
          setError(errorMsg);
        }
      }

      // Filter native posts: only published posts
      const publishedNativePosts = (nativeData || []).filter((post: any) => {
        try {
          const isPublished = post.published === true || 
            (post.published === undefined && post.status === 'published');
          return isPublished;
        } catch (e) {
          return false;
        }
      });

      // Filter book club posts: only published posts
      const publishedBookClubPosts = (bookClubData || []).filter((post: any) => {
        try {
          const isPublished = post.published === true || 
            (post.published === undefined && post.status === 'published');
          return isPublished;
        } catch (e) {
          return false;
        }
      });

      setNativePosts(publishedNativePosts || []);
      setBookClubPosts(publishedBookClubPosts || []);
      console.log('✅ Posts set:', { 
        native: publishedNativePosts.length, 
        bookClub: publishedBookClubPosts.length 
      });
    } catch (err: any) {
      console.error('❌ Error loading blog posts:', err);
      const errorMsg = err?.message || 'Failed to load blog posts';
      setError(errorMsg);
      setNativePosts([]);
      setBookClubPosts([]);
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
              to="/submit/main"
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

      {/* Native Posts Section - 3 Most Recent */}
      {nativePosts.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">THE LOST ARCHIVES</h2>
            <Link
              to="/thelostarchives/all"
              className="text-white/60 hover:text-white text-sm font-medium transition"
            >
              View All Articles →
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-6">
            {nativePosts.map((post) => {
              const excerpt = post.excerpt || (post.content ? (() => {
                const firstParagraph = post.content.split(/\n\n+/)[0]?.trim() || '';
                if (firstParagraph.length > 0) {
                  return firstParagraph.length > 200 
                    ? firstParagraph.substring(0, 200).replace(/\s+\S*$/, '') + '...'
                    : firstParagraph;
                }
                return '';
              })() : '');
              
              return (
                <Expandable
                  key={post.id}
                  expandDirection="vertical"
                  expandBehavior="replace"
                  initialDelay={0.1}
                >
                  {({ isExpanded }) => (
                    <ExpandableTrigger>
                      <div 
                        className="rounded-none p-[2px] relative"
                        style={{ 
                          background: 'linear-gradient(135deg, rgba(255,255,255,1), rgba(255,255,255,0.6), rgba(255,255,255,1))',
                        }}
                      >
                        <ExpandableCard
                          className="bg-black/50 border-0 rounded-none h-full flex flex-col hover:shadow-lg hover:shadow-white/20 relative overflow-hidden"
                          collapsedSize={{ height: 220 }}
                          expandedSize={{ height: 400 }}
                          hoverToExpand={false}
                          expandDelay={200}
                          collapseDelay={300}
                        >
                          <ExpandableCardHeader className="mb-2 pb-2">
                            <h2 className="text-base font-black text-white mb-1 tracking-wide transition whitespace-nowrap overflow-hidden text-ellipsis">
                              {post.title}
                            </h2>
                          </ExpandableCardHeader>
                        
                          <ExpandableCardContent className="flex-1 min-h-0">
                            {excerpt && (
                              <div className="mb-2">
                                <p className="text-white/60 text-sm leading-relaxed line-clamp-4 text-left">
                                  {excerpt}
                                </p>
                              </div>
                            )}
                            
                            <ExpandableContent 
                              preset="fade" 
                              stagger 
                              staggerChildren={0.1}
                              keepMounted={false}
                            >
                              {post.content && (
                                <div className="mb-2">
                                  <p className="text-white/50 text-xs leading-relaxed text-left line-clamp-6">
                                    {post.content.replace(/\n/g, ' ').substring(0, 300)}...
                                  </p>
                                </div>
                              )}
                              <Link
                                to={`/thelostarchives/${post.slug}`}
                                className="inline-block mt-2 text-white/80 hover:text-white text-xs font-semibold transition"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Read Full Article →
                              </Link>
                            </ExpandableContent>
                          </ExpandableCardContent>
                          
                          <ExpandableContent preset="slide-up">
                            <ExpandableCardFooter className="mt-auto p-4 pt-2 pb-4">
                              <div className="flex items-center justify-between gap-2 min-w-0 w-full">
                                <time className="text-white/70 text-xs font-medium truncate min-w-0 flex-1">
                                  {formatDate(post.published_at || post.created_at)}
                                </time>
                                {!isExpanded && (
                                  <span className="text-white/90 text-xs font-semibold transition flex-shrink-0 whitespace-nowrap">
                                    Click to expand →
                                  </span>
                                )}
                              </div>
                            </ExpandableCardFooter>
                          </ExpandableContent>
                        </ExpandableCard>
                      </div>
                    </ExpandableTrigger>
                  )}
                </Expandable>
              );
            })}
          </div>
        </div>
      )}

      {/* Book Club Posts Section - 3 Most Recent */}
      {bookClubPosts.length > 0 && (
        <div className="mt-12 pt-12 border-t border-white/10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">From the BOOK CLUB</h2>
            <Link
              to="/book-club"
              className="text-white/60 hover:text-white text-sm font-medium transition"
            >
              View All →
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-6">
            {bookClubPosts.map((post) => {
              const excerpt = post.excerpt || (post.content ? (() => {
                const firstParagraph = post.content.split(/\n\n+/)[0]?.trim() || '';
                if (firstParagraph.length > 0) {
                  return firstParagraph.length > 200 
                    ? firstParagraph.substring(0, 200).replace(/\s+\S*$/, '') + '...'
                    : firstParagraph;
                }
                return '';
              })() : '');
              
              return (
                <Expandable
                  key={post.id}
                  expandDirection="vertical"
                  expandBehavior="replace"
                  initialDelay={0.1}
                >
                  {({ isExpanded }) => (
                    <ExpandableTrigger>
                      <div 
                        className="rounded-none p-[2px] h-full relative"
                        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,1), rgba(255,255,255,0.6), rgba(255,255,255,1))' }}
                      >
                        <ExpandableCard
                          className="bg-black/50 border-0 rounded-none h-full flex flex-col hover:shadow-lg hover:shadow-white/20 relative overflow-hidden"
                          collapsedSize={{ height: 220 }}
                          expandedSize={{ height: 400 }}
                          hoverToExpand={false}
                          expandDelay={200}
                          collapseDelay={300}
                        >
                          <ExpandableCardHeader className="mb-2 pb-2">
                            <h2 className="text-base font-black text-white mb-1 tracking-wide transition line-clamp-2">
                              {post.title}
                            </h2>
                          </ExpandableCardHeader>
                          
                          <ExpandableCardContent className="flex-1 min-h-0">
                            {excerpt && (
                              <div className="mb-2">
                                <p className="text-white/60 text-sm leading-relaxed line-clamp-4 text-left">
                                  {excerpt}
                                </p>
                              </div>
                            )}
                            
                            <ExpandableContent 
                              preset="fade" 
                              stagger 
                              staggerChildren={0.1}
                              keepMounted={false}
                            >
                              {post.content && (
                                <div className="mb-2">
                                  <p className="text-white/50 text-xs leading-relaxed text-left line-clamp-6">
                                    {post.content.replace(/\n/g, ' ').substring(0, 300)}...
                                  </p>
                                </div>
                              )}
                              <Link
                                to={`/blog/${post.subdomain}/${post.slug}`}
                                className="inline-block mt-2 text-white/80 hover:text-white text-xs font-semibold transition"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Read Full Article →
                              </Link>
                            </ExpandableContent>
                          </ExpandableCardContent>
                          
                          <ExpandableContent preset="slide-up">
                            <ExpandableCardFooter className="mt-auto p-4 pt-2 pb-4">
                              <div className="flex items-center justify-between gap-2 min-w-0 w-full">
                                <time className="text-white/70 text-xs font-medium truncate min-w-0 flex-1">
                                  {formatDate(post.published_at || post.created_at)}
                                </time>
                                {!isExpanded && (
                                  <span className="text-white/90 text-xs font-semibold transition flex-shrink-0 whitespace-nowrap">
                                    Click to expand →
                                  </span>
                                )}
                              </div>
                            </ExpandableCardFooter>
                          </ExpandableContent>
                        </ExpandableCard>
                      </div>
                    </ExpandableTrigger>
                  )}
                </Expandable>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {nativePosts.length === 0 && bookClubPosts.length === 0 && (
        <div className="text-white/60 text-lg text-center">
          <p>No posts yet. Check back soon for intel from the field.</p>
        </div>
      )}
    </div>
    </>
  );
}
