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
        Blog contributor notification • THE LOST+UNFOUNDS
      </p>
    </div>
  </body>
</html>`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId, subdomain, userEmail } = req.body ?? {}

    if (!userId || !subdomain) {
      return res.status(400).json({ error: 'userId and subdomain are required' })
    }

    const supabase = createServiceSupabaseClient()
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId)

    if (userError) {
      throw userError
    }

    const contributorEmail = userEmail || userData?.user?.email || 'unknown'
    const contributorName =
      userData?.user?.user_metadata?.full_name ||
      userData?.user?.user_metadata?.name ||
      userData?.user?.user_metadata?.username ||
      contributorEmail

    let subdomainInfo: {
      subdomain: string
      blog_title_display: string | null
      blog_title: string | null
      author_name: string | null
    } | null = null

    const byUser = await supabase
      .from('user_subdomains')
      .select('subdomain, blog_title_display, blog_title, author_name')
      .eq('user_id', userId)
      .maybeSingle()

    if (byUser.error) {
      const message = byUser.error.message?.toLowerCase() || ''
      if (!message.includes('does not exist')) {
        throw byUser.error
      }
    } else {
      subdomainInfo = byUser.data
    }

    if (!subdomainInfo) {
      const bySlug = await supabase
        .from('user_subdomains')
        .select('subdomain, blog_title_display, blog_title, author_name')
        .eq('subdomain', subdomain)
        .maybeSingle()

      if (bySlug.error) {
        const message = bySlug.error.message?.toLowerCase() || ''
        if (!message.includes('does not exist')) {
          throw bySlug.error
        }
      } else {
        subdomainInfo = bySlug.data
      }
    }
    const blogUrl = `https://www.thelostandunfounds.com/thelostarchives/${subdomain}`
    const dashboardUrl = `https://www.thelostandunfounds.com/admin?tab=blog&subdomain=${subdomain}`

    const htmlBody = wrapHtml(`
      <h2 style="margin:0 0 16px 0;font-size:24px;">New blog contributor detected</h2>
      <p style="margin:0 0 16px 0;font-size:16px;line-height:1.5;">
        ${contributorName} just configured a blog subdomain on THE LOST ARCHIVES.
      </p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 24px 0;">
        <tbody>
          <tr>
            <td style="padding:8px 0;color:rgba(255,255,255,0.6);">User</td>
            <td style="padding:8px 0;color:#fff;">${contributorName} (${contributorEmail})</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:rgba(255,255,255,0.6);">Subdomain</td>
            <td style="padding:8px 0;color:#fff;">${subdomain}</td>
          </tr>
          ${
            subdomainInfo
              ? `<tr>
                  <td style="padding:8px 0;color:rgba(255,255,255,0.6);">Blog Title</td>
                  <td style="padding:8px 0;color:#fff;">${
                    subdomainInfo.blog_title_display || subdomainInfo.blog_title || 'N/A'
                  }</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:rgba(255,255,255,0.6);">Author Name</td>
                  <td style="padding:8px 0;color:#fff;">${subdomainInfo.author_name || 'N/A'}</td>
                </tr>`
              : ''
          }
        </tbody>
      </table>
      <p style="margin:0 0 8px 0;">
        <a href="${blogUrl}" style="color:#fff;text-decoration:underline;">View draft blog →</a>
      </p>
      <p style="margin:0;">
        <a href="${dashboardUrl}" style="color:#fff;text-decoration:underline;">Open Admin dashboard →</a>
      </p>
    `)

    const zohoAuth = await getZohoAuthContext()
    const recipient = process.env.ZOHO_TO_EMAIL || zohoAuth.fromEmail

    const result = await sendZohoEmail({
      auth: zohoAuth,
      to: recipient,
      subject: `New blog contributor: ${contributorName}`,
      htmlContent: htmlBody
    })

    if (!result.success) {
      throw new Error(result.error || 'Failed to send contributor notification')
    }

    return res.status(200).json({ success: true })
  } catch (error: any) {
    console.error('New blog contributor notification error:', error)
    return res.status(500).json({
      error: error?.message || 'Failed to send blog contributor notification'
    })
  }
}
