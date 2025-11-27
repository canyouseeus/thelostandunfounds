/**
 * Blog Post HTML Renderer for Bots
 * Returns pre-rendered HTML with blog post content
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readFileSync } from 'fs';
import { join } from 'path';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const { slug } = req.query;

  if (!slug || typeof slug !== 'string') {
    return res.status(400).send('Slug is required');
  }

  // Detect if this is a bot request
  const userAgent = req.headers['user-agent'] || '';
  const acceptHeader = req.headers.accept || '';
  const isBot = /bot|crawler|spider|crawling|NotebookLM|Googlebot|Bingbot|Slurp|DuckDuckBot|Baiduspider|YandexBot|Sogou|Exabot|facebot|ia_archiver/i.test(userAgent);
  
  // For non-bot requests, serve normal index.html and let React handle routing
  if (!isBot && acceptHeader.includes('text/html')) {
    try {
      const html = readFileSync(join(process.cwd(), 'dist', 'index.html'), 'utf-8');
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      return res.send(html);
    } catch (err) {
      // If dist doesn't exist, continue to bot rendering (will serve fallback HTML)
    }
  }
  
  // For bots or if index.html not available, fetch and serve pre-rendered blog content

  // Get Supabase credentials
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).send('Configuration error');
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
      return res.status(404).send('Post not found');
    }

    // Check if published
    const isPublished = data.published === true || 
                       (data.published === undefined && data.status === 'published');
    
    if (!isPublished) {
      return res.status(404).send('Post not found');
    }

    // Read index.html template
    let html: string;
    try {
      html = readFileSync(join(process.cwd(), 'dist', 'index.html'), 'utf-8');
    } catch {
      // Fallback if dist doesn't exist (development)
      html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${data.seo_title || data.title}</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;
    }

    const title = `${data.seo_title || data.title} | THE LOST ARCHIVES | THE LOST+UNFOUNDS`;
    const description = data.seo_description || data.excerpt || 
                       data.content.substring(0, 160).replace(/\n/g, ' ').trim();
    const ogImage = data.og_image_url || data.featured_image;
    const publishedDate = data.published_at || data.created_at;
    const url = `https://www.thelostandunfounds.com/thelostarchives/${slug}`;

    // Escape HTML
    const escapeHtml = (str: string) => {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    // Replace title
    html = html.replace(
      /<title>.*?<\/title>/i,
      `<title>${escapeHtml(title)}</title>`
    );

    // Replace meta description
    html = html.replace(
      /<meta\s+name=["']description["'][^>]*>/i,
      `<meta name="description" content="${escapeHtml(description)}" />`
    );

    // Replace OG tags
    html = html.replace(
      /<meta\s+property=["']og:title["'][^>]*>/i,
      `<meta property="og:title" content="${escapeHtml(data.seo_title || data.title)}" />`
    );
    html = html.replace(
      /<meta\s+property=["']og:description["'][^>]*>/i,
      `<meta property="og:description" content="${escapeHtml(description)}" />`
    );
    html = html.replace(
      /<meta\s+property=["']og:url["'][^>]*>/i,
      `<meta property="og:url" content="${escapeHtml(url)}" />`
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
      `<meta name="twitter:title" content="${escapeHtml(data.seo_title || data.title)}" />`
    );
    html = html.replace(
      /<meta\s+name=["']twitter:description["'][^>]*>/i,
      `<meta name="twitter:description" content="${escapeHtml(description)}" />`
    );

    // Add keywords if available
    if (data.seo_keywords) {
      const keywordsMeta = `<meta name="keywords" content="${escapeHtml(data.seo_keywords)}" />`;
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
      "headline": data.seo_title || data.title,
      "description": description,
      "url": url,
      "datePublished": publishedDate,
      "dateModified": data.created_at,
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
        "@id": url
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
    const contentPreview = data.content.substring(0, 1000).replace(/\n\n+/g, ' ').replace(/\n/g, ' ');
    const preRenderContent = `
      <div id="pre-render-blog" style="background: black; color: white; min-height: 100vh; padding: 2rem; max-width: 800px; margin: 0 auto;">
        <h1 style="font-size: 2.5rem; margin-bottom: 1rem; font-weight: normal; line-height: 1.2;">${escapeHtml(data.title)}</h1>
        ${data.excerpt ? `<p style="font-size: 1.25rem; color: rgba(255, 255, 255, 0.8); margin-bottom: 2rem; line-height: 1.6;">${escapeHtml(data.excerpt)}</p>` : ''}
        <div style="color: rgba(255, 255, 255, 0.9); line-height: 1.8; margin-bottom: 2rem;">
          ${escapeHtml(contentPreview)}${data.content.length > 1000 ? '...' : ''}
        </div>
        <p style="margin-top: 2rem; color: rgba(255, 255, 255, 0.6); font-size: 0.875rem;">
          Published: ${new Date(publishedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        <p style="margin-top: 1rem; color: rgba(255, 255, 255, 0.8);">
          <a href="${url}" style="color: rgba(255, 255, 255, 0.9); text-decoration: underline;">Read full article →</a>
        </p>
      </div>
    `;

    // Replace or add pre-render content
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

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.send(html);
  } catch (err: any) {
    console.error('Error rendering blog post:', err);
    return res.status(500).send('Error rendering blog post');
  }
}
