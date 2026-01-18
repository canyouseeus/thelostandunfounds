import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { PostgrestError } from '@supabase/supabase-js'
import { createServiceSupabaseClient } from './_supabase-admin-client.js'

const isMissingTable = (error?: PostgrestError | null) =>
  Boolean(error?.message && error.message.toLowerCase().includes('does not exist'))

const sanitizeSearch = (value: string) =>
  value
    .replace(/[%]/g, '')
    .replace(/[,\s]+/g, ' ')
    .trim()

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = createServiceSupabaseClient()
    const searchParam = Array.isArray(req.query.search) ? req.query.search[0] : req.query.search
    const statusParam = Array.isArray(req.query.status) ? req.query.status[0] : req.query.status

    let query = supabase
      .from('affiliates')
      .select('*')
      .order('created_at', { ascending: false })

    if (statusParam) {
      query = query.eq('status', statusParam)
    }

    if (searchParam) {
      const term = sanitizeSearch(searchParam)
      if (term.length > 0) {
        query = query.or(
          [
            `code.ilike.%${term}%`,
            `affiliate_code.ilike.%${term}%`,
            `id.eq.${term}`,
            `user_id.eq.${term}`
          ].join(',')
        )
      }
    }

    const result = await query

    if (result.error && !isMissingTable(result.error)) {
      throw result.error
    }

    const affiliates = (result.data ?? []).map(record => {
      const code = record.code || record.affiliate_code || ''
      return {
        id: record.id,
        code,
        affiliate_code: record.affiliate_code || record.code || code,
        user_id: record.user_id,
        status: record.status || 'inactive',
        commission_rate: toNumber(record.commission_rate ?? 0),
        total_earnings: toNumber(record.total_earnings ?? 0),
        total_clicks: toNumber(record.total_clicks ?? 0),
        total_conversions: toNumber(record.total_conversions ?? 0),
        reward_points: toNumber(record.reward_points ?? 0),
        total_mlm_earnings: toNumber(record.total_mlm_earnings ?? 0),
        created_at: record.created_at,
        updated_at: record.updated_at
      }
    })

    return res.status(200).json({
      affiliates,
      count: affiliates.length
    })
  } catch (error: any) {
    console.error('Admin affiliates handler error:', error)
    return res
      .status(500)
      .json({ error: error?.message || 'Failed to load affiliates for admin view' })
  }
}
