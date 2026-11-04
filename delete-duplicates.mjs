import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load creds from the project's .env.local
dotenv.config({ path: '/sessions/quirky-optimistic-hopper/mnt/thelostandunfounds/.env.local' });

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);
oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

const drive = google.drive({ version: 'v3', auth: oauth2Client });

const LAST_NIGHT_FOLDER_ID = '12-LAiVzOMvUuHA87Kq8eJIlYSrHxNpnT';

async function listAllFiles() {
  const files = [];
  let pageToken = undefined;

  while (true) {
    const res = await drive.files.list({
      q: `'${LAST_NIGHT_FOLDER_ID}' in parents and mimeType contains 'image/' and trashed = false`,
      fields: 'nextPageToken, files(id, name, size, createdTime, modifiedTime)',
      pageSize: 1000,
      pageToken,
    });

    files.push(...res.data.files);
    pageToken = res.data.nextPageToken;
    if (!pageToken) break;
  }

  return files;
}

async function main() {
  console.log('Listing all files in LAST NIGHT folder...');
  const files = await listAllFiles();
  console.log(`Found ${files.length} total files.\n`);

  // Group by file size
  const bySize = {};
  for (const f of files) {
    const key = f.size;
    if (!bySize[key]) bySize[key] = [];
    bySize[key].push(f);
  }

  // Find duplicate groups (same size = duplicate per the task description)
  const duplicateGroups = Object.entries(bySize)
    .filter(([_, group]) => group.length > 1);

  console.log(`Found ${duplicateGroups.length} groups of files with matching sizes.\n`);

  const toDelete = [];

  for (const [size, group] of duplicateGroups) {
    // Sort by createdTime ascending — keep the oldest, delete the rest
    group.sort((a, b) => new Date(a.createdTime) - new Date(b.createdTime));

    const keeper = group[0];
    const dupes = group.slice(1);

    console.log(`Size ${size} bytes:`);
    console.log(`  KEEP: ${keeper.name} (created ${keeper.createdTime})`);
    for (const d of dupes) {
      console.log(`  DELETE: ${d.name} (created ${d.createdTime})`);
      toDelete.push(d);
    }
    console.log();
  }

  console.log(`\n=== TOTAL TO DELETE: ${toDelete.length} files ===\n`);

  // Now trash each duplicate
  let successCount = 0;
  let failCount = 0;

  for (const f of toDelete) {
    try {
      // Use update to move to trash (safer than permanent delete)
      await drive.files.update({
        fileId: f.id,
        requestBody: { trashed: true },
      });
      console.log(`  ✓ Trashed: ${f.name} (${f.id})`);
      successCount++;
    } catch (err) {
      console.error(`  ✗ Failed: ${f.name} (${f.id}): ${err.message}`);
      failCount++;
    }
  }

  console.log(`\n=== DONE: ${successCount} trashed, ${failCount} failed ===`);
}

main().catch(console.error);
