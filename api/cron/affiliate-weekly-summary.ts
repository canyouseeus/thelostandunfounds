import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { sendAffiliateEmail } from '../../lib/api-handlers/affiliates/_emails.js';

/**
 * Cron: weekly summary email to active affiliates
 * Schedule: Mondays at 9am UTC (configured in vercel.json)
 *
 * For each active, non-flagged affiliate, sums up the prior 7 days of:
 *  - earnings (commissions created in the window)
 *  - conversions (commissions count)
 *  - clicks (click events count)
 *  - available balance (commissions past holding period, not paid)
 *
 * Skips affiliates with zero activity to avoid noise.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const cronSecret = req.headers['x-cron-secret'] || req.query.secret;
  const expectedSecret = process.env.CRON_SECRET;
  if (expectedSecret && cronSecret !== expectedSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }
  const supabase = createClient(supabaseUrl, supabaseKey);

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();
  const weekKey = since.slice(0, 10); // for dedup reference id

  const { data: affiliates, error } = await supabase
    .from('affiliates')
    .select('id, user_id, code, affiliate_code')
    .eq('status', 'active')
    .or('is_flagged.is.null,is_flagged.eq.false');

  if (error) {
    console.error('[weekly-summary] failed to load affiliates:', error.message);
    return res.status(500).json({ error: error.message });
  }

  let sent = 0;
  let skipped = 0;

  for (const aff of affiliates || []) {
    try {
      const [{ data: weekCommissions }, { count: clickCount }, { data: avail }] = await Promise.all([
        supabase
          .from('affiliate_commissions')
          .select('amount, created_at')
          .eq('affiliate_id', aff.id)
          .gte('created_at', since),
        supabase
          .from('affiliate_click_events')
          .select('id', { count: 'exact', head: true })
          .eq('affiliate_id', aff.id)
          .eq('is_suspicious', false)
          .gte('created_at', since),
        supabase
          .from('affiliate_commissions')
          .select('amount, available_date')
          .eq('affiliate_id', aff.id)
          .in('status', ['approved', 'confirmed'])
          .or(`available_date.lte.${now},available_date.is.null`),
      ]);

      const weekEarnings = (weekCommissions || []).reduce(
        (s, c) => s + Number(c.amount || 0),
        0
      );
      const weekConversions = (weekCommissions || []).length;
      const availableBalance = (avail || []).reduce(
        (s, c) => s + Number(c.amount || 0),
        0
      );
      const weekClicks = clickCount ?? 0;

      if (weekEarnings === 0 && weekConversions === 0 && weekClicks === 0) {
        skipped++;
        continue;
      }

      const { data: userRow } = await supabase.auth.admin.getUserById(aff.user_id);
      const recipient = userRow?.user?.email;
      if (!recipient) {
        skipped++;
        continue;
      }

      const result = await sendAffiliateEmail({
        type: 'weekly_summary',
        affiliateId: aff.id,
        referenceId: `week_${weekKey}`,
        to: recipient,
        data: {
          weekEarnings,
          weekConversions,
          weekClicks,
          availableBalance,
        },
      });

      if (result.sent) sent++;
      else skipped++;
    } catch (loopErr: any) {
      console.warn('[weekly-summary] affiliate failed:', aff.id, loopErr?.message);
      skipped++;
    }
  }

  return res.status(200).json({
    success: true,
    affiliates: affiliates?.length ?? 0,
    sent,
    skipped,
    weekKey,
  });
}
