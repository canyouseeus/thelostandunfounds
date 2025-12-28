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
  blog_column?: string | null;
}

export default function Blog() {
  const [mainPosts, setMainPosts] = useState<BlogPost[]>([]);
  const [bookClubPosts, setBookClubPosts] = useState<BlogPost[]>([]);
  const [gearHeadsPosts, setGearHeadsPosts] = useState<BlogPost[]>([]);
  const [borderlandsPosts, setBorderlandsPosts] = useState<BlogPost[]>([]);
  const [sciencePosts, setSciencePosts] = useState<BlogPost[]>([]);
  const [newTheoryPosts, setNewTheoryPosts] = useState<BlogPost[]>([]);
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

      // Helper to build a query for a specific column
      const buildQuery = (column: string, isSubdomainBased = false) => {
        let query = supabase
          .from('blog_posts')
          .select('id, title, slug, excerpt, content, published_at, created_at, seo_title, seo_description, published, status, subdomain, blog_column')
          .order('published_at', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(3);

        if (column === 'main') {
          // Main: blog_column is 'main' OR (null column AND null subdomain)
          query = query.or('blog_column.eq.main,and(blog_column.is.null,subdomain.is.null)');
        } else if (column === 'bookclub') {
          // Book Club: blog_column is 'bookclub' OR subdomain is not null
          query = query.or('blog_column.eq.bookclub,subdomain.not.is.null');
        } else {
          // Others: strict match
          query = query.eq('blog_column', column);
        }

        // Try to filter by published if possible (client-side fallback handled later)
        // Note: supabase-js might throw on unknown columns if we're not careful, 
        // but 'published' exists in the schema based on previous code.
        return query;
      };

      const columns = ['main', 'bookclub', 'gearheads', 'borderlands', 'science', 'newtheory'];
      const queries = columns.map(col => buildQuery(col));

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout after 15 seconds')), 15000)
      );

      const results = await Promise.all(
        queries.map(q => Promise.race([q, timeoutPromise]))
      ) as any[];

      // Process results
      const processedPosts = results.map((result, index) => {
        const { data, error } = result;
        if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
          console.error(`Error loading ${columns[index]} posts:`, error);
          return [];
        }

        // Filter published
        return (data || []).filter((post: any) => {
          try {
            return post.published === true || (post.published === undefined && post.status === 'published');
          } catch (e) {
            return false;
          }
        });
      });

      setMainPosts(processedPosts[0]);
      setBookClubPosts(processedPosts[1]);
      setGearHeadsPosts(processedPosts[2]);
      setBorderlandsPosts(processedPosts[3]);
      setSciencePosts(processedPosts[4]);
      setNewTheoryPosts(processedPosts[5]);

      console.log('✅ Posts loaded via parallel queries');

    } catch (err: any) {
      console.error('❌ Error loading blog posts:', err);
      setError(err?.message || 'Failed to load blog posts');
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white mb-4 tracking-wide whitespace-nowrap">
            THE LOST ARCHIVES
          </h1>
          <p className="text-white/60 text-sm mb-4">
            Official articles from <strong className="font-bold text-white">THE LOST+UNFOUNDS</strong>
          </p>
          <div className="flex items-center justify-center gap-4 flex-nowrap whitespace-nowrap">
            <Link
              to="/book-club"
              className="inline-flex items-center justify-center w-40 sm:w-48 py-2 bg-white hover:bg-white/90 border border-white/20 rounded-none text-black text-xs sm:text-sm font-medium transition"
            >
              View BOOK CLUB →
            </Link>
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
                  {posts.map((post) => {
                    const excerpt = buildPreviewExcerpt(post);
                    const imageUrl = extractFirstImage(post.content || post.excerpt || '');
                    const expandedIntro = buildExpandedIntro(post);
                    const showAdditionalContent = !!expandedIntro;

                    // Determine link target
                    let postLink = `/thelostarchives/${post.slug}`;
                    if (post.subdomain) {
                      postLink = `/blog/${post.subdomain}/${post.slug}`;
                    } else if (post.blog_column && post.blog_column !== 'main') {
                      // If it's a column post without subdomain (old data?), where should it go?
                      // Defaulting to thelostarchives logic if no subdomain, 
                      // OR we could construct /blog/[column]/[slug] if subdomains matched columns.
                      // Safe bet: use thelostarchives if subdomain is missing.
                      postLink = `/thelostarchives/${post.slug}`;
                    }

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
                                  <h2 className="text-base font-black text-white mb-0 tracking-wide transition whitespace-nowrap overflow-hidden text-ellipsis">
                                    {post.title}
                                  </h2>
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
                                      to={postLink}
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
              </div>
            );
          };

          return (
            <>
              {renderSection('From THE LOST ARCHIVES', mainPosts, '/thelostarchives/all')}

              {/* Logo divider only if Book Club posts exist */}
              {bookClubPosts.length > 0 && (
                <div className="flex justify-center my-8 gap-12">
                  {[1, 2, 3].map((i) => (
                    <img
                      key={i}
                      src="/logo.png"
                      alt="THE LOST+UNFOUNDS"
                      className="h-40 w-auto object-contain"
                    />
                  ))}
                </div>
              )}

              {renderSection('From the BOOK CLUB', bookClubPosts, '/book-club')}
              {renderSection('GEARHEADS', gearHeadsPosts, '/gearheads')}
              {renderSection('EDGE OF THE BORDERLANDS', borderlandsPosts, '/borderlands')}
              {renderSection('MAD SCIENTISTS', sciencePosts, '/science')}
              {renderSection('NEW THEORY', newTheoryPosts, '/newtheory')}
            </>
          );
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
