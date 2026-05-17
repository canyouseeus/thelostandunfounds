import { useState, useEffect, useMemo } from 'react';
import { AdminBentoCard } from '../ui/admin-bento-card';
import {
  LinkIcon, ClipboardIcon, CheckIcon, ArrowTopRightOnSquareIcon,
  MagnifyingGlassIcon, FireIcon, SparklesIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../ui/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type ProductType = 'physical' | 'digital' | 'gallery' | 'event';
type SortKey = 'popular' | 'hot' | 'new' | 'price_asc' | 'price_desc' | 'earnings_desc';
type FilterType = 'all' | ProductType;

export interface PricingTier {
  quantity: number;   // number of photos / units
  price: number;      // total price for this tier
}

export interface AffiliateProduct {
  id: string;
  title: string;
  type: ProductType;
  price: number;           // retail price (USD) — lowest tier or base price
  profit: number;          // estimated profit per sale after costs
  image?: string;
  url: string;             // relative path e.g. /shop/poster-1
  salesCount?: number;     // all-time units sold
  isNew?: boolean;
  isHot?: boolean;
  category?: string;
  pricingTiers?: PricingTier[];  // gallery bundle options (quantity → total price)
}

interface DeepLinkGeneratorProps {
  affiliateCode: string;
  products?: AffiliateProduct[];   // injected by parent (or fetched below)
  commissionRate?: number;          // default 42
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<ProductType, string> = {
  physical: 'Physical',
  digital: 'Digital',
  gallery: 'Gallery',
  event: 'Event',
};

const TYPE_COLORS: Record<ProductType, string> = {
  physical: 'text-blue-400',
  digital: 'text-purple-400',
  gallery: 'text-amber-400',
  event: 'text-green-400',
};

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'popular', label: 'Most Popular' },
  { key: 'hot',     label: 'Hot' },
  { key: 'new',     label: 'Newest' },
  { key: 'earnings_desc', label: 'Top Earners' },
  { key: 'price_desc',    label: 'Price ↓' },
  { key: 'price_asc',     label: 'Price ↑' },
];

