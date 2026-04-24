import { VercelRequest, VercelResponse } from '@vercel/node';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as https from 'https';

const execFileAsync = promisify(execFile);
const YT_DLP_PATH = '/tmp/yt-dlp';
const YT_DLP_TMP = '/tmp/yt-dlp.tmp';
const MAX_BUFFER = 50 * 1024 * 1024;

async function ensureYtDlp(): Promise<void> {
    if (fs.existsSync(YT_DLP_PATH)) return;

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { url } = req.body || {};
    if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'url is required' });
    }

    try {
        await ensureYtDlp();

        const { stdout } = await execFileAsync(YT_DLP_PATH, [
            '--flat-playlist',
            '--dump-single-json',
            url,
        ], { timeout: 60_000, maxBuffer: MAX_BUFFER });

        const trimmed = stdout.trim();
        if (!trimmed) throw new Error('yt-dlp returned empty output — the URL may be invalid');

        let info: any;
        try {
            info = JSON.parse(trimmed);
        } catch {
            throw new Error('Failed to parse playlist metadata from yt-dlp');
        }

        const entries = (info.entries || []).map((entry: any) => ({
            id: entry.id,
            title: entry.title || entry.id,
            url: `https://www.youtube.com/watch?v=${entry.id}`,
            duration: entry.duration || null,
            uploader: entry.uploader || entry.channel || info.uploader || info.channel || '',
        }));

        return res.status(200).json({
            title: info.title || 'Playlist',
            uploader: info.uploader || info.channel || '',
            entries,
        });
    } catch (error: any) {
        console.error('[Playlist Info] Error:', error.message);
        return res.status(500).json({ error: error.message || 'Failed to fetch playlist' });
    }
}
