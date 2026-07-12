import { createClient } from '@supabase/supabase-js'

/**
 * Fetches the active print-on-demand catalog and maps each row into the
 * shape Shop.tsx's Product interface expects, plus the extra fields
 * ProductModal needs to know this is a Prodigi-fulfilled physical item
 * (mockup template/bounds, sku, cost for the Strike-path commission calc).
 */
export async function getProdigiShopProducts(): Promise<any[]> {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SUPABASE_ANON_KEY ||
        process.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
        console.warn('⚠️ Prodigi products: Supabase not configured, skipping')
        return []
    }

    try {
        const supabase = createClient(supabaseUrl, supabaseKey)
        const { data, error } = await supabase
            .from('prodigi_products')
            .select('*')
            .eq('status', 'active')
            .order('featured', { ascending: false })

        if (error) {
            console.error('❌ Failed to fetch prodigi_products:', error)
            return []
        }

        return (data || []).map((row: any) => ({
            id: `prodigi-${row.slug}`,
            title: row.title,
            description: row.description || '',
            price: Number(row.price),
            currency: row.currency || 'USD',
            images: row.image_url ? [row.image_url] : [],
            handle: row.slug,
            available: true,
            url: '#',
            category: row.category || 'prints',
            featured: !!row.featured,
            stripePriceId: row.stripe_price_id || undefined,
            productKind: 'physical' as const,
            fulfillment: 'prodigi' as const,
            prodigiProductId: row.id,
            prodigiSku: row.sku,
            mockupTemplateUrl: row.mockup_template_url || null,
            mockupBounds: row.mockup_bounds || null,
        }))
    } catch (err: any) {
        console.error('❌ getProdigiShopProducts failed:', err?.message || err)
        return []
    }
}
