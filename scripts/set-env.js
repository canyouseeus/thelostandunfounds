#!/usr/bin/env node

/**
 * Set Environment Variables Script
 * Usage: node scripts/set-env.js KEY=value KEY2=value2
 *    or: node scripts/set-env.js (interactive mode)
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ENV_FILE = '.env.local';
const EXAMPLE_FILE = '.env.example';

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function setEnvVar(key, value, filePath) {
  let content = '';
  
  // Read existing file or create from example
  if (fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, 'utf8');
  } else if (fs.existsSync(EXAMPLE_FILE)) {
    content = fs.readFileSync(EXAMPLE_FILE, 'utf8');
    console.log(`Created ${ENV_FILE} from ${EXAMPLE_FILE}`);
  }

  // Check if key exists
  const keyRegex = new RegExp(`^${key}=.*$`, 'm');
  
  if (keyRegex.test(content)) {
    // Update existing key
    content = content.replace(keyRegex, `${key}=${value}`);
    console.log(`✓ Updated ${key}`);
  } else {
    // Add new key
    content += `\n${key}=${value}\n`;
    console.log(`✓ Added ${key}`);
  }

  fs.writeFileSync(filePath, content);
}

async function interactiveMode() {
  console.log('Setting up environment variables...\n');

  // Supabase URL
  const supabaseUrl = await question('Supabase URL [VITE_SUPABASE_URL]: ');
  if (supabaseUrl.trim()) {
    setEnvVar('VITE_SUPABASE_URL', supabaseUrl.trim(), ENV_FILE);
  }

  // Supabase Anon Key
  const supabaseAnonKey = await question('Supabase Anon Key [VITE_SUPABASE_ANON_KEY]: ');
  if (supabaseAnonKey.trim()) {
    setEnvVar('VITE_SUPABASE_ANON_KEY', supabaseAnonKey.trim(), ENV_FILE);
  }

  // Supabase Service Role Key
  const supabaseServiceKey = await question('Supabase Service Role Key [SUPABASE_SERVICE_ROLE_KEY] (optional): ');
  if (supabaseServiceKey.trim()) {
    setEnvVar('SUPABASE_SERVICE_ROLE_KEY', supabaseServiceKey.trim(), ENV_FILE);
  }

  // Turnstile Site Key
  const turnstileKey = await question('Cloudflare Turnstile Site Key [VITE_TURNSTILE_SITE_KEY] (optional): ');
  if (turnstileKey.trim()) {
    setEnvVar('VITE_TURNSTILE_SITE_KEY', turnstileKey.trim(), ENV_FILE);
  }

  rl.close();
  console.log(`\n✓ Environment variables set in ${ENV_FILE}`);
  console.log('Note: Make sure .env.local is in your .gitignore');
}

function commandLineMode() {
  const args = process.argv.slice(2);
  
  args.forEach(arg => {
    const [key, ...valueParts] = arg.split('=');
    const value = valueParts.join('=');
    
    if (key && value) {
      setEnvVar(key, value, ENV_FILE);
    } else {
      console.error(`Invalid format: ${arg}. Use KEY=value`);
    }
  });
}

// Main
if (process.argv.length > 2) {
  commandLineMode();
} else {
  interactiveMode();
}
