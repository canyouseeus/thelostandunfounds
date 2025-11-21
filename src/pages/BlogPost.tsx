/**
 * Blog Post Detail Page
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from '../components/Loading';

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

  useEffect(() => {
    if (post) {
      // Set page title
      const title = post.seo_title || post.title;
      document.title = `${title} | THE LOST ARCHIVES | THE LOST+UNFOUNDS`;

      // Set meta description
      const description = post.seo_description || post.excerpt || 
        post.content.substring(0, 160).replace(/\n/g, ' ').trim();
      
      // Use og_image_url or fallback to featured_image
      const ogImage = post.og_image_url || post.featured_image;
      
      const updateMetaTag = (name: string, content: string, isProperty = false) => {
        const selector = isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`;
        let meta = document.querySelector(selector);
        if (meta) {
          meta.setAttribute('content', content);
        } else {
          meta = document.createElement('meta');
          if (isProperty) {
            meta.setAttribute('property', name);
          } else {
            meta.setAttribute('name', name);
          }
          meta.setAttribute('content', content);
          document.head.appendChild(meta);
        }
      };

      updateMetaTag('description', description);
      updateMetaTag('og:title', title, true);
      updateMetaTag('og:description', description, true);
      updateMetaTag('og:url', `https://www.thelostandunfounds.com/thelostarchives/${post.slug}`, true);
      updateMetaTag('og:type', 'article', true);
      
      if (ogImage) {
        updateMetaTag('og:image', ogImage, true);
      }

      if (post.seo_keywords) {
        updateMetaTag('keywords', post.seo_keywords);
      }

      // Twitter card
      updateMetaTag('twitter:card', 'summary', true);
      updateMetaTag('twitter:title', title, true);
      updateMetaTag('twitter:description', description, true);
      if (ogImage) {
        updateMetaTag('twitter:image', ogImage, true);
      }
    }
  }, [post]);

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
    return paragraphs.map((para, index) => {
      const trimmed = para.trim();
      if (trimmed === '') return null;
      
      // Check if paragraph starts with a number followed by a period (numbered list)
      const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
      if (numberedMatch) {
        return (
          <p key={index} className="mb-6 text-white/90 text-lg leading-relaxed text-justify">
            <span className="font-bold">{numberedMatch[1]}.</span> {numberedMatch[2]}
          </p>
        );
      }
      
      return (
        <p key={index} className="mb-6 text-white/90 text-lg leading-relaxed text-justify">
          {trimmed}
        </p>
      );
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link
        to="/thelostarchives"
        className="text-white/60 hover:text-white text-sm mb-6 inline-block transition"
      >
        ← Back to THE LOST ARCHIVES
      </Link>

      <article>
        <header className="mb-8">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-4 tracking-wide">
            {post.title}
          </h1>
          
          {post.published_at && (
            <time className="text-white/50 text-sm">
              {formatDate(post.published_at)}
            </time>
          )}
        </header>

        <div className="prose prose-invert max-w-none">
          {formatContent(post.content)}
        </div>
      </article>
    </div>
  );
}
