/**
 * Generates the brand-dependent parts of index.html from src/config/site.ts.
 *
 * index.html is static and cannot import the config, so a Vite plugin
 * (see vite.config.ts) substitutes these at build time. Keeping the generation
 * here rather than in the plugin means it is unit-testable and lives next to
 * the config it reads.
 */
import { SITE } from './site'

/** Escape a value for insertion into an HTML attribute. */
function attr(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}

/**
 * LocalBusiness + Photographer structured data. This is what surfaces the
 * business in local search, so it must describe the deployment's own operator.
 */
export function businessJsonLd(): string {
    const data = {
        '@context': 'https://schema.org',
        '@type': ['LocalBusiness', 'Photographer'],
        name: SITE.brandName,
        url: SITE.origin,
        logo: SITE.brandAssets.logo,
        image: SITE.brandAssets.ogImage,
        email: SITE.email.admin,
        description: SITE.business.description,
        address: {
            '@type': 'PostalAddress',
            addressLocality: SITE.business.locality,
            addressRegion: SITE.business.region,
            addressCountry: SITE.business.country,
        },
        priceRange: SITE.business.priceRange,
        ...(SITE.social.instagram
            ? { sameAs: [`https://www.instagram.com/${SITE.social.instagram}`] }
            : {}),
        hasOfferCatalog: {
            '@type': 'OfferCatalog',
            name: 'Photography Services',
            itemListElement: SITE.business.services.map(s => ({
                '@type': 'Offer',
                itemOffered: { '@type': 'Service', name: s.name, description: s.description },
            })),
        },
        potentialAction: {
            '@type': 'ReserveAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: `${SITE.origin}${SITE.business.bookingPath}`,
                actionPlatform: [
                    'http://schema.org/DesktopWebPlatform',
                    'http://schema.org/MobileWebPlatform',
                ],
            },
            result: { '@type': 'Reservation', name: 'Photography Booking' },
        },
    }
    return JSON.stringify(data, null, 2)
}

/** WebSite structured data, including the archive search action. */
export function websiteJsonLd(searchPath: string, description: string): string {
    return JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE.brandName,
        url: SITE.origin,
        description,
        potentialAction: {
            '@type': 'SearchAction',
            target: `${SITE.origin}${searchPath}?search={search_term_string}`,
            'query-input': 'required name=search_term_string',
        },
    }, null, 2)
}

/**
 * Token -> replacement map applied to index.html at build time.
 * Tokens use the %SITE_*% form so they are inert if substitution ever fails to
 * run — a visible %SITE_BRAND_NAME% in the page is an obvious failure, whereas
 * a silently empty string is not.
 */
export function htmlTokens(): Record<string, string> {
    return {
        '%SITE_BRAND_NAME%': attr(SITE.brandName),
        '%SITE_ORIGIN%': attr(SITE.origin),
        '%SITE_LOGO%': attr(SITE.brandAssets.logo),
        '%SITE_OG_IMAGE%': attr(SITE.brandAssets.ogImage),
        '%SITE_EMAIL_ADMIN%': attr(SITE.email.admin),
        '%SITE_EMAIL_MEDIA%': attr(SITE.email.media),
        '%SITE_BUSINESS_JSONLD%': businessJsonLd(),
    }
}

/** Apply every token to an HTML document. */
export function applyHtmlTokens(html: string): string {
    let out = html
    for (const [token, value] of Object.entries(htmlTokens())) {
        out = out.split(token).join(value)
    }
    return out
}
