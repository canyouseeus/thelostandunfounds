import { useState, useEffect } from 'react';
import {
  CameraIcon,
  CodeBracketIcon,
  Square3Stack3DIcon,
  ComputerDesktopIcon,
  CurrencyDollarIcon,
  TagIcon,
  DocumentTextIcon,
  CheckIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { LoadingSpinner } from './Loading';
import { ExpandableScreen, ExpandableScreenTrigger, ExpandableScreenContent } from './ui/expandable-screen';
import { SERVICE_PRODUCTS, ServiceProduct } from '../data/stripe-products';

interface ProductCost {
  id: string;
  product_id: string;
  variant_id: string | null;
  source: 'local' | 'paypal';
  cost: number;
  updated_at: string;
}

const CATEGORY_ICON: Record<ServiceProduct['category'], typeof CameraIcon> = {
  photography: CameraIcon,
  'web-dev': CodeBracketIcon,
  bundle: Square3Stack3DIcon,
  kiosk: ComputerDesktopIcon,
};

function formatPrice(product: ServiceProduct) {
  const amount = `$${product.price.toFixed(2)}`;
  return product.priceType === 'recurring' ? `${amount}/${product.interval || 'mo'}` : amount;
}

export function ProductCostManagement() {
  const [costs, setCosts] = useState<Record<string, ProductCost>>({});
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/product-costs?source=local')
      .then((r) => r.json())
      .then((data) => {
        const map: Record<string, ProductCost> = {};
        for (const row of (data.data || []) as ProductCost[]) {
          if (!row.variant_id) map[row.product_id] = row;
        }
        setCosts(map);
      })
      .catch(() => setCosts({}))
      .finally(() => setLoading(false));
  }, []);

  const handleSaved = (productId: string, row: ProductCost) => {
    setCosts((prev) => ({ ...prev, [productId]: row }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <LoadingSpinner size="lg" className="text-white" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {SERVICE_PRODUCTS.map((product) => {
        const Icon = CATEGORY_ICON[product.category];
        const costRow = costs[product.id];
        const cost = costRow ? parseFloat(costRow.cost.toString()) : null;
        const profit = cost !== null ? Math.max(0, product.price - cost) : null;

        return (
          <ExpandableScreen
            key={product.id}
            isOpen={expandedId === product.id}
            onOpenChange={(open) => setExpandedId(open ? product.id : null)}
          >
            <ExpandableScreenTrigger className="w-full text-left bg-white/5 hover:bg-white/10 transition-colors duration-300 p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-white/40 shrink-0" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/40">
                    {product.category.replace('-', ' ')}
                  </span>
                </div>
                <span className="text-white font-mono text-sm font-bold whitespace-nowrap">
                  {formatPrice(product)}
                </span>
              </div>

              <div>
                <h3 className="text-white font-black uppercase tracking-wide text-sm">{product.name}</h3>
                <p className="text-white/40 text-xs mt-1.5 line-clamp-2">{product.description}</p>
              </div>

              <div className="flex items-center gap-4 pt-1">
                {cost !== null ? (
                  <>
                    <span className="text-white/60 font-mono text-xs">cost ${cost.toFixed(2)}</span>
                    {profit !== null && (
                      <span className="text-emerald-400 font-bold font-mono text-xs">profit ${profit.toFixed(2)}</span>
                    )}
                  </>
                ) : (
                  <span className="text-white/30 font-mono text-xs uppercase tracking-widest">No cost set</span>
                )}
              </div>
            </ExpandableScreenTrigger>

            <ExpandableScreenContent className="overflow-x-hidden">
              <div className="flex-1 overflow-y-auto overflow-x-hidden">
                <div className="max-w-2xl mx-auto px-6 sm:px-8 pt-20 pb-16">
                  <ProductDetail
                    product={product}
                    costRow={costRow || null}
                    onSaved={(row) => handleSaved(product.id, row)}
                  />
                </div>
              </div>
            </ExpandableScreenContent>
          </ExpandableScreen>
        );
      })}
    </div>
  );
}

function ProductDetail({
  product,
  costRow,
  onSaved,
}: {
  product: ServiceProduct;
  costRow: ProductCost | null;
  onSaved: (row: ProductCost) => void;
}) {
  const Icon = CATEGORY_ICON[product.category];
  const [costInput, setCostInput] = useState(costRow ? costRow.cost.toString() : '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCostInput(costRow ? costRow.cost.toString() : '');
  }, [costRow]);

  const cost = costInput === '' ? null : parseFloat(costInput);
  const profit = cost !== null && !Number.isNaN(cost) ? Math.max(0, product.price - cost) : null;

  const handleSave = async () => {
    if (cost === null || Number.isNaN(cost) || cost < 0) {
      setError('Enter a valid cost');
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = costRow
        ? await fetch(`/api/admin/product-costs?id=${costRow.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cost }),
          })
        : await fetch('/api/admin/product-costs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId: product.id, source: 'local', cost }),
          });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      onSaved(data.data as ProductCost);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      setError(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-white/40" />
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">
          {product.category.replace('-', ' ')}
        </span>
      </div>

      <h1 className="text-white font-black uppercase tracking-wide text-2xl sm:text-3xl">{product.name}</h1>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/5 p-4">
          <div className="flex items-center gap-2 text-white/40 text-[9px] font-black uppercase tracking-widest mb-2">
            <CurrencyDollarIcon className="w-3.5 h-3.5" />
            Price
          </div>
          <div className="text-white font-mono font-bold text-lg">{formatPrice(product)}</div>
        </div>
        <div className="bg-white/5 p-4">
          <div className="flex items-center gap-2 text-white/40 text-[9px] font-black uppercase tracking-widest mb-2">
            <TagIcon className="w-3.5 h-3.5" />
            Category
          </div>
          <div className="text-white font-mono font-bold text-lg capitalize">{product.category.replace('-', ' ')}</div>
        </div>
      </div>

      <div className="bg-white/5 p-4">
        <div className="flex items-center gap-2 text-white/40 text-[9px] font-black uppercase tracking-widest mb-2">
          <DocumentTextIcon className="w-3.5 h-3.5" />
          Description
        </div>
        <p className="text-white/70 text-sm leading-relaxed">{product.description}</p>
      </div>

      <div className="bg-white/5 p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-white/40 text-[9px] font-black uppercase tracking-widest">
          Cost (editable)
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center bg-white/10 px-3 py-2">
            <span className="text-white/40 font-mono text-sm mr-1">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={costInput}
              onChange={(e) => setCostInput(e.target.value)}
              className="bg-transparent text-white font-mono text-sm w-28 outline-none"
              placeholder="0.00"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-white text-black px-4 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-white/80 transition-colors duration-300 disabled:opacity-50"
          >
            {saving ? (
              <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
            ) : saved ? (
              <CheckIcon className="w-3.5 h-3.5" />
            ) : null}
            {saving ? 'Saving' : saved ? 'Saved' : 'Save Cost'}
          </button>
          {profit !== null && (
            <span className="text-emerald-400 font-bold font-mono text-xs">profit ${profit.toFixed(2)}</span>
          )}
        </div>
        {error && <p className="text-red-400 text-xs font-mono">{error}</p>}
      </div>
    </div>
  );
}
