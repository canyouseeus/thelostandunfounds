
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load envs
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkOrder() {
    const orderId = '5MF67410CU6953335';
    console.log(`Checking order: ${orderId}`);

    // Check by paypal_order_id
    const { data: byPaypalId, error: err1 } = await supabase
        .from('photo_orders')
        .select('*')
        .eq('paypal_order_id', orderId);

    if (byPaypalId && byPaypalId.length > 0) {
        console.log('Found by PayPal ID:', JSON.stringify(byPaypalId, null, 2));
        return;
    }

    // Check by ID (if it was somehow stored as the main ID, though unlikely for that format)
    const { data: byId, error: err2 } = await supabase
        .from('photo_orders')
        .select('*')
        .eq('id', orderId) // This will likely fail if id is UUID and this string is not
        .maybeSingle();

    if (byId) {
        console.log('Found by ID:', JSON.stringify(byId, null, 2));
        return;
    }

    // Check recent orders to see if we have any pending ones that might match
    const { data: recent, error: err3 } = await supabase
        .from('photo_orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    console.log('No direct match found. Recent 5 orders:', JSON.stringify(recent, null, 2));
}

checkOrder();
