import { ReactNode, useState } from 'react';
import { cn } from '../ui/utils';
import { DetailSheet } from '../ui/detail-sheet';
import { SHAPE_LABEL, ShapeName, shapeOptions } from './useDashboardLayout';

interface EditableTileProps {
  id: string;
  /** Grid shape classes for this tile — `col-span-*`, `aspect-*`, and so on. */
  className: string;
  editing: boolean;
  shape: ShapeName;
  onSetShape: (id: string, shape: ShapeName) => void;
  onDropBefore: (dragged: string, target: string) => void;
  light: boolean;
  onToggleBackground: (id: string) => void;
  children: ReactNode;
}

const dims = (s: ShapeName) => s.split('x').map(Number) as [number, number];

/**
 * One option in the shape picker: the shape drawn where it lives — filled
 * cells inside a miniature four-column lattice — instead of a label you have
 * to imagine. Tapping the option is picking the shape.
 */
function ShapeOption({ shape, current, onPick }: {
  shape: ShapeName;
  current: boolean;
  onPick: () => void;
}) {
  const [c, r] = dims(shape);
  // Every option is drawn on the same four-by-four reference lattice, so the
  // footprints are comparable — sized to their own aspect, a 4x2's cells came
  // out twice a 4x4's and the shapes couldn't be read against each other.
  const rows = 4;
  const cells = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < 4; x++) {
      const filled = x < c && y < r;
      cells.push(
        <span
          key={`${x}-${y}`}
          className={filled ? (current ? 'bg-white' : 'bg-white/60') : 'bg-white/[0.07]'}
        />,
      );
    }
  }
  return (
    <button
      onClick={onPick}
      className={cn(
        'flex flex-col gap-2 p-3 text-left transition-colors',
        current ? 'bg-white/15' : 'bg-white/[0.04] hover:bg-white/10',
      )}
      style={{ borderRadius: 0 }}
    >
      <span
        className="grid w-full"
        style={{
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          gap: 3,
          aspectRatio: `4 / ${rows}`,
        }}
      >
        {cells}
      </span>
      <span className={cn(
        'text-[10px] font-black uppercase tracking-widest tabular-nums',
        current ? 'text-white' : 'text-white/50',
      )}>
        {SHAPE_LABEL[shape]}{current ? ' — current' : ''}
      </span>
    </button>
  );
}

/**
 * The tile's editor sheet: this widget's real shape catalogue drawn on the
 * lattice, plus its background. Replaces tap-to-cycle, which changed the
 * layout before you knew what you were choosing.
 */
export function TileEditorSheet({ id, title, shape, light, onSetShape, onToggleBackground, onClose }: {
  id: string;
  title: string;
  shape: ShapeName;
  light: boolean;
  onSetShape: (id: string, shape: ShapeName) => void;
  onToggleBackground: (id: string) => void;
  onClose: () => void;
}) {
  const options = shapeOptions(id);
  return (
    <DetailSheet onClose={onClose} label="Close tile editor">
      <div className="text-left">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-white/40 hover:text-white transition-colors mb-4"
        >
          ← Editor
        </button>
        <h2 className="text-lg font-black uppercase tracking-widest text-white pr-10 mb-1 truncate">{title}</h2>
        <p className="text-[11px] uppercase tracking-widest text-white/30 mb-5">
          Size — as it sits in the four-column phone lattice
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
          {options.map(s => (
            <ShapeOption
              key={s}
              shape={s}
              current={s === shape}
              onPick={() => { onSetShape(id, s); onClose(); }}
            />
          ))}
        </div>

        <p className="text-[11px] uppercase tracking-widest text-white/30 mt-6 mb-2">Background</p>
        <div className="grid grid-cols-2 gap-1">
          {(['black', 'white'] as const).map(bg => {
            const active = (bg === 'white') === light;
            return (
              <button
                key={bg}
                onClick={() => { if (!active) onToggleBackground(id); onClose(); }}
                className={cn(
                  'flex items-center gap-2 p-3 transition-colors',
                  active ? 'bg-white/15' : 'bg-white/[0.04] hover:bg-white/10',
                )}
                style={{ borderRadius: 0 }}
              >
                <span className={cn('w-4 h-4 p-px', bg === 'white' ? 'bg-white' : 'bg-white/30')}>
                  <span className={cn('block w-full h-full', bg === 'white' ? 'bg-white' : 'bg-black')} />
                </span>
                <span className={cn('text-[10px] font-black uppercase tracking-widest', active ? 'text-white' : 'text-white/50')}>
                  {bg}{active ? ' — current' : ''}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </DetailSheet>
  );
}

/**
 * Wraps a dashboard widget so it can be arranged in edit mode.
 *
 * Out of edit mode this is just the grid cell — no handlers, no chrome. In
 * edit mode the widget dims and stops taking its own taps; tapping the tile
 * opens its editor sheet (the shape catalogue drawn on the lattice, plus the
 * background), and dragging reorders. The old tap-to-cycle is gone — it
 * changed the layout before you knew what you were choosing.
 */
export function EditableTile({
  id,
  className,
  editing,
  shape,
  onSetShape,
  onDropBefore,
  light,
  onToggleBackground,
  children,
}: EditableTileProps) {
  const [over, setOver] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  if (!editing) return <div className={className}>{children}</div>;

  return (
    <>
      <div
        className={cn(className, 'relative cursor-pointer', over && 'opacity-60')}
        onClick={() => setSheetOpen(true)}
        draggable
        onDragStart={e => {
          e.dataTransfer.setData('text/plain', id);
          e.dataTransfer.effectAllowed = 'move';
        }}
        onDragOver={e => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={e => {
          e.preventDefault();
          setOver(false);
          const dragged = e.dataTransfer.getData('text/plain');
          if (dragged && dragged !== id) onDropBefore(dragged, id);
        }}
      >
        {/* The widget stays legible — you are arranging these, so you need to
            see which is which. It just stops responding to its own taps. */}
        <div className="w-full h-full pointer-events-none opacity-60">{children}</div>

        {/* One mark: the size, out of the way. Everything else lives in the
            tile's editor sheet. */}
        <span className={cn(
          'absolute bottom-1 left-1 px-1.5 py-0.5 text-[10px] font-black tabular-nums leading-none',
          light ? 'bg-black text-white' : 'bg-white text-black',
        )}>
          {SHAPE_LABEL[shape]}
        </span>
      </div>

      {sheetOpen && (
        <TileEditorSheet
          id={id}
          title={id.replace(/-/g, ' ')}
          shape={shape}
          light={light}
          onSetShape={onSetShape}
          onToggleBackground={onToggleBackground}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </>
  );
}
