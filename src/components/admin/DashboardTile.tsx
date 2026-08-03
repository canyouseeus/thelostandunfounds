import { ReactNode } from 'react';
import { cn } from '../ui/utils';

interface DashboardTileProps {
  icon: ReactNode;
  /** First word reads at full strength, the rest dims — e.g. "NETWORK status". */
  title: string;
  children: ReactNode;
  /** Pinned to the bottom of the tile, below the scrolling body (sparklines). */
  footer?: ReactNode;
  className?: string;
}

/**
 * The at-a-glance face shared by every dashboard tile.
 *
 * It used to be a hard `aspect-square` with `[zoom:0.72]` on the contents. In a
 * half-width phone cell that left roughly 110px of height for four rows of
 * figures, so titles truncated to "OPERATIO…", status values clipped mid-word
 * ("DATABASE ONL"), and the rest of the rows were simply cut off — the numbers
 * you keep a dashboard open for were the first thing to go.
 *
 * So the square is gone. A tile keeps a floor height and then grows to fit
 * whatever it holds, at full type size rather than scaled into illegibility —
 * a four-row tile is simply taller than a two-row one. That's the bento read:
 * cells of uneven height, some spanning two columns, sized by their content
 * instead of cropped to a uniform square. Nothing is clipped, so every figure
 * the dashboard is kept open for is actually on screen.
 */
export function DashboardTile({ icon, title, children, footer, className }: DashboardTileProps) {
  const [first, ...rest] = title.split(' ');

  return (
    <div
      className={cn(
        'bg-black hover:bg-[#0a0a0a] active:scale-95 transition-all duration-300',
        'w-full h-full flex flex-col p-4 min-h-[172px]',
        className,
      )}
      style={{ borderRadius: 0 }}
    >
      <div className="flex items-center gap-2 mb-2 shrink-0">
        <span className="text-white/50 [&>svg]:w-4 [&>svg]:h-4 shrink-0">{icon}</span>
        <h3 className="text-[10px] font-black uppercase tracking-widest text-white/80 leading-tight text-left">
          {first}
          {rest.length > 0 && <span className="text-white/40"> {rest.join(' ')}</span>}
        </h3>
      </div>

      <div className="flex-1">{children}</div>

      {footer && <div className="shrink-0">{footer}</div>}
    </div>
  );
}
