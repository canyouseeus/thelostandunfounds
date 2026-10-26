// Technical support tickets — affiliates, photographers, clients, anyone.
//
// A ticket is a row in `tickets` with a thread in `ticket_messages`. Every
// ticket carries an unguessable `access_key`; /support/ticket/<key> shows the
// thread and takes replies, so someone without an account can follow theirs
// from the email link. Logged-in users also see their tickets listed on their
// dashboard.
//
// All writes happen here with the service role. The tables' RLS only grants
// reads (own tickets, and admins), never inserts from the browser.
//
// Notifications go to support@, the company support inbox. Mail to the person who
// opened the ticket goes to them alone.
import type { VercelRequest } from '@vercel/node';
import { createServiceSupabaseClient, type ServiceSupabaseClient } from './_supabase-admin-client.js';
import { sendTransactionalEmail } from './_resend-email-handler.js';
import { verifyAdmin } from './_admin-auth.js';

const SITE = 'https://www.thelostandunfounds.com';
const SUPPORT_NOTIFY_EMAIL = 'support@thelostandunfounds.com';

export const ROLES = ['affiliate', 'photographer', 'client', 'other'] as const;
export const CATEGORIES = [
    'Account & login',
    'Payouts & payments',
    'Affiliate links & tracking',
    'Galleries & uploads',
    'Bookings & scheduling',
    'Something is broken',
    'General question',
] as const;
const STATUSES = ['open', 'in_progress', 'resolved', 'closed'] as const;

// A person can open a handful of tickets an hour; past that it is a script.
const MAX_TICKETS_PER_HOUR = 5;
const MAX_SUBJECT = 160;
const MAX_BODY = 8000;

