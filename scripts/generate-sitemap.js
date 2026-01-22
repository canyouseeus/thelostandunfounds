import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Load environment variables
dotenv.config({ path: path.resolve(projectRoot, '.env.local') });
dotenv.config({ path: path.resolve(projectRoot, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const siteUrl = 'https://www.thelostandunfounds.com';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function generateSitemap() {
    console.log('Generating sitemap...');

    // 1. Static Routes
    const staticRoutes = [
        '',
        '/about',
        '/blog',
        '/contact',
        '/shop',
        '/tools',
        '/book-club',
        '/gearheads',
        '/borderlands',
        '/science',
        '/newtheory',
        '/thelostarchives',
        '/gallery'
    ];

    // 2. Fetch Blog Posts
    const { data: posts, error } = await supabase
        .from('blog_posts')
        .select('slug, updated_at, created_at, subdomain')
        .eq('published', true);

    if (error) {
        console.error('Error fetching posts:', error);
    }

    // 3. Fetch Public Galleries
    // We want galleries that are NOT private, or we include all? 
    // Generally only public ones should be indexed.
    // Based on Gallery.tsx, there isn't a strict 'published' flag, just 'is_private'.
    // Let's index public ones.
    const { data: galleries, error: galleryError } = await supabase
        .from('photo_libraries')
        .select('slug, created_at')
        .eq('is_private', false);

    if (galleryError) {
        console.error('Error fetching galleries:', galleryError);
    }

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    // Add Static Routes
    staticRoutes.forEach(route => {
        sitemap += `
  <url>
    <loc>${siteUrl}${route}</loc>
    <changefreq>weekly</changefreq>
    <priority>${route === '' ? '1.0' : '0.8'}</priority>
  </url>`;
    });

    // Add Blog Posts
    if (posts) {
        posts.forEach(post => {
            let url = `${siteUrl}/thelostarchives/${post.slug}`;
            if (post.subdomain) {
                url = `${siteUrl}/blog/${post.subdomain}/${post.slug}`;
            }

            const lastMod = post.updated_at || post.created_at;
            const date = new Date(lastMod).toISOString();

            sitemap += `
  <url>
    <loc>${url}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
        });
    }

    // Add Galleries
    if (galleries) {
        galleries.forEach(gallery => {
            const url = `${siteUrl}/gallery/${gallery.slug}`;
            const date = new Date(gallery.created_at).toISOString();

            sitemap += `
  <url>
    <loc>${url}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
        });
    }

    sitemap += `
</urlset>`;

    const outputPath = path.resolve(projectRoot, 'public', 'sitemap.xml');
    fs.writeFileSync(outputPath, sitemap);
    const postCount = posts ? posts.length : 0;
    const galleryCount = galleries ? galleries.length : 0;
    console.log(`Sitemap generated at ${outputPath} with ${staticRoutes.length + postCount + galleryCount} URLs.`);
}

generateSitemap();
