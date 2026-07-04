/**
 * One-shot script: insert product_costs rows for the real service catalog
 * (photography, web dev, bundles, kiosk) so affiliate commissions can be
 * calculated on actual profit. Mirrors supabase/migrations/20260703000000_seed_service_product_costs.sql
 *
 * Run: node scripts/seed-service-product-costs.mjs
 */
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const envContent = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const m = line.match(/^([^#=\s]+)\s*=\s*"?([^"]*)"?\s*$/);
  if (m) env[m[1]] = m[2];
}

const SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const ROWS = [
  // Photography (~10% cost — memory cards, editing software allocation, gear wear)
  { product_id: 'photo-portrait', cost: 25 },
  { product_id: 'photo-event', cost: 60 },
  { product_id: 'photo-halfday', cost: 80 },
  { product_id: 'photo-fullday', cost: 140 },
  // Web development (~15% cost — template/stock licenses, hosting setup)
  { product_id: 'webdev-starter', cost: 225 },
  { product_id: 'webdev-professional', cost: 525 },
  { product_id: 'webdev-agency', cost: 900 },
  { product_id: 'webdev-maintenance', cost: 30 },
  // Bundles (~10% cost, blended across the web + photo components)
  { product_id: 'bundle-launch', cost: 250 },
  { product_id: 'bundle-brand', cost: 500 },
  // Kiosk build (~15% cost — software licensing, misc supplies; hardware billed separately)
  { product_id: 'kiosk-build', cost: 375 },
];

let created = 0;
let updated = 0;

for (const row of ROWS) {
  const { data: existing, error: findErr } = await supabase
    .from('product_costs')
    .select('id')
    .eq('product_id', row.product_id)
    .eq('source', 'local')
    .is('variant_id', null)
    .maybeSingle();

  if (findErr) {
    console.error(`Lookup failed for ${row.product_id}:`, findErr.message);
    continue;
  }

  if (existing) {
    const { error: updateErr } = await supabase
      .from('product_costs')
      .update({ cost: row.cost, product_type: 'digital' })
      .eq('id', existing.id);
    if (updateErr) {
      console.error(`Update failed for ${row.product_id}:`, updateErr.message);
    } else {
      updated++;
      console.log(`Updated ${row.product_id} -> $${row.cost}`);
    }
  } else {
    const { error: insertErr } = await supabase
      .from('product_costs')
      .insert({ product_id: row.product_id, variant_id: null, source: 'local', cost: row.cost, product_type: 'digital' });
    if (insertErr) {
      console.error(`Insert failed for ${row.product_id}:`, insertErr.message);
    } else {
      created++;
      console.log(`Created ${row.product_id} -> $${row.cost}`);
    }
  }
}

console.log(`\nDone. Created ${created}, updated ${updated} of ${ROWS.length} rows.`);
