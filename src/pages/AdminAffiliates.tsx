import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
  ListBulletIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import AffiliateEmailComposer from '@/components/admin/AffiliateEmailComposer';
import {
  Expandable,
  ExpandableTrigger,
  ExpandableCard,
  ExpandableCardHeader,
  ExpandableCardContent,
  ExpandableContent,
} from '@/components/ui/expandable';
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
  paypal_email: string | null;
  total_earnings: number;
  total_clicks: number;
  total_conversions: number;
  total_mlm_earnings: number;
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
  paypal_email: string;
  paypal_payout_batch_id: string | null;
  paypal_payout_item_id: string | null;
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
  affiliates?: { code: string };
};

type DashboardResponse = {
  summary: AffiliateSummary;
  affiliates: Affiliate[];
  commissions: Commission[];
  payoutRequests: PayoutRequest[];
};

function StatTile({
  label,
  value,
  icon: Icon,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  icon?: any;
  tone?: 'neutral' | 'success' | 'warn';
}) {
  const toneClass =
    tone === 'success'
      ? 'text-emerald-300'
      : tone === 'warn'
        ? 'text-amber-300'
        : 'text-white';
  return (
    <div className="flex items-center justify-between bg-black text-white rounded-none p-3 sm:p-4">
      <div className="flex items-center gap-3">
        {Icon ? <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white/70" /> : null}
        <span className="text-sm sm:text-base text-white/70">{label}</span>
      </div>
      <span className={cn('text-sm sm:text-lg font-semibold', toneClass)}>{value}</span>
    </div>
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
    <Expandable
      expandDirection="vertical"
      expandBehavior="replace"
      initialDelay={0.05}
      expanded={expanded}
      onToggle={() => setExpanded((prev) => !prev)}
    >
      {({ isExpanded }) => (
        <ExpandableTrigger>
          <ExpandableCard
            className="w-full bg-black text-white border-0"
            collapsedSize={{ width: '100%', height: 'auto' }}
            expandedSize={{ width: '100%', height: 'auto' }}
            hoverToExpand={false}
          >
            <ExpandableCardHeader className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold">{title}</h2>
                  {description ? <p className="text-white/60 text-sm sm:text-base mt-1">{description}</p> : null}
                </div>
                <div className="text-white/50 text-xs sm:text-sm">{isExpanded ? 'Tap to collapse' : 'Tap to expand'}</div>
              </div>
            </ExpandableCardHeader>
            <ExpandableCardContent className="pt-0">
              <ExpandableContent preset="slide-down" keepMounted>
                <div className="p-4 sm:p-5 space-y-4">{children}</div>
              </ExpandableContent>
            </ExpandableCardContent>
          </ExpandableCard>
        </ExpandableTrigger>
      )}
    </Expandable>
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
    return [
      { label: 'Affiliates', value: fmt(data.summary.total), icon: UsersIcon },
      { label: 'Active', value: fmt(data.summary.active), icon: CheckCircleIcon, tone: 'success' as const },
      { label: 'Revenue to Affiliates', value: `$${(data.summary.totalEarnings || 0).toFixed(2)}`, icon: CurrencyDollarIcon },
      { label: 'Clicks', value: fmt(data.summary.totalClicks), icon: CursorArrowRaysIcon },
      { label: 'Conversions', value: fmt(data.summary.totalConversions), icon: ChartBarIcon },
      { label: 'Pending Payouts', value: `$${(data.summary.pendingPayoutTotal || 0).toFixed(2)}`, icon: WalletIcon, tone: 'warn' as const },
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

  const handleProcessAllPayouts = async () => {
    try {
      setActionMessage('Processing payouts...');
      await postJson('/api/admin/process-payouts', { processAll: true });
      await load();
      setActionMessage('Payout processing requested (check PayPal dashboard for status).');
    } catch (err: any) {
      setActionMessage(err.message || 'Failed to process payouts');
    }
  };

  const handleRetryPayout = async (payoutId: string) => {
    try {
      setActionMessage('Retrying payout...');
      await postJson('/api/admin/process-payouts', { payoutRequestId: payoutId });
      await load();
      setActionMessage('Payout retry triggered.');
    } catch (err: any) {
      setActionMessage(err.message || 'Failed to retry payout');
    }
  };

  const handleApprovePayout = async (payoutId: string) => {
    try {
      setActionMessage('Approving payout...');
      await postJson('/api/admin/process-payouts', { requestIds: [payoutId], action: 'approve' });
      await load();
      setActionMessage('Payout approved. You can now pay via PayPal.');
    } catch (err: any) {
      setActionMessage(err.message || 'Failed to approve payout');
    }
  };

  const handlePayViaPayPal = async (payoutIds: string[]) => {
    if (!payoutIds.length) {
      setActionMessage('No approved payouts selected');
      return;
    }
    try {
      setActionMessage('Sending payout via PayPal...');
      const result = await postJson('/api/admin/process-payouts', { requestIds: payoutIds, action: 'pay-via-paypal' });
      await load();
      setActionMessage(`PayPal payout sent! Batch ID: ${result.batchId}, Total: $${result.totalAmount}`);
    } catch (err: any) {
      setActionMessage(err.message || 'Failed to send PayPal payout');
    }
  };

  const handlePayAllApproved = async () => {
    const approvedPayouts = data?.payoutRequests?.filter(p => p.status === 'approved') || [];
    if (!approvedPayouts.length) {
      setActionMessage('No approved payouts to pay');
      return;
    }
    const confirmed = window.confirm(
      `Send $${approvedPayouts.reduce((sum, p) => sum + (p.amount || 0), 0).toFixed(2)} to ${approvedPayouts.length} affiliate(s) via PayPal?`
    );
    if (!confirmed) return;
    await handlePayViaPayPal(approvedPayouts.map(p => p.id));
  };

  const handleApproveAllPending = async () => {
    const pendingPayouts = data?.payoutRequests?.filter(p => p.status === 'pending') || [];
    if (!pendingPayouts.length) {
      setActionMessage('No pending payouts to approve');
      return;
    }
    try {
      setActionMessage('Approving all pending payouts...');
      await postJson('/api/admin/process-payouts', { requestIds: pendingPayouts.map(p => p.id), action: 'approve' });
      await load();
      setActionMessage(`${pendingPayouts.length} payout(s) approved. Ready to pay via PayPal.`);
    } catch (err: any) {
      setActionMessage(err.message || 'Failed to approve payouts');
    }
  };

  const handleEditAffiliate = async (affiliate: Affiliate, field: 'commission_rate' | 'payment_threshold' | 'paypal_email') => {
    const current = affiliate[field] ?? '';
    const label = field === 'commission_rate' ? 'Commission rate (%)' : field === 'payment_threshold' ? 'Payout threshold ($)' : 'PayPal email';
    const input = window.prompt(`Update ${label} for ${affiliate.code || affiliate.id}`, String(current));
    if (input === null) return;
    const payload: any = { affiliateId: affiliate.id };
    payload[field] = field === 'paypal_email' ? input : Number(input);
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
            className="flex items-center gap-2 text-sm sm:text-base px-3 py-2 rounded-none border border-white/20 hover:border-white/60 transition-colors"
          >
            <ArrowPathIcon className={cn('w-4 h-4', refreshing && 'animate-spin')} />
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
  /* rest of component ... */

      {error && (
        <div className="mb-4 p-4 border border-red-500/50 text-red-200 bg-red-500/5 rounded-none">
          {error}
        </div>
      )}
      {actionMessage && (
        <div className="mb-4 p-3 border border-white/10 text-white/80 bg-white/5 rounded-none text-sm">
          {actionMessage}
        </div>
      )}

      {loading ? (
        <div className="text-white/70">Loading affiliate data...</div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          <SectionWrapper title="Summary" description="Top-line affiliate performance" defaultExpanded>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
              {kpis.map((kpi) => (
                <StatTile key={kpi.label} label={kpi.label} value={kpi.value} icon={kpi.icon} tone={kpi.tone as any} />
              ))}
            </div>
          </SectionWrapper>

          <SectionWrapper title="Payout Requests" description="Pending and recent payouts">
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={handleApproveAllPending}
                className="px-3 py-2 text-sm border border-white/20 text-white rounded-none hover:border-white/60"
              >
                Approve All Pending
              </button>
              <button
                onClick={handlePayAllApproved}
                className="px-3 py-2 text-sm bg-blue-600 text-white rounded-none hover:bg-blue-700"
              >
                Pay All Approved via PayPal
              </button>
              <button
                onClick={() => exportCsv(data?.payoutRequests || [], 'payout-requests')}
                className="px-3 py-2 text-sm border border-white/20 text-white rounded-none hover:border-white/60"
              >
                Export CSV
              </button>
            </div>
            <div className="text-xs text-white/50 mb-3">
              Workflow: Pending → Approve → Pay via PayPal → Paid
            </div>
            <div className="space-y-3">
              {data?.payoutRequests?.length ? (
                data.payoutRequests.map((payout) => (
                  <div
                    key={payout.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 sm:p-4 bg-black text-white rounded-none"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <StatusPill status={payout.status} />
                        <span className="text-sm text-white/60">Affiliate {payout.affiliates?.code || payout.affiliate_id}</span>
                      </div>
                      <div className="text-sm text-white">
                        ${payout.amount?.toFixed(2)} {payout.currency || 'USD'}
                      </div>
                      <div className="text-xs text-white/50">
                        Created {new Date(payout.created_at).toLocaleString()}
                        {payout.processed_at ? ` • Processed ${new Date(payout.processed_at).toLocaleString()}` : ''}
                      </div>
                      {payout.error_message ? (
                        <div className="text-xs text-amber-300 flex items-center gap-2">
                          <ExclamationTriangleIcon className="w-3 h-3" />
                          {payout.error_message}
                        </div>
                      ) : null}
                    </div>
                    <div className="text-xs text-white/60 space-y-1 sm:text-right">
                      {payout.paypal_payout_batch_id ? <div>Batch: {payout.paypal_payout_batch_id}</div> : null}
                      {payout.paypal_payout_item_id ? <div>Item: {payout.paypal_payout_item_id}</div> : null}
                      <div className="text-white/50">{payout.paypal_email}</div>
                      <div className="flex flex-wrap gap-1 justify-start sm:justify-end mt-2">
                        {payout.status === 'pending' && (
                          <button
                            onClick={() => handleApprovePayout(payout.id)}
                            className="px-2 py-1 text-xs bg-emerald-600 text-white rounded-none hover:bg-emerald-700"
                          >
                            Approve
                          </button>
                        )}
                        {payout.status === 'approved' && (
                          <button
                            onClick={() => handlePayViaPayPal([payout.id])}
                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded-none hover:bg-blue-700"
                          >
                            Pay via PayPal
                          </button>
                        )}
                        {(payout.status === 'pending' || payout.status === 'approved') && (
                          <button
                            onClick={() => handleRetryPayout(payout.id)}
                            className="px-2 py-1 text-xs border border-white/20 text-white rounded-none hover:border-white/60"
                          >
                            Retry
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-white/60 text-sm">No payout requests yet.</div>
              )}
            </div>
          </SectionWrapper>

          <SectionWrapper title="Affiliates" description="Status, earnings, and thresholds">
            <div className="flex flex-wrap gap-2 mb-2">
              <button
                onClick={() => exportCsv(data?.affiliates || [], 'affiliates')}
                className="px-3 py-2 text-sm border border-white/20 text-white rounded-none hover:border-white/60"
              >
                Export CSV
              </button>
            </div>
            <div className="space-y-3">
              {data?.affiliates?.length ? (
                data.affiliates.map((affiliate) => (
                  <div
                    key={affiliate.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 sm:p-4 bg-black text-white rounded-none"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <StatusPill status={affiliate.status} />
                        <span className="text-sm font-semibold">{affiliate.code || affiliate.id}</span>
                      </div>
                      <div className="text-sm text-white/70">
                        Rate: {affiliate.commission_rate}% • Threshold: ${affiliate.payment_threshold?.toFixed(2) || '—'}
                      </div>
                      <div className="text-sm text-white">
                        Earned: ${affiliate.total_earnings?.toFixed(2) || '0.00'} • Conversions: {affiliate.total_conversions || 0}
                      </div>
                      <div className="text-xs text-white/50">
                        Clicks: {affiliate.total_clicks || 0} • MLM: ${affiliate.total_mlm_earnings?.toFixed(2) || '0.00'}
                      </div>
                    </div>
                    <div className="text-xs text-white/60 sm:text-right space-y-1">
                      <div>{affiliate.paypal_email || 'No PayPal email set'}</div>
                      <div>Joined {new Date(affiliate.created_at).toLocaleDateString()}</div>
                      <div className="flex flex-wrap gap-1 justify-start sm:justify-end">
                        <button
                          onClick={() => handleEditAffiliate(affiliate, 'paypal_email')}
                          className="px-2 py-1 text-xs border border-white/20 text-white rounded-none hover:border-white/60"
                        >
                          Edit PayPal
                        </button>
                        <button
                          onClick={() => handleEditAffiliate(affiliate, 'commission_rate')}
                          className="px-2 py-1 text-xs border border-white/20 text-white rounded-none hover:border-white/60"
                        >
                          Edit Rate
                        </button>
                        <button
                          onClick={() => handleEditAffiliate(affiliate, 'payment_threshold')}
                          className="px-2 py-1 text-xs border border-white/20 text-white rounded-none hover:border-white/60"
                        >
                          Edit Threshold
                        </button>
                        <button
                          onClick={() => handleManualCommission(affiliate)}
                          className="px-2 py-1 text-xs bg-white text-black rounded-none hover:bg-white/80"
                        >
                          Manual Commission
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-white/60 text-sm">No affiliates found.</div>
              )}
            </div>
          </SectionWrapper>

          <SectionWrapper title="Recent Commissions" description="Latest earnings by affiliate">
            <div className="flex flex-wrap gap-2 mb-2">
              <button
                onClick={() => exportCsv(data?.commissions || [], 'commissions')}
                className="px-3 py-2 text-sm border border-white/20 text-white rounded-none hover:border-white/60"
              >
                Export CSV
              </button>
            </div>
            <div className="space-y-3">
              {data?.commissions?.length ? (
                data.commissions.map((commission) => (
                  <div
                    key={commission.id}
                    className={cn(
                      "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 sm:p-4 bg-black text-white rounded-none",
                      commission.status === 'cancelled' && "opacity-60 border-l-2 border-red-500"
                    )}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <StatusPill status={commission.status} />
                        <span className="text-sm text-white/80">
                          {commission.affiliates?.code || commission.affiliate_id}
                        </span>
                      </div>
                      <div className={cn("text-sm", commission.status === 'cancelled' ? "text-red-400 line-through" : "text-white")}>
                        ${commission.amount?.toFixed(2)} • Profit {commission.profit_generated?.toFixed(2) ?? '—'} • Cost{' '}
                        {commission.product_cost?.toFixed(2) ?? '—'}
                      </div>
                      <div className="text-xs text-white/50">
                        {commission.source || 'paypal'} • {commission.order_id || 'no-order-id'}
                      </div>
                      {commission.status === 'cancelled' && commission.cancelled_reason && (
                        <div className="text-xs text-red-400 flex items-center gap-1">
                          <ExclamationTriangleIcon className="w-3 h-3" />
                          {commission.cancelled_reason}
                          {commission.cancelled_at && (
                            <span className="text-red-400/60"> • {new Date(commission.cancelled_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      )}
                      {commission.status === 'pending' && commission.available_date && (
                        <div className="text-xs text-yellow-400">
                          Available: {new Date(commission.available_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-white/60 sm:text-right">
                      {new Date(commission.created_at).toLocaleString()}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-white/60 text-sm">No commissions yet.</div>
              )}
            </div>
          </SectionWrapper>

          <SectionWrapper title="Cancelled / Chargebacks" description="Commissions cancelled due to refunds, chargebacks, or disputes">
            <div className="space-y-3">
              {(() => {
                const cancelled = data?.commissions?.filter(c => c.status === 'cancelled') || [];
                return cancelled.length ? (
                  cancelled.map((commission) => (
                    <div
                      key={commission.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 sm:p-4 bg-red-950/30 text-white rounded-none border-l-2 border-red-500"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <ExclamationTriangleIcon className="w-4 h-4 text-red-400" />
                          <span className="text-sm font-semibold text-red-300">
                            {commission.cancelled_reason || 'Cancelled'}
                          </span>
                        </div>
                        <div className="text-sm text-white/80">
                          Affiliate: {commission.affiliates?.code || commission.affiliate_id}
                        </div>
                        <div className="text-sm text-red-400 line-through">
                          ${commission.amount?.toFixed(2)} commission
                        </div>
                        <div className="text-xs text-white/50">
                          Order: {commission.order_id || 'N/A'} • Source: {commission.source || 'unknown'}
                        </div>
                      </div>
                      <div className="text-xs text-white/60 sm:text-right">
                        <div>Created: {new Date(commission.created_at).toLocaleString()}</div>
                        {commission.cancelled_at && (
                          <div className="text-red-400">Cancelled: {new Date(commission.cancelled_at).toLocaleString()}</div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-white/60 text-sm p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-none">
                    ✓ No cancelled commissions or chargebacks. All commissions are in good standing.
                  </div>
                );
              })()}
            </div>
          </SectionWrapper>
        </div>
      )}

      <div className="mt-8 sm:mt-10 text-xs text-white/40 flex items-center gap-2">
        <ListBulletIcon className="w-3 h-3" /> Mobile-first layout: single column on phones, expandable cards with no borders.
      </div>
    </div>
  );
}

