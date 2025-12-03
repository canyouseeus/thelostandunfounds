/**
 * Book Club Page - Collection of user-submitted articles
 * Shows all published articles from user blogs (subdomain blogs)
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from '../components/Loading';
import { BookOpen } from 'lucide-react';
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
  subdomain: string | null;
  author_id: string | null;
  amazon_affiliate_links?: any[] | null;
  blog_column?: string | null;
}

export default function BookClub() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBookClubPosts();
  }, []);

  const loadBookClubPosts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load all published posts for BookClub column
      // Try to filter by blog_column first, with fallback to subdomain for backward compatibility
      let query = supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, content, published_at, created_at, subdomain, author_id, amazon_affiliate_links, blog_column')
        .eq('published', true);

      // Try to filter by blog_column field
      query = query.eq('blog_column', 'bookclub');

      const { data, error: fetchError } = await query
        .order('published_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100);

      // If query failed or returned no results, try fallback to subdomain-based filtering
      let filteredData = data || [];
      if (fetchError || !data || data.length === 0) {
        console.log('blog_column filter returned no results, trying subdomain fallback');
        // Fallback: get posts with subdomain (book club posts)
        const fallbackQuery = supabase
          .from('blog_posts')
          .select('id, title, slug, excerpt, content, published_at, created_at, subdomain, author_id, amazon_affiliate_links, blog_column')
          .eq('published', true)
          .not('subdomain', 'is', null)
          .order('published_at', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(100);
        
        const { data: fallbackData, error: fallbackError } = await fallbackQuery;
        
        if (fallbackError) {
          console.error('Error loading book club posts (fallback):', fallbackError);
          setError('Failed to load articles');
          return;
        }
        
        filteredData = fallbackData || [];
      } else {
        // Filter to ensure we only show posts with blog_column='bookclub' or NULL (for backward compatibility)
        filteredData = data.filter((post: any) => 
          post.blog_column === 'bookclub' || 
          (post.blog_column === null && post.subdomain !== null)
        );
      }

      if (fetchError && filteredData.length === 0) {
        console.error('Error loading book club posts:', fetchError);
        setError('Failed to load articles');
        return;
      }

      setPosts(filteredData);
    } catch (err: any) {
      console.error('Error loading book club:', err);
      setError(err.message || 'Failed to load articles');
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

  // No longer grouping by author - show all posts in a flat list

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner />
        </div>
      </div>
    );
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
          <p className="text-white/60 text-sm max-w-2xl mx-auto">
            Each article features four books with Amazon affiliate links, connecting ideas across different works and sharing personal reflections.
          </p>
          <div className="mt-6">
            <Link
              to="/submit/bookclub"
              className="inline-block px-6 py-2 bg-white/10 hover:bg-white/20 border border-white rounded-none text-white text-sm font-medium transition"
            >
              Submit Your Article →
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-white rounded-none p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {posts.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/60 text-lg mb-4">No articles yet.</p>
            <p className="text-white/50 text-sm mb-6">
              Be the first to contribute! Submit your article with four book recommendations.
            </p>
            <Link
              to="/submit/bookclub"
              className="inline-block px-6 py-2 bg-white text-black font-semibold rounded-none hover:bg-white/90 transition"
            >
              Submit Your First Article
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-6">
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
                        }}
                      >
                        <ExpandableCard
                          className="bg-black/50 border-0 rounded-none h-full flex flex-col relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02]"
                          collapsedSize={{ height: 220 }}
                          expandedSize={{ height: 400 }}
                          hoverToExpand={false}
                          expandDelay={0}
                          collapseDelay={0}
                        >
                          <ExpandableCardHeader className="mb-1 pb-1">
                            <h2 className="text-base font-black text-white mb-0 tracking-wide transition whitespace-nowrap overflow-hidden text-ellipsis">
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
                            
                            {post.amazon_affiliate_links && post.amazon_affiliate_links.length > 0 && (
                              <div className="mb-2 flex items-center gap-2 text-xs text-white/50">
                                <BookOpen className="w-3 h-3" />
                                <span>{post.amazon_affiliate_links.length} book{post.amazon_affiliate_links.length !== 1 ? 's' : ''}</span>
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
      </div>
    </>
  );
}
