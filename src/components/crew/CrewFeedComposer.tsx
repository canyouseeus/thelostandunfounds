import { useCallback, useEffect, useRef, useState } from 'react';
import { PhotoIcon, XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabase';

/**
 * Post to the crew feed.
 *
 * Two things make this more than a file input.
 *
 * The load-out is picked, not typed. Everyone on the roster has already filled
 * in /gear, so the kit comes back from the API as a list of chips and the
 * photographer taps the two or three they actually used. What gets stored on
 * the post is a copy of those rows — the kit list is replaced wholesale every
 * time somebody saves it, so a pointer would go stale the moment they sold a
 * lens.
 *
 * And the eight-second cap is enforced here, before a single byte moves. The
 * alternative — upload, then reject — spends the bandwidth anyway, on the
 * connection least able to afford it, since this gets used on a phone from a
 * shoot. Every clip is loaded into a detached <video> first: too long and it
 * never leaves the device. The same pass grabs a frame for the poster, which
 * is what lets the feed show a reel without downloading it.
 */

const MAX_VIDEO_SECONDS = 8;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_MEDIA = 10;
const BUCKET = 'crew-feed';

interface KitItem {
    id: string;
    category: string;
    make: string | null;
    model: string;
    details: string | null;
    is_primary: boolean;
}

interface Draft {
    key: string;
    file: File;
    kind: 'photo' | 'video';
    previewUrl: string;
    width: number;
    height: number;
    duration: number | null;
    poster: Blob | null;
}

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)}MB`;

const inputClass =
    'w-full bg-white/5 text-white placeholder-white/30 px-3 py-2 text-sm focus:bg-white/10 focus:outline-none';

/** First frame of a clip, as a JPEG small enough to be free to serve. */
function drawPoster(video: HTMLVideoElement): Promise<Blob | null> {
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return Promise.resolve(null);
    const scale = Math.min(1, 1080 / Math.max(w, h));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return Promise.resolve(null);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.72));
}

/**
 * Measure a clip and grab its poster, or refuse it.
 *
 * `duration` comes back as Infinity on iOS for some recordings, which would
 * walk straight past a `> 8` test — so an unreadable length is a rejection
 * rather than a pass. The server re-reads the real duration out of the stored
 * file afterwards regardless; this check is here to save the upload, not to be
 * the only one.
 */
function probeVideo(file: File): Promise<{ duration: number; width: number; height: number; poster: Blob | null }> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;

        let duration = 0;
        const fail = (message: string) => {
            URL.revokeObjectURL(url);
            reject(new Error(message));
        };

        video.onerror = () => fail(`${file.name}: that video could not be read.`);
        video.onloadedmetadata = () => {
            duration = video.duration;
            if (!Number.isFinite(duration) || duration <= 0) {
                return fail(`${file.name}: the clip length could not be read — re-export it as MP4 and try again.`);
            }
            if (duration > MAX_VIDEO_SECONDS + 0.25) {
                return fail(
                    `${file.name} is ${duration.toFixed(1)}s. Reels are capped at ${MAX_VIDEO_SECONDS} seconds — trim it and try again.`
                );
            }
            // Seek off zero: the very first frame of a phone clip is often the
            // sensor still settling, and a grey poster undersells the reel.
            video.currentTime = Math.min(0.15, duration / 2);
        };
        video.onseeked = async () => {
            const poster = await drawPoster(video);
            const width = video.videoWidth;
            const height = video.videoHeight;
            URL.revokeObjectURL(url);
            resolve({ duration, width, height, poster });
        };

        video.src = url;
    });
}

function probeImage(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            const size = { width: img.naturalWidth, height: img.naturalHeight };
            URL.revokeObjectURL(url);
            resolve(size);
        };
        // HEIC and friends won't decode in every browser. Missing dimensions
        // are cosmetic, so don't block the upload over them.
        img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve({ width: 0, height: 0 });
        };
        img.src = url;
    });
}

let draftCounter = 0;

export default function CrewFeedComposer({ onPosted }: { onPosted?: () => void }) {
    const [kit, setKit] = useState<KitItem[]>([]);
    const [selectedGear, setSelectedGear] = useState<Set<string>>(new Set());
    const [drafts, setDrafts] = useState<Draft[]>([]);
    const [caption, setCaption] = useState('');
    const [location, setLocation] = useState('');
    const [visibility, setVisibility] = useState<'public' | 'crew'>('public');
    const [loadingKit, setLoadingKit] = useState(true);
    const [onRoster, setOnRoster] = useState(false);
    const [usage, setUsage] = useState<{ used: number; quota: number } | null>(null);
    const [busy, setBusy] = useState(false);
    const [progress, setProgress] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [posted, setPosted] = useState(false);
    const fileInput = useRef<HTMLInputElement>(null);

    const authHeaders = useCallback(async (): Promise<Record<string, string>> => {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        return token ? { Authorization: `Bearer ${token}` } : {};
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch('/api/crew/feed?kit=1', { headers: await authHeaders() });
                const payload = await res.json();
                if (cancelled) return;
                if (!res.ok) {
                    setOnRoster(false);
                    setError(payload?.error || 'Could not load your kit.');
                    return;
                }
                setOnRoster(true);
                setKit(payload.items || []);
                setUsage({ used: Number(payload.used_bytes || 0), quota: Number(payload.quota_bytes || 0) });
            } catch {
                if (!cancelled) setError('Could not load your kit.');
            } finally {
                if (!cancelled) setLoadingKit(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [authHeaders]);

    // Object URLs outlive the component unless they are handed back.
    useEffect(
        () => () => {
            drafts.forEach((draft) => URL.revokeObjectURL(draft.previewUrl));
        },
        [drafts]
    );

    const addFiles = useCallback(
        async (files: FileList | null) => {
            if (!files?.length) return;
            setError(null);
            const room = MAX_MEDIA - drafts.length;
            if (room <= 0) {
                setError(`A post takes up to ${MAX_MEDIA} files.`);
                return;
            }

            const accepted: Draft[] = [];
            for (const file of Array.from(files).slice(0, room)) {
                const isVideo = file.type.startsWith('video/');
                const isImage = file.type.startsWith('image/');
                if (!isVideo && !isImage) {
                    setError(`${file.name}: only photos and video can be posted.`);
                    continue;
                }

                const ceiling = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
                if (file.size > ceiling) {
                    setError(
                        isVideo
                            ? `${file.name} is ${mb(file.size)}. Reels are capped at ${mb(MAX_VIDEO_BYTES)} — export 1080p rather than 4K/ProRes and it will fit.`
                            : `${file.name} is ${mb(file.size)}. Photos are capped at ${mb(MAX_IMAGE_BYTES)}.`
                    );
                    continue;
                }

                try {
                    if (isVideo) {
                        const probed = await probeVideo(file);
                        accepted.push({
                            key: `draft-${draftCounter++}`,
                            file,
                            kind: 'video',
                            previewUrl: URL.createObjectURL(probed.poster || file),
                            width: probed.width,
                            height: probed.height,
                            duration: probed.duration,
                            poster: probed.poster,
                        });
                    } else {
                        const size = await probeImage(file);
                        accepted.push({
                            key: `draft-${draftCounter++}`,
                            file,
                            kind: 'photo',
                            previewUrl: URL.createObjectURL(file),
                            width: size.width,
                            height: size.height,
                            duration: null,
                            poster: null,
                        });
                    }
                } catch (err: any) {
                    setError(err?.message || `${file.name} could not be added.`);
                }
            }

            if (accepted.length) setDrafts((current) => [...current, ...accepted]);
            if (fileInput.current) fileInput.current.value = '';
        },
        [drafts.length]
    );

    const removeDraft = (key: string) =>
        setDrafts((current) => {
            const target = current.find((draft) => draft.key === key);
            if (target) URL.revokeObjectURL(target.previewUrl);
            return current.filter((draft) => draft.key !== key);
        });

    const toggleGear = (id: string) =>
        setSelectedGear((current) => {
            const next = new Set(current);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    const submit = async () => {
        if (!drafts.length || busy) return;
        setBusy(true);
        setError(null);
        setPosted(false);

        try {
            const headers = { 'Content-Type': 'application/json', ...(await authHeaders()) };

            setProgress('Preparing…');
            const signRes = await fetch('/api/crew/feed?action=sign', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    files: drafts.map((draft) => ({
                        name: draft.file.name,
                        size: draft.file.size + (draft.poster?.size || 0),
                        type: draft.file.type,
                        duration: draft.duration,
                    })),
                }),
            });
            const signed = await signRes.json();
            if (!signRes.ok) throw new Error(signed?.error || 'Could not start the upload.');

            const media: any[] = [];
            for (const [index, draft] of drafts.entries()) {
                const target = signed.files[index];
                setProgress(`Uploading ${index + 1} of ${drafts.length}…`);

                const { error: uploadError } = await supabase.storage
                    .from(BUCKET)
                    .uploadToSignedUrl(target.path, target.token, draft.file, {
                        contentType: draft.file.type,
                        // A year. The feed is append-only per object — a path is
                        // never rewritten — so a long cache is free correctness
                        // and keeps repeat views off the storage bill.
                        cacheControl: '31536000',
                    });
                if (uploadError) throw new Error(`${draft.file.name}: ${uploadError.message}`);

                if (draft.poster && target.poster_path && target.poster_token) {
                    const { error: posterError } = await supabase.storage
                        .from(BUCKET)
                        .uploadToSignedUrl(target.poster_path, target.poster_token, draft.poster, {
                            contentType: 'image/jpeg',
                            cacheControl: '31536000',
                        });
                    // A missing poster costs a little egress on scroll; it is
                    // not worth failing an otherwise finished upload over.
                    if (posterError) console.warn('[feed] poster upload failed:', posterError.message);
                }

                media.push({
                    path: target.path,
                    poster_path: draft.poster ? target.poster_path : undefined,
                    name: draft.file.name,
                    type: draft.file.type,
                    size: draft.file.size,
                    width: draft.width || undefined,
                    height: draft.height || undefined,
                    duration: draft.duration ?? undefined,
                });
            }

            setProgress('Posting…');
            const gear = kit
                .filter((item) => selectedGear.has(item.id))
                .map((item) => ({
                    gear_id: item.id,
                    category: item.category,
                    make: item.make,
                    model: item.model,
                    details: item.details,
                }));

            const postRes = await fetch('/api/crew/feed', {
                method: 'POST',
                headers,
                body: JSON.stringify({ caption, location, visibility, media, gear }),
            });
            const payload = await postRes.json();
            if (!postRes.ok) throw new Error(payload?.error || 'Could not publish the post.');

            drafts.forEach((draft) => URL.revokeObjectURL(draft.previewUrl));
            setDrafts([]);
            setCaption('');
            setLocation('');
            setSelectedGear(new Set());
            setPosted(true);
            onPosted?.();
        } catch (err: any) {
            setError(err?.message || 'Something went wrong.');
        } finally {
            setBusy(false);
            setProgress('');
        }
    };

    if (loadingKit) {
        return (
            <div className="bg-white/5 p-6" style={{ borderRadius: 0 }}>
                <p className="text-sm text-white/40">Loading your kit…</p>
            </div>
        );
    }

    if (!onRoster) {
        return (
            <div className="bg-white/5 p-6" style={{ borderRadius: 0 }}>
                <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-2">Post to the feed</h3>
                <p className="text-sm text-white/50 text-left">
                    {error || 'Sign in as crew to post your work.'}
                </p>
            </div>
        );
    }

    const quotaPct = usage && usage.quota > 0 ? Math.min(100, (usage.used / usage.quota) * 100) : 0;

    return (
        <div className="bg-white/5 p-6" style={{ borderRadius: 0 }}>
            <div className="flex items-baseline justify-between mb-4 gap-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-white">Post your work</h3>
                {usage && usage.quota > 0 && (
                    <span className="text-[10px] uppercase tracking-widest text-white/30">
                        {mb(usage.used)} of {(usage.quota / 1024 / 1024 / 1024).toFixed(1)}GB used
                    </span>
                )}
            </div>

            {quotaPct > 80 && (
                <div className="h-1 bg-white/10 mb-4">
                    <div className="h-1 bg-amber-400" style={{ width: `${quotaPct}%` }} />
                </div>
            )}

            {/* Media */}
            <div className="flex flex-wrap gap-2 mb-4">
                {drafts.map((draft) => (
                    <div key={draft.key} className="relative w-24 h-24 bg-black overflow-hidden">
                        <img src={draft.previewUrl} alt="" className="w-full h-full object-cover" />
                        {draft.kind === 'video' && (
                            <span className="absolute bottom-1 left-1 px-1 py-0.5 text-[9px] font-bold uppercase tracking-widest bg-black/80 text-white">
                                {draft.duration ? `${draft.duration.toFixed(1)}S` : 'REEL'}
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={() => removeDraft(draft.key)}
                            aria-label="Remove"
                            className="absolute top-1 right-1 p-1 bg-black/80 text-white hover:bg-white hover:text-black transition-colors"
                            style={{ borderRadius: 0 }}
                        >
                            <XMarkIcon className="w-3 h-3" />
                        </button>
                    </div>
                ))}

                {drafts.length < MAX_MEDIA && (
                    <button
                        type="button"
                        onClick={() => fileInput.current?.click()}
                        className="w-24 h-24 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white flex flex-col items-center justify-center gap-1 transition-colors"
                        style={{ borderRadius: 0 }}
                    >
                        <PhotoIcon className="w-5 h-5" />
                        <span className="text-[9px] font-bold uppercase tracking-widest">Add</span>
                    </button>
                )}
                <input
                    ref={fileInput}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    className="hidden"
                    onChange={(e) => addFiles(e.target.files)}
                />
            </div>

            <p className="text-[10px] uppercase tracking-widest text-white/25 mb-4">
                Photos to {mb(MAX_IMAGE_BYTES)} · Reels to {MAX_VIDEO_SECONDS}s and {mb(MAX_VIDEO_BYTES)} · {MAX_MEDIA} per post
            </p>

            <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="What is this?"
                rows={3}
                maxLength={2000}
                className={`${inputClass} mb-2 resize-none text-left`}
                style={{ borderRadius: 0 }}
            />

            <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Where (optional)"
                maxLength={160}
                className={`${inputClass} mb-4`}
                style={{ borderRadius: 0 }}
            />

            {/* Load-out */}
            <div className="mb-4">
                <div className="flex items-baseline justify-between mb-2 gap-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                        Load-out {selectedGear.size > 0 && `· ${selectedGear.size} selected`}
                    </p>
                    <a
                        href="/gear"
                        className="text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors"
                    >
                        Edit kit
                    </a>
                </div>

                {kit.length === 0 ? (
                    <a
                        href="/gear"
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-widest bg-white/10 text-white hover:bg-white hover:text-black transition-colors"
                        style={{ borderRadius: 0 }}
                    >
                        <PlusIcon className="w-3 h-3" />
                        Add your kit first
                    </a>
                ) : (
                    <div className="flex flex-wrap gap-1.5">
                        {kit.map((item) => {
                            const on = selectedGear.has(item.id);
                            const label = [item.make, item.model].filter(Boolean).join(' ');
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => toggleGear(item.id)}
                                    title={item.details || item.category}
                                    aria-pressed={on}
                                    className={`px-2 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors ${on ? 'bg-white text-black' : 'bg-white/10 text-white/60 hover:bg-white/20'
                                        }`}
                                    style={{ borderRadius: 0 }}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value as 'public' | 'crew')}
                    className="bg-white/5 text-white text-xs font-bold uppercase tracking-widest px-3 py-2 focus:outline-none focus:bg-white/10"
                    style={{ borderRadius: 0 }}
                >
                    <option value="public">Public</option>
                    <option value="crew">Crew only</option>
                </select>

                <button
                    type="button"
                    onClick={submit}
                    disabled={busy || drafts.length === 0}
                    className="px-4 py-2 text-sm font-bold uppercase tracking-widest bg-white text-black hover:bg-white/10 hover:text-white transition-colors disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-black"
                    style={{ borderRadius: 0 }}
                >
                    {busy ? progress || 'Posting…' : 'Post'}
                </button>

                {posted && <span className="text-xs uppercase tracking-widest text-green-400">Posted</span>}
            </div>

            {error && <p className="mt-3 text-sm text-red-400 text-left">{error}</p>}
        </div>
    );
}
