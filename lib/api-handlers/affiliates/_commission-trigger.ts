import type { SupabaseClient } from '@supabase/supabase-js';
import { sendAffiliateEmail } from './_emails.js';

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
  const cost = Math.max(0, money(input.cost));

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
