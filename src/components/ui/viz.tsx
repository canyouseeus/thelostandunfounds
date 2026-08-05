import { useEffect, useRef, useState } from 'react';
import { cn } from './utils';

/**
 * GRAPH STYLE RULE — the hero chart (DashboardCharts) is the format for every
 * graph on the platform: monotone-smoothed 2px line, flat ~12% fill, r=2 data
 * dots (Sparkline draws exactly this); bars are the accent at 10% for the
 * track with a solid accent fill. Categories are told apart by accent, never
 * by dialect — the same hues the hero's metric tabs use:
 */
export const CHART_ACCENTS = {
  revenue: 'text-green-400',    // #4ade80 — money
  newsletter: 'text-blue-400',  // #60a5fa
  affiliates: 'text-purple-400',// #c084fc
  bookings: 'text-amber-500',   // #f59e0b
  analytics: 'text-blue-400',   // traffic reads in the newsletter blue family
} as const;


/**
 * Monochrome instruments for the dashboard tiles.
 *
 * The clock is a dial, the calendar is a month grid, the calculator is a keypad
 * — each one is drawn, and you read it without reading words. The data tiles
 * were label/value text instead, so a tile full of figures said nothing at a
 * glance. These are the drawn equivalents: an arc, a trace, a set of bars, a
 * row of state marks.
 *
 * All of them draw in `currentColor` at varying opacity, so a tile decides
 * whether they come out white on black or black on white — no borders, no shadows,
 * no gradients, and square corners, per no-border-design and noir-design. The
 * one exception to squareness is the ring, which is a circle because it is a
 * dial, the same way the clock face is.
 */

/** Arc showing a proportion — billed against outstanding, used against total. */
export function RingGauge({
  value,
  max,
  label,
  className,
}: {
  value: number;
  max: number;
  label?: string;
  className?: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const r = 42;
  const circumference = 2 * Math.PI * r;

  return (
    <div className={cn('relative', className)}>
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeDasharray={`${pct * circumference} ${circumference}`}
        />
      </svg>
      {label && (
        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black uppercase tracking-widest tabular-nums">
          {label}
        </span>
      )}
    </div>
  );
}

/**
 * Trace of a series over time, in the hero revenue chart's exact dialect
 * (DashboardCharts): a monotone-smoothed 2px line, a flat fill beneath it,
 * and r=2 dots at the data points. Drawn in pixel space — measured with a
 * ResizeObserver rather than a stretched viewBox, because a non-uniform
 * viewBox distorts curves and turns dots into ellipses, which is exactly why
 * the tiles used to look like a different chart language from the hero.
 * Dots thin out automatically when the series is denser than the width can
 * carry, so a 30-point trace on an 81px tile doesn't become a bead chain.
 */
export function Sparkline({
  values,
  className,
}: {
  values: number[];
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setBox({ w: r.width, h: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (values.length < 2) return null;

  let svg = null;
  if (box) {
    const { w, h } = box;
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const span = max - min || 1;
    const pad = 3; // room for the dots and the 2px stroke at the extremes
    const px = (i: number) => pad + (i / (values.length - 1)) * (w - pad * 2);
    const py = (v: number) => h - pad - ((v - min) / span) * (h - pad * 2);
    const pts = values.map((v, i) => [px(i), py(v)] as const);

    // Monotone-x smoothing, the same curve recharts' type="monotone" draws.
    const slopes: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const prev = pts[i - 1], cur = pts[i], next = pts[i + 1];
      if (!prev) slopes.push((next[1] - cur[1]) / (next[0] - cur[0] || 1));
      else if (!next) slopes.push((cur[1] - prev[1]) / (cur[0] - prev[0] || 1));
      else {
        const a = (cur[1] - prev[1]) / (cur[0] - prev[0] || 1);
        const b = (next[1] - cur[1]) / (next[0] - cur[0] || 1);
        slopes.push(a * b <= 0 ? 0 : (a + b) / 2);
      }
    }
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      const dx = (x1 - x0) / 3;
      d += ` C ${x0 + dx} ${y0 + slopes[i - 1] * dx}, ${x1 - dx} ${y1 - slopes[i] * dx}, ${x1} ${y1}`;
    }
    const area = `${d} L ${pts[pts.length - 1][0]} ${h - pad} L ${pts[0][0]} ${h - pad} Z`;
    // Dots need ~8px each to read as points rather than a solid bead chain.
    const every = Math.max(1, Math.ceil(values.length / Math.max(1, Math.floor(w / 8))));

    svg = (
      <svg width={w} height={h} className="block">
        <path d={area} fill="currentColor" fillOpacity="0.12" />
        <path d={d} fill="none" stroke="currentColor" strokeWidth="2" />
        {pts.map(([x, y], i) =>
          i % every === 0 || i === pts.length - 1
            ? <circle key={i} cx={x} cy={y} r="2" fill="currentColor" />
            : null,
        )}
      </svg>
    );
  }

  return (
    <div ref={ref} className={cn('w-full overflow-hidden', className)} style={{ minHeight: 12 }}>
      {svg}
    </div>
  );
}

/** Bars for a handful of comparable counts. */
export function MiniBars({
  values,
  className,
}: {
  values: { label: string; value: number }[];
  className?: string;
}) {
  const max = Math.max(...values.map(v => v.value), 1);
  return (
    <div className={cn('flex items-end gap-1.5 h-full', className)}>
      {values.map(v => (
        <div key={v.label} className="flex-1 flex flex-col justify-end h-full" title={`${v.label}: ${v.value}`}>
          <div
            className="w-full bg-current opacity-70"
            style={{ height: `${Math.max(3, (v.value / max) * 100)}%` }}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * State marks — one per service. Square, not round: a status light is neither a
 * tool tray nor an avatar, and those are the only two things noir-design lets
 * be circular.
 */
export function StatusMarks({
  items,
  className,
}: {
  items: { label: string; ok: boolean }[];
  className?: string;
}) {
  return (
    // Two columns: a wide tile has the horizontal room, and stacking four in a
    // single column ran the last one into the figure below it.
    <div className={cn('grid grid-cols-2 gap-x-4 gap-y-1.5', className)}>
      {items.map(i => (
        <div key={i.label} className="flex items-center gap-2">
          <span className={cn('w-2 h-2 shrink-0', i.ok ? 'bg-green-400' : 'bg-red-500')} />
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-50 truncate">{i.label}</span>
        </div>
      ))}
    </div>
  );
}

/** A count you can see rather than read — one mark per unit, up to `cap`. */
export function DotMatrix({
  filled,
  total,
  cap = 24,
  className,
}: {
  filled: number;
  total: number;
  cap?: number;
  className?: string;
}) {
  const shown = Math.min(total, cap);
  const lit = Math.round((filled / Math.max(total, 1)) * shown);
  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {Array.from({ length: shown }, (_, i) => (
        <span key={i} className={cn('w-1.5 h-1.5 bg-current', i < lit ? '' : 'opacity-20')} />
      ))}
    </div>
  );
}
