import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

/**
 * Vercel Deployment Webhook Handler
 *
 * Receives POST webhooks from Vercel when a deployment finishes, replacing
 * the old polling-based deploy-and-verify workflows. Register this URL in
 * Vercel Dashboard -> Project Settings -> Webhooks:
 *   https://thelostandunfounds.com/api/deploy-webhook
 * Events: deployment.succeeded, deployment.failed, deployment.error
 *
 * IMPORTANT: signature verification requires the RAW request body. The
 * route shim in api/deploy-webhook.ts disables Vercel's bodyParser so we
 * can re-read the raw bytes here.
 */
export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const rawBody = await readRawBody(req)

    const webhookSecret = process.env.VERCEL_WEBHOOK_SECRET
    if (webhookSecret) {
        const signature = req.headers['x-vercel-signature'] as string | undefined
        if (!signature || !verifySignature(rawBody, signature, webhookSecret)) {
            console.warn('⚠️ Vercel webhook signature verification failed')
            return res.status(401).json({ error: 'Invalid signature' })
        }
    } else {
        console.warn('⚠️ VERCEL_WEBHOOK_SECRET not set — skipping signature verification')
    }

    let event: any
    try {
        event = JSON.parse(rawBody.toString('utf8'))
    } catch (err) {
        return res.status(400).json({ error: 'Invalid JSON payload' })
    }

    const type: string = event?.type || ''
    const deployment = event?.payload?.deployment
    console.log('🔔 Vercel webhook received:', { type, deploymentId: deployment?.id })

    if (!deployment?.id) {
        // Not a deployment-shaped event (e.g. a Vercel test ping) — accept and ignore.
        return res.status(200).json({ received: true })
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Missing Supabase credentials in deploy webhook')
        return res.status(500).json({ error: 'Supabase not configured' })
    }
    const supabase = createClient(supabaseUrl, supabaseKey)

    const commitSha: string | null = deployment?.meta?.githubCommitSha || null
    const commitMessage: string | null = deployment?.meta?.githubCommitMessage || null
    const url: string | null = deployment?.url ? `https://${deployment.url}` : null

    try {
        if (type === 'deployment.succeeded' || type === 'deployment.ready') {
            await recordDeployment(supabase, {
                vercelDeploymentId: deployment.id,
                status: 'succeeded',
                commitSha,
                commitMessage,
                url,
                errorLogs: null,
            })

            await createNotification(supabase, {
                type: 'deployment',
                title: 'Deployment Succeeded',
                message: commitMessage ? `${commitMessage}${url ? ` — ${url}` : ''}` : `Deployment ${deployment.id} is live${url ? ` at ${url}` : ''}`,
                severity: 'info',
            })

            console.log('✅ Deployment recorded (succeeded):', deployment.id)
        } else if (type === 'deployment.error' || type === 'deployment.failed') {
            const errorLogs = await fetchBuildLogs(deployment.id)

            await recordDeployment(supabase, {
                vercelDeploymentId: deployment.id,
                status: 'error',
                commitSha,
                commitMessage,
                url,
                errorLogs,
            })

            const errorSummary = event?.payload?.error?.message || errorLogs?.slice(0, 500) || 'Unknown build error'
            await createNotification(supabase, {
                type: 'deployment',
                title: 'Deployment Failed',
                message: commitMessage ? `${commitMessage}\n${errorSummary}` : errorSummary,
                severity: 'error',
            })

            console.log('🔥 Deployment recorded (failed):', deployment.id)
        } else if (type === 'deployment.canceled') {
            await recordDeployment(supabase, {
                vercelDeploymentId: deployment.id,
                status: 'canceled',
                commitSha,
                commitMessage,
                url,
                errorLogs: null,
            })
        } else {
            console.log('ℹ️ Ignoring unhandled Vercel event type:', type)
        }

        return res.status(200).json({ received: true })
    } catch (error: any) {
        console.error('🔥 Error processing Vercel webhook:', error)
        return res.status(500).json({ error: 'Webhook processing failed' })
    }
}

