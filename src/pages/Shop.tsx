import { useState, useEffect } from 'react'
import { ExternalLink, ShoppingBag, Loader2 } from 'lucide-react'
import { fourthwallService, type FourthwallProduct } from '../services/fourthwall'
import { productsService, type Product } from '../services/products'

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

      const combinedProducts: CombinedProduct[] = []

      // Add Fourthwall products
      if (fourthwallResult.products) {
        combinedProducts.push(...fourthwallResult.products.map(p => ({
          id: `fw-${p.id}`,
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
        })))
      }

      // Add local products
      if (localResult.products) {
        combinedProducts.push(...localResult.products.map(p => ({
          id: `local-${p.id}`,
          title: p.title,
          description: p.description,
          price: p.price,
          compareAtPrice: p.compare_at_price,
          currency: p.currency,
          images: p.images.length > 0 ? p.images : (p.image_url ? [p.image_url] : []),
          handle: p.handle,
          available: p.available,
          url: p.fourthwall_url || `/products/${p.handle}`,
          source: 'local' as const,
        })))
      }

      setProducts(combinedProducts)

      // Show error if both failed
      if (fourthwallResult.error && localResult.error) {
        setError('Failed to load products from both sources')
      } else if (fourthwallResult.error) {
        // Only show warning if local products exist
        if (localResult.products.length === 0) {
          setError(fourthwallResult.error.message)
        }
      }
    } catch (err) {
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
          Shop
        </h1>
        <p className="text-xl text-white/80 mb-6">
          Discover our collection
        </p>
        <a
          href={fourthwallService.getStoreUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm"
        >
          View full store on Fourthwall
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-8">
          <p className="text-red-400 text-sm">{error}</p>
          <p className="text-white/60 text-xs mt-2">
            {error.includes('vercel dev') || error.includes('production') ? (
              <>
                <strong>Local Development:</strong> API routes only work in production or when using <code className="bg-white/10 px-1 rounded">npx vercel dev</code>.
                <br />
                To test the shop locally, either deploy to Vercel or run: <code className="bg-white/10 px-1 rounded">npx vercel dev</code>
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
          <p className="text-white/50 text-sm">
            Products will appear here once your Fourthwall store is connected.
          </p>
        </div>
      )}

      {products.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <a
              key={product.id}
              href={product.url || (product.source === 'fourthwall' ? fourthwallService.getProductUrl(product.handle) : `/products/${product.handle}`)}
              target={product.source === 'fourthwall' ? '_blank' : undefined}
              rel={product.source === 'fourthwall' ? 'noopener noreferrer' : undefined}
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
                    {product.description}
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
          ))}
        </div>
      )}
    </div>
  )
}
