/**
 * Build-time Gallery Pre-renderer
 * Generates static HTML for public photo galleries
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

async function preRenderGalleries() {
  console.log('🔄 Starting gallery pre-rendering...');
  const startTime = Date.now();

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('⚠️  Supabase credentials not found. Skipping gallery pre-rendering.');
    return;
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Fetch public photo libraries
    const { data: libraries, error: libError } = await supabase
      .from('photo_libraries')
      .select('*')
      .eq('is_private', false);

    if (libError) {
      console.error('❌ Error fetching galleries:', libError);
      return;
    }

    if (!libraries || libraries.length === 0) {
      console.log('ℹ️  No public galleries found.');
      return;
    }

    const distPath = join(process.cwd(), 'dist');
    const indexPath = join(distPath, 'index.html');
    let htmlTemplate = await readFile(indexPath, 'utf-8');

    for (const lib of libraries) {
      const { data: photos, error: photoError } = await supabase
        .from('photos')
        .select('*')
        .eq('library_id', lib.id)
        .order('created_at', { ascending: false });

      if (photoError) continue;

      const slug = lib.slug;
      const title = `${lib.name} | The Gallery | THE LOST+UNFOUNDS`;
      const description = lib.description || `Examine the findings in the ${lib.name} collection.`;
      const galleryUrl = `https://www.thelostandunfounds.com/gallery/${slug}`;

      let html = htmlTemplate;

      // SEO Tags
      html = html.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`);
      html = html.replace(/<meta\s+name=["']description["'][^>]*>/i, `<meta name="description" content="${description}" />`);
      html = html.replace(/<link\s+rel=["']canonical["'][^>]*>/i, `<link rel="canonical" href="${galleryUrl}" />`);

      // OG Tags
      html = html.replace(/<meta\s+property=["']og:title["'][^>]*>/i, `<meta property="og:title" content="${title}" />`);
      html = html.replace(/<meta\s+property=["']og:description["'][^>]*>/i, `<meta property="og:description" content="${description}" />`);
      html = html.replace(/<meta\s+property=["']og:url["'][^>]*>/i, `<meta property="og:url" content="${galleryUrl}" />`);

      // Featured Image (first photo)
      if (photos && photos.length > 0) {
        const featImg = `https://lh3.googleusercontent.com/d/${photos[0].google_drive_file_id}=s1200`;
        html = html.replace(/<meta\s+property=["']og:image["'][^>]*>/i, `<meta property="og:image" content="${featImg}" />`);
      }

      // Internal Linking: "More Collections"
      const otherGalleries = libraries
        .filter(l => l.id !== lib.id)
        .slice(0, 4);

      const otherGalleriesHtml = otherGalleries.length > 0 ? `
              <div style="margin-top: 6rem; padding-top: 4rem; border-top: 1px solid rgba(255,255,255,0.1); text-align: left; max-width: 1000px; margin-left: auto; margin-right: auto;">
                <h3 style="font-size: 1rem; text-transform: uppercase; letter-spacing: 0.25em; color: rgba(255,255,255,0.3); margin-bottom: 3rem; font-weight: 900;">Other Collections</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 2rem;">
                  ${otherGalleries.map((og: any) => `
                    <a href="/gallery/${og.slug}" style="color: white; text-decoration: none; display: block; group;">
                      <h4 style="font-size: 0.9rem; font-weight: bold; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.1em; border-left: 1px solid rgba(255,255,255,0.2); padding-left: 1rem;">${og.name}</h4>
                    </a>
                  `).join('\n')}
                </div>
              </div>
            ` : '';

      // Schemas
      const breadcrumbSchema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.thelostandunfounds.com" },
          { "@type": "ListItem", "position": 2, "name": "The Gallery", "item": "https://www.thelostandunfounds.com/gallery" },
          { "@type": "ListItem", "position": 3, "name": lib.name, "item": galleryUrl }
        ]
      };

      const imageSchemas = photos?.map(p => ({
        "@context": "https://schema.org",
        "@type": "ImageObject",
        "contentUrl": `https://lh3.googleusercontent.com/d/${p.google_drive_file_id}=s0`,
        "name": p.title,
        "caption": p.description || p.title,
        "author": "THE LOST+UNFOUNDS"
      })) || [];

      const allSchema = [breadcrumbSchema, ...imageSchemas];
      html = html.replace('</head>', `  <script type="application/ld+json">\n    ${JSON.stringify(allSchema)}\n    </script>\n</head>`);

      // Pre-render content
      const photosHtml = photos?.map(p => `
        <div style="margin-bottom: 8rem; text-align: center;">
          <img src="https://lh3.googleusercontent.com/d/${p.google_drive_file_id}=s1200" alt="${p.title}" style="max-width: 100%; height: auto; border-radius: 4px; box-shadow: 0 30px 60px rgba(0,0,0,0.8);" />
          <div style="margin-top: 2rem; max-width: 600px; margin-left: auto; margin-right: auto;">
            <h3 style="color: white; font-size: 1.2rem; letter-spacing: 0.1em; font-weight: 900; text-transform: uppercase; margin-bottom: 0.5rem;">${p.title}</h3>
            ${p.description ? `<p style="color: rgba(255,255,255,0.5); font-size: 0.9rem; margin-bottom: 1rem;">${p.description}</p>` : ''}
            <p style="color: rgba(255,255,255,0.3); font-size: 0.7rem; font-family: 'JetBrains Mono', monospace; font-weight: 500; text-transform: uppercase; letter-spacing: 0.1em;">${p.metadata?.camera_model || 'Unknown Capture'} | ${p.metadata?.iso ? 'ISO ' + p.metadata.iso : ''}</p>
          </div>
        </div>
      `).join('') || '';

      const preRenderContent = `
        <div id="pre-render-gallery" style="background: black; color: white; min-height: 100vh; padding: 10rem 2rem; font-family: -apple-system, system-ui, sans-serif;">
          <header style="max-width: 1000px; margin: 0 auto 10rem; text-align: left;">
            <p style="text-transform: uppercase; letter-spacing: 0.4em; font-size: 0.7rem; color: rgba(255,255,255,0.3); font-weight: 900; margin-bottom: 2rem;">EXHIBIT COLLECTION</p>
            <h1 style="font-size: clamp(3rem, 10vw, 8rem); font-weight: 900; text-transform: uppercase; letter-spacing: -0.04em; line-height: 0.9; margin-bottom: 3rem;">${lib.name}</h1>
            <p style="font-size: 1.5rem; color: rgba(255,255,255,0.5); max-width: 700px; line-height: 1.5; font-weight: 400; letter-spacing: -0.01em;">${description}</p>
          </header>
          
          <div style="max-width: 1200px; margin: 0 auto;">
            ${photosHtml}
          </div>

          <footer style="margin-top: 10rem; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 6rem; text-align: center;">
            <a href="${galleryUrl}" style="background: white; color: black; padding: 1.5rem 4rem; text-decoration: none; font-weight: 900; text-transform: uppercase; letter-spacing: 0.25em; font-size: 0.8rem; border-radius: 2px;">Begin Immersive Sequence</a>
            ${otherGalleriesHtml}
          </footer>
        </div>
      `;

      if (html.includes('id="pre-render"')) {
        html = html.replace(/<div id="pre-render"[^>]*>[\s\S]*?<\/div>/i, `<div id="pre-render">${preRenderContent}</div>`);
      } else {
        html = html.replace('<div id="root">', `<div id="root">\n    <div id="pre-render">${preRenderContent}</div>`);
      }

      const galleryDir = join(distPath, 'gallery', slug);
      await mkdir(galleryDir, { recursive: true });
      await writeFile(join(galleryDir, 'index.html'), html, 'utf-8');
      console.log(`  ✅ Pre-rendered gallery: /${slug}`);
    }

    console.log(`✅ Pre-rendered ${libraries.length} gallery collections.`);
  } catch (err) {
    console.error('❌ Error pre-rendering galleries:', err);
  }
}

preRenderGalleries();
