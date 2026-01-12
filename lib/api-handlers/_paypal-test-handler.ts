
import { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const environment = (process.env.PAYPAL_ENVIRONMENT || 'SANDBOX').toUpperCase()
    const isSandbox = environment !== 'LIVE'
    const clientId = isSandbox
        ? process.env.PAYPAL_CLIENT_ID_SANDBOX || process.env.PAYPAL_CLIENT_ID
        : process.env.PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID_LIVE
    const clientSecret = isSandbox
        ? process.env.PAYPAL_CLIENT_SECRET_SANDBOX || process.env.PAYPAL_CLIENT_SECRET
        : process.env.PAYPAL_CLIENT_SECRET || process.env.PAYPAL_CLIENT_SECRET_LIVE
    const baseUrl = isSandbox ? 'https://api.sandbox.paypal.com' : 'https://api.paypal.com'

    const results = {
        environment,
        baseUrl,
        clientIdPresent: !!clientId,
        clientIdStart: clientId ? `${clientId.substring(0, 5)}...` : null,
        clientSecretPresent: !!clientSecret,
        authAttempt: {
            status: 'pending',
            error: null as any,
            paypalResponse: null as any
        }
    }

    if (!clientId || !clientSecret) {
        return res.status(500).json({ error: 'PayPal credentials missing in environment', results })
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
        results.authAttempt.paypalResponse = data

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
