import { supabase } from '../../lib/supabase';
import type { ShapeName } from './useDashboardLayout';

export interface StoredLayout {
  shapes: Record<string, ShapeName>;
  order: string[];
  /** Widget id -> 'white' for a white tile. Absent means black. */
  backgrounds: Record<string, 'black' | 'white'>;
  /**
   * Which generation of the designed default this layout descends from. When
   * the shipped default changes shape: new widgets, new size catalogues; a
   * layout saved under an older generation is arrangement from a different
   * dashboard, and keeping it strands tiles at sizes that no longer compose.
   * Bump LAYOUT_GENERATION and saved layouts adopt the new default once.
   */
  generation?: number;
}

/** Raise this whenever DEFAULT_LAYOUT changes in a way worth adopting. */
export const LAYOUT_GENERATION = 2;

/**
 * Where a dashboard layout lives.
 *
 * The browser is the fast path and the fallback: it answers instantly on load
 * and keeps working offline, in private mode, and when the account has no row
 * yet. Supabase is what makes a layout follow you to another device.
 *
 * Every remote call is allowed to fail quietly. If the table hasn't been created
 * yet, or the request is offline, the dashboard behaves exactly as it does with
 * local storage alone: a layout that doesn't sync is a much smaller problem
 * than a dashboard that won't render.
 */

const KEY = 'lu.dashboard.layout';
const TABLE = 'dashboard_layouts';

export function readLocal(): Partial<StoredLayout> | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Partial<StoredLayout>) : null;
  } catch {
    return null;
  }
}

export function writeLocal(layout: StoredLayout) {
  try {
    localStorage.setItem(KEY, JSON.stringify(layout));
  } catch {
    /* private mode: the layout just won't persist here */
  }
}

/** The signed-in user's saved layout, or null if there isn't one to be had. */
export async function readRemote(userId: string): Promise<Partial<StoredLayout> | null> {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('shapes, tile_order, backgrounds, generation')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return null;
    return {
      shapes: data.shapes ?? undefined,
      order: data.tile_order ?? undefined,
      backgrounds: data.backgrounds ?? undefined,
      generation: data.generation ?? undefined,
    };
  } catch {
    return null;
  }
}

/** Returns whether the write landed, so callers can tell "saved" from "local only". */
export async function writeRemote(userId: string, layout: StoredLayout): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(TABLE)
      .upsert(
        {
          user_id: userId,
          shapes: layout.shapes,
          tile_order: layout.order,
          backgrounds: layout.backgrounds,
          generation: LAYOUT_GENERATION,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );
    return !error;
  } catch {
    return false;
  }
}
