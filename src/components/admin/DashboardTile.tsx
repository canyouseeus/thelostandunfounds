import { ReactNode } from 'react';
import { cn } from '../ui/utils';

/**
 * Grid shape for a tile.
 *
 * The shapes a phone's widget grid uses, on a grid of two columns on a phone
 * and four on desktop. The square carries `aspect-square` and so sets the row
 * height; everything else spans whole columns and rows of that unit, which is
 * what keeps every tile aligned to the same lattice and every row level.
 *
 *   square  1x1   a small widget
 *   wide    2x1   a medium widget
 *   large   2x2   a large widget
 *   tall    1x2   a column
 *
 * The areas have to add up to a whole number of rows at both column counts or
 * the grid ends on a half-empty row.
 */
// Every shape states its own height as a ratio, rather than borrowing it from
// whatever else lands in its row. Leaning on a row companion worked until a wide
// tile ended up alone in a row, where it collapsed to the height of its text.
//
// The ratios include the gutter: two columns plus one gap over one column is
// 2.07 on a phone and 2.08 on desktop, so 2.075 is within half a pixel at both.
export const TILE_SQUARE = 'col-span-1 aspect-square';
// Two columns across and two rows down — square, since two columns plus a gap
// is the same as two rows plus a gap.
export const TILE_LARGE = 'col-span-2 row-span-2 aspect-square';
// One column across, two rows down.
export const TILE_TALL = 'col-span-1 row-span-2 aspect-[1/2.075]';
// On desktop a wide tile shares its row with two squares, so it takes their
// height — pinning its own ratio there made it taller than they were and left a
// band of empty grid under them. On a phone it spans the whole row with no
// square to measure against, so it needs the ratio spelled out or it collapses
// to the height of its text.
export const TILE_WIDE = 'col-span-2 aspect-[2.075/1]';

export interface TileShape {
  span?: string;
}

interface DashboardTileProps {
  /** Small and dim, top-left. Says what this is without a heading. */
  icon: ReactNode;
  /** The number you're here to read. Set large; it carries the tile. */
  primary: ReactNode;
  /** A few words under the figure saying what it counts. */
  caption: string;
  /** Optional supporting rows, sitting above the figure. */
  children?: ReactNode;
  className?: string;
}

/**
 * The face of a dashboard tile.
 *
 * It used to lead with an icon and an uppercase title, then list every figure as
 * a label/value row. That gave each tile a header band before any content,
 * pushed the numbers into whatever space was left, and made the tiles tall and
 * narrow to fit it all.
 *
 * A tile now reads the way a phone widget does: one figure at a size you can
 * take in at a glance, a short caption saying what it is, and an icon instead of
 * a heading. Supporting numbers sit above it in small type. What a tile shows
 * should be obvious without reading a title first.
 */
export function DashboardTile({ icon, primary, caption, children, className }: DashboardTileProps) {
  return (
    <div
      className={cn(
        'bg-black hover:bg-[#0a0a0a] transition-colors duration-300',
        'w-full h-full flex flex-col justify-between p-4 sm:p-5 overflow-hidden text-left',
        className,
      )}
      style={{ borderRadius: 0 }}
    >
      <span className="text-white/30 [&>svg]:w-5 [&>svg]:h-5 shrink-0">{icon}</span>

      {/* The instrument gets the middle of the tile and grows into it, rather
          than sitting in a strip at the top with dead space beneath. */}
      {children && <div className="flex-1 min-h-0 w-full py-3 flex flex-col justify-center">{children}</div>}

      <div className="min-w-0">
        <div className="text-4xl sm:text-5xl font-black tracking-tight text-white tabular-nums leading-none truncate">
          {primary}
        </div>
        <div className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/40 truncate">
          {caption}
        </div>
      </div>
    </div>
  );
}
