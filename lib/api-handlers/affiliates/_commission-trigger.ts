import type { SupabaseClient } from '@supabase/supabase-js';
import { sendAffiliateEmail } from './_emails.js';
import { ADMIN_EMAILS } from '../_admin-auth.js';

export interface CommissionTriggerInput {
  email: string;
  /**
   * Written straight through to `affiliate_commissions.source` by the
   * `register_referral_conversion` RPC, so this union must stay a subset of
   * that column's CHECK constraint:
   *   paypal | fourthwall | local | stripe | photo_order | booking |
   *   event_ticket | prodigi_order
   * Listed here are the values callers actually pass; `prodigi_order` was
   * being passed by both webhook handlers while missing from this union.
   */
  source: 'photo_order' | 'booking' | 'stripe' | 'event_ticket' | 'prodigi_order';
  sourceId: string;
  /** What the customer paid. */
  grossAmount: number;
  /**
   * What the sale cost us. Every share is a percentage of PROFIT
   * (grossAmount - cost), never of gross. See jobCostForInvoice /
   * jobCostForBooking for services.
   */
  cost?: number;
  /** When the sale happened — dates the King Midas day. Defaults to now. */
  saleAt?: string | null;
  /**
   * Attach an existing hand-entered commission (order_id null) to this sale
   * instead of writing a second one. The RPC refuses if its amount differs
   * from what this sale computes.
   */
  adoptCommissionId?: string | null;
  userId?: string | null;
  /**
   * If a `?ref=CODE` cookie was present at checkout but the customer hasn't
   * been associated with that affiliate yet, pass it to lazily create the tie.
   */
  fallbackAffiliateCode?: string | null;
}

export interface CommissionTriggerResult {
  triggered: boolean;
  reason?: string;
  affiliateId?: string;
  commissionId?: string;
  amount?: number;
  /** The rest of the split, as written by the RPC (new commissions only). */
  breakdown?: {
    profit: number;
    mlmLevel1: number;
    mlmLevel2: number;
    kingMidas: number;
    secretSanta: number;
    points: number;
  };
}

const money = (v: unknown) => Math.round((Number(v) || 0) * 100) / 100;

/**
 * Owner decision, 2026-11-05: the owner is paid 10% of what the company keeps
 * on every booked service and every merch sale, on top of any affiliate share
 * or King Midas winnings he earns like anyone else. The base is the job's
 * profit AFTER the affiliate program takes its cut: profit − 42% − MLM − King
 * Midas 8% − Secret Santa 3%. With no referrer, nothing is taken and the base
 * is the whole profit. Whoever shoots it: on a crew job the photographer's 80%
 * is the cost, so the profit is the house's 20% and the 10% comes after the
 * splits on that. Gallery sales the same way (a crew photographer's 97% is the
 * cost). Merch is every merch channel: Prodigi prints (through the split), the
 * site shop — the owner's own TLAU merch, screen printing to come
 * (finalizeShopOrder; no affiliate split runs there yet, so the base is the
 * whole profit) and Fourthwall until it is retired (its own webhook). Event
 * tickets for events the owner created. Street nights pay 10% of the night
 * through recordFieldSale (no split there).
 */
export const OWNER_CUT_RATE = 0.10;
const OWNER_CUT_SOURCES: ReadonlyArray<string> = ['booking', 'prodigi_order', 'photo_order', 'shop', 'fourthwall', 'event_ticket'];

/**
 * Queue the owner's 10% as an `owner_pay` admin job, once per sale (the
 * idempotency key refuses a second insert). Never throws: a missed queue is
 * logged, never allowed to break the payment webhook that called it.
 */
/** Was this ticket order for an event the owner created? Unknown → no. */
async function isOwnersEvent(supabase: SupabaseClient, eventOrderId: string): Promise<boolean> {
  const { data: order } = await supabase.from('event_orders').select('event_id').eq('id', eventOrderId).maybeSingle();
  if (!order?.event_id) return false;
  const { data: event } = await supabase.from('events').select('owner_id').eq('id', order.event_id).maybeSingle();
  if (!event?.owner_id) return false;
  const { data: user } = await supabase.auth.admin.getUserById(event.owner_id);
  const email = user?.user?.email?.toLowerCase();
  return !!email && ADMIN_EMAILS.includes(email);
}

