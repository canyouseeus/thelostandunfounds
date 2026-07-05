// Forcing redeploy for diagnostic tools
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Email')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Extract route from path parameter (Vercel catch-all)
  // For /api/admin/affiliates, req.query.path should be ['affiliates']
  let route = ''

  // First, try to get route from query.path (Vercel catch-all parameter)
  if (req.query.path) {
    if (Array.isArray(req.query.path)) {
      // For /api/admin/affiliates, path will be ['affiliates']
      route = req.query.path[0] || ''
    } else {
      route = req.query.path
    }
  }

  // Fallback: extract from URL if path not found in query
  if (!route && req.url) {
    const urlPath = req.url.split('?')[0]
    const pathParts = urlPath.split('/').filter(p => p)
    // Find 'admin' index and get everything after it
    const adminIndex = pathParts.indexOf('admin')
    if (adminIndex >= 0 && adminIndex < pathParts.length - 1) {
      route = pathParts[adminIndex + 1] || ''
    } else {
      // Last resort: use last path segment
      route = pathParts[pathParts.length - 1] || ''
    }
  }

  // Debug logging
  console.log('[Admin Router]', {
    query: req.query,
    queryPath: req.query.path,
    route,
    url: req.url,
    method: req.method,
    body: req.body, // Debug body parsing
    pathParts: req.url ? req.url.split('?')[0].split('/').filter(p => p) : []
  })

  // If still no route found, return error early
  if (!route) {
    console.error('[Admin Router] Route extraction failed', {
      query: req.query,
      url: req.url,
      path: req.query.path
    })
    return res.status(404).json({
      error: 'Admin route not found',
      debug: {
        query: req.query,
        url: req.url,
        path: req.query.path,
        extractedRoute: route
      }
    })
  }

  // Build full route path for nested routes (e.g., analytics/record)
  let fullRoute = ''
  if (req.query.path) {
    if (Array.isArray(req.query.path)) {
      fullRoute = req.query.path.join('/')
    } else {
      fullRoute = req.query.path
    }
  } else if (req.url) {
    const urlPath = req.url.split('?')[0]
    const pathParts = urlPath.split('/').filter(p => p)
    const adminIndex = pathParts.indexOf('admin')
    if (adminIndex >= 0) {
      fullRoute = pathParts.slice(adminIndex + 1).join('/')
    }
  }

  console.log('[Admin Router] Full route:', fullRoute)

  // Route to appropriate handler
  try {
    switch (fullRoute) {
      // Analytics routes (nested paths)
      case 'analytics/record':
        return await handleAnalyticsRecord(req, res)
      case 'analytics/stats':
        return await handleAnalyticsStats(req, res)
      case 'analytics/site-stats':
        return await handleAnalyticsSiteStats(req, res)

      // Sync Library
      case 'sync-library':
        return await handleSyncLibrary(req, res)

      // Standard routes
      case 'product-costs':
        return await handleProductCosts(req, res)
      case 'reset-password':
        return await handleResetPassword(req, res)
      case 'send-existing-publication-emails':
        return await handleSendExistingPublicationEmails(req, res)
      case 'send-welcome-emails':
        return await handleSendWelcomeEmails(req, res)
      case 'send-silva-star-proposal':
        return await handleSendSilvaStarProposal(req, res)
      case 'secret-santa':
        return await handleSecretSanta(req, res)
      case 'affiliates':
        return await handleAffiliates(req, res)
      case 'new-subscription-notification':
        return await handleNewSubscriptionNotification(req, res)
      case 'new-blog-contributor-notification':
        return await handleNewBlogContributorNotification(req, res)
      case 'send-affiliate-email':
        return await handleSendAffiliateEmail(req, res)
      case 'affiliate-dashboard':
        return await handleAffiliateDashboard(req, res)
      case 'update-affiliate':
        return await handleUpdateAffiliate(req, res)
      case 'manual-commission':
        return await handleManualCommission(req, res)
      case 'env-vars':
        return await handleEnvVars(req, res)
      case 'post-to-nostr':
        return await handlePostToNostr(req, res)
      default:
        console.error('Admin route not found:', fullRoute, 'query:', req.query, 'url:', req.url)
        return res.status(404).json({ error: `Admin route not found: ${fullRoute}` })
    }
  } catch (error: any) {
    console.error('Admin router error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}

/**
 * Product Cost Management Handler
 */
async function handleProductCosts(req: VercelRequest, res: VercelResponse) {
  const handler = await import('../../lib/api-handlers/_product-costs-handler.js')
  return handler.default(req, res)
}

/**
 * Reset Password Handler
 */
async function handleResetPassword(req: VercelRequest, res: VercelResponse) {
  const handler = await import('../../lib/api-handlers/_reset-password-handler.js')
  return handler.default(req, res)
}

/**
 * Send Existing Publication Emails Handler
 */
async function handleSendExistingPublicationEmails(req: VercelRequest, res: VercelResponse) {
  const handler = await import('../../lib/api-handlers/_send-existing-publication-emails-handler.js')
  return await handler.default(req, res)
}

/**
 * Send Welcome Emails Handler
 */
async function handleSendWelcomeEmails(req: VercelRequest, res: VercelResponse) {
  const handler = await import(`../../lib/api-handlers/_send-welcome-emails-handler.js?v=${Date.now()}`)
  return await handler.default(req, res)
}

/**
 * Send Silva Star Proposal Email Handler
 */
async function handleSendSilvaStarProposal(req: VercelRequest, res: VercelResponse) {
  const handler = await import('../../lib/api-handlers/admin/send-silva-star-proposal.js')
  return handler.default(req, res)
}

/**
 * Secret Santa Handler
 */
async function handleSecretSanta(req: VercelRequest, res: VercelResponse) {
  const handler = await import('../../lib/api-handlers/_admin-secret-santa-handler.js')
  return handler.default(req, res)
}

/**
 * Affiliates Handler
 */
async function handleAffiliates(req: VercelRequest, res: VercelResponse) {
  try {
    const handler = await import('../../lib/api-handlers/_admin-affiliates-handler.js')
    return handler.default(req, res)
  } catch (err) {
    console.warn('Affiliate handler failed (likely missing env vars), returning mock:', err)
    return res.status(200).json({ affiliates: [] })
  }
}

/**
 * Affiliate Dashboard Handler
 */
async function handleAffiliateDashboard(req: VercelRequest, res: VercelResponse) {
  const handler = await import('../../lib/api-handlers/admin/affiliate-dashboard.js')
  return handler.default(req, res)
}

/**
 * Update Affiliate Handler
 */
async function handleUpdateAffiliate(req: VercelRequest, res: VercelResponse) {
  const handler = await import('../../lib/api-handlers/admin/update-affiliate.js')
  return handler.default(req, res)
}

/**
 * Manual Commission Handler
 */
async function handleManualCommission(req: VercelRequest, res: VercelResponse) {
  const handler = await import('../../lib/api-handlers/admin/manual-commission.js')
  return handler.default(req, res)
}

/**
 * New Subscription Notification Handler
 */
async function handleNewSubscriptionNotification(req: VercelRequest, res: VercelResponse) {
  const handler = await import('../../lib/api-handlers/_new-subscription-notification-handler.js')
  return await handler.default(req, res)
}

/**
 * New Blog Contributor Notification Handler
 */
async function handleNewBlogContributorNotification(req: VercelRequest, res: VercelResponse) {
  const handler = await import('../../lib/api-handlers/_new-blog-contributor-notification-handler.js')
  return await handler.default(req, res)
}

/**
 * Send Affiliate Email Handler
 */
async function handleSendAffiliateEmail(req: VercelRequest, res: VercelResponse) {
  const handler = await import('../../lib/api-handlers/admin/send-affiliate-email.js')
  return handler.default(req, res)
}

/**
 * Environment Variables Handler
 */
async function handleEnvVars(req: VercelRequest, res: VercelResponse) {
  const handler = await import('../../lib/api-handlers/admin/env-vars.js')
  return handler.default(req, res)
}

/**
 * Post to Nostr Handler
 */
async function handlePostToNostr(req: VercelRequest, res: VercelResponse) {
  const handler = await import('../../lib/api-handlers/admin/post-to-nostr.js')
  return handler.default(req, res)
}

/**
 * Analytics Record Handler - Records page views and events
 */
async function handleAnalyticsRecord(req: VercelRequest, res: VercelResponse) {
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
async function handleAnalyticsStats(req: VercelRequest, res: VercelResponse) {
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
async function handleAnalyticsSiteStats(req: VercelRequest, res: VercelResponse) {
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
async function handleSyncLibrary(req: VercelRequest, res: VercelResponse) {
  const handler = await import('../../lib/api-handlers/_sync-library-handler.js')
  return handler.default(req, res)
}
