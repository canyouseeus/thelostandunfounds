import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRightIcon,
  ArrowPathIcon,
  UsersIcon,
  CurrencyDollarIcon,
  CursorArrowRaysIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  WalletIcon,
  ChartBarIcon,
  EnvelopeIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import AffiliateEmailComposer from '@/components/admin/AffiliateEmailComposer';
import { LoadingSpinner } from '../components/Loading';
import { cn } from '@/components/ui/utils';

type AffiliateSummary = {
  total: number;
  active: number;
  inactive: number;
  totalEarnings: number;
  totalClicks: number;
  totalConversions: number;
  pendingPayoutTotal: number;
};

type Affiliate = {
  id: string;
  code: string;
  status: string;
  commission_rate: number;
  payment_threshold: number;
  stripe_account_id: string | null;
  stripe_account_status: 'pending' | 'restricted' | 'active' | 'rejected' | null;
  stripe_payouts_enabled: boolean | null;
  stripe_charges_enabled: boolean | null;
  stripe_details_submitted: boolean | null;
  total_earnings: number;
  total_clicks: number;
  total_conversions: number;
  total_mlm_earnings: number;
  is_flagged: boolean | null;
  created_at: string;
};

type Commission = {
  id: string;
  affiliate_id: string;
  order_id: string | null;
  amount: number;
  profit_generated: number | null;
  product_cost: number | null;
  status: string;
  source: string | null;
  created_at: string;
  available_date?: string | null;
  cancelled_reason?: string | null;
  cancelled_at?: string | null;
  affiliates?: { code: string };
};

type PayoutRequest = {
  id: string;
  affiliate_id: string;
  amount: number;
  currency: string;
  status: string;
  stripe_account_id: string | null;
  stripe_transfer_id: string | null;
  payout_method: string | null;
  error_message: string | null;
  notes: string | null;
  created_at: string;
  processed_at: string | null;
  paid_at: string | null;
  affiliates?: { code: string };
};

type ClickEvent = {
  id: string;
  affiliate_id: string;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  is_suspicious: boolean | null;
  rate_limited: boolean | null;
  affiliates?: { code: string };
};

type DiscountCode = {
  id: string;
  affiliate_id: string;
  code: string;
  discount_percent: number;
  is_active: boolean;
};

type DashboardResponse = {
  summary: AffiliateSummary;
  affiliates: Affiliate[];
  commissions: Commission[];
  payoutRequests: PayoutRequest[];
  clickEvents: ClickEvent[];
  discountCodes: DiscountCode[];
};

function StatTile({
  label,
  value,
  sub,
  icon: Icon,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: any;
  tone?: 'neutral' | 'success' | 'warn';
}) {
  const toneClass =
    tone === 'success' ? 'text-emerald-300'
    : tone === 'warn' ? 'text-amber-300'
    : 'text-white';
  return (
    <div className="bg-white/[0.05] p-6 flex flex-col gap-0">
      <div className="flex items-center gap-2 mb-4">
        {Icon ? <Icon className="w-4 h-4 text-white/25" /> : null}
        <span className="text-[10px] text-white/40 uppercase tracking-[0.15em] font-medium">{label}</span>
      </div>
      <span className={cn('text-3xl sm:text-4xl font-black font-mono leading-none', toneClass)}>{value}</span>
      {sub ? <span className="text-[9px] text-white/25 uppercase tracking-wide mt-3">{sub}</span> : null}
    </div>
  );
}

