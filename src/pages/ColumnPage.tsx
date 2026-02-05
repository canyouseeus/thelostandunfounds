/**
 * Generic Column Page Component
 * Displays posts for a specific blog column
 */

import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../lib/supabase';
import { LoadingOverlay } from '../components/Loading'; // Updated import
import { BlogCard } from '../components/BlogCard';
import { BookOpenIcon, WrenchIcon, MapPinIcon, BeakerIcon, LightBulbIcon } from '@heroicons/react/24/outline';

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
  bookclub: <BookOpenIcon className="w-6 h-6" />,
  gearheads: <WrenchIcon className="w-6 h-6" />,
  borderlands: <MapPinIcon className="w-6 h-6" />,
  science: <BeakerIcon className="w-6 h-6" />,
  newtheory: <LightBulbIcon className="w-6 h-6" />,
  main: null,
};

export default function ColumnPage({ column, title, description, submitPath, icon }: ColumnPageProps) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    loadPosts();
    return () => {
      isMounted.current = false;
    };
  }, [column]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Create a timeout promise to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout after 15 seconds')), 15000)
      );

      // Try to filter by column field first, fallback to subdomain for bookclub
      let queryBuilder = supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, content, published_at, created_at, subdomain, author_id, amazon_affiliate_links, blog_column')
        .eq('published', true);

      // Filter by blog_column if it exists, otherwise use fallback logic
      // Note: supabase-js query building is synchronous/lazy, it won't throw here for invalid cols.
      // We rely on the request error to fallback.
      if (column === 'main') {
        queryBuilder = queryBuilder.or('blog_column.eq.main,and(blog_column.is.null,subdomain.is.null)');
      } else if (column === 'bookclub') {
        queryBuilder = queryBuilder.or('blog_column.eq.bookclub,and(blog_column.is.null,subdomain.not.is.null)');
      } else {
        queryBuilder = queryBuilder.eq('blog_column', column);
      }

      const queryPromise = queryBuilder
        .order('published_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100);

      // Race the query against the timeout
      const result = await Promise.race([queryPromise, timeoutPromise]) as any;

      if (!isMounted.current) return;

      // Handle query result
      if (result.error) {
        console.warn(`Primary query failed for ${column}, falling back or handling error:`, result.error);

        // Fallback logic for old schema if column doesn't exist (Error 42703) or generic error
        // This is a simplified fallback - in reality we should probably just return empty if column schema is enforced
        if (column === 'bookclub') {
          // Fallback fetch
          const fallbackQuery = supabase
            .from('blog_posts')
            .select('*')
            .eq('published', true)
            .not('subdomain', 'is', null)
            .order('published_at', { ascending: false })
            .limit(100);
          const { data: fallbackData } = await fallbackQuery;
          if (isMounted.current) {
            setPosts(fallbackData || []);
          }
          return;
        }

        setPosts([]);
        return;
      }

      setPosts(result.data || []);

    } catch (err: any) {
      if (!isMounted.current) return;
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        console.log('🚫 Query aborted (likely due to unmount/navigate)');
        return;
      }
      console.error(`Error loading ${column}:`, err);
      // Don't set error - just show empty state with encouraging message
      setPosts([]);
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
    return <LoadingOverlay message={`Loading ${title}...`} />;
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
          <p className="text-white/60 text-sm max-w-lg mx-auto text-justify leading-relaxed">
            {description}
          </p>
          {posts.length > 0 && (
            <div className="mt-6">
              <Link
                to={submitPath}
                className="inline-block px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-none text-white text-sm font-medium transition"
              >
                Submit Your Article →
              </Link>
            </div>
          )}
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-16">
            <h2 className="text-2xl md:text-3xl font-black text-white mb-4 tracking-wide">
              Be the First to Share
            </h2>
            <p className="text-white/70 text-lg mb-2 max-w-lg mx-auto text-justify leading-relaxed">
              This column is waiting for its first story.
            </p>
            <p className="text-white/50 text-sm mb-8 max-w-lg mx-auto text-justify leading-relaxed">
              {description}
            </p>
            <Link
              to={submitPath}
              className="inline-block px-8 py-3 bg-white text-black font-bold rounded-none hover:bg-white/90 transition text-base"
            >
              Submit the First Article →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {posts.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
