import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Get profit statistics for admin dashboard
 * GET /api/admin/profit-stats?days=30
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const days = parseInt(req.query.days as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    // Initialize Supabase
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Database service not configured' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get daily profit from affiliate_commissions
    const { data: commissions, error: commissionsError } = await supabase
      .from('affiliate_commissions')
      .select('profit_generated, created_at')
      .gte('created_at', `${startDateStr}T00:00:00`)
      .order('created_at', { ascending: true });

    if (commissionsError) {
      console.error('Error fetching commissions:', commissionsError);
      return res.status(500).json({ error: 'Failed to fetch profit data' });
    }

    // Group by date and calculate daily totals
    const dailyProfits: Record<string, number> = {};
    
    if (commissions && commissions.length > 0) {
      commissions.forEach((commission: any) => {
        const date = new Date(commission.created_at).toISOString().split('T')[0];
        const profit = parseFloat(commission.profit_generated?.toString() || '0');
        dailyProfits[date] = (dailyProfits[date] || 0) + profit;
      });
    }

    // Generate array of all dates in range
    const dateArray: Array<{ date: string; profit: number }> = [];
    const currentDate = new Date(startDate);
    const today = new Date();
    
    while (currentDate <= today) {
      const dateStr = currentDate.toISOString().split('T')[0];
      dateArray.push({
        date: dateStr,
        profit: dailyProfits[dateStr] || 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Calculate totals
    const totalProfit = Object.values(dailyProfits).reduce((sum, profit) => sum + profit, 0);
    const averageDailyProfit = dateArray.length > 0 ? totalProfit / dateArray.length : 0;
    const maxDailyProfit = Math.max(...dateArray.map(d => d.profit), 0);
    const todayProfit = dailyProfits[today.toISOString().split('T')[0]] || 0;

    return res.status(200).json({
      dailyData: dateArray,
      summary: {
        totalProfit,
        averageDailyProfit,
        maxDailyProfit,
        todayProfit,
        days: dateArray.length,
      },
    });

  } catch (error: any) {
    console.error('Error fetching profit stats:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error?.message || 'Unknown error',
    });
  }
}










