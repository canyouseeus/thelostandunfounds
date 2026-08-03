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
 * The controls are deliberately two small marks rather than a panel: a tap
 * anywhere on the widget steps it to its next size, so the size only needs
 * showing, not a row of buttons to pick from.
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
      // A dashed outline while editing, so you can see each cell's exact bounds
      // and catch a widget bleeding past them. `outline` rather than `border`
      // because it draws outside the box and so can't shift the layout it is
      // meant to be measuring — and it exists only in edit mode, so the shipped
      // dashboard keeps no-border-design's flat surfaces.
      style={{ outline: '1px dashed rgba(255,255,255,0.35)', outlineOffset: '-1px' }}
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
      {/* The widget stays legible — you are arranging these, so you need to
          see which is which. It just stops responding to its own taps. */}
      <div className="w-full h-full pointer-events-none opacity-60">{children}</div>

      {/* Two marks, both out of the way: the size in one corner, the background
          swatch in the other. The previous version put a size label and a hint
          across the middle of every tile, which buried the widget under its own
          controls. */}
      <span className={cn(
        'absolute bottom-1 left-1 px-1.5 py-0.5 text-[10px] font-black tabular-nums leading-none',
        light ? 'bg-black text-white' : 'bg-white text-black',
      )}>
        {SHAPE_LABEL[shape]}
      </span>

      <button
        onClick={e => { e.stopPropagation(); onToggleBackground(id); }}
        aria-label={light ? 'Use a black background' : 'Use a white background'}
        title={light ? 'White background' : 'Black background'}
        className={cn('absolute top-1 right-1 w-4 h-4', light ? 'bg-black' : 'bg-white')}
        style={{ borderRadius: 0 }}
      />
    </div>
  );
}