function buildAffiliateUrl(productUrl: string, code: string): string {
  try {
    let urlStr = productUrl.trim();
    if (urlStr.startsWith('/')) urlStr = window.location.origin + urlStr;
    else if (!urlStr.match(/^https?:\/\//)) urlStr = 'https://' + urlStr;
    const url = new URL(urlStr);
    url.searchParams.set('ref', code);
    return url.toString();
  } catch {
    return productUrl;
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProductCard({
  product,
  commissionRate,
  affiliateCode,
  onLinkGenerated,
}: {
  product: AffiliateProduct;
  commissionRate: number;
  affiliateCode: string;
  onLinkGenerated: (link: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const affiliateLink = buildAffiliateUrl(product.url, affiliateCode);
  const yourCut = product.profit * (commissionRate / 100);

  const copy = () => {
    navigator.clipboard.writeText(affiliateLink);
    setCopied(true);
    onLinkGenerated(affiliateLink);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white/[0.03] hover:bg-white/[0.06] transition-colors flex flex-col group/card">
      {/* Image */}
      <div className="aspect-square overflow-hidden bg-white/5 relative">
        {product.image ? (
          <img
            src={product.image}
            alt={product.title}
            className="w-full h-full object-cover group-hover/card:scale-[1.03] transition-transform duration-500"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-white/10 text-3xl font-black uppercase tracking-tighter">
              {product.title.charAt(0)}
            </span>
          </div>
        )}
        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1">
          {product.isHot && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-500/90 text-white text-[8px] font-black uppercase tracking-widest">
              <FireIcon className="w-2.5 h-2.5" /> Hot
            </span>
          )}
          {product.isNew && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-green-500/90 text-white text-[8px] font-black uppercase tracking-widest">
              <SparklesIcon className="w-2.5 h-2.5" /> New
            </span>
          )}
        </div>
        {/* Type pill */}
        <div className="absolute top-2 right-2">
          <span className={cn('px-1.5 py-0.5 bg-black/70 text-[8px] font-black uppercase tracking-widest', TYPE_COLORS[product.type])}>
            {TYPE_LABELS[product.type]}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col flex-1">
        <div className="font-bold text-white text-xs uppercase tracking-wide leading-tight mb-2 flex-1 line-clamp-2">
          {product.title}
        </div>

        <div className="flex items-end justify-between mb-3">
          <div>
            <div className="text-[9px] text-white/30 uppercase tracking-widest font-bold">Retail</div>
            <div className="text-sm font-black text-white/60 font-mono">${product.price.toFixed(2)}</div>
          </div>
          <div className="text-right">
            <div className="text-[9px] text-green-400/70 uppercase tracking-widest font-bold">You earn</div>
            <div className="text-sm font-black text-green-400 font-mono">${yourCut.toFixed(2)}</div>
          </div>
        </div>

        {product.salesCount != null && (
          <div className="text-[9px] text-white/20 uppercase tracking-widest font-bold mb-2">
            {product.salesCount.toLocaleString()} sold
          </div>
        )}

        {/* Bundle pricing tiers — gallery only */}
        {product.pricingTiers && product.pricingTiers.length > 1 && (
          <div className="mb-3 space-y-px">
            {product.pricingTiers.map((tier) => {
              const tierCut = tier.price * (commissionRate / 100);
              return (
                <div key={tier.quantity} className="grid grid-cols-2 text-[9px] font-mono px-2 py-1 bg-white/[0.03] gap-1">
                  <span className="text-white/40 font-bold uppercase">
                    {tier.quantity}×
                  </span>
                  <div className="flex flex-col items-end">
                    <span className="text-white/60">${tier.price.toFixed(2)}</span>
                    <span className="text-green-400 font-black">+${tierCut.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button
          onClick={copy}
          className={cn(
            'w-full py-2 text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5',
            copied
              ? 'bg-green-500/20 text-green-400'
              : 'bg-white/10 text-white hover:bg-white hover:text-black'
          )}
        >
          {copied ? <CheckIcon className="w-3 h-3" /> : <ClipboardIcon className="w-3 h-3" />}
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DeepLinkGenerator({
  affiliateCode,
  products: injectedProducts,
  commissionRate = 42,
}: DeepLinkGeneratorProps) {
  const [activeTab, setActiveTab] = useState<'generate' | 'products'>('generate');

  // ── Generator tab state ──
  const [targetUrl, setTargetUrl] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Products tab state ──
  const [products, setProducts] = useState<AffiliateProduct[]>(injectedProducts ?? []);
  const [loadingProducts, setLoadingProducts] = useState(!injectedProducts);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortKey, setSortKey] = useState<SortKey>('popular');

  // Fetch products if not injected
  useEffect(() => {
    if (injectedProducts) { setProducts(injectedProducts); setLoadingProducts(false); return; }
    let cancelled = false;
    setLoadingProducts(true);
    fetch('/api/affiliates/products')
      .then(r => r.json())
      .then(data => { if (!cancelled) { setProducts(data.products ?? []); setLoadingProducts(false); } })
      .catch(() => { if (!cancelled) setLoadingProducts(false); });
    return () => { cancelled = true; };
  }, [injectedProducts]);

  // ── Filtered + sorted product list ──
  const displayedProducts = useMemo(() => {
    let list = products.filter(p => {
      const matchesType = filterType === 'all' || p.type === filterType;
      const matchesSearch = !search || p.title.toLowerCase().includes(search.toLowerCase());
      return matchesType && matchesSearch;
    });

    list = [...list].sort((a, b) => {
      switch (sortKey) {
        case 'popular':      return (b.salesCount ?? 0) - (a.salesCount ?? 0);
        case 'hot':          return (b.isHot ? 1 : 0) - (a.isHot ? 1 : 0) || (b.salesCount ?? 0) - (a.salesCount ?? 0);
        case 'new':          return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0);
        case 'earnings_desc': return (b.profit * commissionRate / 100) - (a.profit * commissionRate / 100);
        case 'price_asc':    return a.price - b.price;
        case 'price_desc':   return b.price - a.price;
        default:             return 0;
      }
    });

    return list;
  }, [products, filterType, search, sortKey, commissionRate]);

  // ── Generator helpers ──
  const generateLink = () => {
    setError(null);
    if (!targetUrl.trim()) { setGeneratedLink(''); return; }
    try {
      let urlStr = targetUrl.trim();
      if (urlStr.startsWith('/')) urlStr = window.location.origin + urlStr;
      else if (!urlStr.match(/^https?:\/\//)) urlStr = 'https://' + urlStr;
      const url = new URL(urlStr);
      url.searchParams.set('ref', affiliateCode);
      setGeneratedLink(url.toString());
    } catch {
      setError('Please enter a valid URL (e.g., https://thelostandunfounds.com/shop/book)');
      setGeneratedLink('');
    }
  };

  const copyToClipboard = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const TYPE_FILTERS: { key: FilterType; label: string }[] = [
    { key: 'all',      label: 'All' },
    { key: 'physical', label: 'Physical' },
    { key: 'digital',  label: 'Digital' },
    { key: 'gallery',  label: 'Gallery' },
    { key: 'event',    label: 'Events' },
  ];

  return (
    <AdminBentoCard
      title="Deep Link Generator"
      icon={<LinkIcon className="w-4 h-4" />}
      colSpan={12}
      className="min-h-[200px]"
      defaultCollapsed={false}
    >
      {/* Tab switcher */}
      <div className="flex mb-6 -mx-5 -mt-5 bg-white/[0.03]">
        {(['generate', 'products'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-5 py-3 text-[10px] font-black uppercase tracking-widest transition-colors relative',
              activeTab === tab ? 'text-white' : 'text-white/30 hover:text-white/60'
            )}
          >
            {tab === 'generate' ? 'Link Generator' : `Products${products.length ? ` (${products.length})` : ''}`}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 right-0 h-px bg-white" />
            )}
          </button>
        ))}
      </div>

      {/* ── GENERATE TAB ── */}
      {activeTab === 'generate' && (
        <div className="space-y-6">
          <div>
            <label className="text-[10px] items-center font-bold text-white/40 uppercase tracking-widest mb-2 block">
              Target Page URL
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-4 w-4 text-white/40" />
                </div>
                <input
                  type="text"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="Paste any shop URL (e.g. /shop/poster-1)"
                  className="w-full bg-white/5 pl-10 pr-4 py-3 text-white text-sm focus:outline-none focus:bg-white/10 transition-all placeholder:text-white/20 font-mono"
                  onKeyDown={(e) => e.key === 'Enter' && generateLink()}
                />
              </div>
              <button
                onClick={generateLink}
                className="px-6 py-3 bg-white/10 text-white font-bold uppercase tracking-wider text-xs hover:bg-white hover:text-black transition-all"
              >
                Generate
              </button>
            </div>
            {error && <div className="mt-2 text-red-500 text-xs font-bold uppercase tracking-wider">{error}</div>}
          </div>

          {generatedLink && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-[10px] items-center font-bold text-green-400 uppercase tracking-widest mb-2 flex gap-2">
                <CheckIcon className="w-3 h-3" /> Ready to Share
              </label>
              <div className="flex flex-col md:flex-row gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedLink}
                  className="flex-1 bg-white/5 px-4 py-3 text-white/80 text-sm font-mono focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={copyToClipboard}
                    className="px-6 py-3 bg-white text-black font-bold uppercase tracking-wider text-xs hover:bg-white/90 transition-all flex items-center gap-2 min-w-[140px] justify-center"
                  >
                    {copied ? <CheckIcon className="w-4 h-4" /> : <ClipboardIcon className="w-4 h-4" />}
                    {copied ? 'Copied' : 'Copy Link'}
                  </button>
                  <a
                    href={generatedLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-3 bg-white/5 text-white hover:bg-white/10 transition-all flex items-center justify-center"
                    title="Test Link"
                  >
                    <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white/[0.03] p-4">
            <h4 className="text-white text-xs font-bold uppercase tracking-widest mb-1">Pro Tip</h4>
            <p className="text-white/60 text-xs leading-relaxed">
              Linking directly to a specific product increases conversion rates by up to 300% compared to the homepage. Use the Products tab to browse every item and grab an affiliate link in one click.
            </p>
          </div>
        </div>
      )}

      {/* ── PRODUCTS TAB ── */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          {/* Search + filters row */}
          <div className="flex flex-col gap-2">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products…"
                className="w-full bg-white/5 pl-9 pr-4 py-2.5 text-white text-xs font-mono focus:outline-none focus:bg-white/10 transition-all placeholder:text-white/20"
              />
            </div>

            {/* Type filter + Sort on same row */}
            <div className="flex gap-px flex-wrap">
              {TYPE_FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilterType(f.key)}
                  className={cn(
                    'px-3 py-2 text-[9px] font-black uppercase tracking-widest transition-colors flex-shrink-0',
                    filterType === f.key ? 'bg-white text-black' : 'bg-white/5 text-white/40 hover:text-white'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Sort */}
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="w-full bg-white/5 text-white/60 text-[9px] font-black uppercase tracking-widest px-3 py-2.5 focus:outline-none hover:bg-white/10 transition-colors cursor-pointer"
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Summary bar */}
          <div className="flex items-center justify-between text-[9px] text-white/20 uppercase tracking-widest font-bold">
            <span>{displayedProducts.length} product{displayedProducts.length !== 1 ? 's' : ''}</span>
            <span>You earn {commissionRate}% of profit per sale</span>
          </div>

          {/* Grid */}
          {loadingProducts ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="bg-white/[0.03] animate-pulse aspect-square" />
              ))}
            </div>
          ) : displayedProducts.length === 0 ? (
            <div className="py-16 text-center text-white/20 text-xs font-bold uppercase tracking-widest">
              {search ? `No products matching "${search}"` : 'No products found'}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {displayedProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  commissionRate={commissionRate}
                  affiliateCode={affiliateCode}
                  onLinkGenerated={(link) => {
                    setGeneratedLink(link);
                    // Don't switch tabs — just show confirmation in place
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </AdminBentoCard>
  );
}
