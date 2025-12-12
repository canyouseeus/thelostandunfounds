/**
 * Mail API Catch-all Route
 * Handles all mail operations via Zoho Mail API
 * 
 * Endpoints:
 * - GET /api/mail/folders - List folders
 * - GET /api/mail/messages?folderId=X&limit=50&start=0 - List messages
 * - GET /api/mail/message/:id - Get single message
 * - POST /api/mail/send - Send email
 * - POST /api/mail/draft - Save draft
 * - PUT /api/mail/move - Move message
 * - PUT /api/mail/read - Mark as read/unread
 * - PUT /api/mail/star - Mark as starred/unstarred
 * - DELETE /api/mail/message/:id - Delete message
 * - GET /api/mail/search?q=X - Search
 * - GET /api/mail/attachment/:messageId/:attachmentId - Download attachment
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Admin email check
const ADMIN_EMAILS = ['thelostandunfounds@gmail.com', 'admin@thelostandunfounds.com'];

function isAdminRequest(req: VercelRequest): boolean {
  const adminEmail = req.headers['x-admin-email'] as string;
  
  if (adminEmail && ADMIN_EMAILS.includes(adminEmail.toLowerCase())) {
    return true;
  }
  
  // Also accept requests from localhost in development
  const host = req.headers.host || '';
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return true;
  }
  
  return false;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Email');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Admin check
  if (!isAdminRequest(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  // Parse path
  const pathSegments = (req.query.path as string[]) || [];
  const endpoint = pathSegments[0] || '';
  
  console.log('Mail router - path:', pathSegments, 'endpoint:', endpoint, 'method:', req.method);

  try {
    // Dynamic import of mail handler
    const mailHandler = await import('../../lib/api-handlers/_zoho-mail-handler.js');
    
    switch (endpoint) {
      // GET /api/mail/folders
      case 'folders': {
        if (req.method !== 'GET') {
          return res.status(405).json({ error: 'Method not allowed' });
        }
        const result = await mailHandler.getFolders();
        if (!result.success) {
          console.error('getFolders error:', result.error);
          return res.status(500).json({ error: result.error });
        }
        return res.status(200).json({ folders: result.folders });
      }

      // GET /api/mail/messages?folderId=X&limit=50&start=0
      case 'messages': {
        if (req.method !== 'GET') {
          return res.status(405).json({ error: 'Method not allowed' });
        }
        const folderId = req.query.folderId as string;
        if (!folderId) {
          return res.status(400).json({ error: 'folderId is required' });
        }
        const limit = parseInt(req.query.limit as string || '50', 10);
        const start = parseInt(req.query.start as string || '0', 10);
        
        const result = await mailHandler.getMessages(folderId, limit, start);
        if (!result.success) {
          console.error('getMessages error:', result.error);
          return res.status(500).json({ error: result.error });
        }
        return res.status(200).json({ 
          messages: result.messages,
          total: result.total 
        });
      }

      // GET /api/mail/message/:id or DELETE /api/mail/message/:id
      case 'message': {
        const messageId = pathSegments[1];
        
        if (req.method === 'GET') {
          if (!messageId) {
            return res.status(400).json({ error: 'messageId is required' });
          }
          const result = await mailHandler.getMessage(messageId);
          if (!result.success) {
            console.error('getMessage error:', result.error);
            return res.status(500).json({ error: result.error });
          }
          return res.status(200).json({ message: result.message });
        }
        
        if (req.method === 'DELETE') {
          if (!messageId) {
            return res.status(400).json({ error: 'messageId is required' });
          }
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

      // POST /api/mail/send
      case 'send': {
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' });
        }
        const body = req.body;
        if (!body.to || !body.subject) {
          return res.status(400).json({ error: 'to and subject are required' });
        }
        const result = await mailHandler.sendMessage(body);
        if (!result.success) {
          console.error('sendMessage error:', result.error);
          return res.status(500).json({ error: result.error });
        }
        return res.status(200).json({ 
          success: true, 
          messageId: result.messageId 
        });
      }

      // POST /api/mail/draft
      case 'draft': {
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' });
        }
        const body = req.body;
        const result = await mailHandler.saveDraft({
          to: body.to || '',
          cc: body.cc,
          bcc: body.bcc,
          subject: body.subject || '',
          content: body.content || '',
          isHtml: body.isHtml
        });
        if (!result.success) {
          console.error('saveDraft error:', result.error);
          return res.status(500).json({ error: result.error });
        }
        return res.status(200).json({ 
          success: true, 
          messageId: result.messageId 
        });
      }

      // PUT /api/mail/move
      case 'move': {
        if (req.method !== 'PUT') {
          return res.status(405).json({ error: 'Method not allowed' });
        }
        const { messageId, folderId } = req.body;
        if (!messageId || !folderId) {
          return res.status(400).json({ error: 'messageId and folderId are required' });
        }
        const result = await mailHandler.moveMessage(messageId, folderId);
        if (!result.success) {
          console.error('moveMessage error:', result.error);
          return res.status(500).json({ error: result.error });
        }
        return res.status(200).json({ success: true });
      }

      // PUT /api/mail/read
      case 'read': {
        if (req.method !== 'PUT') {
          return res.status(405).json({ error: 'Method not allowed' });
        }
        const { messageId, isRead } = req.body;
        if (!messageId) {
          return res.status(400).json({ error: 'messageId is required' });
        }
        const result = await mailHandler.markAsRead(messageId, isRead !== false);
        if (!result.success) {
          console.error('markAsRead error:', result.error);
          return res.status(500).json({ error: result.error });
        }
        return res.status(200).json({ success: true });
      }

      // PUT /api/mail/star
      case 'star': {
        if (req.method !== 'PUT') {
          return res.status(405).json({ error: 'Method not allowed' });
        }
        const { messageId, isStarred } = req.body;
        if (!messageId) {
          return res.status(400).json({ error: 'messageId is required' });
        }
        const result = await mailHandler.markAsStarred(messageId, isStarred !== false);
        if (!result.success) {
          console.error('markAsStarred error:', result.error);
          return res.status(500).json({ error: result.error });
        }
        return res.status(200).json({ success: true });
      }

      // GET /api/mail/search?q=X&folderId=Y&limit=50&start=0
      case 'search': {
        if (req.method !== 'GET') {
          return res.status(405).json({ error: 'Method not allowed' });
        }
        const query = req.query.q as string;
        if (!query) {
          return res.status(400).json({ error: 'q (query) is required' });
        }
        const params = {
          query,
          folderId: req.query.folderId as string,
          limit: parseInt(req.query.limit as string || '50', 10),
          start: parseInt(req.query.start as string || '0', 10)
        };
        const result = await mailHandler.searchMessages(params);
        if (!result.success) {
          console.error('searchMessages error:', result.error);
          return res.status(500).json({ error: result.error });
        }
        return res.status(200).json({ messages: result.messages });
      }

      // GET /api/mail/attachment/:messageId/:attachmentId
      case 'attachment': {
        if (req.method !== 'GET') {
          return res.status(405).json({ error: 'Method not allowed' });
        }
        const messageId = pathSegments[1];
        const attachmentId = pathSegments[2];
        if (!messageId || !attachmentId) {
          return res.status(400).json({ error: 'messageId and attachmentId are required' });
        }
        const result = await mailHandler.getAttachment(messageId, attachmentId);
        if (!result.success || !result.content) {
          console.error('getAttachment error:', result.error);
          return res.status(500).json({ error: result.error });
        }
        
        // Stream the attachment
        res.setHeader('Content-Type', result.contentType || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="attachment"`);
        return res.status(200).send(Buffer.from(result.content));
      }

      default:
        return res.status(404).json({ error: `Mail endpoint not found: ${endpoint}` });
    }
  } catch (error: any) {
    console.error('Mail API error:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
}
