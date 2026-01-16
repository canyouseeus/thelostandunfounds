import { useState, useEffect, useMemo } from 'react';
import { Product } from '../types/shop';
import { fetchProducts } from '../lib/api-handlers/_shop-handler';
import { TEST_PRODUCTS } from '../data/test-products';

export function useProducts() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');

    useEffect(() => {
        async function load() {
            if (import.meta.env.DEV) {
                setProducts(TEST_PRODUCTS);
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const data = await fetchProducts();
                if (data.length === 0) {
                    setError('No products available at this time.');
                } else {
                    setProducts(data);
                }
            } catch (err) {
                setError('Failed to load products.');
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    const categories = useMemo(() => {
        return ['all', ...Array.from(new Set(products.map(p => p.category || 'general').filter(Boolean)))];
    }, [products]);

    const filteredProducts = useMemo(() => {
        return products.filter((product) => {
            const matchesSearch =
                product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                product.description.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory =
                selectedCategory === 'all' || (product.category || 'general') === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [products, searchQuery, selectedCategory]);

    return {
        products,
        filteredProducts,
        categories,
        loading,
        error,
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory
    };
}
