import type { VercelRequest, VercelResponse } from '@vercel/node';
import { retrogradeRename } from '../../lib/api-handlers/_retrograde-rename';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const body = (req.body && typeof req.body === 'object') ? req.body : {};
        const librarySlug: string | undefined = body.librarySlug || body.slug;
        const dryRun: boolean = Boolean(body.dryRun);
        const timeBudgetSeconds: number = Number(body.timeBudgetSeconds) || 50;

        const result = await retrogradeRename({
            librarySlug,
            dryRun,
            timeBudgetSeconds,
        });

        return res.status(200).json({
            success: true,
            ...result,
            done: result.remaining === 0,
        });
    } catch (err: any) {
        console.error('[retrograde-rename] failed:', err);
        return res.status(500).json({
            error: err?.message || 'Retrograde rename failed',
        });
    }
}
