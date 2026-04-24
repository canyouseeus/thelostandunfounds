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

    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(YT_DLP_PATH);
        const url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux';

        const request = https.get(url, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                const redirectFile = fs.createWriteStream(YT_DLP_PATH);
                https.get(response.headers.location!, (redirectResponse) => {
                    redirectResponse.pipe(redirectFile);
                    redirectFile.on('finish', () => {
                        redirectFile.close();
                        fs.chmodSync(YT_DLP_PATH, '755');
                        resolve();
                    });
                }).on('error', reject);
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                fs.chmodSync(YT_DLP_PATH, '755');
                resolve();
            });
        });

        request.on('error', (err) => {
            try { fs.unlinkSync(YT_DLP_PATH); } catch {}
            reject(err);
        });
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
    const outputTemplate = path.join(tmpDir, '%(title)s.%(ext)s');
    let audioFilePath: string | null = null;

    try {
        await ensureYtDlp();

        // Get metadata first
        const { stdout: infoJson } = await execFileAsync(YT_DLP_PATH, [
            '--dump-json',
            '--no-playlist',
            url,
        ], { timeout: 30_000 });

        const info = JSON.parse(infoJson);
        const rawTitle: string = info.title || 'Unknown';
        const duration: number = info.duration || 0;

        // Extract audio to mp3
        const safeTitle = rawTitle.replace(/[^a-zA-Z0-9 _-]/g, '_').substring(0, 80);
        audioFilePath = path.join(tmpDir, `${safeTitle}.mp3`);

        await execFileAsync(YT_DLP_PATH, [
            '-x',
            '--audio-format', 'mp3',
            '--audio-quality', '192K',
            '--no-playlist',
            '-o', audioFilePath,
            url,
        ], { timeout: 240_000 });

        if (!fs.existsSync(audioFilePath)) {
            // yt-dlp may add extra chars; find the file
            const files = fs.readdirSync(tmpDir).filter(f => f.endsWith('.mp3') && f.includes(safeTitle.substring(0, 20)));
            if (files.length === 0) throw new Error('Audio extraction failed — output file not found');
            audioFilePath = path.join(tmpDir, files[0]);
        }

        // Upload to Google Drive
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

        // Insert into Supabase
        const { data: track, error: dbError } = await supabase
            .from('admin_playlist')
            .insert({
                title,
                artist,
                file_id: fileId,
                duration: Math.round(duration),
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
