import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

/**
 * First-party analytics handlers, extracted from api/admin/[...path].ts.
 *
 * They lived behind the catch-all, and in production Vercel routes only
 * single-segment paths into it — every multi-segment call
 * (/api/admin/analytics/record and friends) 404'd, which is why the
 * user_analytics table held one row while the site dutifully posted a page
 * view on every route change. These now back real files under
 * api/admin/analytics/, which route reliably.
 */
export async function handleAnalyticsRecord(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

    // Diagnostic logging for debugging 403 errors
    console.log('[Analytics Record] Using Supabase key:', {
      hasUrl: !!SUPABASE_URL,
      hasSvcKey: !!SUPABASE_SERVICE_ROLE_KEY,
      svcKeyLength: SUPABASE_SERVICE_ROLE_KEY?.length
    });

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    const { user_id, event_type, resource_id, metadata, duration } = req.body || {}

    if (!event_type) {
      return res.status(400).json({ error: 'event_type is required' })
    }

    // Enrich with server-observed context (Vercel geo headers, user agent) so
    // the site-stats aggregation can surface device/geo/traffic-source breakdowns.
    const enrichedMetadata = {
      ...(metadata || {}),
      country: (req.headers['x-vercel-ip-country'] as string) || metadata?.country || null,
      city: (req.headers['x-vercel-ip-city'] as string) || metadata?.city || null,
      user_agent: (req.headers['user-agent'] as string) || null,
      referrer: metadata?.referrer || (req.headers['referer'] as string) || null,
    }

    const { data, error } = await supabase
      .from('user_analytics')
      .insert({
        user_id: user_id || null,
        event_type,
        resource_id: resource_id || null,
        metadata: enrichedMetadata,
        duration: duration || null
      })
      .select()
      .single()

    if (error) {
      // If table doesn't exist, just log and return success (non-blocking analytics)
      if (error.code === '42P01') {
        console.warn('[Analytics] user_analytics table does not exist. Skipping.')
        return res.status(200).json({ success: true, skipped: true })
      }
      throw error
    }

    return res.status(200).json({ success: true, data })
  } catch (error: any) {
    console.error('[Analytics Record] Error:', error)
    // Analytics should not block user experience - return 200 even on error
    return res.status(200).json({ success: false, error: error.message })
  }
}

/**
 * Analytics Stats Handler - Retrieves analytics data
 */
export async function handleAnalyticsStats(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

    // Diagnostic logging
    console.log('[Analytics Stats] Using Supabase key:', {
      hasUrl: !!SUPABASE_URL,
      hasSvcKey: !!SUPABASE_SERVICE_ROLE_KEY
    });

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    const { data: analytics, error } = await supabase
      .from('user_analytics')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      // If table doesn't exist, return empty array
      if (error.code === '42P01') {
        return res.status(200).json({ success: true, analytics: [] })
      }
      throw error
    }

    return res.status(200).json({ success: true, analytics })
  } catch (error: any) {
    console.error('[Analytics Stats] Error:', error)
    return res.status(500).json({ error: error.message })
  }
}

/**
 * Analytics Site Stats Handler - Aggregates raw analytics events into
 * traffic sources, top pages, device breakdown, geography, and daily trends.
 */
export async function handleAnalyticsSiteStats(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    const since = new Date()
    since.setDate(since.getDate() - 30)

    const { data: rows, error } = await supabase
      .from('user_analytics')
      .select('*')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })
      .limit(5000)

    if (error) {
      if (error.code === '42P01') {
        return res.status(200).json({ success: true, empty: true })
      }
      throw error
    }

    const events = rows || []
    const pageViews = events.filter(e => e.event_type === 'page_view')

    // Unique visitors + bounce rate (single-pageview visitors / all visitors)
    const viewsByVisitor = new Map<string, number>()
    for (const row of pageViews) {
      const visitorId = row.metadata?.visitor_id
      if (!visitorId) continue
      viewsByVisitor.set(visitorId, (viewsByVisitor.get(visitorId) || 0) + 1)
    }
    const uniqueVisitors = viewsByVisitor.size
    const singlePageVisitors = [...viewsByVisitor.values()].filter(count => count === 1).length
    const bounceRate = uniqueVisitors > 0 ? (singlePageVisitors / uniqueVisitors) * 100 : 0

    // Top pages
    const pageCounts = new Map<string, number>()
    for (const row of pageViews) {
      const page = row.resource_id || row.metadata?.title || 'Unknown'
      pageCounts.set(page, (pageCounts.get(page) || 0) + 1)
    }
    const topPages = [...pageCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([page, count]) => ({ page, count }))

    // Device breakdown from user agent
    const deviceCounts = new Map<string, number>()
    for (const row of pageViews) {
      const ua: string = row.metadata?.user_agent || ''
      let device = 'Desktop'
      if (/tablet|ipad/i.test(ua)) device = 'Tablet'
      else if (/mobile|android|iphone/i.test(ua)) device = 'Mobile'
      deviceCounts.set(device, (deviceCounts.get(device) || 0) + 1)
    }
    const deviceBreakdown = [...deviceCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([device, count]) => ({ device, count }))

    // Traffic sources from referrer
    const sourceCounts = new Map<string, number>()
    for (const row of pageViews) {
      const referrer: string = row.metadata?.referrer || ''
      let source = 'Direct'
      if (referrer) {
        if (/google|bing|duckduckgo|yahoo/i.test(referrer)) source = 'Search'
        else if (/facebook|instagram|twitter|x\.com|reddit|linkedin|tiktok/i.test(referrer)) source = 'Social'
        else if (!referrer.includes('thelostandunfounds')) source = 'Referral'
      }
      sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1)
    }
    const trafficSources = [...sourceCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([source, count]) => ({ source, count }))

    // Geography
    const geoCounts = new Map<string, number>()
    for (const row of pageViews) {
      const country = row.metadata?.country || 'Unknown'
      geoCounts.set(country, (geoCounts.get(country) || 0) + 1)
    }
    const geography = [...geoCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([country, count]) => ({ country, count }))

    // Daily trend, last 14 days
    const trendMap = new Map<string, number>()
    const days: string[] = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      days.push(key)
      trendMap.set(key, 0)
    }
    for (const row of pageViews) {
      const key = (row.created_at || '').slice(0, 10)
      if (trendMap.has(key)) trendMap.set(key, (trendMap.get(key) || 0) + 1)
    }
    const trend = days.map(date => ({ date, count: trendMap.get(date) || 0 }))

    return res.status(200).json({
      success: true,
      totalViews: pageViews.length,
      uniqueVisitors,
      bounceRate,
      topPages,
      deviceBreakdown,
      trafficSources,
      geography,
      trend,
    })
  } catch (error: any) {
    console.error('[Analytics Site Stats] Error:', error)
    return res.status(500).json({ error: error.message })
  }
}

/**
 * Sync Library Handler
 */