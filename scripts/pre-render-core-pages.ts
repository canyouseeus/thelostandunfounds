/**
 * Build-time Core Pages Pre-renderer
 * Generates static HTML folders for core routes so bots can read them immediately.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';
import { replacePreRenderBlock } from './lib/pre-render-shell';
import { fitDescription, jsonLd } from './lib/seo-meta';
import { DOCS_FAQ, PHOTOGRAPHER_FAQ, type FAQItem } from '../src/data/faqs';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY) ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const SITE_URL = 'https://www.thelostandunfounds.com';
const ORGANIZATION_ID = `${SITE_URL}/#organization`;

/** ItemList for listing pages (Ahrefs: "Category page missing ItemList schema"). */
function itemListSchema(name: string, items: { name: string; url: string }[]) {
    return {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": name,
        "numberOfItems": items.length,
        "itemListElement": items.map((item, i) => ({
            "@type": "ListItem",
            "position": i + 1,
            "name": item.name,
            "url": item.url,
        })),
    };
}

/** FAQPage built from the same list the React page renders (src/data/faqs.ts). */
function faqPageSchema(faqs: FAQItem[], url: string) {
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "url": url,
        "mainEntity": faqs.map((f) => ({
            "@type": "Question",
            "name": f.question,
            "acceptedAnswer": { "@type": "Answer", "text": f.answer },
        })),
    };
}

/** Article node for long-form guide pages. Author and publisher are the site organization. */
function articleSchema(type: 'Article' | 'TechArticle', headline: string, description: string, url: string) {
    return {
        "@context": "https://schema.org",
        "@type": type,
        "headline": headline.substring(0, 110),
        "description": description,
        "url": url,
        "inLanguage": "en-US",
        "image": `${SITE_URL}/og-image.png`,
        "author": { "@type": "Organization", "@id": ORGANIZATION_ID, "name": "THE LOST+UNFOUNDS", "url": SITE_URL },
        "publisher": {
            "@type": "Organization",
            "@id": ORGANIZATION_ID,
            "name": "THE LOST+UNFOUNDS",
            "logo": { "@type": "ImageObject", "url": `${SITE_URL}/logo.png`, "width": 512, "height": 512 },
        },
        "mainEntityOfPage": { "@type": "WebPage", "@id": url },
    };
}

