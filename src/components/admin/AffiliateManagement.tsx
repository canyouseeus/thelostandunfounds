/**
 * Affiliate Program Management Component
 * Manage affiliates, commissions, and tracking
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../Toast';
import { Users, Plus, Edit, Trash2, Save, X, DollarSign, TrendingUp } from 'lucide-react';
import { LoadingSpinner } from '../Loading';

export interface Affiliate {
  id: string;
  user_id: string;
  code: string;
  commission_rate: number;
  status: 'active' | 'inactive' | 'suspended';
  total_earnings: number;
  total_clicks: number;
  total_conversions: number;
  created_at: string;
  updated_at: string;
}

export interface AffiliateCommission {
  id: string;
  affiliate_id: string;
  order_id?: string;
  amount: number;
  status: 'pending' | 'paid' | 'cancelled';
  created_at: string;
}

export default function AffiliateManagement() {
  const { success, error: showError } = useToast();
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [commissions, setCommissions] = useState<AffiliateCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAffiliate, setEditingAffiliate] = useState<Affiliate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    user_id: '',
    code: '',
    commission_rate: '10',
    status: 'active' as 'active' | 'inactive' | 'suspended',
  });

  useEffect(() => {
    loadAffiliates();
    loadCommissions();
  }, []);

  const loadAffiliates = async () => {
    try {
      const { data, error } = await supabase
        .from('affiliates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAffiliates(data || []);
    } catch (error: any) {
      console.error('Error loading affiliates:', error);
      showError('Failed to load affiliates');
    } finally {
      setLoading(false);
    }
  };

  const loadCommissions = async () => {
    try {
      const { data, error } = await supabase
        .from('affiliate_commissions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setCommissions(data || []);
    } catch (error: any) {
      console.error('Error loading commissions:', error);
    }
  };

  const generateCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleSave = async () => {
    try {
      const affiliateData = {
        ...formData,
        code: formData.code || generateCode(),
        commission_rate: parseFloat(formData.commission_rate) || 0,
        updated_at: new Date().toISOString(),
      };

      if (editingAffiliate) {
        const { error } = await supabase
          .from('affiliates')
          .update(affiliateData)
          .eq('id', editingAffiliate.id);

        if (error) throw error;
        success('Affiliate updated successfully');
      } else {
        const { error } = await supabase
          .from('affiliates')
          .insert([{ 
            ...affiliateData, 
            total_earnings: 0,
            total_clicks: 0,
            total_conversions: 0,
            created_at: new Date().toISOString() 
          }]);

        if (error) throw error;
        success('Affiliate created successfully');
      }

      resetForm();
      loadAffiliates();
    } catch (error: any) {
      console.error('Error saving affiliate:', error);
      showError(error.message || 'Failed to save affiliate');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this affiliate?')) return;

    try {
      const { error } = await supabase
        .from('affiliates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      success('Affiliate deleted successfully');
      loadAffiliates();
    } catch (error: any) {
      console.error('Error deleting affiliate:', error);
      showError('Failed to delete affiliate');
    }
  };

  const handleEdit = (affiliate: Affiliate) => {
    setEditingAffiliate(affiliate);
    setFormData({
      user_id: affiliate.user_id,
      code: affiliate.code,
      commission_rate: affiliate.commission_rate.toString(),
      status: affiliate.status,
    });
    setIsCreating(true);
  };

  const resetForm = () => {
    setEditingAffiliate(null);
    setIsCreating(false);
    setFormData({
      user_id: '',
      code: '',
      commission_rate: '10',
      status: 'active',
    });
  };

  const totalEarnings = affiliates.reduce((sum, aff) => sum + (aff.total_earnings || 0), 0);
  const totalClicks = affiliates.reduce((sum, aff) => sum + (aff.total_clicks || 0), 0);
  const totalConversions = affiliates.reduce((sum, aff) => sum + (aff.total_conversions || 0), 0);
  const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks * 100).toFixed(2) : '0';

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
          <Users className="w-6 h-6" />
          Affiliate Program
        </h2>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg hover:bg-white/90 transition"
        >
          <Plus className="w-4 h-4" />
          New Affiliate
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-black border border-white/10 rounded-lg p-4">
          <div className="text-white/60 text-sm mb-1">Total Affiliates</div>
          <div className="text-2xl font-bold text-white">{affiliates.length}</div>
        </div>
        <div className="bg-black border border-white/10 rounded-lg p-4">
          <div className="text-white/60 text-sm mb-1">Total Earnings</div>
          <div className="text-2xl font-bold text-white">${totalEarnings.toFixed(2)}</div>
        </div>
        <div className="bg-black border border-white/10 rounded-lg p-4">
          <div className="text-white/60 text-sm mb-1">Total Clicks</div>
          <div className="text-2xl font-bold text-white">{totalClicks}</div>
        </div>
        <div className="bg-black border border-white/10 rounded-lg p-4">
          <div className="text-white/60 text-sm mb-1">Conversion Rate</div>
          <div className="text-2xl font-bold text-white">{conversionRate}%</div>
        </div>
      </div>

      {/* Create/Edit Form */}
      {isCreating && (
        <div className="bg-black border border-white/10 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">
              {editingAffiliate ? 'Edit Affiliate' : 'Create New Affiliate'}
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
              <label className="block text-white/80 mb-2">User ID</label>
              <input
                type="text"
                value={formData.user_id}
                onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                placeholder="User UUID"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-white/80 mb-2">Affiliate Code</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                    placeholder="AUTO-GENERATED"
                  />
                  <button
                    onClick={() => setFormData({ ...formData, code: generateCode() })}
                    className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition"
                  >
                    Generate
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-white/80 mb-2">Commission Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.commission_rate}
                  onChange={(e) => setFormData({ ...formData, commission_rate: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                  placeholder="10"
                />
              </div>
            </div>

            <div>
              <label className="block text-white/80 mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' | 'suspended' })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg hover:bg-white/90 transition"
              >
                <Save className="w-4 h-4" />
                {editingAffiliate ? 'Update Affiliate' : 'Create Affiliate'}
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

      {/* Affiliates List */}
      <div className="bg-black border border-white/10 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-white/60 text-sm font-medium">Code</th>
                <th className="text-left py-3 px-4 text-white/60 text-sm font-medium">Commission</th>
                <th className="text-left py-3 px-4 text-white/60 text-sm font-medium">Earnings</th>
                <th className="text-left py-3 px-4 text-white/60 text-sm font-medium">Clicks</th>
                <th className="text-left py-3 px-4 text-white/60 text-sm font-medium">Conversions</th>
                <th className="text-left py-3 px-4 text-white/60 text-sm font-medium">Status</th>
                <th className="text-right py-3 px-4 text-white/60 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {affiliates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-white/60">
                    No affiliates yet. Create your first affiliate!
                  </td>
                </tr>
              ) : (
                affiliates.map((affiliate) => (
                  <tr key={affiliate.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-3 px-4">
                      <div className="text-white font-mono font-medium">{affiliate.code}</div>
                    </td>
                    <td className="py-3 px-4 text-white">{affiliate.commission_rate}%</td>
                    <td className="py-3 px-4 text-white">${(affiliate.total_earnings || 0).toFixed(2)}</td>
                    <td className="py-3 px-4 text-white/60">{affiliate.total_clicks || 0}</td>
                    <td className="py-3 px-4 text-white/60">{affiliate.total_conversions || 0}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        affiliate.status === 'active' 
                          ? 'bg-green-400/10 text-green-400' 
                          : affiliate.status === 'suspended'
                          ? 'bg-red-400/10 text-red-400'
                          : 'bg-gray-400/10 text-gray-400'
                      }`}>
                        {affiliate.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(affiliate)}
                          className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded transition"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(affiliate.id)}
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

      {/* Recent Commissions */}
      {commissions.length > 0 && (
        <div className="bg-black border border-white/10 rounded-lg p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Recent Commissions
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 text-white/60 text-sm font-medium">Affiliate</th>
                  <th className="text-left py-2 text-white/60 text-sm font-medium">Amount</th>
                  <th className="text-left py-2 text-white/60 text-sm font-medium">Status</th>
                  <th className="text-left py-2 text-white/60 text-sm font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {commissions.slice(0, 10).map((commission) => {
                  const affiliate = affiliates.find(a => a.id === commission.affiliate_id);
                  return (
                    <tr key={commission.id} className="border-b border-white/5">
                      <td className="py-2 text-white font-mono text-sm">{affiliate?.code || 'N/A'}</td>
                      <td className="py-2 text-white">${commission.amount.toFixed(2)}</td>
                      <td className="py-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          commission.status === 'paid' 
                            ? 'bg-green-400/10 text-green-400' 
                            : commission.status === 'pending'
                            ? 'bg-yellow-400/10 text-yellow-400'
                            : 'bg-red-400/10 text-red-400'
                        }`}>
                          {commission.status}
                        </span>
                      </td>
                      <td className="py-2 text-white/60 text-sm">
                        {new Date(commission.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
