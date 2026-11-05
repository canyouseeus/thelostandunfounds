import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, resolveCrewMember, isAdmin } from './_shared.js';
import { normalizeFeedUrl, maskFeedUrl, syncPhotographerCalendar } from './_ical-sync.js';

/**
 * A photographer's own blocked-out days.
 *
 * The owner has had this for a while — `booking_availability`, toggled from the
 * calendar tab of the admin booking view. That table is deliberately not reused
 * here. It is the *site's* calendar: the public booking form reads it and a row
 * there closes the date to everybody. One photographer being at a wedding on
 * Saturday must not stop the studio taking Saturday work, because somebody else
 * on the roster can shoot it. So crew blocks live in
 * `photographer_availability`, keyed per person, and feed the master calendar as
 * information — "who is free" — rather than as a gate.
 *
 * Auth is a verified Supabase JWT, the same model as the rest of `api/crew`.
 * The photographer is resolved from the token's user id and never from anything
 * in the request, so a caller cannot block out somebody else's diary. Invite
 * tokens are *not* accepted: unlike the gear form, which someone fills in before
 * they have an account, marking yourself unavailable is a scheduling commitment
 * and should come from a real session.
 *
 *   GET    /api/crew/availability?start=&end=   → the caller's own blocks + sync status
 *   GET    /api/crew/availability?roster=1      → admin: everyone's, with names
 *   POST   /api/crew/availability               → block { date | dates[], note, start_time?, end_time? }
 *   DELETE /api/crew/availability               → unblock { id } or { date | dates[] }
 *   PUT    /api/crew/availability               → calendar feed { ical_url } / { ical_url: null } / { sync: true }
 *
 * A block is the whole day when start_time/end_time are null, otherwise a
 * window ("free until 1, out 1–3, free after"). A day can hold several windows.
 *
 * POST and DELETE both take a list because "I'm out all next week" is the
 * common case and seven round-trips for it is silly. Blocking a whole day
 * replaces any manual windows already on it — they're inside it anyway.
 *
 * Rows synced from a calendar feed are `source = 'ical'` and belong to the
 * sync (see `_ical-sync.ts`); the manual DELETE paths leave them alone, since
 * removing one here would only bring it back on the next sync.
 */

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$|^24:00$/;
const MAX_DATES = 120;
const BLOCK_SELECT = 'id, date, start_time, end_time, note, source';

/** Postgres hands times back as HH:MM:SS; the UI only ever wants HH:MM. */
const trimTime = (t: string | null) => (t ? t.slice(0, 5) : null);
const shapeBlock = (b: any) => ({ ...b, start_time: trimTime(b.start_time), end_time: trimTime(b.end_time) });

/** Optional { start_time, end_time } — both or neither, end after start. */
function readTimes(body: any): { start: string | null; end: string | null; error?: string } {
  const start = body?.start_time ? String(body.start_time).trim() : '';
  const end = body?.end_time ? String(body.end_time).trim() : '';
  if (!start && !end) return { start: null, end: null };
  if (!start || !end) return { start: null, end: null, error: 'Give both a start and an end time.' };
  if (!HHMM.test(start) || !HHMM.test(end)) return { start: null, end: null, error: 'Times must be HH:MM.' };
  if (end <= start) return { start: null, end: null, error: 'End time has to be after the start time.' };
  return { start, end };
}

