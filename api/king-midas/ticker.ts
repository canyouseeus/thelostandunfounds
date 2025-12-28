/**
 * King Midas Ticker API
 * Returns real-time rankings with hourly rank changes for the ticker display
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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const today = new Date().toISOString().split('T')[0];

    // Get today's top 10 rankings from king_midas_daily_stats
    const { data: todayRankings, error: todayError } = await supabase
      .from('king_midas_daily_stats')
      .select(`
        rank,
        profit_generated,
        affiliate_id,
        affiliates!inner(code)
      `)
      .eq('date', today)
      .order('rank', { ascending: true })
      .limit(10);

    if (todayError) {
      console.error('Error fetching today rankings:', todayError);
      return res.status(500).json({ error: 'Failed to fetch rankings' });
    }

    // Get the most recent hourly snapshot (should be from previous hour)
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    
    const { data: previousRankings, error: previousError } = await supabase
      .from('king_midas_hourly_rankings')
      .select('affiliate_id, rank')
      .gte('recorded_at', oneHourAgo)
      .order('recorded_at', { ascending: false })
      .limit(50); // Get enough to find all top 10

    if (previousError) {
      console.error('Error fetching previous rankings:', previousError);
    }

    // Build a map of previous rankings
    const previousRankMap = new Map<string, number>();
    if (previousRankings) {
      previousRankings.forEach(r => {
        if (!previousRankMap.has(r.affiliate_id)) {
          previousRankMap.set(r.affiliate_id, r.rank);
        }
      });
    }

    // Calculate rank changes
    const rankings = (todayRankings || []).map((ranking: any) => {
      const currentRank = ranking.rank;
      const previousRank = previousRankMap.get(ranking.affiliate_id);
      
      let rank_change = 0;
      let change_direction: 'up' | 'down' | 'none' = 'none';
      
      if (previousRank !== undefined) {
        // Rank change is previous - current (lower rank number is better)
        // If went from #5 to #3, that's +2 spots (up)
        rank_change = previousRank - currentRank;
        
        if (rank_change > 0) {
          change_direction = 'up';
        } else if (rank_change < 0) {
          change_direction = 'down';
        }
      }

      return {
        rank: currentRank,
        affiliate_code: ranking.affiliates.code,
        profit: parseFloat(ranking.profit_generated || 0),
        rank_change: Math.abs(rank_change),
        change_direction,
      };
    });

    // Calculate site-wide profit today (sum of all commissions today)
    const { data: commissionsData, error: commissionsError } = await supabase
      .from('affiliate_commissions')
      .select('profit_generated')
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`);

    let site_profit_today = 0;
    if (!commissionsError && commissionsData) {
      site_profit_today = commissionsData.reduce(
        (sum, c) => sum + parseFloat(c.profit_generated || 0),
        0
      );
    }

    // Calculate King Midas pot (8% of today's profit)
    const king_midas_pot = site_profit_today * 0.08;

    const response = {
      rankings,
      site_profit_today,
      king_midas_pot,
      last_updated: new Date().toISOString(),
    };

    console.log('King Midas Ticker API Response:', {
      rankingsCount: rankings.length,
      siteProfitToday: site_profit_today,
      kingMidasPot: king_midas_pot,
    });

    return res.status(200).json(response);
  } catch (error) {
    console.error('Ticker API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

