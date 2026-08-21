import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import SEOHead from '../components/SEOHead';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import CrewFeedComposer from '../components/crew/CrewFeedComposer';
import CrewFeedPost, { type FeedPost } from '../components/crew/CrewFeedPost';

/**
 * THE WIRE — the crew's own feed.
 *
 * A reverse-chronological single column rather than a grid, because the unit
 * here is a post and not a thumbnail: a set of frames, what it was, and what it
 * was shot on. The gallery already does grids, and does them for work that is
 * for sale. This is the other thing — the shot from Tuesday nobody is invoicing
 * for.
 *
 * The load-out is the feed's index. Tapping the lens under a post asks for
 * every other post shot on that lens, across the whole roster, which turns a
 * scroll into an answer to "what does that glass actually look like".
 *
 * Paging is a `before` cursor on created_at rather than an offset. Posts are
 * inserted at the head constantly, and an offset page 2 silently repeats rows
 * every time somebody posts mid-scroll.
 */

const PAGE = 12;

export default function CrewFeed() {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();

    const gear = searchParams.get('gear') || '';
    const photographer = searchParams.get('photographer') || '';

    const [posts, setPosts] = useState<FeedPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [exhausted, setExhausted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const buildUrl = useCallback(
        (before?: string) => {
            const params = new URLSearchParams();
            params.set('limit', String(PAGE));
            if (gear) params.set('gear', gear);
            if (photographer) params.set('photographer', photographer);
            if (before) params.set('before', before);
            return `/api/crew/feed?${params.toString()}`;
        },
        [gear, photographer]
    );

    // Signed-in crew see 'crew only' posts as well, so the token rides along
    // when there is one. Anonymous readers get the public wall.
    const authHeaders = useCallback(async (): Promise<Record<string, string>> => {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        return token ? { Authorization: `Bearer ${token}` } : {};
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        setExhausted(false);
        try {
            const res = await fetch(buildUrl(), { headers: await authHeaders() });
            const payload = await res.json();
            if (!res.ok) throw new Error(payload?.error || 'Could not load the feed.');
            setPosts(payload.posts || []);
            setExhausted((payload.posts || []).length < PAGE);
        } catch (err: any) {
            setError(err?.message || 'Could not load the feed.');
        } finally {
            setLoading(false);
        }
    }, [buildUrl, authHeaders]);

    useEffect(() => {
        load();
    }, [load]);

    const loadMore = async () => {
        const last = posts[posts.length - 1];
        if (!last || loadingMore) return;
        setLoadingMore(true);
        try {
            const res = await fetch(buildUrl(last.created_at), { headers: await authHeaders() });
            const payload = await res.json();
            if (!res.ok) throw new Error(payload?.error || 'Could not load more.');
            const next: FeedPost[] = payload.posts || [];
            setPosts((current) => [...current, ...next]);
            if (next.length < PAGE) setExhausted(true);
        } catch (err: any) {
            setError(err?.message || 'Could not load more.');
        } finally {
            setLoadingMore(false);
        }
    };

    const setFilter = (key: 'gear' | 'photographer', value: string) => {
        const params = new URLSearchParams(searchParams);
        if (value) params.set(key, value);
        else params.delete(key);
        // One filter at a time: "this lens, by this person" reads as an
        // advanced search nobody asked for, and usually returns nothing.
        params.delete(key === 'gear' ? 'photographer' : 'gear');
        setSearchParams(params);
        window.scrollTo({ top: 0 });
    };

    const clearFilters = () => {
        setSearchParams(new URLSearchParams());
        window.scrollTo({ top: 0 });
    };

    const filterLabel = gear || (photographer ? posts[0]?.photographer?.name || 'this photographer' : '');

    return (
        <>
            <SEOHead
                title="The Wire — Crew Feed"
                description="Work from the THE LOST+UNFOUNDS photography crew: photos, eight-second reels, and the exact kit each frame was shot on."
                canonicalPath="/feed"
            />

            <div className="min-h-screen bg-black text-white">
                <div className="max-w-2xl mx-auto px-4 pt-12 pb-32">
                    <header className="mb-8">
                        <h1 className="text-3xl md:text-4xl font-bold uppercase tracking-tighter">THE WIRE</h1>
                        <p className="text-sm text-white/40 text-left mt-2">
                            What the crew shot, and what they shot it on.
                        </p>
                    </header>

                    {user && (
                        <div className="mb-8">
                            <CrewFeedComposer onPosted={load} />
                        </div>
                    )}

                    {filterLabel && (
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="inline-flex items-center gap-2 mb-6 px-3 py-2 text-[10px] font-bold uppercase tracking-widest bg-white text-black hover:bg-white/10 hover:text-white transition-colors"
                            style={{ borderRadius: 0 }}
                        >
                            {gear ? 'Shot on' : 'By'} {filterLabel}
                            <XMarkIcon className="w-3 h-3" />
                        </button>
                    )}

                    {loading ? (
                        <p className="text-sm text-white/40">Loading…</p>
                    ) : error ? (
                        <div className="bg-white/5 p-6" style={{ borderRadius: 0 }}>
                            <p className="text-sm text-red-400 text-left">{error}</p>
                        </div>
                    ) : posts.length === 0 ? (
                        <div className="bg-white/5 p-6" style={{ borderRadius: 0 }}>
                            <p className="text-sm text-white/50 text-left">
                                {filterLabel
                                    ? 'Nothing posted with that yet.'
                                    : 'Nothing on the wire yet. Crew — you go first.'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {posts.map((post) => (
                                <CrewFeedPost
                                    key={post.id}
                                    post={post}
                                    onGearClick={(model) => setFilter('gear', model)}
                                    onPhotographerClick={(id) => setFilter('photographer', id)}
                                />
                            ))}
                        </div>
                    )}

                    {!loading && !exhausted && posts.length > 0 && (
                        <div className="mt-8">
                            <button
                                type="button"
                                onClick={loadMore}
                                disabled={loadingMore}
                                className="w-full px-4 py-3 text-xs font-bold uppercase tracking-widest bg-white/10 text-white hover:bg-white hover:text-black transition-colors disabled:opacity-40"
                                style={{ borderRadius: 0 }}
                            >
                                {loadingMore ? 'Loading…' : 'Older posts'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
