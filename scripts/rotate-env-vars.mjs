#!/usr/bin/env node
/**
 * rotate-env-vars.mjs
 *
 * Interactive script to rotate Vercel environment variables.
 * Prompts for each flagged variable, pushes updates to Vercel via API,
 * triggers a redeploy, and verifies the site is healthy afterward.
 *
 * Usage: node scripts/rotate-env-vars.mjs
 *
 * Requires: VERCEL_TOKEN env var or --token flag
 *           (Generate at https://vercel.com/account/tokens)
 */

import * as readline from 'node:readline';

const PROJECT_ID = 'prj_6AFga8ibmQFfKL5zP5qsRu1q8RkT';
const TEAM_ID = 'team_mb29bMintz7Ffd29VRICdhGx';
const BASE_URL = 'https://api.vercel.com';

// All variables that need attention, grouped by service
const FLAGGED_VARS = [
  // Zoho (email delivery - critical for checkout emails)
  { name: 'ZOHO_REFRESH_TOKEN', service: 'Zoho', envs: ['production', 'preview'], lastUpdated: '2025-12-11', critical: true, note: 'OAuth refresh token — regenerate at https://api-console.zoho.com/' },
  { name: 'ZOHO_CLIENT_SECRET', service: 'Zoho', envs: ['production', 'preview'], lastUpdated: '2025-11-14', critical: true, note: 'Zoho API console → Client Secret' },
  { name: 'ZOHO_API_KEY', service: 'Zoho', envs: ['production', 'preview'], lastUpdated: '2025-11-10', critical: false, note: 'Zoho API key' },

  // Google (Drive sync)
  { name: 'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY', service: 'Google', envs: ['production'], lastUpdated: '2025-02-02', critical: true, note: 'GCP Console → Service Account → Keys → Create new JSON key → copy private_key field' },
  { name: 'GOOGLE_SERVICE_ACCOUNT_EMAIL', service: 'Google', envs: ['production'], lastUpdated: '2025-02-02', critical: true, note: 'GCP Console → Service Account → email address (usually doesn\'t change)' },

  // Supabase
  { name: 'SUPABASE_SERVICE_ROLE_KEY', service: 'Supabase', envs: ['production', 'preview'], lastUpdated: '2025-11-18', critical: true, note: 'Supabase Dashboard → Settings → API → service_role key' },

  // Strike (payments)
  { name: 'STRIKE_API_KEY', service: 'Strike', envs: ['production', 'preview'], lastUpdated: '2026-02-19', critical: true, note: 'Strike Dashboard → Developer → API Keys' },

  // Fourthwall
  { name: 'FOURTHWALL_STOREFRONT_TOKEN', service: 'Fourthwall', envs: ['production', 'preview'], lastUpdated: '2025-11-15', critical: false, note: 'Fourthwall Dashboard → Developer/API settings' },

  // Discord
  { name: 'DISCORD_BOT_TOKEN', service: 'Discord', envs: ['production', 'preview'], lastUpdated: '2025-12-04', critical: false, note: 'Discord Developer Portal → Bot → Reset Token' },
  { name: 'DISCORD_CLIENT_SECRET', service: 'Discord', envs: ['production', 'preview'], lastUpdated: '2025-12-04', critical: false, note: 'Discord Developer Portal → OAuth2 → Client Secret' },

  // PayPal
  { name: 'PAYPAL_CLIENT_SECRET', service: 'PayPal', envs: ['production'], lastUpdated: '2026-01-16', critical: false, note: 'PayPal Developer → Apps → Live app → Secret' },
  { name: 'PAYPAL_CLIENT_SECRET_SANDBOX', service: 'PayPal', envs: ['production', 'preview'], lastUpdated: '2025-12-08', critical: false, note: 'PayPal Developer → Apps → Sandbox app → Secret' },

  // Resend
  { name: 'RESEND_API_KEY', service: 'Resend', envs: ['production', 'preview'], lastUpdated: '2025-12-11', critical: false, note: 'Resend Dashboard → API Keys → Create new key' },
];

// Health check URLs to verify after rotation
const HEALTH_CHECKS = [
  { url: 'https://www.thelostandunfounds.com', name: 'Homepage', expect: 200 },
  { url: 'https://www.thelostandunfounds.com/shop', name: 'Shop', expect: 200 },
  { url: 'https://www.thelostandunfounds.com/gallery', name: 'Gallery', expect: 200 },
  { url: 'https://www.thelostandunfounds.com/api/checkout/create-session', name: 'Stripe Checkout API', expect: 405 },
  { url: 'https://www.thelostandunfounds.com/api/affiliates/dashboard', name: 'Affiliates API', expect: [200, 401] },
];

