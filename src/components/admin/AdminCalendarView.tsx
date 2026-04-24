import React, { useEffect, useMemo, useState } from 'react';
import {
    CalendarIcon,
    ArrowPathIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    PhotoIcon,
    TicketIcon,
    ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { CalendarWidget } from '../ui/calendar-widget';

// Server-side endpoint response shape
interface CalendarBooking {
    id: string;
    name: string;
    business_name?: string | null;
    email: string;
    event_type: string;
    event_date: string;
    start_time: string | null;
    end_time: string | null;
    location: string | null;
    status: string;
    retainer: boolean;
}
interface CalendarEventRow {
    id: string;
    title: string;
    event_date: string;
    status: string;
    location: string | null;
    image_url: string | null;
}
interface CalendarPhoto {
    id: string;
    title: string;
    thumbnail_url: string;
    created_at: string;
}
interface CalendarRangeResponse {
    range: { start: string; end: string };
    bookings: CalendarBooking[];
    events: CalendarEventRow[];
    adminBlocked: Array<{ date: string; note: string | null }>;
    photos: Record<string, CalendarPhoto[]>;
    summary: { bookingCount: number; eventCount: number; photoCount: number; blockedCount: number };
}

function toYMD(d: Date): string {
    return d.toLocaleDateString('en-CA');
}

function monthWindow(viewDate: Date): { start: string; end: string } {
    const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const last = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
    return { start: toYMD(first), end: toYMD(last) };
}

function formatDateHuman(ymd: string): string {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });
}

function datesInRange(start: string, end: string): string[] {
    const [ys, ms, ds] = start.split('-').map(Number);
    const [ye, me, de] = end.split('-').map(Number);
    const s = new Date(ys, ms - 1, ds);
    const e = new Date(ye, me - 1, de);
    const out: string[] = [];
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        out.push(toYMD(d));
    }
    return out;
}

type RangeMode = 'idle' | 'picking-end';

export default function AdminCalendarView() {
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [mode, setMode] = useState<RangeMode>('idle');
    const [data, setData] = useState<CalendarRangeResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [reviewExpanded, setReviewExpanded] = useState<'collapsed' | 'glance' | 'deep'>('glance');
    const [monthCursor, setMonthCursor] = useState<Date>(new Date());

    // Pull the visible month from the server so we can paint activity dots.
    useEffect(() => {
        const { start, end } = monthWindow(monthCursor);
        load(start, end);
    }, [monthCursor]);

    async function load(start: string, end: string) {
        setLoading(true);
        try {
            const res = await fetch(`/api/calendar/range?start=${start}&end=${end}`);
            if (!res.ok) { setData(null); return; }
            setData(await res.json());
        } finally {
            setLoading(false);
        }
    }

    // Bucket activity by YYYY-MM-DD so the calendar dots know what to render.
    const activityByDate = useMemo(() => {
        const m = new Map<string, { bookings: number; events: number; photos: number; blocked: boolean }>();
        const ensure = (d: string) => {
            if (!m.has(d)) m.set(d, { bookings: 0, events: 0, photos: 0, blocked: false });
            return m.get(d)!;
        };
        if (!data) return m;
        for (const b of data.bookings) ensure(b.event_date).bookings++;
        for (const e of data.events) ensure(e.event_date).events++;
        for (const d of Object.keys(data.photos)) ensure(d).photos += data.photos[d].length;
        for (const a of data.adminBlocked) ensure(a.date).blocked = true;
        return m;
    }, [data]);

    function handleDateClick(date: Date) {
        if (mode === 'idle' || (startDate && endDate)) {
            setStartDate(date);
            setEndDate(null);
            setMode('picking-end');
        } else {
            // Completing range; swap if user picked earlier date
            if (date < startDate!) {
                setEndDate(startDate);
                setStartDate(date);
            } else {
                setEndDate(date);
            }
            setMode('idle');
            setReviewExpanded('glance');
        }
    }

    function resetSelection() {
        setStartDate(null);
        setEndDate(null);
        setMode('idle');
    }

    const selectedRange = useMemo(() => {
        if (!startDate) return null;
        const s = toYMD(startDate);
        const e = endDate ? toYMD(endDate) : s;
        return { start: s, end: e };
    }, [startDate, endDate]);

    // Bookings, events, photos in the currently selected range (from state)
    const review = useMemo(() => {
        if (!selectedRange || !data) return null;
        const days = new Set(datesInRange(selectedRange.start, selectedRange.end));
        const bookings = data.bookings.filter(b => days.has(b.event_date));
        const events = data.events.filter(e => days.has(e.event_date));
        const photos: CalendarPhoto[] = [];
        for (const d of days) {
            const list = data.photos[d];
            if (list) photos.push(...list);
        }
        return { bookings, events, photos };
    }, [selectedRange, data]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4" />
                        Master Calendar
                    </h3>
                    <p className="text-white/30 text-xs mt-1 hidden sm:block">
                        Site-wide activity — bookings, events, uploads. Click a date (or a start + end) to open Time in Review.
                    </p>
                </div>
                <button
                    onClick={() => { const { start, end } = monthWindow(monthCursor); load(start, end); }}
                    className="text-white/40 hover:text-white transition-colors flex-shrink-0"
                    title="Refresh"
                >
                    <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <SummaryCard label="Bookings" value={data?.summary.bookingCount ?? 0} accent="yellow" />
                <SummaryCard label="Events" value={data?.summary.eventCount ?? 0} accent="green" />
                <SummaryCard label="Uploads" value={data?.summary.photoCount ?? 0} accent="white" />
            </div>

            {/* Calendar + dots overlay */}
            <div className="bg-white/[0.02] p-4 sm:p-6">
                <CalendarWidget
                    startDate={startDate}
                    endDate={endDate}
                    interactive
                    onDateSelect={handleDateClick}
                />
                <ActivityLegend />
                <ActivityDots activityByDate={activityByDate} monthCursor={monthCursor} onMonthChange={setMonthCursor} />
                {selectedRange && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                        <p className="text-white/60 text-xs">
                            {selectedRange.start === selectedRange.end
                                ? formatDateHuman(selectedRange.start)
                                : `${formatDateHuman(selectedRange.start)} → ${formatDateHuman(selectedRange.end)}`}
                        </p>
                        <button
                            onClick={resetSelection}
                            className="text-white/40 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors"
                        >
                            Clear
                        </button>
                    </div>
                )}
            </div>

            {/* TIME IN REVIEW card */}
            {selectedRange && review && (
                <TimeInReviewCard
                    range={selectedRange}
                    review={review}
                    expanded={reviewExpanded}
                    onToggle={() => setReviewExpanded(prev =>
                        prev === 'collapsed' ? 'glance' : prev === 'glance' ? 'deep' : 'collapsed'
                    )}
                />
            )}
        </div>
    );
}

