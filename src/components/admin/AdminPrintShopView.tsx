import { useState, useEffect, useRef } from 'react';
import {
  PrinterIcon,
  TruckIcon,
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
  PlusIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
  SwatchIcon,
  ShieldCheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { cn } from '../ui/utils';
import { LoadingSpinner } from '../Loading';
import { ExpandableScreen, ExpandableScreenTrigger, ExpandableScreenContent } from '../ui/expandable-screen';
import { logApiCall, logError } from '../../lib/adminErrorLog';

type ProductStatus = 'active' | 'draft';

interface ProdigiProduct {
  id: string;
  sku: string;
  slug: string;
  title: string;
  description: string | null;
  category: string;
  image_url: string | null;
  mockup_template_url: string | null;
  mockup_bounds: { x: number; y: number; width: number; height: number } | null;
  base_cost: number;
  price: number;
  currency: string;
  featured: boolean;
  status: ProductStatus;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
}

interface PrintOption {
  id: string;
  size_label: string;
  width_in: number;
  height_in: number;
  framed: boolean;
  frame_color: string | null;
  mat_available: boolean;
  sku_landscape: string;
  sku_portrait: string;
  base_cost: number;
  price: number;
  currency: string;
  status: ProductStatus;
}

interface FrameTemplate {
  id: string;
  frame_color: string;
  orientation: 'landscape' | 'portrait';
  has_mat: boolean;
  template_url: string | null;
  bounds: { x: number; y: number; width: number; height: number } | null;
}

interface SkuCheckResult {
  sku: string;
  sources: string[];
  exists: boolean;
  error?: string;
  baseCost?: number;
  currency?: string;
  shippingCost?: number;
  quoteError?: string;
  productDimensions?: { width: number; height: number; units: string };
  attributes?: Record<string, string[]>;
}

interface ProdigiOrder {
  id: string;
  payment_source: 'stripe' | 'strike';
  sku: string;
  copies: number;
  unit_cost: number;
  unit_price: number;
  currency: string;
  customer_email: string | null;
  recipient: { name?: string; address?: { townOrCity?: string; countryCode?: string } } | null;
  status: string;
  prodigi_order_id: string | null;
  shipping_carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  error_message: string | null;
  created_at: string;
  prodigi_products?: { title: string; sku: string } | null;
}

const ADMIN_HEADERS = { 'Content-Type': 'application/json', 'X-Admin-Email': 'thelostandunfounds@gmail.com' };
const STATUS_LABEL: Record<ProductStatus, string> = { active: 'Publish', draft: 'Drafts' };

const ORDER_STATUS_COLOR: Record<string, string> = {
  pending_payment: 'text-white/30',
  paid: 'text-amber-400',
  submitted: 'text-amber-400',
  in_production: 'text-amber-400',
  shipped: 'text-emerald-400',
  complete: 'text-emerald-400',
  error: 'text-red-400',
  cancelled: 'text-white/30',
};

function Tab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
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
        <motion.div layoutId="printShopTabUnderline" className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-white" />
      )}
    </button>
  );
}

