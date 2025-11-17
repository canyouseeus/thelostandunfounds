/**
 * Product Cost Management Component
 * Manage product costs for profit calculation
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../Toast';
import { Package, Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { LoadingSpinner } from '../Loading';

export interface ProductCost {
  id: string;
  product_id: string;
  variant_id: string | null;
  source: 'fourthwall' | 'local';
  cost: number;
  created_at: string;
  updated_at: string;
}

export default function ProductCostManagement() {
  const { success, error: showError } = useToast();
  const [productCosts, setProductCosts] = useState<ProductCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCost, setEditingCost] = useState<ProductCost | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    product_id: '',
    variant_id: '',
    source: 'fourthwall' as 'fourthwall' | 'local',
    cost: '',
  });
  const [filterSource, setFilterSource] = useState<'all' | 'fourthwall' | 'local'>('all');

  useEffect(() => {
    loadProductCosts();
  }, [filterSource]);

  const loadProductCosts = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('product_costs')
        .select('*')
        .order('created_at', { ascending: false });

      if (filterSource !== 'all') {
        query = query.eq('source', filterSource);
      }

      const { data, error } = await query;

      if (error) throw error;
      setProductCosts(data || []);
    } catch (error: any) {
      console.error('Error loading product costs:', error);
      showError('Failed to load product costs');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.product_id || !formData.cost) {
        showError('Product ID and cost are required');
        return;
      }

      const costData = {
        product_id: formData.product_id,
        variant_id: formData.variant_id || null,
        source: formData.source,
        cost: parseFloat(formData.cost) || 0,
      };

      if (editingCost) {
        const { error } = await supabase
          .from('product_costs')
          .update(costData)
          .eq('id', editingCost.id);

        if (error) throw error;
        success('Product cost updated successfully');
      } else {
        const { error } = await supabase
          .from('product_costs')
          .insert([costData]);

        if (error) {
          if (error.code === '23505') {
            showError('Product cost already exists for this product/variant');
            return;
          }
          throw error;
        }
        success('Product cost created successfully');
      }

      resetForm();
      loadProductCosts();
    } catch (error: any) {
      console.error('Error saving product cost:', error);
      showError(error.message || 'Failed to save product cost');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product cost?')) return;

    try {
      const { error } = await supabase
        .from('product_costs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      success('Product cost deleted successfully');
      loadProductCosts();
    } catch (error: any) {
      console.error('Error deleting product cost:', error);
      showError('Failed to delete product cost');
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
    setIsCreating(true);
  };

  const resetForm = () => {
    setEditingCost(null);
    setIsCreating(false);
    setFormData({
      product_id: '',
      variant_id: '',
      source: 'fourthwall',
      cost: '',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Package className="w-6 h-6" />
          Product Cost Management
        </h2>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg hover:bg-white/90 transition"
        >
          <Plus className="w-4 h-4" />
          New Product Cost
        </button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <label className="text-white/80">Filter by source:</label>
        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value as 'all' | 'fourthwall' | 'local')}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
        >
          <option value="all">All</option>
          <option value="fourthwall">Fourthwall</option>
          <option value="local">Local</option>
        </select>
      </div>

      {/* Create/Edit Form */}
      {isCreating && (
        <div className="bg-black border border-white/10 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">
              {editingCost ? 'Edit Product Cost' : 'Create New Product Cost'}
            </h3>
            <button
              onClick={resetForm}
              className="text-white/60 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-white/80 mb-2">Product ID</label>
              <input
                type="text"
                value={formData.product_id}
                onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                placeholder="Product ID from Fourthwall or local"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-white/80 mb-2">Variant ID (Optional)</label>
                <input
                  type="text"
                  value={formData.variant_id}
                  onChange={(e) => setFormData({ ...formData, variant_id: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                  placeholder="Variant ID"
                />
              </div>

              <div>
                <label className="block text-white/80 mb-2">Source</label>
                <select
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value as 'fourthwall' | 'local' })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                >
                  <option value="fourthwall">Fourthwall</option>
                  <option value="local">Local</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-white/80 mb-2">Cost ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                placeholder="0.00"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg hover:bg-white/90 transition"
              >
                <Save className="w-4 h-4" />
                {editingCost ? 'Update Cost' : 'Create Cost'}
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Costs List */}
      <div className="bg-black border border-white/10 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-white/60 text-sm font-medium">Product ID</th>
                <th className="text-left py-3 px-4 text-white/60 text-sm font-medium">Variant ID</th>
                <th className="text-left py-3 px-4 text-white/60 text-sm font-medium">Source</th>
                <th className="text-left py-3 px-4 text-white/60 text-sm font-medium">Cost</th>
                <th className="text-left py-3 px-4 text-white/60 text-sm font-medium">Updated</th>
                <th className="text-right py-3 px-4 text-white/60 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {productCosts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-white/60">
                    No product costs yet. Create your first product cost!
                  </td>
                </tr>
              ) : (
                productCosts.map((cost) => (
                  <tr key={cost.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-3 px-4">
                      <div className="text-white font-mono text-sm">{cost.product_id}</div>
                    </td>
                    <td className="py-3 px-4 text-white/60 text-sm">{cost.variant_id || '-'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        cost.source === 'fourthwall'
                          ? 'bg-blue-400/10 text-blue-400'
                          : 'bg-green-400/10 text-green-400'
                      }`}>
                        {cost.source}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-white">${cost.cost.toFixed(2)}</td>
                    <td className="py-3 px-4 text-white/60 text-sm">
                      {new Date(cost.updated_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(cost)}
                          className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded transition"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(cost.id)}
                          className="p-2 text-white/60 hover:text-red-400 hover:bg-red-400/10 rounded transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
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
    </div>
  );
}

