/**
 * Book Club Page - Collection of user-submitted articles
 * Shows all published articles from user blogs (subdomain blogs)
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from '../components/Loading';
import { BookOpen, User, Calendar } from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  published_at: string | null;
  created_at: string;
  subdomain: string | null;
  author_id: string | null;
  amazon_affiliate_links?: any[] | null;
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

      // Load all published posts that have a subdomain (user blogs)
      // These are the "Book Club" articles - user-submitted content
      const { data, error: fetchError } = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, published_at, created_at, subdomain, author_id, amazon_affiliate_links')
        .not('subdomain', 'is', null) // Only posts with subdomains (user blogs)
        .eq('published', true)
        .order('published_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100);

      if (fetchError) {
        console.error('Error loading book club posts:', fetchError);
        setError('Failed to load articles');
        return;
      }

      setPosts(data || []);
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

  // Group posts by subdomain (author)
  const postsByAuthor = posts.reduce((acc, post) => {
    const author = post.subdomain || 'unknown';
    if (!acc[author]) {
      acc[author] = [];
    }
    acc[author].push(post);
    return acc;
  }, {} as Record<string, BlogPost[]>);

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
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/60 text-lg mb-4">No articles yet.</p>
            <p className="text-white/50 text-sm mb-6">
              Be the first to contribute! Submit your article with four book recommendations.
            </p>
            <Link
              to="/submit-article"
              className="inline-block px-6 py-2 bg-white text-black font-semibold rounded-none hover:bg-white/90 transition"
            >
              Submit Your First Article
            </Link>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Show all posts in a grid, grouped by author */}
            {Object.entries(postsByAuthor).map(([author, authorPosts]) => (
              <div key={author} className="space-y-6">
                {/* Author Header */}
                <div className="border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-white/60" />
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        {author.charAt(0).toUpperCase() + author.slice(1)}'s Articles
                      </h2>
                      <Link
                        to={`/blog/${author}`}
                        className="text-white/60 hover:text-white text-sm transition"
                      >
                        View {author}'s blog →
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Author's Posts Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {authorPosts.map((post) => (
                    <Link
                      key={post.id}
                      to={`/blog/${post.subdomain}/${post.slug}`}
                      className="group"
                    >
                      <article className="bg-black/50 border-2 border-white/10 rounded-lg p-5 h-full flex flex-col hover:border-white/30 hover:shadow-lg hover:shadow-white/10 transition-all duration-300 transform hover:-translate-y-1">
                        <div className="mb-4 pb-3 border-b border-white/10">
                          <h3 className="text-base font-black text-white mb-2 tracking-wide group-hover:text-white/90 transition line-clamp-2">
                            {post.title}
                          </h3>
                        </div>

                        {post.excerpt && (
                          <div className="flex-1 mb-4">
                            <p className="text-white/60 text-sm leading-relaxed line-clamp-4 text-left">
                              {post.excerpt}
                            </p>
                          </div>
                        )}

                        {post.amazon_affiliate_links && post.amazon_affiliate_links.length > 0 && (
                          <div className="mb-4 flex items-center gap-2 text-xs text-white/50">
                            <BookOpen className="w-3 h-3" />
                            <span>{post.amazon_affiliate_links.length} book{post.amazon_affiliate_links.length !== 1 ? 's' : ''}</span>
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
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
