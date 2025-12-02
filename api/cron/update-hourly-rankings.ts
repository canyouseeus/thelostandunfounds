/**
 * Hourly Rankings Update Cron Job
 * Runs every hour to snapshot current rankings for rank change tracking
 * Triggered by Vercel Cron
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify this is a cron request from Vercel
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    // Get current top 10 rankings from today's stats
    const { data: currentRankings, error: rankingsError } = await supabase
      .from('king_midas_daily_stats')
      .select('affiliate_id, rank, profit_generated')
      .eq('date', today)
      .order('rank', { ascending: true })
      .limit(10);

    if (rankingsError) {
      console.error('Error fetching current rankings:', rankingsError);
      return res.status(500).json({ error: 'Failed to fetch rankings' });
    }

    if (!currentRankings || currentRankings.length === 0) {
      console.log('No rankings found for today');
      return res.status(200).json({ message: 'No rankings to snapshot', count: 0 });
    }

    // Get previous hour's rankings to calculate rank changes
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const { data: previousRankings } = await supabase
      .from('king_midas_hourly_rankings')
      .select('affiliate_id, rank')
      .gte('recorded_at', oneHourAgo)
      .order('recorded_at', { ascending: false })
      .limit(50);

    // Build previous rank map
    const previousRankMap = new Map<string, number>();
    if (previousRankings) {
      previousRankings.forEach(r => {
        if (!previousRankMap.has(r.affiliate_id)) {
          previousRankMap.set(r.affiliate_id, r.rank);
        }
      });
    }

    // Prepare hourly ranking snapshots
    const hourlySnapshots = currentRankings.map(ranking => {
      const previousRank = previousRankMap.get(ranking.affiliate_id);
      let rank_change = 0;
      
      if (previousRank !== undefined) {
        // Calculate change (previous - current, positive = moved up)
        rank_change = previousRank - ranking.rank;
      }

      return {
        affiliate_id: ranking.affiliate_id,
        rank: ranking.rank,
        profit_generated: ranking.profit_generated,
        rank_change,
        recorded_at: now,
      };
    });

    // Insert hourly snapshots
    const { error: insertError } = await supabase
      .from('king_midas_hourly_rankings')
      .insert(hourlySnapshots);

    if (insertError) {
      console.error('Error inserting hourly snapshots:', insertError);
      return res.status(500).json({ error: 'Failed to save rankings' });
    }

    // Clean up old hourly rankings (keep only last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600000).toISOString();
    await supabase
      .from('king_midas_hourly_rankings')
      .delete()
      .lt('recorded_at', sevenDaysAgo);

    console.log(`✅ Saved ${hourlySnapshots.length} hourly ranking snapshots`);

    return res.status(200).json({
      message: 'Hourly rankings updated successfully',
      count: hourlySnapshots.length,
      timestamp: now,
    });
  } catch (error) {
    console.error('Hourly rankings cron error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}



