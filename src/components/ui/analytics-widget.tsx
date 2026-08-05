import { useEffect, useState } from 'react';
import { cn } from './utils';
import { useLongPress } from './use-long-press';
import { DetailSheet } from './detail-sheet';
import { Sparkline } from './viz';
import { CardStack, StackRow, FieldsCard, StackCard } from './card-stack';

interface Slice { label: string; count: number }

export interface AnalyticsWidgetData {
  views: number;
  visitors: number;
  bounceRate: number;
  /** Daily views, oldest first. */
  trend: number[];
  topPages: Slice[];
  devices: Slice[];
  sources: Slice[];
  geography: Slice[];
}

const compact = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 10_000 ? `${Math.round(n / 1000)}K`
  : n >= 1_000 ? `${(n / 1000).toFixed(1)}K`
  : n.toLocaleString();

/** Label · share bar on the group's scale · count. */
function ShareRow({ label, value, max, u }: { label: string; value: number; max: number; u: (n: number) => string }) {
  return (
    <div
      className="flex items-center uppercase tracking-widest tabular-nums"
      style={{ fontSize: u(5.4), lineHeight: 1.2, gap: u(3) }}
    >
      <span className="opacity-40 truncate" style={{ width: u(34) }}>{label}</span>
      <span className="relative flex-1 min-w-0" style={{ height: u(1.3) }}>
        <span className="absolute inset-0 bg-current opacity-10" />
        <span className="absolute top-0 bottom-0 left-0 bg-current" style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }} />
      </span>
      <span className="text-right font-bold" style={{ width: u(12) }}>{compact(value)}</span>
    </div>
  );
}

/** The explorer tree: overview → category (share rows) → item (fields). */
function analyticsRoot(data: AnalyticsWidgetData, onClose: () => void): StackCard {
  const categories: { label: string; slices: Slice[] }[] = [
    { label: 'Top Pages', slices: data.topPages },
    { label: 'Devices', slices: data.devices },
    { label: 'Traffic Sources', slices: data.sources },
    { label: 'Geography', slices: data.geography },
  ];

  const categoryCard = (label: string, slices: Slice[]): StackCard => ({
    title: label,
    render: nav => {
      const total = slices.reduce((n, s) => n + s.count, 0);
      return (
        <div className="space-y-px">
          {slices.length === 0 ? (
            <p className="text-[11px] uppercase tracking-widest text-white/30 py-4">No data yet.</p>
          ) : slices.map((s, i) => (
            <StackRow
              key={s.label}
              label={s.label}
              value={s.count.toLocaleString()}
              sub={total > 0 ? `${((s.count / total) * 100).toFixed(1)}% of ${label.toLowerCase()}` : undefined}
              onPress={() => nav.push({
                title: s.label,
                render: () => (
                  <FieldsCard fields={{
                    [label.replace(/s$/, '')]: s.label,
                    Views: s.count.toLocaleString(),
                    Share: total > 0 ? `${((s.count / total) * 100).toFixed(1)}%` : '—',
                    Rank: `#${i + 1} of ${slices.length}`,
                  }} />
                ),
              })}
            />
          ))}
        </div>
      );
    },
  });

  return {
    title: 'Site Analytics',
    render: nav => (
      <div className="space-y-4">
        <div style={{ height: 96 }}>
          <Sparkline values={data.trend.length >= 2 ? data.trend : [0, 0]} className="h-full opacity-80" />
        </div>
        <div className="space-y-px">
          <StackRow label="Total views" value={data.views.toLocaleString()} />
          <StackRow label="Unique visitors" value={data.visitors.toLocaleString()} />
          <StackRow label="Bounce rate" value={`${data.bounceRate.toFixed(0)}%`} />
        </div>
        <div className="space-y-px">
          {categories.map(c => (
            <StackRow
              key={c.label}
              label={c.label}
              value={String(c.slices.length)}
              onPress={() => nav.push(categoryCard(c.label, c.slices))}
            />
          ))}
        </div>
      </div>
    ),
  };
}

/**
 * Site analytics tile. The trace is the drawn mass in the widget family's
 * compositions; the views figure carries the face, and the larger shapes
 * spend their room on the page/device/source split. Click or long-press
 * opens the analytics explorer — card-stack drill-down like the registry.
 */
