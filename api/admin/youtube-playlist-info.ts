import { VercelRequest, VercelResponse } from '@vercel/node';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

function extractPlaylistId(url: string): string | null {
    const m = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    return m ? m[1] : null;
}

// Find the matching closing brace for the `{` at `start`, respecting strings/escapes.
function findMatchingBrace(str: string, start: number): number {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < str.length; i++) {
        const c = str[i];
        if (escaped) { escaped = false; continue; }
        if (inString) {
            if (c === '\\') escaped = true;
            else if (c === '"') inString = false;
            continue;
        }
        if (c === '"') { inString = true; continue; }
        if (c === '{') depth++;
        else if (c === '}') {
            depth--;
            if (depth === 0) return i;
        }
    }
    return -1;
}

function extractInitialData(html: string): any {
    const markers = [
        'var ytInitialData = ',
        'window["ytInitialData"] = ',
        'ytInitialData = ',
    ];
    for (const marker of markers) {
        const idx = html.indexOf(marker);
        if (idx === -1) continue;
        const start = html.indexOf('{', idx + marker.length);
        if (start === -1) continue;
        const end = findMatchingBrace(html, start);
        if (end === -1) continue;
        try {
            return JSON.parse(html.substring(start, end + 1));
        } catch {}
    }
    throw new Error('Could not extract ytInitialData from playlist page');
}

function findPlaylistVideos(data: any): any[] {
    const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
    for (const tab of tabs) {
        const sections = tab?.tabRenderer?.content?.sectionListRenderer?.contents || [];
        for (const section of sections) {
            const items = section?.itemSectionRenderer?.contents || [];
            for (const item of items) {
                const list = item?.playlistVideoListRenderer?.contents;
                if (Array.isArray(list)) return list;
            }
        }
    }
    return [];
}

function findPlaylistMeta(data: any): { title: string; uploader: string } {
    const title =
        data?.metadata?.playlistMetadataRenderer?.title ||
        data?.header?.playlistHeaderRenderer?.title?.simpleText ||
        data?.header?.pageHeaderRenderer?.pageTitle ||
        'Playlist';

    const uploader =
        data?.header?.playlistHeaderRenderer?.ownerText?.runs?.[0]?.text ||
        data?.sidebar?.playlistSidebarRenderer?.items?.[1]
            ?.playlistSidebarSecondaryInfoRenderer?.videoOwner?.videoOwnerRenderer
            ?.title?.runs?.[0]?.text ||
        '';

    return { title, uploader };
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
        const playlistId = extractPlaylistId(url);
        if (!playlistId) throw new Error('Could not extract playlist ID from URL');

        const resp = await fetch(`https://www.youtube.com/playlist?list=${playlistId}&hl=en`, {
            headers: {
                'User-Agent': UA,
                'Accept-Language': 'en-US,en;q=0.9',
            },
        });
        if (!resp.ok) throw new Error(`YouTube returned ${resp.status}`);

        const html = await resp.text();
        const initialData = extractInitialData(html);
        const { title: playlistTitle, uploader } = findPlaylistMeta(initialData);

        const videos = findPlaylistVideos(initialData);
        const entries = videos
            .filter((v: any) => v?.playlistVideoRenderer?.videoId)
            .map((v: any) => {
                const r = v.playlistVideoRenderer;
                const videoTitle =
                    r?.title?.runs?.[0]?.text ||
                    r?.title?.simpleText ||
                    r.videoId;
                const duration = r?.lengthSeconds ? parseInt(r.lengthSeconds, 10) : null;
                const author =
                    r?.shortBylineText?.runs?.[0]?.text ||
                    r?.longBylineText?.runs?.[0]?.text ||
                    '';
                return {
                    id: r.videoId,
                    title: videoTitle,
                    url: `https://www.youtube.com/watch?v=${r.videoId}`,
                    duration,
                    uploader: author,
                };
            });

        if (entries.length === 0) {
            throw new Error('No videos found in playlist (empty, private, or unavailable)');
        }

        return res.status(200).json({
            title: playlistTitle,
            uploader,
            entries,
        });
    } catch (error: any) {
        console.error('[Playlist Info] Error:', error.message);
        return res.status(500).json({ error: error.message || 'Failed to fetch playlist' });
    }
}