function SummaryCard({ label, value, accent }: { label: string; value: number; accent: 'yellow' | 'green' | 'white' }) {
    const accentColor = accent === 'yellow' ? 'text-yellow-400' : accent === 'green' ? 'text-green-400' : 'text-white';
    return (
        <div className="bg-white/[0.03] p-3 sm:p-4">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">{label}</p>
            <p className={`text-2xl sm:text-3xl font-black ${accentColor}`}>{value.toLocaleString()}</p>
        </div>
    );
}

function ActivityLegend() {
    return (
        <div className="flex items-center gap-4 mt-4 text-[9px] font-black uppercase tracking-widest text-white/40">
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-yellow-400 rounded-full" /> Booking</span>
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-green-400 rounded-full" /> Event</span>
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-white rounded-full" /> Upload</span>
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-red-400 rounded-full" /> Blocked</span>
        </div>
    );
}

// Dot overlay positioned over each calendar cell by date lookup. We render the
// dots as a flat day list below the widget because the widget itself doesn't
// expose a per-cell slot. Still renders something useful: a date-indexed list
// of "what happened on X" for the current month.
function ActivityDots({
    activityByDate,
    monthCursor,
    onMonthChange,
}: {
    activityByDate: Map<string, { bookings: number; events: number; photos: number; blocked: boolean }>;
    monthCursor: Date;
    onMonthChange: (d: Date) => void;
}) {
    const { start, end } = monthWindow(monthCursor);
    const days = datesInRange(start, end).filter(d => activityByDate.has(d));
    if (days.length === 0) return null;
    return (
        <div className="mt-4 pt-4 border-t border-white/5">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">
                Active days this month
            </p>
            <div className="flex flex-wrap gap-1.5">
                {days.map(d => {
                    const a = activityByDate.get(d)!;
                    return (
                        <span
                            key={d}
                            className="inline-flex items-center gap-1 bg-white/5 px-2 py-1 text-[10px] font-mono text-white/70"
                            title={`${a.bookings} bookings · ${a.events} events · ${a.photos} uploads${a.blocked ? ' · blocked' : ''}`}
                        >
                            {d.slice(5)}
                            {a.bookings > 0 && <span className="w-1 h-1 bg-yellow-400 rounded-full" />}
                            {a.events > 0 && <span className="w-1 h-1 bg-green-400 rounded-full" />}
                            {a.photos > 0 && <span className="w-1 h-1 bg-white rounded-full" />}
                            {a.blocked && <span className="w-1 h-1 bg-red-400 rounded-full" />}
                        </span>
                    );
                })}
            </div>
        </div>
    );
}

