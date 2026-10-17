/**
 * Dedicated route for GET/DELETE /api/mail/message/:id
 *
 * Vercel's catch-all routing (api/mail/[...path].ts) doesn't reliably match
 * multi-segment paths in production — see api/admin/analytics/*.ts for the
 * same workaround applied earlier to /api/admin/analytics/*. This dedicated
 * single-dynamic-segment route bypasses that limitation.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as mailHandler from '../../../lib/api-handlers/_zoho-mail-handler.js';


import { verifyAdmin } from '../../../lib/api-handlers/_admin-auth.js'
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Email');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!(await verifyAdmin(req))) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const messageId = req.query.id as string;
  if (!messageId) {
    return res.status(400).json({ error: 'messageId is required' });
  }

  if (req.method === 'GET') {
    const folderId = req.query.folderId as string;
    const result = await mailHandler.getMessage(messageId, folderId);
    if (!result.success) {
      console.error('getMessage error:', result.error);
      const is404 = result.error?.includes('404');
      const status = is404 ? 404 : 500;
      return res.status(status).json({ error: is404 ? 'Message not found' : result.error });
    }
    return res.status(200).json({ message: result.message });
  }

  if (req.method === 'DELETE') {
    const permanent = req.query.permanent === 'true';
    const result = await mailHandler.deleteMessage(messageId, permanent);
    if (!result.success) {
      console.error('deleteMessage error:', result.error);
      return res.status(500).json({ error: result.error });
    }
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
