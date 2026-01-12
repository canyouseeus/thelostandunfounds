
import { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const environment = (process.env.PAYPAL_ENVIRONMENT || 'SANDBOX').toUpperCase()
    const isLive = environment === 'LIVE'

    const vars = {
        PAYPAL_ENVIRONMENT: process.env.PAYPAL_ENVIRONMENT,
        PAYPAL_CLIENT_ID: !!process.env.PAYPAL_CLIENT_ID,
        PAYPAL_CLIENT_ID_LIVE: !!process.env.PAYPAL_CLIENT_ID_LIVE,
        PAYPAL_CLIENT_ID_SANDBOX: !!process.env.PAYPAL_CLIENT_ID_SANDBOX,
        PAYPAL_CLIENT_SECRET: !!process.env.PAYPAL_CLIENT_SECRET,
        PAYPAL_CLIENT_SECRET_LIVE: !!process.env.PAYPAL_CLIENT_SECRET_LIVE,
        PAYPAL_CLIENT_SECRET_SANDBOX: !!process.env.PAYPAL_CLIENT_SECRET_SANDBOX,
    }

    const clientId = isLive
        ? (process.env.PAYPAL_CLIENT_ID_LIVE || process.env.PAYPAL_CLIENT_ID)
        : (process.env.PAYPAL_CLIENT_ID_SANDBOX || process.env.PAYPAL_CLIENT_ID)

    const clientSecret = isLive
        ? (process.env.PAYPAL_CLIENT_SECRET_LIVE || process.env.PAYPAL_CLIENT_SECRET)
        : (process.env.PAYPAL_CLIENT_SECRET_SANDBOX || process.env.PAYPAL_CLIENT_SECRET)

    const baseUrl = isLive ? 'https://api.paypal.com' : 'https://api.sandbox.paypal.com'

    const results = {
        selectedEnvironment: environment,
        effectiveBaseUrl: baseUrl,
        environmentVariables: vars,
        selectedClientIdStart: clientId ? `${clientId.substring(0, 5)}...` : null,
        authAttempt: {
            status: 'pending',
            error: null as any
        }
    }

    if (!clientId || !clientSecret) {
        return res.status(500).json({ error: 'PayPal credentials missing', results })
    }

    try {
        const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
        const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${auth}`,
            },
            body: 'grant_type=client_credentials',
        })

        const data = await response.json()
        if (response.ok) {
            results.authAttempt.status = 'SUCCESS'
        } else {
            results.authAttempt.status = 'FAILED'
            results.authAttempt.error = data
        }
    } catch (err: any) {
        results.authAttempt.status = 'ERROR'
        results.authAttempt.error = err.message
    }

    return res.status(200).json(results)
}
