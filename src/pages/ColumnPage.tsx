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
        .select('id, title, slug, excerpt, content, published_at, created_at, subdomain, author_id, amazon_affiliate_links, column')
        .eq('published', true);

      // Filter by column if it exists, otherwise use fallback logic
      try {
        query = query.eq('column', column);
      } catch (e) {
        // Column field might not exist yet - use fallback
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
        setError('Failed to load articles');
        return;
      }

      // Filter by column if column field exists in data
      const filteredData = data?.filter((post: any) => {
        if (post.column) {
          return post.column === column;
        }
        // Fallback logic if column field doesn't exist
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
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-4 tracking-wide flex items-center justify-center gap-3">
            {displayIcon}
            {title}
          </h1>
          <p className="text-white/60 text-sm max-w-2xl mx-auto">
            {description}
          </p>
          <div className="mt-6">
            <Link
              to={submitPath}
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
            {displayIcon && <div className="flex justify-center mb-4 text-white/20">{displayIcon}</div>}
            <p className="text-white/60 text-lg mb-4">No articles yet.</p>
            <p className="text-white/50 text-sm mb-6">
              Be the first to contribute! Submit your article to this column.
            </p>
            <Link
              to={submitPath}
              className="inline-block px-6 py-2 bg-white text-black font-semibold rounded-none hover:bg-white/90 transition"
            >
              Submit Your First Article
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {posts.map((post) => {
              const postUrl = post.subdomain 
                ? `/blog/${post.subdomain}/${post.slug}`
                : `/thelostarchives/${post.slug}`;
              
              return (
                <Link
                  key={post.id}
                  to={postUrl}
                  className="group"
                >
                  <article className="bg-black/50 border-2 border-white/10 rounded-lg p-5 h-full flex flex-col hover:border-white/30 hover:shadow-lg hover:shadow-white/10 transition-all duration-300 transform hover:-translate-y-1">
                    <div className="mb-4 pb-3 border-b border-white/10">
                      <h3 className="text-base font-black text-white mb-2 tracking-wide group-hover:text-white/90 transition line-clamp-2">
                        {post.title}
                      </h3>
                    </div>

                    {(() => {
                      const excerpt = post.excerpt || (post.content ? (() => {
                        const firstParagraph = post.content.split(/\n\n+/)[0]?.trim() || '';
                        if (firstParagraph.length > 0) {
                          return firstParagraph.length > 200 
                            ? firstParagraph.substring(0, 200).replace(/\s+\S*$/, '') + '...'
                            : firstParagraph;
                        }
                        return '';
                      })() : '');
                      
                      return excerpt ? (
                        <div className="flex-1 mb-4">
                          <p className="text-white/60 text-sm leading-relaxed line-clamp-4 text-left">
                            {excerpt}
                          </p>
                        </div>
                      ) : null;
                    })()}

                    {post.amazon_affiliate_links && post.amazon_affiliate_links.length > 0 && (
                      <div className="mb-4 flex items-center gap-2 text-xs text-white/50">
                        {displayIcon}
                        <span>{post.amazon_affiliate_links.length} item{post.amazon_affiliate_links.length !== 1 ? 's' : ''}</span>
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
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
