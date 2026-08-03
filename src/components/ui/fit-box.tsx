import { ReactNode, useEffect, useRef, useState } from 'react';
import { cn } from './utils';

interface FitBoxProps {
  /** Edge of the square the children are laid out against, in CSS px. */
  base?: number;
  className?: string;
  children: ReactNode;
}

/**
 * A square cell whose contents are laid out at a fixed size and then scaled to
 * fit it.
 *
 * Some widgets (the calendar, the calculator) size their internals in fixed px
 * — a 240px column of 40px day rows — so they simply don't fit a small cell:
 * squeeze the cell and the day grid overlaps itself and spills out the bottom.
 * `zoom` doesn't fix that, because the element still lays out at the cell's
 * width and only paints smaller afterwards.
 *
 * FitBox gives them the room they expect (a `base`×`base` box) and scales the
 * painted result down to whatever the grid actually granted, so the widget
 * looks identical at every breakpoint and the cell stays square.
 */
export function FitBox({ base = 440, className, children }: FitBoxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setScale(w / base);
    };
    measure();
    // ResizeObserver rather than a window listener: the cell also changes width
    // when a sibling panel opens, which fires no resize event.
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [base]);

  return (
    <div ref={ref} className={cn('relative aspect-square w-full overflow-hidden', className)}>
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{ width: base, height: base, transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}
