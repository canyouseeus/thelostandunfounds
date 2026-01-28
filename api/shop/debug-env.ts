
import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const envCheck = {
        VERCEL: process.env.VERCEL,
        VERCEL_ENV: process.env.VERCEL_ENV,
        NODE_VERSION: process.version,
        CWD: process.cwd(),
        TIMESTAMP: new Date().toISOString(),
    }

    // Try to load local modules to see if they exist
    let productsHandlerStatus = 'unknown'
    try {
        await import('../../lib/api-handlers/_products-handler')
        productsHandlerStatus = 'loaded'
    } catch (e: any) {
        productsHandlerStatus = `failed: ${e.message}`
    }

    res.status(200).json({
        status: 'ok',
        message: 'Debug endpoint active',
        env: envCheck,
        modules: {
            productsHandler: productsHandlerStatus
        }
    })
}
