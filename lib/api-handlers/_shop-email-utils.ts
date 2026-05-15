import { getZohoAuthContext, sendZohoEmail } from './_zoho-email-utils.js'
import { generateTransactionalEmail } from '../email-template.js'

/**
 * Send a digital-product delivery email containing a time-limited download
 * link. The token is opaque to the recipient and validated by the
 * /api/checkout/download endpoint against shop_orders.metadata.downloadToken
 * (and metadata.downloadExpiresAt).
 */
export async function sendShopDigitalDeliveryEmail(args: {
    email: string
    shopOrderId: string
    downloadToken: string
    downloadExpiresAt: string
}) {
    const { email, shopOrderId, downloadToken, downloadExpiresAt } = args
    const baseUrl = process.env.SITE_URL || 'https://www.thelostandunfounds.com'
    const downloadUrl = `${baseUrl}/api/checkout/download?token=${encodeURIComponent(downloadToken)}`

    const expiresDate = new Date(downloadExpiresAt)
    const expiresLabel = isNaN(expiresDate.getTime())
        ? 'within 72 hours'
        : expiresDate.toLocaleString('en-US', {
              dateStyle: 'medium',
              timeStyle: 'short',
          })

    const body = `
        <h1 style="color:#fff;text-transform:uppercase;letter-spacing:-1px;font-size:28px;font-weight:bold;margin:0 0 10px;">Your Download is Ready</h1>
        <p style="color:#999;font-size:16px;margin:0 0 30px;">Thank you for your purchase. Your file is available below.</p>
        <div style="margin-bottom:40px;padding:20px;border:1px solid #333;background:#111;">
            <a href="${downloadUrl}" style="display:inline-block;padding:12px 24px;background:#000;color:#fff;border:2px solid #fff;text-decoration:none;font-weight:bold;text-transform:uppercase;font-size:13px;letter-spacing:1px;">Download</a>
            <p style="color:#666;font-size:12px;margin:16px 0 0;">Link expires ${expiresLabel}.</p>
        </div>
        <p style="color:#666;font-size:12px;margin:20px 0 0;">Order ID: ${shopOrderId}</p>
        <p style="color:#666;font-size:12px;margin:4px 0 0;">If the link doesn't work or has expired, reply to this email and we'll send you a fresh one.</p>
    `

    const htmlContent = generateTransactionalEmail(body)
    const auth = await getZohoAuthContext()
    return await sendZohoEmail({
        auth,
        to: email,
        subject: 'Your Download - THE LOST+UNFOUNDS',
        htmlContent,
    })
}
