
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugOrder(orderId: string) {
    console.log(`Debugging Order: ${orderId}`);

    // 1. Fetch Order
    const { data: order, error: orderError } = await supabase
        .from('photo_orders')
        .select('*')
        .or(`id.eq.${orderId},paypal_order_id.eq.${orderId}`)
        .maybeSingle();

    if (orderError) {
        console.error('Error fetching order:', orderError);
        return;
    }

    if (!order) {
        console.error('Order not found!');
        return;
    }

    console.log('Order Found:', {
        id: order.id,
        paypal_order_id: order.paypal_order_id,
        status: order.payment_status,
        email: order.email,
        metadata: order.metadata
    });

    // 2. Fetch Entitlements
    const { data: entitlements, error: entError } = await supabase
        .from('photo_entitlements')
        .select('*, photos(id, title, google_drive_file_id)')
        .eq('order_id', order.id);

    if (entError) {
        console.error('Error fetching entitlements:', entError);
        return;
    }

    console.log(`Entitlements Found: ${entitlements?.length}`);
    if (entitlements && entitlements.length > 0) {
        entitlements.forEach((e, i) => {
            console.log(`[${i}] Token: ${e.token}, Expires: ${e.expires_at}, Photo:`, e.photos);
        });
    } else {
        console.log('No entitlements found for this order.');
    }
}

// Order ID from the screenshot
const targetOrderId = '86f3bf98-73ba-409b-9f96-761a3c4fba57';
debugOrder(targetOrderId);
