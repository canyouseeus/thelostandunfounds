import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase credentials')
  return createClient(url, key)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const {
      client_name, client_email, client_phone, date_of_birth,
      emergency_contact, medical_conditions, signature_data,
      agreed_to_terms, newsletter_opt_in, artist_id,
    } = req.body

    if (!client_name?.trim())
      return res.status(400).json({ error: 'Full name is required.' })
    if (!client_email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client_email))
      return res.status(400).json({ error: 'A valid email address is required.' })
    if (!agreed_to_terms)
      return res.status(400).json({ error: 'You must agree to the terms.' })
    if (!date_of_birth)
      return res.status(400).json({ error: 'Date of birth is required.' })

    // Age check — must be 18+
    const dob = new Date(date_of_birth)
    const today = new Date()
    const age = today.getFullYear() - dob.getFullYear() -
      (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0)
    if (age < 18)
      return res.status(400).json({ error: 'You must be at least 18 years old.' })

    const supabase = getSupabase()

    const { data: biz, error: bizErr } = await supabase
      .from('businesses')
      .select('id')
      .eq('slug', 'kattitude')
      .maybeSingle()

    if (bizErr || !biz) {
      console.error('[waiver] Business lookup failed:', bizErr)
      return res.status(500).json({ error: 'Studio configuration error. Please contact us directly.' })
    }

    const { data: waiver, error: insertErr } = await supabase
      .from('waivers')
      .insert({
        business_id: biz.id,
        artist_id: artist_id || null,
        client_name: client_name.trim(),
        client_email: client_email.trim().toLowerCase(),
        client_phone: client_phone?.trim() || null,
        date_of_birth,
        emergency_contact: emergency_contact?.trim() || null,
        medical_conditions: medical_conditions?.trim() || null,
        signature_data: signature_data || null,
        agreed_to_terms: true,
        newsletter_opt_in: newsletter_opt_in === true,
      })
      .select('id')
      .single()

    if (insertErr) {
      console.error('[waiver] Insert failed:', insertErr)
      return res.status(500).json({ error: 'Failed to save waiver. Please try again.' })
    }

    if (newsletter_opt_in) {
      try {
        await supabase
          .from('newsletter_subscribers')
          .upsert(
            { email: client_email.trim().toLowerCase(), source: 'kattitude_waiver' },
            { onConflict: 'email', ignoreDuplicates: true }
          )
      } catch (err) {
        console.warn('[waiver] Newsletter upsert failed:', err)
      }
    }

    return res.status(200).json({ success: true, waiver_id: waiver.id })
  } catch (err: any) {
    console.error('[waiver] Unexpected error:', err)
    return res.status(500).json({ error: 'Server error. Please try again or contact us directly.' })
  }
}
