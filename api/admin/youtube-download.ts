import { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { Readable } from 'stream';

const DRIVE_FOLDER_ID = '1U02vZ2JXr7UcSSnxn832pig1m8sTZ3Ko';
const COBALT_API_URL = process.env.COBALT_API_URL || 'https://api.cobalt.tools';

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
    const resp = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );
    if (!resp.ok) throw new Error(`oEmbed failed: ${resp.status}`);
    const info: any = await resp.json();
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

// Resolve a YouTube URL to a direct audio stream URL via cobalt.tools.
// Cobalt v10 response shapes: { status: "tunnel"|"redirect"|"stream", url } | { status: "error", error: { code } } | { status: "picker", picker: [...] }
async function getCobaltAudioUrl(youtubeUrl: string): Promise<string> {
    const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'thelostandunfounds-music-player/1.0',
    };
    if (process.env.COBALT_API_KEY) {
        headers['Authorization'] = `Api-Key ${process.env.COBALT_API_KEY}`;
    }

    const resp = await fetch(`${COBALT_API_URL}/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            url: youtubeUrl,
            downloadMode: 'audio',
            audioFormat: 'mp3',
            audioBitrate: '192',
            filenameStyle: 'basic',
            youtubeVideoCodec: 'h264',
        }),
    });

    const data: any = await resp.json().catch(() => null);
    if (!resp.ok || !data) {
        throw new Error(`Cobalt API ${resp.status}: ${JSON.stringify(data)?.substring(0, 300) || 'no body'}`);
    }
    if (data.status === 'error') {
        throw new Error(`Cobalt error: ${data.error?.code || 'unknown'}`);
    }
    if (data.status === 'picker') {
        const first = Array.isArray(data.picker) && data.picker[0]?.url;
        if (!first) throw new Error('Cobalt returned a picker with no items');
        return first;
    }
    if (!data.url) throw new Error(`Cobalt returned no URL (status: ${data.status})`);
    return data.url;
}

async function downloadToBuffer(streamUrl: string): Promise<Buffer> {
    const resp = await fetch(streamUrl);
    if (!resp.ok) throw new Error(`Audio download failed: ${resp.status} ${resp.statusText}`);
    const arr = await resp.arrayBuffer();
    if (arr.byteLength === 0) throw new Error('Audio download returned empty body');
    return Buffer.from(arr);
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

        const { title: rawTitle, author } = await fetchOEmbedMetadata(videoId);
        console.log(`[YouTube Download] "${rawTitle}" by "${author}" (id=${videoId})`);

        const audioStreamUrl = await getCobaltAudioUrl(`https://www.youtube.com/watch?v=${videoId}`);
        console.log(`[YouTube Download] Cobalt resolved stream URL`);

        const audioBuffer = await downloadToBuffer(audioStreamUrl);
        console.log(`[YouTube Download] Downloaded ${audioBuffer.byteLength} bytes`);

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
