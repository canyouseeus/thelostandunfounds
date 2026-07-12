import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { getProdigiProduct, getProdigiQuote } from './_prodigi-client.js'

const ADMIN_EMAILS = ['thelostandunfounds@gmail.com', 'admin@thelostandunfounds.com']

function isAdmin(req: VercelRequest): boolean {
    const email = ((req.headers['x-admin-email'] as string) || '').toLowerCase()
    if (ADMIN_EMAILS.includes(email)) return true
    const host = req.headers.host || ''
    return host.includes('localhost') || host.includes('127.0.0.1')
}

interface SkuCheckResult {
    sku: string
    sources: string[]
    exists: boolean
    error?: string
    baseCost?: number
    currency?: string
    shippingCost?: number
    quoteError?: string
}

function addSku(map: Map<string, string[]>, sku: string | null | undefined, source: string) {
    if (!sku) return
    const existing = map.get(sku)
    if (existing) existing.push(source)
    else map.set(sku, [source])
}

/**
 * GET/POST /api/prodigi/verify-catalog
 *
 * Admin diagnostics: checks every SKU referenced by print_catalog_options
 * and prodigi_products against the live Prodigi API (GET /products/{sku})
 * and, for SKUs that exist, gets a real cost via POST /quotes (US, 1 copy).
 *
 * Runs server-side specifically because PRODIGI_API_KEY is a Vercel
 * "Sensitive" env var — it's available to this running function via
 * process.env, but not retrievable through the Vercel CLI/dashboard for a
 * human or local script to read directly. This endpoint is the only way to
 * exercise that key against Prodigi's API outside of the actual checkout
 * flow, so it's kept as permanent tooling (not a one-off script) for
 * whenever the catalog changes.
 *
 * Forces `forceLive: true` on both lookup calls: Prodigi's sandbox
 * dashboard/credentials are defunct (only a live key exists), and the two
 * calls made here (GET /products, POST /quotes) are read-only regardless
 * of environment — no order is ever created. This does NOT affect
 * createProdigiOrder, which stays on PRODIGI_ENVIRONMENT (sandbox by
 * default) so real checkouts can't be flipped to live fulfillment as a
 * side effect of running this.
 *
 * Does not write to the database — returns a report for a human (or the
 * admin UI's "Verify Catalog" button) to act on.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Email')
    if (req.method === 'OPTIONS') return res.status(200).end()
    if (!isAdmin(req)) return res.status(403).json({ error: 'Admin access required' })
    if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    if (!process.env.PRODIGI_API_KEY) {
        return res.status(500).json({ error: 'PRODIGI_API_KEY not configured on this deployment' })
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseKey) return res.status(500).json({ error: 'Database not configured' })

    try {
        const supabase = createClient(supabaseUrl, supabaseKey)

        const [{ data: options, error: optionsError }, { data: products, error: productsError }] = await Promise.all([
            supabase.from('print_catalog_options').select('id, size_label, framed, frame_color, sku_landscape, sku_portrait'),
            supabase.from('prodigi_products').select('id, title, sku'),
        ])

        if (optionsError) return res.status(500).json({ error: optionsError.message })
        if (productsError) return res.status(500).json({ error: productsError.message })

        const skuSources = new Map<string, string[]>()
        const skuAttributes = new Map<string, Record<string, string> | undefined>()

        for (const o of options || []) {
            const attrs = o.framed ? { color: o.frame_color || 'Black' } : undefined
            addSku(skuSources, o.sku_landscape, `print_catalog_options: ${o.size_label} (landscape)`)
            addSku(skuSources, o.sku_portrait, `print_catalog_options: ${o.size_label} (portrait)`)
            if (o.sku_landscape) skuAttributes.set(o.sku_landscape, attrs)
            if (o.sku_portrait) skuAttributes.set(o.sku_portrait, attrs)
        }
        for (const p of products || []) {
            addSku(skuSources, p.sku, `prodigi_products: ${p.title}`)
        }

        const results: SkuCheckResult[] = []

        for (const [sku, sources] of skuSources.entries()) {
            const result: SkuCheckResult = { sku, sources, exists: false }

            try {
                await getProdigiProduct(sku, { forceLive: true })
                result.exists = true
            } catch (err: any) {
                result.exists = false
                result.error = err?.message || 'Product lookup failed'
                results.push(result)
                continue
            }

            try {
                const quote = await getProdigiQuote(
                    {
                        destinationCountryCode: 'US',
                        currencyCode: 'USD',
                        items: [{ sku, copies: 1, attributes: skuAttributes.get(sku) }],
                    },
                    { forceLive: true }
                )
                const q = quote?.quotes?.[0]
                const item = q?.items?.[0]
                if (item?.unitCost) {
                    result.baseCost = Number(item.unitCost.amount)
                    result.currency = item.unitCost.currency
                }
                if (q?.costSummary?.shipping) {
                    result.shippingCost = Number(q.costSummary.shipping.amount)
                }
                if (!item?.unitCost) {
                    result.quoteError = `Quote returned no unitCost — raw: ${JSON.stringify(quote).slice(0, 300)}`
                }
            } catch (err: any) {
                result.quoteError = err?.message || 'Quote failed'
            }

            results.push(result)
        }

        return res.status(200).json({ results, checkedAt: new Date().toISOString() })
    } catch (error: any) {
        console.error('❌ prodigi-verify-catalog error:', error)
        return res.status(500).json({ error: error.message })
    }
}
