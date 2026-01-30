import { useState, useEffect } from 'react';
import { UsersIcon } from '@heroicons/react/24/outline';

interface CustomerListProps {
  affiliateId: string;
}

interface Customer {
  id: string;
  email: string;
  first_purchase_date: string;
  total_purchases: number;
  total_profit_generated: number;
  created_at: string;
}

export default function CustomerList({ affiliateId }: CustomerListProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'profit' | 'purchases' | 'date'>('profit');

  useEffect(() => {
    fetchCustomers();
  }, [affiliateId]);

  const fetchCustomers = async () => {
    try {
      const response = await fetch(`/api/affiliates/referrals?affiliate_id=${affiliateId}&type=customers`);
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers || []);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const sortedCustomers = [...customers].sort((a, b) => {
    switch (sortBy) {
      case 'profit':
        return parseFloat(b.total_profit_generated.toString()) - parseFloat(a.total_profit_generated.toString());
      case 'purchases':
        return b.total_purchases - a.total_purchases;
      case 'date':
        return new Date(b.first_purchase_date).getTime() - new Date(a.first_purchase_date).getTime();
      default:
        return 0;
    }
  });

  const totalProfit = customers.reduce((sum, c) => sum + parseFloat(c.total_profit_generated.toString()), 0);
  const totalPurchases = customers.reduce((sum, c) => sum + c.total_purchases, 0);

  return (
    <div className="bg-black/50 border-0 rounded-none p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <UsersIcon className="text-white w-6 h-6" />
          <h3 className="text-xl font-bold text-white">My Customers (Lifetime)</h3>
        </div>
        <span className="text-white/60 text-sm">{customers.length} customers</span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white/5 border-0 rounded-none p-4 text-center">
          <p className="text-white/60 text-sm mb-1">Total Customers</p>
          <p className="text-white text-2xl font-bold">{customers.length}</p>
        </div>
        <div className="bg-white/5 border-0 rounded-none p-4 text-center">
          <p className="text-white/60 text-sm mb-1">Total Purchases</p>
          <p className="text-white text-2xl font-bold">{totalPurchases}</p>
        </div>
        <div className="bg-white/5 border-0 rounded-none p-4 text-center">
          <p className="text-white/60 text-sm mb-1">Total Profit Gen.</p>
          <p className="text-white text-2xl font-bold">${totalProfit.toFixed(0)}</p>
        </div>
      </div>

      {/* Sort Controls */}
      <div className="flex gap-2 mb-4">
        <span className="text-white/60 text-sm self-center">Sort by:</span>
        <button
          onClick={() => setSortBy('profit')}
          className={`px-3 py-1 text-sm rounded-none transition-colors ${sortBy === 'profit' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
        >
          Profit
        </button>
        <button
          onClick={() => setSortBy('purchases')}
          className={`px-3 py-1 text-sm rounded-none transition-colors ${sortBy === 'purchases' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
        >
          Purchases
        </button>
        <button
          onClick={() => setSortBy('date')}
          className={`px-3 py-1 text-sm rounded-none transition-colors ${sortBy === 'date' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
        >
          Date
        </button>
      </div>

      {/* Customer Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <p className="text-white/60 text-center py-8">Loading customers...</p>
        ) : customers.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-white/60 text-sm font-medium pb-2">Email</th>
                <th className="text-center text-white/60 text-sm font-medium pb-2">First Purchase</th>
                <th className="text-center text-white/60 text-sm font-medium pb-2">Purchases</th>
                <th className="text-right text-white/60 text-sm font-medium pb-2">Profit Generated</th>
              </tr>
            </thead>
            <tbody>
              {sortedCustomers.map((customer) => (
                <tr key={customer.id} className="border-0 hover:bg-white/5 transition-colors">
                  <td className="py-3 text-white text-sm">{customer.email}</td>
                  <td className="py-3 text-white/80 text-sm text-center">
                    {customer.first_purchase_date ? new Date(customer.first_purchase_date).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="py-3 text-white/80 text-sm text-center">{customer.total_purchases}</td>
                  <td className="py-3 text-white text-sm text-right font-medium">
                    ${parseFloat(customer.total_profit_generated.toString()).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-8">
            <UsersIcon className="text-white/20 mx-auto mb-3 w-12 h-12" />
            <p className="text-white/60 text-sm">No customers yet</p>
            <p className="text-white/40 text-xs mt-1">Share your referral link to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
}



