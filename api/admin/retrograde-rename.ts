import type { VercelRequest, VercelResponse } from '@vercel/node';
import { retrogradeRename } from '../../lib/api-handlers/_retrograde-rename.js';
import { requireAdminUser } from '../../lib/api-handlers/_gallery-admin-ops.js';

/**
 * Renames every photo in Drive to the current claptrop convention.
 *
 * This shipped with no authentication. An unauthenticated POST with no body at
 * all renamed the entire archive, because both defaults pointed the unsafe way:
 * an absent librarySlug meant every library, and an absent dryRun meant a real
 * rename. robots.txt disallowing /api/ stops crawlers, not people, and the path
 * is in a public repo.
 *
 * Two things fix that, and both matter:
 *   1. Admin bearer token, same gate the other Drive-writing endpoints use.
 *   2. dryRun defaults to TRUE. Renaming is now something a caller has to ask
 *      for by name, so a malformed or truncated body reports what it would do
 *      instead of doing it.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const admin = await requireAdminUser(req);
    if (!admin) {
        return res.status(401).json({ error: 'Not authorized' });
    }

    try {
        const body = (req.body && typeof req.body === 'object') ? req.body : {};
        const librarySlug: string | undefined = body.librarySlug || body.slug;
        // Explicit opt-in. `dryRun: false` is the only way to rename anything;
        // every other value, including omitting it, is a dry run.
        const dryRun: boolean = body.dryRun !== false;
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
