import { useState, useEffect, useRef } from 'react';
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
  PhotoIcon,
  ArrowUpTrayIcon,
  TrashIcon,
  CheckCircleIcon,
  PauseCircleIcon,
} from '@heroicons/react/24/outline';
import { LoadingSpinner } from './Loading';
import { ExpandableScreen, ExpandableScreenTrigger, ExpandableScreenContent } from './ui/expandable-screen';
import { SERVICE_PRODUCTS, ServiceProduct } from '../data/stripe-products';

type ProductStatus = 'active' | 'draft';

interface ProductCost {
  id: string;
  product_id: string;
  variant_id: string | null;
  source: 'local' | 'paypal';
  cost: number;
  name: string | null;
  description: string | null;
  price: number | null;
  category: string | null;
  image_url: string | null;
  status: ProductStatus | null;
  updated_at: string;
}

interface MergedProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  category: ServiceProduct['category'];
  priceType: ServiceProduct['priceType'];
  interval?: ServiceProduct['interval'];
  imageUrl: string | null;
  status: ProductStatus;
}

const CATEGORY_ICON: Record<ServiceProduct['category'], typeof CameraIcon> = {
  photography: CameraIcon,
  'web-dev': CodeBracketIcon,
  bundle: Square3Stack3DIcon,
  kiosk: ComputerDesktopIcon,
};

const CATEGORY_OPTIONS: ServiceProduct['category'][] = ['photography', 'web-dev', 'bundle', 'kiosk'];

const STATUS_LABEL: Record<ProductStatus, string> = { active: 'Publish', draft: 'Drafts' };

const ADMIN_HEADERS = { 'Content-Type': 'application/json', 'X-Admin-Email': 'thelostandunfounds@gmail.com' };

function mergeProduct(product: ServiceProduct, row: ProductCost | undefined): MergedProduct {
  return {
    id: product.id,
    name: row?.name || product.name,
    description: row?.description || product.description,
    price: row?.price !== null && row?.price !== undefined ? Number(row.price) : product.price,
    category: (row?.category as ServiceProduct['category']) || product.category,
    priceType: product.priceType,
    interval: product.interval,
    imageUrl: row?.image_url || null,
    status: row?.status || 'active',
  };
}

