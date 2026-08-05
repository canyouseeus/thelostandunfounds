import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleAnalyticsRecord } from '../../../lib/api-handlers/_analytics-handler.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
    return handleAnalyticsRecord(req, res)
}
