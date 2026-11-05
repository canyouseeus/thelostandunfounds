import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, ArrowPathIcon, LinkIcon } from '@heroicons/react/24/outline';
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
 * A block is either the whole day or a window ("out 1–3pm"), and a day can
 * hold several windows. Tapping a day opens it rather than toggling it, because
 * there's now more than one thing a tap could mean.
 *
 * Their own calendar can feed this too: paste the iCal address once and busy
 * time from Google / iCloud / Outlook syncs in hourly (`_ical-sync.ts`).
 * Synced blocks are read-only here — they change in the calendar they came from.
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
    start_time: string | null;
    end_time: string | null;
    note: string | null;
    source: 'manual' | 'ical';
}

interface CalendarSync {
    connected: boolean;
    source: string | null;
    syncedAt: string | null;
    error: string | null;
    count: number | null;
}

const pad = (n: number) => String(n).padStart(2, '0');
const todayYmd = () => new Date().toLocaleDateString('en-CA');

/** "13:00" → "1:00 PM". */
function formatClock(hhmm: string): string {
    const [h, m] = hhmm.split(':').map(Number);
    if (h === 24) return '12:00 AM';
    return `${h % 12 || 12}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`;
}

const blockWindow = (b: Block) =>
    b.start_time && b.end_time ? `${formatClock(b.start_time)} – ${formatClock(b.end_time)}` : 'All day';

