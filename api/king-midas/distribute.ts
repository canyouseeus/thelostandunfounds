import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

/**
 * KING MIDAS Daily Distribution System
 * 
 * Calculates daily rankings and distributes pool (8% of daily profit)
 * Should be run daily via cron job
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Require admin authentication or cron secret
  const cronSecret = req.headers['x-cron-secret'] || req.query.secret
  const expectedSecret = process.env.CRON_SECRET

  if (expectedSecret && cronSecret !== expectedSecret) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const targetDate = req.query.date as string || new Date().toISOString().split('T')[0]

    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials')
      return res.status(500).json({ error: 'Database service not configured' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get all daily stats for the target date
    const { data: dailyStats, error: statsError } = await supabase
      .from('king_midas_daily_stats')
      .select('*')
      .eq('date', targetDate)
      .order('profit_generated', { ascending: false })

    if (statsError) {
      console.error('Error fetching daily stats:', statsError)
      return res.status(500).json({ error: 'Failed to fetch daily stats' })
    }

    if (!dailyStats || dailyStats.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No stats found for date',
        date: targetDate,
        distributed: 0,
      })
    }

    // Calculate total pool (8% of total profit)
    const totalProfit = dailyStats.reduce((sum, stat) => sum + parseFloat(stat.profit_generated.toString()), 0)
    const totalPool = totalProfit * 0.08

    // Calculate pool distribution based on rankings
    // Top 3 get: 50%, 30%, 20% of pool
    // Others get: Equal share of remaining 0%
    const rankings = calculateRankings(dailyStats)
    const distributions = calculateDistributions(rankings, totalPool)

    // Update daily stats with rankings and pool shares
    for (const stat of dailyStats) {
      const ranking = rankings.find(r => r.affiliateId === stat.affiliate_id)
      const distribution = distributions.find(d => d.affiliateId === stat.affiliate_id)

      await supabase
        .from('king_midas_daily_stats')
        .update({
          rank: ranking?.rank || null,
          pool_share: distribution?.amount || 0,
        })
        .eq('id', stat.id)
    }

    // Create payout records
    for (const distribution of distributions) {
      if (distribution.amount > 0) {
        const ranking = rankings.find(r => r.affiliateId === distribution.affiliateId)
        
        await supabase
          .from('king_midas_payouts')
          .insert({
            affiliate_id: distribution.affiliateId,
            date: targetDate,
            rank: ranking?.rank || null,
            pool_amount: distribution.amount,
            status: 'pending',
          })
      }
    }

    return res.status(200).json({
      success: true,
      date: targetDate,
      totalProfit,
      totalPool,
      distributed: distributions.reduce((sum, d) => sum + d.amount, 0),
      rankings: rankings.length,
      distributions: distributions.filter(d => d.amount > 0).length,
    })
  } catch (error) {
    console.error('Error distributing KING MIDAS pool:', error)
    return res.status(500).json({ error: 'Distribution failed' })
  }
}

/**
 * Calculate rankings based on profit generated
 */
function calculateRankings(stats: any[]): Array<{ affiliateId: string; rank: number }> {
  const sorted = [...stats].sort((a, b) => 
    parseFloat(b.profit_generated.toString()) - parseFloat(a.profit_generated.toString())
  )

  return sorted.map((stat, index) => ({
    affiliateId: stat.affiliate_id,
    rank: index + 1,
  }))
}

/**
 * Calculate pool distributions
 * Top 3: 50%, 30%, 20%
 * Others: 0% (no distribution)
 */
function calculateDistributions(
  rankings: Array<{ affiliateId: string; rank: number }>,
  totalPool: number
): Array<{ affiliateId: string; amount: number }> {
  const distributions: Array<{ affiliateId: string; amount: number }> = []

  for (const ranking of rankings) {
    let amount = 0

    if (ranking.rank === 1) {
      amount = totalPool * 0.5 // 50%
    } else if (ranking.rank === 2) {
      amount = totalPool * 0.3 // 30%
    } else if (ranking.rank === 3) {
      amount = totalPool * 0.2 // 20%
    }

    distributions.push({
      affiliateId: ranking.affiliateId,
      amount: Math.round(amount * 100) / 100, // Round to 2 decimals
    })
  }

  return distributions
}

