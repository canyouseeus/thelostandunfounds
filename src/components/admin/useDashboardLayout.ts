import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LAYOUT_GENERATION, readLocal, readRemote, writeLocal, writeRemote } from './dashboardLayoutStore';
import { TILE_1X1, TILE_1X2, TILE_1X4, TILE_2X1, TILE_2X2, TILE_2X4, TILE_4X1, TILE_4X2, TILE_4X4 } from './DashboardTile';

/**
 * The widget shapes, smallest first: the order the resize control offers them.
 * Named in columns x rows on a grid four columns wide on a phone and eight on
 * desktop, so 2x2 is the familiar small widget and 1x2 is half of one.
 */
export const SHAPES = ['1x1', '2x1', '1x2', '4x1', '2x2', '1x4', '4x2', '2x4', '4x4'] as const;
export type ShapeName = (typeof SHAPES)[number];

export const SHAPE_CLASS: Record<ShapeName, string> = {
  '1x1': TILE_1X1,
  '2x1': TILE_2X1,
  '4x1': TILE_4X1,
  '1x2': TILE_1X2,
  '1x4': TILE_1X4,
  '2x2': TILE_2X2,
  '2x4': TILE_2X4,
  '4x2': TILE_4X2,
  '4x4': TILE_4X4,
};

export const SHAPE_LABEL: Record<ShapeName, string> = {
  '1x1': '1×1',
  '2x1': '2×1',
  '4x1': '4×1',
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
  '1x1': 1 * 1,
  '2x1': 2 * 1,
  '4x1': 4 * 1,
  '1x2': 1 * 2, '1x4': 1 * 4, '2x2': 2 * 2, '2x4': 2 * 4, '4x2': 4 * 2, '4x4': 4 * 4,
};

/**
 * Widgets that only work in a square.
 *
 * The clock is a dial, the calendar is a seven-column month, the calculator is
 * a four-column keypad. Squash any of them into a 4x2 and the proportions go;
 * an elliptical clock face, day cells that no longer fit their digits. They
 * scale proportionally instead, so they offer the square sizes only. Anything
 * not listed here can take any shape.
 */
export const SQUARE_ONLY: Record<string, readonly ShapeName[]> = {
  clock: ['1x1', '2x2', '4x4'],
  calendar: ['1x1', '2x2', '4x4'],
  calculator: ['1x1', '2x2', '4x4'],
  // A census wants a ledger's proportions: the small squares and thin strips
  // truncate it into a number with no story, so registry offers the wide,
  // tall and large shapes only.
  registry: ['4x2', '2x4', '4x4'],
  // Analytics reads as a chart with a split; the squares under 2x2 and the
  // strips have no room for either.
  'site-analytics': ['2x2', '4x2', '2x4'],
  // The CRM face is a dial and a count; the roster needs ledger room.
  crm: ['2x2', '4x2', '2x4', '4x4'],
  // A feed: the face plus the list shapes.
  notifications: ['2x2', '4x2', '2x4', '4x4'],
  'network-status': ['2x2', '4x2', '2x4', '4x4'],
};

export function shapeOptions(id: string): readonly ShapeName[] {
  return SQUARE_ONLY[id] ?? SHAPES;
}

/** Shipped layout. A tile with no entry falls back to 2x2. */
/**
 * The designed default: a composed mosaic, not a starting mess. Shapes and
 * order are chosen so the phone lattice (4 units per row) and the desktop
 * lattice (8 per row) both fill with zero holes: total area is 80 units;
 * twenty full phone rows, ten desktop rows. On a phone it reads top to
 * bottom: time and sky, then money, the calendar, the census, analytics
 * beside the client book, the feed, the services, the keypad.
 */
export const DEFAULT_LAYOUT: Record<string, ShapeName> = {
  clock: '2x2',
  weather: '2x2',
  'revenue-performance': '4x2',
  // The two 4x4s are adjacent on purpose: on the eight-column desktop they
  // pair into one band. Split apart, whichever came last took four rows of
  // the left half and left the right half empty; a hole no amount of total
  // area fixes, because packing is placement, not arithmetic.
  calendar: '4x4',
  calculator: '4x4',
  registry: '4x2',
  'site-analytics': '2x2',
  crm: '2x2',
  notifications: '4x2',
  'network-status': '4x2',
};

/** Order tiles appear in. Rearranged by dragging in edit mode. */
export const DEFAULT_ORDER = Object.keys(DEFAULT_LAYOUT);