export async function queueOwnerCut(
  supabase: SupabaseClient,
  input: { source: string; sourceId: string },
  base: number
): Promise<void> {
  if (!OWNER_CUT_SOURCES.includes(input.source)) return;
  const amount = money(Math.max(0, base) * OWNER_CUT_RATE);
  if (!(amount > 0)) return;
  // Tickets count only for events the owner created (events.owner_id is his
  // admin login); another organizer's event is theirs.
  if (input.source === 'event_ticket' && !(await isOwnersEvent(supabase, input.sourceId))) return;
  const { error } = await supabase.from('admin_jobs').insert({
    action: 'owner_pay',
    payload: { amount, source: input.source, sourceId: input.sourceId, base: money(base) },
    requested_by: 'commission-trigger',
    note: `Owner pay 10% of $${money(base).toFixed(2)} kept (${input.source} ${input.sourceId})`,
    idempotency_key: `owner-cut-${input.source}-${input.sourceId}`,
  });
  if (error && error.code !== '23505') console.error('[commission-trigger] owner cut not queued:', error.message);
}

/**
 * Cost of a job billed on an invoice: `job_cost` when recorded (a job the
 * owner shot himself has a cost but no contractor), else the contractor's
 * payout. Selected with `*` so a missing column reads as "not recorded"
 * rather than failing the query.
 */
export function jobCostOfInvoice(invoice: Record<string, any> | null | undefined): number {
  if (!invoice) return 0;
  if (invoice.job_cost !== null && invoice.job_cost !== undefined) return money(invoice.job_cost);
  return money(invoice.contractor_payout);
}

export async function jobCostForInvoice(supabase: SupabaseClient, invoiceId: string): Promise<number> {
  const { data } = await supabase.from('invoices').select('*').eq('id', invoiceId).maybeSingle();
  return jobCostOfInvoice(data);
}

/**
 * Cost of a booked job. A booking carries a quote and then a final invoice;
 * the final copies the quote's contractor fields and the quote is zeroed when
 * superseded, so take the largest rather than summing them.
 */
export async function jobCostForBooking(supabase: SupabaseClient, bookingId: string): Promise<number> {
  const { data } = await supabase.from('invoices').select('*').eq('booking_id', bookingId);
  return (data || [])
    .filter((inv: any) => inv.status !== 'superseded')
    .reduce((max: number, inv: any) => Math.max(max, jobCostOfInvoice(inv)), 0);
}

/**
 * The one commission path. When an order/booking is paid, the
 * `register_referral_conversion` RPC writes — in one transaction — the
 * affiliate's 42%, MLM 2%/1%, King Midas daily profit, Secret Santa 3%, reward
 * points and counters, all on profit. Services are payable at once; physical
 * products (prodigi_order) are held 30 days. Idempotent on (source, source_id).
 *
 * If `fallbackAffiliateCode` is provided and no customer tie exists, we'll
 * create the tie before invoking the RPC (matches the legacy
 * calculate-commission flow for first-time referrals).
 */
export async function triggerReferralCommission(
  supabase: SupabaseClient,
  input: CommissionTriggerInput
): Promise<CommissionTriggerResult> {
  const { email, source, sourceId, grossAmount, userId, fallbackAffiliateCode } = input;
  // null lets the RPC read a booking's cost off its invoices.
  const cost = input.cost === undefined || input.cost === null ? null : Math.max(0, money(input.cost));

  if (!email || !sourceId || !Number.isFinite(grossAmount) || grossAmount <= 0) {
    return { triggered: false, reason: 'invalid_input' };
  }

  // Lazily create a customer tie if we have a fallback code and no existing tie
  if (fallbackAffiliateCode) {
    const { data: existingCustomer } = await supabase
      .from('affiliate_customers')
      .select('id')
      .ilike('email', email)
      .maybeSingle();

    if (!existingCustomer) {
      const code = fallbackAffiliateCode.trim().toUpperCase();
      const { data: aff } = await supabase
        .from('affiliates')
        .select('id, code, affiliate_code')
        .or(`code.eq.${code},affiliate_code.eq.${code}`)
        .eq('status', 'active')
        .maybeSingle();
      if (aff?.id) {
        await supabase.from('affiliate_customers').insert({
          email: email.toLowerCase(),
          user_id: userId || null,
          referred_by_affiliate_id: aff.id,
        });
      }
    }
  }

  const { data, error } = await supabase.rpc('register_referral_conversion', {
    p_email: email,
    p_source: source,
    p_source_id: sourceId,
    p_gross_amount: grossAmount,
    p_user_id: userId || null,
    p_cost: cost,
    p_sale_at: input.saleAt || null,
    p_adopt_commission_id: input.adoptCommissionId || null,
  });

  if (error) {
    console.error('[commission-trigger] RPC failed:', error.message);
    return { triggered: false, reason: error.message };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || !row.affiliate_id) {
    // No referrer: no share is taken, so the company keeps the whole profit.
    await queueOwnerCut(supabase, input, grossAmount - (cost ?? 0));
    return { triggered: false, reason: 'no_referrer' };
  }

  const isNew = row.is_new === true;
  const result: CommissionTriggerResult = {
    triggered: isNew,
    affiliateId: row.affiliate_id,
    commissionId: row.commission_id,
    amount: row.commission_amount ? Number(row.commission_amount) : undefined,
    reason: isNew ? undefined : 'already_recorded',
    breakdown: isNew
      ? {
          profit: money(row.profit),
          mlmLevel1: money(row.mlm_level1),
          mlmLevel2: money(row.mlm_level2),
          kingMidas: money(row.king_midas),
          secretSanta: money(row.secret_santa),
          points: Number(row.points) || 0,
        }
      : undefined,
  };

  // What the company keeps after the program's shares. Only on the first
  // record: a webhook retry (already_recorded) was queued the first time.
  if (isNew && result.breakdown) {
    const b = result.breakdown;
    await queueOwnerCut(
      supabase,
      input,
      b.profit - (result.amount ?? 0) - b.mlmLevel1 - b.mlmLevel2 - b.kingMidas - b.secretSanta
    );
  }

  // Send commission_earned email (deduped by commission id)
  if (isNew && row.commission_id && !input.adoptCommissionId) {
    try {
      const { data: aff } = await supabase
        .from('affiliates')
        .select('user_id')
        .eq('id', row.affiliate_id)
        .single();
      if (aff?.user_id) {
        const { data: userData } = await supabase.auth.admin.getUserById(aff.user_id);
        const recipient = userData?.user?.email;
        if (recipient) {
          await sendAffiliateEmail({
            type: 'commission_earned',
            affiliateId: row.affiliate_id,
            referenceId: row.commission_id,
            to: recipient,
            data: {
              amount: result.amount,
              grossAmount,
              profit: result.breakdown?.profit,
              source,
            },
          });
        }
      }
    } catch (emailErr: any) {
      console.warn('[commission-trigger] email failed:', emailErr?.message);
    }
  }

  return result;
}

