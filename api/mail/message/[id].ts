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

const ADMIN_EMAILS = ['thelostandunfounds@gmail.com', 'admin@thelostandunfounds.com'];

function isAdminRequest(req: VercelRequest): boolean {
  const adminEmail = req.headers['x-admin-email'] as string;
  if (adminEmail && ADMIN_EMAILS.includes(adminEmail.toLowerCase())) {
    return true;
  }
  const host = req.headers.host || '';
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return true;
  }
  return false;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Email');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!isAdminRequest(req)) {
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