function StripeStatusBadge({
  status,
  payoutsEnabled,
  accountId,
}: {
  status: Affiliate['stripe_account_status'];
  payoutsEnabled: boolean | null;
  accountId: string | null;
}) {
  if (!accountId) {
    return (
      <span className="px-2 py-1 text-xs rounded-none uppercase tracking-wide bg-white/10 text-white/60">
        Stripe: not connected
      </span>
    );
  }
  const normalized = (status || 'pending').toLowerCase();
  const map: Record<string, string> = {
    active: 'bg-emerald-400/20 text-emerald-200',
    pending: 'bg-amber-400/20 text-amber-300',
    restricted: 'bg-blue-400/20 text-blue-200',
    rejected: 'bg-red-400/20 text-red-200',
  };
  const label = payoutsEnabled
    ? `Stripe: ${normalized} • payouts on`
    : `Stripe: ${normalized}`;
  return (
    <span className={cn('px-2 py-1 text-xs rounded-none uppercase tracking-wide', map[normalized] || 'bg-white/10 text-white')}>
      {label}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const map: Record<string, string> = {
    pending: 'bg-amber-400/20 text-amber-300',
    processing: 'bg-blue-400/20 text-blue-200',
    completed: 'bg-emerald-400/20 text-emerald-200',
    paid: 'bg-emerald-400/20 text-emerald-200',
    approved: 'bg-emerald-400/20 text-emerald-200',
    failed: 'bg-red-400/20 text-red-200',
    cancelled: 'bg-gray-500/30 text-gray-200',
  };
  return (
    <span className={cn('px-2 py-1 text-xs rounded-none uppercase tracking-wide', map[normalized] || 'bg-white/10 text-white')}>
      {status}
    </span>
  );
}

function SectionWrapper({
  title,
  description,
  children,
  defaultExpanded = false,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="w-full bg-black text-white">
      <button
        type="button"
        className="w-full text-left p-4 sm:p-5 cursor-pointer"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold uppercase tracking-wide">{title}</h2>
            {description ? <p className="text-white/60 text-sm sm:text-base mt-1 normal-case">{description}</p> : null}
          </div>
          <div className="text-white/50 text-xs sm:text-sm shrink-0">{expanded ? 'Tap to collapse' : 'Tap to expand'}</div>
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 sm:px-5 sm:pb-5 flex flex-col gap-4">{children}</div>
      )}
    </div>
  );
}

