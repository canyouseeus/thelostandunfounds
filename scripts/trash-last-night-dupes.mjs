/**
 * trash-last-night-dupes.mjs
 *
 * Finds and trashes duplicate photos in the LAST NIGHT Google Drive folder.
 * Photos were uploaded twice (April 2 and April 19, 2026) with renumbered
 * filenames but identical file sizes. This script groups by size and trashes
 * the newer copy of each duplicate pair.
 *
 * Usage:
 *   npx tsx scripts/trash-last-night-dupes.mjs          # dry run (default)
 *   npx tsx scripts/trash-last-night-dupes.mjs --execute # actually trash files
 *
 * Files go to Drive trash (recoverable for 30 days).
 */

import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
  console.error('Missing OAuth2 credentials in .env.local');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
const drive = google.drive({ version: 'v3', auth: oauth2Client });

const LAST_NIGHT_FOLDER_ID = '12-LAiVzOMvUuHA87Kq8eJIlYSrHxNpnT';
const EXECUTE = process.argv.includes('--execute');

async function listAllFiles() {
  const files = [];
  let pageToken = undefined;
  let page = 0;

  while (true) {
    page++;
    const res = await drive.files.list({
      q: `'${LAST_NIGHT_FOLDER_ID}' in parents and mimeType contains 'image/' and trashed = false`,
      fields: 'nextPageToken, files(id, name, size, createdTime)',
      pageSize: 1000,
      pageToken,
    });
    files.push(...(res.data.files || []));
    console.log(`  Page ${page}: ${res.data.files?.length || 0} files`);
    pageToken = res.data.nextPageToken;
    if (!pageToken) break;
  }

  return files;
}

async function main() {
  console.log(`Mode: ${EXECUTE ? '🔴 EXECUTE (will trash files)' : '🟢 DRY RUN (preview only)'}\n`);

  console.log('Listing all files in LAST NIGHT folder...');
  const files = await listAllFiles();
  console.log(`\nTotal files: ${files.length}\n`);

  // Group by file size
  const bySize = new Map();
  for (const f of files) {
    const key = f.size;
    if (!bySize.has(key)) bySize.set(key, []);
    bySize.get(key).push(f);
  }

  // Find duplicate groups (same size = same photo uploaded twice)
  const toTrash = [];
  let dupGroupCount = 0;

  for (const [size, group] of bySize) {
    if (group.length < 2) continue;
    dupGroupCount++;

    // Sort by createdTime ascending — keep oldest, trash rest
    group.sort((a, b) => new Date(a.createdTime) - new Date(b.createdTime));
    const keeper = group[0];
    const dupes = group.slice(1);

    console.log(`Duplicate group (${size} bytes):`);
    console.log(`  ✅ KEEP:  ${keeper.name} (created ${keeper.createdTime.slice(0, 10)})`);
    for (const d of dupes) {
      console.log(`  🗑️  TRASH: ${d.name} (created ${d.createdTime.slice(0, 10)})`);
      toTrash.push(d);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Duplicate groups found: ${dupGroupCount}`);
  console.log(`Files to trash: ${toTrash.length}`);
  console.log(`Estimated space freed: ${(toTrash.reduce((s, f) => s + Number(f.size), 0) / 1024 / 1024).toFixed(1)} MB`);
  console.log(`${'='.repeat(60)}\n`);

  if (!EXECUTE) {
    console.log('This was a DRY RUN. To actually trash these files, run:');
    console.log('  npx tsx scripts/trash-last-night-dupes.mjs --execute\n');
    return;
  }

  // Execute trash
  let ok = 0, fail = 0;
  for (const f of toTrash) {
    try {
      await drive.files.update({ fileId: f.id, requestBody: { trashed: true } });
      console.log(`  ✓ Trashed: ${f.name}`);
      ok++;
    } catch (err) {
      console.error(`  ✗ Failed: ${f.name}: ${err.message}`);
      fail++;
    }
  }

  console.log(`\nDone: ${ok} trashed, ${fail} failed.`);
}

main().catch(console.error);
