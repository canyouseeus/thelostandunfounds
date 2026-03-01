/**
 * Image Sitemap Generator
 * Creates image-sitemap.xml for Google Image Search indexing
 */
import { createClient } from '@supabase/supabase-js';
import { writeFile } from 'fs/promises';
import { join } from 'path';

async function generateImageSitemap() {
    console.log('🔄 Generating image sitemap...');

    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.warn('⚠️  Supabase credentials not found. Skipping image sitemap.');
        return;
    }

    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        // Fetch all photos and their library info
        const { data: photos, error: photoError } = await supabase
            .from('photos')
            .select(`
                *,
                photo_libraries (
                    slug,
                    name,
                    is_private
                )
            `)
            .order('created_at', { ascending: false });

        if (photoError) {
            console.error('❌ Error fetching photos for sitemap:', photoError);
            return;
        }

        // Fetch blog posts for featured images
        const { data: posts, error: postError } = await supabase
            .from('blog_posts')
            .select('title, slug, og_image_url, subdomain')
            .eq('published', true)
            .not('og_image_url', 'is', null);

        if (postError) {
            console.warn('⚠️  Error fetching blog posts for image sitemap:', postError);
        }

        // Filter out private photos/libraries
        const publicPhotos = photos?.filter(p => p.photo_libraries && !p.photo_libraries.is_private) || [];

        // Group photos by page URL
        const imagesByUrl: Record<string, any[]> = {};

        // Add gallery photos
        for (const photo of publicPhotos) {
            const pageUrl = `https://www.thelostandunfounds.com/gallery/${photo.photo_libraries.slug}`;
            if (!imagesByUrl[pageUrl]) imagesByUrl[pageUrl] = [];

            const imageUrl = photo.google_drive_file_id
                ? `https://lh3.googleusercontent.com/d/${photo.google_drive_file_id}=s0`
                : photo.url;

            if (imageUrl) {
                imagesByUrl[pageUrl].push({
                    loc: imageUrl,
                    title: photo.title || 'Untitled Photo',
                    caption: photo.description || photo.title || 'Photo from THE LOST+UNFOUNDS'
                });
            }
        }

        // Add blog featured images
        if (posts) {
            for (const post of posts) {
                const pageUrl = post.subdomain
                    ? `https://www.thelostandunfounds.com/blog/${post.subdomain}/${post.slug}`
                    : `https://www.thelostandunfounds.com/thelostarchives/${post.slug}`;

                if (!imagesByUrl[pageUrl]) imagesByUrl[pageUrl] = [];

                imagesByUrl[pageUrl].push({
                    loc: post.og_image_url,
                    title: post.title,
                    caption: `Featured image for ${post.title}`
                });
            }
        }

        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`;

        for (const [pageUrl, images] of Object.entries(imagesByUrl)) {
            xml += `
  <url>
    <loc>${pageUrl}</loc>
    ${images.map(img => `
    <image:image>
      <image:loc>${img.loc}</image:loc>
      <image:title>${img.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</image:title>
      <image:caption>${img.caption.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</image:caption>
    </image:image>`).join('')}
  </url>`;
        }

        xml += `
</urlset>`;

        const outputPath = join(process.cwd(), 'dist', 'image-sitemap.xml');
        await writeFile(outputPath, xml, 'utf-8');

        // Also add it to public for dev reference
        try {
            await writeFile(join(process.cwd(), 'public', 'image-sitemap.xml'), xml, 'utf-8');
        } catch (e) { }

        console.log(`✅ Successfully generated image sitemap with ${publicPhotos.length} images.`);
    } catch (err) {
        console.error('❌ Error generating image sitemap:', err);
    }
}

generateImageSitemap();
