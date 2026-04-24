import type { VercelRequest, VercelResponse } from '@vercel/node'

const VERCEL_API_BASE = 'https://api.vercel.com'

function getVercelCreds() {
  const token = process.env.VERCEL_API_TOKEN
  const projectId = process.env.VERCEL_PROJECT_ID
  if (!token || !projectId) {
    throw new Error('VERCEL_API_TOKEN and VERCEL_PROJECT_ID must be set')
  }
  return { token, projectId }
}

function vercelHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

function maskValue(value: string | undefined): string {
  if (!value) return '••••••••'
  if (value.length <= 4) return '••••'
  return '••••••••' + value.slice(-4)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { token, projectId } = getVercelCreds()
    const action = req.body?.action as string | undefined

    // GET — list env vars
    if (req.method === 'GET') {
      const url = `${VERCEL_API_BASE}/v9/projects/${projectId}/env`
      const r = await fetch(url, { headers: vercelHeaders(token) })
      const data = await r.json()

      if (!r.ok) {
        return res.status(r.status).json({ error: data.error?.message || 'Vercel API error' })
      }

      // Strip actual values — send only metadata + last4
      const envs = (data.envs || []).map((e: any) => ({
        id: e.id,
        key: e.key,
        type: e.type,
        target: e.target,
        gitBranch: e.gitBranch ?? null,
        updatedAt: e.updatedAt,
        createdAt: e.createdAt,
        masked: maskValue(e.value),
      }))

      return res.status(200).json({ envs })
    }

    if (req.method === 'POST') {
      // CREATE a new env var
      if (action === 'create') {
        const { key, value, target, type } = req.body
        if (!key || !value) {
          return res.status(400).json({ error: 'key and value are required' })
        }
        const url = `${VERCEL_API_BASE}/v9/projects/${projectId}/env`
        const body = {
          key,
          value,
          target: target || ['production', 'preview', 'development'],
          type: type || 'encrypted',
        }
        const r = await fetch(url, {
          method: 'POST',
          headers: vercelHeaders(token),
          body: JSON.stringify(body),
        })
        const data = await r.json()
        if (!r.ok) {
          return res.status(r.status).json({ error: data.error?.message || 'Failed to create env var' })
        }
        return res.status(200).json({ success: true, id: data.created?.id || data.id })
      }

      // UPDATE an existing env var
      if (action === 'update') {
        const { envId, value, target, type } = req.body
        if (!envId || !value) {
          return res.status(400).json({ error: 'envId and value are required' })
        }
        const url = `${VERCEL_API_BASE}/v9/projects/${projectId}/env/${envId}`
        const body: Record<string, any> = { value }
        if (target) body.target = target
        if (type) body.type = type
        const r = await fetch(url, {
          method: 'PATCH',
          headers: vercelHeaders(token),
          body: JSON.stringify(body),
        })
        const data = await r.json()
        if (!r.ok) {
          return res.status(r.status).json({ error: data.error?.message || 'Failed to update env var' })
        }
        return res.status(200).json({ success: true })
      }

      // DELETE an env var
      if (action === 'delete') {
        const { envId } = req.body
        if (!envId) {
          return res.status(400).json({ error: 'envId is required' })
        }
        const url = `${VERCEL_API_BASE}/v9/projects/${projectId}/env/${envId}`
        const r = await fetch(url, {
          method: 'DELETE',
          headers: vercelHeaders(token),
        })
        if (!r.ok) {
          const data = await r.json().catch(() => ({}))
          return res.status(r.status).json({ error: data.error?.message || 'Failed to delete env var' })
        }
        return res.status(200).json({ success: true })
      }

      // REDEPLOY — trigger a new deployment
      if (action === 'redeploy') {
        // Get latest deployment to redeploy from
        const deploymentsUrl = `${VERCEL_API_BASE}/v6/deployments?projectId=${projectId}&limit=1&target=production`
        const dr = await fetch(deploymentsUrl, { headers: vercelHeaders(token) })
        const deployData = await dr.json()

        if (!dr.ok || !deployData.deployments?.length) {
          return res.status(400).json({ error: 'No existing deployments found to redeploy' })
        }

        const latest = deployData.deployments[0]
        const redeployUrl = `${VERCEL_API_BASE}/v13/deployments`
        const body = {
          name: latest.name,
          deploymentId: latest.uid,
          target: 'production',
          meta: { action: 'env-var-update' },
        }
        const rr = await fetch(redeployUrl, {
          method: 'POST',
          headers: vercelHeaders(token),
          body: JSON.stringify(body),
        })
        const redeployData = await rr.json()
        if (!rr.ok) {
          return res.status(rr.status).json({ error: redeployData.error?.message || 'Failed to trigger redeploy' })
        }
        return res.status(200).json({
          success: true,
          deploymentId: redeployData.id,
          url: redeployData.url,
        })
      }

      return res.status(400).json({ error: `Unknown action: ${action}` })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    console.error('[env-vars handler]', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