/**
 * Verify the `x-vercel-signature` header: an HMAC-SHA1 hex digest of the raw
 * body, keyed with the webhook secret. See:
 * https://vercel.com/docs/observability/webhooks-overview/webhooks-api#securing-webhooks
 */
function verifySignature(rawBody: Buffer, signature: string, secret: string): boolean {
    const expected = crypto.createHmac('sha1', secret).update(rawBody).digest('hex')
    const expectedBuf = Buffer.from(expected, 'utf8')
    const signatureBuf = Buffer.from(signature, 'utf8')
    if (expectedBuf.length !== signatureBuf.length) return false
    return crypto.timingSafeEqual(expectedBuf, signatureBuf)
}

async function recordDeployment(
    supabase: any,
    row: {
        vercelDeploymentId: string
        status: 'succeeded' | 'error' | 'canceled'
        commitSha: string | null
        commitMessage: string | null
        url: string | null
        errorLogs: string | null
    }
) {
    const { error } = await supabase.from('deployments').upsert(
        {
            vercel_deployment_id: row.vercelDeploymentId,
            status: row.status,
            commit_sha: row.commitSha,
            commit_message: row.commitMessage,
            url: row.url,
            error_logs: row.errorLogs,
        },
        { onConflict: 'vercel_deployment_id' }
    )
    if (error) {
        console.error('❌ Failed to record deployment:', error)
        throw error
    }
}

async function createNotification(
    supabase: any,
    row: { type: string; title: string; message: string; severity: 'info' | 'warning' | 'error' }
) {
    const { error } = await supabase.from('admin_notifications').insert({
        type: row.type,
        title: row.title,
        message: row.message,
        severity: row.severity,
    })
    if (error) {
        console.error('❌ Failed to create admin notification:', error)
        throw error
    }
}

/**
 * Pull build logs for a failed deployment via the Vercel API so the error
 * detail survives past the build container. Best-effort: returns null on
 * any failure rather than blocking the deployment record from being saved.
 */
async function fetchBuildLogs(deploymentId: string): Promise<string | null> {
    const token = process.env.VERCEL_TOKEN
    if (!token) {
        console.warn('⚠️ VERCEL_TOKEN not set — skipping build log fetch')
        return null
    }

    const teamId = 'team_mb29bMintz7Ffd29VRICdhGx'

    try {
        const url = new URL(`https://api.vercel.com/v2/deployments/${deploymentId}/events`)
        url.searchParams.set('teamId', teamId)
        url.searchParams.set('limit', '200')
        url.searchParams.set('builds', '1')

        const r = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${token}` },
        })

        const text = await r.text()
        if (!r.ok) {
            console.error('❌ Vercel build log fetch failed:', r.status, text.slice(0, 300))
            return null
        }

        // The events endpoint returns either a JSON array or newline-delimited
        // JSON objects depending on payload size; handle both.
        let entries: any[]
        try {
            entries = JSON.parse(text)
            if (!Array.isArray(entries)) entries = []
        } catch {
            entries = text
                .split('\n')
                .filter(Boolean)
                .map(line => {
                    try {
                        return JSON.parse(line)
                    } catch {
                        return null
                    }
                })
                .filter(Boolean)
        }

        const lines = entries
            .map((entry: any) => entry.text ?? entry.payload?.text ?? '')
            .filter(Boolean)

        return lines.length > 0 ? lines.join('\n').slice(0, 10000) : null
    } catch (err: any) {
        console.error('❌ Error fetching build logs:', err?.message)
        return null
    }
}

/**
 * Read the raw request body as a Buffer.
 * Vercel/Node passes the body in different shapes depending on whether
 * bodyParser ran; this normalizes them.
 */
async function readRawBody(req: VercelRequest): Promise<Buffer> {
    const body = (req as any).body
    if (Buffer.isBuffer(body)) return body
    if (typeof body === 'string') return Buffer.from(body, 'utf8')

    return await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = []
        req.on('data', (chunk: Buffer) => chunks.push(chunk))
        req.on('end', () => resolve(Buffer.concat(chunks)))
        req.on('error', reject)
    })
}
