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

  // Get EmailJS credentials from environment variables
  const emailjsServiceId = process.env.EMAILJS_SERVICE_ID
  const emailjsTemplateId = process.env.EMAILJS_TEMPLATE_ID
  const emailjsPublicKey = process.env.EMAILJS_PUBLIC_KEY
  const recipientEmail = process.env.RECIPIENT_EMAIL || process.env.EMAILJS_TO_EMAIL

  if (!emailjsServiceId || !emailjsTemplateId || !emailjsPublicKey || !recipientEmail) {
    console.error('Missing EmailJS configuration')
    return new Response(JSON.stringify({ 
      error: 'Email service is not configured. Please contact support.' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    // Send email via EmailJS
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service_id: emailjsServiceId,
        template_id: emailjsTemplateId,
        user_id: emailjsPublicKey,
        template_params: {
          subscriber_email: email,
          to_email: recipientEmail,
          reply_to: email,
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('EmailJS API error:', errorText)
      return new Response(JSON.stringify({ 
        error: 'Failed to subscribe. Please try again later.' 
      }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Thanks for signing up! We\'ll keep you updated.' 
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
