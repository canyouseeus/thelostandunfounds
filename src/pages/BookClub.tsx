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

      // Load all published posts that belong to the "bookclub" column
      // Fallback: if blog_column is null but post has a subdomain, it's also considered book club
      const { data, error: fetchError } = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, content, published_at, created_at, subdomain, author_id, amazon_affiliate_links, blog_column')
        .eq('published', true)
        .or('blog_column.eq.bookclub,and(blog_column.is.null,subdomain.not.is.null)')
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

  const extractFirstImage = (content?: string | null) => {
    if (!content) return null;
    const markdownMatch = content.match(/!\[[^\]]*?\]\((https?:\/\/[^\s)]+?\.(?:png|jpe?g|gif|webp))\)/i);
    if (markdownMatch) return markdownMatch[1];
    const urlMatch = content.match(/(https?:\/\/[^\s]+?\.(?:png|jpe?g|gif|webp))/i);
    if (urlMatch) return urlMatch[1];
    return null;
  };

  const buildPreviewExcerpt = (post: BlogPost) => {
    const stripHtml = (html: string) => {
      if (!html) return '';
      return html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
    };

    if (post.excerpt && post.excerpt.trim().length > 0) {
      const preview = stripHtml(post.excerpt);
      return preview.length > 220
        ? preview.substring(0, 220).replace(/\s+\S*$/, '') + '...'
        : preview;
    }
    const source = (post.content || '').trim();
    if (!source) return '';
    const cleanSource = stripHtml(source);
    const sentences = cleanSource
      .split(/(?<=[.!?])\s+/)
      .filter(Boolean);
    const candidate = sentences.slice(0, 2).join(' ');
    const preview = candidate || sentences[0] || cleanSource;
    return preview.length > 220
      ? preview.substring(0, 220).replace(/\s+\S*$/, '') + '...'
      : preview;
  };

  const buildExpandedIntro = (post: BlogPost) => {
    const stripHtml = (html: string) => {
      if (!html) return '';
      return html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
    };

    const source = (post.content || post.excerpt || '').trim();
    if (!source) return '';
    const cleanSource = stripHtml(source);
    const firstParagraph = cleanSource.split(/\n\n+/)[0]?.trim() || '';
    return firstParagraph.substring(0, 420);
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
          <p className="text-white/60 text-sm max-w-lg mx-auto text-justify leading-relaxed">
            Each article features four books connecting ideas across different works and sharing personal reflections.
          </p>
          <div className="mt-6">
            <Link
              to="/submit/bookclub"
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
              to="/submit/bookclub"
              className="inline-block px-6 py-2 bg-white text-black font-semibold rounded-none hover:bg-white/90 transition"
            >
              Submit the First Article
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {posts.map((post) => {
              const excerpt = buildPreviewExcerpt(post);
              const imageUrl = extractFirstImage(post.content || post.excerpt || '');
              const expandedIntro = buildExpandedIntro(post);
              const showAdditionalContent = !!expandedIntro;

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
                        className="rounded-none"
                        style={{
                          minHeight: isExpanded ? '420px' : '220px',
                          transition: 'min-height 0.2s ease-out',
                        }}
                      >
                        <ExpandableCard
                          className="bg-black rounded-none h-full flex flex-col relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] cursor-pointer"
                          collapsedSize={{ height: 220 }}
                          expandedSize={{ height: 420 }}
                          hoverToExpand={false}
                          expandDelay={0}
                          collapseDelay={0}
                        >
                          <ExpandableCardHeader className="mb-1 pb-1">
                            <h3 className="text-base font-black text-white mb-0 tracking-wide transition whitespace-nowrap overflow-hidden text-ellipsis">
                              {post.title}
                            </h3>
                            <time className="text-white/60 text-xs font-medium block mt-1">
                              {formatDate(post.published_at || post.created_at)}
                            </time>
                          </ExpandableCardHeader>

                          <ExpandableCardContent className="flex-1 min-h-0">
                            {excerpt && (
                              <div className="mb-1">
                                <p className="text-white/70 text-sm leading-relaxed line-clamp-4 text-left">
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
                              {imageUrl && (
                                <div className="mb-3">
                                  <img
                                    src={imageUrl}
                                    alt={post.title}
                                    className="w-full h-32 object-cover rounded-none bg-white/5"
                                  />
                                </div>
                              )}
                              {showAdditionalContent && (
                                <div className="mb-2">
                                  <p className="text-white/60 text-xs leading-relaxed text-left line-clamp-6">
                                    {expandedIntro}
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
                            <div className="flex items-center justify-end gap-2 min-w-0 w-full">
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
