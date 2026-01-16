require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function checkOrders() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing env vars');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
        .from('photo_orders')
        .select('*')
        .eq('payment_status', 'completed')
        .limit(5);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Orders found:', data.length);
        if (data.length > 0) {
            console.log('Sample email:', data[0].email);
            console.log('Order ID:', data[0].id);
        }
    }
}

checkOrders();
