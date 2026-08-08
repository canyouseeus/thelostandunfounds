/**
 * SAGE MODE change requests → GitHub issues.
 *
 * The overlay sends the element you clicked (with its `data-tlu-src` file:line
 * stamp) plus what you said about it. This turns that into a GitHub issue, which
 * is both the durable record and the handoff point for a coding agent.
 *
 * Auth is a verified Supabase JWT, not the `x-admin-email` header the older admin
 * endpoints use — that header is caller-supplied and this route can write to the
 * repository.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAILS = ['thelostandunfounds@gmail.com', 'admin@thelostandunfounds.com']

const GITHUB_REPO = process.env.SAGE_GITHUB_REPO || 'canyouseeus/thelostandunfounds'

interface SageRequestBody {
    comment?: string
    source?: string | null
    element?: { tag?: string; id?: string; className?: string; text?: string }
    pageUrl?: string
    viewport?: { width?: number; height?: number }
}

/** Resolve the caller from their Supabase access token. Returns null if not an admin. */
async function resolveAdminEmail(req: VercelRequest): Promise<string | null> {
    const authHeader = req.headers.authorization || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) return null

    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return null

    const supabase = createClient(url, key)
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data.user?.email) return null

    const email = data.user.email.toLowerCase().trim()
    return ADMIN_EMAILS.includes(email) ? email : null
}

function buildIssue(body: SageRequestBody, author: string) {
    const { comment, source, element, pageUrl, viewport } = body
    const el = element || {}

    const where = source || `<${el.tag || 'unknown'}>`
    const title = `SAGE: ${(comment || '').split('\n')[0].slice(0, 72)}`

    const lines = [
        (comment || '').trim(),
        '',
        '---',
        '',
        '### Where',
        '',
        source
            ? `**Source:** \`${source}\``
            : '**Source:** _not stamped — the element had no `data-tlu-src` ancestor._',
        pageUrl ? `**Page:** ${pageUrl}` : null,
        '',
        '### Element',
        '',
        '```',
        `tag:   ${el.tag || '—'}`,
        `id:    ${el.id || '—'}`,
        `class: ${el.className || '—'}`,
        `text:  ${el.text || '—'}`,
        '```',
        '',
        viewport?.width ? `Viewport: ${viewport.width}×${viewport.height}` : null,
        `Requested by ${author} via SAGE MODE.`,
    ].filter((l) => l !== null)

    return { title, body: lines.join('\n'), where }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Email')
    if (req.method === 'OPTIONS') return res.status(200).end()
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    const author = await resolveAdminEmail(req)
    if (!author) return res.status(403).json({ error: 'Admin access required' })

    const body = (req.body || {}) as SageRequestBody
    if (!body.comment?.trim()) {
        return res.status(400).json({ error: 'comment is required' })
    }

    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
    if (!token) {
        return res.status(500).json({
            error: 'GITHUB_TOKEN is not configured — add it in the Vercel dashboard so SAGE MODE can open issues.',
        })
    }

    const issue = buildIssue(body, author)

    try {
        const gh = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                'Content-Type': 'application/json',
                'User-Agent': 'thelostandunfounds-sage-mode',
            },
            body: JSON.stringify({
                title: issue.title,
                body: issue.body,
                labels: ['sage-mode'],
            }),
        })

        const payload = await gh.json().catch(() => ({}))
        if (!gh.ok) {
            return res.status(502).json({
                error: `GitHub rejected the request (${gh.status}): ${payload.message || 'unknown error'}`,
            })
        }

        return res.status(201).json({
            ok: true,
            url: payload.html_url,
            number: payload.number,
            source: issue.where,
        })
    } catch (err: any) {
        return res.status(500).json({ error: err?.message || 'Failed to reach GitHub' })
    }
}
