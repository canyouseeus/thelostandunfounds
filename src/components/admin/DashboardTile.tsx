import { ReactNode } from 'react';
import { cn } from '../ui/utils';

/**
 * Widget shapes, named the way a phone's widget picker names them.
 *
 * The grid is four columns on a phone and eight on desktop, so one column is
 * one unit and the smallest widget — 1x2 — is half a column wide. Every shape
 * states its own height as a ratio rather than borrowing it from whatever else
 * lands in its row: leaning on a row companion held up until a tile ended up
 * alone in a row, where it collapsed to the height of its text.
 *
 * The ratios fold in the gutters, so they are not simply cols/rows. A phone
 * column is ~80px against a 12px gap and a desktop column ~135px against 24px,
 * which puts the two breakpoints within a percent of each other — close enough
 * that one ratio serves both to within half a pixel.
 */
export const TILE_1X2 = 'col-span-1 row-span-2 aspect-[0.462/1]';
export const TILE_1X4 = 'col-span-1 row-span-4 aspect-[0.223/1]';
export const TILE_2X2 = 'col-span-2 row-span-2 aspect-square';
export const TILE_2X4 = 'col-span-2 row-span-4 aspect-[0.4815/1]';
export const TILE_4X2 = 'col-span-4 row-span-2 aspect-[2.075/1]';
export const TILE_4X4 = 'col-span-4 row-span-4 aspect-square';

/** Older names, kept so existing call sites keep meaning what they meant. */
export const TILE_SQUARE = TILE_2X2;
export const TILE_WIDE = TILE_4X2;
export const TILE_LARGE = TILE_4X4;
export const TILE_TALL = TILE_2X4;

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