function formatPrice(m: MergedProduct) {
  const amount = `$${m.price.toFixed(2)}`;
  return m.priceType === 'recurring' ? `${amount}/${m.interval || 'mo'}` : amount;
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
        const costRow = costs[product.id];
        const merged = mergeProduct(product, costRow);
        const Icon = CATEGORY_ICON[merged.category];
        const cost = costRow ? parseFloat(costRow.cost.toString()) : null;
        const profit = cost !== null ? Math.max(0, merged.price - cost) : null;
        const isDraft = merged.status === 'draft';

        return (
          <ExpandableScreen
            key={product.id}
            isOpen={expandedId === product.id}
            onOpenChange={(open) => setExpandedId(open ? product.id : null)}
          >
            <ExpandableScreenTrigger
              className={`w-full text-left transition-colors duration-300 p-5 flex flex-col gap-4 ${isDraft ? 'bg-white/[0.02] hover:bg-white/5' : 'bg-white/5 hover:bg-white/10'}`}
            >
              <div className="flex items-start gap-3">
                {merged.imageUrl ? (
                  <img src={merged.imageUrl} alt="" className="w-12 h-12 object-cover shrink-0 bg-white/10" />
                ) : (
                  <div className="w-12 h-12 shrink-0 bg-white/10 flex items-center justify-center">
                    <PhotoIcon className="w-5 h-5 text-white/30" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className="w-4 h-4 text-white/40 shrink-0" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-white/40 truncate">
                        {merged.category.replace('-', ' ')}
                      </span>
                    </div>
                    <span className="text-white font-mono text-sm font-bold whitespace-nowrap">
                      {formatPrice(merged)}
                    </span>
                  </div>
                  <h3 className="text-white font-black uppercase tracking-wide text-sm mt-1 truncate">{merged.name}</h3>
                </div>
              </div>

              <p className="text-white/40 text-xs line-clamp-2">{merged.description}</p>

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
                <span
                  className={`ml-auto flex items-center gap-1 text-[9px] font-black uppercase tracking-widest ${isDraft ? 'text-white/30' : 'text-emerald-400'}`}
                >
                  {isDraft ? <PauseCircleIcon className="w-3.5 h-3.5" /> : <CheckCircleIcon className="w-3.5 h-3.5" />}
                  {STATUS_LABEL[merged.status]}
                </span>
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
  const merged = mergeProduct(product, costRow || undefined);

  const [name, setName] = useState(merged.name);
  const [description, setDescription] = useState(merged.description);
  const [category, setCategory] = useState<ServiceProduct['category']>(merged.category);
  const [priceInput, setPriceInput] = useState(merged.price.toString());
  const [costInput, setCostInput] = useState(costRow ? costRow.cost.toString() : '');
  const [status, setStatus] = useState<ProductStatus>(merged.status);
  const [imageUrl, setImageUrl] = useState<string | null>(merged.imageUrl);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(merged.name);
    setDescription(merged.description);
    setCategory(merged.category);
    setPriceInput(merged.price.toString());
    setCostInput(costRow ? costRow.cost.toString() : '');
    setStatus(merged.status);
    setImageUrl(merged.imageUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [costRow]);

  const Icon = CATEGORY_ICON[category];
  const price = parseFloat(priceInput);
  const cost = costInput === '' ? null : parseFloat(costInput);
  const profit = cost !== null && !Number.isNaN(cost) && !Number.isNaN(price) ? Math.max(0, price - cost) : null;

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Use a JPEG, PNG, or WebP image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB');
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setImageUrl(localPreview);
    setUploading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/upload-product-image', {
        method: 'POST',
        headers: {
          'Content-Type': file.type,
          'X-Admin-Email': 'thelostandunfounds@gmail.com',
          'X-Product-Id': product.id,
        },
        body: file,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setImageUrl(data.url);
    } catch (e: any) {
      setError(e.message || 'Upload failed');
      setImageUrl(merged.imageUrl);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (cost === null || Number.isNaN(cost) || cost < 0) {
      setError('Enter a valid cost');
      return;
    }
    if (Number.isNaN(price) || price < 0) {
      setError('Enter a valid price');
      return;
    }

    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const payload = {
        cost,
        name,
        description,
        price,
        category,
        imageUrl,
        status,
      };

      const res = costRow
        ? await fetch(`/api/admin/product-costs?id=${costRow.id}`, {
            method: 'PUT',
            headers: ADMIN_HEADERS,
            body: JSON.stringify(payload),
          })
        : await fetch('/api/admin/product-costs', {
            method: 'POST',
            headers: ADMIN_HEADERS,
            body: JSON.stringify({ productId: product.id, source: 'local', ...payload }),
          });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');

      const stripeRes = await fetch('/api/admin/update-stripe-product', {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({
          serviceId: product.id,
          name,
          description,
          category,
          price,
          priceType: product.priceType,
          interval: product.interval,
          status,
        }),
      });
      if (!stripeRes.ok) {
        const stripeData = await stripeRes.json().catch(() => ({}));
        throw new Error(stripeData.error || 'Saved locally, but Stripe sync failed');
      }

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
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-white/40" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">
            {category.replace('-', ' ')}
          </span>
        </div>
        <div className="flex bg-white/5 p-1">
          {(['active', 'draft'] as ProductStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-colors duration-300 ${
                status === s ? 'bg-white text-black' : 'text-white/40 hover:text-white/70'
              }`}
            >
              {s === 'active' ? <CheckCircleIcon className="w-3.5 h-3.5" /> : <PauseCircleIcon className="w-3.5 h-3.5" />}
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImagePick}
            className="hidden"
            id={`product-image-${product.id}`}
          />
          <div className="relative w-full sm:w-32 h-32 group">
            {imageUrl ? (
              <img src={imageUrl} alt={name} className="w-full h-32 object-cover bg-white/5" />
            ) : (
              <div className="w-full h-32 bg-white/5 flex items-center justify-center">
                <PhotoIcon className="w-8 h-8 text-white/20" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
              {uploading ? (
                <LoadingSpinner size="sm" className="text-white" />
              ) : (
                <>
                  <label
                    htmlFor={`product-image-${product.id}`}
                    className="p-2 bg-white text-black cursor-pointer hover:bg-white/80 transition-colors duration-300"
                    title="Upload photo"
                  >
                    <ArrowUpTrayIcon className="w-4 h-4" />
                  </label>
                  {imageUrl && (
                    <button
                      onClick={() => setImageUrl(null)}
                      className="p-2 bg-white/20 text-white hover:bg-red-500 transition-colors duration-300"
                      title="Remove photo"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-3 min-w-0">
          <div>
            <label className="flex items-center gap-2 text-white/40 text-[9px] font-black uppercase tracking-widest mb-1.5">
              Title
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/5 px-3 py-2.5 text-white font-black uppercase tracking-wide text-sm outline-none focus:bg-white/10 transition-colors duration-300"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-white/40 text-[9px] font-black uppercase tracking-widest mb-1.5">
              <TagIcon className="w-3.5 h-3.5" />
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ServiceProduct['category'])}
              className="w-full bg-white/5 px-3 py-2.5 text-white font-mono text-sm outline-none focus:bg-white/10 transition-colors duration-300 capitalize"
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c} className="bg-black capitalize">
                  {c.replace('-', ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2 text-white/40 text-[9px] font-black uppercase tracking-widest mb-1.5">
          <DocumentTextIcon className="w-3.5 h-3.5" />
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full bg-white/5 px-3 py-2.5 text-white/80 text-sm leading-relaxed outline-none focus:bg-white/10 transition-colors duration-300 resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/5 p-4">
          <label className="flex items-center gap-2 text-white/40 text-[9px] font-black uppercase tracking-widest mb-2">
            <CurrencyDollarIcon className="w-3.5 h-3.5" />
            Price {product.priceType === 'recurring' ? `/ ${product.interval || 'mo'}` : ''}
          </label>
          <div className="flex items-center">
            <span className="text-white/40 font-mono text-sm mr-1">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              className="bg-transparent text-white font-mono font-bold text-lg outline-none w-full"
            />
          </div>
        </div>
        <div className="bg-white/5 p-4">
          <label className="flex items-center gap-2 text-white/40 text-[9px] font-black uppercase tracking-widest mb-2">
            Cost
          </label>
          <div className="flex items-center">
            <span className="text-white/40 font-mono text-sm mr-1">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={costInput}
              onChange={(e) => setCostInput(e.target.value)}
              className="bg-transparent text-white font-mono font-bold text-lg outline-none w-full"
              placeholder="0.00"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handleSave}
          disabled={saving || uploading}
          className="flex items-center gap-2 bg-white text-black px-5 py-2.5 text-[10px] font-black uppercase tracking-widest hover:bg-white/80 transition-colors duration-300 disabled:opacity-50"
        >
          {saving ? (
            <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
          ) : saved ? (
            <CheckIcon className="w-3.5 h-3.5" />
          ) : null}
          {saving ? 'Saving' : saved ? 'Saved' : 'Save Changes'}
        </button>
        {profit !== null && (
          <span className="text-emerald-400 font-bold font-mono text-xs">profit ${profit.toFixed(2)}</span>
        )}
        {error && <p className="text-red-400 text-xs font-mono w-full">{error}</p>}
      </div>
    </div>
  );
}
