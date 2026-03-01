/**
 * Build-time Blog Post Pre-renderer
 * Generates static HTML files for blog posts so bots can read them
 * Runs during build, doesn't require serverless functions
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

async function preRenderBlogPosts() {
  console.log('🔄 Starting blog post pre-rendering...');
  const startTime = Date.now();

  // Get Supabase credentials
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('⚠️  Supabase credentials not found. Skipping blog post pre-rendering.');
    return;
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Fetch all published blog posts
    const { data: posts, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('published', true)
      .order('published_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching blog posts:', error);
      return;
    }

    if (!posts || posts.length === 0) {
      console.log('ℹ️  No published blog posts found.');
      return;
    }

    console.log(`✅ Found ${posts.length} published blog posts`);

    // Read the index.html template
    const distPath = join(process.cwd(), 'dist');
    const indexPath = join(distPath, 'index.html');

    let htmlTemplate: string;
    try {
      htmlTemplate = await readFile(indexPath, 'utf-8');
    } catch (err) {
      console.error('❌ Could not read index.html. Make sure build has completed.');
      return;
    }

    // Create blog posts directory
    const blogDir = join(distPath, 'thelostarchives');
    // recursive: true ensures it doesn't fail if it exists
    await mkdir(blogDir, { recursive: true });

    // Pre-render blog posts in parallel
    await Promise.all(posts.map(async (post) => {
      try {
        const slug = post.slug;
        const title = post.seo_title || post.title;

        // Determine path based on subdomain/column
        let folderPath = 'thelostarchives';
        let fullUrlPath = `/thelostarchives/${slug}`;
        let categoryName = 'THE LOST ARCHIVES';

        if (post.subdomain) {
          folderPath = `blog/${post.subdomain}`;
          fullUrlPath = `/blog/${post.subdomain}/${slug}`;
          categoryName = post.subdomain.replace(/-/g, ' ').toUpperCase();
        }

        const fullTitle = `${title} | ${categoryName} | THE LOST+UNFOUNDS`;

        let description = post.seo_description || post.excerpt ||
          post.content.substring(0, 300).replace(/<[^>]*>?/gm, ' ').replace(/\n/g, ' ').trim();

        // Truncate description for SEO (optimal is ~155 chars)
        if (description.length > 155) {
          description = description.substring(0, 152) + '...';
        }

        const ogImage = post.og_image_url || post.featured_image;
        const publishedDate = post.published_at || post.created_at;
        const postUrl = `https://www.thelostandunfounds.com${fullUrlPath}`;

        // Escape HTML for attributes
        const escapeAttr = (str: string) => {
          return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
        };

        // Basic Markdown to HTML converter for pre-rendering
        const simpleMdToHtml = (md: string) => {
          if (!md) return '';
          return md
            .split(/\n\n+/)
            .map(block => {
              block = block.trim();
              if (block.startsWith('# ')) return `<h1 style="font-size: 2.5rem; margin-top: 2rem; margin-bottom: 1rem;">${block.substring(2)}</h1>`;
              if (block.startsWith('## ')) return `<h2 style="font-size: 1.8rem; margin-top: 2rem; margin-bottom: 1rem;">${block.substring(3)}</h2>`;
              if (block.startsWith('### ')) return `<h3 style="font-size: 1.4rem; margin-top: 1.5rem; margin-bottom: 0.8rem;">${block.substring(4)}</h3>`;
              if (block.startsWith('![')) {
                const match = block.match(/!\[(.*?)\]\((.*?)\)/);
                if (match) return `<img src="${match[2]}" alt="${escapeAttr(match[1])}" style="max-width: 100%; height: auto; margin: 2rem 0; border-radius: 4px;" />`;
              }
              return `<p style="margin-bottom: 1.5rem; line-height: 1.8; font-size: 1.1rem;">${block.replace(/\n/g, '<br>')}</p>`;
            })
            .join('\n');
        };

        let html = htmlTemplate;

        // Replace title
        html = html.replace(
          /<title>.*?<\/title>/i,
          `<title>${escapeAttr(fullTitle)}</title>`
        );

        // Add or replace canonical URL
        const canonicalTag = `<link rel="canonical" href="${escapeAttr(postUrl)}" />`;
        if (html.includes('rel="canonical"')) {
          html = html.replace(
            /<link\s+rel=["']canonical["'][^>]*>/i,
            canonicalTag
          );
        } else {
          html = html.replace('</head>', `  ${canonicalTag}\n</head>`);
        }

        // Replace meta description
        html = html.replace(
          /<meta\s+name=["']description["'][^>]*>/i,
          `<meta name="description" content="${escapeAttr(description)}" />`
        );

        // Replace OG tags
        html = html.replace(/<meta\s+property=["']og:title["'][^>]*>/i, `<meta property="og:title" content="${escapeAttr(title)}" />`);
        html = html.replace(/<meta\s+property=["']og:description["'][^>]*>/i, `<meta property="og:description" content="${escapeAttr(description)}" />`);
        html = html.replace(/<meta\s+property=["']og:url["'][^>]*>/i, `<meta property="og:url" content="${escapeAttr(postUrl)}" />`);
        html = html.replace(/<meta\s+property=["']og:type["'][^>]*>/i, `<meta property="og:type" content="article" />`);
        if (ogImage) {
          const ogImgTag = `<meta property="og:image" content="${escapeAttr(ogImage)}" />`;
          if (html.includes('og:image')) {
            html = html.replace(/<meta\s+property=["']og:image["'][^>]*>/i, ogImgTag);
          } else {
            html = html.replace('</head>', `  ${ogImgTag}\n</head>`);
          }
        }

        // Replace Twitter tags
        html = html.replace(/<meta\s+name=["']twitter:title["'][^>]*>/i, `<meta name="twitter:title" content="${escapeAttr(title)}" />`);
        html = html.replace(/<meta\s+name=["']twitter:description["'][^>]*>/i, `<meta name="twitter:description" content="${escapeAttr(description)}" />`);

        // Add BlogPosting structured data
        const structuredData = {
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          "headline": title,
          "description": description,
          "url": postUrl,
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
          ...(ogImage && { "image": ogImage }),
          "articleBody": post.content.replace(/<[^>]*>?/gm, ' ').substring(0, 5000)
        };

        // Breadcrumb Schema
        const breadcrumbSchema = {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "name": "Home",
              "item": "https://www.thelostandunfounds.com"
            },
            {
              "@type": "ListItem",
              "position": 2,
              "name": categoryName,
              "item": `https://www.thelostandunfounds.com/${folderPath}`
            },
            {
              "@type": "ListItem",
              "position": 3,
              "name": title,
              "item": postUrl
            }
          ]
        };

        const allSchema = [structuredData, breadcrumbSchema];

        // Replace structured data
        if (html.includes('application/ld+json')) {
          html = html.replace(
            /<script\s+type=["']application\/ld\+json["']>[\s\S]*?<\/script>/i,
            `<script type="application/ld+json">\n    ${JSON.stringify(allSchema, null, 2)}\n    </script>`
          );
        } else {
          html = html.replace(
            '</head>',
            `  <script type="application/ld+json">\n    ${JSON.stringify(allSchema, null, 2)}\n    </script>\n</head>`
          );
        }

        // Generate Recent Articles for static navigation
        const recentPosts = posts
          .filter(p => p.id !== post.id)
          .slice(0, 3);

        const recentArticlesHtml = recentPosts.length > 0 ? `
          <div style="margin-top: 4rem; padding-top: 3rem; border-top: 1px solid rgba(255,255,255,0.1); text-align: left;">
            <h3 style="font-size: 1.2rem; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(255,255,255,0.5); margin-bottom: 2rem;">Recent Articles</h3>
            <div style="display: grid; grid-template-columns: 1fr; gap: 2rem;">
              ${recentPosts.map(rp => {
          const rpUrl = rp.subdomain ? `/blog/${rp.subdomain}/${rp.slug}` : `/thelostarchives/${rp.slug}`;
          return `
                <a href="${rpUrl}" style="color: white; text-decoration: none; display: block; border-left: 1px solid rgba(255,255,255,0.2); padding-left: 1rem;">
                  <h4 style="font-size: 1.1rem; font-weight: bold; margin-bottom: 0.5rem;">${escapeAttr(rp.title)}</h4>
                  <p style="font-size: 0.9rem; color: rgba(255,255,255,0.5);">${escapeAttr(rp.excerpt || '').substring(0, 100)}...</p>
                </a>
                `;
        }).join('\n')}
            </div>
          </div>
        ` : '';

        // Add pre-rendered blog post content
        const excerptHtml = post.excerpt ? `<p style="font-size: 1.4rem; color: rgba(255, 255, 255, 0.7); margin-bottom: 3rem; line-height: 1.6; font-style: italic; border-left: 2px solid rgba(255,255,255,0.2); padding-left: 1.5rem;">${escapeAttr(post.excerpt)}</p>` : '';
        const featuredImageHtml = ogImage ? `<img src="${escapeAttr(ogImage)}" alt="${escapeAttr(title)}" style="width: 100%; height: auto; margin-bottom: 3rem; border-radius: 4px;" />` : '';

        const preRenderContent = `
          <article id="pre-render-blog" style="background: black; color: white; min-height: 100vh; padding: 4rem 2rem; max-width: 800px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;">
            <header style="margin-bottom: 4rem;">
              <span style="text-transform: uppercase; letter-spacing: 0.2em; font-size: 0.8rem; color: rgba(255,255,255,0.5); font-weight: bold;">${categoryName}</span>
              <h1 style="font-size: 3.5rem; margin-top: 1rem; margin-bottom: 1.5rem; font-weight: 800; line-height: 1.1; letter-spacing: -0.02em;">${escapeAttr(post.title)}</h1>
              <div style="color: rgba(255, 255, 255, 0.5); font-size: 0.9rem; font-weight: 500; display: flex; gap: 1rem; align-items: center;">
                <span>BY THE LOST+UNFOUNDS</span>
                <span style="width: 4px; height: 4px; background: rgba(255,255,255,0.2); rounded-full;"></span>
                <time datetime="${publishedDate}">${new Date(publishedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
              </div>
            </header>

            ${featuredImageHtml}
            ${excerptHtml}

            <div class="content" style="color: rgba(255, 255, 255, 0.9);">
              ${simpleMdToHtml(post.content)}
            </div>

            <footer style="margin-top: 6rem; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 3rem; text-align: center;">
              ${recentArticlesHtml}
              <p style="margin-top: 4rem; margin-bottom: 2rem; color: rgba(255, 255, 255, 0.8); font-size: 1.1rem;">
                Explore more from <a href="https://www.thelostandunfounds.com" style="color: white; text-decoration: underline; font-weight: bold;">THE LOST+UNFOUNDS</a>
              </p>
              <a href="${postUrl}" style="display: inline-block; background: white; color: black; padding: 1rem 2rem; text-decoration: none; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.9rem;">Back to Full Experience</a>
            </footer>
          </article>
        `;

        // Replace pre-render content
        if (html.includes('id="pre-render"')) {
          html = html.replace(
            /<div id="pre-render"[^>]*>[\s\S]*?<\/div>/i,
            `<div id="pre-render">${preRenderContent}</div>`
          );
        } else {
          html = html.replace(
            '<div id="root">',
            `<div id="root">${preRenderContent}`
          );
        }

        // Write the pre-rendered HTML file
        const finalDir = join(distPath, folderPath);
        await mkdir(finalDir, { recursive: true });
        const filePath = join(finalDir, `${slug}.html`);
        await writeFile(filePath, html, 'utf-8');
      } catch (postErr) {
        console.error(`❌ Error rendering post ${post.slug}:`, postErr);
      }
    }));

    const duration = (Date.now() - startTime) / 1000;
    console.log(`✅ Successfully pre-rendered ${posts.length} blog posts in ${duration.toFixed(2)}s!`);
  } catch (err) {
    console.error('❌ Error during pre-rendering:', err);
    process.exit(1);
  }
}

preRenderBlogPosts().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

export default preRenderBlogPosts;
