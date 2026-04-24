import React, { useEffect, useMemo, useState } from 'react';
import {
    CalendarIcon,
    ArrowPathIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    TicketIcon,
    ArrowRightIcon,
    PencilSquareIcon,
    TrashIcon,
    PlusIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { CalendarWidget } from '../ui/calendar-widget';
import {
    Expandable,
    ExpandableContent,
    ExpandableTrigger,
} from '../ui/expandable';

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
interface CalendarNote {
    id: string;
    date: string;
    note: string;
    created_at: string;
}
interface CalendarRangeResponse {
    range: { start: string; end: string };
    bookings: CalendarBooking[];
    events: CalendarEventRow[];
    adminBlocked: Array<{ date: string; note: string | null }>;
    notes: CalendarNote[];
    photos: Record<string, CalendarPhoto[]>;
    summary: { bookingCount: number; eventCount: number; photoCount: number; blockedCount: number; noteCount: number };
}

type ViewMode = 'month' | 'week' | 'day';

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

function getWeekStart(d: Date): Date {
    const date = new Date(d);
    date.setDate(date.getDate() - date.getDay());
    date.setHours(0, 0, 0, 0);
    return date;
}

export default function AdminCalendarView() {
    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [focusDate, setFocusDate] = useState<Date>(new Date());
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [monthCursor, setMonthCursor] = useState<Date>(new Date());
    const [monthData, setMonthData] = useState<CalendarRangeResponse | null>(null);
    const [detailData, setDetailData] = useState<CalendarRangeResponse | null>(null);
    const [monthLoading, setMonthLoading] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [reviewExpanded, setReviewExpanded] = useState<'collapsed' | 'glance' | 'deep'>('glance');

    useEffect(() => {
        const { start, end } = monthWindow(monthCursor);
        loadMonth(start, end);
    }, [monthCursor]);

    useEffect(() => {
        if (viewMode === 'week') {
            const ws = getWeekStart(focusDate);
            const we = new Date(ws);
            we.setDate(we.getDate() + 6);
            loadDetail(toYMD(ws), toYMD(we));
        } else if (viewMode === 'day') {
            const d = toYMD(focusDate);
            loadDetail(d, d);
        }
    }, [viewMode, focusDate]);

    async function loadMonth(start: string, end: string) {
        setMonthLoading(true);
        try {
            const res = await fetch(`/api/calendar/range?start=${start}&end=${end}`);
            if (res.ok) setMonthData(await res.json());
        } finally {
            setMonthLoading(false);
        }
    }

    async function loadDetail(start: string, end: string) {
        setDetailLoading(true);
        try {
            const res = await fetch(`/api/calendar/range?start=${start}&end=${end}`);
            if (res.ok) setDetailData(await res.json());
        } finally {
            setDetailLoading(false);
        }
    }

    const activityByDate = useMemo(() => {
        const m = new Map<string, { bookings: number; events: number; photos: number; blocked: boolean }>();
        const ensure = (d: string) => {
            if (!m.has(d)) m.set(d, { bookings: 0, events: 0, photos: 0, blocked: false });
            return m.get(d)!;
        };
        if (!monthData) return m;
        for (const b of monthData.bookings) ensure(b.event_date).bookings++;
        for (const e of monthData.events) ensure(e.event_date).events++;
        for (const d of Object.keys(monthData.photos)) ensure(d).photos += monthData.photos[d].length;
        for (const a of monthData.adminBlocked) ensure(a.date).blocked = true;
        return m;
    }, [monthData]);

    function handleDateClick(date: Date) {
        const ymd = toYMD(date);
        if (!startDate || (startDate && endDate)) {
            setStartDate(date);
            setEndDate(date);
            setFocusDate(date);
            setReviewExpanded('glance');
        } else {
            if (ymd === toYMD(startDate)) {
                setStartDate(null);
                setEndDate(null);
            } else if (date < startDate) {
                setEndDate(startDate);
                setStartDate(date);
                setReviewExpanded('glance');
            } else {
                setEndDate(date);
                setReviewExpanded('glance');
            }
        }
    }

    function handleSwitchMode(m: ViewMode) {
        setViewMode(m);
        if (m !== 'month') {
            setFocusDate(startDate ?? new Date());
        }
    }

    const selectedRange = useMemo(() => {
        if (!startDate) return null;
        const s = toYMD(startDate);
        const e = endDate ? toYMD(endDate) : s;
        return { start: s, end: e };
    }, [startDate, endDate]);

    const review = useMemo(() => {
        if (!selectedRange || !monthData) return null;
        const days = new Set(datesInRange(selectedRange.start, selectedRange.end));
        const bookings = monthData.bookings.filter(b => days.has(b.event_date));
        const events = monthData.events.filter(e => days.has(e.event_date));
        const notes = (monthData.notes || []).filter(n => days.has(n.date));
        const photos: CalendarPhoto[] = [];
        for (const d of days) {
            const list = monthData.photos[d];
            if (list) photos.push(...list);
        }
        return { bookings, events, photos, notes };
    }, [selectedRange, monthData]);

    async function addNote(date: string, note: string) {
        await fetch('/api/calendar/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, note }),
        });
        const { start, end } = monthWindow(monthCursor);
        loadMonth(start, end);
        if (viewMode !== 'month') loadDetail(toYMD(focusDate), toYMD(focusDate));
    }

    async function deleteNote(id: string) {
        await fetch(`/api/calendar/notes?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
        const { start, end } = monthWindow(monthCursor);
        loadMonth(start, end);
        if (viewMode !== 'month') loadDetail(toYMD(focusDate), toYMD(focusDate));
    }

    const summaryData = viewMode === 'month' ? monthData : detailData;
    const isLoading = viewMode === 'month' ? monthLoading : detailLoading;

    function handleRefresh() {
        if (viewMode === 'month') {
            const { start, end } = monthWindow(monthCursor);
            loadMonth(start, end);
        } else if (viewMode === 'week') {
            const ws = getWeekStart(focusDate);
            const we = new Date(ws); we.setDate(we.getDate() + 6);
            loadDetail(toYMD(ws), toYMD(we));
        } else {
            loadDetail(toYMD(focusDate), toYMD(focusDate));
        }
    }

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
                        Site-wide activity — bookings, events, uploads.
                    </p>
                </div>
                <button
                    onClick={handleRefresh}
                    className="text-white/40 hover:text-white transition-colors flex-shrink-0"
                    title="Refresh"
                >
                    <ArrowPathIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* View mode toggle */}
            <div className="flex border border-white/10">
                {(['month', 'week', 'day'] as ViewMode[]).map(m => (
                    <button
                        key={m}
                        onClick={() => handleSwitchMode(m)}
                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest transition-colors ${
                            viewMode === m
                                ? 'bg-white text-black'
                                : 'text-white/40 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        {m}
                    </button>
                ))}
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <SummaryCard label="Bookings" value={summaryData?.summary.bookingCount ?? 0} accent="yellow" />
                <SummaryCard label="Events" value={summaryData?.summary.eventCount ?? 0} accent="green" />
                <SummaryCard label="Uploads" value={summaryData?.summary.photoCount ?? 0} accent="white" />
            </div>

            {/* MONTH VIEW */}
            {viewMode === 'month' && (
                <div className="space-y-4">
                    <div className="bg-white/[0.02] p-4 sm:p-6">
                        <CalendarWidget
                            startDate={startDate}
                            endDate={endDate}
                            interactive
                            onDateSelect={handleDateClick}
                            viewDate={monthCursor}
                            onMonthChange={setMonthCursor}
                            dotsByDate={activityByDate}
                        />
                        <ActivityLegend />
                        {selectedRange && (
                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                                <p className="text-white/60 text-xs">
                                    {selectedRange.start === selectedRange.end
                                        ? formatDateHuman(selectedRange.start)
                                        : `${formatDateHuman(selectedRange.start)} → ${formatDateHuman(selectedRange.end)}`}
                                </p>
                                <div className="flex items-center gap-3">
                                    {selectedRange.start === selectedRange.end && (
                                        <button
                                            onClick={() => { setFocusDate(startDate!); setViewMode('day'); }}
                                            className="text-white/40 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors"
                                        >
                                            Day View →
                                        </button>
                                    )}
                                    <button
                                        onClick={() => { setStartDate(null); setEndDate(null); }}
                                        className="text-white/40 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {selectedRange && review && (
                        <TimeInReviewCard
                            range={selectedRange}
                            review={review}
                            expanded={reviewExpanded}
                            onToggle={() => setReviewExpanded(prev =>
                                prev === 'collapsed' ? 'glance' : prev === 'glance' ? 'deep' : 'collapsed'
                            )}
                            onAddNote={addNote}
                            onDeleteNote={deleteNote}
                        />
                    )}
                </div>
            )}

            {/* WEEK VIEW */}
            {viewMode === 'week' && (
                <WeekView
                    focusDate={focusDate}
                    data={detailData}
                    loading={detailLoading}
                    onDayClick={(date) => { setFocusDate(date); setViewMode('day'); }}
                    onPrevWeek={() => { const d = new Date(focusDate); d.setDate(d.getDate() - 7); setFocusDate(d); }}
                    onNextWeek={() => { const d = new Date(focusDate); d.setDate(d.getDate() + 7); setFocusDate(d); }}
                />
            )}

            {/* DAY VIEW */}
            {viewMode === 'day' && (
                <DayView
                    focusDate={focusDate}
                    data={detailData}
                    loading={detailLoading}
                    onPrevDay={() => { const d = new Date(focusDate); d.setDate(d.getDate() - 1); setFocusDate(d); }}
                    onNextDay={() => { const d = new Date(focusDate); d.setDate(d.getDate() + 1); setFocusDate(d); }}
                    onAddNote={addNote}
                    onDeleteNote={deleteNote}
                />
            )}
        </div>
    );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

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
        <div className="flex flex-wrap items-center gap-4 mt-4 text-[9px] font-black uppercase tracking-widest text-white/40">
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-yellow-400 rounded-full" /> Booking</span>
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-green-400 rounded-full" /> Event</span>
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-white/60 rounded-full" /> Upload</span>
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-red-400 rounded-full" /> Blocked</span>
        </div>
    );
}

// ─── Week View ─────────────────────────────────────────────────────────────────

function WeekView({
    focusDate,
    data,
    loading,
    onDayClick,
    onPrevWeek,
    onNextWeek,
}: {
    focusDate: Date;
    data: CalendarRangeResponse | null;
    loading: boolean;
    onDayClick: (d: Date) => void;
    onPrevWeek: () => void;
    onNextWeek: () => void;
}) {
    const weekStart = getWeekStart(focusDate);
    const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
    });
    const focusYmd = toYMD(focusDate);
    const todayYmd = toYMD(new Date());
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const weekLabel = `${days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${days[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <button onClick={onPrevWeek} className="text-white/40 hover:text-white transition-colors p-2">
                    <ChevronLeftIcon className="w-4 h-4" />
                </button>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/60">{weekLabel}</p>
                <button onClick={onNextWeek} className="text-white/40 hover:text-white transition-colors p-2">
                    <ChevronRightIcon className="w-4 h-4" />
                </button>
            </div>

            {loading ? (
                <div className="text-white/30 text-xs text-center py-12">Loading…</div>
            ) : (
                <div className="grid grid-cols-7 gap-px bg-white/[0.06]">
                    {days.map((d, i) => {
                        const ymd = toYMD(d);
                        const dayBookings = data?.bookings.filter(b => b.event_date === ymd) || [];
                        const dayEvents = data?.events.filter(e => e.event_date === ymd) || [];
                        const dayPhotos = (data?.photos[ymd] || []);
                        const isToday = ymd === todayYmd;
                        const isFocus = ymd === focusYmd;

                        return (
                            <button
                                key={ymd}
                                onClick={() => onDayClick(d)}
                                className={`bg-black flex flex-col min-h-[120px] sm:min-h-[160px] p-1.5 sm:p-2 text-left hover:bg-white/[0.04] transition-colors ${isFocus ? 'ring-1 ring-inset ring-white/20' : ''}`}
                            >
                                <div className="mb-1.5">
                                    <p className="text-[8px] sm:text-[9px] text-white/30 font-black uppercase tracking-widest">{dayNames[i]}</p>
                                    <p className={`text-base sm:text-lg font-bold leading-none mt-0.5 ${isToday ? 'text-white' : 'text-white/50'}`}>{d.getDate()}</p>
                                </div>

                                <div className="flex-1 space-y-0.5 overflow-hidden">
                                    {dayBookings.slice(0, 3).map(b => (
                                        <div key={b.id} className="bg-yellow-500/20 px-1 py-0.5">
                                            <p className="text-[8px] text-yellow-300 font-bold truncate leading-none">{b.name}</p>
                                        </div>
                                    ))}
                                    {dayBookings.length > 3 && (
                                        <p className="text-[8px] text-yellow-400/50 px-1">+{dayBookings.length - 3}</p>
                                    )}
                                    {dayEvents.slice(0, 2).map(e => (
                                        <div key={e.id} className="bg-green-500/20 px-1 py-0.5">
                                            <p className="text-[8px] text-green-300 font-bold truncate leading-none">{e.title}</p>
                                        </div>
                                    ))}
                                    {dayEvents.length > 2 && (
                                        <p className="text-[8px] text-green-400/50 px-1">+{dayEvents.length - 2}</p>
                                    )}
                                </div>

                                {dayPhotos.length > 0 && (
                                    <p className="text-[8px] text-white/20 mt-1">{dayPhotos.length} ↑</p>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── Day View ──────────────────────────────────────────────────────────────────

function DayView({
    focusDate,
    data,
    loading,
    onPrevDay,
    onNextDay,
    onAddNote,
    onDeleteNote,
}: {
    focusDate: Date;
    data: CalendarRangeResponse | null;
    loading: boolean;
    onPrevDay: () => void;
    onNextDay: () => void;
    onAddNote: (date: string, note: string) => void;
    onDeleteNote: (id: string) => void;
}) {
    const ymd = toYMD(focusDate);
    const bookings = data?.bookings.filter(b => b.event_date === ymd) || [];
    const events = data?.events.filter(e => e.event_date === ymd) || [];
    const photos = data?.photos[ymd] || [];
    const notes = data?.notes.filter(n => n.date === ymd) || [];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between bg-white/[0.02] px-4 py-3">
                <button onClick={onPrevDay} className="text-white/40 hover:text-white transition-colors p-1">
                    <ChevronLeftIcon className="w-4 h-4" />
                </button>
                <div className="text-center">
                    <p className="text-sm font-bold text-white">{formatDateHuman(ymd)}</p>
                    <p className="text-[9px] text-white/30 font-mono mt-0.5">{ymd}</p>
                </div>
                <button onClick={onNextDay} className="text-white/40 hover:text-white transition-colors p-1">
                    <ChevronRightIcon className="w-4 h-4" />
                </button>
            </div>

            {loading ? (
                <div className="text-white/30 text-xs text-center py-12">Loading…</div>
            ) : (
                <div className="space-y-6">
                    <Section title={`Bookings (${bookings.length})`}>
                        {bookings.length === 0 ? (
                            <EmptyLine>No bookings on this day.</EmptyLine>
                        ) : (
                            <div className="space-y-px">
                                {bookings.map(b => (
                                    <ExpandableBookingCard key={b.id} booking={b} />
                                ))}
                            </div>
                        )}
                    </Section>

                    <Section title={`Events (${events.length})`}>
                        {events.length === 0 ? (
                            <EmptyLine>No events on this day.</EmptyLine>
                        ) : (
                            <div className="space-y-px">
                                {events.map(e => (
                                    <ExpandableEventCard key={e.id} event={e} />
                                ))}
                            </div>
                        )}
                    </Section>

                    {photos.length > 0 && (
                        <Section title={`Uploads (${photos.length})`}>
                            <div className="grid grid-cols-6 sm:grid-cols-8 gap-1">
                                {photos.map(p => (
                                    <img key={p.id} src={p.thumbnail_url} alt={p.title} className="w-full aspect-square object-cover bg-white/5" />
                                ))}
                            </div>
                        </Section>
                    )}

                    <NotesSection
                        range={{ start: ymd, end: ymd }}
                        notes={notes}
                        onAdd={onAddNote}
                        onDelete={onDeleteNote}
                    />
                </div>
            )}
        </div>
    );
}

// ─── Expandable Cards ──────────────────────────────────────────────────────────

function ExpandableBookingCard({ booking: b }: { booking: CalendarBooking }) {
    return (
        <Expandable>
            {({ isExpanded }: { isExpanded: boolean }) => (
                <div className="bg-white/[0.03] border-b border-white/5">
                    <ExpandableTrigger>
                        <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/[0.04] transition-colors select-none">
                            <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-bold truncate">
                                    {b.name}{b.business_name ? ` · ${b.business_name}` : ''}
                                </p>
                                <p className="text-white/40 text-[10px] font-mono truncate">
                                    {b.event_type}
                                    {b.start_time ? ` · ${b.start_time.slice(0, 5)}–${b.end_time?.slice(0, 5) || '?'}` : ''}
                                    {b.location ? ` · ${b.location}` : ''}
                                </p>
                            </div>
                            <StatusPill status={b.status} />
                            {isExpanded
                                ? <ChevronUpIcon className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
                                : <ChevronDownIcon className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />}
                        </div>
                    </ExpandableTrigger>
                    <ExpandableContent preset="slide-up">
                        <div className="px-3 pb-3 space-y-1.5 border-t border-white/5">
                            <DetailRow label="Email" value={b.email} />
                            {b.location && <DetailRow label="Location" value={b.location} />}
                            {b.start_time && (
                                <DetailRow label="Time" value={`${b.start_time.slice(0, 5)} – ${b.end_time?.slice(0, 5) || 'TBD'}`} />
                            )}
                            <DetailRow label="Retainer" value={b.retainer ? 'Paid' : 'Not paid'} />
                            <DetailRow label="Date" value={b.event_date} />
                        </div>
                    </ExpandableContent>
                </div>
            )}
        </Expandable>
    );
}

function ExpandableEventCard({ event: e }: { event: CalendarEventRow }) {
    return (
        <Expandable>
            {({ isExpanded }: { isExpanded: boolean }) => (
                <div className="bg-white/[0.03] border-b border-white/5">
                    <ExpandableTrigger>
                        <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/[0.04] transition-colors select-none">
                            <TicketIcon className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-bold truncate">{e.title}</p>
                                {e.location && (
                                    <p className="text-white/40 text-[10px] font-mono truncate">{e.location}</p>
                                )}
                            </div>
                            <StatusPill status={e.status} />
                            {isExpanded
                                ? <ChevronUpIcon className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
                                : <ChevronDownIcon className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />}
                        </div>
                    </ExpandableTrigger>
                    <ExpandableContent preset="fade">
                        <div className="px-3 pb-3 border-t border-white/5 space-y-1.5">
                            {e.image_url && (
                                <img src={e.image_url} alt={e.title} className="w-full h-28 object-cover mt-2" />
                            )}
                            {e.location && <DetailRow label="Location" value={e.location} />}
                            <DetailRow label="Date" value={e.event_date} />
                        </div>
                    </ExpandableContent>
                </div>
            )}
        </Expandable>
    );
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-baseline gap-2 pt-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-white/30 flex-shrink-0 w-14">{label}</span>
            <span className="text-xs text-white/60 break-all">{value}</span>
        </div>
    );
}

// ─── Time In Review (Month mode range detail) ──────────────────────────────────

function TimeInReviewCard({
    range,
    review,
    expanded,
    onToggle,
    onAddNote,
    onDeleteNote,
}: {
    range: { start: string; end: string };
    review: { bookings: CalendarBooking[]; events: CalendarEventRow[]; photos: CalendarPhoto[]; notes: CalendarNote[] };
    expanded: 'collapsed' | 'glance' | 'deep';
    onToggle: () => void;
    onAddNote: (date: string, note: string) => void;
    onDeleteNote: (id: string) => void;
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
                        {review.notes.length > 0 ? ` · ${review.notes.length} notes` : ''}
                    </p>
                </div>
                {isCollapsed ? <ChevronDownIcon className="w-4 h-4 text-white/40" /> : <ChevronUpIcon className="w-4 h-4 text-white/40" />}
            </button>

            {!isCollapsed && (
                <div className="p-4 sm:p-6 pt-0 space-y-6">
                    <NotesSection range={range} notes={review.notes} onAdd={onAddNote} onDelete={onDeleteNote} />

                    <Section title="Bookings">
                        {review.bookings.length === 0 ? (
                            <EmptyLine>No bookings in this window.</EmptyLine>
                        ) : (
                            <div className="space-y-px">
                                {review.bookings.map(b => (
                                    <ExpandableBookingCard key={b.id} booking={b} />
                                ))}
                            </div>
                        )}
                    </Section>

                    <Section title="Events">
                        {review.events.length === 0 ? (
                            <EmptyLine>No events in this window.</EmptyLine>
                        ) : (
                            <div className="space-y-px">
                                {review.events.map(e => (
                                    <ExpandableEventCard key={e.id} event={e} />
                                ))}
                            </div>
                        )}
                    </Section>

                    <Section title="Uploads">
                        {review.photos.length === 0 ? (
                            <EmptyLine>No photos in this window.</EmptyLine>
                        ) : (
                            <>
                                <div className={`grid gap-1 ${isDeep ? 'grid-cols-4 sm:grid-cols-6' : 'grid-cols-5 sm:grid-cols-8'}`}>
                                    {(isDeep ? review.photos : review.photos.slice(0, 16)).map(p => (
                                        <img key={p.id} src={p.thumbnail_url} alt={p.title} className="w-full aspect-square object-cover bg-white/5" />
                                    ))}
                                </div>
                                {!isDeep && review.photos.length > 16 && (
                                    <p className="text-white/40 text-[10px] mt-2">
                                        + {review.photos.length - 16} more —{' '}
                                        <button onClick={onToggle} className="underline hover:text-white">expand for full gallery</button>
                                    </p>
                                )}
                            </>
                        )}
                    </Section>

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

// ─── Notes Section ─────────────────────────────────────────────────────────────

function NotesSection({
    range,
    notes,
    onAdd,
    onDelete,
}: {
    range: { start: string; end: string };
    notes: CalendarNote[];
    onAdd: (date: string, note: string) => void;
    onDelete: (id: string) => void;
}) {
    const [drafting, setDrafting] = useState(false);
    const [draft, setDraft] = useState('');
    const [draftDate, setDraftDate] = useState(range.start);

    useEffect(() => { setDraftDate(range.start); }, [range.start, range.end]);

    const handleSave = () => {
        const trimmed = draft.trim();
        if (!trimmed) return;
        onAdd(draftDate, trimmed);
        setDraft('');
        setDrafting(false);
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 flex items-center gap-1.5">
                    <PencilSquareIcon className="w-3 h-3" />
                    Notes
                </p>
                {!drafting && (
                    <button
                        onClick={() => setDrafting(true)}
                        className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-colors px-2 py-1 bg-white/5 hover:bg-white/10"
                    >
                        <PlusIcon className="w-3 h-3" />
                        Add
                    </button>
                )}
            </div>

            {drafting && (
                <div className="bg-white/5 p-3 mb-2 space-y-2">
                    <div className="flex items-center gap-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-white/40">On</label>
                        <input
                            type="date"
                            value={draftDate}
                            min={range.start}
                            max={range.end}
                            onChange={e => setDraftDate(e.target.value)}
                            className="bg-black text-white text-[11px] px-2 py-1 rounded-none focus:outline-none"
                        />
                    </div>
                    <textarea
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        rows={3}
                        autoFocus
                        placeholder="Note for this day…"
                        className="w-full bg-black text-white text-sm px-3 py-2 rounded-none placeholder-white/30 focus:outline-none resize-none"
                    />
                    <div className="flex gap-2 justify-end">
                        <button
                            onClick={() => { setDrafting(false); setDraft(''); }}
                            className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white px-3 py-1.5 bg-white/5 hover:bg-white/10 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!draft.trim()}
                            className="text-[10px] font-black uppercase tracking-widest text-black bg-white hover:bg-white/80 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 transition-colors"
                        >
                            Save Note
                        </button>
                    </div>
                </div>
            )}

            {notes.length === 0 && !drafting ? (
                <p className="text-white/30 text-xs italic py-2">No notes in this window.</p>
            ) : (
                <div className="space-y-1">
                    {notes.map(n => (
                        <div key={n.id} className="flex items-start gap-3 p-2 bg-white/[0.03] group">
                            <div className="flex-1 min-w-0">
                                <p className="text-white/50 text-[10px] font-mono mb-1">{n.date}</p>
                                <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">{n.note}</p>
                            </div>
                            <button
                                onClick={() => onDelete(n.id)}
                                className="text-white/30 hover:text-red-400 transition-colors p-1 opacity-0 group-hover:opacity-100"
                                title="Delete note"
                            >
                                <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Primitives ────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">{title}</p>
            {children}
        </div>
    );
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
