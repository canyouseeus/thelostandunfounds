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
  ShoppingBagIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { cn } from './ui/utils';
import { LoadingSpinner } from './Loading';
import { ExpandableScreen, ExpandableScreenTrigger, ExpandableScreenContent } from './ui/expandable-screen';
import { SERVICE_PRODUCTS, ServiceProduct } from '../data/stripe-products';

type ProductStatus = 'active' | 'draft';
type ProductSource = 'local' | 'fourthwall';

interface ProductCost {
  id: string;
  product_id: string;
  variant_id: string | null;
  source: ProductSource;
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

interface ShopProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  images: string[];
  handle: string;
  available: boolean;
  url: string;
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

function GalleryTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'text-[10px] font-black uppercase tracking-[0.3em] transition-all relative pb-2',
        active ? 'text-white' : 'text-white/30 hover:text-white/60'
      )}
    >
      {label}
      {active && (
        <motion.div
          layoutId="productTabUnderline"
          className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-white"
        />
      )}
    </button>
  );
}

export function ProductCostManagement() {
  const [activeTab, setActiveTab] = useState<'services' | 'shop'>('services');
  const [costs, setCosts] = useState<Record<string, ProductCost>>({});
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [shopProducts, setShopProducts] = useState<ShopProduct[]>([]);
  const [shopCosts, setShopCosts] = useState<Record<string, ProductCost>>({});
  const [shopLoading, setShopLoading] = useState(false);
  const [shopError, setShopError] = useState<string | null>(null);
  const [shopLoaded, setShopLoaded] = useState(false);

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

  // Lazy-load Fourthwall shop products the first time the Shop tab is opened
  useEffect(() => {
    if (activeTab !== 'shop' || shopLoaded) return;
    setShopLoading(true);
    setShopError(null);

    Promise.all([
      fetch('/api/shop/products', { cache: 'no-store' }).then((r) => r.json()),
      fetch('/api/admin/product-costs?source=fourthwall')
        .then((r) => r.json())
        .catch(() => ({ data: [] })),
    ])
      .then(([productsData, costsData]) => {
        setShopProducts(productsData.products || []);
        const map: Record<string, ProductCost> = {};
        for (const row of (costsData.data || []) as ProductCost[]) {
          if (!row.variant_id) map[row.product_id] = row;
        }
        setShopCosts(map);
        setShopLoaded(true);
      })
      .catch((e) => setShopError(e.message || 'Failed to load shop products'))
      .finally(() => setShopLoading(false));
  }, [activeTab, shopLoaded]);

  const handleSaved = (productId: string, row: ProductCost) => {
    setCosts((prev) => ({ ...prev, [productId]: row }));
  };

  const handleShopSaved = (productId: string, row: ProductCost) => {
    setShopCosts((prev) => ({ ...prev, [productId]: row }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <LoadingSpinner size="lg" className="text-white" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-center gap-12 mb-6 pb-2">
        <GalleryTab label="Services" active={activeTab === 'services'} onClick={() => setActiveTab('services')} />
        <GalleryTab label="Shop" active={activeTab === 'shop'} onClick={() => setActiveTab('shop')} />
      </div>

      {activeTab === 'services' ? (
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

                <ExpandableScreenContent className="overflow-hidden">
                  <div className="flex-1 overflow-hidden">
                    <div className="max-w-2xl mx-auto h-full px-4 sm:px-6 pt-14 pb-3 flex flex-col justify-center">
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
      ) : shopLoading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <LoadingSpinner size="lg" className="text-white" />
        </div>
      ) : shopError ? (
        <p className="text-red-400 text-xs font-mono text-center py-12">{shopError}</p>
      ) : shopProducts.length === 0 ? (
        <p className="text-white/30 text-xs uppercase tracking-widest text-center py-12">No shop products found</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {shopProducts.map((product) => {
            const costRow = shopCosts[product.id];
            const cost = costRow ? parseFloat(costRow.cost.toString()) : null;
            const profit = cost !== null ? Math.max(0, product.price - cost) : null;

            return (
              <ExpandableScreen
                key={product.id}
                isOpen={expandedId === product.id}
                onOpenChange={(open) => setExpandedId(open ? product.id : null)}
              >
                <ExpandableScreenTrigger className="w-full text-left transition-colors duration-300 p-5 flex flex-col gap-4 bg-white/5 hover:bg-white/10">
                  <div className="flex items-start gap-3">
                    {product.images?.[0] ? (
                      <img src={product.images[0]} alt="" className="w-12 h-12 object-cover shrink-0 bg-white/10" />
                    ) : (
                      <div className="w-12 h-12 shrink-0 bg-white/10 flex items-center justify-center">
                        <ShoppingBagIcon className="w-5 h-5 text-white/30" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <ShoppingBagIcon className="w-4 h-4 text-white/40 shrink-0" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-white/40 truncate">
                            Shop
                          </span>
                        </div>
                        <span className="text-white font-mono text-sm font-bold whitespace-nowrap">
                          ${product.price.toFixed(2)}
                        </span>
                      </div>
                      <h3 className="text-white font-black uppercase tracking-wide text-sm mt-1 truncate">{product.title}</h3>
                    </div>
                  </div>

                  <p className="text-white/40 text-xs line-clamp-2">{product.description}</p>

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
                      className={`ml-auto flex items-center gap-1 text-[9px] font-black uppercase tracking-widest ${product.available ? 'text-emerald-400' : 'text-white/30'}`}
                    >
                      {product.available ? <CheckCircleIcon className="w-3.5 h-3.5" /> : <PauseCircleIcon className="w-3.5 h-3.5" />}
                      {product.available ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                </ExpandableScreenTrigger>

                <ExpandableScreenContent className="overflow-hidden">
                  <div className="flex-1 overflow-hidden">
                    <div className="max-w-2xl mx-auto h-full px-4 sm:px-6 pt-14 pb-3 flex flex-col justify-center">
                      <ShopProductDetail
                        product={product}
                        costRow={costRow || null}
                        onSaved={(row) => handleShopSaved(product.id, row)}
                      />
                    </div>
                  </div>
                </ExpandableScreenContent>
              </ExpandableScreen>
            );
          })}
        </div>
      )}
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
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-white/40" />
          <span className="text-[9px] font-black uppercase tracking-[0.25em] text-white/40">
            {category.replace('-', ' ')}
          </span>
        </div>
        <div className="flex bg-white/5 p-0.5">
          {(['active', 'draft'] as ProductStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`flex items-center gap-1 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest transition-colors duration-300 ${
                status === s ? 'bg-white text-black' : 'text-white/40 hover:text-white/70'
              }`}
            >
              {s === 'active' ? <CheckCircleIcon className="w-3 h-3" /> : <PauseCircleIcon className="w-3 h-3" />}
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="relative w-full h-[120px] group shrink-0">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleImagePick}
          className="hidden"
          id={`product-image-${product.id}`}
        />
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="w-full h-[120px] object-cover bg-white/5" />
        ) : (
          <div className="w-full h-[120px] bg-white/5 flex items-center justify-center">
            <PhotoIcon className="w-6 h-6 text-white/20" />
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

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="flex items-center gap-2 text-white/40 text-[9px] font-black uppercase tracking-widest mb-1">
            Title
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-white/5 px-2.5 py-1.5 text-white font-black uppercase tracking-wide text-xs outline-none focus:bg-white/10 transition-colors duration-300"
          />
        </div>
        <div>
          <label className="flex items-center gap-2 text-white/40 text-[9px] font-black uppercase tracking-widest mb-1">
            <TagIcon className="w-3 h-3" />
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ServiceProduct['category'])}
            className="w-full bg-white/5 px-2.5 py-1.5 text-white font-mono text-xs outline-none focus:bg-white/10 transition-colors duration-300 capitalize"
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c} className="bg-black capitalize">
                {c.replace('-', ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2 text-white/40 text-[9px] font-black uppercase tracking-widest mb-1">
          <DocumentTextIcon className="w-3 h-3" />
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full bg-white/5 px-2.5 py-1.5 text-white/80 text-xs leading-snug outline-none focus:bg-white/10 transition-colors duration-300 resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white/5 p-2">
          <label className="flex items-center gap-2 text-white/40 text-[9px] font-black uppercase tracking-widest mb-1">
            <CurrencyDollarIcon className="w-3 h-3" />
            Price {product.priceType === 'recurring' ? `/ ${product.interval || 'mo'}` : ''}
          </label>
          <div className="flex items-center">
            <span className="text-white/40 font-mono text-xs mr-1">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              className="bg-transparent text-white font-mono font-bold text-sm outline-none w-full"
            />
          </div>
        </div>
        <div className="bg-white/5 p-2">
          <label className="flex items-center gap-2 text-white/40 text-[9px] font-black uppercase tracking-widest mb-1">
            Cost
          </label>
          <div className="flex items-center">
            <span className="text-white/40 font-mono text-xs mr-1">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={costInput}
              onChange={(e) => setCostInput(e.target.value)}
              className="bg-transparent text-white font-mono font-bold text-sm outline-none w-full"
              placeholder="0.00"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handleSave}
          disabled={saving || uploading}
          className="flex items-center gap-2 bg-white text-black px-4 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-white/80 transition-colors duration-300 disabled:opacity-50"
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

// Fourthwall shop products are managed on Fourthwall — this editor only tracks
// the cost basis locally for profit-margin / affiliate-commission calculations.
function ShopProductDetail({
  product,
  costRow,
  onSaved,
}: {
  product: ShopProduct;
  costRow: ProductCost | null;
  onSaved: (row: ProductCost) => void;
}) {
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
            headers: ADMIN_HEADERS,
            body: JSON.stringify({ cost }),
          })
        : await fetch('/api/admin/product-costs', {
            method: 'POST',
            headers: ADMIN_HEADERS,
            body: JSON.stringify({ productId: product.id, source: 'fourthwall', cost }),
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
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShoppingBagIcon className="w-4 h-4 text-white/40" />
          <span className="text-[9px] font-black uppercase tracking-[0.25em] text-white/40">Shop</span>
        </div>
        <a
          href={product.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors duration-300"
        >
          View on Fourthwall
          <ArrowTopRightOnSquareIcon className="w-3 h-3" />
        </a>
      </div>

      {product.images?.[0] ? (
        <img src={product.images[0]} alt={product.title} className="w-full h-[120px] object-cover bg-white/5" />
      ) : (
        <div className="w-full h-[120px] bg-white/5 flex items-center justify-center">
          <ShoppingBagIcon className="w-6 h-6 text-white/20" />
        </div>
      )}

      <h3 className="text-white font-black uppercase tracking-wide text-sm">{product.title}</h3>
      <p className="text-white/40 text-xs leading-snug">{product.description}</p>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white/5 p-2">
          <label className="flex items-center gap-2 text-white/40 text-[9px] font-black uppercase tracking-widest mb-1">
            <CurrencyDollarIcon className="w-3 h-3" />
            Price
          </label>
          <div className="flex items-center">
            <span className="text-white/40 font-mono text-xs mr-1">$</span>
            <span className="text-white font-mono font-bold text-sm">{product.price.toFixed(2)}</span>
          </div>
        </div>
        <div className="bg-white/5 p-2">
          <label className="flex items-center gap-2 text-white/40 text-[9px] font-black uppercase tracking-widest mb-1">
            Cost
          </label>
          <div className="flex items-center">
            <span className="text-white/40 font-mono text-xs mr-1">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={costInput}
              onChange={(e) => setCostInput(e.target.value)}
              className="bg-transparent text-white font-mono font-bold text-sm outline-none w-full"
              placeholder="0.00"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
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
        {error && <p className="text-red-400 text-xs font-mono w-full">{error}</p>}
      </div>
    </div>
  );
}
