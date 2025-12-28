import type { NextApiRequest, NextApiResponse } from 'next';
import { getFolders } from '../../../lib/api-handlers/_zoho-mail-handler';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    try {
        const folders = await getFolders();
        res.status(200).json(folders);
    } catch (error) {
        console.error('Failed to load folders', error);
        res.status(500).json({ error: 'API error: 500' });
    }
}