/** Pull `date` and/or `dates[]` off a body into one clean, de-duped list. */
function readDates(body: any): { dates: string[]; error?: string } {
  const raw: unknown[] = [];
  if (body?.date) raw.push(body.date);
  if (Array.isArray(body?.dates)) raw.push(...body.dates);

  const seen = new Set<string>();
  for (const value of raw) {
    const ymd = String(value || '').trim();
    if (!YMD.test(ymd)) return { dates: [], error: `Invalid date: ${ymd || '(empty)'}` };
    // Reject 2026-02-31 and friends — the regex only proves the shape.
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

/** What the dashboard may know about the feed — never the secret address itself. */
function calendarSyncStatus(feed: any) {
  return {
    connected: Boolean(feed?.ical_url),
    source: maskFeedUrl(feed?.ical_url || null),
    syncedAt: feed?.ical_synced_at || null,
    error: feed?.ical_sync_error || null,
    count: feed?.ical_synced_count ?? null,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const supabase = getSupabaseAdmin();

  try {
    // ── Admin: the whole roster's availability in a window ──────────────
    // This is the deployment question — "who can I send on the 3rd?" — so it
    // returns every active photographer, including the ones with nothing
    // blocked. An empty list for someone means available, and the caller
    // shouldn't have to infer that from their absence.
    if (req.method === 'GET' && req.query?.roster) {
      if (!(await isAdmin(req))) return res.status(403).json({ error: 'Forbidden' });

      const { start, end } = readRange(req);

      const [{ data: people }, { data: blocks }] = await Promise.all([
        supabase
          .from('photographers')
          .select('id, name, email, active')
          .eq('active', true)
          .order('name', { ascending: true }),
        supabase
          .from('photographer_availability')
          .select('id, photographer_id, date, start_time, end_time, note, source')
          .eq('is_blocked', true)
          .gte('date', start)
          .lte('date', end)
          .order('date', { ascending: true }),
      ]);

      const byPhotographer = new Map<string, any[]>();
      for (const block of blocks || []) {
        const list = byPhotographer.get(block.photographer_id) || [];
        const { photographer_id, ...rest } = shapeBlock(block);
        list.push(rest);
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
      const [{ data }, { data: feed }] = await Promise.all([
        supabase
          .from('photographer_availability')
          .select(BLOCK_SELECT)
          .eq('photographer_id', photographer.id)
          .eq('is_blocked', true)
          .gte('date', start)
          .lte('date', end)
          .order('date', { ascending: true })
          .order('start_time', { ascending: true, nullsFirst: true }),
        supabase
          .from('photographers')
          .select('ical_url, ical_synced_at, ical_sync_error, ical_synced_count')
          .eq('id', photographer.id)
          .maybeSingle(),
      ]);

      return res.status(200).json({
        photographer: { id: photographer.id, name: photographer.name },
        range: { start, end },
        blocked: (data || []).map(shapeBlock),
        calendarSync: calendarSyncStatus(feed),
      });
    }

    // ── Photographer: connect / disconnect / re-sync their calendar feed ─
    if (req.method === 'PUT') {
      const photographer = await resolvePhotographer(supabase, req);
      if (!photographer) return res.status(401).json({ error: 'Sign in to manage your calendar.' });
      const body = req.body || {};

      let icalUrl: string | null;
      if ('ical_url' in body) {
        if (body.ical_url === null || body.ical_url === '') {
          icalUrl = null;
        } else {
          const { url, error } = normalizeFeedUrl(body.ical_url);
          if (error) return res.status(400).json({ error });
          icalUrl = url!;
        }
        const { error } = await supabase
          .from('photographers')
          .update({ ical_url: icalUrl, ical_sync_error: null, ...(icalUrl ? {} : { ical_synced_at: null, ical_synced_count: null }) })
          .eq('id', photographer.id);
        if (error) return res.status(500).json({ error: error.message });
      } else if (body.sync) {
        const { data } = await supabase.from('photographers').select('ical_url').eq('id', photographer.id).maybeSingle();
        icalUrl = data?.ical_url || null;
        if (!icalUrl) return res.status(400).json({ error: 'No calendar connected.' });
      } else {
        return res.status(400).json({ error: 'ical_url or sync required' });
      }

      const result = await syncPhotographerCalendar(supabase, { id: photographer.id, ical_url: icalUrl });
      const { data: feed } = await supabase
        .from('photographers')
        .select('ical_url, ical_synced_at, ical_sync_error, ical_synced_count')
        .eq('id', photographer.id)
        .maybeSingle();
      return res.status(result.ok ? 200 : 422).json({
        success: result.ok,
        error: result.error,
        calendarSync: calendarSyncStatus(feed),
      });
    }

    if (req.method === 'POST' || req.method === 'DELETE') {
      const photographer = await resolvePhotographer(supabase, req);
      if (!photographer) return res.status(401).json({ error: 'Sign in to manage your calendar.' });

      // One window by id — the way a timed block is removed.
      if (req.method === 'DELETE' && req.body?.id) {
        const { data, error } = await supabase
          .from('photographer_availability')
          .delete()
          .eq('photographer_id', photographer.id)
          .eq('id', String(req.body.id))
          .eq('source', 'manual')
          .select('id');
        if (error) return res.status(500).json({ error: error.message });
        if (!data?.length) return res.status(404).json({ error: 'Block not found (synced blocks change in your own calendar).' });
        return res.status(200).json({ success: true, unblocked: [String(req.body.id)] });
      }

      const { dates, error: dateError } = readDates(req.body || {});
      if (dateError) return res.status(400).json({ error: dateError });

      if (req.method === 'DELETE') {
        const { error } = await supabase
          .from('photographer_availability')
          .delete()
          .eq('photographer_id', photographer.id)
          .eq('source', 'manual')
          .in('date', dates);
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true, unblocked: dates });
      }

      const times = readTimes(req.body || {});
      if (times.error) return res.status(400).json({ error: times.error });

      const note = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 300) : '';
      const now = new Date().toISOString();

      // A whole day swallows any manual windows already on it.
      if (!times.start) {
        const { error: clearError } = await supabase
          .from('photographer_availability')
          .delete()
          .eq('photographer_id', photographer.id)
          .eq('source', 'manual')
          .in('date', dates);
        if (clearError) return res.status(500).json({ error: clearError.message });
      }

      const { error } = await supabase.from('photographer_availability').insert(
        dates.map((date) => ({
          photographer_id: photographer.id,
          date,
          start_time: times.start,
          end_time: times.end,
          is_blocked: true,
          note: note || null,
          source: 'manual',
          updated_at: now,
        }))
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
