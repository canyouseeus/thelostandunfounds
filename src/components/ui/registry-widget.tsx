import { ReactNode, useEffect, useState } from 'react';
import { ChevronDownIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { cn } from './utils';
import { useLongPress } from './use-long-press';
import { DetailSheet } from './detail-sheet';

interface BreakdownRow { name: string; line: string; at: string | null; fields?: Record<string, string> }

interface CensusEntry { label: string; value: number; section: string; panel: string }

/**
 * The registry explorer: a stack of cards. The census is the first card; a
 * category opens as its own card of rows; a row with more inside opens as its
 * own card of fields — expandable cards the whole way down, per the brief.
 * The header always offers the way back: to the previous card, or from the
 * first card back to the dashboard.
 */
export function RegistryExplorer({ census, onOpenPanel, onClose }: {
  census: CensusEntry[];
  onOpenPanel: (panel: string) => void;
  onClose: () => void;
}) {
  type Card =
    | { kind: 'census' }
    | { kind: 'section'; entry: CensusEntry }
    | { kind: 'item'; title: string; row: BreakdownRow };
  const [stack, setStack] = useState<Card[]>([{ kind: 'census' }]);
  const [cache, setCache] = useState<Record<string, { total: number; rows: BreakdownRow[] } | 'failed'>>({});
  const top = stack[stack.length - 1];

  useEffect(() => {
    if (top.kind !== 'section' || cache[top.entry.section]) return;
    const section = top.entry.section;
    let alive = true;
    fetch(`/api/admin/registry?section=${section}`)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => { if (alive) setCache(c => ({ ...c, [section]: d })); })
      .catch(() => { if (alive) setCache(c => ({ ...c, [section]: 'failed' })); });
    return () => { alive = false; };
  }, [top, cache]);

  const push = (card: Card) => setStack(st => [...st, card]);
  const pop = () => setStack(st => (st.length > 1 ? st.slice(0, -1) : st));

  const backLabel = stack.length === 1
    ? 'Dashboard'
    : stack.length === 2
      ? 'Registry'
      : (stack[stack.length - 2] as Extract<Card, { kind: 'section' }>).entry?.label ?? 'Back';

  const title = top.kind === 'census' ? 'Registry'
    : top.kind === 'section' ? top.entry.label
    : top.row.name;

  return (
    <div className="text-left">
      <button
        onClick={() => (stack.length === 1 ? onClose() : pop())}
        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-white/40 hover:text-white transition-colors mb-4"
      >
        <ArrowRightIcon className="w-3 h-3 rotate-180" />
        {backLabel}
      </button>
      <h2 className="text-lg font-black uppercase tracking-widest text-white pr-10 mb-4 truncate">{title}</h2>

      {top.kind === 'census' && (
        <div className="space-y-1">
          {census.map(entry => (
            <button
              key={entry.section}
              onClick={() => push({ kind: 'section', entry })}
              className="w-full flex items-center justify-between px-3 py-3 bg-white/[0.03] hover:bg-white/10 transition-colors"
              style={{ borderRadius: 0 }}
            >
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{entry.label}</span>
              <span className="flex items-center gap-2 text-sm font-bold text-white tabular-nums">
                {entry.value.toLocaleString()}
                <ArrowRightIcon className="w-3 h-3 text-white/30" />
              </span>
            </button>
          ))}
        </div>
      )}

      {top.kind === 'section' && (() => {
        const d = cache[top.entry.section];
        const entry = top.entry;
        return (
          <div>
            {d === 'failed' ? (
              <p className="text-[11px] uppercase tracking-widest text-white/30 py-4">Breakdown unavailable.</p>
            ) : !d ? (
              <p className="text-[11px] uppercase tracking-widest text-white/30 py-4">Loading…</p>
            ) : (
              <>
                <p className="text-[10px] uppercase tracking-widest text-white/40 mb-3 tabular-nums">
                  {d.total.toLocaleString()} on record — most recent {Math.min(d.rows.length, 12)} shown
                </p>
                <div className="space-y-px">
                  {d.rows.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => r.fields && push({ kind: 'item', title: entry.label, row: r })}
                      disabled={!r.fields}
                      className={cn(
                        'w-full flex items-baseline justify-between gap-3 px-3 py-2.5 bg-white/[0.03] text-left',
                        r.fields && 'hover:bg-white/10 transition-colors cursor-pointer',
                      )}
                      style={{ borderRadius: 0 }}
                    >
                      <span className="min-w-0">
                        <span className="block text-xs text-white truncate">{r.name}</span>
                        {r.line && <span className="block text-[10px] text-white/40 truncate">{r.line}</span>}
                      </span>
                      <span className="flex items-center gap-2 shrink-0">
                        {r.at && <span className="text-[10px] text-white/30 tabular-nums">{r.at.slice(0, 10)}</span>}
                        {r.fields && <ArrowRightIcon className="w-3 h-3 text-white/30" />}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
            <button
              onClick={() => onOpenPanel(entry.panel)}
              className="mt-4 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors"
            >
              Open {entry.label} panel <ArrowRightIcon className="w-3 h-3" />
            </button>
          </div>
        );
      })()}

      {top.kind === 'item' && (
        <div className="space-y-px">
          {Object.entries(top.row.fields ?? {}).map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-4 px-3 py-2.5 bg-white/[0.03]">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{k}</span>
              <span className="text-sm text-white text-right break-all">{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export interface RegistryWidgetData {
  /** Gallery photos on record — the headline. */
  photos: number;
  /** Registered accounts. */
  users: number;
  /** Published posts — all of them in The Lost Archives column. */
  posts: number;
  products: number;
  /** Blog contributors registered on the platform. */
  writers: number;
  affiliates: number;
  subscribers: number;
}

const fmt = (n: number) => n.toLocaleString();
/** 13275 -> 13.3K: compact where a five-digit figure will not fit. */
const compact = (n: number) => (n >= 10_000 ? `${(n / 1000).toFixed(1)}K` : n.toLocaleString());

/**
 * The archive field: a grid of marks whose opacities are a fixed pseudo-random
 * texture — iconography for "a registry of many things", the way the weather
 * face's glyph is iconography for a sky. It measures nothing; the figures do.
 */
function ArchiveField({ cols, rows, u }: { cols: number; rows: number; u: (n: number) => string }) {
  const cells = [];
  for (let i = 0; i < cols * rows; i++) {
    // Deterministic per-cell brightness, so the texture never flickers.
    const t = ((i * 2654435761) >>> 0) % 100;
    cells.push(
      <span
        key={i}
        className="bg-current"
        style={{ opacity: t < 14 ? 0.85 : t < 42 ? 0.35 : 0.12 }}
      />,
    );
  }
  return (
    <div
      className="grid w-full h-full"
      style={{
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        gap: u(1.6),
      }}
    >
      {cells}
    </div>
  );
}

function Figure({ label, value, big, u }: { label: string; value: number; big?: boolean; u: (n: number) => string }) {
  return (
    <div className="flex flex-col text-left shrink-0">
      <span className="font-black uppercase tracking-widest opacity-40" style={{ fontSize: u(big ? 6 : 5), lineHeight: 1 }}>
        {label}
      </span>
      <span className="font-black leading-none tabular-nums" style={{ fontSize: u(big ? 21 : 13), marginTop: u(2) }}>
        {fmt(value)}
      </span>
    </div>
  );
}

/**
 * Registry tile: what the platform has on record. The archive field is the
 * drawn mass; the photo count carries the tile, with writers and admins where
 * the shape has room. Long press (or click) opens the expanded card.
 */
export function RegistryWidget({ size = '4x2', data, census, onOpenPanel, className }: {
  size?: string;
  data: RegistryWidgetData;
  /** The census entries the explorer drills into. */
  census: CensusEntry[];
  onOpenPanel: (panel: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const press = useLongPress(() => setOpen(true));
  const cols = Number(size.split('x')[0]) || 2;
  const rows = Number(size.split('x')[1]) || 2;
  const S = cols >= 4 && rows >= 4 ? 0.55 : 1;
  const u = (n: number) => `${n * S}cqmin`;

  // The full census, content and community, most-consulted first.
  const figures = [
    { label: 'Photos', value: data.photos },
    { label: 'Users', value: data.users },
    { label: 'Posts', value: data.posts },
    { label: 'Products', value: data.products },
    { label: 'Writers', value: data.writers },
    { label: 'Affiliates', value: data.affiliates },
    { label: 'Subs', value: data.subscribers },
  ];

  return (
    <>
      <div
        {...press}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true); } }}
        aria-label="Registry — open detail"
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
          {(
            /* The composed views: headline and field share the top, the other
               figures fill the rest of the height. */
            <div className="flex-1 min-h-0 flex flex-col justify-between" style={{ gap: u(5) }}>
              {cols >= 4 ? (
                <div className="flex items-start justify-between" style={{ gap: u(6) }}>
                  <Figure label="Photos" value={data.photos} big u={u} />
                  <div className="flex-1 min-w-0" style={{ height: u(24), maxWidth: '55%' }}>
                    <ArchiveField cols={rows >= 4 ? 14 : 12} rows={5} u={u} />
                  </div>
                </div>
              ) : (
                /* Two units wide: the headline leaves no width beside it, so
                   the field runs underneath instead of collapsing to nothing. */
                <div className="flex flex-col" style={{ gap: u(4) }}>
                  <Figure label="Photos" value={data.photos} big u={u} />
                  <div style={{ height: u(14) }}>
                    <ArchiveField cols={16} rows={3} u={u} />
                  </div>
                </div>
              )}
              {rows >= 4 ? (
                <div className="flex-1 flex flex-col justify-evenly" style={{ gap: u(4) }}>
                  {figures.slice(1).map(f => (
                    <div key={f.label} className="flex items-baseline justify-between w-full" style={{ gap: u(4) }}>
                      <span className="uppercase tracking-widest opacity-40" style={{ fontSize: u(5.4), lineHeight: 1 }}>{f.label}</span>
                      <span className="font-bold tabular-nums" style={{ fontSize: u(9), lineHeight: 1 }}>{fmt(f.value)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                /* 4x2: six pairs as a three-column grid of mini figures — as
                   full-width rows they overflowed the tile sideways. */
                <div className="grid grid-cols-3" style={{ gap: u(4) }}>
                  {figures.slice(1).map(f => (
                    <div key={f.label} className="flex flex-col text-left min-w-0">
                      <span className="uppercase tracking-widest opacity-40 truncate" style={{ fontSize: u(4.6), lineHeight: 1 }}>{f.label}</span>
                      <span className="font-bold tabular-nums" style={{ fontSize: u(8), lineHeight: 1, marginTop: u(1.5) }}>{fmt(f.value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {open && (
        <DetailSheet onClose={() => setOpen(false)} label="Close registry detail">
          <RegistryExplorer census={census} onOpenPanel={onOpenPanel} onClose={() => setOpen(false)} />
        </DetailSheet>
      )}
    </>
  );
}
