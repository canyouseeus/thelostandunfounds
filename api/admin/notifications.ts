import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

/**
 * The notifications feed for the dashboard widget.
 *
 * GET  /api/admin/notifications           — recent notifications, newest first.
 *      Deployment notifications carry their deployment's context (commit,
 *      sha, url, error log excerpt) matched from the deployments table, so
 *      "Deployment Failed" drills to what broke and which commit did it.
 * POST /api/admin/notifications           — { id } marks one read; { all: true }
 *      marks everything read.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return res.status(500).json({ error: 'Missing Supabase credentials' })
    const supabase = createClient(url, key)

    try {
        if (req.method === 'POST') {
            if (req.body?.all === true) {
                const { error } = await supabase.from('admin_notifications').update({ read: true }).eq('read', false)
                if (error) throw error
                return res.status(200).json({ success: true })
            }
            const id = String(req.body?.id || '')
            if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'id (uuid) or all:true required' })
            const { error } = await supabase.from('admin_notifications').update({ read: true }).eq('id', id)
            if (error) throw error
            return res.status(200).json({ success: true })
        }

        if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

        const [notifs, deploys] = await Promise.all([
            supabase
                .from('admin_notifications')
                .select('id, type, title, message, severity, read, created_at')
                .order('created_at', { ascending: false })
                .limit(30),
            supabase
                .from('deployments')
                .select('vercel_deployment_id, status, commit_sha, commit_message, url, error_logs, created_at')
                .order('created_at', { ascending: false })
                .limit(60),
        ])
        if (notifs.error) throw notifs.error

        const deployments = deploys.data ?? []
        const rows = (notifs.data ?? []).map(n => {
            let deployment = null
            if (n.type === 'deployment') {
                // The webhook writes the deployment row and the notification in
                // the same handler call — nearest-in-time within two minutes is
                // the same event.
                const t = new Date(n.created_at).getTime()
                const near = deployments
                    .map(d => ({ d, dt: Math.abs(new Date(d.created_at).getTime() - t) }))
                    .filter(x => x.dt < 120_000)
                    .sort((a, b) => a.dt - b.dt)[0]
                if (near) {
                    deployment = {
                        id: near.d.vercel_deployment_id,
                        status: near.d.status,
                        sha: near.d.commit_sha,
                        commit: near.d.commit_message,
                        url: near.d.url,
                        // An excerpt is enough to see what broke; full logs stay
                        // in Vercel.
                        errorExcerpt: near.d.error_logs ? near.d.error_logs.slice(0, 1500) : null,
                    }
                }
            }
            return { ...n, deployment }
        })

        return res.status(200).json({ notifications: rows })
    } catch (err: any) {
        console.error('[Notifications] error:', err)
        return res.status(500).json({ error: err?.message || 'Notifications failed' })
    }
}
