import { useState, useEffect } from 'react'
import { ExternalLink, ShoppingBag, Loader2 } from 'lucide-react'
import { fourthwallService, type FourthwallProduct } from '../services/fourthwall'
import { productsService, type Product } from '../services/products'
import { getAffiliateRef, trackAffiliateClick } from '../utils/affiliate-tracking'
import { getCheckoutUrl } from '../utils/fourthwall-checkout'

interface CombinedProduct {
  id: string
  title: string
  description?: string
  price: number
  compareAtPrice?: number
  currency: string
  images: string[]
  handle: string
  available: boolean
  url?: string
  source: 'fourthwall' | 'local'
}

export default function Shop() {
  const [products, setProducts] = useState<CombinedProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadProducts()
    // Initialize affiliate tracking on page load
    getAffiliateRef()
  }, [])

  const loadProducts = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Fetch from both sources in parallel
      const [fourthwallResult, localResult] = await Promise.all([
        fourthwallService.getProducts(),
        productsService.getProducts(),
      ])

      // Debug logging
      console.log('Fourthwall result:', {
        productsCount: fourthwallResult.products?.length || 0,
        hasError: !!fourthwallResult.error,
        errorMessage: fourthwallResult.error?.message,
      })
      console.log('Local products result:', {
        productsCount: localResult.products?.length || 0,
        hasError: !!localResult.error,
      })
      
      // Step 5: Extract collection info from API response if available
      let collectionInfo: string | null = null
      try {
        const apiResponse = await fetch('/api/fourthwall/products').then(r => r.json()).catch(() => null)
        if (apiResponse?.collections && Array.isArray(apiResponse.collections)) {
          const collections = apiResponse.collections
          if (collections.length > 0) {
            collectionInfo = `Found ${collections.length} collection(s): ${collections.map((c: any) => `${c.name} (${c.productCount} products)`).join(', ')}`
          }
        }
      } catch (e) {
        // Ignore errors when fetching collection info
      }

      const combinedProducts: CombinedProduct[] = []
      const productIds = new Set<string>() // Track IDs to prevent duplicates

      // Add Fourthwall products
      if (fourthwallResult.products && fourthwallResult.products.length > 0) {
        fourthwallResult.products.forEach(p => {
          const productId = `fw-${p.id}`
          // Only add if not already added (deduplicate)
          if (!productIds.has(productId)) {
            productIds.add(productId)
            combinedProducts.push({
              id: productId,
              title: p.title,
              description: p.description,
              price: p.price,
              compareAtPrice: p.compareAtPrice,
              currency: p.currency,
              images: p.images,
              handle: p.handle,
              available: p.available,
              url: p.url || fourthwallService.getProductUrl(p.handle),
              source: 'fourthwall' as const,
            })
          }
        })
        console.log(`Added ${combinedProducts.filter(p => p.source === 'fourthwall').length} unique Fourthwall products`)
      } else if (fourthwallResult.error) {
        console.warn('Fourthwall products failed to load:', fourthwallResult.error.message)
      }

      // Add local products (only if not already added from Fourthwall)
      if (localResult.products && localResult.products.length > 0) {
        localResult.products.forEach(p => {
          const productId = `local-${p.id}`
          // Only add if not already added (deduplicate)
          if (!productIds.has(productId)) {
            productIds.add(productId)
            combinedProducts.push({
              id: productId,
              title: p.title,
              description: p.description,
              price: p.price,
              compareAtPrice: p.compare_at_price,
              currency: p.currency || 'USD',
              images: p.images.length > 0 ? p.images : (p.image_url ? [p.image_url] : []),
              handle: p.handle,
              available: p.available,
              url: p.fourthwall_url || `/products/${p.handle}`,
              source: 'local' as const,
            })
          }
        })
        console.log(`Added ${combinedProducts.filter(p => p.source === 'local').length} unique local products`)
      }

      setProducts(combinedProducts)
      console.log(`Total products loaded: ${combinedProducts.length}`)

      // Step 5: Show error messages with collection info
      if (fourthwallResult.error && localResult.error) {
        const errorMsg = `Failed to load products from both sources. Fourthwall: ${fourthwallResult.error.message}`
        setError(collectionInfo ? `${errorMsg}\n\n${collectionInfo}` : errorMsg)
      } else if (fourthwallResult.error) {
        // Always show Fourthwall error, even if local products exist
        const errorMsg = `Fourthwall products unavailable: ${fourthwallResult.error.message}`
        setError(collectionInfo ? `${errorMsg}\n\n${collectionInfo}` : errorMsg)
      } else if (localResult.error && combinedProducts.length === 0) {
        setError(`Failed to load local products: ${localResult.error.message}`)
      } else if (collectionInfo && combinedProducts.length === 0) {
        // Show collection info even if no products loaded
        setError(`No products found. ${collectionInfo}`)
      }
    } catch (err) {
      console.error('Error loading products:', err)
      setError(err instanceof Error ? err.message : 'Failed to load products')
      setProducts([])
    }
    
    setLoading(false)
  }

  const formatPrice = (price: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price)
  }

  /**
   * Clean description (server should already handle this, but keep as fallback)
   */
  const cleanDescription = (description: string | undefined): string => {
    if (!description) return ''
    // Descriptions should already be cleaned by the API, but if not, decode entities
    const textarea = document.createElement('textarea')
    textarea.innerHTML = description
    return (textarea.value || description).trim()
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <Loader2 className="w-12 h-12 text-white/50 animate-spin mb-4" />
          <p className="text-white/70">Loading products...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-white mb-4">
          SHOP
        </h1>
        <p className="text-xl text-white/80 mb-6">
          Discover our collection
        </p>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-8">
          <p className="text-red-400 text-sm whitespace-pre-line">{error}</p>
          <p className="text-white/60 text-xs mt-2">
            {error.includes('vercel dev') || error.includes('production') ? (
              <>
                <strong>Local Development:</strong> API routes only work in production or when using <code className="bg-white/10 px-1 rounded">npx vercel dev</code>.
                <br />
                To test the shop locally, either deploy to Vercel or run: <code className="bg-white/10 px-1 rounded">npx vercel dev</code>
              </>
            ) : error.includes('collection') || error.includes('Collection') ? (
              <>
                <strong>Collection Info:</strong> Check Vercel function logs to see collection details and handles.
                <br />
                If collections exist but products aren't loading, verify the collection handle format matches the API requirements.
              </>
            ) : (
              'Note: You may need to configure API access in your Fourthwall developer settings.'
            )}
          </p>
        </div>
      )}

      {/* Products Grid */}
      {products.length === 0 && !loading && !error && (
        <div className="text-center py-20">
          <ShoppingBag className="w-16 h-16 text-white/50 mx-auto mb-4" />
          <p className="text-white/70 text-lg mb-2">No products found</p>
          <p className="text-white/50 text-sm mb-4">
            Products will appear here once your Fourthwall store is connected.
          </p>
          {(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 max-w-md mx-auto mt-4">
              <p className="text-white/70 text-xs mb-2">
                <strong>Local Development:</strong> API routes don't work with <code className="bg-white/10 px-1 rounded">npm run dev</code>
              </p>
              <p className="text-white/60 text-xs">
                To see Fourthwall products locally, run: <code className="bg-white/10 px-1 rounded">npm run dev:api</code> or test in production.
              </p>
            </div>
          )}
        </div>
      )}

      {products.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => {
            const affiliateRef = getAffiliateRef()
            const productUrl = product.source === 'fourthwall' 
              ? getCheckoutUrl(product.handle)
              : product.url || `/products/${product.handle}`;
            
            return (
            <a
              key={product.id}
              href={productUrl}
              target={product.source === 'fourthwall' ? '_blank' : undefined}
              rel={product.source === 'fourthwall' ? 'noopener noreferrer' : undefined}
              onClick={() => {
                // Track affiliate click if affiliate ref exists
                if (affiliateRef) {
                  trackAffiliateClick(affiliateRef)
                }
              }}
              className="group bg-black border border-white/10 rounded-lg overflow-hidden hover:border-white/30 transition-all duration-300 flex flex-col"
            >
              {/* Product Image */}
              <div className="aspect-square bg-white/5 relative overflow-hidden">
                {product.images && product.images.length > 0 ? (
                  <img
                    src={product.images[0]}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      // Fallback if image fails to load
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingBag className="w-16 h-16 text-white/20" />
                  </div>
                )}
                {!product.available && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">Sold Out</span>
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="p-4 flex flex-col flex-grow">
                <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 group-hover:text-white/80 transition-colors">
                  {product.title}
                </h3>
                
                {product.description && (
                  <p className="text-white/60 text-sm mb-3 line-clamp-2 flex-grow">
                    {cleanDescription(product.description)}
                  </p>
                )}

                {/* Price */}
                <div className="flex items-center gap-2 mt-auto">
                  {product.compareAtPrice && product.compareAtPrice > product.price ? (
                    <>
                      <span className="text-lg font-bold text-white">
                        {formatPrice(product.price, product.currency)}
                      </span>
                      <span className="text-sm text-white/50 line-through">
                        {formatPrice(product.compareAtPrice, product.currency)}
                      </span>
                    </>
                  ) : (
                    <span className="text-lg font-bold text-white">
                      {formatPrice(product.price, product.currency)}
                    </span>
                  )}
                </div>

                {/* View Product Link */}
                <div className="mt-3 pt-3 border-t border-white/10">
                  <div className="flex items-center gap-2 text-white/70 group-hover:text-white transition-colors text-sm">
                    <span>View Product</span>
                    {product.source === 'fourthwall' && <ExternalLink className="w-4 h-4" />}
                  </div>
                </div>
              </div>
            </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
