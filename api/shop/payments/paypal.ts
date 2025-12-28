import { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Import and call the PayPal handler
  const paypalHandler = await import('../../../lib/api-handlers/_payments-paypal-handler.js')
  return paypalHandler.default(req, res)
}

