import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUSPICIOUS_NEW_CUSTOMERS_PER_IP_HOUR = 3;

function getIp(req: VercelRequest): string | null {
  const forwarded = req.headers['x-forwarded-for'] as string | undefined;
  return (
    forwarded?.split(',')[0]?.trim() ||
    (req as any).socket?.remoteAddress ||
    null
  );
}

async function logFraud(
  supabase: SupabaseClient,
  affiliateId: string,
  eventType: string,
  ip: string | null,
  details: Record<string, any>,
  severity: number
) {
  try {
    await supabase.from('affiliate_fraud_events').insert({
      affiliate_id: affiliateId,
      event_type: eventType,
      severity,
      ip_address: ip,
      details,
    });
    const { data: aff } = await supabase
      .from('affiliates')
      .select('fraud_score, is_flagged')
      .eq('id', affiliateId)
      .single();
    const newScore = (aff?.fraud_score || 0) + severity;
    const updates: Record<string, any> = { fraud_score: newScore };
    if (newScore >= 10 && !aff?.is_flagged) {
      updates.is_flagged = true;
      updates.flag_reason = `Fraud score reached ${newScore} (${eventType})`;
    }
    await supabase.from('affiliates').update(updates).eq('id', affiliateId);
  } catch { /* non-fatal */ }
}

/**
 * Track a customer for an affiliate (lifetime tie)
 * POST /api/affiliates/track-customer
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }
  const supabase = createClient(supabaseUrl, supabaseKey);
  const ip = getIp(req);

  try {
    const { email, user_id, affiliate_code } = req.body;

    if (!email || !affiliate_code) {
      return res.status(400).json({ error: 'Email and affiliate_code required' });
    }

    const { data: existingCustomer } = await supabase
      .from('affiliate_customers')
      .select('*, affiliates!affiliate_customers_referred_by_affiliate_id_fkey(code, affiliate_code)')
      .ilike('email', email)
      .maybeSingle();

    if (existingCustomer) {
      const linkedCode =
        existingCustomer.affiliates?.code ||
        existingCustomer.affiliates?.affiliate_code;
      return res.status(200).json({
        success: true,
        existing: true,
        customer: existingCustomer,
        message: `Customer already tied to affiliate ${linkedCode}`,
      });
    }

    const code = String(affiliate_code).trim().toUpperCase();
    const { data: affiliate, error: affErr } = await supabase
      .from('affiliates')
      .select('id, code, affiliate_code, is_flagged')
      .or(`code.eq.${code},affiliate_code.eq.${code}`)
      .maybeSingle();

    if (affErr || !affiliate) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }

    if (affiliate.is_flagged) {
      return res.status(403).json({ error: 'Affiliate account is under review' });
    }

    // Suspicious-pattern check: same IP creating multiple new customers for
    // the same affiliate in the last hour → fraud event (severity 3).
    if (ip) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from('affiliate_fraud_events')
        .select('id', { count: 'exact', head: true })
        .eq('affiliate_id', affiliate.id)
        .eq('event_type', 'new_customer_from_ip')
        .eq('ip_address', ip)
        .gte('created_at', oneHourAgo);

      const newCount = (count ?? 0) + 1;
      await logFraud(
        supabase,
        affiliate.id,
        'new_customer_from_ip',
        ip,
        { email, hourly_count: newCount },
        newCount >= SUSPICIOUS_NEW_CUSTOMERS_PER_IP_HOUR ? 3 : 1
      );
    }

    const { data: newCustomer, error: createError } = await supabase
      .from('affiliate_customers')
      .insert({
        email: email.toLowerCase(),
        user_id: user_id || null,
        referred_by_affiliate_id: affiliate.id,
      })
      .select('*, affiliates!affiliate_customers_referred_by_affiliate_id_fkey(code, affiliate_code)')
      .single();

    if (createError) {
      console.error('[track-customer] insert failed:', createError);
      return res.status(500).json({ error: 'Failed to create customer tie' });
    }

    const linkedCode = affiliate.code || affiliate.affiliate_code;

    return res.status(201).json({
      success: true,
      existing: false,
      customer: newCustomer,
      message: `Customer tied to affiliate ${linkedCode} forever`,
    });
  } catch (error: any) {
    console.error('[track-customer] error:', error?.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
