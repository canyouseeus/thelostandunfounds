/**
 * Exchange authorization code for refresh token
 * POST /api/mail/exchange-code { code: "..." }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientId = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'Zoho credentials not configured' });
  }

  const { code } = req.body;
  
  if (!code) {
    return res.status(400).json({ error: 'Authorization code is required' });
  }

  const redirectUri = 'https://www.thelostandunfounds.com/zoho/callback';

  try {
    const response = await fetch('https://accounts.zoho.com/oauth/v2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Zoho token exchange error:', data);
      return res.status(400).json({ 
        error: 'Failed to exchange code',
        details: data 
      });
    }

    // Return the refresh token - this needs to be saved to Vercel env vars
    return res.status(200).json({
      success: true,
      refresh_token: data.refresh_token,
      access_token: data.access_token,
      expires_in: data.expires_in,
      instructions: 'Copy the refresh_token and update ZOHO_REFRESH_TOKEN in Vercel environment variables'
    });
  } catch (error: any) {
    console.error('Token exchange error:', error);
    return res.status(500).json({ 
      error: 'Failed to exchange code',
      message: error.message 
    });
  }
}
