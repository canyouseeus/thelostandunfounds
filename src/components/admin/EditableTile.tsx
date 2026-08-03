import { ReactNode, useState } from 'react';
import { cn } from '../ui/utils';
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
  light,
  onToggleBackground,
  children,
}: EditableTileProps) {
  const [over, setOver] = useState(false);

  if (!editing) return <div className={className}>{children}</div>;

  const options = shapeOptions(id);
  const next = () => onSetShape(id, options[(options.indexOf(shape) + 1) % options.length]);

  return (
    <div
      className={cn(className, 'relative cursor-pointer', over && 'opacity-60')}
      onClick={next}
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
      {/* The widget itself, dimmed and inert — in edit mode a tap resizes. */}
      <div className="w-full h-full pointer-events-none opacity-30">{children}</div>

      {/* Just the current size and the next one along, so a tap is predictable.
          The old panel listed every size as its own button, which crowded a
          small tile to the point of illegibility. */}
      <div className={cn('absolute inset-0 flex flex-col items-center justify-center gap-1 p-1 text-center', light && 'text-black')}>
        <span className="text-2xl font-black tabular-nums leading-none">{SHAPE_LABEL[shape]}</span>
        {options.length > 1 && (
          <span className="text-[9px] font-black uppercase tracking-widest opacity-40 leading-none">
            tap → {SHAPE_LABEL[options[(options.indexOf(shape) + 1) % options.length]]}
          </span>
        )}
      </div>

      {/* Background toggle, out of the way in the corner so it can't be hit by
          accident while resizing. */}
      <button
        onClick={e => { e.stopPropagation(); onToggleBackground(id); }}
        aria-label={light ? 'Use a black background' : 'Use a white background'}
        title={light ? 'White background' : 'Black background'}
        className={cn('absolute top-1 right-1 w-5 h-5', light ? 'bg-black' : 'bg-white')}
        style={{ borderRadius: 0 }}
      />
    </div>
  );
}
