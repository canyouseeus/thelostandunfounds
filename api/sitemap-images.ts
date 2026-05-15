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

    // Fetch all libraries that have a slug
    const { data: libraries, error: libErr } = await supabase
        .from('photo_libraries')
        .select('id, slug, name')
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
