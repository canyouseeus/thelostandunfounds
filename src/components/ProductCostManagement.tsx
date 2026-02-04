/**
 * Product Cost Management Component
 * Admin component for managing product costs for profit tracking
 */

import { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon, CurrencyDollarIcon, CubeIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { LoadingSpinner } from './Loading';

interface ProductCost {
  id: string;
  product_id: string;
  variant_id: string | null;
  source: 'local' | 'paypal';
  cost: number;
  created_at: string;
  updated_at: string;
}

export function ProductCostManagement() {
  const [costs, setCosts] = useState<ProductCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCost, setEditingCost] = useState<ProductCost | null>(null);
  const [formData, setFormData] = useState({
    product_id: '',
    variant_id: '',
    source: 'local' as 'local' | 'paypal',
    cost: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadCosts();
  }, []);

  const loadCosts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/product-costs');
      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setCosts([]);
      } else {
        setCosts(data.data || []);
      }
    } catch (err) {
      console.error('Error loading product costs:', err);
      setError('Failed to load product costs');
      setCosts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const cost = parseFloat(formData.cost);
      if (isNaN(cost) || cost < 0) {
        setError('Cost must be a valid number >= 0');
        return;
      }

      const payload = {
        productId: formData.product_id,
        variantId: formData.variant_id || null,
        source: formData.source,
        cost: cost,
      };

      let response;
      if (editingCost) {
        // Update existing
        response = await fetch(`/api/admin/product-costs?id=${editingCost.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cost: cost }),
        });
      } else {
        // Create new
        response = await fetch('/api/admin/product-costs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setSuccess(editingCost ? 'Product cost updated successfully' : 'Product cost created successfully');
        setShowForm(false);
        setEditingCost(null);
        setFormData({ product_id: '', variant_id: '', source: 'local', cost: '' });
        loadCosts();

        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      console.error('Error saving product cost:', err);
      setError('Failed to save product cost');
    }
  };

  const handleEdit = (cost: ProductCost) => {
    setEditingCost(cost);
    setFormData({
      product_id: cost.product_id,
      variant_id: cost.variant_id || '',
      source: cost.source,
      cost: cost.cost.toString(),
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product cost?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/product-costs?id=${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setSuccess('Product cost deleted successfully');
        loadCosts();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      console.error('Error deleting product cost:', err);
      setError('Failed to delete product cost');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingCost(null);
    setFormData({ product_id: '', variant_id: '', source: 'local', cost: '' });
    setError(null);
  };

  const filteredCosts = costs.filter((cost) => {
    const query = searchQuery.toLowerCase();
    return (
      cost.product_id.toLowerCase().includes(query) ||
      (cost.variant_id && cost.variant_id.toLowerCase().includes(query)) ||
      cost.source.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" className="text-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <CubeIcon className="w-6 h-6" />
            Product Cost Management
          </h2>
          <p className="text-white/60 mt-1">Manage product costs for profit tracking</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-none hover:bg-white/90 transition-colors font-semibold"
        >
          <PlusIcon className="w-4 h-4" />
          Add Product Cost
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-500/10 border-l-2 border-green-500 text-green-400 px-4 py-3">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-500/10 border-l-2 border-red-500 text-red-400 px-4 py-3">
          {error}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="bg-white/5 border border-white/10 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">
              {editingCost ? 'Edit Product Cost' : 'Add Product Cost'}
            </h3>
            <button
              onClick={handleCancel}
              className="text-white/60 hover:text-white"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-white/80 mb-2">Product ID *</label>
              <input
                type="text"
                value={formData.product_id}
                onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                required
                disabled={!!editingCost}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white focus:border-white outline-none transition-colors disabled:opacity-50 text-sm"
                placeholder="e.g., prod_12345"
              />
            </div>
            <div>
              <label className="block text-white/80 mb-2">Variant ID (optional)</label>
              <input
                type="text"
                value={formData.variant_id}
                onChange={(e) => setFormData({ ...formData, variant_id: e.target.value })}
                disabled={!!editingCost}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white focus:border-white outline-none transition-colors disabled:opacity-50 text-sm"
                placeholder="e.g., var_12345"
              />
            </div>
            <div>
              <label className="block text-white/80 mb-2">Source *</label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value as any })}
                required
                disabled={!!editingCost}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white focus:border-white outline-none transition-colors disabled:opacity-50 text-sm"
              >
                <option value="local">Local</option>
                <option value="paypal">PayPal</option>
              </select>
            </div>
            <div>
              <label className="block text-white/80 mb-2">Cost ($) *</label>
              <div className="relative">
                <CurrencyDollarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 text-white focus:border-white outline-none transition-colors text-sm"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white text-black rounded-none hover:bg-white/90 transition-colors font-semibold"
              >
                <CheckIcon className="w-4 h-4" />
                {editingCost ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 bg-white/10 text-white rounded-none hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5" />
        <input
          type="text"
          placeholder="Search by product ID, variant ID, or source..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-white outline-none transition-colors text-sm"
        />
      </div>

      {/* Costs Table */}
      <div className="bg-white/5 border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Product ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Variant ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Source</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Updated</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-white/60 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredCosts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-left text-white/60">
                    {costs.length === 0 ? 'No product costs found. Add one to get started.' : 'No costs match your search.'}
                  </td>
                </tr>
              ) : (
                filteredCosts.map((cost) => (
                  <tr key={cost.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-white font-mono text-sm">{cost.product_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-white/60 font-mono text-sm">{cost.variant_id || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${cost.source === 'local' ? 'bg-blue-400/20 text-blue-400' :
                        'bg-green-400/20 text-green-400'
                        }`}>
                        {cost.source}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-white font-semibold">
                      ${parseFloat(cost.cost.toString()).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-white/60 text-sm">
                      {new Date(cost.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(cost)}
                          className="text-white/60 hover:text-white transition-colors"
                          title="Edit"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(cost.id)}
                          className="text-red-400/60 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      {costs.length > 0 && (
        <div className="bg-white/5 border border-white/10 p-4">
          <p className="text-white/60 text-sm">
            Total product costs: <span className="text-white font-semibold">{costs.length}</span>
            {searchQuery && (
              <>
                {' '}(<span className="text-white font-semibold">{filteredCosts.length}</span> matching)
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

