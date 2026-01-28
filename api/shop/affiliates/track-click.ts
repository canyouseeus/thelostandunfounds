import type { VercelRequest, VercelResponse } from '@vercel/node';
import affiliatesTrackClickHandler from '../../../lib/api-handlers/_affiliates-track-click-handler.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS headers (duplicated from catch-all router to ensure safety)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Cron-Secret, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    return await affiliatesTrackClickHandler(req, res);
}
