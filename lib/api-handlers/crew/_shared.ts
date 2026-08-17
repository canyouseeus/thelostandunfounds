import type { VercelRequest } from '@vercel/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Crew payouts: money owed to someone who *worked* a booking.
 *
 * Deliberately separate from `affiliate_commissions`. An affiliate commission
 * is paid for sending business in; a crew payout is paid for doing the job.
 * Filing shoot pay as commission would put it on the affiliate leaderboard,
 * into the King Midas pot and onto the affiliate's lifetime earnings; three
 * numbers that are supposed to describe referral performance, not wages.
 *
 * The two do share one thing: the person's Stripe Connect account. Nobody
 * should onboard to Stripe twice for the same platform, so if a contractor is
 * also an affiliate we reuse the account the affiliate flow already created.
 */

export const ADMIN_EMAILS = ['thelostandunfounds@gmail.com', 'admin@thelostandunfounds.com'];

export function isAdmin(req: VercelRequest): boolean {
  if (req.headers['x-admin-secret'] && req.headers['x-admin-secret'] === process.env.ADMIN_SECRET) {
    return true;
  }
  const email = ((req.headers['x-admin-email'] as string) || '').toLowerCase();
  if (ADMIN_EMAILS.includes(email)) return true;
  const host = req.headers.host || '';
  return host.includes('localhost') || host.includes('127.0.0.1');
}

/**
 * Prove the caller is the owner, from a token rather than a claim.
 *
 * `isAdmin` above trusts an `x-admin-email` header, which the caller sets. That
 * is fine for reading the roster; it is not fine for a route that mails the
 * whole crew from Joshua's own address. Anyone who guessed the path could send
 * repeatedly, and the domain being burned is the one that also carries client
 * invoices.
 *
 * So this verifies the Supabase session server-side and checks the returned
 * email against the admin list, the same way `api/admin/sage-request.ts` does
 * for the route that can write to the repository.
 */
export async function resolveVerifiedAdmin(req: VercelRequest): Promise<string | null> {
  const identity = await resolveIdentity(req);
  if (!identity?.email) return null;
  return ADMIN_EMAILS.includes(identity.email) ? identity.email : null;
}

export function isCronAuthorized(req: VercelRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const provided = (req.headers['x-cron-secret'] as string) || (req.query?.secret as string);
  if (provided && provided === expected) return true;
  // Vercel's own scheduler signs cron invocations with the deployment secret.
  const auth = (req.headers.authorization as string) || '';
  return auth === `Bearer ${expected}`;
}

/**
 * Resolve the caller from a verified Supabase JWT.
 *
 * Every crew route that hands back access to someone's money must prove who is
 * asking. The `x-admin-email` header the older admin routes use is
 * caller-supplied and cannot do that, so these routes verify the session token
 * with Supabase and look the contractor up from the returned user id only,
 * never from a request body a caller controls.
 */
export async function resolveUserId(req: VercelRequest): Promise<string | null> {
  const identity = await resolveIdentity(req);
  return identity?.id || null;
}

/**
 * The verified session behind a request; id, email, and whether that email has
 * actually been confirmed.
 *
 * `resolveUserId` throws the last two away, which is fine when all you need is
 * a foreign key. Claiming a roster row needs more: see `resolveCrewMember`.
 */
export async function resolveIdentity(
  req: VercelRequest
): Promise<{ id: string; email: string | null; emailVerified: boolean } | null> {
  const authHeader = (req.headers.authorization as string) || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return null;

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const { data, error } = await createClient(url, key).auth.getUser(token);
  if (error || !data.user?.id) return null;

  return {
    id: data.user.id,
    email: data.user.email?.toLowerCase().trim() || null,
    // Google OAuth sets this; so does a confirmed email signup. An account
    // created with an address the holder never proved they own does not.
    emailVerified: Boolean(data.user.email_confirmed_at || data.user.confirmed_at),
  };
}

/**
 * Find the roster row for a signed-in person, linking it on first sight.
 *
 * `photographers.user_id` is only populated when somebody happened to be
 * invited through a flow that set it. In practice most of the roster was typed
 * in by the owner and the column is null, so a photographer who signs up later
 *, with the exact address the owner used, logs in and is told they are not on
 * the roster. Their kit, their payouts and their calendar are all sitting there
 * under a row nothing connects them to.
 *
 * So: look up by `user_id` first, and fall back to matching the verified email.
 * The match claims the row by writing `user_id`, which is what makes it a
 * one-time repair rather than a lookup that has to run forever.
 *
 * The claim is gated on a **verified** email for the obvious reason; an
 * unverified signup with somebody else's address would otherwise walk straight
 * into their earnings. It is also gated on the row being unclaimed: an existing
 * `user_id` is never overwritten, so this can't move a roster entry between
 * accounts.
 */
export async function resolveCrewMember(
  supabase: SupabaseClient,
  req: VercelRequest,
  fields = 'id, name, email, active'
): Promise<{ photographer: any; userId: string } | null> {
  const identity = await resolveIdentity(req);
  if (!identity) return null;

  const { data: linked } = await supabase
    .from('photographers')
    .select(fields)
    .eq('user_id', identity.id)
    .maybeSingle();
  if (linked) return { photographer: linked, userId: identity.id };

  if (!identity.email || !identity.emailVerified) return null;

  const { data: byEmail } = await supabase
    .from('photographers')
    .select(fields)
    .ilike('email', identity.email)
    .is('user_id', null)
    .maybeSingle();
  if (!byEmail) return null;

  // Claim it. A failure here is not fatal; the caller still gets their row,
  // and the next request retries the link.
  const { error } = await supabase
    .from('photographers')
    .update({ user_id: identity.id })
    .eq('id', (byEmail as any).id)
    .is('user_id', null);
  if (error) console.warn('[crew] could not link roster row to user:', error.message);

  return { photographer: byEmail, userId: identity.id };
}

