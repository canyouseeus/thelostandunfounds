// Development API handler for Vite dev server
// This file is used when running 'npm run dev' locally
// In production, Vercel uses products.ts

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    // In dev mode, read from .env.local
    const fs = require('fs')
    const path = require('path')
    const envPath = path.join(process.cwd(), '.env.local')
    
    let storefrontToken = process.env.FOURTHWALL_STOREFRONT_TOKEN
    
    // Try to read from .env.local if not in process.env
    if (!storefrontToken && fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8')
      const match = envContent.match(/FOURTHWALL_STOREFRONT_TOKEN=(.+)/)
      if (match) {
        storefrontToken = match[1].trim()
      }
    }

    const collectionHandle = req.query.collection || 'all'
    
    if (!storefrontToken) {
      return res.status(200).json({
        products: [],
        message: 'FOURTHWALL_STOREFRONT_TOKEN not configured. Get your token from: https://thelostandunfounds-shop.fourthwall.com/admin/dashboard/settings/for-developers',
      })
    }
    
    // Use the official Fourthwall Storefront API
    const apiUrl = `https://storefront-api.fourthwall.com/v1/collections/${collectionHandle}/offers?storefront_token=${storefrontToken}`
    
    const fetch = (await import('node-fetch')).default
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      console.error(`Fourthwall API error: ${response.status} ${response.statusText}`)
      return res.status(200).json({
        products: [],
        message: `Fourthwall API error: ${response.status} ${response.statusText}. Check your storefront token.`,
      })
    }

    const data = await response.json()
    const offers = data.offers || []
    
    return res.status(200).json({
      products: offers.map((offer) => {
        const variant = offer.variants && offer.variants.length > 0 ? offer.variants[0] : null
        const price = variant?.unitPrice?.value || 0
        const currency = variant?.unitPrice?.currency || 'USD'
        const compareAtPrice = variant?.compareAtPrice?.value
        
        return {
          id: offer.id || offer.slug || '',
          title: offer.name || offer.title || 'Untitled Product',
          description: offer.description || '',
          price: price,
          compareAtPrice: compareAtPrice,
          currency: currency,
          images: offer.images || (offer.image ? [offer.image] : []),
          handle: offer.slug || offer.handle || offer.id || '',
          available: offer.available !== false,
          variants: offer.variants || [],
          url: `https://thelostandunfounds-shop.fourthwall.com/products/${offer.slug || offer.handle || offer.id}`,
        }
      }),
    })
  } catch (error) {
    console.error('Error fetching Fourthwall products:', error)
    return res.status(500).json({
      error: 'Failed to fetch products',
      message: error.message || 'Unknown error',
    })
  }
}
