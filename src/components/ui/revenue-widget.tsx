import { ReactNode, useEffect, useState } from 'react';
import { cn } from './utils';
import { useLongPress } from './use-long-press';
import { DetailSheet } from './detail-sheet';
import { Sparkline } from './viz';

/** Shape of /api/admin/revenue-summary. */
export interface RevenueSummary {
  waterfall: { grossCents: number; feesCents: number; cogsCents: number; payoutCents: number; refundCents: number; netCents: number };
  time: { mtdCents: number; lastMonthCents: number; series: number[] };
  sources: { source: string; totalCents: number; mtdCents: number; lastMonthCents: number; count: number }[];
  outstanding: { receivableCents: number; commissionsOwedCents: number };
  customers: { orderCount: number; avgOrderCents: number; uniqueCustomers: number; returningCustomers: number };
}

export interface RevenueWidgetData {
  /** Dollars, all sources combined. */
  total: number;
  /** Per-source split: affiliate, gallery, bookings. Dollars. */
  sources: { label: string; value: number }[];
  /** Recent daily revenue, oldest first. Dollars. */
  series: number[];
  /** Money out. Dollars. */
  refunds?: number;
}

const compact = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 10_000 ? `${Math.round(n / 1000)}K`
  : n >= 1_000 ? `${(n / 1000).toFixed(1)}K`
  : `${Math.round(n)}`;

const dollars = (n: number) => `$${compact(n)}`;

/** Percent change of the last week against the one before it. */
function weekDelta(series: number[]): number | null {
  if (series.length < 14) return null;
  const last = series.slice(-7).reduce((a, b) => a + b, 0);
  const prev = series.slice(-14, -7).reduce((a, b) => a + b, 0);
  if (prev === 0) return null;
  return ((last - prev) / prev) * 100;
}

/** Label · share bar on the sources' shared scale · value. */
function ShareRow({ label, value, max, u }: { label: string; value: number; max: number; u: (n: number) => string }) {
  return (
    <div
      className="flex items-center uppercase tracking-widest tabular-nums"
      style={{ fontSize: u(5.4), lineHeight: 1.2, gap: u(3) }}
    >
      <span className="text-current opacity-40 truncate" style={{ width: u(34) }}>{label}</span>
      <span className="relative flex-1 min-w-0 text-green-400" style={{ height: u(1.3) }}>
        <span className="absolute inset-0 bg-current opacity-10" />
        <span className="absolute top-0 bottom-0 left-0 bg-current" style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }} />
      </span>
      <span className="text-right font-bold" style={{ width: u(14) }}>{dollars(value)}</span>
    </div>
  );
}

/**
 * Revenue performance tile. Nine shapes, each its own view: the small squares
 * are the diagonal face with the revenue trace as the mass, wide shapes spend
 * width on the trace, tall ones on the source split. Long press (or click)
 * opens the expanded card with the full breakdown.
 */
const usd = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

function DetailRow({ label, value, tone }: { label: string; value: string; tone?: 'green' | 'red' | 'dim' }) {
  return (
    <div className="flex items-baseline justify-between py-2">
      <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{label}</span>
      <span className={cn(
        'text-sm font-bold tabular-nums',
        tone === 'green' ? 'text-green-400' : tone === 'red' ? 'text-red-400' : tone === 'dim' ? 'text-white/50' : 'text-white',
      )}>{value}</span>
    </div>
  );
}

