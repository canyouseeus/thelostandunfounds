import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowDownTrayIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface DownloadEvent {
    id: string;
    photo_id: string | null;
    google_drive_file_id: string | null;
    email: string | null;
    ip_address: string | null;
    user_agent: string | null;
    source: string;
    created_at: string;
    photos?: { title: string | null; thumbnail_url: string | null } | null;
}

interface PhotoAggregate {
    photo_id: string;
    title: string;
    thumbnail_url: string | null;
    download_count: number;
    last_download_at: string;
}

function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const day = Math.floor(hr / 24);
    return `${day}d ago`;
}

export default function AdminDownloadsPanel() {
    const [events, setEvents] = useState<DownloadEvent[]>([]);
    const [aggregates, setAggregates] = useState<PhotoAggregate[]>([]);
    const [totals, setTotals] = useState({ all: 0, last7: 0, last30: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        try {
            const { data: recent } = await supabase
                .from('photo_download_events')
                .select('id, photo_id, google_drive_file_id, email, ip_address, user_agent, source, created_at, photos(title, thumbnail_url)')
                .order('created_at', { ascending: false })
                .limit(50);
            setEvents((recent || []) as unknown as DownloadEvent[]);

            const now = Date.now();
            const d7 = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
            const d30 = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

            const [{ count: all }, { count: last7 }, { count: last30 }] = await Promise.all([
                supabase.from('photo_download_events').select('*', { count: 'exact', head: true }),
                supabase.from('photo_download_events').select('*', { count: 'exact', head: true }).gte('created_at', d7),
                supabase.from('photo_download_events').select('*', { count: 'exact', head: true }).gte('created_at', d30),
            ]);
            setTotals({ all: all ?? 0, last7: last7 ?? 0, last30: last30 ?? 0 });

            // Per-photo aggregate (top 50 most-downloaded)
            const { data: agg } = await supabase
                .from('photo_download_events')
                .select('photo_id, created_at, photos(title, thumbnail_url)')
                .not('photo_id', 'is', null)
                .order('created_at', { ascending: false })
                .limit(2000);
            const map = new Map<string, PhotoAggregate>();
            for (const row of (agg || []) as any[]) {
                if (!row.photo_id) continue;
                const existing = map.get(row.photo_id);
                if (existing) {
                    existing.download_count++;
                } else {
                    map.set(row.photo_id, {
                        photo_id: row.photo_id,
                        title: row.photos?.title || 'Untitled',
                        thumbnail_url: row.photos?.thumbnail_url || null,
                        download_count: 1,
                        last_download_at: row.created_at,
                    });
                }
            }
            setAggregates([...map.values()].sort((a, b) => b.download_count - a.download_count).slice(0, 50));
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        Downloads
                    </h3>
                    <p className="text-white/30 text-xs mt-1 hidden sm:block">
                        Every gallery download with email + IP captured for tracking.
                    </p>
                </div>
                <button
                    onClick={load}
                    className="text-white/40 hover:text-white transition-colors flex-shrink-0"
                    title="Refresh"
                >
                    <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <SummaryCard label="All time" value={totals.all} />
                <SummaryCard label="Last 30d" value={totals.last30} />
                <SummaryCard label="Last 7d" value={totals.last7} />
            </div>

            {/* Recent events */}
            <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">
                    Recent Downloads
                </p>
                {loading && events.length === 0 ? (
                    <p className="text-white/30 text-xs py-4">Loading…</p>
                ) : events.length === 0 ? (
                    <p className="text-white/30 text-xs py-4 italic">No downloads yet.</p>
                ) : (
                    <div className="space-y-1">
                        {events.map(ev => (
                            <div key={ev.id} className="flex items-center gap-3 p-2 bg-white/[0.03] hover:bg-white/[0.06] transition-colors">
                                {ev.photos?.thumbnail_url ? (
                                    <img src={ev.photos.thumbnail_url} alt="" className="w-10 h-10 object-cover flex-shrink-0" />
                                ) : (
                                    <div className="w-10 h-10 bg-white/5 flex-shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-white text-xs font-bold truncate">
                                        {ev.photos?.title || ev.google_drive_file_id || 'Unknown'}
                                    </p>
                                    <p className="text-white/40 text-[10px] truncate">
                                        {ev.email || ev.ip_address || 'anonymous'}
                                    </p>
                                </div>
                                <span className="text-white/30 text-[10px] font-mono flex-shrink-0">
                                    {timeAgo(ev.created_at)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Per-photo aggregate */}
            <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">
                    Top Photos
                </p>
                {aggregates.length === 0 ? (
                    <p className="text-white/30 text-xs py-4 italic">No data yet.</p>
                ) : (
                    <div className="space-y-1">
                        {aggregates.map(a => (
                            <div key={a.photo_id} className="flex items-center gap-3 p-2 bg-white/[0.03]">
                                {a.thumbnail_url ? (
                                    <img src={a.thumbnail_url} alt="" className="w-10 h-10 object-cover flex-shrink-0" />
                                ) : (
                                    <div className="w-10 h-10 bg-white/5 flex-shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-white text-xs font-bold truncate">{a.title}</p>
                                    <p className="text-white/30 text-[10px]">
                                        last {timeAgo(a.last_download_at)}
                                    </p>
                                </div>
                                <span className="text-white text-xs font-bold font-mono flex-shrink-0">
                                    {a.download_count}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
    return (
        <div className="bg-white/[0.03] p-3 sm:p-4">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">{label}</p>
            <p className="text-2xl sm:text-3xl font-black text-white">{value.toLocaleString()}</p>
        </div>
    );
}
