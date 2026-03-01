/**
 * Build-time Core Pages Pre-renderer
 * Generates static HTML folders for core routes so bots can read them immediately.
 */
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY) ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const CORE_PAGES = [
    { path: 'about', title: 'About | THE LOST+UNFOUNDS', description: 'Who we are and what we do at THE LOST+UNFOUNDS.' },
    { path: 'privacy', title: 'Privacy Policy | THE LOST+UNFOUNDS', description: 'Our privacy policy and data protection practices.' },
    { path: 'terms', title: 'Terms of Service | THE LOST+UNFOUNDS', description: 'Our terms of service and usage conditions.' },
    { path: 'shop', title: 'Shop | THE LOST+UNFOUNDS', description: 'Shop exclusive findings from the field. Intel and equipment.' },
    { path: 'events', title: 'Events | THE LOST+UNFOUNDS', description: 'Upcoming events, gatherings, and workshops from THE LOST+UNFOUNDS.' },
    { path: 'gallery', title: 'The Gallery | THE LOST+UNFOUNDS', description: 'Exclusive high-resolution photography collections and findings from the field.' },
    { path: 'contact', title: 'Contact | THE LOST+UNFOUNDS', description: 'Get in touch with the team at THE LOST+UNFOUNDS.' },
    { path: 'pricing', title: 'Pricing | THE LOST+UNFOUNDS', description: 'Subscription plans and pricing for THE LOST+UNFOUNDS services.' },
    { path: 'support', title: 'Support | THE LOST+UNFOUNDS', description: 'Help and documentation for THE LOST+UNFOUNDS platform.' },
    { path: 'thelostarchives', title: 'THE LOST ARCHIVES | THE LOST+UNFOUNDS', description: 'Revealing findings from the frontier and beyond. Official articles.' },
    { path: 'book-club', title: 'BOOK CLUB | THE LOST+UNFOUNDS', description: 'Join the community reading and analyzing literature on technology and society.' },
    { path: 'gearheads', title: 'GEARHEADS | THE LOST+UNFOUNDS', description: 'Technical deep dives, equipment reviews, and developer intel.' },
    { path: 'borderlands', title: 'EDGE OF THE BORDERLANDS | THE LOST+UNFOUNDS', description: 'Exploring the boundaries of information, society, and technology.' },
    { path: 'science', title: 'MAD SCIENTISTS | THE LOST+UNFOUNDS', description: 'Experimental research and technical breakthroughs from the field.' },
    { path: 'newtheory', title: 'NEW THEORY | THE LOST+UNFOUNDS', description: 'Fresh perspectives and evolving theories on the digital age.' }
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

        const storefrontToken = process.env.FOURTHWALL_STOREFRONT_TOKEN || process.env.VITE_FOURTHWALL_STOREFRONT_TOKEN;

        for (const page of CORE_PAGES) {
            const pageDir = join(distPath, page.path);
            await mkdir(pageDir, { recursive: true });

            let html = htmlTemplate;

            let shadowContent = '';
            let shadowSchema: any = null;

            // Handle shop specific pre-rendering
            if (page.path === 'shop' && storefrontToken) {
                try {
                    console.log('🛒 Fetching products for shadow pre-rendering...');
                    const part1 = 'https://storefront-api.fourthwall.com/v1/collections/all/products?storefront_token=';
                    const fwUrl = `${part1}${storefrontToken}`;

                    const response = await fetch(fwUrl);
                    if (response.ok) {
                        const data: any = await response.json();
                        const products = data.offers || data.products || data.items || [];

                        if (products.length > 0) {
                            console.log(`✅ Found ${products.length} products for shadow pre-rendering.`);

                            shadowSchema = {
                                "@context": "https://schema.org",
                                "@type": "ItemList",
                                "numberOfItems": products.length,
                                "itemListElement": products.map((p: any, i: number) => ({
                                    "@type": "ListItem",
                                    "position": i + 1,
                                    "item": {
                                        "@type": "Product",
                                        "name": p.title,
                                        "description": p.description,
                                        "url": `https://www.thelostandunfounds.com/shop`,
                                        "image": p.images?.[0]?.url || p.images?.[0],
                                        "offers": {
                                            "@type": "Offer",
                                            "price": p.price / 100 || p.price,
                                            "priceCurrency": "USD",
                                            "availability": "https://schema.org/InStock"
                                        }
                                    }
                                }))
                            };

                            shadowContent = `
                                <div id="shop-shadow-data" style="display: none;" aria-hidden="true">
                                    ${products.map((p: any) => `
                                        <article>
                                            <h2>${escapeHtml(p.title)}</h2>
                                            <p>${escapeHtml(p.description)}</p>
                                            <img src="${p.images?.[0]?.url || p.images?.[0]}" alt="${escapeHtml(p.title)}" />
                                            <span>Price: $${(p.price / 100 || p.price).toFixed(2)}</span>
                                        </article>
                                    `).join('\n')}
                                </div>
                            `;
                        }
                    }
                } catch (err) {
                    console.warn('⚠️  Could not fetch products for shadow pre-rendering:', err);
                }
            }

            // Handle Blog/Category listing pre-rendering
            const isBlogCategory = ['thelostarchives', 'book-club', 'gearheads', 'borderlands', 'science', 'newtheory'].includes(page.path);
            if (isBlogCategory && supabase) {
                try {
                    const blogColumnMap: Record<string, string> = {
                        'thelostarchives': 'main',
                        'book-club': 'bookclub',
                        'gearheads': 'gearheads',
                        'borderlands': 'borderlands',
                        'science': 'science',
                        'newtheory': 'newtheory'
                    };

                    const column = blogColumnMap[page.path];
                    const { data: posts } = await supabase
                        .from('blog_posts')
                        .select('title, slug, excerpt, subdomain, created_at')
                        .eq('published', true)
                        .eq(column === 'main' ? 'blog_column' : 'blog_column', column) // Dummy check for main vs specific
                        .order('created_at', { ascending: false })
                        .limit(20);

                    if (posts && posts.length > 0) {
                        shadowContent = `
                            <nav id="static-blog-list" style="margin-top: 3rem;">
                                <h2 style="font-size: 1.5rem; margin-bottom: 2rem; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.1em;">Latest Articles</h2>
                                <ul style="list-style: none; padding: 0;">
                                    ${posts.map((p: any) => {
                            const url = p.subdomain ? `/blog/${p.subdomain}/${p.slug}` : `/thelostarchives/${p.slug}`;
                            return `
                                        <li style="margin-bottom: 3rem;">
                                            <a href="${url}" style="color: white; text-decoration: none; display: block;">
                                                <h3 style="font-size: 1.8rem; margin-bottom: 0.5rem; font-weight: bold; border-left: 2px solid white; padding-left: 1.5rem;">${escapeHtml(p.title)}</h3>
                                                <p style="color: rgba(255,255,255,0.6); font-size: 1rem; margin-bottom: 1rem; padding-left: 1.5rem;">${escapeHtml(p.excerpt || '')}</p>
                                                <span style="font-size: 0.8rem; color: rgba(255,255,255,0.3); padding-left: 1.5rem; font-weight: bold; text-transform: uppercase;">READ ARTICLE →</span>
                                            </a>
                                        </li>
                                        `;
                        }).join('\n')}
                                </ul>
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
                        .select('name, slug, description')
                        .eq('is_private', false);

                    if (libraries && libraries.length > 0) {
                        shadowContent = `
                            <nav id="static-gallery-list" style="margin-top: 3rem;">
                                <h2 style="font-size: 1.5rem; margin-bottom: 2rem; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.1em;">Public Collections</h2>
                                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 2rem;">
                                    ${libraries.map((lib: any) => `
                                        <a href="/gallery/${lib.slug}" style="color: white; text-decoration: none; padding: 2rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.02);">
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
            let description = page.description;
            if (description.length > 155) description = description.substring(0, 152) + '...';
            const metaDescription = `<meta name="description" content="${escapeAttr(description)}" />`;
            if (html.includes('name="description"')) {
                html = html.replace(/<meta\s+name=["']description["'][^>]*>/i, metaDescription);
            } else {
                html = html.replace('</head>', `  ${metaDescription}\n</head>`);
            }

            // Inject Schemas
            let allSchema = `<script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>`;
            if (shadowSchema) {
                allSchema += `\n  <script type="application/ld+json">${JSON.stringify(shadowSchema)}</script>`;
            }
            html = html.replace('</head>', `  ${allSchema}\n</head>`);

            // Sync OG and Twitter tags
            html = html.replace(/<meta\s+property=["']og:title["'][^>]*>/i, `<meta property="og:title" content="${escapeAttr(page.title)}" />`);
            html = html.replace(/<meta\s+property=["']og:description["'][^>]*>/i, `<meta property="og:description" content="${escapeAttr(description)}" />`);
            html = html.replace(/<meta\s+property=["']og:url["'][^>]*>/i, `<meta property="og:url" content="${escapeAttr(pageUrl)}" />`);

            // Inject content into pre-render block
            const h1Tag = `<h1 style="font-size: 4rem; margin-bottom: 2rem; font-weight: 900; letter-spacing: -0.02em; text-transform: uppercase;">${escapeAttr(page.title.split(' | ')[0])}</h1>`;

            if (html.includes('id="pre-render"')) {
                html = html.replace(
                    /<div id="pre-render"[^>]*>[\s\S]*?<\/div>/i,
                    `<div id="pre-render" style="background: black; color: white; min-height: 100vh; padding: 6rem 2rem; max-width: 1000px; margin: 0 auto; font-family: -apple-system, system-ui, sans-serif;">\n      ${h1Tag}\n      <p style="font-size: 1.25rem; color: rgba(255,255,255,0.6); max-width: 600px; line-height: 1.6; margin-bottom: 4rem;">${escapeAttr(page.description)}</p>\n      ${shadowContent}\n    </div>`
                );
            } else {
                html = html.replace('<div id="root">', `<div id="root">\n    <div id="pre-render" style="background: black; color: white; min-height: 100vh; padding: 6rem 2rem; max-width: 1000px; margin: 0 auto; font-family: -apple-system, system-ui, sans-serif;">\n      ${h1Tag}\n      <p style="font-size: 1.25rem; color: rgba(255,255,255,0.6); max-width: 600px; line-height: 1.6; margin-bottom: 4rem;">${escapeAttr(page.description)}</p>\n      ${shadowContent}\n    </div>`);
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
