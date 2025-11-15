#!/usr/bin/env node

/**
 * Setup Fourthwall API Key Script
 * Sets up the API key needed to fetch products from your Fourthwall store
 */

const fs = require('fs');
const readline = require('readline');

const ENV_FILE = '.env.local';
const EXAMPLE_FILE = '.env.example';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function setEnvVar(key, value, filePath) {
  let content = '';
  
  if (fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, 'utf8');
  } else if (fs.existsSync(EXAMPLE_FILE)) {
    content = fs.readFileSync(EXAMPLE_FILE, 'utf8');
    console.log(`Created ${ENV_FILE} from ${EXAMPLE_FILE}`);
  }

  const keyRegex = new RegExp(`^${key}=.*$`, 'm');
  
  if (keyRegex.test(content)) {
    content = content.replace(keyRegex, `${key}=${value}`);
    console.log(`✓ Updated ${key}`);
  } else {
    content += `\n${key}=${value}\n`;
    console.log(`✓ Added ${key}`);
  }

  fs.writeFileSync(filePath, content);
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Fourthwall Shop Integration Setup');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('To fetch products from your Fourthwall store, you need to:');
  console.log('1. Go to: https://thelostandunfounds-shop.fourthwall.com/admin/dashboard/settings/for-developers');
  console.log('2. Find your Storefront Token');
  console.log('3. Copy the token\n');

  const storefrontToken = await question('Fourthwall Storefront Token [FOURTHWALL_STOREFRONT_TOKEN] (optional - press Enter to skip): ');
  
  if (storefrontToken.trim()) {
    setEnvVar('FOURTHWALL_STOREFRONT_TOKEN', storefrontToken.trim(), ENV_FILE);
    console.log('\n✓ Fourthwall Storefront Token configured');
  } else {
    console.log('\n⚠ Skipped Storefront Token setup');
    console.log('Note: The shop will still work but may need the token configured later.');
  }

  const storeSlug = await question('\nStore Slug [FOURTHWALL_STORE_SLUG] (default: thelostandunfounds-shop): ');
  
  if (storeSlug.trim()) {
    setEnvVar('FOURTHWALL_STORE_SLUG', storeSlug.trim(), ENV_FILE);
  } else {
    setEnvVar('FOURTHWALL_STORE_SLUG', 'thelostandunfounds-shop', ENV_FILE);
  }

  rl.close();
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✓ Setup complete!');
  console.log('\nNext steps:');
  console.log('1. Visit your shop at: /shop');
  console.log('2. If products don\'t appear, check the browser console for errors');
  console.log('3. You can also manually import products from Settings → Product Management');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch(console.error);