function timeAgo(iso: string): string {
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.round(hours / 24)}d ago`;
}

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
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [note, setNote] = useState('');
    const [allDay, setAllDay] = useState(true);
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('17:00');
    const [sync, setSync] = useState<CalendarSync | null>(null);
    const [feedUrl, setFeedUrl] = useState('');
    const [syncing, setSyncing] = useState(false);
    const [showFeedHelp, setShowFeedHelp] = useState(false);

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
            setSync(payload.calendarSync || null);
        } catch {
            setError('Could not reach the server.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const blocksByDate = useMemo(() => {
        const m = new Map<string, Block[]>();
        for (const b of blocks) m.set(b.date, [...(m.get(b.date) || []), b]);
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

    const removeBlock = async (id: string) => {
        setSaving(true);
        setError(null);
        try {
            const res = await fetch('/api/crew/availability', {
                method: 'DELETE',
                headers: await authHeaders(),
                body: JSON.stringify({ id }),
            });
            if (!res.ok) {
                const payload = await res.json().catch(() => ({}));
                setError(payload?.error || 'Could not free that time up.');
                return;
            }
            setBlocks(prev => prev.filter(b => b.id !== id));
        } catch {
            setError('Could not reach the server.');
        } finally {
            setSaving(false);
        }
    };

    const confirmBlock = async () => {
        if (!selectedDate) return;
        if (!allDay && endTime <= startTime) {
            setError('End time has to be after the start time.');
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const res = await fetch('/api/crew/availability', {
                method: 'POST',
                headers: await authHeaders(),
                body: JSON.stringify({
                    date: selectedDate,
                    note,
                    ...(allDay ? {} : { start_time: startTime, end_time: endTime }),
                }),
            });
            if (!res.ok) {
                const payload = await res.json().catch(() => ({}));
                setError(payload?.error || 'Could not block that day.');
                return;
            }
            setNote('');
            // Refetch rather than patching state: the row we just inserted has
            // a server-side id we need for the remove path.
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

    const updateFeed = async (body: Record<string, unknown>) => {
        setSyncing(true);
        setError(null);
        try {
            const res = await fetch('/api/crew/availability', {
                method: 'PUT',
                headers: await authHeaders(),
                body: JSON.stringify(body),
            });
            const payload = await res.json().catch(() => ({}));
            if (payload?.calendarSync) setSync(payload.calendarSync);
            if (!res.ok) {
                setError(payload?.error || 'Could not sync that calendar.');
            } else {
                setFeedUrl('');
            }
            await load();
        } catch {
            setError('Could not reach the server.');
        } finally {
            setSyncing(false);
        }
    };

    const selectedBlocks = selectedDate ? blocksByDate.get(selectedDate) || [] : [];
    const selectedAllDay = selectedBlocks.some(b => !b.start_time);

    const stepMonth = (delta: number) => {
        setSelectedDate(null);
        setNote('');
        setCursor(c => {
            const next = new Date(c.year, c.month + delta, 1);
            return { year: next.getFullYear(), month: next.getMonth() };
        });
    };

    return (
        <div data-tour="pg-calendar" className="bg-white/5 p-5 sm:p-6 text-white" style={{ borderRadius: 0 }}>
            <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
                <div className="text-left">
                    <h2 className="text-lg font-black uppercase tracking-tight">My Calendar</h2>
                    <p className="text-xs text-white/40 mt-1">
                        Tap a day to block it out, all day or just the hours you're busy.
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
                            const dayBlocks = blocksByDate.get(ymd) || [];
                            const fullDay = dayBlocks.some(b => !b.start_time);
                            const partial = !fullDay && dayBlocks.length > 0;
                            const past = ymd < todayYmd();
                            const isSelected = selectedDate === ymd;

                            return (
                                <button data-tour="pg-cal-day"
                                    key={ymd}
                                    disabled={past}
                                    onClick={() => {
                                        setSelectedDate(isSelected ? null : ymd);
                                        setNote('');
                                        setAllDay(true);
                                    }}
                                    title={
                                        past ? 'In the past'
                                            : dayBlocks.length ? `${formatDay(ymd)}: ${dayBlocks.map(blockWindow).join(', ')}`
                                                : `${formatDay(ymd)}: tap to block out`
                                    }
                                    className={`aspect-square flex flex-col items-center justify-center gap-1 text-[11px] font-bold transition-colors
                                        ${past
                                            ? 'text-white/10 cursor-default'
                                            : isSelected
                                                ? 'bg-white text-black'
                                                : fullDay
                                                    ? 'bg-amber-500/25 text-amber-300 hover:bg-amber-500/40'
                                                    : partial
                                                        ? 'bg-amber-500/10 text-amber-200 hover:bg-amber-500/20'
                                                        : 'text-white/50 hover:bg-white/10'}
                                    `}
                                    style={{ borderRadius: 0 }}
                                >
                                    {day}
                                    {partial && !past && <span className={`w-3 h-0.5 ${isSelected ? 'bg-black' : 'bg-amber-400'}`} />}
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex gap-4 mt-3 text-[9px] text-white/30 font-bold uppercase tracking-widest">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-500/40" /> All day</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-amber-400" /> Part of day</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-white/10" /> Open</span>
                    </div>

                    {selectedDate && (
                        <div className="bg-white/5 p-4 space-y-3 mt-4 text-left">
                            <p className="text-xs font-black uppercase tracking-wider text-white">
                                {formatDay(selectedDate)}
                            </p>

                            {selectedBlocks.length > 0 && (
                                <ul className="space-y-px">
                                    {selectedBlocks.map(block => (
                                        <li key={block.id} className="bg-amber-500/10 px-3 py-2 flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-amber-300">
                                                    {blockWindow(block)}
                                                </p>
                                                {block.note && <p className="text-xs text-white/50 mt-1">{block.note}</p>}
                                            </div>
                                            {block.source === 'manual' ? (
                                                <button
                                                    onClick={() => removeBlock(block.id)}
                                                    disabled={saving}
                                                    className="text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors disabled:opacity-50 shrink-0"
                                                >
                                                    Free Up
                                                </button>
                                            ) : (
                                                <span className="text-[9px] font-black uppercase tracking-widest text-white/25 shrink-0">Synced</span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {!selectedAllDay && (
                                <>
                                    <div className="flex gap-px">
                                        {[{ v: true, label: 'All Day' }, { v: false, label: 'Set Hours' }].map(opt => (
                                            <button
                                                key={opt.label}
                                                onClick={() => setAllDay(opt.v)}
                                                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest transition-colors ${
                                                    allDay === opt.v ? 'bg-white text-black' : 'bg-white/5 text-white/50 hover:bg-white/10'
                                                }`}
                                                style={{ borderRadius: 0 }}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                    {!allDay && (
                                        <div className="grid grid-cols-2 gap-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-white/40">
                                                From
                                                <input
                                                    type="time"
                                                    value={startTime}
                                                    onChange={e => setStartTime(e.target.value)}
                                                    className="mt-1 w-full bg-white/5 px-3 py-2 text-xs text-white focus:outline-none [color-scheme:dark]"
                                                    style={{ borderRadius: 0 }}
                                                />
                                            </label>
                                            <label className="text-[9px] font-black uppercase tracking-widest text-white/40">
                                                To
                                                <input
                                                    type="time"
                                                    value={endTime}
                                                    onChange={e => setEndTime(e.target.value)}
                                                    className="mt-1 w-full bg-white/5 px-3 py-2 text-xs text-white focus:outline-none [color-scheme:dark]"
                                                    style={{ borderRadius: 0 }}
                                                />
                                            </label>
                                        </div>
                                    )}
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
                                            {saving ? 'Saving…' : allDay ? 'Block Whole Day' : `Block ${formatClock(startTime)} – ${formatClock(endTime)}`}
                                        </button>
                                        <button
                                            onClick={() => { setSelectedDate(null); setNote(''); }}
                                            className="px-4 py-2 bg-white/10 text-[10px] font-black uppercase tracking-widest text-white/60 hover:bg-white hover:text-black transition-colors"
                                            style={{ borderRadius: 0 }}
                                        >
                                            Close
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                <div data-tour="pg-cal-blocked" className="text-left">
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
                                            {formatDay(block.date)} · {blockWindow(block)}
                                        </p>
                                        {block.note && <p className="text-xs text-white/50 mt-1">{block.note}</p>}
                                    </div>
                                    {block.source === 'manual' ? (
                                        <button
                                            onClick={() => removeBlock(block.id)}
                                            disabled={saving}
                                            className="text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors disabled:opacity-50 shrink-0"
                                        >
                                            Free Up
                                        </button>
                                    ) : (
                                        <span className="text-[9px] font-black uppercase tracking-widest text-white/25 shrink-0">Synced</span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                    <p className="text-xs text-white/30 mt-4">
                        This feeds the studio's master calendar, so blocking time here is enough.
                        No text needed. It doesn't close the date for anyone else on the roster.
                    </p>

                    <div className="bg-white/5 p-4 mt-6 space-y-3">
                        <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-white/60">
                            <LinkIcon className="w-3 h-3" /> Sync Your Calendar
                        </h3>
                        {sync?.connected ? (
                            <>
                                <p className="text-xs text-white/60">
                                    Connected to <span className="text-white">{sync.source}</span>.{' '}
                                    {sync.syncedAt
                                        ? <>Last synced {timeAgo(sync.syncedAt)}{sync.count != null && <> · {sync.count} busy {sync.count === 1 ? 'block' : 'blocks'}</>}.</>
                                        : 'Not synced yet.'}
                                    {' '}Re-syncs every hour.
                                </p>
                                {sync.error && <p className="text-xs text-red-300">{sync.error}</p>}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => updateFeed({ sync: true })}
                                        disabled={syncing}
                                        className="flex-1 py-2 bg-white/10 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white hover:text-black transition-colors disabled:opacity-50"
                                        style={{ borderRadius: 0 }}
                                    >
                                        {syncing ? 'Syncing…' : 'Sync Now'}
                                    </button>
                                    <button
                                        onClick={() => updateFeed({ ical_url: null })}
                                        disabled={syncing}
                                        className="px-4 py-2 bg-white/5 text-[10px] font-black uppercase tracking-widest text-white/40 hover:bg-white hover:text-black transition-colors disabled:opacity-50"
                                        style={{ borderRadius: 0 }}
                                    >
                                        Disconnect
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="text-xs text-white/50">
                                    Paste your calendar's iCal address and anything you're busy for blocks itself out here, hourly.
                                    Only the times come across, never what the event is.
                                </p>
                                <input
                                    type="url"
                                    value={feedUrl}
                                    onChange={e => setFeedUrl(e.target.value)}
                                    placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
                                    className="w-full bg-white/5 px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none"
                                    style={{ borderRadius: 0 }}
                                />
                                <button
                                    onClick={() => updateFeed({ ical_url: feedUrl })}
                                    disabled={syncing || !feedUrl.trim()}
                                    className="w-full py-2 bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-white/80 transition-colors disabled:opacity-50"
                                    style={{ borderRadius: 0 }}
                                >
                                    {syncing ? 'Connecting…' : 'Connect Calendar'}
                                </button>
                                <button
                                    onClick={() => setShowFeedHelp(v => !v)}
                                    className="text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors"
                                >
                                    {showFeedHelp ? 'Hide' : 'Where do I find this?'}
                                </button>
                                {showFeedHelp && (
                                    <ul className="text-xs text-white/50 space-y-2">
                                        <li><span className="text-white">Google:</span> calendar.google.com → Settings → pick your calendar → Integrate calendar → copy <em>Secret address in iCal format</em>.</li>
                                        <li><span className="text-white">Apple / iCloud:</span> Calendar app → right-click the calendar → Share → tick <em>Public Calendar</em> → copy the link.</li>
                                        <li><span className="text-white">Outlook:</span> Settings → Calendar → Shared calendars → Publish a calendar → copy the ICS link.</li>
                                    </ul>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