// ─── Helpers ───────────────────────────────────────────────

function createPrompt() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function ask(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer));
  });
}

function askPassword(rl, question) {
  return new Promise((resolve) => {
    process.stdout.write(question);
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    if (stdin.isTTY) stdin.setRawMode(true);

    let input = '';
    const onData = (ch) => {
      const c = ch.toString();
      if (c === '\n' || c === '\r') {
        if (stdin.isTTY) stdin.setRawMode(wasRaw);
        stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(input);
      } else if (c === '') {
        // Ctrl+C
        process.exit(1);
      } else if (c === '' || c === '\b') {
        // Backspace
        if (input.length > 0) {
          input = input.slice(0, -1);
          process.stdout.write('\b \b');
        }
      } else {
        input += c;
        process.stdout.write('•');
      }
    };

    stdin.resume();
    stdin.on('data', onData);
  });
}

function daysSince(dateStr) {
  const then = new Date(dateStr);
  const now = new Date();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

async function vercelAPI(path, method = 'GET', body = null, token) {
  const url = `${BASE_URL}${path}?teamId=${TEAM_ID}`;
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  const text = await res.text();
  try {
    return { status: res.status, data: JSON.parse(text) };
  } catch {
    return { status: res.status, data: text };
  }
}

async function getExistingEnvVars(token) {
  const res = await vercelAPI(`/v9/projects/${PROJECT_ID}/env`, 'GET', null, token);
  if (res.status !== 200) {
    throw new Error(`Failed to list env vars: ${res.status} ${JSON.stringify(res.data)}`);
  }
  return res.data.envs || [];
}

async function updateEnvVar(envVarId, value, token) {
  const res = await vercelAPI(`/v9/projects/${PROJECT_ID}/env/${envVarId}`, 'PATCH', { value }, token);
  return res;
}

async function checkHealth(url, expectedStatus) {
  try {
    const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(10000) });
    const expected = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
    return { ok: expected.includes(res.status), status: res.status };
  } catch (err) {
    return { ok: false, status: err.message };
  }
}

// ─── Main ──────────────────────────────────────────────────

