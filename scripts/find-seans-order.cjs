require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function checkOrder() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing env vars');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const email = 'seankearney327@gmail.com';
    console.log(`Searching for order with email: ${email}`);

    const { data, error } = await supabase
        .from('photo_orders')
        .select('*')
        .eq('email', email);

    if (error) {
        console.error('Error finding order by email:', error);

        // Try searching by transaction ID from screenshot just in case
        const transactionId = '2K436144T8672853L';
        console.log(`Searching by transaction ID: ${transactionId}`);
        const { data: dataTx, error: errorTx } = await supabase
            .from('photo_orders')
            .select('*')
            .eq('paypal_order_id', transactionId); // Assuming paypal_order_id holds this, or maybe we just check all columns

        if (errorTx) {
            console.error('Error finding by transaction ID:', errorTx);
        } else {
            console.log('Orders found by Transaction ID:', dataTx);
        }

    } else {
        console.log('Orders found:', data);
    }
}

checkOrder();
