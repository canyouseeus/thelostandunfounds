import ICAL from 'ical.js';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Pull a photographer's own calendar into `photographer_availability`.
 *
 * Every calendar app can publish a read-only iCal feed — Google's "Secret
 * address in iCal format", an iCloud public calendar link, Outlook's published
 * ICS. The photographer pastes that address once and their busy time keeps
 * itself current: the cron re-reads every feed hourly and the dashboard can
 * force a re-read. No OAuth, so nobody has to grant this platform access to
 * their Google account, and it works the same for every provider.
 *
 * Synced rows are `source = 'ical'` and are owned by the sync: each run deletes
 * the future ical rows and writes them fresh, so an event moved or cancelled in
 * the photographer's calendar moves or disappears here too. Manual blocks
 * (`source = 'manual'`) are never touched by a sync.
 *
 * Event titles are deliberately NOT copied. The feed is someone's personal
 * calendar; the studio needs "busy 2–5pm", not "therapy". Every synced block is
 * noted as coming from their calendar and nothing more.
 */

/** Wall-clock times are stored in the studio's zone, like every booking. */
export const STUDIO_TZ = process.env.STUDIO_TIMEZONE || 'America/Chicago';

/** How far ahead a sync looks. Further out than this nobody is scheduling. */
const WINDOW_DAYS = 180;
const MAX_FEED_BYTES = 5 * 1024 * 1024;
const MAX_OCCURRENCES_PER_EVENT = 500;
const SYNC_NOTE = 'Busy (from your calendar)';

export interface BusyBlock {
  date: string;
  start_time: string | null; // HH:MM, null = all day
  end_time: string | null;
  external_uid: string | null;
}

// ── Feed URL ────────────────────────────────────────────────────────────────

/**
 * Normalise what someone pasted into a fetchable https URL, or explain why not.
 *
 * `webcal://` is just https with a different scheme so calendar apps open it.
 * Plain http and raw IP addresses are refused: the server fetches this URL, and
 * letting a caller point it at an internal address is the classic SSRF hole.
 */
export function normalizeFeedUrl(raw: string): { url?: string; error?: string } {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return { error: 'Paste your calendar\'s iCal address.' };
  const swapped = trimmed.replace(/^webcals?:\/\//i, 'https://');
  let parsed: URL;
  try {
    parsed = new URL(swapped);
  } catch {
    return { error: 'That doesn\'t look like a web address.' };
  }
  if (parsed.protocol !== 'https:') return { error: 'The address must start with https:// or webcal://.' };
  const host = parsed.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    /^[\d.]+$/.test(host) ||
    host.includes(':') ||
    !host.includes('.')
  ) {
    return { error: 'Use the address your calendar app gives you.' };
  }
  return { url: parsed.toString() };
}

