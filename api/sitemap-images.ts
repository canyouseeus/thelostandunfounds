/**
 * Image sitemap. `/image-sitemap.xml` rewrites here (see vercel.json).
 *
 * NEVER let a build step write a static dist/image-sitemap.xml. Vercel serves
 * static files before it applies rewrites, so such a file silently shadows this
 * route and nothing anywhere reports an error. That is exactly what happened:
 * scripts/generate-image-sitemap.ts emitted lh3.googleusercontent.com URLs —
 * Google Drive's CDN, a domain we do not own — and shadowed this route for
 * months. An image sitemap only counts images on our own property, so all 1,000
 * photos it advertised were attributed to nobody and the gallery stayed absent
 * from Google Images. The script has been deleted; do not reintroduce it.
 *
 * Images must be served through /api/gallery/stream on this domain, which
 * robots.txt allows precisely so Googlebot can index published photos.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SITE_URL = 'https://www.thelostandunfounds.com';

// Google allows up to 1,000 <image:image> entries per <url>
const MAX_IMAGES_PER_LIBRARY = 1000;

function xmlEscape(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        res.status(500).send('<!-- Missing Supabase credentials -->');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Public libraries only. This runs on the service-role key, so RLS does not
    // filter anything out — the is_private check has to be made here, and it was
    // missing. scripts/pre-render-galleries.ts and scripts/generate-sitemap.ts
    // both filter on it, so private galleries were advertised in this sitemap
    // while being neither pre-rendered nor listed in sitemap.xml: every one of
    // them resolved to the noindex 404 shell, which is what Ahrefs reports as
    // "Noindex page in sitemap". Worse than the crawl error, it published the
    // slugs, names and photos of private client jobs to search engines, with the
    // images served through /api/gallery/stream that robots.txt deliberately
    // allows. Any new gallery generator must apply the same filter.
    const { data: libraries, error: libErr } = await supabase
        .from('photo_libraries')
        .select('id, slug, name')
        .eq('is_private', false)
        .not('slug', 'is', null)
        .order('slug', { ascending: true });

    if (libErr || !libraries?.length) {
        console.error('[sitemap-images] failed to fetch libraries:', libErr?.message);
        res.status(500).send('<!-- Failed to fetch libraries -->');
        return;
    }

    const urlBlocks: string[] = [];

    for (const lib of libraries) {
        if (!lib.slug) continue;

        const { data: photos, error: photoErr } = await supabase
            .from('photos')
            .select('google_drive_file_id, title')
            .eq('library_id', lib.id)
            .not('google_drive_file_id', 'is', null)
            .order('title', { ascending: true })
            .limit(MAX_IMAGES_PER_LIBRARY);

        if (photoErr || !photos?.length) continue;

        const imageNodes = photos
            .map(p => {
                const fileId = encodeURIComponent(p.google_drive_file_id as string);
                // Use size=400 so Google indexes a preview-quality image.
                // Full-resolution stays behind the gallery purchase flow.
                const imgUrl = `${SITE_URL}/api/gallery/stream?fileId=${fileId}&size=400`;
                // Use the CLAPTROP title (e.g. @tlau.photos_thelostandunfounds_2026-05-02_austin_last-night_001)
                // falling back to the library name. Strip the extension.
                const rawTitle = (p.title as string | null)?.replace(/\.[^.]+$/, '') || lib.name;
                const title = xmlEscape(rawTitle);
                const caption = xmlEscape(`${rawTitle} — The Lost+Unfounds`);
                return `    <image:image>\n      <image:loc>${xmlEscape(imgUrl)}</image:loc>\n      <image:title>${title}</image:title>\n      <image:caption>${caption}</image:caption>\n    </image:image>`;
            })
            .join('\n');

        urlBlocks.push(`  <url>\n    <loc>${SITE_URL}/gallery/${xmlEscape(lib.slug)}</loc>\n${imageNodes}\n  </url>`);
    }

    const xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
        '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
        ...urlBlocks,
        '</urlset>',
    ].join('\n');

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    // Cache 1 hr at the edge — sitemap bots hit this infrequently, but photos sync daily
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=3600');
    res.status(200).send(xml);
}
