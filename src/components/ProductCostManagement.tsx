import { useState, useEffect } from 'react';
import { CubeIcon } from '@heroicons/react/24/outline';
import { LoadingSpinner } from './Loading';

interface Product {
  id: string;
  product_id: string;
  variant_id: string | null;
  source: 'local' | 'paypal';
  cost: number;
  updated_at: string;
}

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
      {products.map((p) => (
        <div key={p.id} className="flex items-center justify-between bg-white/5 px-4 py-3">
          <div>
            <div className="text-white font-mono text-sm">{p.product_id}</div>
            {p.variant_id && (
              <div className="text-white/40 font-mono text-xs mt-0.5">{p.variant_id}</div>
            )}
          </div>
          <div className="flex items-center gap-6">
            <span className={`text-[10px] px-2 py-0.5 uppercase font-bold ${p.source === 'paypal' ? 'bg-blue-400/20 text-blue-400' : 'bg-white/10 text-white/60'}`}>
              {p.source}
            </span>
            <span className="text-white font-bold font-mono">${parseFloat(p.cost.toString()).toFixed(2)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
