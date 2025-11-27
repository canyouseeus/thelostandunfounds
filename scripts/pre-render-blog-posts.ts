/**
 * Build-time Blog Post Pre-renderer
 * Generates static HTML files for blog posts so bots can read them
 * Runs during build, doesn't require serverless functions
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

async function preRenderBlogPosts() {
  console.log('🔄 Starting blog post pre-rendering...');

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
      htmlTemplate = readFileSync(indexPath, 'utf-8');
    } catch (err) {
      console.error('❌ Could not read index.html. Make sure build has completed.');
      return;
    }

    // Create blog posts directory
    const blogDir = join(distPath, 'thelostarchives');
    mkdirSync(blogDir, { recursive: true });

    // Pre-render each blog post
    for (const post of posts) {
      const slug = post.slug;
      const title = post.seo_title || post.title;
      const fullTitle = `${title} | THE LOST ARCHIVES | THE LOST+UNFOUNDS`;
      const description = post.seo_description || post.excerpt || 
                         post.content.substring(0, 160).replace(/\n/g, ' ').trim();
      const ogImage = post.og_image_url || post.featured_image;
      const publishedDate = post.published_at || post.created_at;
      const postUrl = `https://www.thelostandunfounds.com/thelostarchives/${slug}`;

      // Escape HTML
      const escapeHtml = (str: string) => {
        return str
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      };

      let html = htmlTemplate;

      // Replace title
      html = html.replace(
        /<title>.*?<\/title>/i,
        `<title>${escapeHtml(fullTitle)}</title>`
      );

      // Add or replace canonical URL
      const canonicalTag = `<link rel="canonical" href="${escapeHtml(postUrl)}" />`;
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
        `<meta name="description" content="${escapeHtml(description)}" />`
      );

      // Replace OG tags
      html = html.replace(
        /<meta\s+property=["']og:title["'][^>]*>/i,
        `<meta property="og:title" content="${escapeHtml(title)}" />`
      );
      html = html.replace(
        /<meta\s+property=["']og:description["'][^>]*>/i,
        `<meta property="og:description" content="${escapeHtml(description)}" />`
      );
      html = html.replace(
        /<meta\s+property=["']og:url["'][^>]*>/i,
        `<meta property="og:url" content="${escapeHtml(postUrl)}" />`
      );
      html = html.replace(
        /<meta\s+property=["']og:type["'][^>]*>/i,
        `<meta property="og:type" content="article" />`
      );
      if (ogImage) {
        html = html.replace(
          /<meta\s+property=["']og:image["'][^>]*>/i,
          `<meta property="og:image" content="${escapeHtml(ogImage)}" />`
        );
      }

      // Replace Twitter tags
      html = html.replace(
        /<meta\s+name=["']twitter:title["'][^>]*>/i,
        `<meta name="twitter:title" content="${escapeHtml(title)}" />`
      );
      html = html.replace(
        /<meta\s+name=["']twitter:description["'][^>]*>/i,
        `<meta name="twitter:description" content="${escapeHtml(description)}" />`
      );

      // Add keywords if available
      if (post.seo_keywords) {
        const keywordsMeta = `<meta name="keywords" content="${escapeHtml(post.seo_keywords)}" />`;
        if (!html.includes('name="keywords"')) {
          html = html.replace('</head>', `  ${keywordsMeta}\n</head>`);
        } else {
          html = html.replace(
            /<meta\s+name=["']keywords["'][^>]*>/i,
            keywordsMeta
          );
        }
      }

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
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": postUrl
        }
      };

      // Replace structured data
      if (html.includes('application/ld+json')) {
        html = html.replace(
          /<script\s+type=["']application\/ld\+json["']>[\s\S]*?<\/script>/i,
          `<script type="application/ld+json">\n    ${JSON.stringify(structuredData, null, 2)}\n    </script>`
        );
      } else {
        html = html.replace(
          '</head>',
          `  <script type="application/ld+json">\n    ${JSON.stringify(structuredData, null, 2)}\n    </script>\n</head>`
        );
      }

      // Add pre-rendered blog post content
      const contentPreview = post.content.substring(0, 2000).replace(/\n\n+/g, ' ').replace(/\n/g, ' ');
      const excerptHtml = post.excerpt ? `<p style="font-size: 1.25rem; color: rgba(255, 255, 255, 0.8); margin-bottom: 2rem; line-height: 1.6;">${escapeHtml(post.excerpt)}</p>` : '';
      
      const preRenderContent = `
        <div id="pre-render-blog" style="background: black; color: white; min-height: 100vh; padding: 2rem; max-width: 900px; margin: 0 auto;">
          <h1 style="font-size: 2.5rem; margin-bottom: 1rem; font-weight: normal; line-height: 1.2;">${escapeHtml(post.title)}</h1>
          ${excerptHtml}
          <div style="color: rgba(255, 255, 255, 0.9); line-height: 1.8; margin-bottom: 2rem; font-size: 1.1rem;">
            ${escapeHtml(contentPreview)}${post.content.length > 2000 ? '...' : ''}
          </div>
          <p style="margin-top: 2rem; color: rgba(255, 255, 255, 0.6); font-size: 0.875rem;">
            Published: ${new Date(publishedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <p style="margin-top: 1rem; color: rgba(255, 255, 255, 0.8);">
            <a href="${postUrl}" style="color: rgba(255, 255, 255, 0.9); text-decoration: underline;">Read full article →</a>
          </p>
        </div>
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
      const filePath = join(blogDir, `${slug}.html`);
      writeFileSync(filePath, html, 'utf-8');
      console.log(`  ✅ Pre-rendered: ${slug}`);
    }

    console.log(`✅ Successfully pre-rendered ${posts.length} blog posts!`);
  } catch (err) {
    console.error('❌ Error during pre-rendering:', err);
    process.exit(1);
  }
}

// Run the pre-rendering (this script is executed directly)
preRenderBlogPosts().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

export default preRenderBlogPosts;
