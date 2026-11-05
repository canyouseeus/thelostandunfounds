import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, isCronAuthorized } from '../../lib/api-handlers/crew/_shared.js';
import { syncPhotographerCalendar } from '../../lib/api-handlers/crew/_ical-sync.js';

/**
 * Cron: re-read every connected photographer calendar feed.
 * Schedule: hourly (configured in vercel.json).
 *
 * Google only refreshes its secret iCal feed every few hours anyway, so hourly
 * is as fresh as the source allows. Feeds run one at a time — the roster is
 * small and a slow provider should cost wall time, not a burst of parallel
 * fetches against someone else's server.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isCronAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  const supabase = getSupabaseAdmin();
  const { data: people, error } = await supabase
    .from('photographers')
    .select('id, name, ical_url')
    .eq('active', true)
    .not('ical_url', 'is', null);
  if (error) return res.status(500).json({ error: error.message });

  const results = [];
  for (const person of people || []) {
    const result = await syncPhotographerCalendar(supabase, person);
    results.push({ id: person.id, name: person.name, ...result });
  }
  return res.status(200).json({ synced: results.length, results });
}
