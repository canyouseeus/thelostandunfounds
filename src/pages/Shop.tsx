/**
 * Shop Page
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Star, Search, Filter } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image?: string;
  category: string;
  rating: number;
  reviews: number;
  featured?: boolean;
}

export default function Shop() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const products: Product[] = [
    {
      id: 1,
      name: 'Premium Download Tool',
      description: 'Unlimited downloads with HD quality and no watermarks',
      price: 9.99,
      category: 'tools',
      rating: 4.8,
      reviews: 234,
      featured: true,
    },
    {
      id: 2,
      name: 'API Access Package',
      description: '10,000 API requests per day for developers',
      price: 19.99,
      category: 'tools',
      rating: 4.9,
      reviews: 156,
      featured: true,
    },
    {
      id: 3,
      name: 'Video Converter Pro',
      description: 'Convert videos to any format with batch processing',
      price: 14.99,
      category: 'tools',
      rating: 4.7,
      reviews: 189,
    },
    {
      id: 4,
      name: 'Content Creator Bundle',
      description: 'All tools + priority support + early access',
      price: 29.99,
      category: 'bundles',
      rating: 5.0,
      reviews: 98,
      featured: true,
    },
    {
      id: 5,
      name: 'Basic Download Tool',
      description: '5 downloads per day with standard quality',
      price: 0,
      category: 'tools',
      rating: 4.5,
      reviews: 567,
    },
    {
      id: 6,
      name: 'Enterprise License',
      description: 'Unlimited everything for teams and businesses',
      price: 99.99,
      category: 'enterprise',
      rating: 4.9,
      reviews: 45,
    },
  ];

  const categories = ['all', 'tools', 'bundles', 'enterprise'];

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredProducts = filteredProducts.filter((p) => p.featured);
  const regularProducts = filteredProducts.filter((p) => !p.featured);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Shop</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Discover our premium tools and services to enhance your workflow
        </p>
      </div>

      {/* Search and Filter */}
      <div className="mb-8 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="text-gray-400 w-5 h-5" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          <h2 className="text-2xl font-bold mb-6">Featured Products</h2>
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
          <h2 className="text-2xl font-bold mb-6">All Products</h2>
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
          <p className="text-gray-500 text-lg">No products found</p>
          <p className="text-gray-400 mt-2">
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const { user } = useAuth();

  return (
    <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
      {product.featured && (
        <div className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded-full inline-block mb-3">
          Featured
        </div>
      )}
      <h3 className="text-xl font-semibold mb-2">{product.name}</h3>
      <p className="text-gray-600 mb-4 text-sm">{product.description}</p>
      <div className="flex items-center gap-1 mb-4">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${
              i < Math.floor(product.rating)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
        <span className="text-sm text-gray-600 ml-2">
          {product.rating} ({product.reviews} reviews)
        </span>
      </div>
      <div className="flex items-center justify-between">
        <div>
          {product.price === 0 ? (
            <span className="text-2xl font-bold text-green-600">Free</span>
          ) : (
            <span className="text-2xl font-bold">${product.price}</span>
          )}
        </div>
        <Link
          to={user ? `/pricing` : `/`}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <ShoppingCart className="w-4 h-4" />
          {product.price === 0 ? 'Get Started' : 'Buy Now'}
        </Link>
      </div>
    </div>
  );
}

