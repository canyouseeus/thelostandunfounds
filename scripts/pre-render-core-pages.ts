/**
 * Build-time Core Pages Pre-renderer
 * Generates static HTML folders for core routes so bots can read them immediately.
 */
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const CORE_PAGES = [
    { path: 'about', title: 'About | THE LOST+UNFOUNDS', description: 'Who we are and what we do.' },
    { path: 'privacy', title: 'Privacy Policy | THE LOST+UNFOUNDS', description: 'Our privacy policy.' },
    { path: 'terms', title: 'Terms of Service | THE LOST+UNFOUNDS', description: 'Our terms of service.' },
    { path: 'shop', title: 'Shop | THE LOST+UNFOUNDS', description: 'Shop exclusive findings from the field.' },
    { path: 'events', title: 'Events | THE LOST+UNFOUNDS', description: 'Upcoming events, gatherings, and workshops.' },
    { path: 'gallery', title: 'The Gallery | THE LOST+UNFOUNDS', description: 'Exclusive high-resolution photography collections. Findings from the field, captured in high definition.' },
    { path: 'contact', title: 'Contact | THE LOST+UNFOUNDS', description: 'Get in touch with us.' }
];

async function preRenderCorePages() {
    console.log('🔄 Starting core pages pre-rendering...');
    const startTime = Date.now();

    try {
        const distPath = join(process.cwd(), 'dist');
        const indexPath = join(distPath, 'index.html');

        let htmlTemplate: string;
        try {
            htmlTemplate = await readFile(indexPath, 'utf-8');
        } catch (err) {
            console.error('❌ Could not read index.html in dist. Run "npm run build" first.');
            return;
        }

        const escapeHtml = (str: string) => {
            return str
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        };

        for (const page of CORE_PAGES) {
            const pageDir = join(distPath, page.path);
            await mkdir(pageDir, { recursive: true });

            let html = htmlTemplate;

            // Replace title
            html = html.replace(
                /<title>.*?<\/title>/i,
                `<title>${escapeHtml(page.title)}</title>`
            );

            // Add canonical URL
            const pageUrl = `https://www.thelostandunfounds.com/${page.path}`;
            const canonicalTag = `<link rel="canonical" href="${escapeHtml(pageUrl)}" />`;
            if (html.includes('rel="canonical"')) {
                html = html.replace(
                    /<link\s+rel=["']canonical["'][^>]*>/i,
                    canonicalTag
                );
            } else {
                html = html.replace('</head>', `  ${canonicalTag}\n</head>`);
            }

            // Replace description
            if (html.includes('name="description"')) {
                html = html.replace(
                    /<meta\s+name=["']description["'][^>]*>/i,
                    `<meta name="description" content="${escapeHtml(page.description)}" />`
                );
            } else {
                html = html.replace('</head>', `  <meta name="description" content="${escapeHtml(page.description)}" />\n</head>`);
            }

            // Write HTML
            const filePath = join(pageDir, 'index.html');
            await writeFile(filePath, html, 'utf-8');
            console.log(`  ✅ Pre-rendered: /${page.path}`);
        }

        const duration = (Date.now() - startTime) / 1000;
        console.log(`✅ Successfully pre-rendered ${CORE_PAGES.length} core pages in ${duration.toFixed(2)}s!`);

    } catch (error) {
        console.error('❌ Error rendering core pages:', error);
        process.exit(1);
    }
}

preRenderCorePages().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
