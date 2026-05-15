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
