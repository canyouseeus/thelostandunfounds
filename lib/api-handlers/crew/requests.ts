import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, resolveCrewMember, isAdmin } from './_shared.js';
import { sendTransactionalEmail } from '../_resend-email-handler.js';
import { EMAIL_STYLES } from '../../email-template.js';

/**
 * The roster's ask-box: a photographer types a question or a request on their
 * dashboard and it lands in the owner's inbox with a row behind it.
 *
 * This is the crew-facing cousin of admin SAGE MODE, and it deliberately stops
 * short of what that does. SAGE MODE opens a GitHub issue straight away because
 * the person clicking it owns the repository. These come from contractors, so
 * they get triaged first: the row is the durable record, the email is the nudge,
 * and turning one into an issue stays a decision the owner makes.
 *
 * The point is that the answer to "who do I ask about this?" stops being "text
 * Josh and hope". A request typed here has a timestamp, a status and a reply
 * the photographer can see on the same page they asked from.
 *
 * Auth is a verified Supabase JWT; the photographer is resolved from the
 * token, so `name`, `email` and `photographer_id` on the row are all
 * server-derived and a caller cannot file a request as somebody else.
 *
 *   GET   /api/crew/requests            → the caller's own requests
 *   GET   /api/crew/requests?admin=1    → admin: everything, newest first
 *   POST  /api/crew/requests            → file one { kind, message, pageUrl }
 *   PATCH /api/crew/requests            → admin: { id, status, reply }
 */

const OWNER_INBOX = process.env.ADMIN_NOTIFICATION_EMAIL || 'admin@thelostandunfounds.com';

// media@ is the business address of record for photographer coordination, so
// the thread stays on file there even when the reply goes to one person.
const BUSINESS_RECORD_CC = 'media@thelostandunfounds.com';

const KINDS = ['question', 'feature', 'issue', 'gear', 'booking', 'payment', 'other'] as const;
const STATUSES = ['open', 'in_progress', 'answered', 'closed'] as const;

const KIND_LABEL: Record<string, string> = {
  question: 'Question',
  feature: 'Feature request',
  issue: 'Something broken',
  gear: 'Gear',
  booking: 'Bookings & scheduling',
  payment: 'Getting paid',
  other: 'Other',
};

const MAX_MESSAGE = 4000;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** The roster row behind a verified session, or null. */
async function resolvePhotographer(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  req: VercelRequest
) {
  const resolved = await resolveCrewMember(supabase, req, 'id, name, email');
  return resolved ? { ...resolved.photographer, user_id: resolved.userId } : null;
}

/**
 * Tell the owner a request came in.
 *
 * Best-effort by design: the row is already saved by the time this runs, so a
 * mail failure must not make a successfully-filed request look rejected to the
 * photographer. The API reports which happened via `notified`.
 */
