
import { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const environment = (process.env.PAYPAL_ENVIRONMENT || 'SANDBOX').toUpperCase()
    const isLive = environment === 'LIVE'

    // Get keys
    const clientId = isLive
        ? (process.env.PAYPAL_CLIENT_ID_LIVE || process.env.PAYPAL_CLIENT_ID)
        : (process.env.PAYPAL_CLIENT_ID_SANDBOX || process.env.PAYPAL_CLIENT_ID)

    const clientSecret = isLive
        ? (process.env.PAYPAL_CLIENT_SECRET_LIVE || process.env.PAYPAL_CLIENT_SECRET)
        : (process.env.PAYPAL_CLIENT_SECRET_SANDBOX || process.env.PAYPAL_CLIENT_SECRET)

    const baseUrl = isLive ? 'https://api.paypal.com' : 'https://api.sandbox.paypal.com'

    // Diagnostic Info
    const results = {
        selectedEnvironment: environment,
        targetUrl: `${baseUrl}/v1/oauth2/token`,
        credentialsInfo: {
            clientIdLength: clientId?.trim().length,
            clientSecretLength: clientSecret?.trim().length,
            clientIdPrefix: clientId?.substring(0, 5),
            clientSecretPrefix: clientSecret?.substring(0, 5),
            hasWhitespace: (clientId !== clientId?.trim()) || (clientSecret !== clientSecret?.trim())
        },
        authAttempt: {
            status: 'pending',
            error: null as any
        }
    }

    if (!clientId || !clientSecret) {
        return res.status(500).json({ error: 'Missing PayPal variables in Vercel', results })
    }

    try {
        const auth = Buffer.from(`${clientId.trim()}:${clientSecret.trim()}`).toString('base64')
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
            results.authAttempt.status = 'SUCCESS (TOKEN RECEIVED)'
        } else {
            results.authAttempt.status = 'FAILED (PAYPAL REJECTED)'
            results.authAttempt.error = data
        }
    } catch (err: any) {
        results.authAttempt.status = 'NETWORK_ERROR'
        results.authAttempt.error = err.message
    }

    return res.status(200).json(results)
}