async function main() {
  const rl = createPrompt();

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║   🔑  TLAU Environment Variable Rotation Tool       ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log('║  This script will:                                  ║');
  console.log('║  1. Prompt you for each flagged variable            ║');
  console.log('║  2. Push updated values to Vercel                   ║');
  console.log('║  3. Wait for the redeploy                           ║');
  console.log('║  4. Verify the site is healthy                      ║');
  console.log('║                                                     ║');
  console.log('║  Press Enter to skip any variable you don\'t want    ║');
  console.log('║  to rotate right now.                               ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // Get Vercel token
  let token = process.env.VERCEL_TOKEN;
  if (!token) {
    console.log('You need a Vercel API token to continue.');
    console.log('Generate one at: https://vercel.com/account/tokens\n');
    token = await askPassword(rl, 'Vercel API Token: ');
    if (!token.trim()) {
      console.log('No token provided. Exiting.');
      rl.close();
      process.exit(1);
    }
    token = token.trim();
  }

  // Verify token works
  process.stdout.write('Verifying token... ');
  try {
    const existing = await getExistingEnvVars(token);
    console.log(`✅ Connected (${existing.length} env vars found)\n`);
  } catch (err) {
    console.log(`❌ ${err.message}`);
    rl.close();
    process.exit(1);
  }

  // Fetch existing env vars to get IDs
  const existing = await getExistingEnvVars(token);
  const envMap = {};
  for (const env of existing) {
    // Key by name — there can be multiple entries per name (one per target env)
    if (!envMap[env.key]) envMap[env.key] = [];
    envMap[env.key].push(env);
  }

  // Collect new values
  const updates = [];
  let currentService = '';

  for (const v of FLAGGED_VARS) {
    if (v.service !== currentService) {
      currentService = v.service;
      console.log(`\n─── ${v.service} ${'─'.repeat(45 - v.service.length)}`);
    }

    const age = daysSince(v.lastUpdated);
    const critLabel = v.critical ? ' ⚠️  CRITICAL' : '';
    console.log(`\n  ${v.name}${critLabel}`);
    console.log(`  Last updated: ${v.lastUpdated} (${age} days ago)`);
    console.log(`  Environments: ${v.envs.join(', ')}`);
    console.log(`  📋 ${v.note}`);

    const value = await askPassword(rl, `  New value (Enter to skip): `);

    if (value.trim()) {
      const envEntries = envMap[v.name];
      if (!envEntries || envEntries.length === 0) {
        console.log(`  ⚠️  Variable not found in Vercel — will need to be created manually`);
      } else {
        updates.push({ ...v, value: value.trim(), envEntries });
        console.log(`  ✅ Queued for update`);
      }
    } else {
      console.log(`  ⏭️  Skipped`);
    }
  }

  if (updates.length === 0) {
    console.log('\nNo variables to update. Exiting.');
    rl.close();
    return;
  }

  // Confirm
  console.log(`\n${'═'.repeat(55)}`);
  console.log(`Ready to update ${updates.length} variable(s):\n`);
  for (const u of updates) {
    console.log(`  • ${u.name} (${u.service})`);
  }

  const confirm = await ask(rl, `\nProceed? (yes/no): `);
  if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
    console.log('Aborted.');
    rl.close();
    return;
  }

  // Push updates
  console.log('\nPushing updates to Vercel...\n');
  let successCount = 0;
  let failCount = 0;

  for (const u of updates) {
    process.stdout.write(`  Updating ${u.name}... `);
    let allOk = true;

    for (const entry of u.envEntries) {
      const res = await updateEnvVar(entry.id, u.value, token);
      if (res.status !== 200) {
        console.log(`❌ (${res.status}: ${JSON.stringify(res.data).slice(0, 100)})`);
        allOk = false;
        failCount++;
        break;
      }
    }

    if (allOk) {
      console.log(`✅ (${u.envEntries.length} target(s))`);
      successCount++;
    }
  }

  console.log(`\n${successCount} updated, ${failCount} failed.`);

  if (successCount === 0) {
    console.log('No successful updates. Skipping redeploy.');
    rl.close();
    return;
  }

  // Trigger redeploy
  console.log('\nTriggering production redeploy...');
  const deployRes = await vercelAPI(`/v13/deployments`, 'POST', {
    name: 'thelostandunfounds',
    project: PROJECT_ID,
    target: 'production',
    gitSource: {
      type: 'github',
      org: 'canyouseeus',
      repo: 'thelostandunfounds',
      ref: 'main',
    },
  }, token);

  if (deployRes.status === 200 || deployRes.status === 201) {
    const deployId = deployRes.data.id;
    const deployUrl = deployRes.data.url;
    console.log(`  Deploy started: ${deployId}`);
    console.log(`  URL: https://${deployUrl}`);

    // Poll for deploy completion
    console.log('\nWaiting for deploy to complete (this may take 1-3 minutes)...');
    let ready = false;
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 5000));
      const check = await vercelAPI(`/v13/deployments/${deployId}`, 'GET', null, token);
      const state = check.data?.readyState || check.data?.status;
      process.stdout.write(`\r  Status: ${state}${'  '.repeat(10)}`);

      if (state === 'READY') {
        ready = true;
        console.log('\n  ✅ Deploy complete!');
        break;
      } else if (state === 'ERROR' || state === 'CANCELED') {
        console.log(`\n  ❌ Deploy ${state}!`);
        break;
      }
    }

    if (!ready) {
      console.log('\n  ⚠️  Deploy still in progress after 5 minutes. Check Vercel dashboard.');
    }
  } else {
    console.log(`  ⚠️  Could not trigger redeploy: ${deployRes.status}`);
    console.log(`  The updated env vars will take effect on the next push to main.`);
  }

  // Health checks
  console.log('\nRunning health checks...\n');
  let allHealthy = true;

  for (const check of HEALTH_CHECKS) {
    process.stdout.write(`  ${check.name}... `);
    const result = await checkHealth(check.url, check.expect);
    if (result.ok) {
      console.log(`✅ (${result.status})`);
    } else {
      console.log(`❌ (got ${result.status}, expected ${check.expect})`);
      allHealthy = false;
    }
  }

  console.log(`\n${'═'.repeat(55)}`);
  if (allHealthy) {
    console.log('🎉 All checks passed! Environment variables rotated successfully.');
  } else {
    console.log('⚠️  Some health checks failed. Review the output above.');
    console.log('   The new env vars may need a few minutes to propagate,');
    console.log('   or one of the new values may be incorrect.');
  }

  console.log(`\nUpdated ${successCount} variable(s) at ${new Date().toISOString()}`);
  console.log('');

  rl.close();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
