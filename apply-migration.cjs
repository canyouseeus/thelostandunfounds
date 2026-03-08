
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
    const sqlPath = path.join(process.cwd(), 'sql/create-banner-marketplace-tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Applying migration...');

    // Note: Standard Supabase client doesn't have a 'query' method.
    // We'll try to use a little-known trick or we might need to use 'postgres' library if available.
    // Actually, I'll just use the supabase CLI if I can find it, or assume the user will apply it 
    // if I can't. But let's try to find if there's an 'exec' RPC already.

    const { data, error } = await supabase.rpc('exec', { sql_query: sql });
    if (error) {
        if (error.message.includes('function "exec" does not exist')) {
            console.error('No "exec" RPC found. Please apply sql/add-rsvps-and-dynamic-pricing.sql manually in Supabase SQL Editor.');
        } else {
            console.error('Migration error:', error);
        }
    } else {
        console.log('Migration applied successfully!');
    }
}

applyMigration();
