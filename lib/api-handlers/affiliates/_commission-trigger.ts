import type { SupabaseClient } from '@supabase/supabase-js';
import { sendAffiliateEmail } from './_emails.js';

export interface CommissionTriggerInput {
  email: string;
  source: 'photo_order' | 'booking' | 'stripe' | 'event_ticket';
  sourceId: string;
  grossAmount: number;
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
}

/**
 * Idempotent: writes a pending commission for a referred customer, plus MLM
 * earnings, when an order/booking is paid. Safe to call multiple times — the
 * underlying RPC checks for an existing (source, source_id) row.
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
  };

  // Send commission_earned email (deduped by commission id)
  if (isNew && row.commission_id) {
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
