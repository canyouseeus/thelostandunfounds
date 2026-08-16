import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabase';

/**
 * A photographer blocking out their own dates.
 *
 * Same gesture the owner already has on the admin booking calendar — tap a day
 * to close it, tap again to reopen it — pointed at `photographer_availability`
 * instead of `booking_availability`. The difference matters: the owner's blocks
 * shut the public booking form; these do not. Marking Saturday out here tells
 * the studio not to send *you* on Saturday, and the master calendar reads it as
 * "who is free", not as "the date is closed".
 *
 * Past days are inert. Blocking out last Tuesday says nothing anyone can act
 * on, and an accidental tap while scrolling back through the month shouldn't
 * write a row.
 */

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface Block {
    id: string;
    date: string;
    note: string | null;
}

const pad = (n: number) => String(n).padStart(2, '0');
const todayYmd = () => new Date().toLocaleDateString('en-CA');

function formatDay(ymd: string): string {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
    });
}

export default function CrewAvailabilityCalendar() {
    const today = new Date();
    const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
    const [blocks, setBlocks] = useState<Block[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pendingDate, setPendingDate] = useState<string | null>(null);
    const [note, setNote] = useState('');

    const authHeaders = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        return {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token || ''}`,
        };
    };

    // A year forward covers anything worth planning; the grid only ever shows
    // one month of it, but holding the year avoids a refetch per arrow press.
    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/crew/availability', { headers: await authHeaders() });
            const payload = await res.json();
            if (!res.ok) {
                setError(payload?.error || 'Could not load your calendar.');
                return;
            }
            setBlocks(payload.blocked || []);
        } catch {
            setError('Could not reach the server.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const blockedByDate = useMemo(() => {
        const m = new Map<string, Block>();
        for (const b of blocks) m.set(b.date, b);
        return m;
    }, [blocks]);

    const cells = useMemo(() => {
        const firstDay = new Date(cursor.year, cursor.month, 1).getDay();
        const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
        const out: (number | null)[] = [];
        for (let i = 0; i < firstDay; i++) out.push(null);
        for (let d = 1; d <= daysInMonth; d++) out.push(d);
        return out;
    }, [cursor]);

    const ymdFor = (day: number) => `${cursor.year}-${pad(cursor.month + 1)}-${pad(day)}`;

    const unblock = async (date: string) => {
        setSaving(true);
        setError(null);
        try {
            const res = await fetch('/api/crew/availability', {
                method: 'DELETE',
                headers: await authHeaders(),
                body: JSON.stringify({ date }),
            });
            if (!res.ok) {
                const payload = await res.json().catch(() => ({}));
                setError(payload?.error || 'Could not free that day up.');
                return;
            }
            setBlocks(prev => prev.filter(b => b.date !== date));
        } catch {
            setError('Could not reach the server.');
        } finally {
            setSaving(false);
        }
    };

    const confirmBlock = async () => {
        if (!pendingDate) return;
        setSaving(true);
        setError(null);
        try {
            const res = await fetch('/api/crew/availability', {
                method: 'POST',
                headers: await authHeaders(),
                body: JSON.stringify({ date: pendingDate, note }),
            });
            if (!res.ok) {
                const payload = await res.json().catch(() => ({}));
                setError(payload?.error || 'Could not block that day.');
                return;
            }
            setPendingDate(null);
            setNote('');
            // Refetch rather than patching state: the row we just upserted has
            // a server-side id we need for the unblock path.
            await load();
        } catch {
            setError('Could not reach the server.');
        } finally {
            setSaving(false);
        }
    };

    const upcoming = useMemo(() => {
        const now = todayYmd();
        return blocks.filter(b => b.date >= now).slice(0, 8);
    }, [blocks]);

    const stepMonth = (delta: number) => {
        setPendingDate(null);
        setNote('');
        setCursor(c => {
            const next = new Date(c.year, c.month + delta, 1);
            return { year: next.getFullYear(), month: next.getMonth() };
        });
    };

    return (
        <div className="bg-white/5 p-5 sm:p-6 text-white" style={{ borderRadius: 0 }}>
            <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
                <div className="text-left">
                    <h2 className="text-lg font-black uppercase tracking-tight">My Calendar</h2>
                    <p className="text-xs text-white/40 mt-1">
                        Tap a day to mark yourself unavailable. Tap it again to free it up.
                    </p>
                </div>
                <button
                    onClick={load}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-widest bg-white/10 text-white hover:bg-white hover:text-black transition-colors disabled:opacity-50"
                    style={{ borderRadius: 0 }}
                >
                    <ArrowPathIcon className="w-3 h-3" />
                    Refresh
                </button>
            </div>

            {error && <div className="bg-red-500/10 px-4 py-3 text-sm text-red-300 mb-4 text-left">{error}</div>}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <button
                            onClick={() => stepMonth(-1)}
                            className="p-1 text-white/40 hover:text-white transition-colors"
                            aria-label="Previous month"
                        >
                            <ChevronLeftIcon className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-black uppercase tracking-[0.2em]">
                            {MONTH_NAMES[cursor.month]} {cursor.year}
                        </span>
                        <button
                            onClick={() => stepMonth(1)}
                            className="p-1 text-white/40 hover:text-white transition-colors"
                            aria-label="Next month"
                        >
                            <ChevronRightIcon className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="grid grid-cols-7 mb-1">
                        {DAY_NAMES.map((d, i) => (
                            <div key={i} className="text-center text-[9px] font-black text-white/20 py-1">{d}</div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-0.5">
                        {cells.map((day, i) => {
                            if (!day) return <div key={`pad-${i}`} />;
                            const ymd = ymdFor(day);
                            const blocked = blockedByDate.has(ymd);
                            const past = ymd < todayYmd();
                            const isPending = pendingDate === ymd;

                            return (
                                <button
                                    key={ymd}
                                    disabled={past || saving}
                                    onClick={() => {
                                        if (blocked) { unblock(ymd); return; }
                                        setPendingDate(ymd);
                                        setNote('');
                                    }}
                                    title={
                                        past ? 'In the past'
                                            : blocked ? `${formatDay(ymd)}: tap to free up`
                                                : `${formatDay(ymd)}: tap to block out`
                                    }
                                    className={`aspect-square flex items-center justify-center text-[11px] font-bold transition-colors
                                        ${past
                                            ? 'text-white/10 cursor-default'
                                            : blocked
                                                ? 'bg-amber-500/25 text-amber-300 hover:bg-amber-500/40'
                                                : isPending
                                                    ? 'bg-white text-black'
                                                    : 'text-white/50 hover:bg-white/10'}
                                    `}
                                    style={{ borderRadius: 0 }}
                                >
                                    {day}
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex gap-4 mt-3 text-[9px] text-white/30 font-bold uppercase tracking-widest">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-500/40" /> Unavailable</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-white/10" /> Open</span>
                    </div>

                    {pendingDate && (
                        <div className="bg-white/5 p-4 space-y-3 mt-4">
                            <p className="text-xs font-black uppercase tracking-wider text-white text-left">
                                Block out {formatDay(pendingDate)}?
                            </p>
                            <input
                                type="text"
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                placeholder="Reason (optional): travelling, day job, another shoot…"
                                className="w-full bg-white/5 px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none"
                                style={{ borderRadius: 0 }}
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={confirmBlock}
                                    disabled={saving}
                                    className="flex-1 py-2 bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-white/80 transition-colors disabled:opacity-50"
                                    style={{ borderRadius: 0 }}
                                >
                                    {saving ? 'Saving…' : 'Block Date'}
                                </button>
                                <button
                                    onClick={() => { setPendingDate(null); setNote(''); }}
                                    className="px-4 py-2 bg-white/10 text-[10px] font-black uppercase tracking-widest text-white/60 hover:bg-white hover:text-black transition-colors"
                                    style={{ borderRadius: 0 }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="text-left">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-3">
                        Blocked Out Next
                    </h3>
                    {loading ? (
                        <p className="text-xs uppercase tracking-[0.3em] text-white/30">Loading…</p>
                    ) : upcoming.length === 0 ? (
                        <p className="text-sm text-white/40">
                            Nothing blocked out. You're showing as available for everything coming up.
                        </p>
                    ) : (
                        <ul className="space-y-px">
                            {upcoming.map(block => (
                                <li key={block.id} className="bg-white/5 px-3 py-2 flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-widest text-amber-300">
                                            {formatDay(block.date)}
                                        </p>
                                        {block.note && <p className="text-xs text-white/50 mt-1">{block.note}</p>}
                                    </div>
                                    <button
                                        onClick={() => unblock(block.date)}
                                        disabled={saving}
                                        className="text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors disabled:opacity-50 shrink-0"
                                    >
                                        Free Up
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    <p className="text-xs text-white/30 mt-4">
                        This feeds the studio's master calendar, so blocking a day here is enough.
                        No text needed. It doesn't close the date for anyone else on the roster.
                    </p>
                </div>
            </div>
        </div>
    );
}
