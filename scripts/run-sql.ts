/**
 * SQL Script Executor
 * Executes SQL scripts against Supabase database
 * 
 * Usage: npx tsx scripts/run-sql.ts <path-to-sql-file>
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: join(process.cwd(), '.env.local') });
dotenv.config({ path: join(process.cwd(), '.env') });

async function executeSQL() {
  const sqlFile = process.argv[2];
  
  if (!sqlFile) {
    console.error('Usage: npx tsx scripts/run-sql.ts <path-to-sql-file>');
    process.exit(1);
  }

  try {
    // Read SQL file
    const sql = readFileSync(sqlFile, 'utf-8');
    
    // Get Supabase credentials
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase credentials');
      console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
      process.exit(1);
    }

    console.log(`📄 Executing SQL from: ${sqlFile}`);
    console.log(`🔗 Connecting to: ${supabaseUrl.substring(0, 30)}...`);

    // Create Supabase client with service role key for admin operations
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Use Supabase Management API to execute SQL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!serviceRoleKey) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required for SQL execution');
      console.error('💡 Tip: Run this SQL directly in Supabase SQL Editor instead');
      process.exit(1);
    }

    // Execute SQL via Management API
    const projectRef = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1];
    
    if (!projectRef) {
      console.error('❌ Could not extract project reference from Supabase URL');
      console.error('💡 Tip: Run this SQL directly in Supabase SQL Editor instead');
      process.exit(1);
    }

    console.log('📤 Sending SQL to Supabase Management API...');
    
    try {
      const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: sql,
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        console.error('❌ SQL execution failed:', result.error || result.message || 'Unknown error');
        console.error('💡 Tip: Run this SQL directly in Supabase SQL Editor instead');
        process.exit(1);
      }

      console.log('✅ SQL executed successfully!');
      if (result.data) {
        console.log('📊 Result:', JSON.stringify(result.data, null, 2));
      }
    } catch (err: any) {
      console.error('❌ Failed to execute SQL:', err.message);
      console.error('💡 Tip: Run this SQL directly in Supabase SQL Editor instead');
      console.error('\n📋 SQL file location:', sqlFile);
      console.error('   Copy the contents and paste into Supabase SQL Editor');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Failed to execute SQL:', error.message);
    console.error('\n💡 Tip: Run this SQL directly in Supabase SQL Editor instead');
    process.exit(1);
  }
}

executeSQL();

