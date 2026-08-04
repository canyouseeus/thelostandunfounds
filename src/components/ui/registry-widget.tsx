import { ReactNode, useState } from 'react';
import { cn } from './utils';
import { useLongPress } from './use-long-press';
import { DetailSheet } from './detail-sheet';

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
/** 13275 -> 13.3K: the small faces have no room for a five-digit figure. */
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
export function RegistryWidget({ size = '2x2', data, detail, className }: {
  size?: string;
  data: RegistryWidgetData;
  /** Contents of the expanded card. */
  detail?: ReactNode;
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
          {(cols === 1 && rows === 1) || (cols === 2 && rows === 2) ? (
            /* The diagonal face: the archive field holds the upper right, the
               photo count the bottom-left — the family composition. */
            <div className="flex-1 min-h-0 relative">
              <div className="absolute" style={{ top: 0, right: 0, width: '52cqmin', height: '38cqmin' }}>
                <ArchiveField cols={8} rows={5} u={u} />
              </div>
              <div className="absolute left-0 bottom-0 flex flex-col text-left">
                <span className="font-black uppercase tracking-widest opacity-40" style={{ fontSize: '9cqmin', lineHeight: 1, marginBottom: '3cqmin' }}>
                  Registry
                </span>
                <span className="font-black leading-none tabular-nums" style={{ fontSize: '28cqmin' }}>
                  {compact(data.photos)}
                </span>
              </div>
            </div>
          ) : rows === 1 ? (
            /* Strips: the count, then the field across the rest; the full row
               fits all three figures before it. */
            <div className="flex-1 min-h-0 flex items-center text-left" style={{ gap: '7cqmin' }}>
              <div className="flex flex-col shrink-0">
                <span className="font-black uppercase tracking-widest opacity-40" style={{ fontSize: '10cqmin', lineHeight: 1 }}>Photos</span>
                <span className="font-black leading-none tabular-nums" style={{ fontSize: '30cqmin', marginTop: '3cqmin' }}>
                  {compact(data.photos)}
                </span>
              </div>
              {cols >= 4 && figures.slice(1, 5).map(f => (
                <div key={f.label} className="flex flex-col shrink-0">
                  <span className="uppercase tracking-widest opacity-40" style={{ fontSize: '8cqmin', lineHeight: 1 }}>{f.label}</span>
                  <span className="font-bold tabular-nums" style={{ fontSize: '15cqmin', marginTop: '3cqmin' }}>{fmt(f.value)}</span>
                </div>
              ))}
              <div className="flex-1 min-w-0 self-stretch" style={{ margin: '4cqmin 0' }}>
                <ArchiveField cols={cols >= 4 ? 18 : 9} rows={4} u={u} />
              </div>
            </div>
          ) : cols === 1 ? (
            /* One unit wide: the three figures spread down the column, the
               field at the foot of the 1x4. */
            <div className="flex-1 min-h-0 flex flex-col justify-between text-left">
              {figures.slice(0, rows >= 4 ? 7 : 3).map((f, i) => (
                <Figure key={f.label} label={f.label} value={f.value} big={i === 0} u={u} />
              ))}

            </div>
          ) : (
            /* The composed views: headline and field share the top, the other
               figures fill the rest of the height. */
            <div className="flex-1 min-h-0 flex flex-col justify-between" style={{ gap: u(5) }}>
              <div className="flex items-start justify-between" style={{ gap: u(6) }}>
                <Figure label="Photos" value={data.photos} big u={u} />
                <div className="flex-1 min-w-0" style={{ height: u(24), maxWidth: '55%' }}>
                  <ArchiveField cols={rows >= 4 ? 14 : 12} rows={5} u={u} />
                </div>
              </div>
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
          <h2 className="text-lg font-black uppercase tracking-widest text-white pr-10 mb-4 text-left">Registry</h2>
          {detail}
        </DetailSheet>
      )}
    </>
  );
}
