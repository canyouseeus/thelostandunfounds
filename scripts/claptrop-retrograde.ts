/**
 * CLAPTROP Retrograde
 * Renames existing Google Drive files to @tlau naming convention
 * and updates the corresponding Supabase photo titles.
 *
 * Usage:
 *   npx tsx scripts/claptrop-retrograde.ts [options]
 *
 * Options:
 *   --dry-run             Preview renames without making any changes
 *   --library <slug>      Process one library only
 *   --subject <name>      Override subject for all files (default: library slug)
 */

import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { buildName, normalizeText, resetSeqs } from './claptrop-namer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// ─── CLI Flags ────────────────────────────────────────────────────────────────

const args             = process.argv.slice(2);
const DRY_RUN          = args.includes('--dry-run');
const LIBRARY_FILTER   = (() => { const i = args.indexOf('--library'); return i !== -1 ? args[i + 1] : null; })();
const SUBJECT_OVERRIDE = (() => { const i = args.indexOf('--subject'); return i !== -1 ? args[i + 1] : undefined; })();

// Clients are initialized lazily inside run() so this module is safe to import
let supabase: ReturnType<typeof createClient>;
let drive: ReturnType<typeof google.drive>;

// ─── Log ─────────────────────────────────────────────────────────────────────

const LOG_FILE = path.join(__dirname, 'claptrop-retrograde-log.json');
const logs: object[] = [];

function flushLog() {
    try {
        const existing = fs.existsSync(LOG_FILE)
            ? JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8'))
            : [];
        fs.writeFileSync(LOG_FILE, JSON.stringify([...existing, ...logs], null, 2));
        console.log(`\n📋 Log written → scripts/claptrop-retrograde-log.json`);
    } catch (e: any) {
        console.error('Failed to write log:', e.message);
    }
}

// ─── Drive rename ─────────────────────────────────────────────────────────────

async function renameInDrive(fileId: string, newName: string): Promise<boolean> {
    try {
        await drive.files.update({ fileId, requestBody: { name: newName } });
        return true;
    } catch (err: any) {
        if (err.code === 403 || err.code === 404) {
            console.warn(`    ⚠️  No write access to ${fileId} — skipped.`);
        } else {
            console.error(`    ❌ Drive rename failed: ${err.message}`);
        }
        return false;
    }
}

// ─── Process one library ──────────────────────────────────────────────────────

async function processLibrary(library: { id: string; slug: string; name: string }) {
    console.log(`\n── Library: ${library.slug} ──`);
    resetSeqs();

    // Load all photos for this library, sorted by created_at (oldest first for consistent seq)
    const { data: photos, error } = await supabase
        .from('photos')
        .select('id, google_drive_file_id, title, metadata, created_at')
        .eq('library_id', library.id)
        .order('created_at', { ascending: true });

    if (error || !photos) {
        console.error(`  Failed to load photos: ${error?.message}`);
        return;
    }

    const toRename = photos.filter(p => !p.title?.startsWith('@tlau_'));
    console.log(`  ${photos.length} photos total, ${toRename.length} need renaming.`);

    if (!toRename.length) return;

    // Build collision set from photos already using @tlau names in this library
    const existingNames = new Set(
        photos.filter(p => p.title?.startsWith('@tlau_')).map(p => `${p.title}.jpg`.toLowerCase())
    );

    // Derive subject from library slug (e.g. "kattitude-tattoo" → "kattitude_tattoo")
    const librarySubject = SUBJECT_OVERRIDE || normalizeText(library.slug.replace(/-/g, '_'));

    let renamed = 0, skipped = 0, failed = 0;

    for (const photo of toRename) {
        const meta  = photo.metadata || {};
        const title = photo.title || photo.google_drive_file_id;

        // Get ext from title or Drive mime (default jpg)
        const ext = title.includes('.') ? path.extname(title).toLowerCase() : '.jpg';

        // Date from metadata
        let date: Date | undefined;
        const rawDate = meta.date_taken || meta.time || photo.created_at;
        if (rawDate) {
            const d = new Date(rawDate);
            if (!isNaN(d.getTime())) date = d;
        }

        // GPS from metadata.location (Drive provides this if image has EXIF GPS)
        const lat = meta.location?.latitude  ?? null;
        const lon = meta.location?.longitude ?? null;

        const { meta: nameMeta, log } = await buildName({
            originalName: `${title}${title.includes('.') ? '' : ext}`,
            date,
            lat,
            lon,
            subject: librarySubject,
            existingNames,
        });

        const newTitle    = nameMeta.stem;
        const newFilename = nameMeta.filename;

        console.log(`  ${title} → ${newFilename} [date:${log.date_source} loc:${log.location_source}]`);

        if (DRY_RUN) { skipped++; continue; }

        // 1. Rename in Drive
        const driveOk = await renameInDrive(photo.google_drive_file_id, newFilename);

        if (!driveOk) { failed++; continue; }

        // 2. Update Supabase title
        const { error: updateErr } = await supabase
            .from('photos')
            .update({ title: newTitle })
            .eq('id', photo.id);

        if (updateErr) {
            console.error(`    ❌ Supabase update failed: ${updateErr.message}`);
            failed++;
        } else {
            logs.push({ ...log, library: library.slug, photo_id: photo.id, drive_file_id: photo.google_drive_file_id });
            renamed++;
        }

        // Small delay to avoid Drive rate limits
        await new Promise(r => setTimeout(r, 200));
    }

    console.log(`  ✅ Renamed: ${renamed}  Skipped: ${skipped}  Failed: ${failed}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function run() {
    console.log('\n=== Phase 3: CLAPTROP Retrograde ===');

    if (DRY_RUN) console.log('🔍 DRY RUN — no changes will be made.\n');

    const SUPABASE_URL              = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const CLIENT_ID                 = process.env.GOOGLE_CLIENT_ID;
    const CLIENT_SECRET             = process.env.GOOGLE_CLIENT_SECRET;
    const REFRESH_TOKEN             = process.env.GOOGLE_REFRESH_TOKEN;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY)
        throw new Error('Missing Supabase credentials in .env.local');
    if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN)
        throw new Error('Missing Google OAuth2 credentials in .env.local');

    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
    oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
    drive = google.drive({ version: 'v3', auth: oauth2Client });

    let query = supabase.from('photo_libraries').select('id, slug, name').order('name');
    if (LIBRARY_FILTER) query = query.eq('slug', LIBRARY_FILTER) as typeof query;

    const { data: libraries, error } = await query;

    if (error || !libraries) {
        throw new Error(`Failed to load libraries: ${error?.message}`);
    }

    console.log(`Found ${libraries.length} librar${libraries.length === 1 ? 'y' : 'ies'} to process.`);

    for (const lib of libraries) {
        await processLibrary(lib);
    }

    if (!DRY_RUN) flushLog();

    console.log('\n=== Done ===');
}

// Only auto-run when executed directly, not when imported
const isMain = process.argv[1] && (
    process.argv[1].endsWith('claptrop-retrograde.ts') ||
    process.argv[1].endsWith('claptrop-retrograde.js')
);
if (isMain) run().catch(console.error);