/** Enough of the address to recognise it, none of the secret token. */
export function maskFeedUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}/…`;
  } catch {
    return 'calendar feed';
  }
}

async function fetchFeed(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'text/calendar, */*' },
    });
    // A redirect may not hand the fetch to somewhere the URL check would refuse.
    if (res.url && normalizeFeedUrl(res.url).error) throw new Error('Calendar address redirected somewhere unsafe.');
    if (res.status === 404 || res.status === 410) throw new Error('Calendar not found. The address may have been reset.');
    if (res.status === 401 || res.status === 403) throw new Error('Calendar is private. Use the secret/public iCal address.');
    if (!res.ok) throw new Error(`Calendar server answered ${res.status}.`);

    const text = await res.text();
    if (text.length > MAX_FEED_BYTES) throw new Error('Calendar feed is too large.');
    if (!text.includes('BEGIN:VCALENDAR')) throw new Error('That address isn\'t an iCal feed. Look for "iCal format" in your calendar\'s settings.');
    return text;
  } catch (err: any) {
    if (err?.name === 'AbortError') throw new Error('Calendar took too long to answer.');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ── Time helpers ────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0');

interface Wall { ymd: string; minutes: number }

function wallInStudio(instant: Date): Wall {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: STUDIO_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '00';
  return {
    ymd: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

/**
 * An ICAL.Time as a studio wall clock. Floating times (no zone at all) are
 * already wall-clock — reading them through `toJSDate` would interpret them in
 * the server's zone, which on Vercel is UTC.
 */
function toWall(time: any): Wall {
  const floating = !time.zone || time.zone === ICAL.Timezone.localTimezone;
  if (floating) {
    return { ymd: `${time.year}-${pad(time.month)}-${pad(time.day)}`, minutes: time.hour * 60 + time.minute };
  }
  return wallInStudio(time.toJSDate());
}

function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

const hhmm = (minutes: number) => (minutes >= 1440 ? '24:00' : `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`);

// ── Parsing ─────────────────────────────────────────────────────────────────

type DayRanges = Map<string, Array<[number, number]>>;

function addRange(days: DayRanges, ymd: string, start: number, end: number, windowStart: string, windowEnd: string) {
  if (ymd < windowStart || ymd > windowEnd || end <= start) return;
  const list = days.get(ymd) || [];
  list.push([start, end]);
  days.set(ymd, list);
}

function addOccurrence(days: DayRanges, start: any, end: any, windowStart: string, windowEnd: string) {
  if (start.isDate) {
    // All-day: DTEND is exclusive, and a missing one means a single day.
    const first = `${start.year}-${pad(start.month)}-${pad(start.day)}`;
    const last = end ? addDays(`${end.year}-${pad(end.month)}-${pad(end.day)}`, -1) : first;
    for (let d = first, i = 0; d <= last && i < 400; d = addDays(d, 1), i++) {
      addRange(days, d, 0, 1440, windowStart, windowEnd);
    }
    return;
  }

  const s = toWall(start);
  const e = end ? toWall(end) : { ...s };
  if (s.ymd === e.ymd) {
    addRange(days, s.ymd, s.minutes, e.minutes, windowStart, windowEnd);
    return;
  }
  // Runs past midnight: split it across the days it touches.
  addRange(days, s.ymd, s.minutes, 1440, windowStart, windowEnd);
  for (let d = addDays(s.ymd, 1), i = 0; d < e.ymd && i < 400; d = addDays(d, 1), i++) {
    addRange(days, d, 0, 1440, windowStart, windowEnd);
  }
  addRange(days, e.ymd, 0, e.minutes, windowStart, windowEnd);
}

/** Events that should not make someone unavailable. */
function isFree(component: any): boolean {
  const status = String(component.getFirstPropertyValue('status') || '').toUpperCase();
  const transp = String(component.getFirstPropertyValue('transp') || '').toUpperCase();
  return status === 'CANCELLED' || transp === 'TRANSPARENT';
}

/**
 * Busy time in an iCal feed, as per-day blocks in the studio's zone.
 *
 * Overlapping events on the same day are merged, so a stack of meetings reads
 * as one block, and a day whose busy time covers all 24 hours becomes a
 * whole-day block.
 */
export function parseBusyBlocks(icsText: string, windowStart: string, windowEnd: string): BusyBlock[] {
  const root = new ICAL.Component(ICAL.parse(icsText));

  for (const vtz of root.getAllSubcomponents('vtimezone')) {
    try { ICAL.TimezoneService.register(vtz); } catch { /* a bad zone falls back to UTC */ }
  }

  // Recurrence exceptions (a moved or cancelled instance) arrive as separate
  // VEVENTs sharing the UID; relate them to the series so iteration uses them.
  const series = new Map<string, any>();
  const exceptions: any[] = [];
  for (const component of root.getAllSubcomponents('vevent')) {
    const event = new ICAL.Event(component);
    if (event.isRecurrenceException()) exceptions.push(event);
    else series.set(event.uid || `anon-${series.size}`, event);
  }
  for (const exception of exceptions) {
    const parent = series.get(exception.uid);
    if (parent) parent.relateException(exception);
    else series.set(`${exception.uid}-${exception.recurrenceId}`, exception);
  }

  const windowEndTime = ICAL.Time.fromDateString(addDays(windowEnd, 1));
  const windowStartTime = ICAL.Time.fromDateString(addDays(windowStart, -1));
  const days: DayRanges = new Map();

  for (const event of series.values()) {
    if (!event.startDate) continue;

    if (!event.isRecurring()) {
      if (isFree(event.component)) continue;
      addOccurrence(days, event.startDate, event.endDate, windowStart, windowEnd);
      continue;
    }

    const iterator = event.iterator();
    let next: any;
    for (let i = 0; i < MAX_OCCURRENCES_PER_EVENT && (next = iterator.next()); i++) {
      if (next.compare(windowEndTime) > 0) break;
      const details = event.getOccurrenceDetails(next);
      if (details.endDate && details.endDate.compare(windowStartTime) < 0) continue;
      if (isFree(details.item.component)) continue;
      addOccurrence(days, details.startDate, details.endDate, windowStart, windowEnd);
    }
  }

  const blocks: BusyBlock[] = [];
  for (const [date, ranges] of [...days.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    ranges.sort((a, b) => a[0] - b[0]);
    const merged: Array<[number, number]> = [];
    for (const range of ranges) {
      const last = merged[merged.length - 1];
      if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
      else merged.push([...range] as [number, number]);
    }
    if (merged.length === 1 && merged[0][0] === 0 && merged[0][1] >= 1440) {
      blocks.push({ date, start_time: null, end_time: null, external_uid: null });
      continue;
    }
    for (const [start, end] of merged) {
      blocks.push({ date, start_time: hhmm(start), end_time: hhmm(end), external_uid: null });
    }
  }
  return blocks;
}

// ── Sync ────────────────────────────────────────────────────────────────────

export interface SyncResult { ok: boolean; count: number; error?: string }

/**
 * Re-read one photographer's feed and replace their future synced blocks.
 *
 * The status (time, count, last error) is written back to `photographers` on
 * success and on failure, so the dashboard can say "last synced 10 min ago" or
 * "your calendar address stopped working" instead of silently going stale.
 * On failure the previous synced blocks are left in place: a feed that timed
 * out once shouldn't make someone look free for every day it covered.
 */
export async function syncPhotographerCalendar(
  supabase: SupabaseClient,
  photographer: { id: string; ical_url: string | null }
): Promise<SyncResult> {
  const now = new Date();
  const today = wallInStudio(now).ymd;

  if (!photographer.ical_url) {
    await supabase.from('photographer_availability').delete()
      .eq('photographer_id', photographer.id).eq('source', 'ical');
    return { ok: true, count: 0 };
  }

  try {
    const text = await fetchFeed(photographer.ical_url);
    const blocks = parseBusyBlocks(text, today, addDays(today, WINDOW_DAYS));

    const { error: deleteError } = await supabase.from('photographer_availability').delete()
      .eq('photographer_id', photographer.id).eq('source', 'ical').gte('date', today);
    if (deleteError) throw new Error(deleteError.message);

    const rows = blocks.map((block) => ({
      photographer_id: photographer.id,
      date: block.date,
      start_time: block.start_time,
      end_time: block.end_time,
      is_blocked: true,
      note: SYNC_NOTE,
      source: 'ical',
      external_uid: block.external_uid,
      updated_at: now.toISOString(),
    }));
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await supabase.from('photographer_availability').insert(rows.slice(i, i + 500));
      if (error) throw new Error(error.message);
    }

    await supabase.from('photographers').update({
      ical_synced_at: now.toISOString(),
      ical_sync_error: null,
      ical_synced_count: rows.length,
    }).eq('id', photographer.id);

    return { ok: true, count: rows.length };
  } catch (err: any) {
    const message = String(err?.message || 'Calendar sync failed.').slice(0, 300);
    await supabase.from('photographers').update({ ical_sync_error: message }).eq('id', photographer.id);
    return { ok: false, count: 0, error: message };
  }
}
