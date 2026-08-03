import { cn } from './utils';

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
 * Trace of a series over time. Draws the line plus a flat tint beneath it —
 * a fill, not a gradient.
 */
export function Sparkline({
  values,
  className,
}: {
  values: number[];
  className?: string;
}) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const step = 100 / (values.length - 1);
  const y = (v: number) => 30 - ((v - min) / span) * 28;
  const line = values.map((v, i) => `${i * step},${y(v)}`).join(' ');

  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className={cn('w-full', className)}>
      <polygon points={`0,32 ${line} 100,32`} fill="currentColor" fillOpacity="0.12" />
      <polyline points={line} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
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
