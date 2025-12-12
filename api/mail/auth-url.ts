/**
 * Helper endpoint to generate Zoho OAuth URL with Mail API scopes
 * GET /api/mail/auth-url - Returns the authorization URL
 * GET /api/mail/auth-url?redirect=true - Redirects to Zoho auth
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const clientId = process.env.ZOHO_CLIENT_ID;
  
  if (!clientId) {
    return res.status(500).json({ error: 'ZOHO_CLIENT_ID not configured' });
  }

  // All scopes needed for full mailbox access
  const scopes = [
    'ZohoMail.accounts.READ',
    'ZohoMail.folders.READ',
    'ZohoMail.folders.ALL',
    'ZohoMail.messages.READ',
    'ZohoMail.messages.CREATE',
    'ZohoMail.messages.DELETE',
    'ZohoMail.messages.ALL'
  ].join(',');

  const redirectUri = 'https://www.thelostandunfounds.com/auth/callback';
  
  const authUrl = `https://accounts.zoho.com/oauth/v2/auth?scope=${scopes}&client_id=${clientId}&response_type=code&access_type=offline&redirect_uri=${encodeURIComponent(redirectUri)}&prompt=consent`;

  if (req.query.redirect === 'true') {
    return res.redirect(302, authUrl);
  }

  return res.status(200).json({ 
    authUrl,
    instructions: 'Visit this URL while logged into Zoho, authorize, then copy the "code" parameter from the callback URL'
  });
}