interface Stored {
  shapes: Record<string, ShapeName>;
  order: string[];
  backgrounds: Record<string, 'black' | 'white'>;
  generation?: number;
}

/**
 * A saved layout can predate a widget's shape restrictions; clamp every
 * stored shape to the widget's current catalogue, falling back to its
 * default (or the catalogue's first entry) rather than rendering a view
 * the widget no longer has.
 */
function clampShapes(shapes: Record<string, ShapeName>): Record<string, ShapeName> {
  const out: Record<string, ShapeName> = {};
  for (const [id, shape] of Object.entries(shapes)) {
    const options = shapeOptions(id);
    out[id] = options.includes(shape) ? shape : (DEFAULT_LAYOUT[id] ?? options[0]);
  }
  return out;
}

/** Fill in anything a saved layout doesn't mention, and drop anything stale. */
function reconcile(saved: Partial<Stored> | null): Stored {
  // No layout, or one from an older generation of the default: take the
  // designed board. A layout saved before the shapes were redesigned is an
  // arrangement of a different dashboard: merging it strands tiles at sizes
  // that no longer compose, which is how a board of 1x1s survived the
  // redesign.
  if (!saved || (saved.generation ?? 1) < LAYOUT_GENERATION) {
    return { shapes: { ...DEFAULT_LAYOUT }, order: [...DEFAULT_ORDER], backgrounds: {}, generation: LAYOUT_GENERATION };
  }
  return {
    // Merge rather than replace: a tile added after a layout was saved should
    // appear at its default size instead of vanishing.
    shapes: clampShapes({ ...DEFAULT_LAYOUT, ...(saved.shapes ?? {}) }),
    order: [
      ...(saved.order ?? []).filter(id => DEFAULT_ORDER.includes(id)),
      ...DEFAULT_ORDER.filter(id => !(saved.order ?? []).includes(id)),
    ],
    backgrounds: saved.backgrounds ?? {},
    generation: LAYOUT_GENERATION,
  };
}

/**
 * The dashboard's editable layout: which shape each widget is, and what order
 * they sit in. Persisted to this browser.
 */
export function useDashboardLayout() {
  const { user } = useAuth();
  // Local first so the grid draws immediately; the account's layout arrives a
  // moment later and takes over if there is one.
  const [{ shapes, order, backgrounds }, setState] = useState<Stored>(() => reconcile(readLocal()));
  const [editing, setEditing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncedRemotely, setSyncedRemotely] = useState(false);
  const loadedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id || loadedFor.current === user.id) return;
    loadedFor.current = user.id;
    let alive = true;
    (async () => {
      const remote = await readRemote(user.id);
      if (!alive || !remote) return;
      setState(reconcile(remote));
      setSyncedRemotely(true);
    })();
    return () => { alive = false; };
  }, [user?.id]);

  useEffect(() => {
    writeLocal({ shapes, order, backgrounds });
    if (!user?.id) return;
    // Debounced: resizing a tile is a burst of clicks, not one decision.
    setSyncing(true);
    const t = window.setTimeout(async () => {
      const ok = await writeRemote(user.id, { shapes, order, backgrounds });
      setSyncedRemotely(ok);
      setSyncing(false);
    }, 800);
    return () => { window.clearTimeout(t); setSyncing(false); };
  }, [shapes, order, backgrounds, user?.id]);

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

  const toggleBackground = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      backgrounds: { ...prev.backgrounds, [id]: prev.backgrounds[id] === 'white' ? 'black' : 'white' },
    }));
  }, []);

  const reset = useCallback(() => {
    setState({ shapes: { ...DEFAULT_LAYOUT }, order: [...DEFAULT_ORDER], backgrounds: {}, generation: LAYOUT_GENERATION });
  }, []);

  const classOf = useCallback((id: string) => SHAPE_CLASS[shapes[id] ?? '2x2'], [shapes]);
  const isLight = useCallback((id: string) => backgrounds[id] === 'white', [backgrounds]);

  // Total area, so the editor can say when a layout leaves a ragged last row.
  const units = order.reduce((sum, id) => sum + SHAPE_UNITS[shapes[id] ?? '2x2'], 0);
  const fillsRows = { phone: units % 4 === 0, desktop: units % 8 === 0 };

  return {
    shapes, order, backgrounds, editing, setEditing, cycleShape, setShape, moveBefore,
    toggleBackground, isLight, reset, classOf, units, fillsRows,
    // `syncedRemotely` is false until a write actually lands, so the editor can
    // say "this device only" rather than implying a sync that didn't happen.
    syncing, syncedRemotely,
  };
}
