
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load envs
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase Credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    const orderId = '86f3bf98-73ba-409b-9f96-761a3c4fba57';
    console.log(`Fixing entitlements for Order ID: ${orderId}`);

    // Set to 48 hours from now
    const newExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
        .from('photo_entitlements')
        .update({ expires_at: newExpiry })
        .eq('order_id', orderId)
        .select();

    if (error) {
        console.error('Update failed:', error);
    } else {
        console.log('Successfully updated entitlements:', data);
    }
}

main();
