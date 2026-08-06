import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleAnalyticsStats } from '../../../lib/api-handlers/_analytics-handler.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
    return handleAnalyticsStats(req, res)
}
