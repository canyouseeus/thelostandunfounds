/**
 * Native products sold via Stripe Checkout (price-ID based).
 * Each entry maps to a Stripe Price object; the checkout backend looks
 * up tax/shipping/inventory from there rather than from this file.
 */
export interface StripeProduct {
    id: string
    title: string
    description: string
    price: number
    currency: string
    images: string[]
    handle: string
    available: boolean
    url: string
    category?: string
    featured?: boolean
    stripePriceId: string
    stripeProductId?: string
    productKind: 'physical' | 'digital'
}

export const STRIPE_PRODUCTS: StripeProduct[] = [
    // Mystery Box removed: placeholder listing with a broken dummy image.
    // Re-add a real entry here (with a valid Stripe price ID and image) to
    // feature a native Stripe-checkout product in the shop again.
]

/**
 * Booked services (photography, web dev, bundles, kiosk builds); sold via
 * quotes/invoices, not the merch checkout. Prices mirror BookingPage.tsx.
 * stripeProductId/stripePriceId are filled in by /api/admin/seed-stripe-products
 * once the catalog is seeded to Stripe.
 */
export interface ServiceProduct {
    id: string
    name: string
    category: 'photography' | 'web-dev' | 'bundle' | 'kiosk'
    price: number
    priceType: 'one_time' | 'recurring'
    interval?: 'month'
    description: string
    stripeProductId?: string
    stripePriceId?: string
}

export const SERVICE_PRODUCTS: ServiceProduct[] = [
    // Photography
    {
        id: 'photo-portrait',
        name: 'Lifestyle Portrait',
        category: 'photography',
        price: 250,
        priceType: 'one_time',
        description: '30-45 min lifestyle portrait session in downtown Austin, 10-15 curated photos, same-day delivery.',
    },
    {
        id: 'photo-event',
        name: 'Event Coverage',
        category: 'photography',
        price: 600,
        priceType: 'one_time',
        description: '3 hours of event coverage at your venue, 20-30 curated photos and a highlight reel within 48 hrs.',
    },
    {
        id: 'photo-halfday',
        name: 'Half-Day Content',
        category: 'photography',
        price: 800,
        priceType: 'one_time',
        description: '4 hours on location, 30-50 curated photos plus 2-3 short-form reels.',
    },
    {
        id: 'photo-fullday',
        name: 'Full-Day Content',
        category: 'photography',
        price: 1400,
        priceType: 'one_time',
        description: '8 hours on location, 50+ curated photos plus 2-3 short-form reels.',
    },
    // Web development
    {
        id: 'webdev-starter',
        name: 'Starter Site',
        category: 'web-dev',
        price: 1500,
        priceType: 'one_time',
        description: 'Template-based site, 5-8 pages, mobile responsive, Vercel deployment.',
    },
    {
        id: 'webdev-professional',
        name: 'Professional Site',
        category: 'web-dev',
        price: 3500,
        priceType: 'one_time',
        description: 'Custom branding, dashboard/admin panel, booking system, SEO optimization.',
    },
    {
        id: 'webdev-agency',
        name: 'Agency Build',
        category: 'web-dev',
        price: 6000,
        priceType: 'one_time',
        description: 'Full custom build, CRM integration, email automation, payment processing.',
    },
    {
        id: 'webdev-maintenance',
        name: 'Monthly Maintenance',
        category: 'web-dev',
        price: 150,
        priceType: 'recurring',
        interval: 'month',
        description: 'Content updates, performance monitoring, priority support, security patches.',
    },
    // Bundles
    {
        id: 'bundle-launch',
        name: 'Launch Package',
        category: 'bundle',
        price: 2500,
        priceType: 'one_time',
        description: 'Starter website (5-8 pages) + lifestyle portrait session + product/space photography for the site.',
    },
    {
        id: 'bundle-brand',
        name: 'Brand Package',
        category: 'bundle',
        price: 5000,
        priceType: 'one_time',
        description: 'Professional website with custom branding + half-day content shoot + brand photography and social assets.',
    },
    // Kiosk
    {
        id: 'kiosk-build',
        name: 'Kiosk Build',
        category: 'kiosk',
        /* A FLOOR, and this is sold PER PROJECT, never as a fixed-price
         * product. Anywhere it is shown to a customer it must read "from" or
         * "per project", never a bare $2,500.
         *
         * WHAT DOES AND DOES NOT MOVE THE NUMBER, because this was written
         * wrong once already: the software build does NOT scale with artist
         * count, category count or catalog size; that is the same work either
         * way and is not billed per seat. What varies is the ROOM: how many
         * touchscreens, what size, and the mounting and setup that go with
         * them. Hardware is quoted separately and bought at cost. */
        price: 2500,
        priceType: 'one_time',
        description: 'Interactive kiosk build, installation and setup. Quoted per project from $2,500; hardware billed separately at cost; the quote varies with the number and size of screens, not with how many artists use it.',
    },
]
