import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { PostgrestError } from '@supabase/supabase-js'
import { createServiceSupabaseClient } from './_supabase-admin-client'

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const isMissingTable = (error?: PostgrestError | null) =>
  Boolean(error?.message && error.message.toLowerCase().includes('does not exist'))

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = createServiceSupabaseClient()
    const yearQuery = Array.isArray(req.query.year) ? req.query.year[0] : req.query.year
    const yearParam = yearQuery ? parseInt(yearQuery, 10) : Number.NaN
    const selectedYear = Number.isFinite(yearParam) ? yearParam : new Date().getFullYear()

    const potResult = await supabase
      .from('secret_santa_pot')
      .select('id, year, total_amount, distributed, distribution_date, created_at')
      .eq('year', selectedYear)
      .maybeSingle()

    if (potResult.error && !isMissingTable(potResult.error)) {
      throw potResult.error
    }

    const pot = potResult.data ?? null

    const allPotsResult = await supabase
      .from('secret_santa_pot')
      .select('id, year, total_amount, distributed, distribution_date')
      .order('year', { ascending: false })

    const allPots =
      !allPotsResult.error || isMissingTable(allPotsResult.error) ? allPotsResult.data ?? [] : []

    let contributions: {
      total: number
      total_amount: number
      items: Array<{ id: string; amount: string; reason: string | null; created_at: string }>
      by_reason: Record<string, number>
    } = {
      total: 0,
      total_amount: 0,
      items: [],
      by_reason: {}
    }

    if (pot?.id) {
      const contributionsResult = await supabase
        .from('secret_santa_contributions')
        .select('id, amount, reason, created_at')
        .eq('pot_id', pot.id)
        .order('created_at', { ascending: false })

      if (contributionsResult.error && !isMissingTable(contributionsResult.error)) {
        throw contributionsResult.error
      }

      const contributionRows = contributionsResult.data ?? []
      const byReason: Record<string, number> = {}
      let totalAmount = 0

      contributionRows.forEach(item => {
        const amount = toNumber(item.amount)
        totalAmount += amount
        const reasonKey = (item.reason || 'other').toLowerCase()
        byReason[reasonKey] = (byReason[reasonKey] || 0) + amount
      })

      contributions = {
        total: contributionRows.length,
        total_amount: totalAmount,
        items: contributionRows,
        by_reason: byReason
      }
    }

    const distributionsResult = await supabase
      .from('affiliate_commissions')
      .select('id, affiliate_id, amount, status, created_at, affiliates(affiliate_code)')
      .eq('type', 'secret_santa')
      .eq('order_id', `SECRET-SANTA-${selectedYear}`)
      .order('created_at', { ascending: false })

    if (distributionsResult.error && !isMissingTable(distributionsResult.error)) {
      throw distributionsResult.error
    }

    const distributionItems = distributionsResult.data ?? []

    const activeAffiliatesResult = await supabase
      .from('affiliates')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    if (activeAffiliatesResult.error && !isMissingTable(activeAffiliatesResult.error)) {
      throw activeAffiliatesResult.error
    }

    const activeAffiliates = activeAffiliatesResult.count || 0

    const sharePerAffiliate =
      distributionItems.length > 0
        ? toNumber(distributionItems[0].amount)
        : pot && activeAffiliates > 0
        ? toNumber(pot.total_amount) / activeAffiliates
        : null

    return res.status(200).json({
      current_year: selectedYear,
      pot,
      all_pots: allPots,
      contributions,
      distribution: {
        distributed: Boolean(pot?.distributed),
        distribution_date: pot?.distribution_date ?? null,
        total_affiliates:
          distributionItems.length > 0 ? distributionItems.length : activeAffiliates,
        share_per_affiliate: sharePerAffiliate,
        items: distributionItems
      }
    })
  } catch (error: any) {
    console.error('Admin Secret Santa handler error:', error)
    return res
      .status(500)
      .json({ error: error?.message || 'Failed to load Secret Santa admin data' })
  }
}
