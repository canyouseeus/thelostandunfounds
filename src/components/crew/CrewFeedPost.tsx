import { useCallback, useEffect, useRef, useState } from 'react';
import { SpeakerWaveIcon, SpeakerXMarkIcon, MapPinIcon } from '@heroicons/react/24/outline';

/**
 * One post on the crew feed.
 *
 * Tumblr's shape, deliberately: one column, media at full column width, the
 * words under the picture rather than beside it, and tags along the bottom.
 * The tags here are the load-out — clicking one asks the feed for everything
 * else shot on that body or that lens, which is the thing a grid of thumbnails
 * can't answer.
 */

export interface FeedMedia {
    id: string;
    kind: 'photo' | 'video';
    url: string;
    poster_url: string | null;
    mime_type: string | null;
    width: number | null;
    height: number | null;
    duration_seconds: number | string | null;
    position: number;
}

export interface FeedGear {
    id: string;
    gear_id: string | null;
    category: string;
    make: string | null;
    model: string;
    details: string | null;
}

export interface FeedPost {
    id: string;
    photographer_id: string;
    caption: string | null;
    location: string | null;
    visibility: string;
    status: string;
    created_at: string;
    photographer: { id: string; name: string; instagram?: string | null } | null;
    media: FeedMedia[];
    gear: FeedGear[];
}

const when = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const initials = (name: string) =>
    (name || '?')
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0] || '')
        .join('')
        .toUpperCase();

/**
 * A reel, loaded only once it is actually being looked at.
 *
 * The `src` is attached imperatively rather than rendered into the JSX, and
 * that is the entire point of this component. A feed of `<video src>` elements
 * starts fetching every clip on the page whether or not anyone scrolls to it;
 * this project has already been moved between Supabase projects once to escape
 * an egress overage, and a wall of autoplaying video is the fastest way back
 * into one. So the poster frame carries the card, the observer attaches the
 * source at 50% visible, and scrolling past a reel without stopping costs the
 * poster and nothing else.
 */
function Reel({ item, muted, onToggleMute }: { item: FeedMedia; muted: boolean; onToggleMute: () => void }) {
    const ref = useRef<HTMLVideoElement>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el || typeof IntersectionObserver === 'undefined') {
            setVisible(true);
            return;
        }
        const observer = new IntersectionObserver(
            ([entry]) => setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.5),
            { threshold: [0, 0.5, 1] }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (visible) {
            if (!el.getAttribute('src')) el.setAttribute('src', item.url);
            const attempt = el.play();
            // Autoplay refusal is normal — a paused reel with its poster
            // showing is a fine outcome, and not an error worth logging.
            if (attempt && typeof attempt.catch === 'function') attempt.catch(() => { });
        } else {
            el.pause();
        }
    }, [visible, item.url]);

    const seconds = Number(item.duration_seconds);

    return (
        <div className="relative bg-black">
            <video
                ref={ref}
                poster={item.poster_url || undefined}
                muted={muted}
                loop
                playsInline
                preload="none"
                className="w-full h-auto block"
                style={{ borderRadius: 0 }}
            />
            <div className="absolute bottom-3 left-3 flex items-center gap-2">
                <span
                    className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest bg-black/70 backdrop-blur text-white"
                    style={{ borderRadius: 0 }}
                >
                    REEL{Number.isFinite(seconds) && seconds > 0 ? ` · ${seconds.toFixed(1)}S` : ''}
                </span>
                <button
                    type="button"
                    onClick={onToggleMute}
                    aria-label={muted ? 'Unmute' : 'Mute'}
                    className="p-1.5 bg-black/70 backdrop-blur text-white hover:bg-white hover:text-black transition-colors"
                    style={{ borderRadius: 0 }}
                >
                    {muted ? <SpeakerXMarkIcon className="w-3 h-3" /> : <SpeakerWaveIcon className="w-3 h-3" />}
                </button>
            </div>
        </div>
    );
}

interface Props {
    post: FeedPost;
    onGearClick?: (model: string) => void;
    onPhotographerClick?: (id: string) => void;
    footer?: React.ReactNode;
}

export default function CrewFeedPost({ post, onGearClick, onPhotographerClick, footer }: Props) {
    // Sound is per-post rather than global: unmuting one reel should not mean
    // the next four start shouting as they scroll past.
    const [muted, setMuted] = useState(true);
    const toggleMute = useCallback(() => setMuted((m) => !m), []);

    const name = post.photographer?.name || 'CREW';

    return (
        <article className="bg-white/5" style={{ borderRadius: 0 }}>
            <header className="flex items-center gap-3 p-4">
                <button
                    type="button"
                    onClick={() => onPhotographerClick?.(post.photographer_id)}
                    className="w-9 h-9 rounded-full bg-white/10 text-white text-xs font-bold flex items-center justify-center hover:bg-white hover:text-black transition-colors flex-shrink-0"
                    aria-label={`Posts by ${name}`}
                >
                    {initials(name)}
                </button>
                <div className="min-w-0">
                    <button
                        type="button"
                        onClick={() => onPhotographerClick?.(post.photographer_id)}
                        className="block text-xs font-bold uppercase tracking-widest text-white hover:text-white/60 transition-colors truncate"
                    >
                        {name}
                    </button>
                    <p className="text-[11px] text-white/40 flex items-center gap-1.5">
                        {when(post.created_at)}
                        {post.location && (
                            <>
                                <MapPinIcon className="w-3 h-3" />
                                <span className="truncate">{post.location}</span>
                            </>
                        )}
                        {post.visibility === 'crew' && (
                            <span className="text-amber-400 uppercase tracking-widest">· Crew only</span>
                        )}
                        {post.status === 'hidden' && (
                            <span className="text-white/30 uppercase tracking-widest">· Hidden</span>
                        )}
                    </p>
                </div>
            </header>

            {/* Photoset stacking rather than a carousel: a scroll shows every
                frame, where a carousel hides all but the first behind a tap. */}
            <div className="space-y-1">
                {post.media.map((item) =>
                    item.kind === 'video' ? (
                        <Reel key={item.id} item={item} muted={muted} onToggleMute={toggleMute} />
                    ) : (
                        <img
                            key={item.id}
                            src={item.url}
                            alt={post.caption || `Photo by ${name}`}
                            loading="lazy"
                            decoding="async"
                            width={item.width || undefined}
                            height={item.height || undefined}
                            className="w-full h-auto block"
                            style={{ borderRadius: 0 }}
                        />
                    )
                )}
            </div>

            {post.caption && (
                <div className="px-4 pt-4">
                    <p className="text-sm text-white/80 text-left whitespace-pre-wrap">{post.caption}</p>
                </div>
            )}

            {post.gear.length > 0 && (
                <div className="px-4 pt-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Shot on</p>
                    <div className="flex flex-wrap gap-1.5">
                        {post.gear.map((item) => {
                            const label = [item.make, item.model].filter(Boolean).join(' ');
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => onGearClick?.(item.model)}
                                    title={item.details || item.category}
                                    className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest bg-white/10 text-white/70 hover:bg-white hover:text-black transition-colors"
                                    style={{ borderRadius: 0 }}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="p-4">{footer}</div>
        </article>
    );
}
