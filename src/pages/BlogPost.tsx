/**
 * Blog Post Detail Page
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from '../components/Loading';
import BlogAnalysis from '../components/BlogAnalysis';

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
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      loadPost(slug);
    }
  }, [slug]);

  // Meta tags are now handled by Helmet component below

  const loadPost = async (postSlug: string) => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', postSlug)
        .single();

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
    } catch (err) {
      console.error('Error loading blog post:', err);
      setError('Failed to load post');
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

  const formatContent = (content: string) => {
    // Split by double newlines to create paragraphs
    const paragraphs = content.split(/\n\n+/);
    const elements: JSX.Element[] = [];
    
    paragraphs.forEach((para, index) => {
      const trimmed = para.trim();
      if (trimmed === '') return;
      
      // Handle section separator (⸻)
      if (trimmed === '⸻' || trimmed.match(/^⸻\s*$/)) {
        elements.push(
          <hr key={`separator-${index}`} className="my-8 border-white/10" />
        );
        return;
      }
      
      // Check if it's a section heading (short line, likely a heading)
      // Headings are usually short, on their own line, and don't end with punctuation
      const isLikelyHeading = trimmed.length < 100 && 
                              !trimmed.match(/[.!?]$/) && 
                              trimmed.split(' ').length < 10 &&
                              (index === 0 || paragraphs[index - 1]?.trim() === '⸻' || paragraphs[index - 1]?.trim() === '');
      
      if (isLikelyHeading) {
        elements.push(
          <h2 key={`heading-${index}`} className="text-2xl font-bold text-white mt-12 mb-6 text-left first:mt-0">
            {trimmed}
          </h2>
        );
        return;
      }
      
      // Check if paragraph starts with a number followed by a period (numbered list)
      const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
      if (numberedMatch) {
        elements.push(
          <p key={index} className="mb-6 text-white/90 text-lg leading-relaxed text-left">
            <span className="font-bold">{numberedMatch[1]}.</span> {numberedMatch[2]}
          </p>
        );
        return;
      }
      
      // Check for bullet points (lines starting with • or -)
      if (trimmed.match(/^[•\-\*]\s+/)) {
        const bulletText = trimmed.replace(/^[•\-\*]\s+/, '');
        elements.push(
          <p key={index} className="mb-4 text-white/90 text-lg leading-relaxed text-left pl-4">
            <span className="text-white/60 mr-2">•</span>
            {bulletText}
          </p>
        );
        return;
      }
      
      // Regular paragraph
      elements.push(
        <p key={index} className="mb-6 text-white/90 text-lg leading-relaxed text-left">
          {trimmed}
        </p>
      );
    });
    
    return elements;
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
        <div className="bg-red-900/20 border border-red-500/50 rounded-none p-6">
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
      <Link
        to="/thelostarchives"
        className="text-white/60 hover:text-white text-sm mb-6 inline-block transition"
      >
        ← Back to THE LOST ARCHIVES
      </Link>

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
        </header>

        <div className="prose prose-invert max-w-none text-left">
          {formatContent(post.content)}
        </div>

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