const CORE_PAGES = [
    { path: 'about', title: 'ABOUT | THE LOST+UNFOUNDS', description: 'Learn about THE LOST+UNFOUNDS, a creative brand and mindset builder dedicated to help you believe in yourself again. Discover our mission and vision.' },
    { path: 'privacy', title: 'PRIVACY POLICY | THE LOST+UNFOUNDS', description: 'Review the Privacy Policy for THE LOST+UNFOUNDS. Learn how protecting your personal privacy is prioritized and how we securely handle your data.' },
    { path: 'terms', title: 'TERMS OF SERVICE | THE LOST+UNFOUNDS', description: 'Review the Terms of Service for THE LOST+UNFOUNDS. Read our rules and regulations to understand your rights and responsibilities when using our platform.' },
    { path: 'shop', title: 'SHOP | THE LOST+UNFOUNDS', description: 'Shop exclusive THE LOST+UNFOUNDS apparel, gear, and digital products. Discover unique findings from the field, delivered directly to your door.' },
    { path: 'events', title: 'EVENTS | THE LOST+UNFOUNDS', description: 'Join THE LOST+UNFOUNDS for exclusive gatherings, workshops, and experiences pushing boundaries at the frontier. Book tickets for upcoming events.' },
    { path: 'gallery', title: 'THE GALLERY | THE LOST+UNFOUNDS', description: 'Explore exclusive high-resolution photography collections. Unique findings from the field, beautifully captured in high definition for your inspiration.' },
    { path: 'contact', title: 'CONTACT | THE LOST+UNFOUNDS', description: 'Get in touch with THE LOST+UNFOUNDS. We\'d love to hear from you and help with any questions, inquiries, or feedback you might have about our platform.' },
    { path: 'support', title: 'SUPPORT CENTER | THE LOST+UNFOUNDS', description: 'Get help and support for THE LOST+UNFOUNDS. Find our FAQs, documentation, troubleshooting guides, and contact information to resolve any issues quickly.' },
    { path: 'thelostarchives', title: 'THE LOST ARCHIVES | THE LOST+UNFOUNDS', description: 'Revealing findings from the frontier and beyond. Intel from the field on development, AI, and building in the age of information.' },
    { path: 'advertise', title: 'ADVERTISE | THE LOST+UNFOUNDS', description: 'Partner with THE LOST+UNFOUNDS. Discover premium advertising opportunities across our ecosystem of tools, galleries, and editorial content.' },
    // Public routes that existed in the router but not here, so the Vercel
    // catch-all served them the noindex shell — telling Google not to index
    // real, public pages. Any new public route must be added to this list.
    // The services offer. Until this existed the whole hire-us page lived behind a
    // React state flag on the homepage, so the raw HTML at /?view=services was
    // byte-identical to the homepage and contained none of the copy below.
    { path: 'services', title: 'AUSTIN PHOTOGRAPHY & WEB DESIGN | THE LOST+UNFOUNDS', description: 'Austin photography and web design. Airbnb shoots from $195, event coverage from $600, small business websites from $1,500. Book online.' },
    // One page per offer. A single page cannot rank for three unrelated
    // searches, and "airbnb photographer austin" competes with a different set
    // of results than "small business web design austin".
    { path: 'services/airbnb-photography', title: 'AUSTIN AIRBNB PHOTOGRAPHY | THE LOST+UNFOUNDS', description: 'Airbnb and short-term rental listing photography in Austin, TX. 25-35 edited photos in 24-72 hours, from $195. Twilight, drone and 3D tour add-ons.' },
    { path: 'services/real-estate-photography', title: 'AUSTIN REAL ESTATE & APARTMENT PHOTOGRAPHY | THE LOST+UNFOUNDS', description: 'Real estate and multifamily leasing photography in Austin, TX. Model units from $225, full property packages at $850, portfolio retainers from $1,600/mo.' },
    { path: 'services/web-design', title: 'AUSTIN SMALL BUSINESS WEB DESIGN | THE LOST+UNFOUNDS', description: 'Website design and development for Austin small businesses, artists and brands. Starter sites from $1,500 to custom builds with booking and payments.' },
    { path: 'services/video', title: 'AUSTIN VIDEO CONTENT & BRAND REELS | THE LOST+UNFOUNDS', description: 'Short-form video and brand reels in Austin, TX. Reels shot alongside stills on half- and full-day content days, plus event highlight reels in 48 hours.' },
    { path: 'capabilities', title: 'CAPABILITIES | THE LOST+UNFOUNDS', description: 'Fabrication, photography, and build capabilities from THE LOST+UNFOUNDS. See what we can produce, from editorial shoots to full web development.' },
    { path: 'terms/affiliates', title: 'AFFILIATE TERMS | THE LOST+UNFOUNDS', description: 'Terms for THE LOST+UNFOUNDS affiliate program: how you earn 42% of profit, how referrals are tracked, how Stripe Connect payouts work, and promotion rules.' },
    { path: 'become-affiliate', title: 'AFFILIATE PROGRAM | THE LOST+UNFOUNDS', description: 'Earn up to 42% of profits with THE LOST+UNFOUNDS affiliate program. Share what you love, track your referrals, and get paid for every sale you drive.' },
    { path: 'docs', title: 'DOCUMENTATION | THE LOST+UNFOUNDS', description: 'Guides and documentation for THE LOST+UNFOUNDS platform, including the photographer guide, gallery workflows, and contributor resources.' },
    { path: 'king-midas-leaderboard', title: 'KING MIDAS LEADERBOARD | THE LOST+UNFOUNDS', description: 'Live standings for the King Midas affiliate competition. See top earners, pot distribution, and where you rank in the program.' },
    // Same omission as the note above, caught again in the August crawl: these
    // four are public, linked from pages that are themselves indexed, and were
    // being served the noindex shell. /thelostarchives/all in particular is the
    // only page that links to every article, so noindex+nofollow there cut the
    // crawl path to the back catalogue.
    { path: 'thelostarchives/all', title: 'ALL ARTICLES | THE LOST+UNFOUNDS', description: 'Every article in THE LOST ARCHIVES — the full back catalogue on development, AI, photography, and building in the age of information.' },
    { path: 'tools', title: 'TOOL BOX | THE LOST+UNFOUNDS', description: 'Free tools from THE LOST+UNFOUNDS, including the TikTok downloader. Small utilities built in public and open to everyone.' },
    { path: 'tools/tiktok-downloader', title: 'TIKTOK DOWNLOADER | THE LOST+UNFOUNDS', description: 'Download TikTok videos without the watermark. A free browser tool from THE LOST+UNFOUNDS — paste a link and save the file.' },
    { path: 'docs/photographer-guide', title: 'PHOTOGRAPHER GUIDE | THE LOST+UNFOUNDS', description: 'The working guide for photographers shooting with THE LOST+UNFOUNDS: gallery delivery, naming, payouts, and the 80/20 split explained.' },
    { path: 'book-club/think-and-grow-rich', title: 'THINK AND GROW RICH WORKBOOK | THE LOST+UNFOUNDS', description: 'A free companion workbook for Think and Grow Rich. All thirteen principles, the actions to run for each, and an honest note on which of Hill\'s claims hold up.' }
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

        const escapeAttr = (str: string) => {
            return str
                .replace(/&/g, '&amp;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        };

        for (const page of CORE_PAGES) {
            const pageDir = join(distPath, page.path);
            await mkdir(pageDir, { recursive: true });

            let html = htmlTemplate;

            let shadowContent = '';
            // One JSON-LD node, or an array of them.
            let shadowSchema: any = null;

            // Shop pre-render. Products come from our own /api/shop/products,
            // the same endpoint the React shop reads, on the deployment that is
            // live while this build runs. The old block called Fourthwall directly
            // and only when FOURTHWALL_STOREFRONT_TOKEN was set at build time; it
            // was not, so /shop shipped with no products and no Product schema
            // (Ahrefs, Nov 2026: "Product page missing Product schema").
            if (page.path === 'shop') {
                try {
                    const response = await fetch(`${SITE_URL}/api/shop/products`, { headers: { Accept: 'application/json' } });
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const data: any = await response.json();
                    const products: any[] = (Array.isArray(data?.products) ? data.products : [])
                        .filter((p: any) => p && p.title && p.price !== undefined && p.price !== null && p.price !== '');

                    if (products.length > 0) {
                        console.log(`✅ Found ${products.length} products for shop pre-rendering.`);
                        const firstImage = (p: any): string | undefined => {
                            const img = Array.isArray(p.images) ? p.images[0] : p.image;
                            const url = typeof img === 'string' ? img : img?.url;
                            return typeof url === 'string' && url.startsWith('https://') ? url : undefined;
                        };
                        const productUrl = (p: any): string =>
                            typeof p.url === 'string' && p.url.startsWith('https://') ? p.url : `${SITE_URL}/shop`;
                        const plainText = (v: unknown): string =>
                            String(v ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

                        shadowSchema = {
                            "@context": "https://schema.org",
                            "@type": "ItemList",
                            "name": "THE LOST+UNFOUNDS shop",
                            "numberOfItems": products.length,
                            "itemListElement": products.map((p: any, i: number) => {
                                const image = firstImage(p);
                                const description = plainText(p.description);
                                const product: Record<string, any> = {
                                    "@type": "Product",
                                    "name": plainText(p.title),
                                    "url": productUrl(p),
                                    "brand": { "@type": "Brand", "name": "THE LOST+UNFOUNDS" },
                                    "offers": {
                                        "@type": "Offer",
                                        "price": String(p.price),
                                        "priceCurrency": p.currency || 'USD',
                                        "availability": p.available === false
                                            ? "https://schema.org/OutOfStock"
                                            : "https://schema.org/InStock",
                                        "url": productUrl(p),
                                    },
                                };
                                if (description) product.description = description;
                                if (image) product.image = image;
                                return { "@type": "ListItem", "position": i + 1, "item": product };
                            }),
                        };

                        shadowContent = `
                                <section id="static-shop-list" style="margin-top: 3rem;">
                                    <h2 style="font-size: 1.5rem; margin-bottom: 2rem; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.1em;">Products</h2>
                                    ${products.map((p: any) => {
                                        const image = firstImage(p);
                                        const description = plainText(p.description);
                                        return `
                                        <article style="margin-bottom: 3rem;">
                                            <h3 style="font-size: 1.4rem; margin-bottom: 0.5rem; font-weight: bold;">${escapeHtml(plainText(p.title))}</h3>
                                            ${description ? `<p style="color: rgba(255,255,255,0.6);">${escapeHtml(description)}</p>` : ''}
                                            ${image ? `<img src="${escapeAttr(image)}" alt="${escapeAttr(plainText(p.title))}" loading="lazy" decoding="async" style="max-width: 300px; height: auto;" />` : ''}
                                            <p style="color: rgba(255,255,255,0.8);">$${escapeHtml(String(p.price))} ${escapeHtml(p.currency || 'USD')}</p>
                                        </article>`;
                                    }).join('\n')}
                                </section>
                            `;
                    }
                } catch (err) {
                    console.warn('⚠️  Could not fetch products for shop pre-rendering:', err);
                }
            }

            // Blog listing pre-render: /thelostarchives (latest main-column posts)
            // and /thelostarchives/all (every published post). /all used to ship
            // with no list at all, so "the only page linking every post" linked
            // none of them in its HTML, and neither page carried ItemList schema
            // (Ahrefs, Nov 2026: "Category page missing ItemList schema", and
            // posts with only one dofollow incoming internal link).
            const isBlogListing = page.path === 'thelostarchives' || page.path === 'thelostarchives/all';
            if (isBlogListing && supabase) {
                try {
                    let query = supabase
                        .from('blog_posts')
                        .select('title, slug, excerpt, subdomain, created_at, published_at')
                        .eq('published', true);
                    query = page.path === 'thelostarchives'
                        ? query.eq('blog_column', 'main').order('created_at', { ascending: false }).limit(20)
                        : query.order('published_at', { ascending: false });
                    const { data: posts, error } = await query;
                    if (error) throw error;

                    if (posts && posts.length > 0) {
                        const postPath = (p: any) => p.subdomain ? `/blog/${p.subdomain}/${p.slug}` : `/thelostarchives/${p.slug}`;
                        shadowSchema = itemListSchema(
                            page.title.split(' | ')[0],
                            posts.map((p: any) => ({ name: p.title, url: `${SITE_URL}${postPath(p)}` })),
                        );
                        // Contributor column pages (/blog/<subdomain>) were otherwise
                        // linked only from their own posts' breadcrumbs.
                        const columns = page.path === 'thelostarchives/all'
                            ? [...new Set(posts.map((p: any) => p.subdomain).filter(Boolean))] as string[]
                            : [];
                        const columnLinks = columns.length === 0 ? '' : `
                                <h2 style="font-size: 1.5rem; margin: 3rem 0 1.5rem; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.1em;">Columns</h2>
                                <ul style="list-style: none; padding: 0;">
                                    ${columns.map((c) => `<li style="margin-bottom: 1rem;"><a href="/blog/${escapeAttr(c)}" style="color: white;">${escapeHtml(c.toUpperCase())}</a></li>`).join('\n')}
                                </ul>`;
                        shadowContent = `
                            <nav id="static-blog-list" style="margin-top: 3rem;">
                                <h2 style="font-size: 1.5rem; margin-bottom: 2rem; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.1em;">${page.path === 'thelostarchives' ? 'Latest Articles' : 'Every Article'}</h2>
                                <ul style="list-style: none; padding: 0;">
                                    ${posts.map((p: any) => `
                                        <li style="margin-bottom: 3rem;">
                                            <a href="${escapeAttr(postPath(p))}" style="color: white; text-decoration: none; display: block;">
                                                <h3 style="font-size: 1.8rem; margin-bottom: 0.5rem; font-weight: bold; border-left: 2px solid white; padding-left: 1.5rem;">${escapeHtml(p.title)}</h3>
                                                <p style="color: rgba(255,255,255,0.6); font-size: 1rem; margin-bottom: 1rem; padding-left: 1.5rem;">${escapeHtml(p.excerpt || '')}</p>
                                                <span style="font-size: 0.8rem; color: rgba(255,255,255,0.3); padding-left: 1.5rem; font-weight: bold; text-transform: uppercase;">READ ARTICLE →</span>
                                            </a>
                                        </li>
                                        `).join('\n')}
                                </ul>
                                ${columnLinks}
                            </nav>
                        `;
                    }
                } catch (err) {
                    console.warn(`⚠️  Could not fetch posts for ${page.path} listing:`, err);
                }
            }

            // Handle Gallery listing pre-rendering
            if (page.path === 'gallery' && supabase) {
                try {
                    const { data: libraries } = await supabase
                        .from('photo_libraries')
                        .select('id, name, slug, description')
                        .eq('is_private', false);

                    // One cover photo per collection. Without these the gallery
                    // index shipped zero <img> tags — the hub page most likely to
                    // rank for "austin photographer" showed Google no photographs
                    // at all. Served through /api/gallery/stream so the images are
                    // credited to this domain rather than Google's CDN, same as
                    // the individual gallery pages.
                    const covers = new Map<string, { fileId: string; title: string }>();
                    for (const lib of libraries || []) {
                        const { data: firstPhoto } = await supabase
                            .from('photos')
                            .select('google_drive_file_id, title')
                            .eq('library_id', (lib as any).id)
                            .order('created_at', { ascending: true })
                            .limit(1);
                        const p = firstPhoto?.[0] as any;
                        if (p?.google_drive_file_id) {
                            covers.set((lib as any).id, { fileId: p.google_drive_file_id, title: p.title || (lib as any).name });
                        }
                    }

                    if (libraries && libraries.length > 0) {
                        shadowSchema = itemListSchema(
                            'THE GALLERY',
                            libraries.map((lib: any) => ({ name: lib.name, url: `${SITE_URL}/gallery/${lib.slug}` })),
                        );
                        shadowContent = `
                            <nav id="static-gallery-list" style="margin-top: 3rem;">
                                <h2 style="font-size: 1.5rem; margin-bottom: 2rem; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.1em;">Public Collections</h2>
                                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 2rem;">
                                    ${libraries.map((lib: any) => `
                                        <a href="/gallery/${lib.slug}" style="color: white; text-decoration: none; padding: 2rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.02);">
                                            ${covers.has(lib.id) ? `<img src="${SITE_URL}/api/gallery/stream?fileId=${encodeURIComponent(covers.get(lib.id)!.fileId)}&amp;size=400" alt="${escapeHtml(covers.get(lib.id)!.title)}" loading="lazy" decoding="async" style="width: 100%; height: auto; margin-bottom: 1.5rem;" />` : ''}
                                            <h3 style="font-size: 1.4rem; margin-bottom: 0.5rem; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;">${escapeHtml(lib.name)}</h3>
                                            <p style="color: rgba(255,255,255,0.5); font-size: 0.9rem;">${escapeHtml(lib.description || '')}</p>
                                            <span style="display: inline-block; margin-top: 1.5rem; font-size: 0.7rem; font-weight: 900; letter-spacing: 0.2em; color: white; border: 1px solid white; padding: 0.5rem 1rem;">VIEW GALLERY</span>
                                        </a>
                                    `).join('\n')}
                                </div>
                            </nav>
                        `;
                    }
                } catch (err) {
                    console.warn('⚠️  Could not fetch galleries for listing:', err);
                }
            }

            // Services pre-render. Mirrors PHOTO_SERVICES / WEB_SERVICES in
            // src/pages/BookingPage.tsx — display only. If a price or package
            // changes there, change it here too or the crawled page goes stale.
            if (page.path.startsWith('services')) {
                // Each sub-page advertises only its own offer. Three pages
                // listing all five services would be near-duplicates, and
                // Google resolves duplicates by keeping one and dropping the
                // rest — picking for itself which of the three survives.
                const FOCUS: Record<string, string[]> = {
                    'services/airbnb-photography': ['Airbnb & Short-Term Rental Photography'],
                    'services/real-estate-photography': ['Real Estate & Multifamily Photography'],
                    'services/web-design': ['Small Business Website Design'],
                    'services/video': ['Short-Form Video & Brand Reels', 'Event Photography & Video', 'Brand Content Days'],
                };
                const allOfferings = [
                    {
                        name: 'Airbnb & Short-Term Rental Photography',
                        price: '195',
                        summary: 'Listing photography for Austin short-term rentals and Airbnb hosts. 25–35 edited photos, 24–72 hour delivery.',
                        detail: 'Studio / 1BR from $195 · 2BR $265 · 3BR $335 · 4BR+ / luxury from $425. Twilight +$125 · Drone +$150 · 3D tour +$200.',
                    },
                    {
                        name: 'Real Estate & Multifamily Photography',
                        price: '225',
                        summary: 'Leasing and listing photography for Austin apartment communities, property managers, and agents.',
                        detail: 'Single model unit or vacant listing $225 (20–30 edited photos) · Property package $850 covering exteriors, amenities and 2 model units · Portfolio retainer from $1,600/mo · Drone +$150 · Twilight +$125 · 3D tour +$200 · Floor plan +$75.',
                    },
                    {
                        name: 'Small Business Website Design',
                        price: '1500',
                        summary: 'Website design and development for Austin small businesses, artists, and brands. Mobile responsive, SEO optimized.',
                        detail: 'Starter $1,500 (5–8 pages) · Professional $3,500 (custom branding, admin dashboard, booking system, SEO) · Agency $6,000+ (full custom build, CRM, email automation, payment processing) · Monthly maintenance $150–300/mo.',
                    },
                    {
                        name: 'Short-Form Video & Brand Reels',
                        price: '450',
                        summary: 'Standalone video for Austin brands — vertical reels, hero brand films, and full video content days.',
                        detail: 'Reel Pack $450 (2 hrs, 3 reels, 5-day delivery) · Brand Video $1,200 (4 hrs, one 60-90s hero plus 3 cutdowns) · Video Content Day $2,000 (8 hrs, hero plus 6-8 reels) · Monthly Reel Retainer $900/mo for 4 reels.',
                    },
                    {
                        name: 'Event Photography & Video',
                        price: '600',
                        summary: 'Event coverage across Austin — venues, brand activations, nightlife, and private events.',
                        detail: '3 hours from $600 · 20–30 curated photos next-day · event highlight reel within 48 hours · +$175/hr for additional hours.',
                    },
                    {
                        name: 'Brand Content Days',
                        price: '800',
                        summary: 'Half-day and full-day content production for brands — photography plus short-form video.',
                        detail: 'Half-day $800 (4 hrs, 30–50 photos, 2–3 reels) · Full-day $1,400 (8 hrs, 50+ photos, 2–3 reels).',
                    },
                    {
                        name: 'Lifestyle Portrait Session',
                        price: '250',
                        summary: 'Candid lifestyle portraits in downtown Austin with same-day delivery.',
                        detail: '30–45 minutes · 10–15 curated photos · same-day delivery.',
                    },
                ];

                // /services keeps the full catalogue; each sub-page carries only
                // its own offer, so the four pages are not near-duplicates.
                const wanted = FOCUS[page.path];
                const offerings = wanted
                    ? allOfferings.filter((o) => wanted.includes(o.name))
                    : allOfferings;
                if (wanted && offerings.length !== wanted.length) {
                    // A renamed offering would silently empty the page it backs.
                    throw new Error(`Service focus for ${page.path} matched ${offerings.length} of ${wanted.length} offerings — check the names in FOCUS.`);
                }

                shadowSchema = {
                    "@context": "https://schema.org",
                    "@type": "ProfessionalService",
                    "name": "THE LOST+UNFOUNDS",
                    "description": page.description,
                    "url": `https://www.thelostandunfounds.com/${page.path}`,
                    // City has no addressRegion/addressCountry properties; putting them
                    // here failed schema.org validation on all five service pages.
                    "areaServed": { "@type": "City", "name": "Austin", "containedInPlace": { "@type": "State", "name": "Texas" } },
                    "address": { "@type": "PostalAddress", "addressLocality": "Austin", "addressRegion": "TX", "addressCountry": "US" },
                    "priceRange": "$195–$6,000+",
                    "hasOfferCatalog": {
                        "@type": "OfferCatalog",
                        "name": "Photography & Web Design Services",
                        "itemListElement": offerings.map((o) => ({
                            "@type": "Offer",
                            "priceCurrency": "USD",
                            "price": o.price,
                            "itemOffered": { "@type": "Service", "name": o.name, "description": o.summary },
                        })),
                    },
                };

                shadowContent = `
                    <section id="static-services-list" style="margin-top: 3rem;">
                        <h2 style="font-size: 1.5rem; margin-bottom: 2rem; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.1em;">Services</h2>
                        ${offerings.map((o) => `
                        <article style="margin-bottom: 3rem; background: rgba(255,255,255,0.02); padding: 2rem;">
                            <h3 style="font-size: 1.6rem; margin-bottom: 0.75rem; font-weight: bold;">${escapeHtml(o.name)}</h3>
                            <p style="color: rgba(255,255,255,0.7); font-size: 1rem; line-height: 1.6; margin-bottom: 0.75rem;">${escapeHtml(o.summary)}</p>
                            <p style="color: rgba(255,255,255,0.5); font-size: 0.95rem; line-height: 1.6;">${escapeHtml(o.detail)}</p>
                        </article>
                        `).join('\n')}
                        <p style="color: rgba(255,255,255,0.6); font-size: 1rem; line-height: 1.6;">
                            THE LOST+UNFOUNDS is a creative agency in Austin, Texas offering photography and web design
                            for brands, artists, and small businesses. Serving Austin and Central Texas.
                        </p>
                        <a href="/contact" style="display: inline-block; margin-top: 1.5rem; font-size: 0.75rem; font-weight: 900; letter-spacing: 0.2em; color: black; background: white; padding: 1rem 2rem; text-decoration: none;">SCHEDULE A SESSION</a>
                    </section>
                `;
            }

            // FAQ and guide pages. The FAQ copy lives in src/data/faqs.ts so the
            // FAQPage markup always matches the questions the page shows, and
            // the pre-render prints the same questions for crawlers without JS.
            // Ahrefs (Nov 2026) reported "FAQ page missing FAQPage schema" and
            // "Article page missing Article schema" on these guide pages.
            const pageUrlForSchema = `${SITE_URL}/${page.path}`;
            const faqsForPage: FAQItem[] | null =
                page.path === 'docs' ? DOCS_FAQ :
                page.path === 'docs/photographer-guide' ? PHOTOGRAPHER_FAQ : null;
            if (faqsForPage) {
                const nodes: any[] = [faqPageSchema(faqsForPage, pageUrlForSchema)];
                if (page.path === 'docs/photographer-guide') {
                    nodes.push(articleSchema('TechArticle', page.title.split(' | ')[0], page.description, pageUrlForSchema));
                }
                shadowSchema = nodes;
                shadowContent = `
                    <section id="static-faq" style="margin-top: 3rem;">
                        <h2 style="font-size: 1.5rem; margin-bottom: 2rem; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.1em;">Frequently Asked Questions</h2>
                        ${faqsForPage.map((f) => `
                        <div style="margin-bottom: 2rem;">
                            <h3 style="font-size: 1.2rem; margin-bottom: 0.5rem; font-weight: bold;">${escapeHtml(f.question)}</h3>
                            <p style="color: rgba(255,255,255,0.7); font-size: 1rem; line-height: 1.6;">${escapeHtml(f.answer)}</p>
                        </div>`).join('\n')}
                    </section>
                `;
            }
            if (page.path === 'book-club/think-and-grow-rich') {
                shadowSchema = articleSchema('Article', page.title.split(' | ')[0], page.description, pageUrlForSchema);
            }

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
                        "name": page.title.split(' | ')[0],
                        "item": `https://www.thelostandunfounds.com/${page.path}`
                    }
                ]
            };

            // Replace title
            html = html.replace(
                /<title>.*?<\/title>/i,
                `<title>${escapeAttr(page.title)}</title>`
            );

            // Add or update canonical URL
            const pageUrl = `https://www.thelostandunfounds.com/${page.path}`;
            const canonicalTag = `<link rel="canonical" href="${escapeAttr(pageUrl)}" />`;
            if (html.includes('rel="canonical"')) {
                html = html.replace(/<link\s+rel=["']canonical["'][^>]*>/i, canonicalTag);
            } else {
                html = html.replace('</head>', `  ${canonicalTag}\n</head>`);
            }

            // Replace description
            const description = fitDescription(page.description);
            const metaDescription = `<meta name="description" content="${escapeAttr(description)}" />`;
            if (html.includes('name="description"')) {
                html = html.replace(/<meta\s+name=["']description["'][^>]*>/i, metaDescription);
            } else {
                html = html.replace('</head>', `  ${metaDescription}\n</head>`);
            }

            // Inject Schemas
            let allSchema = `<script type="application/ld+json">${jsonLd(breadcrumbSchema)}</script>`;
            for (const node of (Array.isArray(shadowSchema) ? shadowSchema : shadowSchema ? [shadowSchema] : [])) {
                allSchema += `\n  <script type="application/ld+json">${jsonLd(node)}</script>`;
            }
            html = html.replace('</head>', `  ${allSchema}\n</head>`);

            // Sync OG and Twitter tags
            html = html.replace(/<meta\s+property=["']og:title["'][^>]*>/i, `<meta property="og:title" content="${escapeAttr(page.title)}" />`);
            html = html.replace(/<meta\s+property=["']og:description["'][^>]*>/i, `<meta property="og:description" content="${escapeAttr(description)}" />`);
            html = html.replace(/<meta\s+property=["']og:url["'][^>]*>/i, `<meta property="og:url" content="${escapeAttr(pageUrl)}" />`);

            // Inject content into pre-render block
            const h1Tag = `<h1 style="font-size: 4rem; margin-bottom: 2rem; font-weight: 900; letter-spacing: -0.02em; text-transform: uppercase;">${escapeAttr(page.title.split(' | ')[0])}</h1>`;

            const preRenderBlock = `<div id="pre-render" style="background: black; color: white; min-height: 100vh; padding: 6rem 2rem; max-width: 1000px; margin: 0 auto; font-family: -apple-system, system-ui, sans-serif;">\n      ${h1Tag}\n      <p style="font-size: 1.25rem; color: rgba(255,255,255,0.6); max-width: 600px; line-height: 1.6; margin-bottom: 4rem;">${escapeAttr(page.description)}</p>\n      ${shadowContent}\n    </div>`;
            html = replacePreRenderBlock(html, preRenderBlock);

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
