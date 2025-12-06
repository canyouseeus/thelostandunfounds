/**
 * Shop Page
 * Fetches native products from our database
 */

import { useState, useEffect } from 'react';
import { ShoppingCart, Search, Filter, Loader2, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { initAffiliateTracking, getAffiliateRef } from '../utils/affiliate-tracking';
import { getPayPalCheckoutUrl } from '../utils/checkout-utils';
import { TEST_PRODUCTS } from '../data/test-products';
import { transformProduct } from '../../lib/fourthwall/utils';

const FOURTHWALL_BASE = 'https://storefront-api.fourthwall.com';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  currency: string;
  images: string[];
  handle: string;
  available: boolean;
  url: string;
  category?: string;
  featured?: boolean;
}

export default function Shop() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const FOURTHWALL_BASE = 'https://storefront-api.fourthwall.com';

  // Initialize affiliate tracking on page load
  useEffect(() => {
    initAffiliateTracking();
  }, []);

  // Fetch native products from our API
  useEffect(() => {
    // In dev, bypass API and load local test products so the page
    // works even when API routes aren't running (e.g., `vite` without `vercel dev`).
    if (import.meta.env.DEV) {
      setProducts(TEST_PRODUCTS);
      setLoading(false);
      return;
    }

    async function fetchProducts() {
      try {
        setLoading(true);
        setError(null);

        // Try server API endpoints first (primary path + explicit Fourthwall path)
        const apiProducts = await fetchProductsFromApi();
        if (apiProducts.length > 0) {
          setProducts(apiProducts);
          return;
        }

        // If API returns empty, try direct Fourthwall with public token (prod-only path)
        const fallbackToken = import.meta.env.VITE_FOURTHWALL_STOREFRONT_TOKEN;
        if (fallbackToken) {
          const fwProducts = await fetchFourthwallDirect(fallbackToken);
          if (fwProducts.length > 0) {
            setProducts(fwProducts);
            return;
          }
        }

        setError('Failed to load products. Please try again.');
        setProducts([]);
      } catch (err) {
        console.error('Error fetching products via API, trying Fourthwall direct fallback:', err);
        setError('Failed to load products. Please try again.');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  // Extract unique categories from products
  const categories = ['all', ...Array.from(new Set(products.map(p => p.category || 'general').filter(Boolean)))];

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || (product.category || 'general') === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredProducts = filteredProducts.filter((p) => p.featured);
  const regularProducts = filteredProducts.filter((p) => !p.featured);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-white" />
            <p className="text-white/70">Loading products...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-12">
          <p className="text-red-400 text-lg mb-2">Error loading products</p>
          <p className="text-white/60">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Header */}
      <div className="text-center space-y-3 sm:space-y-4">
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold text-white">SHOP</h1>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        {/** keep controls consistent sizing */}
        {/** shared style for inputs/selects */}
        {/** note: using min-h-[48px] for parity */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 sm:py-2.5 bg-black/60 border border-white rounded-none text-white placeholder-white/50 text-base
                       hover:border-white hover:bg-black/70 
                       focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white focus:bg-black/80
                       transition-all duration-150 shadow-lg hover:shadow-white/10 focus:shadow-white/20
                       min-h-[48px] touch-action: manipulation"
          />
        </div>
        <div className="flex items-center sm:w-56 relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 flex-shrink-0 pointer-events-none" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full pl-10 pr-4 py-3 sm:py-2.5 bg-black/60 border border-white rounded-none text-white text-base
                       hover:border-white hover:bg-black/70 
                       focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white focus:bg-black/80
                       transition-all duration-150 shadow-lg hover:shadow-white/10 focus:shadow-white/20 cursor-pointer
                       min-h-[48px] touch-action: manipulation appearance-none"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <div className="space-y-4 sm:space-y-6">
          <h2 className="text-xl sm:text-2xl font-bold text-white">Featured Products</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} onOpen={() => setSelectedProduct(product)} />
            ))}
          </div>
        </div>
      )}

      {/* Regular Products */}
      {regularProducts.length > 0 && (
        <div className="space-y-4 sm:space-y-6">
          <h2 className="text-xl sm:text-2xl font-bold text-white">All Products</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {regularProducts.map((product) => (
              <ProductCard key={product.id} product={product} onOpen={() => setSelectedProduct(product)} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-white/70 text-lg">No products found</p>
          <p className="text-white/50 mt-2">
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          affiliateRef={getAffiliateRef()}
        />
      )}
    </div>
  );
}

async function fetchProductsFromApi(): Promise<Product[]> {
  const endpoints = ['/api/shop/products', '/api/shop/fourthwall/products'];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, { cache: 'no-store' });
      const contentType = response.headers.get('content-type') || '';
      const bodyText = await response.text();

      if (!response.ok) {
        console.warn(`API ${endpoint} returned ${response.status}: ${bodyText.slice(0, 200)}`);
        continue;
      }

      if (!contentType.includes('application/json')) {
        console.warn(
          `API ${endpoint} unexpected content type: ${contentType}. Body: ${bodyText.slice(
            0,
            200
          )}`
        );
        continue;
      }

      let data: any = null;
      try {
        data = JSON.parse(bodyText);
      } catch (parseErr) {
        console.warn(`API ${endpoint} JSON parse failed:`, parseErr);
        continue;
      }

      if (data.error) {
        console.warn(`API ${endpoint} error payload: ${data.message || data.error}`);
        continue;
      }

      const products = data.products || [];
      if (products.length > 0) {
        return products;
      }
    } catch (error) {
      console.warn(`API ${endpoint} failed:`, error);
    }
  }

  return [];
}

