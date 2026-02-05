
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getPaypalOrderId() {
    const orderId = '248c2227-d136-4354-a73a-b23239b62254';

    const { data: order, error } = await supabase
        .from('photo_orders')
        .select('paypal_order_id, total_amount_cents, email, created_at')
        .eq('id', orderId)
        .single();

    if (error) {
        console.error('Error fetching order:', error);
        process.exit(1);
    }

    if (order) {
        console.log(`Supabase Order ID: ${orderId}`);
        console.log(`PayPal Order ID: ${order.paypal_order_id}`);
        console.log(`Amount: $${order.total_amount_cents / 100}`);
        console.log(`Email: ${order.email}`);
    } else {
        console.error('Order not found');
    }
}

getPaypalOrderId().catch(console.error);
