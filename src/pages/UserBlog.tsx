/**
 * User Blog Page - Shows posts for a specific user subdomain
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
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
  author_id: string | null;
  author_name: string | null;
}

const extractFirstImage = (content?: string | null) => {
  if (!content) return null;
  const markdownMatch = content.match(/!\[[^\]]*?\]\((https?:\/\/[^\s)]+?\.(?:png|jpe?g|gif|webp))\)/i);
  if (markdownMatch) return markdownMatch[1];
  const urlMatch = content.match(/(https?:\/\/[^\s]+?\.(?:png|jpe?g|gif|webp))/i);
  if (urlMatch) return urlMatch[1];
  return null;
};

const buildPreviewExcerpt = (post: BlogPost) => {
  if (post.excerpt && post.excerpt.trim().length > 0) {
    const preview = post.excerpt.trim().replace(/\s+/g, ' ');
    return preview.length > 220
      ? preview.substring(0, 220).replace(/\s+\S*$/, '') + '...'
      : preview;
  }
  const source = (post.content || '').trim();
  if (!source) return '';
  const sentences = source
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);
  const candidate = sentences.slice(0, 2).join(' ');
  const preview = candidate || sentences[0] || source;
  return preview.length > 220
    ? preview.substring(0, 220).replace(/\s+\S*$/, '') + '...'
    : preview;
};

const buildExpandedIntro = (post: BlogPost) => {
  const source = (post.content || post.excerpt || '').trim();
  if (!source) return '';
  const firstParagraph = source.split(/\n\n+/)[0]?.trim() || '';
  return firstParagraph.substring(0, 420);
};

export default function UserBlog() {
  const { subdomain } = useParams<{ subdomain: string }>();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<{ name?: string; email?: string } | null>(null);
  const [blogTitle, setBlogTitle] = useState<string | null>(null);
  const [blogTitleDisplay, setBlogTitleDisplay] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState<string | null>(null);

  useEffect(() => {
    if (subdomain) {
      loadUserBlog(subdomain);
    }
  }, [subdomain]);

  const loadUserBlog = async (userSubdomain: string) => {
    try {
      setLoading(true);
      setError(null);

      // Load posts for this subdomain
      // Try multiple query strategies to handle different schema versions
      let postsData;
      let postsError;
      
      // Strategy 1: Try with published field and author_name
      let result = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, content, published_at, created_at, seo_title, seo_description, author_id, author_name')
        .eq('subdomain', userSubdomain)
        .eq('published', true)
        .order('published_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100);
      
      postsData = result.data;
      postsError = result.error;
      
      // Strategy 2: If that failed, try without author_name
      if (postsError && (postsError.message?.includes('author_name') || postsError.message?.includes('column'))) {
        result = await supabase
          .from('blog_posts')
          .select('id, title, slug, excerpt, content, published_at, created_at, seo_title, seo_description, author_id')
          .eq('subdomain', userSubdomain)
          .eq('published', true)
          .order('published_at', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(100);
        
        postsData = result.data;
        postsError = result.error;
      }
      
      // Strategy 3: If published column doesn't exist, try with status field
      if (postsError && (postsError.message?.includes('published') || postsError.message?.includes('column'))) {
        result = await supabase
          .from('blog_posts')
          .select('id, title, slug, excerpt, content, published_at, created_at, seo_title, seo_description, author_id, author_name')
          .eq('subdomain', userSubdomain)
          .eq('status', 'published')
          .order('published_at', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(100);
        
        postsData = result.data;
        postsError = result.error;
      }
      
      // Strategy 4: Last resort - get all posts for this subdomain and filter client-side
      if (postsError) {
        result = await supabase
          .from('blog_posts')
          .select('id, title, slug, excerpt, content, published_at, created_at, seo_title, seo_description, author_id, author_name, published, status')
          .eq('subdomain', userSubdomain)
          .order('published_at', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(100);
        
        if (result.data) {
          // Filter client-side for published posts
          postsData = result.data.filter((post: any) => 
            post.published === true || (post.published === undefined && post.status === 'published')
          );
          postsError = null;
        } else {
          postsError = result.error;
        }
      }

      if (postsError) {
        console.error('Error loading user blog posts:', postsError);
        setError(`Failed to load blog posts: ${postsError.message || 'Unknown error'}`);
        return;
      }

      setPosts(postsData || []);

      // Get author_name from the first post if available
      if (postsData && postsData.length > 0) {
        const firstPost = postsData[0] as any;
        if (firstPost.author_name) {
          setAuthorName(firstPost.author_name);
        }
      }

      // Load blog title and author_name from user_subdomains
      const { data: subdomainData } = await supabase
        .from('user_subdomains')
        .select('blog_title, blog_title_display, author_name, user_id')
        .eq('subdomain', userSubdomain)
        .maybeSingle();

      // Use display version for UI, normalized version for SEO/metadata
      if (subdomainData?.blog_title_display) {
        setBlogTitleDisplay(subdomainData.blog_title_display);
        setBlogTitle(subdomainData.blog_title || subdomainData.blog_title_display);
      } else if (subdomainData?.blog_title) {
        setBlogTitle(subdomainData.blog_title);
        setBlogTitleDisplay(subdomainData.blog_title);
      }
      
      // Get author_name from user_subdomains if available
      if (subdomainData?.author_name && !authorName) {
        setAuthorName(subdomainData.author_name);
      }

      // If we have posts but no author_name yet, try to get it from the posts
      if (!authorName && postsData && postsData.length > 0) {
        // Check all posts for author_name
        for (const post of postsData) {
          const postAny = post as any;
          if (postAny.author_name) {
            setAuthorName(postAny.author_name);
            break;
          }
        }
      }

      // If still no author_name, try to get it from user metadata via a post's author_id
      if (!authorName && postsData && postsData.length > 0 && postsData[0].author_id) {
        // We can't directly query auth.users, but we can check if there's a way to get it
        // For now, we'll use the subdomain as fallback
      }

      // Set user info
      setUserInfo({ name: authorName || userSubdomain });
    } catch (err: any) {
      console.error('Error loading user blog:', err);
      setError(err.message || 'Failed to load blog');
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-900/20 border border-white rounded-none p-6">
          <h1 className="text-2xl font-bold text-white mb-4">Error</h1>
          <p className="text-red-400 mb-4">{error}</p>
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

  // Use styled display title for UI, normalized title for SEO/metadata
  // If using subdomain as fallback, display it in uppercase
  const displayTitle = blogTitleDisplay || blogTitle || authorName || (subdomain ? subdomain.toUpperCase() : null) || 'User';
  const pageTitle = blogTitle 
    ? `${blogTitle} | COLLECTION | THE LOST ARCHIVES`
    : authorName
    ? `${authorName} | COLLECTION | THE LOST ARCHIVES`
    : `${subdomain}'s Collection | THE LOST ARCHIVES`;
  const blogDescription = blogTitle
    ? `Articles and insights from ${blogTitle} in this collection on THE LOST ARCHIVES.`
    : authorName
    ? `Articles and insights from ${authorName} in this collection on THE LOST ARCHIVES.`
    : `Articles and insights from ${subdomain} on THE LOST ARCHIVES.`;

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <link rel="canonical" href={`https://${subdomain}.thelostandunfounds.com`} />
        <meta name="description" content={blogDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={blogDescription} />
        <meta property="og:url" content={`https://${subdomain}.thelostandunfounds.com`} />
        <meta property="og:type" content="website" />
      </Helmet>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-2 tracking-wide">
            {displayTitle}
          </h1>
          <p className="text-white/60 text-lg md:text-xl mb-4">COLLECTION</p>
          <Link
            to="/thelostarchives"
            className="text-white/60 hover:text-white text-sm transition"
          >
            ← Back to THE LOST ARCHIVES
          </Link>
        </div>

        {posts.length === 0 ? (
          <div className="text-white/60 text-lg">
            <p>No posts yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {posts.map((post) => {
              const excerpt = buildPreviewExcerpt(post);
              const imageUrl = extractFirstImage(post.content || post.excerpt || '');
              const expandedIntro = buildExpandedIntro(post);
              const showAdditionalContent = !!expandedIntro;
              const postUrl = subdomain ? `/blog/${subdomain}/${post.slug}` : `/thelostarchives/${post.slug}`;
              
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
                                to={postUrl}
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
