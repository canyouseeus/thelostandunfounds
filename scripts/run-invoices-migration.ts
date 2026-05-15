import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing env vars'); process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('Connecting to:', SUPABASE_URL);

  // Check if invoices table exists
  const { data: probe, error: probeErr } = await supabase
    .from('invoices').select('id').limit(1);

  if (probeErr?.code === '42P01') {
    console.error('invoices table does not exist — DDL must be applied via Supabase dashboard or CLI');
    console.log('\nSQL to run in Supabase SQL editor:');
    console.log(`
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  description TEXT,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  invoice_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON invoices
  FOR ALL USING (auth.role() = 'service_role');
`);
    process.exit(1);
  }

  if (probeErr) {
    console.error('Unexpected error:', probeErr);
    process.exit(1);
  }

  console.log('✓ invoices table exists');

  // Check for existing Toke Truck row
  const { data: existing } = await supabase
    .from('invoices')
    .select('id, client_name, amount_cents, status')
    .eq('client_name', 'Toke Truck');

  if (existing && existing.length > 0) {
    console.log('✓ Toke Truck invoice already seeded:', existing[0]);
    return;
  }

  const { data, error } = await supabase
    .from('invoices')
    .insert({
      client_name: 'Toke Truck',
      description: 'Photography services — multi-location shoot, 20 photos + 2 reels',
      amount_cents: 30000,
      status: 'paid',
      invoice_date: '2026-04-18T00:00:00Z',
      paid_at: '2026-04-18T00:00:00Z',
    })
    .select('id, client_name, amount_cents, status')
    .single();

  if (error) { console.error('Insert failed:', error); process.exit(1); }
  console.log('✓ Inserted Toke Truck invoice:', data);
}

run().catch(e => { console.error(e); process.exit(1); });