export class HttpError extends Error {
    status: number;
    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

export function createServiceClient() {
    return createServiceSupabaseClient();
}

export function ticketRef(n: number | null | undefined): string {
    return `SUP-${String(n ?? 0).padStart(4, '0')}`;
}

function ticketUrl(key: string): string {
    return `${SITE}/support/ticket/${key}`;
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function paragraphs(text: string): string {
    return escapeHtml(text).replace(/\n/g, '<br>');
}

function clean(value: unknown, max: number): string {
    return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The verified user behind a bearer token, or null. A bad token is not an error here. */
async function optionalUser(req: VercelRequest, supabase: ServiceSupabaseClient) {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return null;
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return null;
    return data.user;
}

async function requireUser(req: VercelRequest, supabase: ServiceSupabaseClient) {
    const user = await optionalUser(req, supabase);
    if (!user) throw new HttpError(401, 'Sign in to see your tickets.');
    return user;
}

export async function requireAdmin(req: VercelRequest) {
    if (!(await verifyAdmin(req))) throw new HttpError(401, 'Not authorized');
}

/** What the platform already knows the person is, so the form doesn't have to ask. */
async function detectRole(supabase: ServiceSupabaseClient, userId: string): Promise<string | null> {
    const [photographer, affiliate] = await Promise.all([
        supabase.from('photographers').select('id').eq('user_id', userId).limit(1),
        supabase.from('affiliates').select('id').eq('user_id', userId).limit(1),
    ]);
    if (photographer.data?.length) return 'photographer';
    if (affiliate.data?.length) return 'affiliate';
    return null;
}

const TICKET_FIELDS =
    'id, ticket_number, name, email, role, category, subject, description, status, priority, page_url, user_agent, created_at, updated_at, last_message_at, last_message_by, access_key';

// --- Emails ---

function messageBlock(label: string, text: string): string {
    return `
        <p style="color:rgba(255,255,255,0.6);font-size:12px;letter-spacing:0.15em;margin:0 0 8px 0;text-align:left;">${escapeHtml(label)}</p>
        <p style="color:#ffffff;font-size:16px;line-height:1.6;margin:0 0 24px 0;text-align:left;">${paragraphs(text)}</p>
    `;
}

function button(href: string, label: string): string {
    return `<p style="margin:0 0 24px 0;"><a href="${href}" style="display:inline-block;padding:14px 28px;background-color:#ffffff;color:#000000;text-decoration:none;font-weight:bold;font-size:16px;">${label}</a></p>`;
}

async function notifyCompany(ticket: any, heading: string, label: string, text: string) {
    const who = [ticket.name, ticket.email].filter(Boolean).join(' · ');
    const meta = [ticket.role?.toUpperCase(), ticket.category].filter(Boolean).join(' · ');
    const content = `
        <h1 style="color:#ffffff;font-size:28px;font-weight:bold;margin:0 0 20px 0;letter-spacing:0.1em;">${heading}</h1>
        <p style="color:#ffffff;font-size:16px;line-height:1.6;margin:0 0 8px 0;text-align:left;"><strong>${ticketRef(ticket.ticket_number)} — ${escapeHtml(ticket.subject)}</strong></p>
        <p style="color:rgba(255,255,255,0.7);font-size:14px;line-height:1.6;margin:0 0 24px 0;text-align:left;">${escapeHtml(who)}${meta ? `<br>${escapeHtml(meta)}` : ''}</p>
        ${messageBlock(label, text)}
        ${ticket.page_url ? `<p style="color:rgba(255,255,255,0.6);font-size:13px;line-height:1.5;margin:0 0 24px 0;text-align:left;">Sent from: ${escapeHtml(ticket.page_url)}</p>` : ''}
        ${button(`${SITE}/admin?panel=support&ticket=${ticket.id}`, 'OPEN IN THE DASHBOARD')}
    `;
    const result = await sendTransactionalEmail({
        to: SUPPORT_NOTIFY_EMAIL,
        subject: `[${ticketRef(ticket.ticket_number)}] ${heading === 'NEW SUPPORT TICKET' ? 'New' : 'Reply'}: ${ticket.subject}`,
        content,
    });
    if (!result.success) console.error('[support] Company notification failed:', result.error);
    return result.success;
}

async function emailRequester(ticket: any, heading: string, intro: string, label?: string, text?: string) {
    if (!ticket.email) return false;
    const content = `
        <h1 style="color:#ffffff;font-size:28px;font-weight:bold;margin:0 0 20px 0;letter-spacing:0.1em;">${heading}</h1>
        <p style="color:#ffffff;font-size:16px;line-height:1.6;margin:0 0 20px 0;text-align:left;">${ticket.name ? `Hi ${escapeHtml(ticket.name)},<br><br>` : ''}${intro}</p>
        ${label && text ? messageBlock(label, text) : ''}
        ${button(ticketUrl(ticket.access_key), 'VIEW YOUR TICKET')}
        <p style="color:rgba(255,255,255,0.6);font-size:14px;line-height:1.5;margin:0;text-align:left;">Reply on that page, or just reply to this email. Keep the link to yourself: anyone with it can read the ticket.</p>
    `;
    // Sent as support@ (a send-as alias on the Zoho mailbox) so hitting Reply
    // in a mail app comes back to the support inbox.
    const result = await sendTransactionalEmail({
        to: ticket.email,
        from: SUPPORT_NOTIFY_EMAIL,
        subject: `[${ticketRef(ticket.ticket_number)}] ${ticket.subject}`,
        content,
    });
    if (!result.success) console.error('[support] Requester email failed:', result.error);
    return result.success;
}

// --- Public / user ---

export async function createTicket(req: VercelRequest, supabase: ServiceSupabaseClient) {
    const body = req.body || {};

    // Honeypot: a field people never see. Bots fill it; pretend it worked.
    if (clean(body.website, 200)) return { ok: true };

    const user = await optionalUser(req, supabase);
    const email = (user?.email || clean(body.email, 254)).toLowerCase();
    const name = clean(body.name, 120) || (user?.user_metadata?.full_name as string) || '';
    const subject = clean(body.subject, MAX_SUBJECT);
    const description = clean(body.description, MAX_BODY);
    const category = CATEGORIES.includes(body.category) ? body.category : 'General question';

    if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Enter an email address we can reply to.');
    if (!subject) throw new HttpError(400, 'Add a subject.');
    if (description.length < 10) throw new HttpError(400, 'Tell us a little more about what is happening.');

    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .eq('email', email)
        .gte('created_at', since);
    if ((count || 0) >= MAX_TICKETS_PER_HOUR) {
        throw new HttpError(429, 'You have opened several tickets in the last hour. Reply on an existing one, or try again later.');
    }

    const detected = user ? await detectRole(supabase, user.id) : null;
    const role = detected || (ROLES.includes(body.role) ? body.role : 'other');

    const { data: ticket, error } = await supabase
        .from('tickets')
        .insert({
            user_id: user?.id || null,
            email,
            name: name || null,
            role,
            category,
            subject,
            description,
            page_url: clean(body.page_url, 500) || null,
            user_agent: clean(req.headers['user-agent'], 500) || null,
            last_message_by: 'user',
        })
        .select(TICKET_FIELDS)
        .single();
    if (error || !ticket) throw new HttpError(500, error?.message || 'Could not open the ticket.');

    const [notified, confirmed] = await Promise.all([
        notifyCompany(ticket, 'NEW SUPPORT TICKET', 'WHAT THEY SAID', description),
        emailRequester(
            ticket,
            'WE GOT YOUR REQUEST',
            `Your ticket is <strong>${ticketRef(ticket.ticket_number)}</strong>. We'll reply by email, and the whole conversation stays on the ticket page.`,
        ),
    ]);

    return {
        ok: true,
        ticket: { ref: ticketRef(ticket.ticket_number), key: ticket.access_key, url: ticketUrl(ticket.access_key) },
        notified,
        confirmed,
    };
}

export async function listMyTickets(req: VercelRequest, supabase: ServiceSupabaseClient) {
    const user = await requireUser(req, supabase);
    const email = (user.email || '').toLowerCase();
    const confirmed = Boolean(user.email_confirmed_at || (user as any).confirmed_at);

    // Tickets opened while logged out still belong to the person, but only
    // match on email once that email is confirmed.
    let query = supabase
        .from('tickets')
        .select('ticket_number, subject, category, status, created_at, last_message_at, last_message_by, access_key')
        .order('last_message_at', { ascending: false })
        .limit(50);
    query = confirmed && email
        ? query.or(`user_id.eq.${user.id},email.eq.${email}`)
        : query.eq('user_id', user.id);

    const { data, error } = await query;
    if (error) throw new HttpError(500, error.message);
    return {
        tickets: (data || []).map(t => ({
            ref: ticketRef(t.ticket_number),
            subject: t.subject,
            category: t.category,
            status: t.status,
            created_at: t.created_at,
            last_message_at: t.last_message_at,
            awaiting_you: t.last_message_by === 'admin' && t.status !== 'resolved' && t.status !== 'closed',
            key: t.access_key,
        })),
    };
}

async function ticketByKey(supabase: ServiceSupabaseClient, key: string) {
    if (!/^[a-f0-9]{36}$/.test(key)) throw new HttpError(404, 'Ticket not found');
    const { data, error } = await supabase.from('tickets').select(TICKET_FIELDS).eq('access_key', key).maybeSingle();
    if (error) throw new HttpError(500, error.message);
    if (!data) throw new HttpError(404, 'Ticket not found');
    return data;
}

async function threadFor(supabase: ServiceSupabaseClient, ticketId: string, includeInternal: boolean) {
    let query = supabase
        .from('ticket_messages')
        .select('id, author, author_name, message, is_internal, created_at')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });
    if (!includeInternal) query = query.or('is_internal.is.null,is_internal.eq.false');
    const { data, error } = await query;
    if (error) throw new HttpError(500, error.message);
    return data || [];
}

export async function getThread(supabase: ServiceSupabaseClient, key: string) {
    const t = await ticketByKey(supabase, key);
    return {
        ticket: {
            ref: ticketRef(t.ticket_number),
            subject: t.subject,
            category: t.category,
            status: t.status,
            name: t.name,
            description: t.description,
            created_at: t.created_at,
        },
        messages: (await threadFor(supabase, t.id, false)).map(m => ({
            id: m.id,
            author: m.author,
            author_name: m.author === 'admin' ? 'THE LOST+UNFOUNDS' : m.author_name,
            message: m.message,
            created_at: m.created_at,
        })),
    };
}

export async function userReply(req: VercelRequest, supabase: ServiceSupabaseClient) {
    const key = clean(req.body?.key, 64);
    const message = clean(req.body?.message, MAX_BODY);
    if (!message) throw new HttpError(400, 'Write a reply first.');
    const t = await ticketByKey(supabase, key);
    if (t.status === 'closed') throw new HttpError(409, 'This ticket is closed. Open a new one and mention ' + ticketRef(t.ticket_number) + '.');

    const user = await optionalUser(req, supabase);
    const { error } = await supabase.from('ticket_messages').insert({
        ticket_id: t.id,
        user_id: user?.id || null,
        author: 'user',
        author_name: t.name || t.email,
        message,
    });
    if (error) throw new HttpError(500, error.message);

    // A reply on a resolved ticket means it wasn't resolved.
    const now = new Date().toISOString();
    await supabase
        .from('tickets')
        .update({ last_message_at: now, last_message_by: 'user', updated_at: now, ...(t.status === 'resolved' ? { status: 'open' } : {}) })
        .eq('id', t.id);

    await notifyCompany(t, 'NEW REPLY ON A TICKET', 'THEY WROTE', message);
    return getThread(supabase, key);
}

// --- Admin ---

export async function adminList(supabase: ServiceSupabaseClient, status: string) {
    let query = supabase
        .from('tickets')
        .select('id, ticket_number, name, email, role, category, subject, status, priority, created_at, last_message_at, last_message_by')
        .order('last_message_at', { ascending: false })
        .limit(200);
    if (status === 'active') query = query.in('status', ['open', 'in_progress']);
    else if (STATUSES.includes(status as any)) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw new HttpError(500, error.message);
    return { tickets: (data || []).map(t => ({ ...t, ref: ticketRef(t.ticket_number) })) };
}

async function ticketById(supabase: ServiceSupabaseClient, id: string) {
    const { data, error } = await supabase.from('tickets').select(TICKET_FIELDS).eq('id', id).maybeSingle();
    if (error) throw new HttpError(500, error.message);
    if (!data) throw new HttpError(404, 'Ticket not found');
    return data;
}

export async function adminThread(supabase: ServiceSupabaseClient, id: string) {
    const t = await ticketById(supabase, id);
    return { ticket: { ...t, ref: ticketRef(t.ticket_number) }, messages: await threadFor(supabase, t.id, true) };
}

export async function adminReply(supabase: ServiceSupabaseClient, body: any) {
    const t = await ticketById(supabase, clean(body?.id, 64));
    const message = clean(body?.message, MAX_BODY);
    const internal = Boolean(body?.internal);
    if (!message) throw new HttpError(400, 'Write a reply first.');
    const nextStatus = STATUSES.includes(body?.status) ? body.status : (t.status === 'open' ? 'in_progress' : t.status);

    const { error } = await supabase.from('ticket_messages').insert({
        ticket_id: t.id,
        author: 'admin',
        author_name: 'THE LOST+UNFOUNDS',
        message,
        is_internal: internal,
    });
    if (error) throw new HttpError(500, error.message);

    const now = new Date().toISOString();
    await supabase
        .from('tickets')
        .update({
            status: internal ? t.status : nextStatus,
            updated_at: now,
            ...(internal ? {} : { last_message_at: now, last_message_by: 'admin' }),
        })
        .eq('id', t.id);

    // Internal notes stay in the dashboard.
    const emailed = internal
        ? false
        : await emailRequester(
            t,
            nextStatus === 'resolved' ? 'YOUR TICKET IS RESOLVED' : 'WE REPLIED TO YOUR TICKET',
            nextStatus === 'resolved'
                ? `We've marked <strong>${ticketRef(t.ticket_number)}</strong> resolved. If it isn't, reply on the ticket page and it reopens.`
                : `There's a reply on <strong>${ticketRef(t.ticket_number)}</strong>.`,
            'OUR REPLY',
            message,
        );

    return { ...(await adminThread(supabase, t.id)), emailed };
}

export async function adminSetStatus(supabase: ServiceSupabaseClient, body: any) {
    const status = body?.status;
    if (!STATUSES.includes(status)) throw new HttpError(400, 'Unknown status');
    const t = await ticketById(supabase, clean(body?.id, 64));
    const { error } = await supabase
        .from('tickets')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', t.id);
    if (error) throw new HttpError(500, error.message);
    return adminThread(supabase, t.id);
}
