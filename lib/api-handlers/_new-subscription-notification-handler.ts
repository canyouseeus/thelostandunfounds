import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createServiceSupabaseClient } from './_supabase-admin-client'
import { getZohoAuthContext, sendZohoEmail } from './_zoho-email-utils'

const wrapHtml = (body: string) => `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin:0;padding:32px;background-color:#000;color:#fff;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:640px;margin:0 auto;">
      ${body}
      <hr style="border:none;border-top:1px solid rgba(255,255,255,0.15);margin:32px 0;" />
      <p style="font-size:12px;color:rgba(255,255,255,0.6);margin:0;">
        Automated subscription notification from THE LOST+UNFOUNDS
      </p>
    </div>
  </body>
</html>`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId, tier, subscriptionId } = req.body ?? {}

    if (!userId || !tier) {
      return res.status(400).json({ error: 'userId and tier are required' })
    }

    const supabase = createServiceSupabaseClient()
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId)

    if (userError) {
      throw userError
    }

    const userEmail = userData?.user?.email || 'unknown'
    const userName =
      userData?.user?.user_metadata?.full_name ||
      userData?.user?.user_metadata?.name ||
      userEmail

    const subdomainResult = await supabase
      .from('user_subdomains')
      .select('subdomain, blog_title_display, author_name')
      .eq('user_id', userId)
      .maybeSingle()

    if (subdomainResult.error) {
      const message = subdomainResult.error.message?.toLowerCase() || ''
      if (!message.includes('does not exist')) {
        throw subdomainResult.error
      }
    }

    const subdomainInfo = subdomainResult.data

    const subject = `New ${String(tier).toUpperCase()} subscription`
    const now = new Date().toLocaleString('en-US', { timeZone: 'UTC' })

    const htmlBody = wrapHtml(`
      <h2 style="margin:0 0 16px 0;font-size:24px;">New subscription created</h2>
      <p style="margin:0 0 16px 0;font-size:16px;line-height:1.5;">
        A new <strong>${tier}</strong> subscription has been created in THE LOST+UNFOUNDS.
      </p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 24px 0;">
        <tbody>
          <tr>
            <td style="padding:8px 0;color:rgba(255,255,255,0.6);">User</td>
            <td style="padding:8px 0;color:#fff;">${userName} (${userEmail})</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:rgba(255,255,255,0.6);">Subscription ID</td>
            <td style="padding:8px 0;color:#fff;">${subscriptionId || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:rgba(255,255,255,0.6);">Timestamp (UTC)</td>
            <td style="padding:8px 0;color:#fff;">${now}</td>
          </tr>
          ${
            subdomainInfo
              ? `<tr>
                  <td style="padding:8px 0;color:rgba(255,255,255,0.6);">Subdomain</td>
                  <td style="padding:8px 0;color:#fff;">${subdomainInfo.subdomain}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:rgba(255,255,255,0.6);">Author</td>
                  <td style="padding:8px 0;color:#fff;">${subdomainInfo.author_name || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:rgba(255,255,255,0.6);">Blog Title</td>
                  <td style="padding:8px 0;color:#fff;">${
                    subdomainInfo.blog_title_display || 'N/A'
                  }</td>
                </tr>`
              : ''
          }
        </tbody>
      </table>
    `)

    const zohoAuth = await getZohoAuthContext()
    const recipient = process.env.ZOHO_TO_EMAIL || zohoAuth.fromEmail

    const result = await sendZohoEmail({
      auth: zohoAuth,
      to: recipient,
      subject,
      htmlContent: htmlBody
    })

    if (!result.success) {
      throw new Error(result.error || 'Failed to send Zoho notification')
    }

    return res.status(200).json({ success: true })
  } catch (error: any) {
    console.error('New subscription notification handler error:', error)
    return res
      .status(500)
      .json({ error: error?.message || 'Failed to send subscription notification' })
  }
}
