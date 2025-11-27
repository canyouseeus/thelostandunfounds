/**
 * Blog Post Pre-rendering API
 * Fetches blog post data for server-side rendering
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const { slug } = req.query;

  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({ error: 'Slug is required' });
  }

  // Get Supabase credentials from environment
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Supabase credentials not configured' });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Fetch blog post
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if published
    const isPublished = data.published === true || 
                       (data.published === undefined && data.status === 'published');
    
    if (!isPublished) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Return blog post data
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.json({
      title: data.seo_title || data.title,
      description: data.seo_description || data.excerpt || 
                   data.content.substring(0, 160).replace(/\n/g, ' ').trim(),
      content: data.content,
      excerpt: data.excerpt,
      publishedAt: data.published_at || data.created_at,
      ogImage: data.og_image_url || data.featured_image,
      keywords: data.seo_keywords,
      slug: data.slug,
    });
  } catch (err: any) {
    console.error('Error fetching blog post:', err);
    return res.status(500).json({ error: 'Failed to fetch blog post' });
  }
}