export default function AdminPrintShopView() {
  const [activeTab, setActiveTab] = useState<'catalog' | 'sizes' | 'frames' | 'orders'>('catalog');
  const [products, setProducts] = useState<ProdigiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const [orders, setOrders] = useState<ProdigiOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersLoaded, setOrdersLoaded] = useState(false);

  const [sizeOptions, setSizeOptions] = useState<PrintOption[]>([]);
  const [sizesLoading, setSizesLoading] = useState(false);
  const [sizesLoaded, setSizesLoaded] = useState(false);

  const [frameTemplates, setFrameTemplates] = useState<FrameTemplate[]>([]);
  const [framesLoading, setFramesLoading] = useState(false);
  const [framesLoaded, setFramesLoaded] = useState(false);

  const [verifying, setVerifying] = useState(false);
  const [verifyResults, setVerifyResults] = useState<SkuCheckResult[] | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifyCheckedAt, setVerifyCheckedAt] = useState<string | null>(null);

  const loadProducts = () => {
    setLoading(true);
    fetch('/api/admin/prodigi-products', { headers: ADMIN_HEADERS })
      .then((r) => {
        logApiCall('GET', '/api/admin/prodigi-products', r.status, '');
        return r.json();
      })
      .then((data) => setProducts(data.data || []))
      .catch((e) => logError(e.message || 'Failed to load print catalog'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const loadOrders = () => {
    setOrdersLoading(true);
    fetch('/api/admin/prodigi-orders', { headers: ADMIN_HEADERS })
      .then((r) => {
        logApiCall('GET', '/api/admin/prodigi-orders', r.status, '');
        return r.json();
      })
      .then((data) => {
        // Failed orders (customer charged, Prodigi submission never
        // happened) need eyes on them first — always float to the top.
        const rows: ProdigiOrder[] = data.data || [];
        rows.sort((a, b) => (a.status === 'error' ? -1 : 0) - (b.status === 'error' ? -1 : 0));
        setOrders(rows);
        setOrdersLoaded(true);
      })
      .catch((e) => logError(e.message || 'Failed to load print orders'))
      .finally(() => setOrdersLoading(false));
  };

  useEffect(() => {
    if (activeTab !== 'orders' || ordersLoaded) return;
    loadOrders();
  }, [activeTab, ordersLoaded]);

  useEffect(() => {
    if (activeTab !== 'sizes' || sizesLoaded) return;
    setSizesLoading(true);
    fetch('/api/admin/print-catalog', { headers: ADMIN_HEADERS })
      .then((r) => { logApiCall('GET', '/api/admin/print-catalog', r.status, ''); return r.json(); })
      .then((data) => { setSizeOptions(data.data || []); setSizesLoaded(true); })
      .catch((e) => logError(e.message || 'Failed to load print sizes'))
      .finally(() => setSizesLoading(false));
  }, [activeTab, sizesLoaded]);

  useEffect(() => {
    if (activeTab !== 'frames' || framesLoaded) return;
    setFramesLoading(true);
    fetch('/api/admin/frame-templates', { headers: ADMIN_HEADERS })
      .then((r) => { logApiCall('GET', '/api/admin/frame-templates', r.status, ''); return r.json(); })
      .then((data) => { setFrameTemplates(data.data || []); setFramesLoaded(true); })
      .catch((e) => logError(e.message || 'Failed to load frame templates'))
      .finally(() => setFramesLoading(false));
  }, [activeTab, framesLoaded]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const stamp = Date.now().toString(36);
      const res = await fetch('/api/admin/prodigi-products', {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({
          sku: `NEW-SKU-${stamp}`,
          slug: `new-print-${stamp}`,
          title: 'New Print',
          price: 0,
          baseCost: 0,
          status: 'draft',
        }),
      });
      logApiCall('POST', '/api/admin/prodigi-products', res.status, '');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create product');
      setProducts((prev) => [data.data, ...prev]);
      setExpandedId(data.data.id);
    } catch (e: any) {
      logError(e.message || 'Failed to create product');
    } finally {
      setCreating(false);
    }
  };

  const handleSyncStripe = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch('/api/admin/seed-prodigi-stripe-products', { method: 'POST', headers: ADMIN_HEADERS });
      logApiCall('POST', '/api/admin/seed-prodigi-stripe-products', res.status, '');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Stripe sync failed');
      setSyncMessage(`Synced ${data.results?.length || 0} products to Stripe`);
      loadProducts();
    } catch (e: any) {
      setSyncMessage(e.message || 'Stripe sync failed');
      logError(e.message || 'Prodigi Stripe sync failed');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  const handleVerifyCatalog = async () => {
    setVerifying(true);
    setVerifyError(null);
    try {
      const res = await fetch('/api/prodigi/verify-catalog', { method: 'POST', headers: ADMIN_HEADERS });
      logApiCall('POST', '/api/prodigi/verify-catalog', res.status, '');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Catalog verification failed');
      setVerifyResults(data.results || []);
      setVerifyCheckedAt(data.checkedAt || null);
    } catch (e: any) {
      setVerifyError(e.message || 'Catalog verification failed');
      logError(e.message || 'Prodigi catalog verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleSaved = (id: string, row: ProdigiProduct) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? row : p)));
  };

  const handleDeleted = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setExpandedId(null);
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
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="flex gap-12 pb-2">
          <Tab label="Catalog" active={activeTab === 'catalog'} onClick={() => setActiveTab('catalog')} />
          <Tab label="Sizes" active={activeTab === 'sizes'} onClick={() => setActiveTab('sizes')} />
          <Tab label="Frames" active={activeTab === 'frames'} onClick={() => setActiveTab('frames')} />
          <Tab label="Orders" active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleVerifyCatalog}
            disabled={verifying}
            title="Check every catalog SKU against Prodigi's live API and get real costs"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-widest bg-black text-white border border-white hover:bg-white hover:text-black transition-colors disabled:opacity-50"
            style={{ borderRadius: 0 }}
          >
            {verifying ? <ArrowPathIcon className="w-3 h-3 animate-spin" /> : <ShieldCheckIcon className="w-3 h-3" />}
            Verify Catalog
          </button>
          {activeTab === 'catalog' && (
            <>
              {syncMessage && <span className="text-[10px] font-mono text-white/50">{syncMessage}</span>}
              <button
                onClick={handleSyncStripe}
                disabled={syncing}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-widest bg-black text-white border border-white hover:bg-white hover:text-black transition-colors disabled:opacity-50"
                style={{ borderRadius: 0 }}
              >
                {syncing ? <ArrowPathIcon className="w-3 h-3 animate-spin" /> : <CloudArrowUpIcon className="w-3 h-3" />}
                Sync to Stripe
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-widest bg-white text-black border border-white hover:bg-black hover:text-white transition-colors disabled:opacity-50"
                style={{ borderRadius: 0 }}
              >
                <PlusIcon className="w-3 h-3" />
                New Print
              </button>
            </>
          )}
          {activeTab === 'orders' && (
            <button
              onClick={loadOrders}
              disabled={ordersLoading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-widest bg-black text-white border border-white hover:bg-white hover:text-black transition-colors disabled:opacity-50"
              style={{ borderRadius: 0 }}
            >
              <ArrowPathIcon className={cn('w-3 h-3', ordersLoading && 'animate-spin')} />
              Refresh
            </button>
          )}
        </div>
      </div>

      {verifyError && (
        <div className="bg-red-500/10 border border-red-500/30 p-3 mb-4 flex items-center justify-between gap-3">
          <p className="text-red-400 text-xs font-mono">{verifyError}</p>
          <button onClick={() => setVerifyError(null)} className="text-red-400 hover:text-white shrink-0"><XMarkIcon className="w-4 h-4" /></button>
        </div>
      )}

      {verifyResults && (
        <div className="bg-white/5 p-4 mb-6 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/40">
              Catalog Verification {verifyCheckedAt ? `— ${new Date(verifyCheckedAt).toLocaleString()}` : ''}
            </p>
            <button onClick={() => setVerifyResults(null)} className="text-white/40 hover:text-white"><XMarkIcon className="w-4 h-4" /></button>
          </div>
          <div className="flex flex-col gap-1.5 overflow-x-auto">
            {verifyResults.map((r) => (
              <div key={r.sku} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-b-0">
                <span className={cn('mt-0.5 shrink-0', r.exists ? 'text-emerald-400' : 'text-red-400')}>
                  {r.exists ? <CheckCircleIcon className="w-4 h-4" /> : <ExclamationTriangleIcon className="w-4 h-4" />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-mono text-xs font-bold">{r.sku}</span>
                    {r.exists && r.baseCost !== undefined && (
                      <span className="text-emerald-400 font-mono text-xs">
                        cost {r.currency || 'USD'} ${r.baseCost.toFixed(2)}
                        {r.shippingCost !== undefined ? ` + $${r.shippingCost.toFixed(2)} shipping` : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-white/30 text-[10px] mt-0.5">{r.sources.join(' · ')}</p>
                  {r.error && <p className="text-red-400 text-[10px] font-mono mt-1">{r.error}</p>}
                  {r.quoteError && <p className="text-amber-400 text-[10px] font-mono mt-1">Quote issue: {r.quoteError}</p>}
                  {r.productDimensions && (
                    <p className="text-white/40 text-[10px] font-mono mt-1">
                      {r.productDimensions.width}×{r.productDimensions.height}{r.productDimensions.units}
                    </p>
                  )}
                  {r.attributes && Object.keys(r.attributes).length > 0 && (
                    <p className="text-white/40 text-[10px] font-mono mt-1">
                      {Object.entries(r.attributes).map(([k, v]) => `${k}: ${v.join('/')}`).join('  ·  ')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'catalog' ? (
        products.length === 0 ? (
          <p className="text-white/30 text-xs uppercase tracking-widest text-center py-12">No prints yet — add one to get started</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {products.map((product) => {
              const profit = Math.max(0, product.price - product.base_cost);
              const isDraft = product.status === 'draft';

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
                      {product.image_url ? (
                        <img src={product.image_url} alt="" className="w-12 h-12 object-cover shrink-0 bg-white/10" />
                      ) : (
                        <div className="w-12 h-12 shrink-0 bg-white/10 flex items-center justify-center">
                          <PrinterIcon className="w-5 h-5 text-white/30" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[9px] font-black uppercase tracking-widest text-white/40 truncate">{product.sku}</span>
                          <span className="text-white font-mono text-sm font-bold whitespace-nowrap">${product.price.toFixed(2)}</span>
                        </div>
                        <h3 className="text-white font-black uppercase tracking-wide text-sm mt-1 truncate">{product.title}</h3>
                      </div>
                    </div>

                    <p className="text-white/40 text-xs line-clamp-2">{product.description || 'No description'}</p>

                    <div className="flex items-center gap-4 pt-1">
                      <span className="text-white/60 font-mono text-xs">cost ${product.base_cost.toFixed(2)}</span>
                      <span className="text-emerald-400 font-bold font-mono text-xs">profit ${profit.toFixed(2)}</span>
                      <span className={cn('ml-auto flex items-center gap-1 text-[9px] font-black uppercase tracking-widest', isDraft ? 'text-white/30' : 'text-emerald-400')}>
                        {isDraft ? <PauseCircleIcon className="w-3.5 h-3.5" /> : <CheckCircleIcon className="w-3.5 h-3.5" />}
                        {STATUS_LABEL[product.status]}
                      </span>
                    </div>
                    {!product.stripe_price_id && (
                      <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-amber-400">
                        <ExclamationTriangleIcon className="w-3 h-3" /> Not synced to Stripe
                      </span>
                    )}
                  </ExpandableScreenTrigger>

                  <ExpandableScreenContent className="overflow-hidden">
                    <div className="flex-1 overflow-hidden">
                      <div className="max-w-2xl mx-auto h-full px-4 sm:px-6 pt-14 pb-3 flex flex-col justify-center overflow-y-auto">
                        <ProductDetail product={product} onSaved={(row) => handleSaved(product.id, row)} onDeleted={() => handleDeleted(product.id)} />
                      </div>
                    </div>
                  </ExpandableScreenContent>
                </ExpandableScreen>
              );
            })}
          </div>
        )
      ) : activeTab === 'sizes' ? (
        sizesLoading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <LoadingSpinner size="lg" className="text-white" />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {sizeOptions.map((opt) => (
              <SizeOptionRow key={opt.id} option={opt} onSaved={(row) => setSizeOptions((prev) => prev.map((o) => (o.id === row.id ? row : o)))} />
            ))}
          </div>
        )
      ) : activeTab === 'frames' ? (
        framesLoading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <LoadingSpinner size="lg" className="text-white" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {frameTemplates.map((tpl) => (
              <FrameTemplateCard key={tpl.id} template={tpl} onSaved={(row) => setFrameTemplates((prev) => prev.map((t) => (t.id === row.id ? row : t)))} />
            ))}
          </div>
        )
      ) : ordersLoading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <LoadingSpinner size="lg" className="text-white" />
        </div>
      ) : orders.length === 0 ? (
        <p className="text-white/30 text-xs uppercase tracking-widest text-center py-12">No print orders yet</p>
      ) : (
        <div className="flex flex-col gap-2">
          {orders.map((order) => {
            const isError = order.status === 'error';
            return (
            <div
              key={order.id}
              className={cn(
                'p-4 flex flex-col sm:flex-row sm:items-center gap-3 border-l-4',
                isError ? 'bg-red-500/10 border-l-red-500' : 'bg-white/5 border-l-transparent'
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {isError && <ExclamationTriangleIcon className="w-4 h-4 text-red-400 shrink-0" />}
                  <span className="text-white font-black uppercase tracking-wide text-xs">
                    {order.prodigi_products?.title || order.sku}
                  </span>
                  <span className="text-white/30 text-[10px] font-mono">×{order.copies}</span>
                  <span className={cn('text-[9px] font-black uppercase tracking-widest', isError ? 'text-red-400' : ORDER_STATUS_COLOR[order.status] || 'text-white/40')}>
                    {order.status.replace('_', ' ')}
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/30">
                    {order.payment_source === 'strike' ? '⚡ Lightning' : 'Card'}
                  </span>
                </div>
                <p className="text-white/40 text-xs mt-1 truncate">
                  {order.customer_email || order.recipient?.name || 'Unknown customer'}
                  {order.recipient?.address?.townOrCity ? ` · ${order.recipient.address.townOrCity}, ${order.recipient.address.countryCode}` : ''}
                </p>
                {order.error_message && (
                  <p className="text-red-400 text-xs font-mono font-bold mt-1">{order.error_message}</p>
                )}
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <span className="text-white font-mono text-sm font-bold">${order.unit_price.toFixed(2)}</span>
                {order.tracking_number ? (
                  <a
                    href={order.tracking_url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white"
                  >
                    <TruckIcon className="w-3.5 h-3.5" />
                    {order.shipping_carrier || 'Track'}
                  </a>
                ) : (
                  <span className="text-[10px] font-mono text-white/20">{new Date(order.created_at).toLocaleDateString()}</span>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProductDetail({
  product,
  onSaved,
  onDeleted,
}: {
  product: ProdigiProduct;
  onSaved: (updated: ProdigiProduct) => void;
  onDeleted: () => void;
}) {
  const [sku, setSku] = useState(product.sku);
  const [title, setTitle] = useState(product.title);
  const [description, setDescription] = useState(product.description || '');
  const [category, setCategory] = useState(product.category);
  const [priceInput, setPriceInput] = useState(product.price.toString());
  const [costInput, setCostInput] = useState(product.base_cost.toString());
  const [status, setStatus] = useState<ProductStatus>(product.status);
  const [imageUrl, setImageUrl] = useState<string | null>(product.image_url);
  const [mockupUrl, setMockupUrl] = useState<string | null>(product.mockup_template_url);
  const [bounds, setBounds] = useState(product.mockup_bounds || { x: 25, y: 25, width: 50, height: 50 });
  const [uploading, setUploading] = useState<'image' | 'mockup' | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const mockupInputRef = useRef<HTMLInputElement>(null);

  const price = parseFloat(priceInput);
  const cost = costInput === '' ? 0 : parseFloat(costInput);
  const profit = !Number.isNaN(cost) && !Number.isNaN(price) ? Math.max(0, price - cost) : null;

  const uploadImage = async (file: File, kind: 'image' | 'mockup') => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Use a JPEG, PNG, or WebP image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB');
      return;
    }
    const localPreview = URL.createObjectURL(file);
    if (kind === 'image') setImageUrl(localPreview);
    else setMockupUrl(localPreview);
    setUploading(kind);
    setError(null);
    try {
      const res = await fetch('/api/admin/upload-product-image', {
        method: 'POST',
        headers: { 'Content-Type': file.type, 'X-Admin-Email': 'thelostandunfounds@gmail.com', 'X-Product-Id': `${product.id}-${kind}` },
        body: file,
      });
      logApiCall('POST', '/api/admin/upload-product-image', res.status, kind);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      if (kind === 'image') setImageUrl(data.url);
      else setMockupUrl(data.url);
    } catch (e: any) {
      setError(e.message || 'Upload failed');
      logError(e.message || 'Prodigi image upload failed');
      if (kind === 'image') setImageUrl(product.image_url);
      else setMockupUrl(product.mockup_template_url);
    } finally {
      setUploading(null);
    }
  };

  const handleSave = async () => {
    if (!sku.trim() || !title.trim()) {
      setError('SKU and title are required');
      return;
    }
    if (Number.isNaN(cost) || cost < 0) {
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
      const res = await fetch(`/api/admin/prodigi-products?id=${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Email': 'thelostandunfounds@gmail.com' },
        body: JSON.stringify({
          sku,
          title,
          description,
          category,
          price,
          baseCost: cost,
          status,
          imageUrl,
          mockupTemplateUrl: mockupUrl,
          mockupBounds: mockupUrl ? bounds : null,
        }),
      });
      logApiCall('PUT', '/api/admin/prodigi-products', res.status, product.id);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      onSaved(data.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      setError(e.message || 'Failed to save');
      logError(e.message || 'Failed to save Prodigi product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${product.title}"? This can't be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/prodigi-products?id=${product.id}`, {
        method: 'DELETE',
        headers: { 'X-Admin-Email': 'thelostandunfounds@gmail.com' },
      });
      logApiCall('DELETE', '/api/admin/prodigi-products', res.status, product.id);
      if (!res.ok) throw new Error('Failed to delete');
      onDeleted();
    } catch (e: any) {
      setError(e.message || 'Failed to delete');
      logError(e.message || 'Failed to delete Prodigi product');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <PrinterIcon className="w-4 h-4 text-white/40" />
          <span className="text-[9px] font-black uppercase tracking-[0.25em] text-white/40">Print Shop</span>
        </div>
        <div className="flex bg-white/5 p-0.5">
          {(['active', 'draft'] as ProductStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`flex items-center gap-1 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest transition-colors duration-300 ${status === s ? 'bg-white text-black' : 'text-white/40 hover:text-white/70'}`}
            >
              {s === 'active' ? <CheckCircleIcon className="w-3 h-3" /> : <PauseCircleIcon className="w-3 h-3" />}
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="flex items-center gap-2 text-white/40 text-[9px] font-black uppercase tracking-widest mb-1">Artwork / Product Photo</label>
          <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], 'image')} className="hidden" id={`prodigi-image-${product.id}`} />
          <div className="relative w-full h-[100px] group">
            {imageUrl ? <img src={imageUrl} alt={title} className="w-full h-[100px] object-cover bg-white/5" /> : <div className="w-full h-[100px] bg-white/5 flex items-center justify-center"><PhotoIcon className="w-6 h-6 text-white/20" /></div>}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
              {uploading === 'image' ? <LoadingSpinner size="sm" className="text-white" /> : (
                <label htmlFor={`prodigi-image-${product.id}`} className="p-2 bg-white text-black cursor-pointer hover:bg-white/80 transition-colors duration-300" title="Upload"><ArrowUpTrayIcon className="w-4 h-4" /></label>
              )}
            </div>
          </div>
        </div>
        <div>
          <label className="flex items-center gap-2 text-white/40 text-[9px] font-black uppercase tracking-widest mb-1">Mockup Template</label>
          <input ref={mockupInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], 'mockup')} className="hidden" id={`prodigi-mockup-${product.id}`} />
          <div className="relative w-full h-[100px] group">
            {mockupUrl ? <img src={mockupUrl} alt="Mockup" className="w-full h-[100px] object-cover bg-white/5" /> : <div className="w-full h-[100px] bg-white/5 flex items-center justify-center"><PhotoIcon className="w-6 h-6 text-white/20" /></div>}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
              {uploading === 'mockup' ? <LoadingSpinner size="sm" className="text-white" /> : (
                <>
                  <label htmlFor={`prodigi-mockup-${product.id}`} className="p-2 bg-white text-black cursor-pointer hover:bg-white/80 transition-colors duration-300" title="Upload"><ArrowUpTrayIcon className="w-4 h-4" /></label>
                  {mockupUrl && <button onClick={() => setMockupUrl(null)} className="p-2 bg-white/20 text-white hover:bg-red-500 transition-colors duration-300" title="Remove"><TrashIcon className="w-4 h-4" /></button>}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {mockupUrl && (
        <div className="grid grid-cols-4 gap-2">
          {(['x', 'y', 'width', 'height'] as const).map((key) => (
            <div key={key}>
              <label className="flex items-center gap-2 text-white/40 text-[9px] font-black uppercase tracking-widest mb-1">{key} %</label>
              <input
                type="number"
                min="0"
                max="100"
                value={bounds[key]}
                onChange={(e) => setBounds((prev) => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-white/5 px-2 py-1.5 text-white font-mono text-xs outline-none focus:bg-white/10 transition-colors duration-300"
              />
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="flex items-center gap-2 text-white/40 text-[9px] font-black uppercase tracking-widest mb-1">Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-white/5 px-2.5 py-1.5 text-white font-black uppercase tracking-wide text-xs outline-none focus:bg-white/10 transition-colors duration-300" />
        </div>
        <div>
          <label className="flex items-center gap-2 text-white/40 text-[9px] font-black uppercase tracking-widest mb-1"><TagIcon className="w-3 h-3" />Prodigi SKU</label>
          <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} className="w-full bg-white/5 px-2.5 py-1.5 text-white font-mono text-xs outline-none focus:bg-white/10 transition-colors duration-300" />
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2 text-white/40 text-[9px] font-black uppercase tracking-widest mb-1"><TagIcon className="w-3 h-3" />Category</label>
        <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="prints" className="w-full bg-white/5 px-2.5 py-1.5 text-white font-mono text-xs outline-none focus:bg-white/10 transition-colors duration-300" />
      </div>

      <div>
        <label className="flex items-center gap-2 text-white/40 text-[9px] font-black uppercase tracking-widest mb-1"><DocumentTextIcon className="w-3 h-3" />Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full bg-white/5 px-2.5 py-1.5 text-white/80 text-xs leading-snug outline-none focus:bg-white/10 transition-colors duration-300 resize-none" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white/5 p-2">
          <label className="flex items-center gap-2 text-white/40 text-[9px] font-black uppercase tracking-widest mb-1"><CurrencyDollarIcon className="w-3 h-3" />Price</label>
          <div className="flex items-center"><span className="text-white/40 font-mono text-xs mr-1">$</span><input type="number" min="0" step="0.01" value={priceInput} onChange={(e) => setPriceInput(e.target.value)} className="bg-transparent text-white font-mono font-bold text-sm outline-none w-full" /></div>
        </div>
        <div className="bg-white/5 p-2">
          <label className="flex items-center gap-2 text-white/40 text-[9px] font-black uppercase tracking-widest mb-1">Prodigi Cost</label>
          <div className="flex items-center"><span className="text-white/40 font-mono text-xs mr-1">$</span><input type="number" min="0" step="0.01" value={costInput} onChange={(e) => setCostInput(e.target.value)} className="bg-transparent text-white font-mono font-bold text-sm outline-none w-full" /></div>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={handleSave} disabled={saving || uploading !== null} className="flex items-center gap-2 bg-white text-black px-4 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-white/80 transition-colors duration-300 disabled:opacity-50">
          {saving ? <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" /> : saved ? <CheckIcon className="w-3.5 h-3.5" /> : null}
          {saving ? 'Saving' : saved ? 'Saved' : 'Save Changes'}
        </button>
        <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-2 bg-transparent text-red-400 border border-red-400/40 px-4 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors duration-300 disabled:opacity-50">
          <TrashIcon className="w-3.5 h-3.5" />
          Delete
        </button>
        {profit !== null && <span className="text-emerald-400 font-bold font-mono text-xs">profit ${profit.toFixed(2)}</span>}
        {error && <p className="text-red-400 text-xs font-mono w-full">{error}</p>}
      </div>
    </div>
  );
}

function SizeOptionRow({ option, onSaved }: { option: PrintOption; onSaved: (row: PrintOption) => void }) {
  const [skuLandscape, setSkuLandscape] = useState(option.sku_landscape);
  const [skuPortrait, setSkuPortrait] = useState(option.sku_portrait);
  const [costInput, setCostInput] = useState(option.base_cost.toString());
  const [priceInput, setPriceInput] = useState(option.price.toString());
  const [status, setStatus] = useState<ProductStatus>(option.status);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cost = parseFloat(costInput);
  const price = parseFloat(priceInput);
  const profit = !Number.isNaN(cost) && !Number.isNaN(price) ? Math.max(0, price - cost) : null;
  const margin = profit !== null && cost > 0 ? profit / cost : null;

  const handleSave = async () => {
    if (Number.isNaN(cost) || cost < 0 || Number.isNaN(price) || price < 0) {
      setError('Enter valid cost and price');
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/admin/print-catalog?id=${option.id}`, {
        method: 'PUT',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({ skuLandscape, skuPortrait, baseCost: cost, price, status }),
      });
      logApiCall('PUT', '/api/admin/print-catalog', res.status, option.id);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      onSaved(data.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      setError(e.message || 'Failed to save');
      logError(e.message || 'Failed to save print option');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white/5 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-white font-black uppercase tracking-wide text-sm">{option.width_in}×{option.height_in}"</span>
          <span className="text-[9px] font-black uppercase tracking-widest text-white/40">{option.framed ? `Framed (${option.frame_color || 'black'})` : 'Unframed'}</span>
          {option.framed && <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Includes Mount</span>}
        </div>
        <div className="flex bg-white/5 p-0.5">
          {(['active', 'draft'] as ProductStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`flex items-center gap-1 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest transition-colors duration-300 ${status === s ? 'bg-white text-black' : 'text-white/40 hover:text-white/70'}`}
            >
              {s === 'active' ? <CheckCircleIcon className="w-3 h-3" /> : <PauseCircleIcon className="w-3 h-3" />}
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="flex items-center gap-2 text-white/40 text-[9px] font-black uppercase tracking-widest mb-1"><TagIcon className="w-3 h-3" />SKU — Landscape</label>
          <input type="text" value={skuLandscape} onChange={(e) => setSkuLandscape(e.target.value)} className="w-full bg-white/5 px-2.5 py-1.5 text-white font-mono text-xs outline-none focus:bg-white/10 transition-colors duration-300" />
        </div>
        <div>
          <label className="flex items-center gap-2 text-white/40 text-[9px] font-black uppercase tracking-widest mb-1"><TagIcon className="w-3 h-3" />SKU — Portrait</label>
          <input type="text" value={skuPortrait} onChange={(e) => setSkuPortrait(e.target.value)} className="w-full bg-white/5 px-2.5 py-1.5 text-white font-mono text-xs outline-none focus:bg-white/10 transition-colors duration-300" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white/5 p-2">
          <label className="flex items-center gap-2 text-white/40 text-[9px] font-black uppercase tracking-widest mb-1"><CurrencyDollarIcon className="w-3 h-3" />Price</label>
          <div className="flex items-center"><span className="text-white/40 font-mono text-xs mr-1">$</span><input type="number" min="0" step="0.01" value={priceInput} onChange={(e) => setPriceInput(e.target.value)} className="bg-transparent text-white font-mono font-bold text-sm outline-none w-full" /></div>
        </div>
        <div className="bg-white/5 p-2">
          <label className="flex items-center gap-2 text-white/40 text-[9px] font-black uppercase tracking-widest mb-1">Prodigi Cost</label>
          <div className="flex items-center"><span className="text-white/40 font-mono text-xs mr-1">$</span><input type="number" min="0" step="0.01" value={costInput} onChange={(e) => setCostInput(e.target.value)} className="bg-transparent text-white font-mono font-bold text-sm outline-none w-full" /></div>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-white text-black px-4 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-white/80 transition-colors duration-300 disabled:opacity-50">
          {saving ? <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" /> : saved ? <CheckIcon className="w-3.5 h-3.5" /> : null}
          {saving ? 'Saving' : saved ? 'Saved' : 'Save Changes'}
        </button>
        {profit !== null && (
          <span className="text-emerald-400 font-bold font-mono text-xs">
            profit ${profit.toFixed(2)}{margin !== null ? ` (${margin.toFixed(1)}x)` : ''}
          </span>
        )}
        {error && <p className="text-red-400 text-xs font-mono w-full">{error}</p>}
      </div>
    </div>
  );
}

function FrameTemplateCard({ template, onSaved }: { template: FrameTemplate; onSaved: (row: FrameTemplate) => void }) {
  const [templateUrl, setTemplateUrl] = useState<string | null>(template.template_url);
  const [bounds, setBounds] = useState(template.bounds || { x: 20, y: 15, width: 60, height: 65 });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Use a JPEG, PNG, or WebP image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB');
      return;
    }
    const localPreview = URL.createObjectURL(file);
    setTemplateUrl(localPreview);
    setUploading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/upload-product-image', {
        method: 'POST',
        headers: { 'Content-Type': file.type, 'X-Admin-Email': 'thelostandunfounds@gmail.com', 'X-Product-Id': `frame-${template.id}` },
        body: file,
      });
      logApiCall('POST', '/api/admin/upload-product-image', res.status, template.id);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setTemplateUrl(data.url);
    } catch (e: any) {
      setError(e.message || 'Upload failed');
      setTemplateUrl(template.template_url);
      logError(e.message || 'Frame template upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/admin/frame-templates?id=${template.id}`, {
        method: 'PUT',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({ templateUrl, bounds }),
      });
      logApiCall('PUT', '/api/admin/frame-templates', res.status, template.id);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      onSaved(data.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      setError(e.message || 'Failed to save');
      logError(e.message || 'Failed to save frame template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white/5 p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <SwatchIcon className="w-4 h-4 text-white/40" />
        <span className="text-white font-black uppercase tracking-wide text-sm capitalize">{template.frame_color} — {template.orientation}</span>
        {template.has_mat && <span className="text-[9px] font-black uppercase tracking-widest text-white/30">With Mat</span>}
      </div>

      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
        className="hidden"
        id={`frame-template-${template.id}`}
      />
      <div className="relative w-full h-[160px] group">
        {templateUrl ? (
          <img src={templateUrl} alt="" className="w-full h-[160px] object-cover bg-white/5" />
        ) : (
          <div className="w-full h-[160px] bg-white/5 flex items-center justify-center">
            <PhotoIcon className="w-8 h-8 text-white/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
          {uploading ? (
            <LoadingSpinner size="sm" className="text-white" />
          ) : (
            <label htmlFor={`frame-template-${template.id}`} className="p-2 bg-white text-black cursor-pointer hover:bg-white/80 transition-colors duration-300" title="Upload">
              <ArrowUpTrayIcon className="w-4 h-4" />
            </label>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {(['x', 'y', 'width', 'height'] as const).map((key) => (
          <div key={key}>
            <label className="flex items-center gap-2 text-white/40 text-[9px] font-black uppercase tracking-widest mb-1">{key} %</label>
            <input
              type="number"
              min="0"
              max="100"
              value={bounds[key]}
              onChange={(e) => setBounds((prev) => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
              className="w-full bg-white/5 px-2 py-1.5 text-white font-mono text-xs outline-none focus:bg-white/10 transition-colors duration-300"
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={handleSave} disabled={saving || uploading} className="flex items-center gap-2 bg-white text-black px-4 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-white/80 transition-colors duration-300 disabled:opacity-50">
          {saving ? <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" /> : saved ? <CheckIcon className="w-3.5 h-3.5" /> : null}
          {saving ? 'Saving' : saved ? 'Saved' : 'Save Changes'}
        </button>
        {error && <p className="text-red-400 text-xs font-mono w-full">{error}</p>}
      </div>
    </div>
  );
}
