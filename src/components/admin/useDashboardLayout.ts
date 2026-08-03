import { useCallback, useEffect, useState } from 'react';
import { TILE_1X2, TILE_1X4, TILE_2X2, TILE_2X4, TILE_4X2, TILE_4X4 } from './DashboardTile';

/**
 * The widget shapes, smallest first — the order the resize control offers them.
 * Named in columns x rows on a grid four columns wide on a phone and eight on
 * desktop, so 2x2 is the familiar small widget and 1x2 is half of one.
 */
export const SHAPES = ['1x2', '1x4', '2x2', '2x4', '4x2', '4x4'] as const;
export type ShapeName = (typeof SHAPES)[number];

export const SHAPE_CLASS: Record<ShapeName, string> = {
  '1x2': TILE_1X2,
  '1x4': TILE_1X4,
  '2x2': TILE_2X2,
  '2x4': TILE_2X4,
  '4x2': TILE_4X2,
  '4x4': TILE_4X4,
};

export const SHAPE_LABEL: Record<ShapeName, string> = {
  '1x2': '1×2',
  '1x4': '1×4',
  '2x2': '2×2',
  '2x4': '2×4',
  '4x2': '4×2',
  '4x4': '4×4',
};

/**
 * Area in columns × rows. Used to tell you when a layout leaves a ragged last
 * row: the total has to divide by the column count, 4 on a phone and 8 on
 * desktop, once you account for the two-row unit.
 */
const SHAPE_UNITS: Record<ShapeName, number> = {
  '1x2': 1 * 2, '1x4': 1 * 4, '2x2': 2 * 2, '2x4': 2 * 4, '4x2': 4 * 2, '4x4': 4 * 4,
};

/** Shipped layout. A tile with no entry falls back to 2x2. */
export const DEFAULT_LAYOUT: Record<string, ShapeName> = {
  clock: '2x2',
  weather: '2x2',
  calendar: '4x4',
  'operational-load': '2x2',
  'revenue-performance': '4x2',
  'network-status': '4x2',
  registry: '2x2',
  'site-analytics': '2x2',
  crm: '2x2',
  calculator: '4x4',
  notifications: '4x2',
};

/** Order tiles appear in. Rearranged by dragging in edit mode. */
export const DEFAULT_ORDER = Object.keys(DEFAULT_LAYOUT);

const KEY = 'lu.dashboard.layout';

interface Stored {
  shapes: Record<string, ShapeName>;
  order: string[];
}

function read(): Stored {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Stored>;
      return {
        // Merge rather than replace: a tile added after a layout was saved
        // should appear at its default size instead of vanishing.
        shapes: { ...DEFAULT_LAYOUT, ...(parsed.shapes ?? {}) },
        order: [
          ...(parsed.order ?? []).filter(id => DEFAULT_ORDER.includes(id)),
          ...DEFAULT_ORDER.filter(id => !(parsed.order ?? []).includes(id)),
        ],
      };
    }
  } catch {
    /* unreadable storage just means the default layout */
  }
  return { shapes: { ...DEFAULT_LAYOUT }, order: [...DEFAULT_ORDER] };
}

/**
 * The dashboard's editable layout: which shape each widget is, and what order
 * they sit in. Persisted to this browser.
 */
export function useDashboardLayout() {
  const [{ shapes, order }, setState] = useState<Stored>(() => read());
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ shapes, order }));
    } catch {
      /* private mode — the layout just won't persist */
    }
  }, [shapes, order]);

  const cycleShape = useCallback((id: string) => {
    setState(prev => {
      const current = prev.shapes[id] ?? '2x2';
      const next = SHAPES[(SHAPES.indexOf(current) + 1) % SHAPES.length];
      return { ...prev, shapes: { ...prev.shapes, [id]: next } };
    });
  }, []);

  const setShape = useCallback((id: string, shape: ShapeName) => {
    setState(prev => ({ ...prev, shapes: { ...prev.shapes, [id]: shape } }));
  }, []);

  /** Move `id` to sit where `beforeId` currently is. */
  const moveBefore = useCallback((id: string, beforeId: string) => {
    setState(prev => {
      if (id === beforeId) return prev;
      const next = prev.order.filter(x => x !== id);
      const at = next.indexOf(beforeId);
      if (at === -1) return prev;
      next.splice(at, 0, id);
      return { ...prev, order: next };
    });
  }, []);

  const reset = useCallback(() => {
    setState({ shapes: { ...DEFAULT_LAYOUT }, order: [...DEFAULT_ORDER] });
  }, []);

  const classOf = useCallback((id: string) => SHAPE_CLASS[shapes[id] ?? '2x2'], [shapes]);

  // Total area, so the editor can say when a layout leaves a ragged last row.
  const units = order.reduce((sum, id) => sum + SHAPE_UNITS[shapes[id] ?? '2x2'], 0);
  const fillsRows = { phone: units % 4 === 0, desktop: units % 8 === 0 };

  return { shapes, order, editing, setEditing, cycleShape, setShape, moveBefore, reset, classOf, units, fillsRows };
}
