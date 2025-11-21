/**
 * Blog Listing Page - THE LOST ARCHIVES
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from '../components/Loading';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  published_at: string | null;
  created_at: string;
  seo_title: string | null;
  seo_description: string | null;
}

export default function Blog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Set page title and meta tags
    document.title = 'THE LOST ARCHIVES | THE LOST+UNFOUNDS';
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Revealing findings from the frontier and beyond. Intel from the field on development, AI, and building in the age of information.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Revealing findings from the frontier and beyond. Intel from the field on development, AI, and building in the age of information.';
      document.head.appendChild(meta);
    }

    // Update OG tags
    const updateMetaTag = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`);
      if (meta) {
        meta.setAttribute('content', content);
      } else {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        meta.setAttribute('content', content);
        document.head.appendChild(meta);
      }
    };

    updateMetaTag('og:title', 'THE LOST ARCHIVES | THE LOST+UNFOUNDS');
    updateMetaTag('og:description', 'Revealing findings from the frontier and beyond. Intel from the field on development, AI, and building in the age of information.');
    updateMetaTag('og:url', 'https://www.thelostandunfounds.com/thelostarchives');
    updateMetaTag('og:type', 'website');

    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, published_at, created_at, seo_title, seo_description')
        .eq('published', true)
        .order('published_at', { ascending: false })
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error loading blog posts:', fetchError);
        setError('Failed to load blog posts');
        return;
      }

      setPosts(data || []);
    } catch (err) {
      console.error('Error loading blog posts:', err);
      setError('Failed to load blog posts');
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

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-8 tracking-wide">
        THE LOST ARCHIVES
      </h1>

      {error && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-none p-4 mb-6">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {posts.length === 0 ? (
        <div className="text-white/60 text-lg">
          <p>No posts yet. Check back soon for intel from the field.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {posts.map((post) => (
            <article
              key={post.id}
              className="bg-black/50 border border-white/10 rounded-none p-6 hover:border-white/20 transition"
            >
              <Link to={`/thelostarchives/${post.slug}`}>
                <h2 className="text-2xl md:text-3xl font-black text-white mb-3 tracking-wide hover:text-white/80 transition">
                  {post.title}
                </h2>
              </Link>
              
              {post.excerpt && (
                <p className="text-white/70 text-lg mb-4 leading-relaxed">
                  {post.excerpt}
                </p>
              )}
              
              <div className="flex items-center justify-between">
                <time className="text-white/50 text-sm">
                  {formatDate(post.published_at || post.created_at)}
                </time>
                <Link
                  to={`/thelostarchives/${post.slug}`}
                  className="text-white hover:text-white/80 text-sm font-medium transition"
                >
                  Read more →
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
