import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Support both GET (for link clicks) and POST (for API calls)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Get email from query params (GET) or body (POST)
  const email = (req.method === 'GET' ? req.query.email : req.body?.email) as string
  const token = (req.method === 'GET' ? req.query.token : req.body?.token) as string

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    // If GET request with invalid email, show error page
    if (req.method === 'GET') {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Unsubscribe Error</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              background-color: #000000; 
              color: #ffffff; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              min-height: 100vh; 
              margin: 0; 
              padding: 20px; 
            }
            .container { 
              max-width: 600px; 
              text-align: center; 
            }
            h1 { color: #ffffff; }
            p { color: rgba(255, 255, 255, 0.8); }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Invalid Unsubscribe Request</h1>
            <p>Please use the unsubscribe link from your email.</p>
          </div>
        </body>
        </html>
      `)
    }
    return res.status(400).json({ error: 'Valid email is required' })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Database service not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Verify token if provided (optional security measure)
    // For now, we'll just verify the email exists in the database
    const { data: subscriber, error: fetchError } = await supabase
      .from('newsletter_subscribers')
      .select('email, verified')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle()

    if (fetchError) {
      throw fetchError
    }

    if (!subscriber) {
      // If GET request, show not found page
      if (req.method === 'GET') {
        return res.status(404).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Not Found</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                background-color: #000000; 
                color: #ffffff; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                min-height: 100vh; 
                margin: 0; 
                padding: 20px; 
              }
              .container { 
                max-width: 600px; 
                text-align: center; 
              }
              h1 { color: #ffffff; }
              p { color: rgba(255, 255, 255, 0.8); }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Email Not Found</h1>
              <p>This email address is not subscribed to our newsletter.</p>
            </div>
          </body>
          </html>
        `)
      }
      return res.status(404).json({ error: 'Email not found in subscribers list' })
    }

    // Unsubscribe the user (set verified to false or delete)
    // We'll set verified to false to keep a record
    const { error: updateError } = await supabase
      .from('newsletter_subscribers')
      .update({ verified: false, unsubscribed_at: new Date().toISOString() })
      .eq('email', email.toLowerCase().trim())

    if (updateError) {
      throw updateError
    }

    // If GET request, show success page
    if (req.method === 'GET') {
      return res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Unsubscribed</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              background-color: #000000; 
              color: #ffffff; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              min-height: 100vh; 
              margin: 0; 
              padding: 20px; 
            }
            .container { 
              max-width: 600px; 
              text-align: center; 
            }
            h1 { color: #ffffff; margin-bottom: 20px; }
            p { color: rgba(255, 255, 255, 0.8); line-height: 1.6; }
            .success { color: #ffffff; font-size: 18px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>You've been unsubscribed</h1>
            <p>You have successfully unsubscribed from THE LOST+UNFOUNDS newsletter.</p>
            <p>You will no longer receive emails from us.</p>
            <p class="success">We're sorry to see you go!</p>
          </div>
        </body>
        </html>
      `)
    }

    return res.status(200).json({
      success: true,
      message: 'Successfully unsubscribed from newsletter'
    })

  } catch (error: any) {
    console.error('Unsubscribe error:', error)
    
    // If GET request, show error page
    if (req.method === 'GET') {
      return res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Error</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              background-color: #000000; 
              color: #ffffff; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              min-height: 100vh; 
              margin: 0; 
              padding: 20px; 
            }
            .container { 
              max-width: 600px; 
              text-align: center; 
            }
            h1 { color: #ffffff; }
            p { color: rgba(255, 255, 255, 0.8); }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Error</h1>
            <p>An error occurred while processing your unsubscribe request. Please try again later.</p>
          </div>
        </body>
        </html>
      `)
    }
    
    return res.status(500).json({
      error: error.message || 'An error occurred while unsubscribing'
    })
  }
}
