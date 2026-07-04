import { useState, useEffect } from 'react';
import { CubeIcon } from '@heroicons/react/24/outline';
import { LoadingSpinner } from './Loading';
import { SERVICE_PRODUCTS } from '../data/stripe-products';

interface Product {
  id: string;
  product_id: string;
  variant_id: string | null;
  source: 'local' | 'paypal';
  cost: number;
  updated_at: string;
}

const SERVICE_BY_ID = Object.fromEntries(SERVICE_PRODUCTS.map((s) => [s.id, s]));

export function ProductCostManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/product-costs')
      .then((r) => r.json())
      .then((data) => setProducts(data.data || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <LoadingSpinner size="lg" className="text-white" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
        <CubeIcon className="w-10 h-10 text-white/20" />
        <p className="text-white/40 text-sm uppercase tracking-widest font-bold">No products yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {products.map((p) => {
        const service = SERVICE_BY_ID[p.product_id];
        const cost = parseFloat(p.cost.toString());
        const profit = service ? Math.max(0, service.price - cost) : null;
        return (
          <div key={p.id} className="flex items-center justify-between bg-white/5 px-4 py-3">
            <div>
              <div className="text-white font-mono text-sm">{service ? service.name : p.product_id}</div>
              <div className="text-white/40 font-mono text-xs mt-0.5">
                {service ? service.category : p.variant_id || ''}
              </div>
            </div>
            <div className="flex items-center gap-6">
              <span className={`text-[10px] px-2 py-0.5 uppercase font-bold ${p.source === 'paypal' ? 'bg-blue-400/20 text-blue-400' : 'bg-white/10 text-white/60'}`}>
                {p.source}
              </span>
              <span className="text-white/60 font-mono text-xs">cost ${cost.toFixed(2)}</span>
              {profit !== null && (
                <span className="text-emerald-400 font-bold font-mono text-xs">profit ${profit.toFixed(2)}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
