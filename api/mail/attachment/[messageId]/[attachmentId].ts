/**
 * Dedicated route for GET /api/mail/attachment/:messageId/:attachmentId
 *
 * Vercel's catch-all routing (api/mail/[...path].ts) doesn't reliably match
 * multi-segment paths in production — see api/admin/analytics/*.ts for the
 * same workaround applied earlier to /api/admin/analytics/*. This dedicated
 * nested-dynamic-segment route bypasses that limitation.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as mailHandler from '../../../../lib/api-handlers/_zoho-mail-handler.js';

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Email');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!isAdminRequest(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const messageId = req.query.messageId as string;
  const attachmentId = req.query.attachmentId as string;
  if (!messageId || !attachmentId) {
    return res.status(400).json({ error: 'messageId and attachmentId are required' });
  }

  // folderId is optional but required for inline (cid:) images — see getAttachment.
  const folderId = req.query.folderId as string | undefined;
  // The filename lets the handler recover the part from the raw message
  // source when Zoho 404s the attachment id.
  const name = req.query.name as string | undefined;
  const result = await mailHandler.getAttachment(messageId, attachmentId, folderId, name);
  if (!result.success || !result.content) {
    console.error('getAttachment error:', result.error);
    return res.status(500).json({ error: result.error });
  }

  // Stream the attachment under its real filename — the browser uses this
  // for the saved file, and "attachment" for everything is useless.
  const filename = (result.name || name || 'attachment').replace(/["\r\n]/g, '');
  res.setHeader('Content-Type', result.contentType || 'application/octet-stream');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
  );
  return res.status(200).send(Buffer.from(result.content));
}