/** The expanded card: waterfall, time framing, sources, outstanding, customers. */
function RevenueDetail({ summary: s }: { summary: RevenueSummary }) {
  const mtdDelta = s.time.lastMonthCents > 0
    ? ((s.time.mtdCents - s.time.lastMonthCents) / s.time.lastMonthCents) * 100
    : null;
  const h = 'text-[10px] font-black uppercase tracking-widest text-white/40 text-left mb-1';
  return (
    <div className="space-y-8 text-left">
      {/* 30 days of money, big. */}
      <div className="text-green-400">
        <Sparkline values={s.time.series.length >= 2 ? s.time.series : [0, 0]} className="h-24" />
      </div>

      {/* Gross → net waterfall */}
      <div>
        <h3 className={h}>Waterfall</h3>
        <DetailRow label="Gross revenue" value={usd(s.waterfall.grossCents)} />
        <DetailRow label="Processor fees (est)" value={`−${usd(s.waterfall.feesCents)}`} tone="dim" />
        <DetailRow label="Print COGS" value={`−${usd(s.waterfall.cogsCents)}`} tone="dim" />
        <DetailRow label="Contractor payouts" value={`−${usd(s.waterfall.payoutCents)}`} tone="dim" />
        <DetailRow label="Refunds" value={`−${usd(s.waterfall.refundCents)}`} tone="red" />
        <DetailRow label="Net" value={usd(s.waterfall.netCents)} tone="green" />
      </div>

      {/* Time framing */}
      <div>
        <h3 className={h}>This Month</h3>
        <DetailRow label="Month to date" value={usd(s.time.mtdCents)} />
        <DetailRow label="Last month" value={usd(s.time.lastMonthCents)} tone="dim" />
        {mtdDelta !== null && (
          <DetailRow label="Change" value={`${mtdDelta >= 0 ? '▲' : '▼'} ${Math.abs(mtdDelta).toFixed(0)}%`} tone={mtdDelta >= 0 ? 'green' : 'red'} />
        )}
      </div>

      {/* Sources */}
      <div>
        <h3 className={h}>Sources</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="text-[9px] font-black uppercase tracking-widest text-white/30 text-left">
                <th className="py-1 pr-4 font-black">Source</th>
                <th className="py-1 pr-4 font-black text-right">MTD</th>
                <th className="py-1 pr-4 font-black text-right">Last Mo</th>
                <th className="py-1 pr-4 font-black text-right">All Time</th>
                <th className="py-1 font-black text-right">Orders</th>
              </tr>
            </thead>
            <tbody>
              {s.sources.map(src => (
                <tr key={src.source} className="text-white/80">
                  <td className="py-1.5 pr-4 text-[11px] font-bold uppercase tracking-widest">{src.source}</td>
                  <td className="py-1.5 pr-4 text-right">{usd(src.mtdCents)}</td>
                  <td className="py-1.5 pr-4 text-right text-white/50">{usd(src.lastMonthCents)}</td>
                  <td className="py-1.5 pr-4 text-right">{usd(src.totalCents)}</td>
                  <td className="py-1.5 text-right text-white/50">{src.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Outstanding */}
      <div>
        <h3 className={h}>Outstanding</h3>
        <DetailRow label="Invoices receivable" value={usd(s.outstanding.receivableCents)} />
        <DetailRow label="Commissions owed" value={`−${usd(s.outstanding.commissionsOwedCents)}`} tone="dim" />
      </div>

      {/* Customers */}
      <div>
        <h3 className={h}>Customers</h3>
        <DetailRow label="Orders" value={String(s.customers.orderCount)} />
        <DetailRow label="Average order" value={usd(s.customers.avgOrderCents)} />
        <DetailRow label="Unique customers" value={String(s.customers.uniqueCustomers)} />
        <DetailRow label="Returning" value={String(s.customers.returningCustomers)} />
      </div>

      <p className="text-[10px] uppercase tracking-widest text-white/25">
        Test and demo transactions excluded. Fees estimated at 2.9% + 30¢.
      </p>
    </div>
  );
}

const summaryToData = (s: RevenueSummary): RevenueWidgetData => ({
  // The headline is GROSS: total money taken in.
  //
  // It was net, and net is the wrong headline for two reasons. It contradicted
  // everything shown beneath it: the source rows and the 30-day sparkline are
  // both gross, so the big number never equalled the sum of its own breakdown.
  // And it moves for reasons that are not sales; correcting a contractor
  // payout from $0 to its true value dropped the all-time total, which a
  // headline revenue figure must never do.
  //
  // Net is not hidden; it is the last line of the waterfall in the expanded
  // card, under the fees and payouts that explain the gap.
  total: s.waterfall.grossCents / 100,
  sources: s.sources.map(x => ({
    label: x.source.charAt(0).toUpperCase() + x.source.slice(1),
    value: x.totalCents / 100,
  })),
  series: s.time.series,
  refunds: s.waterfall.refundCents / 100,
});

export function RevenueWidget({ size = '2x2', data: pinned, detail, className }: {
  size?: string;
  /** Pinned data for spec harnesses; omitted on the dashboard, where the
   *  widget fetches /api/admin/revenue-summary itself. */
  data?: RevenueWidgetData;
  /** Extra content appended to the expanded card (legacy graph, ledger). */
  detail?: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const press = useLongPress(() => setOpen(true));

  useEffect(() => {
    if (pinned) return;
    let alive = true;
    fetch('/api/admin/revenue-summary')
      .then(r => (r.ok ? r.json() : null))
      .then(s => { if (alive && s?.waterfall) setSummary(s); })
      .catch(() => { /* tile shows the loading state until data lands */ });
    return () => { alive = false; };
  }, [pinned]);

  const data = pinned ?? (summary ? summaryToData(summary) : null);
  if (!data) {
    return (
      <div className={cn('bg-black flex items-center', className)} style={{ borderRadius: 0, containerType: 'size' }}>
        <span className="uppercase tracking-widest text-white/30 text-left" style={{ fontSize: '9cqmin', padding: '7cqmin' }}>
          Loading…
        </span>
      </div>
    );
  }
  const cols = Number(size.split('x')[0]) || 2;
  const rows = Number(size.split('x')[1]) || 2;
  // Same rescale the weather widget uses: 4x4's cqmin is ~2x its siblings'.
  const S = cols >= 4 && rows >= 4 ? 0.55 : 1;
  const u = (n: number) => `${n * S}cqmin`;

  const delta = weekDelta(data.series);
  const maxSource = Math.max(...data.sources.map(s => s.value), 1);

  const totalBlock = (big: boolean) => (
    <div className="flex flex-col text-left shrink-0">
      <span className="font-black uppercase tracking-widest opacity-40" style={{ fontSize: u(big ? 6 : 5), lineHeight: 1 }}>
        Revenue
      </span>
      <span className="font-black leading-none text-green-400 tabular-nums" style={{ fontSize: u(big ? 21 : 15), marginTop: u(2) }}>
        {dollars(data.total)}
      </span>
      {delta !== null && (
        <span className="uppercase tracking-widest tabular-nums opacity-50" style={{ fontSize: u(4.6), lineHeight: 1.2, marginTop: u(2) }}>
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(0)}% wk
        </span>
      )}
    </div>
  );

  return (
    <>
      <div
        {...press}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true); } }}
        aria-label="Revenue: open full breakdown"
        className={cn(
          'relative bg-black text-white flex flex-col cursor-pointer touch-manipulation select-none overflow-hidden',
          className,
        )}
        style={{
          borderRadius: 0,
          containerType: 'size',
          WebkitTouchCallout: 'none',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <div className="relative flex-1 min-h-0 flex flex-col" style={{ padding: '7cqmin' }}>
          {(cols === 1 && rows === 1) || (cols === 2 && rows === 2) ? (
            /* The diagonal face: the trace is the mass in the upper half, the
               figure holds the bottom-left: same composition as the weather
               1x1/2x2, so the small squares read as a family. */
            <div className="flex-1 min-h-0 relative">
              {/* The trace is the upper mass, opposite the figure; the same
                  corner opposition as the weather face's glyph. */}
              <div className="absolute top-0 left-0 right-0 opacity-60 text-green-400" style={{ height: '42%' }}>
                <Sparkline values={data.series.length >= 2 ? data.series : [0, 0]} className="h-full" />
              </div>
              <div className="absolute left-0 bottom-0 flex flex-col text-left">
                <span className="font-black uppercase tracking-widest opacity-40" style={{ fontSize: '9cqmin', lineHeight: 1, marginBottom: '3cqmin' }}>
                  Revenue
                </span>
                <span className="font-black leading-none text-green-400 tabular-nums" style={{ fontSize: '30cqmin' }}>
                  {dollars(data.total)}
                </span>
              </div>
            </div>
          ) : rows === 1 ? (
            /* Strips: the figure, then the trace across the remaining width;
               the full row adds the per-source figures between them. */
            <div className="flex-1 min-h-0 flex items-center text-left" style={{ gap: '6cqmin' }}>
              <div className="flex flex-col shrink-0">
                <span className="font-black uppercase tracking-widest opacity-40" style={{ fontSize: '10cqmin', lineHeight: 1 }}>Revenue</span>
                <span className="font-black leading-none text-green-400 tabular-nums" style={{ fontSize: '30cqmin', marginTop: '3cqmin' }}>
                  {dollars(data.total)}
                </span>
              </div>
              {cols >= 4 && data.sources.map(s => (
                <div key={s.label} className="flex flex-col shrink-0">
                  <span className="uppercase tracking-widest opacity-40" style={{ fontSize: '8cqmin', lineHeight: 1 }}>{s.label}</span>
                  <span className="font-bold tabular-nums" style={{ fontSize: '15cqmin', marginTop: '3cqmin' }}>{dollars(s.value)}</span>
                </div>
              ))}
              <div className="flex-1 min-w-0 self-center opacity-70 text-green-400" style={{ height: '42cqmin' }}>
                <Sparkline values={data.series.length >= 2 ? data.series : [0, 0]} className="h-full" />
              </div>
            </div>
          ) : cols === 1 ? (
            /* One unit wide: figure on top, the source split filling the rest.
               The 1x4 adds the trace at the foot. */
            <div className="flex-1 min-h-0 flex flex-col justify-between text-left">
              <div className="flex flex-col">
                <span className="font-black uppercase tracking-widest opacity-40" style={{ fontSize: '9cqmin', lineHeight: 1 }}>Revenue</span>
                <span className="font-black leading-none text-green-400 tabular-nums" style={{ fontSize: '26cqmin', marginTop: '3cqmin' }}>
                  {dollars(data.total)}
                </span>
              </div>
              <div className={cn('flex flex-col', rows >= 4 && 'flex-1 justify-evenly')} style={{ marginTop: '6cqmin', gap: rows >= 4 ? undefined : '5cqmin' }}>
                {data.sources.map(s => (
                  <div key={s.label} className="flex flex-col" style={{ gap: '2cqmin' }}>
                    <div className="flex items-baseline justify-between uppercase tracking-widest tabular-nums" style={{ fontSize: '9cqmin', lineHeight: 1 }}>
                      <span className="opacity-40">{s.label.slice(0, 4)}</span>
                      <span className="font-bold">{dollars(s.value)}</span>
                    </div>
                    <span className="relative block text-green-400" style={{ height: '1.5cqmin' }}>
                      <span className="absolute inset-0 bg-current opacity-10" />
                      <span className="absolute top-0 bottom-0 left-0 bg-current" style={{ width: `${(s.value / maxSource) * 100}%` }} />
                    </span>
                  </div>
                ))}
              </div>
              {rows >= 4 && (
                <div className="opacity-70 text-green-400" style={{ marginTop: '6cqmin', height: '22cqmin' }}>
                  <Sparkline values={data.series.length >= 2 ? data.series : [0, 0]} className="h-full" />
                </div>
              )}
            </div>
          ) : (
            /* The large composed views: figure, trace, and the source split
               with share bars, arranged by what the shape has room for. */
            <div className="flex-1 min-h-0 flex flex-col justify-between" style={{ gap: u(6) }}>
              <div className={cn('flex', cols >= 4 && rows === 2 ? 'items-center' : 'items-start justify-between')} style={{ gap: u(6) }}>
                {totalBlock(true)}
                {cols >= 4 && rows === 2 && (
                  <div className="flex-1 min-w-0 self-center opacity-70 text-green-400" style={{ height: `${30 * S}cqmin` }}>
                    <Sparkline values={data.series.length >= 2 ? data.series : [0, 0]} className="h-full" />
                  </div>
                )}
              </div>

              {!(cols >= 4 && rows === 2) && (
                <div className="w-full opacity-70 text-green-400" style={{ height: u(20) }}>
                  <Sparkline values={data.series.length >= 2 ? data.series : [0, 0]} className="h-full" />
                </div>
              )}

              <div className={cn('flex flex-col', rows >= 4 && 'flex-1 justify-evenly')} style={{ gap: rows >= 4 ? undefined : u(2.5) }}>
                {data.sources.map(s => (
                  <ShareRow key={s.label} label={s.label} value={s.value} max={maxSource} u={u} />
                ))}
                {typeof data.refunds === 'number' && rows >= 4 && (
                  <div className="flex items-center justify-between uppercase tracking-widest tabular-nums" style={{ fontSize: u(5.4), lineHeight: 1.2 }}>
                    <span className="opacity-40">Refunds</span>
                    <span className="font-bold text-red-400">−{dollars(data.refunds)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {open && (
        <DetailSheet onClose={() => setOpen(false)} label="Close revenue detail" wide>
          <h2 className="text-lg font-black uppercase tracking-widest text-white pr-10 mb-6 text-left">Revenue Performance</h2>
          {summary && <RevenueDetail summary={summary} />}
          {detail}
        </DetailSheet>
      )}
    </>
  );
}
