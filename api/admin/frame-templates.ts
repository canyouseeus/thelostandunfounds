import type { VercelRequest, VercelResponse } from '@vercel/node'
import adminFrameTemplatesHandler from '../../lib/api-handlers/_admin-frame-templates-handler.js'

/**
 * CRUD for frame mockup templates. See _admin-frame-templates-handler.ts.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    return adminFrameTemplatesHandler(req, res)
}
