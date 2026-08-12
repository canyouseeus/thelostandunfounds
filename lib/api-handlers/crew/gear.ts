import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, resolveUserId, isAdmin } from './_shared.js';

/**
 * The roster's equipment list — what each photographer actually owns.
 *
 * Booking someone is a question about kit before it is a question about
 * availability: a multifamily walkthrough needs a wide on a full-frame body, a
 * talking-head needs a lav and a key light, a rooftop needs a drone. Until now
 * `photographers` held a name, an email and a payout percentage, so answering
 * "who can I send tonight?" meant remembering, or asking in a DM.
 *
 * Three ways in, deliberately, because the roster is filled from three places:
 *
 *  - `?token=` — an invite token from `gallery_invitations`. This is the link
 *    that goes out in the onboarding email, so someone who replied to an
 *    Instagram story with nothing but an email address can list their kit
 *    before they have an account. Submitting through a token also *creates*
 *    the roster row if they don't have one yet — that is the onboarding.
 *  - Bearer JWT — the signed-in photographer editing their own kit later.
 *  - Admin headers — the owner reading or correcting the whole roster.
 *
 * A caller is never trusted for identity. The token is looked up server-side
 * and the photographer is resolved from the invited email; the JWT is verified
 * by Supabase and the photographer resolved from the returned user id. Neither
 * path reads a photographer id out of the request body.
 *
 *   GET  /api/crew/gear?token=…       → { photographer, items, gear_notes }
 *   GET  /api/crew/gear               → same, for the signed-in photographer
 *   GET  /api/crew/gear?roster=1      → admin: every photographer + their kit
 *   PUT  /api/crew/gear               → replace the caller's kit wholesale
 *
 * PUT replaces rather than patches. The form is a list the photographer edits
 * as a whole — deleting a sold lens has to actually remove it, and a diffing
 * endpoint would need stable client-side ids for rows that were only just
 * typed. The replace runs delete-then-insert inside one request; a failure
 * mid-way is recoverable by resubmitting the same form.
 */

export const GEAR_CATEGORIES = [
  'camera',
  'lens',
  'lighting',
  'audio',
  'support',
  'drone',
  'power',
  'storage',
  'computer',
  'other',
] as const;

export type GearCategory = (typeof GEAR_CATEGORIES)[number];

export interface GearItemInput {
  category?: string;
  make?: string;
  model?: string;
  details?: string;
  quantity?: number | string;
  is_primary?: boolean;
}

const MAX_ITEMS = 200;
const trim = (value: unknown, max: number): string =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

/** Shape one submitted row, or reject it. Returns null for rows to drop. */
function normalizeItem(raw: GearItemInput): {
  category: GearCategory;
  make: string | null;
  model: string;
  details: string | null;
  quantity: number;
  is_primary: boolean;
} | null {
  const model = trim(raw.model, 120);
  // A row with no model is an empty line in the form, not an error.
  if (!model) return null;

  const category = trim(raw.category, 40).toLowerCase() as GearCategory;
  const quantity = Math.min(999, Math.max(1, Math.floor(Number(raw.quantity) || 1)));

  return {
    category: (GEAR_CATEGORIES as readonly string[]).includes(category) ? category : 'other',
    make: trim(raw.make, 80) || null,
    model,
    details: trim(raw.details, 500) || null,
    quantity,
    is_primary: raw.is_primary === true,
  };
}

/** Resolve an invite token to the email it was issued to, or null. */
async function emailFromToken(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  token: string
): Promise<string | null> {
  const { data } = await supabase
    .from('gallery_invitations')
    .select('email, expires_at')
    .eq('token', token)
    .maybeSingle();

  if (!data?.email) return null;
  // Accepted invitations still open the gear form — the token is how someone
  // gets back to their kit list before they have set a password.
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) return null;
  return String(data.email).toLowerCase();
}

const PHOTOGRAPHER_FIELDS = 'id, name, email, active, gear_notes, gear_updated_at';

async function loadGear(supabase: ReturnType<typeof getSupabaseAdmin>, photographerId: string) {
  const { data } = await supabase
    .from('photographer_gear')
    .select('id, category, make, model, details, quantity, is_primary')
    .eq('photographer_id', photographerId)
    .order('category', { ascending: true })
    .order('model', { ascending: true });
  return data || [];
}

/**
 * Identify the caller and hand back their roster row.
 *
 * `create` is only ever true on a token submission: a token proves the owner
 * invited that exact address, so first submission is allowed to open the
 * roster row. A read never creates one.
 */
