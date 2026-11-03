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
      <div className="flex items-center gap-3 mb-6 min-w-0">
        <UsersIcon className="text-white w-6 h-6 shrink-0" />
        <h3 className="text-xl font-bold uppercase tracking-tighter text-white">My Customers <span className="text-white/40">(Lifetime)</span></h3>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
        <div className="bg-white/5 border-0 rounded-none p-3 sm:p-4 text-left min-w-0">
          <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.05em] sm:tracking-[0.15em] mb-2 truncate">Customers</p>
          <p className="text-white text-xl sm:text-2xl font-bold truncate">{customers.length}</p>
        </div>
        <div className="bg-white/5 border-0 rounded-none p-3 sm:p-4 text-left min-w-0">
          <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.05em] sm:tracking-[0.15em] mb-2 truncate">Purchases</p>
          <p className="text-white text-xl sm:text-2xl font-bold truncate">{totalPurchases}</p>
        </div>
        <div className="bg-white/5 border-0 rounded-none p-3 sm:p-4 text-left min-w-0">
          <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.05em] sm:tracking-[0.15em] mb-2 truncate">Profit</p>
          <p className="text-white text-xl sm:text-2xl font-bold truncate">${totalProfit.toFixed(0)}</p>
        </div>
      </div>

      {/* Sort Controls */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-white/60 text-sm">Sort by:</span>
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
      <div>
        {loading ? (
          <p className="text-white/60 text-center py-8">Loading customers...</p>
        ) : customers.length > 0 ? (
          <>
          {/* Phone: one block per customer, so a long email never pushes the numbers off-screen. */}
          <div className="sm:hidden space-y-2">
            {sortedCustomers.map((customer) => (
              <div key={customer.id} className="bg-white/5 p-3 text-left" style={{ borderRadius: 0 }}>
                <p className="text-white text-sm break-all">{customer.email}</p>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="min-w-0">
                    <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.15em]">First buy</p>
                    <p className="text-white/80 text-sm mt-1">
                      {customer.first_purchase_date ? new Date(customer.first_purchase_date).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.15em]">Buys</p>
                    <p className="text-white/80 text-sm mt-1">{customer.total_purchases}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.15em]">Profit</p>
                    <p className="text-white text-sm font-medium mt-1">
                      ${parseFloat(customer.total_profit_generated.toString()).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <table className="hidden sm:table w-full">
            <thead>
              <tr>
                <th className="text-left text-white/60 text-sm font-medium pb-2">Email</th>
                <th className="text-center text-white/60 text-sm font-medium pb-2">First Purchase</th>
                <th className="text-center text-white/60 text-sm font-medium pb-2">Purchases</th>
                <th className="text-right text-white/60 text-sm font-medium pb-2">Profit Generated</th>
              </tr>
            </thead>
            <tbody>
              {sortedCustomers.map((customer) => (
                <tr key={customer.id} className="border-0 hover:bg-white/5 transition-colors">
                  <td className="py-3 pr-4 text-white text-sm break-all">{customer.email}</td>
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
          </>
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



