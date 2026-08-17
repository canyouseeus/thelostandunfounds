import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, resolveCrewMember, isAdmin } from './_shared.js';

/**
 * A photographer's own blocked-out days.
 *
 * The owner has had this for a while; `booking_availability`, toggled from the
 * calendar tab of the admin booking view. That table is deliberately not reused
 * here. It is the *site's* calendar: the public booking form reads it and a row
 * there closes the date to everybody. One photographer being at a wedding on
 * Saturday must not stop the studio taking Saturday work, because somebody else
 * on the roster can shoot it. So crew blocks live in
 * `photographer_availability`, keyed per person, and feed the master calendar as
 * information, "who is free", rather than as a gate.
 *
 * Auth is a verified Supabase JWT, the same model as the rest of `api/crew`.
 * The photographer is resolved from the token's user id and never from anything
 * in the request, so a caller cannot block out somebody else's diary. Invite
 * tokens are *not* accepted: unlike the gear form, which someone fills in before
 * they have an account, marking yourself unavailable is a scheduling commitment
 * and should come from a real session.
 *
 *   GET    /api/crew/availability?start=&end=   → the caller's own blocks
 *   GET    /api/crew/availability?roster=1      → admin: everyone's, with names
 *   POST   /api/crew/availability               → block { date | dates[], note }
 *   DELETE /api/crew/availability               → unblock { date | dates[] }
 *
 * POST and DELETE both take a list because "I'm out all next week" is the
 * common case and seven round-trips for it is silly. POST upserts, so
 * re-blocking a day already blocked just refreshes the note instead of erroring.
 */

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DATES = 120;

/** Pull `date` and/or `dates[]` off a body into one clean, de-duped list. */
function readDates(body: any): { dates: string[]; error?: string } {
  const raw: unknown[] = [];
  if (body?.date) raw.push(body.date);
  if (Array.isArray(body?.dates)) raw.push(...body.dates);

  const seen = new Set<string>();
  for (const value of raw) {
    const ymd = String(value || '').trim();
    if (!YMD.test(ymd)) return { dates: [], error: `Invalid date: ${ymd || '(empty)'}` };
    // Reject 2026-02-31 and friends; the regex only proves the shape.
    const [y, m, d] = ymd.split('-').map(Number);
    const parsed = new Date(Date.UTC(y, m - 1, d));
    if (parsed.getUTCFullYear() !== y || parsed.getUTCMonth() !== m - 1 || parsed.getUTCDate() !== d) {
      return { dates: [], error: `Not a real date: ${ymd}` };
    }
    seen.add(ymd);
  }

  if (!seen.size) return { dates: [], error: 'date or dates[] required' };
  if (seen.size > MAX_DATES) return { dates: [], error: `Too many dates (max ${MAX_DATES}).` };
  return { dates: [...seen].sort() };
}

/** The roster row behind a verified session, or null. */
async function resolvePhotographer(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  req: VercelRequest
) {
  const resolved = await resolveCrewMember(supabase, req);
  return resolved?.photographer || null;
}

/** Default window when the caller doesn't name one: today → a year out. */
function defaultRange(): { start: string; end: string } {
  const today = new Date();
  const start = today.toISOString().slice(0, 10);
  const end = new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return { start, end };
}

function readRange(req: VercelRequest): { start: string; end: string } {
  const fallback = defaultRange();
  const start = String(req.query?.start || '');
  const end = String(req.query?.end || '');
  return {
    start: YMD.test(start) ? start : fallback.start,
    end: YMD.test(end) ? end : fallback.end,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const supabase = getSupabaseAdmin();

  try {
    // ── Admin: the whole roster's availability in a window ──────────────
    // This is the deployment question: "who can I send on the 3rd?", so it
    // returns every active photographer, including the ones with nothing
    // blocked. An empty list for someone means available, and the caller
    // shouldn't have to infer that from their absence.
    if (req.method === 'GET' && req.query?.roster) {
      if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });

      const { start, end } = readRange(req);

      const [{ data: people }, { data: blocks }] = await Promise.all([
        supabase
          .from('photographers')
          .select('id, name, email, active')
          .eq('active', true)
          .order('name', { ascending: true }),
        supabase
          .from('photographer_availability')
          .select('id, photographer_id, date, note')
          .eq('is_blocked', true)
          .gte('date', start)
          .lte('date', end)
          .order('date', { ascending: true }),
      ]);

      const byPhotographer = new Map<string, any[]>();
      for (const block of blocks || []) {
        const list = byPhotographer.get(block.photographer_id) || [];
        list.push({ id: block.id, date: block.date, note: block.note });
        byPhotographer.set(block.photographer_id, list);
      }

      return res.status(200).json({
        range: { start, end },
        roster: (people || []).map((person) => ({
          ...person,
          blocked: byPhotographer.get(person.id) || [],
        })),
      });
    }

    // ── Photographer: their own blocks ──────────────────────────────────
    if (req.method === 'GET') {
      const photographer = await resolvePhotographer(supabase, req);
      if (!photographer) return res.status(401).json({ error: 'Sign in to manage your calendar.' });

      const { start, end } = readRange(req);
      const { data } = await supabase
        .from('photographer_availability')
        .select('id, date, note')
        .eq('photographer_id', photographer.id)
        .eq('is_blocked', true)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: true });

      return res.status(200).json({
        photographer: { id: photographer.id, name: photographer.name },
        range: { start, end },
        blocked: data || [],
      });
    }

    if (req.method === 'POST' || req.method === 'DELETE') {
      const photographer = await resolvePhotographer(supabase, req);
      if (!photographer) return res.status(401).json({ error: 'Sign in to manage your calendar.' });

      const { dates, error: dateError } = readDates(req.body || {});
      if (dateError) return res.status(400).json({ error: dateError });

      if (req.method === 'DELETE') {
        const { error } = await supabase
          .from('photographer_availability')
          .delete()
          .eq('photographer_id', photographer.id)
          .in('date', dates);
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true, unblocked: dates });
      }

      const note = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 300) : '';
      const now = new Date().toISOString();
      const { error } = await supabase.from('photographer_availability').upsert(
        dates.map((date) => ({
          photographer_id: photographer.id,
          date,
          is_blocked: true,
          note: note || null,
          updated_at: now,
        })),
        { onConflict: 'photographer_id,date' }
      );
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true, blocked: dates });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('[crew/availability]', err);
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
}
