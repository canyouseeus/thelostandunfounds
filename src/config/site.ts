/**
 * SITE CONFIG — the single source of truth for everything that differs between
 * one deployment of this platform and another.
 *
 * Background: the platform is being made re-brandable so it can be forked for
 * outside clients (see docs/features/WHITE_LABEL_PROGRAM.md). Today the brand is
 * a string literal in ~168 source files. Every one of those should end up reading
 * from here instead.
 *
 * RULES
 * - Nothing in this file may import from src/ — it must stay a leaf module so
 *   both the React app and the Node/serverless side can read it.
 * - No secrets. Credentials belong in environment variables. This file is
 *   committed and shipped to the browser.
 * - When you remove a hardcoded brand string somewhere, add the field here
 *   rather than inventing a local constant.
 *
 * The values below are the current production values for THE LOST+UNFOUNDS, so
 * introducing this file changes no behaviour on its own.
 */

export interface SiteConfig {
    /** Display brand, as rendered in nav, page titles and email headers. */
    brandName: string
    /**
     * Registered legal entity, for invoices, contracts, proposals and legal
     * pages. Deliberately distinct from brandName — signing blocks and Terms
     * pages need the entity, not the display brand.
     */
    legalName: string
    /** Person who signs contracts and proposals on behalf of the entity. */
    ownerName: string
    /** Bare apex domain, no scheme, no www. */
    domain: string
    /** Canonical origin including scheme and host, no trailing slash. */
    origin: string
    /** Short descriptor used in meta descriptions and email footers. */
    tagline: string

    email: {
        /** Primary admin/owner address — receives operational notifications. */
        admin: string
        /** Business address of record, CC'd on client correspondence. */
        media: string
        /** From-address for automated mail. */
        noreply: string
        support: string
        privacy: string
        legal: string
        business: string
        /** Automated sync/cron notifications. */
        sync: string
    }

    social: {
        instagram?: string
        venmo?: string
    }

    /** External platforms keyed to this brand's account. */
    external: {
        /** Fourthwall storefront subdomain, e.g. "<slug>.fourthwall.com". */
        fourthwallStore?: string
    }

    brandAssets: {
        /** Absolute URL — used in email HTML, which cannot resolve relative paths. */
        emailBanner: string
        logo: string
        ogImage: string
    }

    /**
     * Prefix for browser storage keys and photo filename conventions.
     * Changing this on a live site orphans existing localStorage entries.
     */
    storagePrefix: string

    /**
     * Optional surfaces. Photographer-core features are not flagged — every
     * deployment gets bookings, gallery, delivery, invoicing and checkout.
     * These are the LOST+UNFOUNDS-specific ones a client fork turns off.
     */
    features: {
        blog: boolean
        bookClub: boolean
        events: boolean
        affiliateProgram: boolean
        kingMidas: boolean
        kattitude: boolean
        newsletter: boolean
        shop: boolean
        advertise: boolean
    }
}

export const SITE: SiteConfig = {
    brandName: 'THE LOST+UNFOUNDS',
    legalName: 'THE LOST AND UNFOUNDS LLC.',
    ownerName: 'Joshua Greene',
    domain: 'thelostandunfounds.com',
    origin: 'https://www.thelostandunfounds.com',
    tagline: 'A content platform and creative community.',

    email: {
        admin: 'admin@thelostandunfounds.com',
        media: 'media@thelostandunfounds.com',
        noreply: 'noreply@thelostandunfounds.com',
        support: 'support@thelostandunfounds.com',
        privacy: 'privacy@thelostandunfounds.com',
        legal: 'legal@thelostandunfounds.com',
        business: 'business@thelostandunfounds.com',
        sync: 'sync@thelostandunfounds.com',
    },

    social: {
        instagram: 'tlau.photos',
        venmo: 'thelostandunfounds',
    },

    external: {
        fourthwallStore: 'thelostandunfounds-shop.fourthwall.com',
    },

    brandAssets: {
        emailBanner: 'https://www.thelostandunfounds.com/brand/banner.png',
        logo: 'https://www.thelostandunfounds.com/logo.png',
        ogImage: 'https://www.thelostandunfounds.com/og-image.png',
    },

    storagePrefix: 'tlau',

    features: {
        blog: true,
        bookClub: true,
        events: true,
        affiliateProgram: true,
        kingMidas: true,
        kattitude: true,
        newsletter: true,
        shop: true,
        advertise: true,
    },
}

/** Build an absolute URL on the site origin. Pass a leading-slash path. */
export function siteUrl(path = ''): string {
    if (!path) return SITE.origin
    return `${SITE.origin}${path.startsWith('/') ? path : `/${path}`}`
}

/** Namespaced browser-storage key, e.g. storageKey('visitor_id') -> 'tlau_visitor_id'. */
export function storageKey(name: string): string {
    return `${SITE.storagePrefix}_${name}`
}

export default SITE
