import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const campaignId = req.query.campaignId as string
  const status = req.query.status as string | undefined

  if (!campaignId) {
    return res.status(400).json({ error: 'campaignId is required' })
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Database service not configured' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    let query = supabase
      .from('newsletter_send_logs')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: true })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: logs, error } = await query

    if (error) {
      throw error
    }

    // Get summary counts
    const sent = logs?.filter(l => l.status === 'sent').length || 0
    const failed = logs?.filter(l => l.status === 'failed').length || 0
    const pending = logs?.filter(l => l.status === 'pending').length || 0

    return res.status(200).json({
      success: true,
      logs: logs || [],
      summary: {
        total: logs?.length || 0,
        sent,
        failed,
        pending
      }
    })

  } catch (error: any) {
    console.error('Newsletter logs error:', error)
    return res.status(500).json({
      error: error.message || 'An error occurred while fetching logs',
    })
  }
}