async function fetchFourthwallDirect(token: string): Promise<Product[]> {
  const endpoints = [
    `${FOURTHWALL_BASE}/v1/products?storefront_token=${token}`,
    `${FOURTHWALL_BASE}/v1/shop/feed?storefront_token=${token}`,
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, { headers: { Accept: 'application/json' } });
      const contentType = response.headers.get('content-type') || '';
      const body = await response.text();

      if (!contentType.includes('application/json')) {
        console.warn(`Fourthwall fallback unexpected content type ${contentType} for ${endpoint}`);
        continue;
      }

      if (!response.ok) {
        console.warn(`Fourthwall fallback ${endpoint} returned ${response.status}: ${body.slice(0, 200)}`);
        continue;
      }

      const data = JSON.parse(body);
      const offers = extractOffers(data);
      if (offers.length === 0) {
        continue;
      }

      return offers.map((offer) => {
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

function ProductCard({ product, onOpen }: { product: Product; onOpen: () => void }) {
  const { user } = useAuth();
  const imageUrl = product.images && product.images.length > 0 ? product.images[0] : null;
  const displayPrice = product.price; // Prices are already in dollars from API
  const displayComparePrice = product.compareAtPrice || null;
  
  // Get affiliate ref for tracking
  const affiliateRef = getAffiliateRef();

  const handleCheckoutClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    
    // Track click if affiliate ref exists
    if (affiliateRef) {
      import('../utils/affiliate-tracking').then(({ trackAffiliateClick }) => {
        trackAffiliateClick(affiliateRef);
      });
    }

    // For native products, use PayPal checkout
    try {
      console.log('🛒 Starting PayPal checkout for product:', {
        id: product.id,
        title: product.title,
        price: product.price,
        currency: product.currency,
        affiliateRef,
      });
      
      const { approvalUrl } = await getPayPalCheckoutUrl({
        amount: product.price,
        currency: product.currency || 'USD',
        description: product.title,
        productId: product.id,
        affiliateRef,
      });
      
      console.log('✅ PayPal checkout URL received:', approvalUrl);
      
      // Redirect to PayPal approval URL
      window.location.href = approvalUrl;
    } catch (error: any) {
      console.error('❌ Error creating PayPal checkout:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response,
      });
      
      const errorMessage = error.message || 'Failed to start checkout. Please try again.';
      alert(`Checkout Error: ${errorMessage}\n\nCheck browser console for details.`);
    }
  };

  return (
    <div
      className="bg-black/70 rounded-none hover:bg-white/5 hover:shadow-[0_8px_30px_rgba(255,255,255,0.12)] transition-all duration-300 h-full cursor-pointer"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      {imageUrl && (
        <div className="relative aspect-[4/5] sm:aspect-[3/4] overflow-hidden bg-white/5">
          <img
            src={imageUrl}
            alt={product.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute top-3 left-3 flex items-center gap-2">
            {product.featured && (
              <div className="bg-yellow-400/20 text-yellow-300 text-[11px] font-semibold px-2 py-1 rounded-none uppercase tracking-[0.08em]">
                Featured
              </div>
            )}
            {product.category && (
              <div className="bg-white/10 text-white text-[11px] px-2 py-1 rounded-none uppercase tracking-[0.08em]">
                {product.category}
              </div>
            )}
          </div>
          <div className="absolute bottom-3 left-3 right-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3
                className="text-lg sm:text-xl font-semibold text-white line-clamp-2"
                title={product.title}
              >
                {product.title.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()}
              </h3>
              <div className="mt-1 flex items-center gap-2 text-white">
                {displayPrice === 0 ? (
                  <span className="text-base sm:text-lg font-semibold text-green-300">Free</span>
                ) : (
                  <>
                    <span className="text-base sm:text-lg font-semibold">${displayPrice.toFixed(2)}</span>
                    {displayComparePrice && displayComparePrice > displayPrice && (
                      <span className="text-xs text-white/60 line-through">
                        ${displayComparePrice.toFixed(2)}
                      </span>
                    )}
                  </>
                )}
              </div>
              <p className="text-white/70 text-sm mt-1 line-clamp-2">
                {product.description}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductModal({
  product,
  onClose,
  affiliateRef,
}: {
  product: Product;
  onClose: () => void;
  affiliateRef: string | null;
}) {
  const { user } = useAuth();
  const imageUrl = product.images && product.images.length > 0 ? product.images[0] : null;
  const displayPrice = product.price;
  const displayComparePrice = product.compareAtPrice || null;

  const handleCheckoutClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (affiliateRef) {
      import('../utils/affiliate-tracking').then(({ trackAffiliateClick }) => {
        trackAffiliateClick(affiliateRef);
      });
    }
    try {
      const { approvalUrl } = await getPayPalCheckoutUrl({
        amount: product.price,
        currency: product.currency || 'USD',
        description: product.title,
        productId: product.id,
        affiliateRef,
      });
      window.location.href = approvalUrl;
    } catch (error: any) {
      console.error('❌ Error creating PayPal checkout:', error);
      alert(`Checkout Error: ${error.message || 'Failed to start checkout. Please try again.'}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-black/90 border border-white rounded-none shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-white/80 hover:text-white flex items-center justify-center w-10 h-10"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid md:grid-cols-2 gap-0">
          {imageUrl && (
            <div className="relative bg-white/5">
              <img
                src={imageUrl}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {product.featured && (
                  <span className="bg-yellow-400/20 text-yellow-300 text-[11px] font-semibold px-2 py-1 rounded-none uppercase tracking-[0.08em]">
                    Featured
                  </span>
                )}
                {product.category && (
                  <span className="bg-white/10 text-white text-[11px] px-2 py-1 rounded-none uppercase tracking-[0.08em]">
                    {product.category}
                  </span>
                )}
              </div>
              <h2 className="text-2xl sm:text-3xl font-semibold text-white">
                {product.title}
              </h2>
              <div className="flex items-center gap-3 text-white">
                {displayPrice === 0 ? (
                  <span className="text-2xl font-bold text-green-400">Free</span>
                ) : (
                  <>
                    <span className="text-2xl font-bold">${displayPrice.toFixed(2)}</span>
                    {displayComparePrice && displayComparePrice > displayPrice && (
                      <span className="text-sm text-white/50 line-through">
                        ${displayComparePrice.toFixed(2)}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            <p className="text-white/80 leading-relaxed">
              {product.description}
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
              <a
                href="#"
                onClick={handleCheckoutClick}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white text-black px-4 py-3 sm:py-2 rounded-none hover:bg-white/90 transition-colors font-semibold text-sm sm:text-base min-h-[44px] touch-action: manipulation cursor-pointer"
              >
                <ShoppingCart className="w-4 h-4" />
                {displayPrice === 0 ? 'View' : 'Buy Now'}
              </a>
              {!product.available && (
                <div className="text-xs text-red-400">Out of Stock</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

