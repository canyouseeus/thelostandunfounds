import { ReactNode, useEffect, useRef, useState } from 'react';
import { cn } from './utils';

interface FitBoxProps {
  /** Edge of the square the children are laid out against, in CSS px. */
  base?: number;
  /** Width and height of a non-square design box — e.g. 220x440 for a half square. */
  baseWidth?: number;
  baseHeight?: number;
  className?: string;
  children: ReactNode;
}

/**
 * A fixed-proportion cell whose contents are laid out at a fixed size and then
 * scaled to fit it.
 *
 * Some widgets (the calendar, the calculator) size their internals in fixed px
 * — a 240px column of 40px day rows — so they simply don't fit a small cell:
 * squeeze the cell and the day grid overlaps itself and spills out the bottom.
 * `zoom` doesn't fix that, because the element still lays out at the cell's
 * width and only paints smaller afterwards.
 *
 * FitBox gives them the room they expect (a `base`×`base` box, or an explicit
 * `baseWidth`×`baseHeight` for a non-square tile) and scales the painted result
 * down to whatever the grid actually granted, so the widget looks identical at
 * every breakpoint and the cell keeps its proportions.
 */
export function FitBox({ base = 440, baseWidth, baseHeight, className, children }: FitBoxProps) {
  const w0 = baseWidth ?? base;
  const h0 = baseHeight ?? base;
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setScale(w / w0);
    };
    measure();
    // ResizeObserver rather than a window listener: the cell also changes width
    // when a sibling panel opens, which fires no resize event.
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [w0]);

  return (
    <div
      ref={ref}
      className={cn('relative w-full overflow-hidden', className)}
      style={{ aspectRatio: `${w0} / ${h0}` }}
    >
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{ width: w0, height: h0, transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}
