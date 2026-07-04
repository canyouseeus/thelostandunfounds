/**
 * Native products sold via Stripe Checkout (price-ID based).
 * Each entry maps to a Stripe Price object — the checkout backend looks
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
    {
        id: 'mystery-box',
        title: 'Mystery Box',
        description:
            'A curated bundle of finds from the field — exclusive items hand-selected from THE LOST ARCHIVES.',
        price: 999.0,
        currency: 'USD',
        images: ['https://dummyimage.com/800x800/000/ffffff.png&text=Mystery+Box'],
        handle: 'mystery-box',
        available: true,
        url: '#',
        category: 'mystery',
        featured: true,
        stripePriceId: 'price_1TX8dOF4xIdsehKGoawhJZD1',
        stripeProductId: 'prod_UWAzp36MjgQe0C',
        productKind: 'physical',
    },
]

/**
 * Booked services (photography, web dev, bundles, kiosk builds) — sold via
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
        description: '30–45 min lifestyle portrait session in downtown Austin, 10–15 curated photos, same-day delivery.',
    },
    {
        id: 'photo-event',
        name: 'Event Coverage',
        category: 'photography',
        price: 600,
        priceType: 'one_time',
        description: '3 hours of event coverage at your venue, 20–30 curated photos and a highlight reel within 48 hrs.',
    },
    {
        id: 'photo-halfday',
        name: 'Half-Day Content',
        category: 'photography',
        price: 800,
        priceType: 'one_time',
        description: '4 hours on location, 30–50 curated photos plus 2–3 short-form reels.',
    },
    {
        id: 'photo-fullday',
        name: 'Full-Day Content',
        category: 'photography',
        price: 1400,
        priceType: 'one_time',
        description: '8 hours on location, 50+ curated photos plus 2–3 short-form reels.',
    },
    // Web development
    {
        id: 'webdev-starter',
        name: 'Starter Site',
        category: 'web-dev',
        price: 1500,
        priceType: 'one_time',
        description: 'Template-based site, 5–8 pages, mobile responsive, Vercel deployment.',
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
        description: 'Starter website (5–8 pages) + lifestyle portrait session + product/space photography for the site.',
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
        price: 2500,
        priceType: 'one_time',
        description: 'Interactive kiosk software build and setup (service only — hardware billed separately).',
    },
]
