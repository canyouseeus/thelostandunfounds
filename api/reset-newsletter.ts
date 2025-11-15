import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Allow both GET and POST for easy browser access
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Simple token check - defaults to reset-newsletter-2024
  const expectedToken = process.env.RESET_TOKEN || 'reset-newsletter-2024'
  const providedToken = req.query.token || req.body?.token || req.headers['x-reset-token']

  if (providedToken !== expectedToken) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      hint: 'Add ?token=reset-newsletter-2024 to the URL' 
    })
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials')
      return res.status(500).json({ 
        error: 'Database service not configured' 
      })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get count before deletion
    const { count: beforeCount } = await supabase
      .from('newsletter_subscribers')
      .select('*', { count: 'exact', head: true })

    // Delete all subscribers
    const { error: deleteError } = await supabase
      .from('newsletter_subscribers')
      .delete()
      .neq('email', '') // Matches all rows since email is required

    if (deleteError) {
      console.error('Error deleting subscribers:', deleteError)
      return res.status(500).json({ 
        error: 'Failed to reset newsletter list',
        details: deleteError.message 
      })
    }

    // Verify deletion
    const { count: afterCount } = await supabase
      .from('newsletter_subscribers')
      .select('*', { count: 'exact', head: true })

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
              <div class="stat"><strong>Deleted:</strong> ${beforeCount || 0} subscribers</div>
              <div class="stat"><strong>Remaining:</strong> ${afterCount || 0} subscribers</div>
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
      deleted: beforeCount || 0,
      remaining: afterCount || 0
    })

  } catch (error: any) {
    console.error('Reset newsletter list error:', error)
    return res.status(500).json({ 
      error: error.message || 'An error occurred while resetting the list' 
    })
  }
}