async function notifyOwner(request: {
  name: string;
  email: string;
  kind: string;
  message: string;
  pageUrl: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const content = `
    <h1 style="${EMAIL_STYLES.heading1}">CREW REQUEST</h1>
    <p style="${EMAIL_STYLES.paragraph}">
      <strong>${escapeHtml(request.name)}</strong> sent this from their photographer dashboard.
    </p>
    <p style="${EMAIL_STYLES.paragraph}">
      <strong>Type:</strong> ${escapeHtml(KIND_LABEL[request.kind] || request.kind)}<br />
      <strong>From:</strong> ${escapeHtml(request.email)}
      ${request.pageUrl ? `<br /><strong>Page:</strong> ${escapeHtml(request.pageUrl)}` : ''}
    </p>
    <hr style="${EMAIL_STYLES.divider}" />
    <p style="${EMAIL_STYLES.paragraph}">${escapeHtml(request.message).replace(/\n/g, '<br />')}</p>
    <p style="${EMAIL_STYLES.paragraph}">
      <a href="https://www.thelostandunfounds.com/admin" style="${EMAIL_STYLES.button}">OPEN THE DASHBOARD</a>
    </p>
    <p style="${EMAIL_STYLES.muted}">
      Replying to this email reaches ${escapeHtml(request.email)} directly. Marking it answered in
      the admin roster is what closes it out on their dashboard.
    </p>
  `;

  try {
    const result = await sendTransactionalEmail({
      to: OWNER_INBOX,
      cc: BUSINESS_RECORD_CC,
      replyTo: request.email,
      subject: `Crew request from ${request.name}; ${KIND_LABEL[request.kind] || request.kind}`,
      content,
    });
    return { success: result.success, error: result.error };
  } catch (err: any) {
    return { success: false, error: err?.message || 'notification failed' };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const supabase = getSupabaseAdmin();

  try {
    // ── Admin: the whole queue ──────────────────────────────────────────
    if (req.method === 'GET' && req.query?.admin) {
      if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });

      const status = String(req.query?.status || '');
      let query = supabase
        .from('crew_requests')
        .select('id, photographer_id, name, email, kind, message, status, admin_reply, replied_at, page_url, created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      if ((STATUSES as readonly string[]).includes(status)) query = query.eq('status', status);

      const { data, error } = await query;
      if (error) return res.status(500).json({ error: error.message });

      return res.status(200).json({
        requests: data || [],
        openCount: (data || []).filter((r) => r.status === 'open').length,
      });
    }

    // ── Photographer: their own history ─────────────────────────────────
    if (req.method === 'GET') {
      const photographer = await resolvePhotographer(supabase, req);
      if (!photographer) return res.status(401).json({ error: 'Sign in to see your requests.' });

      const { data } = await supabase
        .from('crew_requests')
        .select('id, kind, message, status, admin_reply, replied_at, created_at')
        .eq('photographer_id', photographer.id)
        .order('created_at', { ascending: false })
        .limit(50);

      return res.status(200).json({ requests: data || [] });
    }

    if (req.method === 'POST') {
      const photographer = await resolvePhotographer(supabase, req);
      if (!photographer) return res.status(401).json({ error: 'Sign in to send a request.' });

      const message = String(req.body?.message || '').trim().slice(0, MAX_MESSAGE);
      if (!message) return res.status(400).json({ error: 'Type what you need first.' });

      const rawKind = String(req.body?.kind || 'question').toLowerCase();
      const kind = (KINDS as readonly string[]).includes(rawKind) ? rawKind : 'other';
      const pageUrl = String(req.body?.pageUrl || '').trim().slice(0, 500) || null;

      const { data: saved, error } = await supabase
        .from('crew_requests')
        .insert({
          photographer_id: photographer.id,
          user_id: photographer.user_id,
          name: photographer.name,
          email: photographer.email,
          kind,
          message,
          page_url: pageUrl,
        })
        .select('id, kind, message, status, created_at')
        .single();

      if (error) return res.status(500).json({ error: error.message });

      const notified = await notifyOwner({
        name: photographer.name,
        email: photographer.email,
        kind,
        message,
        pageUrl,
      });
      if (!notified.success) {
        console.warn('[crew/requests] owner notification failed:', notified.error);
      }

      return res.status(201).json({ success: true, request: saved, notified: notified.success });
    }

    // ── Admin: reply / change status ────────────────────────────────────
    if (req.method === 'PATCH') {
      if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });

      const id = String(req.body?.id || '');
      if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'valid id required' });

      const update: Record<string, unknown> = {};
      const rawStatus = String(req.body?.status || '');
      if ((STATUSES as readonly string[]).includes(rawStatus)) update.status = rawStatus;

      if (typeof req.body?.reply === 'string') {
        update.admin_reply = req.body.reply.trim().slice(0, MAX_MESSAGE) || null;
        update.replied_at = new Date().toISOString();
        // A reply without an explicit status is an answer.
        if (!update.status) update.status = 'answered';
      }

      if (!Object.keys(update).length) {
        return res.status(400).json({ error: 'Nothing to update; send status or reply.' });
      }

      const { data, error } = await supabase
        .from('crew_requests')
        .update(update)
        .eq('id', id)
        .select('id, status, admin_reply, replied_at')
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true, request: data });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('[crew/requests]', err);
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
}
