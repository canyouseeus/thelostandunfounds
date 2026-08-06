import { ReactNode } from 'react';
import { cn } from '../ui/utils';

/**
 * Widget shapes, as pure grid spans.
 *
 * The grid is four columns on a phone and eight on desktop, and its rows are
 * set to exactly one column width (see the dashboard's grid-auto-rows), so a
 * span of N columns by N rows is square and every tile of a given shape is the
 * same size as every other.
 *
 * These used to carry an `aspect-*` class as well, which is what made two tiles
 * both marked 2x2 come out different sizes: the aspect ratio derives height
 * from width while the row span derives it from the rows the tile lands in, and
 * whichever won depended on what its neighbours were doing. The row unit is
 * explicit now, so the span alone decides the size.
 */
export const TILE_1X1 = 'col-span-1 row-span-1';
export const TILE_2X1 = 'col-span-2 row-span-1';
export const TILE_4X1 = 'col-span-4 row-span-1';
export const TILE_1X2 = 'col-span-1 row-span-2';
export const TILE_1X4 = 'col-span-1 row-span-4';
export const TILE_2X2 = 'col-span-2 row-span-2';
export const TILE_2X4 = 'col-span-2 row-span-4';
export const TILE_4X2 = 'col-span-4 row-span-2';
export const TILE_4X4 = 'col-span-4 row-span-4';

/** Older names, kept so existing call sites keep meaning what they meant. */
export const TILE_SQUARE = TILE_2X2;
export const TILE_WIDE = TILE_4X2;
export const TILE_LARGE = TILE_4X4;
export const TILE_TALL = TILE_2X4;

export interface TileShape {
  span?: string;
  /** White tile, black type. Chosen per widget in the layout editor. */
  light?: boolean;
  /** Current shape, e.g. '2x2'. Decides how much of the tile's content fits. */
  size?: string;
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
  /** White tile, black type. Chosen per widget in the layout editor. */
  light?: boolean;
  /** Current shape, e.g. '2x2'. Decides how much of the tile's content fits. */
  size?: string;
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
export function DashboardTile({ icon, primary, caption, children, light, size = '2x2', className }: DashboardTileProps) {
  // A tile shows as much as its size can carry, rather than the same content
  // scaled down until it's unreadable. The smallest sizes are the figure alone;
  // the instrument needs real width, so it waits for a tile at least two
  // columns across.
  const cols = Number(size.split('x')[0]) || 2;
  const rows = Number(size.split('x')[1]) || 2;
  const showCaption = rows >= 2 && !(cols === 1 && rows === 1);
  const showIcon = cols >= 2 || rows >= 2;
  const showInstrument = cols >= 2 && rows >= 2;
  const figureSize = cols >= 4 ? 'text-5xl sm:text-6xl' : cols === 1 ? 'text-xl' : 'text-4xl sm:text-5xl';
  return (
    <div
      className={cn(
        // No hover state here. The grid cell (EditableTile) draws the one hover
        // wash every widget shares; a second one inside the tile stacked with it
        // and made the legacy tiles flash a different shade to the drawn ones.
        light ? 'bg-white text-black' : 'bg-black text-white',
        'transition-colors duration-300',
        'w-full h-full flex flex-col justify-between overflow-hidden text-left',
        cols === 1 ? 'p-2' : 'p-4 sm:p-5',
        className,
      )}
      style={{ borderRadius: 0 }}
    >
      <span className="text-white/30 [&>svg]:w-5 [&>svg]:h-5 shrink-0">{icon}</span>

      {/* The instrument gets the middle of the tile and grows into it, rather
          than sitting in a strip at the top with dead space beneath. */}
      {children && <div className="flex-1 min-h-0 w-full py-3 flex flex-col justify-center">{children}</div>}

      <div className="min-w-0">
        <div className="text-4xl sm:text-5xl font-black tracking-tight tabular-nums leading-none truncate">
          {primary}
        </div>
        <div className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] opacity-40 truncate">
          {caption}
        </div>
      </div>
    </div>
  );
}
