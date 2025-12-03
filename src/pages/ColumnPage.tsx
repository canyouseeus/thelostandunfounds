/**
 * Generic Column Page Component
 * Displays posts for a specific blog column
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from '../components/Loading';
import { BookOpen, Wrench, MapPin, Atom, Lightbulb } from 'lucide-react';
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
  content?: string | null;
  published_at: string | null;
  created_at: string;
  subdomain: string | null;
  author_id: string | null;
  amazon_affiliate_links?: any[] | null;
}

interface ColumnPageProps {
  column: 'main' | 'bookclub' | 'gearheads' | 'borderlands' | 'science' | 'newtheory';
  title: string;
  description: string;
  submitPath: string;
  icon?: React.ReactNode;
}

const COLUMN_ICONS = {
  bookclub: <BookOpen className="w-6 h-6" />,
  gearheads: <Wrench className="w-6 h-6" />,
  borderlands: <MapPin className="w-6 h-6" />,
  science: <Atom className="w-6 h-6" />,
  newtheory: <Lightbulb className="w-6 h-6" />,
  main: null,
};

export default function ColumnPage({ column, title, description, submitPath, icon }: ColumnPageProps) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPosts();
  }, [column]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to filter by column field first, fallback to subdomain for bookclub
      let query = supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, content, published_at, created_at, subdomain, author_id, amazon_affiliate_links, blog_column')
        .eq('published', true);

      // Filter by blog_column if it exists, otherwise use fallback logic
      try {
        query = query.eq('blog_column', column);
      } catch (e) {
        // blog_column field might not exist yet - use fallback
        if (column === 'bookclub') {
          query = query.not('subdomain', 'is', null);
        } else if (column === 'main') {
          query = query.is('subdomain', null);
        }
      }

      const { data, error: fetchError } = await query
        .order('published_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100);

      if (fetchError) {
        console.error(`Error loading ${column} posts:`, fetchError);
        // Don't set error - just show empty state with encouraging message
        setPosts([]);
        return;
      }

      // Filter by blog_column if blog_column field exists in data
      const filteredData = data?.filter((post: any) => {
        if (post.blog_column) {
          return post.blog_column === column;
        }
        // Fallback logic if blog_column field doesn't exist
        if (column === 'bookclub') {
          return post.subdomain !== null;
        } else if (column === 'main') {
          return post.subdomain === null;
        }
        return false;
      }) || [];

      setPosts(filteredData);
    } catch (err: any) {
      console.error(`Error loading ${column}:`, err);
      // Don't set error - just show empty state with encouraging message
      setPosts([]);
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  const displayIcon = icon || COLUMN_ICONS[column];

  return (
    <>
      <Helmet>
        <title>{title} | THE LOST ARCHIVES | THE LOST+UNFOUNDS</title>
        <link rel="canonical" href={`https://www.thelostandunfounds.com/${column === 'main' ? 'thelostarchives' : column === 'bookclub' ? 'book-club' : column}`} />
        <meta name="description" content={description} />
        <meta property="og:title" content={`${title} | THE LOST ARCHIVES`} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={`https://www.thelostandunfounds.com/${column === 'main' ? 'thelostarchives' : column === 'bookclub' ? 'book-club' : column}`} />
        <meta property="og:type" content="website" />
      </Helmet>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-4 tracking-wide">
            {title}
          </h1>
          <p className="text-white/60 text-sm max-w-2xl mx-auto text-center">
            {description}
          </p>
          <div className="mt-6">
            <Link
              to={submitPath}
              className="inline-block px-6 py-2 bg-white/10 hover:bg-white/20 border border-white rounded-none text-white text-sm font-medium transition"
            >
              Submit Your Article →
            </Link>
          </div>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-16">
            <h2 className="text-2xl md:text-3xl font-black text-white mb-4 tracking-wide">
              Be the First to Share
            </h2>
            <p className="text-white/70 text-lg mb-2 max-w-xl mx-auto">
              This column is waiting for its first story.
            </p>
            <p className="text-white/50 text-sm mb-8 max-w-lg mx-auto">
              {description}
            </p>
            <Link
              to={submitPath}
              className="inline-block px-8 py-3 bg-white text-black font-bold rounded-none hover:bg-white/90 transition text-base"
            >
              Submit Your First Article →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-6">
            {posts.map((post) => {
              const postUrl = post.subdomain 
                ? `/blog/${post.subdomain}/${post.slug}`
                : `/thelostarchives/${post.slug}`;
              
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
                                <span>{post.amazon_affiliate_links.length} item{post.amazon_affiliate_links.length !== 1 ? 's' : ''}</span>
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
                                to={postUrl}
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
