/**
 * Vercel Edge Middleware
 * Pre-renders blog posts for bots by injecting content into HTML
 */

export const config = {
  matcher: '/thelostarchives/:slug*',
};

export default async function middleware(request: Request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Extract slug from path
  const slugMatch = pathname.match(/^\/thelostarchives\/([^\/]+)$/);
  if (!slugMatch) {
    // Not a blog post URL, continue normally
    return;
  }

  const slug = slugMatch[1];

  // Detect bot requests
  const userAgent = request.headers.get('user-agent') || '';
  const acceptHeader = request.headers.get('accept') || '';
  
  const isBot = /bot|crawler|spider|crawling|NotebookLM|Googlebot|Bingbot|Slurp|DuckDuckBot|Baiduspider|YandexBot|Sogou|Exabot|facebot|ia_archiver|facebookexternalhit|Twitterbot|LinkedInBot/i.test(userAgent);
  
  // If not a bot, let the request proceed normally (React will handle it)
  if (!isBot) {
    return;
  }

  // Bot detected - fetch blog post and inject content
  try {
    // Get Supabase credentials from environment
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('Supabase credentials not configured');
      return;
    }

    // Fetch blog post from Supabase
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/blog_posts?slug=eq.${encodeURIComponent(slug)}&select=*`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch blog post:', response.status);
      return;
    }

    const data = await response.json();
    const post = Array.isArray(data) ? data[0] : data;

    if (!post) {
      return;
    }

    // Check if published
    const isPublished = post.published === true || 
                       (post.published === undefined && post.status === 'published');
    
    if (!isPublished) {
      return;
    }

    // Fetch the HTML response from origin
    const htmlResponse = await fetch(url.origin + '/');
    let html = await htmlResponse.text();

    // Prepare blog post data
    const title = post.seo_title || post.title;
    const fullTitle = `${title} | THE LOST ARCHIVES | THE LOST+UNFOUNDS`;
    const description = post.seo_description || post.excerpt || 
                       post.content.substring(0, 160).replace(/\n/g, ' ').trim();
    const ogImage = post.og_image_url || post.featured_image;
    const publishedDate = post.published_at || post.created_at;
    const postUrl = url.toString();

    // Escape HTML function
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
      `<title>${escapeHtml(fullTitle)}</title>`
    );

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

    // Return modified HTML response
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Middleware error:', error);
    // On error, let request proceed normally
    return;
  }
}