function TimeInReviewCard({
    range,
    review,
    expanded,
    onToggle,
}: {
    range: { start: string; end: string };
    review: { bookings: CalendarBooking[]; events: CalendarEventRow[]; photos: CalendarPhoto[] };
    expanded: 'collapsed' | 'glance' | 'deep';
    onToggle: () => void;
}) {
    const isCollapsed = expanded === 'collapsed';
    const isDeep = expanded === 'deep';
    return (
        <div className="bg-white/[0.02]">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between p-4 sm:p-6 hover:bg-white/[0.03] transition-colors"
            >
                <div className="text-left">
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 mb-1">Time in Review</p>
                    <p className="text-sm font-bold text-white">
                        {review.bookings.length} bookings · {review.events.length} events · {review.photos.length} uploads
                    </p>
                </div>
                {isCollapsed ? <ChevronDownIcon className="w-4 h-4 text-white/40" /> : <ChevronUpIcon className="w-4 h-4 text-white/40" />}
            </button>

            {!isCollapsed && (
                <div className="p-4 sm:p-6 pt-0 space-y-6">
                    {/* Bookings */}
                    <Section title="Bookings">
                        {review.bookings.length === 0 ? (
                            <EmptyLine>No bookings in this window.</EmptyLine>
                        ) : (
                            <div className="space-y-1">
                                {review.bookings.map(b => (
                                    <Row key={b.id}>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white text-sm font-bold truncate">
                                                {b.name}{b.business_name ? ` · ${b.business_name}` : ''}
                                            </p>
                                            <p className="text-white/40 text-[10px] font-mono truncate">
                                                {b.event_date}{b.start_time ? ` · ${b.start_time.slice(0, 5)} – ${b.end_time?.slice(0, 5) || '?'}` : ''}{' · '}{b.event_type}{b.location ? ` · ${b.location}` : ''}
                                            </p>
                                        </div>
                                        <StatusPill status={b.status} />
                                    </Row>
                                ))}
                            </div>
                        )}
                    </Section>

                    {/* Events */}
                    <Section title="Events">
                        {review.events.length === 0 ? (
                            <EmptyLine>No events in this window.</EmptyLine>
                        ) : (
                            <div className="space-y-1">
                                {review.events.map(e => (
                                    <Row key={e.id}>
                                        <div className="flex-1 min-w-0 flex items-center gap-2">
                                            <TicketIcon className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-white text-sm font-bold truncate">{e.title}</p>
                                                <p className="text-white/40 text-[10px] font-mono truncate">
                                                    {e.event_date}{e.location ? ` · ${e.location}` : ''}
                                                </p>
                                            </div>
                                        </div>
                                        <StatusPill status={e.status} />
                                    </Row>
                                ))}
                            </div>
                        )}
                    </Section>

                    {/* Uploads */}
                    <Section title="Uploads">
                        {review.photos.length === 0 ? (
                            <EmptyLine>No photos uploaded / captured in this window.</EmptyLine>
                        ) : (
                            <>
                                {!isDeep ? (
                                    <div className="grid grid-cols-5 sm:grid-cols-8 gap-1">
                                        {review.photos.slice(0, 16).map(p => (
                                            <img key={p.id} src={p.thumbnail_url} alt={p.title} className="w-full aspect-square object-cover bg-white/5" />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-1">
                                        {review.photos.map(p => (
                                            <div key={p.id} className="aspect-square bg-white/5">
                                                <img src={p.thumbnail_url} alt={p.title} className="w-full h-full object-cover" title={p.title} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {!isDeep && review.photos.length > 16 && (
                                    <p className="text-white/40 text-[10px] mt-2">
                                        + {review.photos.length - 16} more — <button onClick={onToggle} className="underline hover:text-white">expand for full gallery</button>
                                    </p>
                                )}
                            </>
                        )}
                    </Section>

                    {/* Footer toggle */}
                    <button
                        onClick={onToggle}
                        className="w-full flex items-center justify-center gap-2 py-3 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors bg-white/[0.03] hover:bg-white/[0.06]"
                    >
                        {isDeep ? 'Collapse to Glance' : 'Expand — Deeper Insights'}
                        <ArrowRightIcon className="w-3 h-3" />
                    </button>
                </div>
            )}
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">{title}</p>
            {children}
        </div>
    );
}

function Row({ children }: { children: React.ReactNode }) {
    return <div className="flex items-center gap-3 p-2 bg-white/[0.03]">{children}</div>;
}

function EmptyLine({ children }: { children: React.ReactNode }) {
    return <p className="text-white/30 text-xs italic py-2">{children}</p>;
}

function StatusPill({ status }: { status: string }) {
    const map: Record<string, string> = {
        pending: 'bg-yellow-500/20 text-yellow-400',
        confirmed: 'bg-green-500/20 text-green-400',
        draft: 'bg-white/10 text-white/50',
        published: 'bg-green-500/20 text-green-400',
        declined: 'bg-red-500/20 text-red-400',
        cancelled: 'bg-red-500/20 text-red-400',
    };
    const cls = map[status] || 'bg-white/10 text-white/50';
    return (
        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 ${cls} flex-shrink-0`}>
            {status}
        </span>
    );
}
