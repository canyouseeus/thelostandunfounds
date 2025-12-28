/**
 * Script to create admin user
 * Run this script to set up admin@thelostandunfounds.com as an admin
 * 
 * Usage:
 * 1. First, sign up admin@thelostandunfounds.com through the app
 * 2. Then run this script with: npx tsx scripts/create-admin-user.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env.local') });
dotenv.config({ path: join(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Error: Missing Supabase credentials');
  console.error('Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createAdminUser() {
  const adminEmail = 'admin@thelostandunfounds.com';
  
  console.log(`\n🔐 Setting up admin user: ${adminEmail}\n`);

  try {
    // Step 1: Check if user exists
    console.log('Step 1: Checking if user exists...');
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      throw listError;
    }

    const existingUser = existingUsers.users.find(u => u.email === adminEmail);
    
    if (!existingUser) {
      console.log(`❌ User ${adminEmail} does not exist.`);
      console.log(`\n📝 Please do the following:`);
      console.log(`   1. Go to your app and sign up with email: ${adminEmail}`);
      console.log(`   2. Set a password during signup`);
      console.log(`   3. Run this script again to grant admin privileges\n`);
      return;
    }

    console.log(`✅ User found: ${existingUser.id}`);

    // Step 2: Set user as admin in user_roles table
    console.log('\nStep 2: Granting admin privileges...');
    const { data, error } = await supabase
      .from('user_roles')
      .upsert({
        user_id: existingUser.id,
        email: adminEmail,
        is_admin: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })
      .select();

    if (error) {
      console.error('Error setting admin role:', error);
      throw error;
    }

    console.log('✅ Admin privileges granted!');

    // Step 3: Update user metadata
    console.log('\nStep 3: Updating user metadata...');
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      existingUser.id,
      {
        user_metadata: {
          role: 'admin',
          is_admin: true,
        },
      }
    );

    if (updateError) {
      console.warn('Warning: Could not update user metadata:', updateError);
    } else {
      console.log('✅ User metadata updated!');
    }

    console.log(`\n✅ Success! ${adminEmail} is now an admin user.`);
    console.log(`\nYou can now:`);
    console.log(`   - Log in with ${adminEmail}`);
    console.log(`   - Access the admin dashboard at /admin`);
    console.log(`\n`);

  } catch (error) {
    console.error('\n❌ Error creating admin user:', error);
    process.exit(1);
  }
}

// Run the script
createAdminUser();

