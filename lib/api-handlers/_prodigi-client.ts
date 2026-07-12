/**
 * Prodigi Print API client.
 *
 * Docs: https://www.prodigi.com/print-api/docs/reference/
 * Base URL is sandbox unless PRODIGI_ENVIRONMENT=live. Auth is a static
 * X-API-Key header (separate keys per environment).
 */

export interface ProdigiAddress {
    line1: string
    line2?: string
    postalOrZipCode: string
    countryCode: string
    townOrCity: string
    stateOrCounty?: string
}

export interface ProdigiRecipient {
    name: string
    email?: string
    phoneNumber?: string
    address: ProdigiAddress
}

export interface ProdigiAsset {
    printArea: string
    url: string
}

export interface ProdigiOrderItem {
    sku: string
    copies: number
    sizing?: 'fillPrintArea' | 'fitPrintArea' | 'stretchToPrintArea'
    attributes?: Record<string, string>
    assets: ProdigiAsset[]
}

export interface CreateProdigiOrderInput {
    merchantReference: string
    idempotencyKey: string
    shippingMethod?: 'Budget' | 'Standard' | 'StandardPlus' | 'Express' | 'Overnight'
    recipient: ProdigiRecipient
    items: ProdigiOrderItem[]
    callbackUrl?: string
    metadata?: Record<string, unknown>
}

function getConfig(forceLive?: boolean) {
    const apiKey = process.env.PRODIGI_API_KEY
    if (!apiKey) {
        throw new Error('PRODIGI_API_KEY not configured')
    }
    const isLive = forceLive || (process.env.PRODIGI_ENVIRONMENT || 'sandbox').toLowerCase() === 'live'
    const baseUrl = isLive ? 'https://api.prodigi.com/v4.0' : 'https://api.sandbox.prodigi.com/v4.0'
    return { apiKey, baseUrl }
}

/**
 * `forceLive` is only ever passed by read-only lookups (getProdigiProduct /
 * getProdigiQuote) for the admin catalog-verification tool — it does NOT
 * affect createProdigiOrder, which stays governed purely by
 * PRODIGI_ENVIRONMENT so real checkouts can never be flipped to live
 * fulfillment as a side effect of verifying the catalog.
 */
async function prodigiFetch(path: string, init: RequestInit = {}, forceLive?: boolean) {
    const { apiKey, baseUrl } = getConfig(forceLive)
    const response = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json',
            ...(init.headers || {}),
        },
    })
    const text = await response.text()
    let body: any = null
    try {
        body = text ? JSON.parse(text) : null
    } catch {
        body = { raw: text }
    }
    if (!response.ok) {
        const message = body?.outcome || body?.message || `Prodigi API returned ${response.status}`
        const err: any = new Error(message)
        err.status = response.status
        err.body = body
        throw err
    }
    return body
}

/**
 * Create a Prodigi order. Idempotent via idempotencyKey — a retry with the
 * same key returns the original order (outcome: 'AlreadyExists').
 */
export async function createProdigiOrder(input: CreateProdigiOrderInput) {
    return prodigiFetch('/orders', {
        method: 'POST',
        body: JSON.stringify({
            merchantReference: input.merchantReference,
            idempotencyKey: input.idempotencyKey,
            shippingMethod: input.shippingMethod || 'Standard',
            recipient: input.recipient,
            items: input.items,
            ...(input.callbackUrl ? { callbackUrl: input.callbackUrl } : {}),
            ...(input.metadata ? { metadata: input.metadata } : {}),
        }),
    })
}

export async function getProdigiOrder(prodigiOrderId: string) {
    return prodigiFetch(`/orders/${encodeURIComponent(prodigiOrderId)}`, { method: 'GET' })
}

export async function getProdigiProduct(sku: string, opts?: { forceLive?: boolean }) {
    return prodigiFetch(`/products/${encodeURIComponent(sku)}`, { method: 'GET' }, opts?.forceLive)
}

export interface ProdigiQuoteInput {
    shippingMethod?: 'Budget' | 'Standard' | 'StandardPlus' | 'Express' | 'Overnight'
    destinationCountryCode: string
    currencyCode?: string
    items: { sku: string; copies: number; attributes?: Record<string, string> }[]
}

export async function getProdigiQuote(input: ProdigiQuoteInput, opts?: { forceLive?: boolean }) {
    return prodigiFetch(
        '/quotes',
        {
            method: 'POST',
            body: JSON.stringify({
                shippingMethod: input.shippingMethod || 'Standard',
                destinationCountryCode: input.destinationCountryCode,
                currencyCode: input.currencyCode || 'USD',
                items: input.items.map((item) => ({
                    sku: item.sku,
                    copies: item.copies,
                    ...(item.attributes ? { attributes: item.attributes } : {}),
                    assets: [{ printArea: 'default' }],
                })),
            }),
        },
        opts?.forceLive
    )
}
