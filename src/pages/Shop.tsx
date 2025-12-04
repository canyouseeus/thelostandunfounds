/**
 * Shop Page
 * Fetches native products from our database
 */

import { useState, useEffect } from 'react';
import { ShoppingCart, Search, Filter, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { initAffiliateTracking, getAffiliateRef } from '../utils/affiliate-tracking';
import { getPayPalCheckoutUrl } from '../utils/checkout-utils';

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
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize affiliate tracking on page load
  useEffect(() => {
    initAffiliateTracking();
  }, []);

  // Fetch native products from our API
  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/shop/products');
        const data = await response.json();
        
        if (data.error) {
          setError(data.message || 'Failed to load products');
          setProducts([]);
        } else {
          setProducts(data.products || []);
        }
      } catch (err) {
        console.error('Error fetching products:', err);
        setError('Failed to load products. Please try again later.');
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="text-center mb-8 sm:mb-12">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4 text-white">SHOP</h1>
      </div>

      {/* Search and Filter */}
      <div className="mb-8 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 sm:py-2.5 bg-black/50 border-2 border-white/30 rounded-none text-white placeholder-white/50 text-base
                       hover:border-white/50 hover:bg-black/70 
                       focus:outline-none focus:ring-4 focus:ring-white/30 focus:border-white/60 focus:bg-black/80
                       transition-all duration-200 shadow-lg hover:shadow-white/10 focus:shadow-white/20
                       min-h-[44px] touch-action: manipulation"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="text-gray-400 w-5 h-5 flex-shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="flex-1 sm:flex-none px-4 py-3 sm:py-2.5 bg-black/50 border-2 border-white/30 rounded-none text-white text-base
                       hover:border-white/50 hover:bg-black/70 
                       focus:outline-none focus:ring-4 focus:ring-white/30 focus:border-white/60 focus:bg-black/80
                       transition-all duration-200 shadow-lg hover:shadow-white/10 focus:shadow-white/20 cursor-pointer
                       min-h-[44px] touch-action: manipulation"
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
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-white">Featured Products</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}

      {/* Regular Products */}
      {regularProducts.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-6 text-white">All Products</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {regularProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
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
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
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
    <div className="bg-black/50 border border-white/10 rounded-none p-6 hover:border-white/40 hover:bg-white/5 hover:shadow-[0_8px_30px_rgba(255,255,255,0.12)] hover:-translate-y-1 transition-all duration-300">
      {product.featured && (
        <div className="bg-yellow-400/20 text-yellow-400 text-xs font-semibold px-2 py-1 rounded-none inline-block mb-3">
          Featured
        </div>
      )}
      {imageUrl && (
        <div className="mb-4 aspect-square overflow-hidden rounded-none bg-white/5">
          <img 
            src={imageUrl} 
            alt={product.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <h3 className="text-lg sm:text-xl font-semibold mb-2 text-white line-clamp-2" title={product.title}>{product.title.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()}</h3>
      <p className="text-white/60 mb-4 text-sm line-clamp-2">{product.description}</p>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <div>
          {displayPrice === 0 ? (
            <span className="text-xl sm:text-2xl font-bold text-green-400">Free</span>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl sm:text-2xl font-bold text-white">
                ${displayPrice.toFixed(2)}
              </span>
              {displayComparePrice && displayComparePrice > displayPrice && (
                <span className="text-sm text-white/40 line-through">
                  ${displayComparePrice.toFixed(2)}
                </span>
              )}
            </div>
          )}
        </div>
        <a
          href="#"
          onClick={handleCheckoutClick}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-black px-4 py-3 sm:py-2 rounded-none hover:bg-white/90 transition-colors font-semibold text-sm sm:text-base min-h-[44px] touch-action: manipulation cursor-pointer"
        >
          <ShoppingCart className="w-4 h-4" />
          {displayPrice === 0 ? 'View' : 'Buy Now'}
        </a>
      </div>
      {!product.available && (
        <div className="mt-2 text-xs text-red-400">Out of Stock</div>
      )}
    </div>
  );
}