export function AnalyticsWidget({ size = '2x2', data: pinned, className }: {
  size?: string;
  /** Pinned data for spec harnesses; live fetch when omitted. */
  data?: AnalyticsWidgetData;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [live, setLive] = useState<AnalyticsWidgetData | null>(null);
  const press = useLongPress(() => setOpen(true));
  const cols = Number(size.split('x')[0]) || 2;
  const rows = Number(size.split('x')[1]) || 2;
  const S = cols >= 4 && rows >= 4 ? 0.55 : 1;
  const u = (n: number) => `${n * S}cqmin`;

  useEffect(() => {
    if (pinned) return;
    let alive = true;
    fetch('/api/admin/analytics/site-stats')
      .then(r => r.json())
      .then(d => {
        if (!alive || !d?.success || d.empty) return;
        setLive({
          views: d.totalViews ?? 0,
          visitors: d.uniqueVisitors ?? 0,
          bounceRate: d.bounceRate ?? 0,
          trend: (d.trend ?? []).map((t: { count: number }) => t.count),
          topPages: (d.topPages ?? []).map((p: { page: string; count: number }) => ({ label: p.page, count: p.count })),
          devices: (d.deviceBreakdown ?? []).map((p: { device: string; count: number }) => ({ label: p.device, count: p.count })),
          sources: (d.trafficSources ?? []).map((p: { source: string; count: number }) => ({ label: p.source, count: p.count })),
          geography: (d.geography ?? []).map((p: { country: string; count: number }) => ({ label: p.country, count: p.count })),
        });
      })
      .catch(() => { /* face keeps its loading state */ });
    return () => { alive = false; };
  }, [pinned]);

  const data = pinned ?? live;
  if (!data) {
    return (
      <div className={cn('bg-black flex items-center', className)} style={{ borderRadius: 0, containerType: 'size' }}>
        <span className="uppercase tracking-widest text-white/30 text-left" style={{ fontSize: '9cqmin', padding: '7cqmin' }}>
          Loading…
        </span>
      </div>
    );
  }

  const maxPage = Math.max(...data.topPages.map(p => p.count), 1);

  return (
    <>
      <div
        {...press}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true); } }}
        aria-label="Site analytics — open explorer"
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
            /* The diagonal face: the trace above, the views figure bottom-left. */
            <div className="flex-1 min-h-0 relative">
              <div className="absolute top-0 left-0 right-0 opacity-60" style={{ height: '42%' }}>
                <Sparkline values={data.trend.length >= 2 ? data.trend : [0, 0]} className="h-full" />
              </div>
              <div className="absolute left-0 bottom-0 flex flex-col text-left">
                <span className="font-black uppercase tracking-widest opacity-40" style={{ fontSize: '9cqmin', lineHeight: 1, marginBottom: '3cqmin' }}>
                  Views
                </span>
                <span className="font-black leading-none tabular-nums" style={{ fontSize: '30cqmin' }}>
                  {compact(data.views)}
                </span>
              </div>
            </div>
          ) : rows === 1 ? (
            /* Strips: figure, then the trace; the full row adds visitors and bounce. */
            <div className="flex-1 min-h-0 flex items-center text-left" style={{ gap: '6cqmin' }}>
              <div className="flex flex-col shrink-0">
                <span className="font-black uppercase tracking-widest opacity-40" style={{ fontSize: '10cqmin', lineHeight: 1 }}>Views</span>
                <span className="font-black leading-none tabular-nums" style={{ fontSize: '30cqmin', marginTop: '3cqmin' }}>
                  {compact(data.views)}
                </span>
              </div>
              {cols >= 4 && (
                <>
                  <div className="flex flex-col shrink-0">
                    <span className="uppercase tracking-widest opacity-40" style={{ fontSize: '8cqmin', lineHeight: 1 }}>Visitors</span>
                    <span className="font-bold tabular-nums" style={{ fontSize: '15cqmin', marginTop: '3cqmin' }}>{compact(data.visitors)}</span>
                  </div>
                  <div className="flex flex-col shrink-0">
                    <span className="uppercase tracking-widest opacity-40" style={{ fontSize: '8cqmin', lineHeight: 1 }}>Bounce</span>
                    <span className="font-bold tabular-nums" style={{ fontSize: '15cqmin', marginTop: '3cqmin' }}>{data.bounceRate.toFixed(0)}%</span>
                  </div>
                </>
              )}
              <div className="flex-1 min-w-0 self-center opacity-70" style={{ height: '42cqmin' }}>
                <Sparkline values={data.trend.length >= 2 ? data.trend : [0, 0]} className="h-full" />
              </div>
            </div>
          ) : cols === 1 ? (
            /* One unit wide: figure, visitors and bounce, top pages as bars. */
            <div className="flex-1 min-h-0 flex flex-col justify-between text-left">
              <div className="flex flex-col">
                <span className="font-black uppercase tracking-widest opacity-40" style={{ fontSize: '9cqmin', lineHeight: 1 }}>Views</span>
                <span className="font-black leading-none tabular-nums" style={{ fontSize: '26cqmin', marginTop: '3cqmin' }}>
                  {compact(data.views)}
                </span>
              </div>
              <div className={cn('flex flex-col', rows >= 4 && 'flex-1 justify-evenly')} style={{ marginTop: '6cqmin', gap: rows >= 4 ? undefined : '5cqmin' }}>
                {data.topPages.slice(0, rows >= 4 ? 6 : 3).map(p => (
                  <div key={p.label} className="flex flex-col" style={{ gap: '2cqmin' }}>
                    <div className="flex items-baseline justify-between uppercase tracking-widest tabular-nums" style={{ fontSize: '9cqmin', lineHeight: 1 }}>
                      <span className="opacity-40 truncate" style={{ maxWidth: '55cqmin' }}>{p.label.replace(/^\//, '') || 'home'}</span>
                      <span className="font-bold">{compact(p.count)}</span>
                    </div>
                    <span className="relative block" style={{ height: '1.5cqmin' }}>
                      <span className="absolute inset-0 bg-current opacity-10" />
                      <span className="absolute top-0 bottom-0 left-0 bg-current" style={{ width: `${(p.count / maxPage) * 100}%` }} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Composed views: figure and trace, then the page split as share
               bars; the tall and large shapes carry more of them. */
            <div className="flex-1 min-h-0 flex flex-col justify-between" style={{ gap: u(6) }}>
              <div className={cn('flex', cols >= 4 && rows === 2 ? 'items-center' : 'items-start justify-between')} style={{ gap: u(6) }}>
                <div className="flex flex-col text-left shrink-0">
                  <span className="font-black uppercase tracking-widest opacity-40" style={{ fontSize: u(6), lineHeight: 1 }}>Views</span>
                  <span className="font-black leading-none tabular-nums" style={{ fontSize: u(21), marginTop: u(2) }}>
                    {compact(data.views)}
                  </span>
                  <span className="uppercase tracking-widest tabular-nums opacity-50" style={{ fontSize: u(4.6), lineHeight: 1.2, marginTop: u(2) }}>
                    {compact(data.visitors)} visitors — {data.bounceRate.toFixed(0)}% bounce
                  </span>
                </div>
                {cols >= 4 && rows === 2 && (
                  <div className="flex-1 min-w-0 self-center opacity-70" style={{ height: `${30 * S}cqmin` }}>
                    <Sparkline values={data.trend.length >= 2 ? data.trend : [0, 0]} className="h-full" />
                  </div>
                )}
              </div>

              {!(cols >= 4 && rows === 2) && (
                <div className="w-full opacity-70" style={{ height: u(20) }}>
                  <Sparkline values={data.trend.length >= 2 ? data.trend : [0, 0]} className="h-full" />
                </div>
              )}

              <div className={cn('flex flex-col', rows >= 4 && 'flex-1 justify-evenly')} style={{ gap: rows >= 4 ? undefined : u(2.5) }}>
                {data.topPages.slice(0, rows >= 4 ? 6 : 3).map(p => (
                  <ShareRow key={p.label} label={p.label.replace(/^\//, '') || 'home'} value={p.count} max={maxPage} u={u} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {open && (
        <DetailSheet onClose={() => setOpen(false)} label="Close analytics explorer" wide>
          <CardStack root={analyticsRoot(data, () => setOpen(false))} onClose={() => setOpen(false)} />
        </DetailSheet>
      )}
    </>
  );
}