/**
 * Run the split for an invoice that just became fully paid by any route —
 * the same call the Stripe webhook makes, so a balance paid by Venmo, cash or
 * Apple Pay and recorded by hand splits exactly like one paid by card. A
 * booking invoice splits on the booking (whole project), a standalone invoice
 * on itself. Idempotent: a second call finds the first record.
 */
export async function triggerSettledInvoiceSplit(
  supabase: SupabaseClient,
  invoiceId: string
): Promise<CommissionTriggerResult> {
  const { data: invoice } = await supabase
    .from('invoices').select('id, status, booking_id, paid_at').eq('id', invoiceId).maybeSingle();
  if (!invoice) return { triggered: false, reason: 'invoice_not_found' };
  if (invoice.status !== 'paid') return { triggered: false, reason: 'invoice_not_paid' };
  if (!invoice.booking_id) return triggerInvoiceCommission(supabase, invoice.id);

  const { data: booking } = await supabase
    .from('bookings').select('id, email, total_amount_cents, affiliate_code').eq('id', invoice.booking_id).maybeSingle();
  const grossAmount = (Number(booking?.total_amount_cents) || 0) / 100;
  if (!booking?.email || !(grossAmount > 0)) return { triggered: false, reason: 'booking_incomplete' };
  return triggerReferralCommission(supabase, {
    email: booking.email,
    source: 'booking',
    sourceId: booking.id,
    grossAmount,
    cost: await jobCostForBooking(supabase, booking.id),
    saleAt: invoice.paid_at || null,
    fallbackAffiliateCode: booking.affiliate_code || null,
  });
}

/**
 * Run the split for a paid standalone invoice (no booking) — a job booked by
 * phone and billed with create-invoice / direct-booking. Booking invoices go
 * through the booking path instead, keyed on the booking id, so a job is
 * never counted twice.
 */
export async function triggerInvoiceCommission(
  supabase: SupabaseClient,
  invoiceId: string,
  opts: { adoptCommissionId?: string | null } = {}
): Promise<CommissionTriggerResult> {
  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, clients(email)')
    .eq('id', invoiceId)
    .maybeSingle();
  if (!invoice) return { triggered: false, reason: 'invoice_not_found' };
  if (invoice.booking_id) return { triggered: false, reason: 'booking_invoice' };
  if (invoice.status !== 'paid') return { triggered: false, reason: 'invoice_not_paid' };

  const email = (invoice as any).clients?.email;
  if (!email) return { triggered: false, reason: 'no_client_email' };

  return triggerReferralCommission(supabase, {
    email,
    source: 'booking',
    sourceId: invoice.id,
    grossAmount: money(invoice.total),
    cost: jobCostOfInvoice(invoice),
    saleAt: invoice.paid_at || null,
    adoptCommissionId: opts.adoptCommissionId || null,
  });
}