export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key, { auth: { persistSession: false } });
}

export const toMoney = (value: unknown) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
};

/** Days a payout waits after the client pays, so the funds have settled. */
export function holdDays(): number {
  const raw = Number(process.env.CREW_PAYOUT_HOLD_DAYS);
  return Number.isFinite(raw) && raw >= 0 ? raw : 2;
}

export interface PhotographerRow {
  id: string;
  name: string;
  email: string;
  user_id: string | null;
  stripe_account_id: string | null;
  payout_pct: number | string;
}

export const PHOTOGRAPHER_SELECT = 'id, name, email, user_id, stripe_account_id, payout_pct';

/**
 * Find the Stripe Connect account to pay a contractor on.
 *
 * Prefers the id stored on `photographers`, then falls back to the affiliate
 * record for the same person: most of the crew signed up as affiliates first
 * and already finished Stripe onboarding there. Returns null (rather than
 * throwing) so a payout can be accrued and shown on their dashboard before
 * they have connected anything; the transfer is what needs the account, not
 * the ledger entry.
 */
export async function resolveConnectAccount(
  supabase: SupabaseClient,
  photographer: Pick<PhotographerRow, 'id' | 'user_id' | 'stripe_account_id' | 'email'>
): Promise<{ accountId: string | null; payoutsEnabled: boolean }> {
  if (photographer.stripe_account_id) {
    return { accountId: photographer.stripe_account_id, payoutsEnabled: true };
  }
  if (!photographer.user_id) return { accountId: null, payoutsEnabled: false };

  const { data: affiliate } = await supabase
    .from('affiliates')
    .select('stripe_account_id, stripe_payouts_enabled')
    .eq('user_id', photographer.user_id)
    .maybeSingle();

  if (!affiliate?.stripe_account_id) return { accountId: null, payoutsEnabled: false };

  // Mirror it onto the photographer row so later payouts skip this lookup.
  await supabase
    .from('photographers')
    .update({ stripe_account_id: affiliate.stripe_account_id })
    .eq('id', photographer.id);

  return {
    accountId: affiliate.stripe_account_id,
    payoutsEnabled: Boolean(affiliate.stripe_payouts_enabled),
  };
}

/**
 * Accrue a contractor's share of a client payment.
 *
 * Called when an invoice payment is recorded. The contractor's cut is
 * proportional to how much of the invoice the client just paid; a 50% deposit
 * on a $300 job with a $240 contractor split accrues $120 now and $120 when the
 * balance lands. That mirrors how the money actually arrives, so we never owe
 * out more than has come in.
 *
 * Idempotent on `invoice_payment_id` (unique index): a replayed Stripe webhook
 * cannot accrue the same payment twice.
 */
export async function accrueCrewPayout(
  supabase: SupabaseClient,
  args: {
    invoiceId: string;
    invoicePaymentId?: string | null;
    amountPaid: number;
    paidAt?: string;
  }
): Promise<{ accrued: boolean; amount?: number; reason?: string; availableAt?: string; photographer?: PhotographerRow }> {
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, invoice_number, booking_id, total, contractor_payout, contractor_name, description')
    .eq('id', args.invoiceId)
    .maybeSingle();

  if (!invoice) return { accrued: false, reason: 'invoice_not_found' };

  const contractorTotal = toMoney(invoice.contractor_payout);
  const invoiceTotal = toMoney(invoice.total);
  if (contractorTotal <= 0) return { accrued: false, reason: 'no_contractor_split' };
  if (invoiceTotal <= 0) return { accrued: false, reason: 'invoice_total_zero' };

  // Match the contractor by name recorded on the invoice, else the default.
  let photographer: PhotographerRow | null = null;
  if (invoice.contractor_name) {
    const { data } = await supabase
      .from('photographers')
      .select(PHOTOGRAPHER_SELECT)
      .ilike('name', invoice.contractor_name)
      .maybeSingle();
    photographer = (data as PhotographerRow) || null;
  }
  if (!photographer) {
    const { data } = await supabase
      .from('photographers')
      .select(PHOTOGRAPHER_SELECT)
      .eq('is_default', true)
      .eq('active', true)
      .maybeSingle();
    photographer = (data as PhotographerRow) || null;
  }
  if (!photographer) return { accrued: false, reason: 'no_contractor_matched' };

  const share = Math.min(1, toMoney(args.amountPaid) / invoiceTotal);
  const amount = toMoney(contractorTotal * share);
  if (amount <= 0) return { accrued: false, reason: 'zero_share' };

  const paidAt = args.paidAt ? new Date(args.paidAt) : new Date();
  const availableAt = new Date(paidAt.getTime() + holdDays() * 24 * 60 * 60 * 1000);

  const { accountId } = await resolveConnectAccount(supabase, photographer);

  const { error } = await supabase.from('crew_payouts').insert({
    photographer_id: photographer.id,
    user_id: photographer.user_id,
    invoice_id: invoice.id,
    invoice_payment_id: args.invoicePaymentId || null,
    booking_id: invoice.booking_id,
    description:
      `${invoice.invoice_number || 'Invoice'}: ${invoice.description || 'photography job'}`.slice(0, 300),
    amount,
    status: 'pending',
    available_at: availableAt.toISOString(),
    stripe_account_id: accountId,
  });

  if (error) {
    // 23505 = the unique index caught a replayed webhook. Not a failure.
    if ((error as any).code === '23505') return { accrued: false, reason: 'already_accrued' };
    throw error;
  }

  // The caller needs these to tell the photographer what is coming and when.
  return { accrued: true, amount, availableAt: availableAt.toISOString(), photographer };
}
