import { VercelRequest, VercelResponse } from '@vercel/node';

const USER_AGENT =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function extractPlaylistId(url: string): string | null {
    const m = url.match(/[?&]list=([A-Za-z0-9_-]+)/);
    return m ? m[1] : null;
}

// Walk forward from `start` (which must point at '{') and return the substring
// of the balanced JSON object. Respects strings and escapes.
function sliceBalancedObject(text: string, start: number): string | null {
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = start; i < text.length; i++) {
        const ch = text[i];
        if (escape) { escape = false; continue; }
        if (inString) {
            if (ch === '\\') escape = true;
            else if (ch === '"') inString = false;
            continue;
        }
        if (ch === '"') { inString = true; continue; }
        if (ch === '{') depth++;
        else if (ch === '}') {
            depth--;
            if (depth === 0) return text.substring(start, i + 1);
        }
    }
    return null;
}

function findYtInitialData(html: string): any | null {
    const markers = ['var ytInitialData = ', 'window["ytInitialData"] = ', 'ytInitialData = '];
    for (const marker of markers) {
        const idx = html.indexOf(marker);
        if (idx === -1) continue;
        const braceStart = html.indexOf('{', idx + marker.length);
        if (braceStart === -1) continue;
        const json = sliceBalancedObject(html, braceStart);
        if (!json) continue;
        try {
            return JSON.parse(json);
        } catch {
            continue;
        }
    }
    return null;
}

function readPlaylistTitle(data: any): string {
    return (
        data?.metadata?.playlistMetadataRenderer?.title ||
        data?.header?.playlistHeaderRenderer?.title?.simpleText ||
        data?.header?.playlistHeaderRenderer?.title?.runs?.[0]?.text ||
        'Playlist'
    );
}

function readPlaylistOwner(data: any): string {
    return (
        data?.header?.playlistHeaderRenderer?.ownerText?.runs?.[0]?.text ||
        data?.header?.playlistHeaderRenderer?.subtitle?.simpleText ||
        ''
    );
}

function readPlaylistVideoListContents(data: any): any[] {
    const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs;
    if (!Array.isArray(tabs)) return [];
    for (const tab of tabs) {
        const sections = tab?.tabRenderer?.content?.sectionListRenderer?.contents;
        if (!Array.isArray(sections)) continue;
        for (const section of sections) {
            const items = section?.itemSectionRenderer?.contents;
            if (!Array.isArray(items)) continue;
            for (const item of items) {
                const list = item?.playlistVideoListRenderer?.contents;
                if (Array.isArray(list)) return list;
            }
        }
    }
    return [];
}

function parseEntry(node: any, fallbackUploader: string) {
    const r = node?.playlistVideoRenderer;
    if (!r?.videoId) return null;
    const title =
        r.title?.runs?.[0]?.text ||
        r.title?.simpleText ||
        r.videoId;
    const lengthSec = r.lengthSeconds ? parseInt(r.lengthSeconds, 10) : null;
    const uploader =
        r.shortBylineText?.runs?.[0]?.text ||
        r.videoOwnerText?.runs?.[0]?.text ||
        fallbackUploader;
    return {
        id: r.videoId,
        title,
        url: `https://www.youtube.com/watch?v=${r.videoId}`,
        duration: Number.isFinite(lengthSec) ? lengthSec : null,
        uploader,
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

    const playlistId = extractPlaylistId(url);
    if (!playlistId) {
        return res.status(400).json({ error: 'URL does not contain a playlist id (list=...)' });
    }

    try {
        const playlistUrl = `https://www.youtube.com/playlist?list=${playlistId}&hl=en`;
        const response = await fetch(playlistUrl, {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept-Language': 'en-US,en;q=0.9',
            },
        });
        if (!response.ok) {
            throw new Error(`YouTube returned HTTP ${response.status}`);
        }
        const html = await response.text();

        const data = findYtInitialData(html);
        if (!data) {
            throw new Error('Could not locate ytInitialData in playlist page');
        }

        const title = readPlaylistTitle(data);
        const uploader = readPlaylistOwner(data);
        const rawEntries = readPlaylistVideoListContents(data);
        const entries = rawEntries
            .map((node) => parseEntry(node, uploader))
            .filter((e): e is NonNullable<ReturnType<typeof parseEntry>> => e !== null);

        return res.status(200).json({ title, uploader, entries });
    } catch (error: any) {
        console.error('[Playlist Info] Error:', error.message);
        return res.status(500).json({ error: error.message || 'Failed to fetch playlist' });
    }
}