async function resolveCaller(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  req: VercelRequest,
  opts: { create: boolean }
): Promise<{ photographer: any | null; error?: string; status?: number }> {
  const token = trim(req.query?.token ?? (req.body as any)?.token, 200);

  if (token) {
    const email = await emailFromToken(supabase, token);
    if (!email) return { photographer: null, error: 'This link has expired.', status: 401 };

    const { data: existing } = await supabase
      .from('photographers')
      .select(PHOTOGRAPHER_FIELDS)
      .ilike('email', email)
      .maybeSingle();
    if (existing) return { photographer: existing };
    if (!opts.create) return { photographer: null, error: 'No roster entry yet.', status: 404 };

    const name = trim((req.body as any)?.name, 120) || email.split('@')[0];
    const { data: created, error } = await supabase
      .from('photographers')
      .insert({ name, email })
      .select(PHOTOGRAPHER_FIELDS)
      .single();
    if (error) return { photographer: null, error: error.message, status: 500 };
    return { photographer: created };
  }

  const userId = await resolveUserId(req);
  if (!userId) return { photographer: null, error: 'Sign in to manage your kit.', status: 401 };

  const { data } = await supabase
    .from('photographers')
    .select(PHOTOGRAPHER_FIELDS)
    .eq('user_id', userId)
    .maybeSingle();
  if (!data) return { photographer: null, error: 'You are not on the roster yet.', status: 404 };
  return { photographer: data };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const supabase = getSupabaseAdmin();

  try {
    // Admin roster read — every photographer with their kit attached, which is
    // the view the owner actually deploys from.
    if (req.method === 'GET' && req.query?.roster) {
      if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });

      const { data: people } = await supabase
        .from('photographers')
        .select('id, name, email, phone, instagram, active, gear_notes, gear_updated_at')
        .order('name', { ascending: true });

      const { data: gear } = await supabase
        .from('photographer_gear')
        .select('id, photographer_id, category, make, model, details, quantity, is_primary')
        .order('category', { ascending: true });

      const byPhotographer = new Map<string, any[]>();
      for (const item of gear || []) {
        const list = byPhotographer.get(item.photographer_id) || [];
        list.push(item);
        byPhotographer.set(item.photographer_id, list);
      }

      return res.status(200).json({
        roster: (people || []).map((person) => ({
          ...person,
          items: byPhotographer.get(person.id) || [],
        })),
      });
    }

    if (req.method === 'GET') {
      const { photographer, error, status } = await resolveCaller(supabase, req, { create: false });
      if (!photographer) {
        // A token holder with no roster row yet is not an error — it is a blank
        // form waiting to be filled in.
        if (status === 404 && req.query?.token) {
          return res.status(200).json({ photographer: null, items: [], gear_notes: '' });
        }
        return res.status(status || 401).json({ error });
      }

      return res.status(200).json({
        photographer: { id: photographer.id, name: photographer.name, email: photographer.email },
        gear_notes: photographer.gear_notes || '',
        gear_updated_at: photographer.gear_updated_at,
        items: await loadGear(supabase, photographer.id),
      });
    }

    if (req.method === 'PUT' || req.method === 'POST') {
      const body = (req.body || {}) as { items?: GearItemInput[]; gear_notes?: string };
      const rawItems = Array.isArray(body.items) ? body.items : [];
      if (rawItems.length > MAX_ITEMS) {
        return res.status(400).json({ error: `Too many items (max ${MAX_ITEMS}).` });
      }

      const { photographer, error, status } = await resolveCaller(supabase, req, { create: true });
      if (!photographer) return res.status(status || 401).json({ error });

      const items = rawItems
        .map(normalizeItem)
        .filter((item): item is NonNullable<ReturnType<typeof normalizeItem>> => item !== null);

      const { error: deleteError } = await supabase
        .from('photographer_gear')
        .delete()
        .eq('photographer_id', photographer.id);
      if (deleteError) return res.status(500).json({ error: deleteError.message });

      if (items.length) {
        const { error: insertError } = await supabase
          .from('photographer_gear')
          .insert(items.map((item) => ({ ...item, photographer_id: photographer.id })));
        if (insertError) return res.status(500).json({ error: insertError.message });
      }

      await supabase
        .from('photographers')
        .update({
          gear_notes: trim(body.gear_notes, 2000) || null,
          gear_updated_at: new Date().toISOString(),
        })
        .eq('id', photographer.id);

      return res.status(200).json({
        success: true,
        saved: items.length,
        photographer: { id: photographer.id, name: photographer.name, email: photographer.email },
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('[crew/gear]', err);
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
}
