import { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as https from 'https';
import * as path from 'path';

const execFileAsync = promisify(execFile);

const DRIVE_FOLDER_ID = '1U02vZ2JXr7UcSSnxn832pig1m8sTZ3Ko';
const YT_DLP_PATH = '/tmp/yt-dlp';
const YT_DLP_TMP = '/tmp/yt-dlp.tmp';
const MAX_BUFFER = 50 * 1024 * 1024;

function getOAuth2Client() {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });
    return oauth2Client;
}

async function ensureYtDlp(): Promise<void> {
    if (fs.existsSync(YT_DLP_PATH)) return;

    // Download to a staging file first so concurrent requests never see a
    // partial binary — executing a partially-written file causes ETXTBSY.
    return new Promise((resolve, reject) => {
        const url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux';

        function pipeToStaging(response: any) {
            const file = fs.createWriteStream(YT_DLP_TMP);
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                try {
                    fs.chmodSync(YT_DLP_TMP, '755');
                    fs.renameSync(YT_DLP_TMP, YT_DLP_PATH);
                } catch {
                    try { fs.unlinkSync(YT_DLP_TMP); } catch {}
                }
                resolve();
            });
            file.on('error', (err) => {
                try { fs.unlinkSync(YT_DLP_TMP); } catch {}
                reject(err);
            });
        }

        const request = https.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                https.get(response.headers.location!, pipeToStaging).on('error', reject);
                return;
            }
            pipeToStaging(response);
        });

        request.on('error', (err) => {
            try { fs.unlinkSync(YT_DLP_TMP); } catch {}
            reject(err);
        });
    });
}

// Extract 11-character YouTube video ID from any YouTube URL format.
function extractVideoId(url: string): string | null {
    const patterns = [
        /[?&]v=([a-zA-Z0-9_-]{11})/,   // watch?v=
        /youtu\.be\/([a-zA-Z0-9_-]{11})/, // youtu.be/
        /shorts\/([a-zA-Z0-9_-]{11})/,   // shorts/
        /embed\/([a-zA-Z0-9_-]{11})/,    // embed/
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

// Fetch title/author via YouTube oEmbed — no auth, no bot detection.
function fetchOEmbedMetadata(videoId: string): Promise<{ title: string; author: string }> {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    return new Promise((resolve, reject) => {
        https.get(oembedUrl, (res) => {
            let raw = '';
            res.on('data', (chunk) => raw += chunk);
            res.on('end', () => {
                try {
                    const info = JSON.parse(raw);
                    resolve({ title: info.title || 'Unknown', author: info.author_name || '' });
                } catch {
                    reject(new Error(`oEmbed parse failed (status ${res.statusCode}): ${raw.substring(0, 100)}`));
                }
            });
        }).on('error', reject);
    });
}

function extractTitleArtist(rawTitle: string): { title: string; artist: string } {
    const sep = rawTitle.indexOf(' - ');
    if (sep !== -1) {
        return {
            artist: rawTitle.substring(0, sep).trim(),
            title: rawTitle.substring(sep + 3).trim(),
        };
    }
    return { title: rawTitle.trim(), artist: '' };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { url } = req.body || {};
    if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'url is required' });
    }

    const supabase = createClient(
        process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const tmpDir = '/tmp';
    let audioFilePath: string | null = null;

    try {
        // --- Metadata via oEmbed (bypasses bot detection entirely) ---
        const videoId = extractVideoId(url);
        if (!videoId) throw new Error(`Could not extract video ID from URL: ${url}`);

        const { title: rawTitle, author } = await fetchOEmbedMetadata(videoId);
        console.log(`[YouTube Download] Fetched metadata: "${rawTitle}" by "${author}" (id=${videoId})`);

        // --- Ensure yt-dlp binary ---
        await ensureYtDlp();

        // --- Extract audio ---
        const safeTitle = rawTitle.replace(/[^a-zA-Z0-9 _-]/g, '_').substring(0, 80);
        audioFilePath = path.join(tmpDir, `${safeTitle}.mp3`);

        const { stdout: dlOut, stderr: dlErr } = await execFileAsync(YT_DLP_PATH, [
            '-x',
            '--audio-format', 'mp3',
            '--audio-quality', '192K',
            '--no-playlist',
            '--no-warnings',
            // Try multiple YouTube player clients so bot detection on one doesn't block all
            '--extractor-args', 'youtube:player_client=web,mweb,android',
            '-o', audioFilePath,
            `https://www.youtube.com/watch?v=${videoId}`,
        ], { timeout: 240_000, maxBuffer: MAX_BUFFER });

        if (dlErr) console.log('[YouTube Download] yt-dlp stderr:', dlErr.substring(0, 800));
        if (dlOut) console.log('[YouTube Download] yt-dlp stdout:', dlOut.substring(0, 200));

        if (!fs.existsSync(audioFilePath)) {
            const files = fs.readdirSync(tmpDir).filter(f => f.endsWith('.mp3') && f.includes(safeTitle.substring(0, 20)));
            if (files.length === 0) {
                throw new Error(`Audio extraction failed. yt-dlp stderr: ${dlErr?.substring(0, 400) || 'none'}`);
            }
            audioFilePath = path.join(tmpDir, files[0]);
        }

        // --- Upload to Google Drive ---
        const drive = google.drive({ version: 'v3', auth: getOAuth2Client() });
        const fileStream = fs.createReadStream(audioFilePath);
        const fileName = path.basename(audioFilePath);

        const driveFile = await drive.files.create({
            requestBody: {
                name: fileName,
                parents: [DRIVE_FOLDER_ID],
                mimeType: 'audio/mpeg',
            },
            media: {
                mimeType: 'audio/mpeg',
                body: fileStream,
            },
            fields: 'id,name',
        });

        const fileId = driveFile.data.id!;
        const { title, artist } = extractTitleArtist(rawTitle);

        // --- Insert into Supabase ---
        const { data: track, error: dbError } = await supabase
            .from('admin_playlist')
            .insert({
                title,
                artist: artist || author,
                file_id: fileId,
                duration: 0,
                source_url: url,
            })
            .select()
            .single();

        if (dbError) throw new Error(`DB insert failed: ${dbError.message}`);

        return res.status(200).json({ track });

    } catch (error: any) {
        console.error('[YouTube Download] Error:', error.message);
        return res.status(500).json({ error: error.message || 'Download failed' });
    } finally {
        if (audioFilePath) {
            try { fs.unlinkSync(audioFilePath); } catch {}
        }
    }
}
