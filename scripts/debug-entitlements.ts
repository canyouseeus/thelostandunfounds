
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

    console.log(`Checking entitlements for Order ID: ${orderId}`);

    const { data: entitlements, error } = await supabase
        .from('photo_entitlements')
        .select('*')
        .eq('order_id', orderId);

    if (error) {
        console.error('Error fetching entitlements:', error);
        return;
    }

    if (!entitlements || entitlements.length === 0) {
        console.log('No entitlements found for this order.');
        return;
    }

    console.log(`Found ${entitlements.length} entitlements.`);
    entitlements.forEach((ent, index) => {
        console.log(`\nEntitlement #${index + 1}:`);
        console.log(`  ID: ${ent.id}`);
        console.log(`  Token: ${ent.token}`);
        console.log(`  Expires At: ${ent.expires_at}`);
        console.log(`  Created At: ${ent.created_at}`);
        console.log(`  Download Count: ${ent.download_count}`);

        // Check expiration
        const expiresAt = new Date(ent.expires_at);
        const now = new Date();
        const isExpired = expiresAt < now;
        console.log(`  Status: ${isExpired ? 'EXPIRED' : 'VALID'}`);
        console.log(`  Time until expiry: ${(expiresAt.getTime() - now.getTime()) / 1000 / 60 / 60} hours`);
    });
}

main();
