import { ReactNode, useState } from 'react';
import { cn } from '../ui/utils';
import { SHAPES, SHAPE_LABEL, ShapeName } from './useDashboardLayout';

interface EditableTileProps {
  id: string;
  /** Grid shape classes for this tile — `col-span-*`, `aspect-*`, and so on. */
  className: string;
  editing: boolean;
  shape: ShapeName;
  onSetShape: (id: string, shape: ShapeName) => void;
  onDropBefore: (dragged: string, target: string) => void;
  children: ReactNode;
}

/**
 * Wraps a dashboard widget so it can be resized and reordered in edit mode.
 *
 * Out of edit mode this is just the grid cell — no handlers, no chrome, so the
 * widget behaves exactly as it did (the calculator's keys still take taps, the
 * calendar still opens on a long press). In edit mode the widget stops
 * responding to its own clicks and the cell takes over: a row of size buttons,
 * and drag to reorder.
 */
export function EditableTile({
  id,
  className,
  editing,
  shape,
  onSetShape,
  onDropBefore,
  children,
}: EditableTileProps) {
  const [over, setOver] = useState(false);

  if (!editing) return <div className={className}>{children}</div>;

  return (
    <div
      className={cn(className, 'relative', over && 'opacity-60')}
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
      {/* The widget itself, dimmed and inert — in edit mode a tap is for
          resizing, not for whatever the widget normally does. */}
      <div className="w-full h-full pointer-events-none opacity-40">{children}</div>

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-2">
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 truncate max-w-full">
          {id.replace(/-/g, ' ')}
        </span>
        <div className="flex flex-wrap items-center justify-center gap-1">
          {SHAPES.map(s => (
            <button
              key={s}
              onClick={() => onSetShape(id, s)}
              className={cn(
                'px-2 py-1 text-[10px] font-black uppercase tracking-widest transition-colors',
                s === shape ? 'bg-white text-black' : 'bg-white/10 text-white/70 hover:bg-white hover:text-black',
              )}
              style={{ borderRadius: 0 }}
            >
              {SHAPE_LABEL[s]}
            </button>
          ))}
        </div>
        <span className="text-[9px] uppercase tracking-widest text-white/25">Drag to move</span>
      </div>
    </div>
  );
}
