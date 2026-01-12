
import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    const results = {
        supabaseUrl: {
            present: !!supabaseUrl,
            value: supabaseUrl?.substring(0, 20) + '...'
        },
        supabaseServiceKey: {
            present: !!supabaseKey,
            isJwt: supabaseKey?.startsWith('eyJ'),
            length: supabaseKey?.length,
            firstChars: supabaseKey?.substring(0, 10) + '...'
        },
        authTest: {
            status: 'pending',
            error: null as any
        },
        writeTest: {
            status: 'pending',
            error: null as any
        }
    }

    if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ error: 'Missing environment variables', details: results })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    try {
        // Test Read
        const { data: readData, error: readError } = await supabase.from('photos').select('id').limit(1)
        if (readError) throw readError
        results.authTest.status = 'SUCCESS'
    } catch (err: any) {
        results.authTest.status = 'FAILED'
        results.authTest.error = err
    }

    try {
        // Test Write - this specifically tests if SERVICE_ROLE_KEY is bypassing RLS
        const testId = 'HEALTH-CHECK-' + Date.now()
        const { error: writeError } = await supabase.from('photo_orders').insert({
            email: 'health-check@example.com',
            total_amount_cents: 0,
            paypal_order_id: testId,
            payment_status: 'pending'
        })

        if (writeError) throw writeError
        results.writeTest.status = 'SUCCESS'

        // Cleanup
        await supabase.from('photo_orders').delete().eq('paypal_order_id', testId)
    } catch (err: any) {
        results.writeTest.status = 'FAILED'
        results.writeTest.error = err
    }

    return res.status(200).json(results)
}
