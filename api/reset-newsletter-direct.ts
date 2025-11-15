import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Allow both GET and POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Simple token check
  const expectedToken = process.env.RESET_TOKEN || 'reset-newsletter-2024'
  const providedToken = req.query.token || req.body?.token

  if (providedToken !== expectedToken) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      hint: 'Add ?token=reset-newsletter-2024 to the URL' 
    })
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ 
        error: 'Supabase credentials not configured' 
      })
    }

    // First, get count of subscribers
    const countResponse = await fetch(
      `${supabaseUrl}/rest/v1/newsletter_subscribers?select=id&limit=1`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'count=exact'
        }
      }
    )

    const countHeader = countResponse.headers.get('content-range')
    const beforeCount = countHeader ? parseInt(countHeader.split('/')[1]) || 0 : 0

    // Delete all subscribers using Supabase REST API
    // Using a filter that matches all rows (email is not empty, which is always true)
    const deleteResponse = await fetch(
      `${supabaseUrl}/rest/v1/newsletter_subscribers?email=neq.`,
      {
        method: 'DELETE',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        }
      }
    )

    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text()
      console.error('Supabase REST API delete error:', errorText)
      return res.status(500).json({ 
        error: 'Failed to delete subscribers',
        details: errorText
      })
    }

    // Verify deletion
    const verifyResponse = await fetch(
      `${supabaseUrl}/rest/v1/newsletter_subscribers?select=id&limit=1`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'count=exact'
        }
      }
    )

    const verifyCountHeader = verifyResponse.headers.get('content-range')
    const afterCount = verifyCountHeader ? parseInt(verifyCountHeader.split('/')[1]) || 0 : 0

    // Return HTML response for easy browser viewing
    if (req.method === 'GET') {
      return res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Newsletter List Reset</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              max-width: 600px;
              margin: 50px auto;
              padding: 20px;
              background: #000;
              color: #fff;
            }
            .success {
              background: #1a1a1a;
              padding: 30px;
              border-radius: 8px;
              border: 1px solid #333;
            }
            h1 { color: #fff; margin-top: 0; }
            .stats {
              margin: 20px 0;
              padding: 15px;
              background: #0a0a0a;
              border-radius: 4px;
            }
            .stat { margin: 10px 0; }
            a { color: #fff; text-decoration: underline; }
          </style>
        </head>
        <body>
          <div class="success">
            <h1>✅ Newsletter List Reset Successfully!</h1>
            <div class="stats">
              <div class="stat"><strong>Deleted:</strong> ${beforeCount} subscribers</div>
              <div class="stat"><strong>Remaining:</strong> ${afterCount} subscribers</div>
            </div>
            <p>You can now test the email signup again!</p>
            <p style="margin-top: 20px;"><a href="/">← Back to Home</a></p>
          </div>
        </body>
        </html>
      `)
    }

    return res.status(200).json({ 
      success: true,
      message: 'Newsletter subscribers list reset successfully',
      deleted: beforeCount,
      remaining: afterCount
    })

  } catch (error: any) {
    console.error('Reset newsletter list error:', error)
    return res.status(500).json({ 
      error: error.message || 'An error occurred while resetting the list' 
    })
  }
}
