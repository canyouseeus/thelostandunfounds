/**
 * Blog Post Detail Page
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from '../components/Loading';
import BlogAnalysis from '../components/BlogAnalysis';
import ShareButtons from '../components/ShareButtons';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { BLOG_CONTENT_CLASS } from '../utils/blogStyles';
import { unescapeContent, normalizeTitle, findTitleMatch, formatDisclosure } from '../utils/blogUtils';

interface AffiliateLink {
  book_title?: string;
  product_title?: string;
  item_title?: string;
  link: string;
}


interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  published_at: string | null;
  created_at: string;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  og_image_url: string | null;
  featured_image?: string | null; // Support existing field
  amazon_affiliate_links?: AffiliateLink[] | null; // Amazon links from submission
  subdomain?: string | null; // User subdomain
  author_id?: string | null; // Author ID
  author_name?: string | null; // Author name for disclosure
  blog_title?: string | null; // Blog title from user_subdomains (normalized)
  blog_title_display?: string | null; // Styled blog title for display
}

interface BlogPostListItem {
  slug: string;
  title: string;
  published_at: string | null;
  created_at: string;
}

export default function BlogPost() {
  const { slug, subdomain } = useParams<{ slug: string; subdomain?: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [nextPost, setNextPost] = useState<BlogPostListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blogTitle, setBlogTitle] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      loadPost(slug, subdomain || null);
      loadNextPost(slug, subdomain || null);

      // Track Page View Start
      const startTime = Date.now();

      // Track Read on Scroll
      let hasRead = false;
      const handleScroll = () => {
        if (hasRead) return;
        const scrollPercentage = (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight;
        if (scrollPercentage > 0.8) {
          hasRead = true;
          // Record "read_article" event
          fetch('/api/admin/analytics/record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event_type: 'read_article',
              resource_id: slug,
              metadata: { title: post?.title, subdomain },
              duration: Math.round((Date.now() - startTime) / 1000)
            })
          }).catch(err => console.error('Analytics error:', err));
        }
      };

      window.addEventListener('scroll', handleScroll);

      return () => {
        // Track time on page on unmount
        const duration = Math.round((Date.now() - startTime) / 1000);
        if (duration > 5) { // Only record if stayed > 5 seconds
          fetch('/api/admin/analytics/record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event_type: 'page_view',
              resource_id: slug,
              metadata: { title: post?.title, subdomain },
              duration
            })
          }).catch(err => console.error('Analytics error:', err));
        }
        window.removeEventListener('scroll', handleScroll);
      };
    }
  }, [slug, subdomain]);

  // Meta tags are now handled by Helmet component below

  const loadPost = async (postSlug: string, urlSubdomain: string | null = null) => {
    try {
      setLoading(true);
      // Get subdomain from URL params, then fallback to pathname
      let subdomain = urlSubdomain;
      if (!subdomain) {
        // Extract subdomain from URL path (e.g., /thelostarchives/... or /blog/subdomain/...)
        const pathname = window.location.pathname;
        const pathParts = pathname.split('/').filter(Boolean);

        // IMPORTANT: /thelostarchives/ is the main blog route, NOT a subdomain
        // Posts in THE LOST ARCHIVES have subdomain IS NULL
        if (pathParts[0] === 'thelostarchives') {
          // This is a main blog post, subdomain should be NULL
          subdomain = null;
        } else if (pathParts[0] === 'blog' && pathParts[1]) {
          // /blog/:subdomain/:slug format
          subdomain = pathParts[1];
        } else if (pathParts[0] === 'book-club' ||
          pathParts[0] === 'gearheads' ||
          pathParts[0] === 'borderlands' ||
          pathParts[0] === 'science' ||
          pathParts[0] === 'newtheory') {
          // These are actual subdomains
          subdomain = pathParts[0];
        } else {
          // Try hostname as fallback (but exclude localhost, www, and main domain)
          const hostname = window.location.hostname;
          const hostnameParts = hostname.split('.');
          if (hostnameParts.length > 1 && hostnameParts[0] !== 'www' && hostnameParts[0] !== 'thelostandunfounds') {
            subdomain = hostnameParts[0];
          } else {
            subdomain = null; // Main blog posts have NULL subdomain
          }
        }
      }

      let query = supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', postSlug);

      // Filter by subdomain if present
      if (subdomain) {
        query = query.eq('subdomain', subdomain);
      } else {
        query = query.is('subdomain', null); // Main blog posts have NULL subdomain
      }

      const { data, error: fetchError } = await query.single();

      if (fetchError) {
        console.error('Error loading blog post:', fetchError);
        setError('Post not found');
        return;
      }

      if (!data) {
        setError('Post not found');
        return;
      }

      // Check if post is published - handle both published boolean and status field
      const isPublished = data.published === true || (data.published === undefined && data.status === 'published');

      if (!isPublished) {
        setError('Post not found');
        return;
      }

      setPost(data);

      // Load blog title if post has a subdomain
      if (data.subdomain) {
        const { data: subdomainData } = await supabase
          .from('user_subdomains')
          .select('blog_title, blog_title_display')
          .eq('subdomain', data.subdomain)
          .maybeSingle();

        // Use display version for UI, normalized version as fallback
        if (subdomainData?.blog_title_display) {
          setBlogTitle(subdomainData.blog_title_display);
        } else if (subdomainData?.blog_title) {
          setBlogTitle(subdomainData.blog_title);
        }
      }
    } catch (err) {
      console.error('Error loading blog post:', err);
      setError('Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  const loadNextPost = async (currentSlug: string, urlSubdomain: string | null = null) => {
    try {
      // Get subdomain from URL params, then fallback to pathname
      let subdomain = urlSubdomain;
      if (!subdomain) {
        // Extract subdomain from URL path (e.g., /thelostarchives/... or /blog/subdomain/...)
        const pathname = window.location.pathname;
        const pathParts = pathname.split('/').filter(Boolean);

        // IMPORTANT: /thelostarchives/ is the main blog route, NOT a subdomain
        // Posts in THE LOST ARCHIVES have subdomain IS NULL
        if (pathParts[0] === 'thelostarchives') {
          // This is a main blog post, subdomain should be NULL
          subdomain = null;
        } else if (pathParts[0] === 'blog' && pathParts[1]) {
          // /blog/:subdomain/:slug format
          subdomain = pathParts[1];
        } else if (pathParts[0] === 'book-club' ||
          pathParts[0] === 'gearheads' ||
          pathParts[0] === 'borderlands' ||
          pathParts[0] === 'science' ||
          pathParts[0] === 'newtheory') {
          // These are actual subdomains
          subdomain = pathParts[0];
        } else {
          // Try hostname as fallback (but exclude localhost, www, and main domain)
          const hostname = window.location.hostname;
          const hostnameParts = hostname.split('.');
          if (hostnameParts.length > 1 && hostnameParts[0] !== 'www' && hostnameParts[0] !== 'thelostandunfounds') {
            subdomain = hostnameParts[0];
          } else {
            subdomain = null; // Main blog posts have NULL subdomain
          }
        }
      }

      // Get all published posts ordered by published_at (oldest first for reading order)
      let query = supabase
        .from('blog_posts')
        .select('slug, title, published_at, created_at, published, status')
        .order('published_at', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });

      // Filter by subdomain if present
      if (subdomain) {
        query = query.eq('subdomain', subdomain);
      } else {
        query = query.is('subdomain', null);
      }

      // Try to filter by published field if it exists
      try {
        query = query.eq('published', true);
      } catch (e) {
        // Column might not exist, will filter client-side
      }

      const { data: allPosts, error: fetchError } = await query;

      if (fetchError) {
        console.error('Error loading posts for next button:', fetchError);
        return;
      }

      // Filter to only published posts
      const publishedPosts = allPosts?.filter((p: any) => {
        // Check if published field exists and is true, or if status is 'published'
        return p.published === true || (p.published === undefined && p.status === 'published');
      }) || [];

      // Find current post index
      const currentIndex = publishedPosts.findIndex((p: BlogPostListItem) => p.slug === currentSlug);

      // Get next post (next in chronological order - oldest to newest)
      if (currentIndex >= 0 && currentIndex < publishedPosts.length - 1) {
        setNextPost(publishedPosts[currentIndex + 1]);
      } else {
        setNextPost(null);
      }
    } catch (err) {
      console.error('Error finding next post:', err);
      setNextPost(null);
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

  // No legacy helpers needed here anymore as logic is moved to HTML migration and formatContent simplification

  const formatContent = (content: string | undefined | null) => {
    if (!content) return null;

    try {
      // 1. Unescape content (handles double-escaped DB strings)
      let processedContent = unescapeContent(content);

      // 2. Automatic Book Title Linking
      // Rule: Max 2 links per book (1 in intro/first occurrence, 1 in section)
      if (post && post.amazon_affiliate_links && post.amazon_affiliate_links.length > 0) {
        processedContent = applyAutomaticLinking(processedContent, post.amazon_affiliate_links, post.author_name || undefined);
      }

      // 3. Final sanitization
      const DOMPurify = (window as any).DOMPurify;
      let safeHtml = processedContent;

      if (DOMPurify) {
        safeHtml = DOMPurify.sanitize(processedContent, {
          ALLOWED_TAGS: ['p', 'a', 'strong', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'br', 'hr', 'blockquote', 'code', 'pre', 'div', 'span', 'img'],
          ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'data-product-title', 'src', 'alt'],
        });
      }

      return (
        <div
          dangerouslySetInnerHTML={{ __html: safeHtml }}
          className={BLOG_CONTENT_CLASS}
        />
      );
    } catch (error: any) {
      console.error('Error formatting content:', error);
      // Fallback: strip tags and show plain text if something really goes wrong
      const stripped = unescapeContent(content).replace(/<[^>]*>?/gm, ' ');
      return (
        <div className={BLOG_CONTENT_CLASS}>
          {stripped.split(/\n\n+/).map((para: string, idx: number) => (
            <p key={idx} className="mb-6">{para}</p>
          ))}
        </div>
      );
    }
  };

  /**
   * Applies automatic linking and formatting to content
   */
  const applyAutomaticLinking = (content: string, affiliateLinks: AffiliateLink[], authorName?: string): string => {
    let result = content;

    // 1. Build link map and variations
    const bookLinks: Record<string, string> = {};
    const bookTitles: string[] = [];

    affiliateLinks.forEach(link => {
      const title = link.book_title || link.product_title || link.item_title;
      if (title && link.link) {
        bookLinks[title] = link.link;
        if (!bookTitles.includes(title)) bookTitles.push(title);

        // Common variations
        if (title.toLowerCase().includes("ender's game") || title.toLowerCase().includes("enders game")) {
          bookLinks["Ender's Game"] = link.link;
          bookLinks["Ender’s Game"] = link.link;
          bookLinks["Enders Game"] = link.link;
        }

        // Specially handle the user reported missing link
        if (title.toLowerCase().includes('lion') && title.toLowerCase().includes('wardrobe')) {
          bookLinks["The Lion, the Witch and the Wardrobe"] = link.link;
          bookLinks["The Lion, The Witch and The Wardrobe"] = link.link;
          bookLinks["The Lion, the Witch, and the Wardrobe"] = link.link;
          bookLinks["Lion, the Witch and the Wardrobe"] = link.link;
        }

        // Handle "The" prefix
        if (!title.toLowerCase().startsWith('the ')) {
          bookLinks[`The ${title}`] = link.link;
        }
      }
    });

    // 2. Track link counts per book to stick to "Max 2 links" rule
    const linkCounts: Record<string, number> = {};
    bookTitles.forEach(t => linkCounts[t] = 0);

    // 3. Process the content
    // We split into sections/paragraphs to detect headers and context
    const parts = result.split(/(<[^>]+>)/g); // Split by HTML tags

    // For now, let's do a more targeted replacement to avoid breaking existing HTML
    // We'll iterate through affiliate links and find occurrences

    // Reverse sort titles by length to avoid partial matches (e.g. "The Hobbit" before "Hobbit")
    const sortedTitles = [...Object.keys(bookLinks)].sort((a, b) => b.length - a.length);

    // Track which book a section belongs to based on headers
    let currentSectionBook: string | null = null;

    // A simpler approach: replace unlinked text occurrences
    // But we must ONLY replace text that is NOT already inside an <a> tag

    // We'll use a regex that matches the book titles but avoids existing links
    // This is hard to do perfectly with regex on HTML string, so we'll do it safely

    sortedTitles.forEach(title => {
      const link = bookLinks[title];
      const normalizedMatch = normalizeTitle(title);

      // We want to find occurrences of 'title' in 'result'
      // but only if 'linkCounts[baseTitle] < 2'
      const baseTitle = affiliateLinks.find(l =>
        (l.book_title || l.product_title || l.item_title) === title ||
        bookLinks[l.book_title || l.product_title || l.item_title || ''] === link
      )?.book_title || title;

      // Find occurrences using a safe word boundary regex
      // but exclude those already in <a> tags
      // This is a common pattern for "automatic linking"

      const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const titleRegex = new RegExp(`(?<!<a[^>]*>)(?<!<[^>]*)${escapeRegExp(title)}(?![^<]*</a>)(?![^<]*>)`, 'gi');

      result = result.replace(titleRegex, (match) => {
        if ((linkCounts[baseTitle] || 0) < 2) {
          linkCounts[baseTitle] = (linkCounts[baseTitle] || 0) + 1;
          return `<a href="${link}" target="_blank" rel="noopener noreferrer" class="font-bold text-white underline hover:text-white/80 transition"><strong>${match}</strong></a>`;
        } else {
          return `<strong>${match}</strong>`; // Bold but no link after 2 times
        }
      });
    });

    // 4. Handle Affiliate Disclosure author name formatting
    if (authorName) {
      const disclosureRegex = /Amazon Affiliate Disclosure: As an Amazon Associate, (.*?) earns from qualifying purchases/i;
      result = result.replace(disclosureRegex, (match, name) => {
        return match.replace(name, `<strong>${authorName.toUpperCase()}</strong>`);
      });
    }

    return result;
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

  if (error || !post) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-900/20 border border-white rounded-none p-6">
          <h1 className="text-2xl font-bold text-white mb-4">Post Not Found</h1>
          <p className="text-red-400 mb-4">{error || 'The post you are looking for does not exist.'}</p>
          <Link
            to="/thelostarchives"
            className="text-white hover:text-white/80 transition"
          >
            ← Back to THE LOST ARCHIVES
          </Link>
        </div>
      </div>
    );
  }

  if (!post) {
    return null;
  }

  const title = post.seo_title || post.title;
  const description = post.seo_description || post.excerpt ||
    post.content.substring(0, 160).replace(/\n/g, ' ').trim();
  const ogImage = post.og_image_url || post.featured_image;
  const publishedDate = post.published_at || post.created_at;

  return (
    <>
      <Helmet>
        <title>{title} | THE LOST ARCHIVES | THE LOST+UNFOUNDS</title>
        <link rel="canonical" href={`https://www.thelostandunfounds.com/thelostarchives/${post.slug}`} />
        <meta name="description" content={description} />
        {post.seo_keywords && <meta name="keywords" content={post.seo_keywords} />}
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={`https://www.thelostandunfounds.com/thelostarchives/${post.slug}`} />
        <meta property="og:type" content="article" />
        {ogImage && <meta property="og:image" content={ogImage} />}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        {ogImage && <meta name="twitter:image" content={ogImage} />}
        <script type="application/ld+json">
          {JSON.stringify((() => {
            const structuredData: any = {
              "@context": "https://schema.org",
              "@type": "BlogPosting",
              "headline": title,
              "description": description,
              "url": `https://www.thelostandunfounds.com/thelostarchives/${post.slug}`,
              "datePublished": publishedDate,
              "dateModified": post.created_at,
              "author": {
                "@type": "Organization",
                "name": "THE LOST+UNFOUNDS"
              },
              "publisher": {
                "@type": "Organization",
                "name": "THE LOST+UNFOUNDS",
                "url": "https://www.thelostandunfounds.com"
              },
              "mainEntityOfPage": {
                "@type": "WebPage",
                "@id": `https://www.thelostandunfounds.com/thelostarchives/${post.slug}`
              }
            };
            if (ogImage) {
              structuredData.image = ogImage;
            }
            return structuredData;
          })())}
        </script>
      </Helmet>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/thelostarchives"
            className="text-white/60 hover:text-white text-sm inline-flex items-center gap-2 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to THE LOST ARCHIVES
          </Link>
          {nextPost && (
            <Link
              to={post.subdomain ? `/blog/${post.subdomain}/${nextPost.slug}` : `/thelostarchives/${nextPost.slug}`}
              className="text-white/60 hover:text-white text-sm inline-flex items-center gap-2 transition"
            >
              <span className="hidden sm:inline">Next: {nextPost.title}</span>
              <span className="sm:hidden">Next Post</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        {/* View More Posts from Author */}
        {post.subdomain && (
          <div className="mb-6">
            <Link
              to={`/blog/${post.subdomain}`}
              className="text-white/70 hover:text-white text-sm inline-flex items-center gap-2 transition underline"
            >
              View more posts from {blogTitle || post.subdomain.toUpperCase()}
            </Link>
          </div>
        )}

        <article>
          <header className="mb-8 text-left">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-white mb-4 tracking-wide text-left">
              {post.title}
            </h1>

            {post.published_at && (
              <time className="text-white/50 text-sm text-left">
                {formatDate(post.published_at)}
              </time>
            )}

            {/* Excerpt/Preview Text */}
            {(post.excerpt || (post.content && post.content.length > 0)) && (
              <p
                className="text-white/80 text-lg leading-relaxed mt-4 text-left"
                dangerouslySetInnerHTML={{
                  __html: (() => {
                    const stripHtml = (html: string) => {
                      if (!html) return '';
                      const unescaped = html.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
                      const stripped = unescaped.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
                      // Always bold THE LOST+UNFOUNDS
                      return stripped.replace(/THE LOST\+UNFOUNDS/g, '<strong>THE LOST+UNFOUNDS</strong>');
                    };

                    if (post.excerpt && post.excerpt.trim().length > 0) {
                      return stripHtml(post.excerpt);
                    }

                    // Generate excerpt from content by stripping HTML tags
                    const stripped = stripHtml(post.content || '');
                    if (stripped.length > 0) {
                      const trimmed = stripped.length > 200
                        ? stripped.substring(0, 200).replace(/\s+\S*$/, '') + '...'
                        : stripped;
                      return trimmed;
                    }
                    return '';
                  })()
                }}
              />
            )}
          </header>

          <div className={BLOG_CONTENT_CLASS}>
            {formatContent(post.content)}
          </div>

          {/* Share Buttons */}
          <ShareButtons
            title={post.title}
            url={`/thelostarchives/${post.slug}`}
            description={post.excerpt || post.seo_description || undefined}
          />

          {/* AI Breakdown Section */}
          <BlogAnalysis
            title={post.title}
            content={post.content}
            excerpt={post.excerpt}
          />
        </article>
      </div>
    </>
  );
}
