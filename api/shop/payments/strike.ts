import type { VercelRequest, VercelResponse } from '@vercel/node'
import handler from '../../../lib/api-handlers/_payments-strike-handler.js'

export default async function (req: VercelRequest, res: VercelResponse) {
    return await handler(req, res)
}
