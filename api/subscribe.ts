export default async function handler(req: Request): Promise<Response> {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let email: string
  try {
    const body = await req.json()
    email = body.email
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Validate email
  if (!email || !email.includes('@')) {
    return new Response(JSON.stringify({ error: 'Valid email address is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Get Zoho credentials from environment variables
  const zohoApiKey = process.env.ZOHO_API_KEY
  const zohoListKey = process.env.ZOHO_LIST_KEY
  const zohoApiUrl = process.env.ZOHO_API_URL || 'https://campaigns.zoho.com/api/v1.1/json/listsubscribe'

  if (!zohoApiKey || !zohoListKey) {
    console.error('Missing Zoho configuration')
    return new Response(JSON.stringify({ 
      error: 'Email service is not configured. Please contact support.' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    // Add subscriber to Zoho Campaigns
    const response = await fetch(zohoApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Zoho-oauthtoken ${zohoApiKey}`,
      },
      body: JSON.stringify({
        listkey: zohoListKey,
        contactinfo: {
          email: email,
        },
        resubscribe: true, // Re-subscribe if already exists
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      // Handle Zoho API errors
      const errorMessage = data?.message || data?.error || 'Failed to subscribe'
      console.error('Zoho API error:', errorMessage)
      
      // Check if email already exists (this is often not an error)
      if (data?.status === 'error' && data?.message?.includes('already')) {
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'You are already subscribed!' 
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Successfully subscribed!' 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Subscription error:', error)
    return new Response(JSON.stringify({ 
      error: 'Failed to process subscription. Please try again later.' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
