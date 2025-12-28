import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Switch commission mode (cash <-> discount)
 * POST /api/affiliates/switch-mode
 * Body: { affiliate_id: string, new_mode: 'cash' | 'discount' }
 * Can only switch once per 30 days
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { affiliate_id, new_mode } = req.body;

    if (!affiliate_id || !new_mode) {
      return res.status(400).json({ error: 'affiliate_id and new_mode required' });
    }

    if (new_mode !== 'cash' && new_mode !== 'discount') {
      return res.status(400).json({ error: 'new_mode must be "cash" or "discount"' });
    }

    // Get affiliate
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('*')
      .eq('id', affiliate_id)
      .single();

    if (affiliateError || !affiliate) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }

    // Check if already in this mode
    if (affiliate.commission_mode === new_mode) {
      return res.status(400).json({ error: `Already in ${new_mode} mode` });
    }

    // Check 30-day limit
    if (affiliate.last_mode_change_date) {
      const lastChange = new Date(affiliate.last_mode_change_date);
      const daysSince = Math.floor((Date.now() - lastChange.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSince < 30) {
        return res.status(403).json({
          error: 'Mode can only be changed once per 30 days',
          days_remaining: 30 - daysSince,
          next_available: new Date(lastChange.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });
      }
    }

    // Update mode
    const { error: updateError } = await supabase
      .from('affiliates')
      .update({
        commission_mode: new_mode,
        last_mode_change_date: new Date().toISOString().split('T')[0] // Just the date
      })
      .eq('id', affiliate_id);

    if (updateError) {
      console.error('Error updating mode:', updateError);
      return res.status(500).json({ error: 'Failed to update mode' });
    }

    // If switching to discount mode, generate discount code
    let discountCode = null;
    if (new_mode === 'discount') {
      const code = `${affiliate.affiliate_code}-EMPLOYEE`;
      
      const { data: existingCode } = await supabase
        .from('affiliate_discount_codes')
        .select('*')
        .eq('affiliate_id', affiliate_id)
        .single();

      if (existingCode) {
        // Reactivate existing code
        await supabase
          .from('affiliate_discount_codes')
          .update({ is_active: true })
          .eq('id', existingCode.id);
        
        discountCode = existingCode.code;
      } else {
        // Create new discount code
        const { data: newCode, error: codeError } = await supabase
          .from('affiliate_discount_codes')
          .insert({
            affiliate_id,
            code,
            discount_percent: 42.00,
            is_active: true
          })
          .select()
          .single();

        if (codeError) {
          console.error('Error creating discount code:', codeError);
        } else {
          discountCode = newCode.code;
        }
      }
    } else {
      // Switching to cash mode - deactivate discount code
      await supabase
        .from('affiliate_discount_codes')
        .update({ is_active: false })
        .eq('affiliate_id', affiliate_id);
    }

    return res.status(200).json({
      success: true,
      mode: new_mode,
      discount_code: discountCode,
      message: `Successfully switched to ${new_mode} mode`,
      next_change_available: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });

  } catch (error) {
    console.error('Switch mode error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


