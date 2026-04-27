import { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { Readable } from 'stream';
import ytdl from '@distube/ytdl-core';

const DRIVE_FOLDER_ID = '1U02vZ2JXr7UcSSnxn832pig1m8sTZ3Ko';
const STREAM_TIMEOUT_MS = 240_000;

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

function extractVideoId(url: string): string | null {
    const patterns = [
        /[?&]v=([a-zA-Z0-9_-]{11})/,
        /youtu\.be\/([a-zA-Z0-9_-]{11})/,
        /shorts\/([a-zA-Z0-9_-]{11})/,
        /embed\/([a-zA-Z0-9_-]{11})/,
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
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

interface DownloadedAudio {
    buffer: Buffer;
    mimeType: string;
    extension: string;
    title: string;
    author: string;
    durationSec: number;
}

async function downloadAudio(canonicalUrl: string): Promise<DownloadedAudio> {
    const info = await ytdl.getInfo(canonicalUrl);
    const format = ytdl.chooseFormat(info.formats, {
        quality: 'highestaudio',
        filter: 'audioonly',
    });
    if (!format) throw new Error('No audio-only format available for this video');

    const isMp4 = (format.container || '').toLowerCase() === 'mp4';
    const mimeType = isMp4 ? 'audio/mp4' : 'audio/webm';
    const extension = isMp4 ? 'm4a' : 'webm';

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), STREAM_TIMEOUT_MS);

    const stream = ytdl.downloadFromInfo(info, { format });
    const chunks: Buffer[] = [];

    try {
        await new Promise<void>((resolve, reject) => {
            const onAbort = () => {
                stream.destroy(new Error('Download timed out'));
            };
            ctrl.signal.addEventListener('abort', onAbort, { once: true });

            stream.on('data', (chunk: Buffer) => {
                chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            });
            stream.on('end', () => {
                ctrl.signal.removeEventListener('abort', onAbort);
                resolve();
            });
            stream.on('error', (err) => {
                ctrl.signal.removeEventListener('abort', onAbort);
                reject(err);
            });
        });
    } finally {
        clearTimeout(timer);
    }

    const buffer = Buffer.concat(chunks);
    if (buffer.length === 0) throw new Error('ytdl returned an empty audio stream');

    const durationSec = parseInt(info.videoDetails.lengthSeconds || '0', 10) || 0;
    return {
        buffer,
        mimeType,
        extension,
        title: info.videoDetails.title || 'Unknown',
        author: info.videoDetails.author?.name || '',
        durationSec,
    };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { url } = req.body || {};
    if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'url is required' });
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
        return res.status(400).json({
            error: 'Only YouTube URLs are supported. Paste a youtube.com/watch, youtu.be, /shorts, or /embed link.',
        });
    }

    const supabase = createClient(
        process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const audio = await downloadAudio(canonicalUrl);
        console.log(`[YouTube Download] ${audio.buffer.length} bytes (${audio.mimeType}) for "${audio.title}"`);

        const safeTitle = audio.title.replace(/[^a-zA-Z0-9 _-]/g, '_').substring(0, 80);
        const fileName = `${safeTitle}.${audio.extension}`;

        const drive = google.drive({ version: 'v3', auth: getOAuth2Client() });
        const driveFile = await drive.files.create({
            requestBody: {
                name: fileName,
                parents: [DRIVE_FOLDER_ID],
                mimeType: audio.mimeType,
            },
            media: {
                mimeType: audio.mimeType,
                body: Readable.from(audio.buffer),
            },
            fields: 'id,name',
        });

        const fileId = driveFile.data.id!;
        const { title, artist } = extractTitleArtist(audio.title);

        const { data: track, error: dbError } = await supabase
            .from('admin_playlist')
            .insert({
                title,
                artist: artist || audio.author,
                file_id: fileId,
                duration: audio.durationSec,
                source_url: canonicalUrl,
            })
            .select()
            .single();

        if (dbError) throw new Error(`DB insert failed: ${dbError.message}`);

        return res.status(200).json({ track });

    } catch (error: any) {
        console.error('[YouTube Download] Error:', error.message);
        return res.status(500).json({ error: error.message || 'Download failed' });
    }
}