export default function AdminAffiliates({ onBack }: { onBack?: () => void }) {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const load = async () => {
    try {
      setRefreshing(true);
      setError(null);
      const res = await fetch('/api/admin/affiliate-dashboard');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Failed to load dashboard');
      }
      const body = (await res.json()) as DashboardResponse;
      setData(body);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const kpis = useMemo(() => {
    if (!data) return [];
    const fmt = (n: number) => (isNaN(n) ? '0' : n.toLocaleString());
    const clicks = data.summary.totalClicks || 0;
    const conversions = data.summary.totalConversions || 0;
    const convRate = clicks > 0 ? ((conversions / clicks) * 100).toFixed(1) + '%' : '—';
    return [
      { label: 'Affiliates', value: fmt(data.summary.total), sub: `${fmt(data.summary.active)} active`, icon: UsersIcon },
      { label: 'Revenue Paid Out', value: `$${(data.summary.totalEarnings || 0).toFixed(2)}`, sub: 'total affiliate earnings', icon: CurrencyDollarIcon },
      { label: 'Clicks', value: fmt(clicks), sub: 'tracked link clicks', icon: CursorArrowRaysIcon },
      { label: 'Conversions', value: fmt(conversions), sub: `${convRate} conv. rate`, icon: ChartBarIcon, tone: conversions > 0 ? 'success' as const : 'neutral' as const },
      { label: 'Pending Payouts', value: `$${(data.summary.pendingPayoutTotal || 0).toFixed(2)}`, sub: 'awaiting transfer', icon: WalletIcon, tone: 'warn' as const },
      { label: 'Inactive', value: fmt(data.summary.inactive), sub: 'not yet active', icon: UsersIcon },
    ];
  }, [data]);

  const postJson = async (url: string, body: Record<string, any>) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new Error(payload?.error || 'Request failed');
    }
    return res.json();
  };

  const handleEditAffiliate = async (affiliate: Affiliate, field: 'commission_rate' | 'payment_threshold') => {
    const current = affiliate[field] ?? '';
    const label = field === 'commission_rate' ? 'Commission rate (%)' : 'Payout threshold ($)';
    const input = window.prompt(`Update ${label} for ${affiliate.code || affiliate.id}`, String(current));
    if (input === null) return;
    const payload: any = { affiliateId: affiliate.id, [field]: Number(input) };
    try {
      setActionMessage(`Updating ${label}...`);
      await postJson('/api/admin/update-affiliate', payload);
      await load();
      setActionMessage(`${label} updated.`);
    } catch (err: any) {
      setActionMessage(err.message || 'Update failed');
    }
  };

  const handleManualCommission = async (affiliate: Affiliate) => {
    const amountStr = window.prompt(`Add manual commission for ${affiliate.code || affiliate.id} (USD)`, '5.00');
    if (!amountStr) return;
    const amount = Number(amountStr);
    if (isNaN(amount) || amount <= 0) {
      setActionMessage('Amount must be greater than 0');
      return;
    }
    try {
      setActionMessage('Creating manual commission...');
      await postJson('/api/admin/manual-commission', { affiliateId: affiliate.id, amount, status: 'approved', source: 'manual-adjustment' });
      await load();
      setActionMessage('Manual commission added.');
    } catch (err: any) {
      setActionMessage(err.message || 'Failed to add manual commission');
    }
  };

  const exportCsv = (rows: any[], filename: string) => {
    if (!rows || !rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map((row) =>
        headers
          .map((h) => {
            const val = row[h];
            if (val === null || val === undefined) return '';
            const safe = String(val).replace(/"/g, '""');
            return `"${safe}"`;
          })
          .join(',')
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  /* Existing code ... */
  const [showComposer, setShowComposer] = useState(false);

  if (showComposer) {
    return (
      <div className="min-h-screen bg-black text-white px-0 py-0 sm:px-0 lg:px-0">
        <div className="mb-6">
          <button
            onClick={() => setShowComposer(false)}
            className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white mb-6 uppercase tracking-wider text-xs font-bold"
          >
            ← Back to Dashboard
          </button>
          <AffiliateEmailComposer />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white px-0 py-0 sm:px-0 lg:px-0">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div>
          {/* Removed breadcrumb for cleaner look in console */}
          <h1 className="text-2xl sm:text-3xl font-bold">Affiliate Program Dashboard</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowComposer(true)}
            className="flex items-center gap-2 text-sm sm:text-base px-3 py-2 rounded-none bg-white text-black hover:bg-white/90 transition-colors font-bold uppercase text-xs tracking-wider"
          >
            <EnvelopeIcon className="w-4 h-4" />
            Message Affiliates
          </button>
          <button
            onClick={load}
            className="flex items-center gap-2 text-sm sm:text-base px-3 py-2 rounded-none bg-white/5 hover:bg-white/10 transition-colors"
          >
            {refreshing ? <LoadingSpinner size="sm" /> : <ArrowPathIcon className="w-4 h-4" />}
            Refresh
          </button>
        </div>
      </div>

      <div className="mb-4 sm:mb-6">
        {onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white underline underline-offset-4"
          >
            Back to Top <ArrowUpRightIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 text-red-200 bg-red-500/10 rounded-none">
          {error}
        </div>
      )}
      {actionMessage && (
        <div className="mb-4 p-3 text-white/80 bg-white/10 rounded-none text-sm">
          {actionMessage}
        </div>
      )}

      {loading ? (
        <div className="text-white/70">Loading affiliate data...</div>
      ) : (
        <div className="flex flex-col gap-4 sm:gap-6">
          <SectionWrapper title="Summary" description="Top-line affiliate performance" defaultExpanded>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {kpis.map((kpi) => (
                <StatTile key={kpi.label} label={kpi.label} value={kpi.value} sub={kpi.sub} icon={kpi.icon} tone={kpi.tone as any} />
              ))}
            </div>
          </SectionWrapper>

          <SectionWrapper title="Recent Clicks" description="Last 20 link clicks tracked by the affiliate system">
            <div className="flex flex-col gap-3">
              {data?.clickEvents?.length ? (
                data.clickEvents.map((click) => (
                  <div
                    key={click.id}
                    className={cn(
                      'bg-white/[0.04] p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3',
                      click.is_suspicious && 'border-l-2 border-amber-500/60',
                      click.rate_limited && 'opacity-50'
                    )}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold uppercase tracking-wide">{click.affiliates?.code || click.affiliate_id}</span>
                        {click.is_suspicious && (
                          <span className="px-1.5 py-0.5 text-[10px] bg-amber-400/20 text-amber-300 uppercase tracking-wide">Suspicious</span>
                        )}
                        {click.rate_limited && (
                          <span className="px-1.5 py-0.5 text-[10px] bg-red-400/20 text-red-300 uppercase tracking-wide">Rate Limited</span>
                        )}
                      </div>
                      <div className="text-[11px] text-white/40 uppercase tracking-wide">
                        IP: {click.ip_address ? click.ip_address.replace(/\.\d+$/, '.***') : 'unknown'}
                        {click.metadata?.referrer ? ` · ${click.metadata.referrer}` : ''}
                      </div>
                    </div>
                    <div className="text-[11px] text-white/30 uppercase tracking-wide sm:text-right shrink-0">
                      {new Date(click.created_at).toLocaleString()}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-white/40 text-sm uppercase tracking-wide">No click events recorded yet.</div>
              )}
            </div>
          </SectionWrapper>

          <SectionWrapper title="Payout Requests" description="Stripe Connect transfers (affiliate-initiated)">
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => exportCsv(data?.payoutRequests || [], 'payout-requests')}
                className="px-3 py-2 text-sm bg-white/10 text-white rounded-none hover:bg-white/20"
              >
                Export CSV
              </button>
            </div>
            <div className="text-xs text-white/50 mb-3">
              Affiliates request payouts directly from their dashboard; Stripe transfers are executed instantly when payouts are enabled.
            </div>
            <div className="flex flex-col gap-3">
              {data?.payoutRequests?.length ? (
                data.payoutRequests.map((payout) => (
                  <div key={payout.id} className="bg-white/[0.04] p-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusPill status={payout.status} />
                        <span className="text-[10px] text-white/40 uppercase tracking-widest">{payout.affiliates?.code || payout.affiliate_id}</span>
                      </div>
                      <div className="text-2xl font-black font-mono text-white">
                        ${payout.amount?.toFixed(2)} <span className="text-sm font-normal text-white/40">{payout.currency || 'USD'}</span>
                      </div>
                      <div className="text-[11px] text-white/30 uppercase tracking-wide">
                        {new Date(payout.created_at).toLocaleString()}
                        {payout.paid_at ? ` · Paid ${new Date(payout.paid_at).toLocaleString()}` : payout.processed_at ? ` · Processed ${new Date(payout.processed_at).toLocaleString()}` : ''}
                      </div>
                      {payout.error_message ? (
                        <div className="text-[11px] text-amber-300 flex items-center gap-1.5 uppercase tracking-wide">
                          <ExclamationTriangleIcon className="w-3 h-3 shrink-0" />
                          {payout.error_message}
                        </div>
                      ) : null}
                    </div>
                    <div className="text-[11px] text-white/30 space-y-1 sm:text-right uppercase tracking-wide shrink-0">
                      {payout.stripe_transfer_id ? <div>Transfer: {payout.stripe_transfer_id}</div> : null}
                      {payout.stripe_account_id ? <div className="text-white/20">{payout.stripe_account_id}</div> : null}
                      {payout.payout_method ? <div>via {payout.payout_method}</div> : null}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-white/40 text-sm uppercase tracking-wide">No payout requests yet.</div>
              )}
            </div>
          </SectionWrapper>

          <SectionWrapper title="Affiliates" description="Status, earnings, and thresholds">
            <div className="flex flex-wrap gap-2 mb-2">
              <button
                onClick={() => exportCsv(data?.affiliates || [], 'affiliates')}
                className="px-3 py-2 text-sm bg-white/10 text-white rounded-none hover:bg-white/20"
              >
                Export CSV
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {data?.affiliates?.length ? (
                data.affiliates.map((affiliate) => (
                  <div key={affiliate.id} className="bg-white/[0.04] p-5 flex flex-col gap-4">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusPill status={affiliate.status} />
                        {affiliate.is_flagged && (
                          <span className="px-2 py-1 text-[10px] uppercase tracking-wide bg-red-400/20 text-red-200">Flagged</span>
                        )}
                        <span className="text-base font-black uppercase tracking-wider">{affiliate.code || affiliate.id}</span>
                      </div>
                      <div className="flex sm:justify-end">
                        <StripeStatusBadge
                          status={affiliate.stripe_account_status}
                          payoutsEnabled={affiliate.stripe_payouts_enabled}
                          accountId={affiliate.stripe_account_id}
                        />
                      </div>
                    </div>
                    {/* Stats row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: 'Earned', value: `$${affiliate.total_earnings?.toFixed(2) || '0.00'}` },
                        { label: 'Clicks', value: String(affiliate.total_clicks || 0) },
                        { label: 'Conversions', value: String(affiliate.total_conversions || 0) },
                        { label: 'Commission', value: `${affiliate.commission_rate}%` },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-white/[0.04] p-3">
                          <div className="text-[9px] text-white/30 uppercase tracking-widest mb-1">{label}</div>
                          <div className="text-lg font-black font-mono text-white">{value}</div>
                        </div>
                      ))}
                    </div>
                    {/* Discount codes */}
                    {(() => {
                      const codes = data?.discountCodes?.filter(d => d.affiliate_id === affiliate.id) || [];
                      return codes.length ? (
                        <div className="flex flex-wrap gap-1.5">
                          {codes.map(dc => (
                            <span key={dc.id} className="flex items-center gap-1 px-2 py-1 bg-white/[0.06] text-white/70 text-[10px] uppercase tracking-widest">
                              <TagIcon className="w-3 h-3" />
                              {dc.code}{dc.discount_percent > 0 ? ` · ${dc.discount_percent}% off` : ''}
                              {!dc.is_active && <span className="text-white/30 ml-1">inactive</span>}
                            </span>
                          ))}
                        </div>
                      ) : null;
                    })()}
                    {/* Footer: meta + actions */}
                    <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
                      <span className="text-[10px] text-white/25 uppercase tracking-wide">
                        Joined {new Date(affiliate.created_at).toLocaleDateString()} · Threshold ${affiliate.payment_threshold?.toFixed(2) || '—'}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        <button onClick={() => handleEditAffiliate(affiliate, 'commission_rate')} className="px-3 py-1.5 text-[10px] bg-white/10 text-white uppercase tracking-wide hover:bg-white/20">
                          Edit Rate
                        </button>
                        <button onClick={() => handleEditAffiliate(affiliate, 'payment_threshold')} className="px-3 py-1.5 text-[10px] bg-white/10 text-white uppercase tracking-wide hover:bg-white/20">
                          Edit Threshold
                        </button>
                        <button onClick={() => handleManualCommission(affiliate)} className="px-3 py-1.5 text-[10px] bg-white text-black uppercase tracking-wide font-bold hover:bg-white/80">
                          + Commission
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-white/40 text-sm uppercase tracking-wide">No affiliates found.</div>
              )}
            </div>
          </SectionWrapper>

          <SectionWrapper title="Recent Commissions" description="Latest earnings by affiliate">
            <div className="flex flex-wrap gap-2 mb-2">
              <button
                onClick={() => exportCsv(data?.commissions || [], 'commissions')}
                className="px-3 py-2 text-sm bg-white/10 text-white rounded-none hover:bg-white/20"
              >
                Export CSV
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {data?.commissions?.length ? (
                data.commissions.map((commission) => (
                  <div
                    key={commission.id}
                    className={cn(
                      'bg-white/[0.04] p-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4',
                      commission.status === 'cancelled' && 'opacity-60'
                    )}
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusPill status={commission.status} />
                        <span className="text-[10px] text-white/40 uppercase tracking-widest">{commission.affiliates?.code || commission.affiliate_id}</span>
                      </div>
                      <div className={cn('text-2xl font-black font-mono leading-none', commission.status === 'cancelled' ? 'text-red-400 line-through' : 'text-white')}>
                        ${commission.amount?.toFixed(2)}
                      </div>
                      <div className="text-[11px] text-white/30 uppercase tracking-wide">
                        {commission.source || 'unknown'} · {commission.order_id || 'no order'}
                        {commission.profit_generated != null ? ` · profit $${commission.profit_generated.toFixed(2)}` : ''}
                      </div>
                      {commission.status === 'cancelled' && commission.cancelled_reason && (
                        <div className="text-[11px] text-red-400 flex items-center gap-1.5 uppercase tracking-wide">
                          <ExclamationTriangleIcon className="w-3 h-3 shrink-0" />
                          {commission.cancelled_reason}
                          {commission.cancelled_at && <span className="text-red-400/50"> · {new Date(commission.cancelled_at).toLocaleDateString()}</span>}
                        </div>
                      )}
                      {commission.status === 'pending' && commission.available_date && (
                        <div className="text-[11px] text-amber-300 uppercase tracking-wide">
                          Available {new Date(commission.available_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <div className="text-[11px] text-white/25 uppercase tracking-wide sm:text-right shrink-0">
                      {new Date(commission.created_at).toLocaleString()}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-white/40 text-sm uppercase tracking-wide">No commissions yet.</div>
              )}
            </div>
          </SectionWrapper>

          <SectionWrapper title="Cancelled / Chargebacks" description="Commissions cancelled due to refunds, chargebacks, or disputes">
            <div className="flex flex-col gap-3">
              {(() => {
                const cancelled = data?.commissions?.filter(c => c.status === 'cancelled') || [];
                return cancelled.length ? (
                  cancelled.map((commission) => (
                    <div key={commission.id} className="bg-red-950/25 p-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                          <ExclamationTriangleIcon className="w-4 h-4 text-red-400 shrink-0" />
                          <span className="text-[10px] text-red-300 uppercase tracking-widest font-bold">
                            {commission.cancelled_reason || 'Cancelled'}
                          </span>
                        </div>
                        <div className="text-[10px] text-white/40 uppercase tracking-widest">
                          {commission.affiliates?.code || commission.affiliate_id}
                        </div>
                        <div className="text-2xl font-black font-mono text-red-400 line-through">
                          ${commission.amount?.toFixed(2)}
                        </div>
                        <div className="text-[11px] text-white/30 uppercase tracking-wide">
                          Order: {commission.order_id || 'N/A'} · {commission.source || 'unknown'}
                        </div>
                      </div>
                      <div className="text-[11px] text-white/25 uppercase tracking-wide sm:text-right shrink-0 space-y-1">
                        <div>{new Date(commission.created_at).toLocaleString()}</div>
                        {commission.cancelled_at && (
                          <div className="text-red-400/60">Cancelled {new Date(commission.cancelled_at).toLocaleString()}</div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-emerald-950/20 p-5 text-[11px] text-emerald-400/70 uppercase tracking-widest">
                    ✓ No cancelled commissions or chargebacks
                  </div>
                );
              })()}
            </div>
          </SectionWrapper>
        </div>
      )}

    </div>
  );
}

