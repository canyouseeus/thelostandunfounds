import { Product } from '../../types/shop';
import { transformProduct } from '../../../lib/fourthwall/utils';

const FOURTHWALL_BASE = 'https://storefront-api.fourthwall.com';

/**
 * Fetches products from primary API endpoints or fallbacks
 */
export async function fetchProducts(): Promise<Product[]> {
    const endpoints = ['/api/shop/products', '/api/shop/fourthwall/products'];

    for (const endpoint of endpoints) {
        try {
            const response = await fetch(endpoint, { cache: 'no-store' });
            if (!response.ok) continue;

            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) continue;

            const data = await response.json();
            if (data.error) continue;

            const products = data.products || [];
            if (products.length > 0) return products;
        } catch (error) {
            console.warn(`API ${endpoint} failed:`, error);
        }
    }

    // Fallback to direct Fourthwall if API routes are missing (prod-only)
    const fallbackToken = import.meta.env.VITE_FOURTHWALL_STOREFRONT_TOKEN;
    if (fallbackToken) {
        return fetchFourthwallDirect(fallbackToken);
    }

    return [];
}

/**
 * Direct fallback to Fourthwall Storefront API
 */
async function fetchFourthwallDirect(token: string): Promise<Product[]> {
    const endpoints = [
        `${FOURTHWALL_BASE}/v1/products?storefront_token=${token}`,
        `${FOURTHWALL_BASE}/v1/shop/feed?storefront_token=${token}`,
    ];

    for (const endpoint of endpoints) {
        try {
            const response = await fetch(endpoint, { headers: { Accept: 'application/json' } });
            if (!response.ok) continue;

            const data = await response.json();
            const offers = extractOffers(data);
            if (offers.length === 0) continue;

            return offers.map((offer: any) => {
                const transformed = transformProduct(offer);
                return {
                    id: transformed.id,
                    title: transformed.title,
                    description: transformed.description,
                    price: transformed.price,
                    compareAtPrice: transformed.compareAtPrice,
                    currency: transformed.currency,
                    images: transformed.images,
                    handle: transformed.handle,
                    available: transformed.available,
                    url: transformed.url,
                };
            });
        } catch (error) {
            console.warn(`Fourthwall fallback failed for ${endpoint}:`, error);
        }
    }

    return [];
}

function extractOffers(data: any): any[] {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.offers)) return data.offers;
    if (Array.isArray(data.products)) return data.products;
    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data.items)) return data.items;
    if (Array.isArray(data.results)) return data.results;
    return [];
}
