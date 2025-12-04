/**
 * All Articles Page - Shows all blog posts
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

export default function AllArticles() {
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0 mb-4">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => {
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
                  initialDelay={0}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  {({ isExpanded }) => (
                    <ExpandableTrigger>
                      <div 
                        className="rounded-none p-[1px] relative"
                        style={{ 
                          background: 'linear-gradient(135deg, rgba(255,255,255,0.3), rgba(255,255,255,0.15), rgba(255,255,255,0.3))',
                          minHeight: isExpanded ? '400px' : '220px',
                          transition: 'min-height 0.2s ease-out',
                        }}
                      >
                        <ExpandableCard
                          className="bg-black border-0 rounded-none h-full flex flex-col relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02]"
                          collapsedSize={{ height: 220 }}
                          expandedSize={{ height: 400 }}
                          hoverToExpand={false}
                          expandDelay={0}
                          collapseDelay={0}
                        >
                          <ExpandableCardHeader className="mb-1 pb-1">
                            <h2 className="text-base font-black text-white mb-0 tracking-wide transition md:whitespace-nowrap md:overflow-hidden md:text-ellipsis">
                              {post.title}
                            </h2>
                          </ExpandableCardHeader>
                        
                          <ExpandableCardContent className="flex-1 min-h-0">
                            {excerpt && (
                              <div className="mb-1">
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
                          
                          <ExpandableCardFooter className="mt-auto p-3 pt-2 pb-3">
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
                      </ExpandableCard>
                      </div>
                    </ExpandableTrigger>
                  )}
                </Expandable>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {posts.length === 0 && (
          <div className="text-white/60 text-lg text-center">
            <p>No posts yet. Check back soon for intel from the field.</p>
          </div>
        )}
      </div>
    </>
  );
}
