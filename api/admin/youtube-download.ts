import { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { Readable } from 'stream';

const DRIVE_FOLDER_ID = '1U02vZ2JXr7UcSSnxn832pig1m8sTZ3Ko';
const COBALT_API = 'https://api.cobalt.tools';
const COBALT_TIMEOUT_MS = 60_000;
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

async function fetchOEmbedMetadata(videoId: string): Promise<{ title: string; author: string }> {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const r = await fetch(oembedUrl);
    if (!r.ok) throw new Error(`oEmbed HTTP ${r.status}`);
    const info = await r.json() as any;
    return { title: info.title || 'Unknown', author: info.author_name || '' };
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

// Resolve a downloadable audio stream URL via cobalt.tools.
// cobalt response shapes (v10): { status: "tunnel"|"redirect", url, filename }
// Older/picker variants surface the audio URL via `audio` or pick first picker entry.
async function resolveAudioStream(youtubeUrl: string): Promise<{ url: string; filename: string }> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), COBALT_TIMEOUT_MS);
    let response: Response;
    try {
        response = await fetch(COBALT_API + '/', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'thelostandunfounds-music/1.0',
            },
            body: JSON.stringify({
                url: youtubeUrl,
                downloadMode: 'audio',
                audioFormat: 'mp3',
                audioBitrate: '192',
                filenameStyle: 'basic',
            }),
            signal: ctrl.signal,
        });
    } finally {
        clearTimeout(timer);
    }

    const text = await response.text();
    let body: any;
    try {
        body = JSON.parse(text);
    } catch {
        throw new Error(`cobalt non-JSON response (HTTP ${response.status}): ${text.substring(0, 200)}`);
    }

    if (!response.ok || body.status === 'error') {
        const msg = body?.error?.code || body?.text || `HTTP ${response.status}`;
        throw new Error(`cobalt rejected request: ${msg}`);
    }

    if ((body.status === 'tunnel' || body.status === 'redirect' || body.status === 'stream') && body.url) {
        return { url: body.url, filename: body.filename || 'audio.mp3' };
    }
    if (body.status === 'picker') {
        const audioUrl = body.audio || body.picker?.[0]?.url;
        if (audioUrl) return { url: audioUrl, filename: body.filename || 'audio.mp3' };
    }
    throw new Error(`cobalt returned unexpected status: ${body.status || 'unknown'}`);
}

async function downloadBuffer(url: string): Promise<Buffer> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), STREAM_TIMEOUT_MS);
    try {
        const r = await fetch(url, { signal: ctrl.signal });
        if (!r.ok) throw new Error(`Audio stream HTTP ${r.status}`);
        const ab = await r.arrayBuffer();
        return Buffer.from(ab);
    } finally {
        clearTimeout(timer);
    }
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

    try {
        const videoId = extractVideoId(url);
        if (!videoId) throw new Error(`Could not extract video ID from URL: ${url}`);
        const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;

        const { title: rawTitle, author } = await fetchOEmbedMetadata(videoId);
        console.log(`[YouTube Download] Metadata: "${rawTitle}" by "${author}" (id=${videoId})`);

        const stream = await resolveAudioStream(canonicalUrl);
        console.log(`[YouTube Download] cobalt resolved stream (filename=${stream.filename})`);

        const audioBuffer = await downloadBuffer(stream.url);
        if (audioBuffer.length === 0) throw new Error('Audio stream returned empty buffer');
        console.log(`[YouTube Download] Downloaded ${audioBuffer.length} bytes`);

        const safeTitle = rawTitle.replace(/[^a-zA-Z0-9 _-]/g, '_').substring(0, 80);
        const fileName = `${safeTitle}.mp3`;

        const drive = google.drive({ version: 'v3', auth: getOAuth2Client() });
        const driveFile = await drive.files.create({
            requestBody: {
                name: fileName,
                parents: [DRIVE_FOLDER_ID],
                mimeType: 'audio/mpeg',
            },
            media: {
                mimeType: 'audio/mpeg',
                body: Readable.from(audioBuffer),
            },
            fields: 'id,name',
        });

        const fileId = driveFile.data.id!;
        const { title, artist } = extractTitleArtist(rawTitle);

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
    }
}
