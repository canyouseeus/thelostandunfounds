import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createServiceSupabaseClient } from './_supabase-admin-client'
import { sendTransactionalEmail } from './_resend-email-handler.js'

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

    const content = `
      <h2 style="color: #ffffff; margin:0 0 16px 0;font-size:24px;">New subscription created</h2>
      <p style="color: #ffffff; margin:0 0 16px 0;font-size:16px;line-height:1.5;">
        A new <strong>${tier}</strong> subscription has been created in THE LOST+UNFOUNDS.
      </p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 24px 0;">
        <tbody>
          <tr>
            <td style="padding:8px 0;color:#aaaaaa;">User</td>
            <td style="padding:8px 0;color:#ffffff;">${userName} (${userEmail})</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#aaaaaa;">Subscription ID</td>
            <td style="padding:8px 0;color:#ffffff;">${subscriptionId || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#aaaaaa;">Timestamp (UTC)</td>
            <td style="padding:8px 0;color:#ffffff;">${now}</td>
          </tr>
          ${
            subdomainInfo
              ? `<tr>
                  <td style="padding:8px 0;color:#aaaaaa;">Subdomain</td>
                  <td style="padding:8px 0;color:#ffffff;">${subdomainInfo.subdomain}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#aaaaaa;">Author</td>
                  <td style="padding:8px 0;color:#ffffff;">${subdomainInfo.author_name || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#aaaaaa;">Blog Title</td>
                  <td style="padding:8px 0;color:#ffffff;">${
                    subdomainInfo.blog_title_display || 'N/A'
                  }</td>
                </tr>`
              : ''
          }
        </tbody>
      </table>
      <hr style="border:none;border-top:1px solid rgba(255,255,255,0.15);margin:32px 0;" />
      <p style="font-size:12px;color:#aaaaaa;margin:0;">
        Automated subscription notification from THE LOST+UNFOUNDS
      </p>
    `

    const recipient = process.env.ZOHO_TO_EMAIL || process.env.ZOHO_FROM_EMAIL || process.env.ZOHO_EMAIL || ''

    const result = await sendTransactionalEmail({ to: recipient, subject, content })

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
