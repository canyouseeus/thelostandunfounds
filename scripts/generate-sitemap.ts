/**
 * Sitemap Generator
 * Generates sitemap.xml for all published blog posts
 * Runs during build to help search engines discover content
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function generateSitemap() {
  console.log('🗺️  Generating sitemap.xml...');

  // Get Supabase credentials
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('⚠️  Supabase credentials not found. Skipping sitemap generation.');
    return;
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Fetch all published blog posts
    const { data: posts, error } = await supabase
      .from('blog_posts')
      .select('slug, published_at, updated_at, created_at')
      .eq('published', true)
      .order('published_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching blog posts:', error);
      return;
    }

    const baseUrl = 'https://www.thelostandunfounds.com';
    const currentDate = new Date().toISOString();

    // Start building sitemap XML
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  
  <!-- Homepage -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- Blog listing page -->
  <url>
    <loc>${baseUrl}/thelostarchives</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  
  <!-- Important pages -->
  <url>
    <loc>${baseUrl}/about</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/contact</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;

    // Add blog posts
    if (posts && posts.length > 0) {
      console.log(`✅ Found ${posts.length} published blog posts`);
      
      for (const post of posts) {
        const postUrl = `${baseUrl}/thelostarchives/${post.slug}`;
        const lastmod = post.updated_at || post.published_at || post.created_at || currentDate;
        
        sitemap += `
  
  <!-- Blog post: ${post.slug} -->
  <url>
    <loc>${postUrl}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
      }
    } else {
      console.log('ℹ️  No published blog posts found.');
    }

    // Close sitemap
    sitemap += `
</urlset>`;

    // Write sitemap to dist directory (output directory)
    const distPath = join(process.cwd(), 'dist');
    const sitemapPath = join(distPath, 'sitemap.xml');
    
    writeFileSync(sitemapPath, sitemap, 'utf-8');
    const totalUrls = (posts?.length || 0) + 4; // Homepage + blog listing + about + contact + blog posts
    console.log(`✅ Sitemap generated successfully: ${sitemapPath}`);
    console.log(`   Total URLs: ${totalUrls}`);
  } catch (err) {
    console.error('❌ Error generating sitemap:', err);
    process.exit(1);
  }
}

// Run the sitemap generation
generateSitemap().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

export default generateSitemap;
