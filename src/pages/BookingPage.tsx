import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CalendarIcon,
    ClockIcon,
    MapPinIcon,
    CheckCircleIcon,
    XMarkIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ArrowLongRightIcon,
    UserIcon,
    EnvelopeIcon,
    ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import SEOHead from '../components/SEOHead';

const EVENT_TYPES = [
    'Concert / Show',
    'Club / Nightlife',
    'Lifestyle Shoot',
    'Portrait Session',
    'Brand / Editorial',
    'Wedding / Event',
    'Retainer (Monthly)',
    'Other',
];

interface TimeSlot { label: string; start: string; end: string; display: string }

// Canonical time windows the photographer offers. Start/end are 24h so they
// round-trip to Postgres TIME cleanly; display is what the client sees.
const TIME_SLOTS: TimeSlot[] = [
    { label: 'Morning',   start: '09:00', end: '12:00', display: '9AM – 12PM' },
    { label: 'Afternoon', start: '12:00', end: '17:00', display: '12PM – 5PM' },
    { label: 'Evening',   start: '17:00', end: '20:00', display: '5PM – 8PM' },
    { label: 'Night',     start: '20:00', end: '23:00', display: '8PM – 11PM' },
];

// Compare two HH:MM strings. Returns true when the ranges overlap at all.
function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
    return aStart < bEnd && bStart < aEnd;
}

function isSlotBlocked(slot: TimeSlot, taken: Array<{ start_time: string | null; end_time: string | null }>): boolean {
    return taken.some(t => {
        if (!t.start_time || !t.end_time) return false;
        const bs = t.start_time.slice(0, 5);
        const be = t.end_time.slice(0, 5);
        return rangesOverlap(slot.start, slot.end, bs, be);
    });
}

interface FormData {
    name: string;
    business_name: string;
    email: string;
    phone: string;
    event_type: string;
    event_date: string;
    start_time: string;
    end_time: string;
    location: string;
    notes: string;
    retainer: boolean;
}

const EMPTY_FORM: FormData = {
    name: '',
    business_name: '',
    email: '',
    phone: '',
    event_type: '',
    event_date: '',
    start_time: '',
    end_time: '',
    location: '',
    notes: '',
    retainer: false,
};

const MONTH_NAMES = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December',
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* ─── Inline Calendar ─────────────────────────────────────── */
const BookingCalendar: React.FC<{
    selected: string;
    blockedDates: string[];
    onSelect: (date: string) => void;
}> = ({ selected, blockedDates, onSelect }) => {
    const today = new Date();
    const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });

    const days = useMemo(() => {
        const firstDay = new Date(cursor.year, cursor.month, 1).getDay();
        const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
        const cells: (number | null)[] = [];
        for (let i = 0; i < firstDay; i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) cells.push(d);
        return cells;
    }, [cursor]);

    const fmt = (d: number) => {
        const mm = String(cursor.month + 1).padStart(2, '0');
        const dd = String(d).padStart(2, '0');
        return `${cursor.year}-${mm}-${dd}`;
    };

    const isPast = (d: number) => {
        const dt = new Date(cursor.year, cursor.month, d);
        dt.setHours(0, 0, 0, 0);
        const t = new Date(); t.setHours(0, 0, 0, 0);
        return dt < t;
    };

    const prev = () => {
        setCursor(c => {
            const m = c.month === 0 ? 11 : c.month - 1;
            const y = c.month === 0 ? c.year - 1 : c.year;
            return { year: y, month: m };
        });
    };
    const next = () => {
        setCursor(c => {
            const m = c.month === 11 ? 0 : c.month + 1;
            const y = c.month === 11 ? c.year + 1 : c.year;
            return { year: y, month: m };
        });
    };

    return (
        <div className="w-full">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-4">
                <button onClick={prev} className="p-1 text-white/40 hover:text-white transition-colors">
                    <ChevronLeftIcon className="w-4 h-4" />
                </button>
                <span className="text-xs font-black uppercase tracking-[0.2em] text-white">
                    {MONTH_NAMES[cursor.month]} {cursor.year}
                </span>
                <button onClick={next} className="p-1 text-white/40 hover:text-white transition-colors">
                    <ChevronRightIcon className="w-4 h-4" />
                </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
                {DAY_NAMES.map(d => (
                    <div key={d} className="text-center text-[9px] font-black uppercase tracking-widest text-white/20 py-1">
                        {d}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-0.5">
                {days.map((d, i) => {
                    if (!d) return <div key={`empty-${i}`} />;

                    const dateStr = fmt(d);
                    const past = isPast(d);
                    const blocked = blockedDates.includes(dateStr);
                    const isSel = dateStr === selected;
                    const disabled = past || blocked;

                    return (
                        <button
                            key={dateStr}
                            disabled={disabled}
                            onClick={() => onSelect(dateStr)}
                            className={`
                                aspect-square flex items-center justify-center text-[11px] font-bold transition-all
                                ${isSel
                                    ? 'bg-white text-black'
                                    : disabled
                                        ? 'text-white/15 cursor-not-allowed'
                                        : 'text-white/60 hover:bg-white/10 hover:text-white'}
                            `}
                        >
                            {d}
                            {blocked && !past && (
                                <span className="absolute w-1 h-1 rounded-full bg-red-500 bottom-0.5 left-1/2 -translate-x-1/2" />
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="mt-3 flex items-center gap-4 text-[9px] text-white/30 font-bold uppercase tracking-widest">
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-white/15 inline-block" />
                    Unavailable
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-white inline-block" />
                    Selected
                </span>
            </div>
        </div>
    );
};

/* ─── Main Page ─────────────────────────────────────────────── */
const BookingPage: React.FC = () => {
    const [form, setForm] = useState<FormData>(EMPTY_FORM);
    const [blockedDates, setBlockedDates] = useState<string[]>([]);
    const [step, setStep] = useState<'calendar' | 'details' | 'success'>('calendar');
    const [detailsStep, setDetailsStep] = useState(0);
    const TOTAL_DETAILS_STEPS = 5;
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [notifyDebug, setNotifyDebug] = useState<string | null>(null);
    const [contextOpen, setContextOpen] = useState(false);
    const [bookedSlots, setBookedSlots] = useState<Array<{ start_time: string | null; end_time: string | null }>>([]);
    const wizardRef = useRef<HTMLDivElement>(null);

    // Fetch time-slot conflicts when the selected date changes.
    useEffect(() => {
        if (!form.event_date) { setBookedSlots([]); return; }
        fetch(`/api/booking?action=slots&date=${form.event_date}`)
            .then(r => r.ok ? r.json() : { slots: [] })
            .then(d => setBookedSlots(d.slots || []))
            .catch(() => setBookedSlots([]));
    }, [form.event_date]);

    // Scroll the wizard (or the full page on success) to the top whenever the
    // active step changes. Prevents the page from staying scrolled partway
    // down from the previous step.
    useEffect(() => {
        requestAnimationFrame(() => {
            if (step === 'details' && wizardRef.current) {
                wizardRef.current.scrollIntoView({ block: 'start', behavior: 'smooth' });
            } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }, [detailsStep, step]);

    const canProceedDetails = (): boolean => {
        switch (detailsStep) {
            case 0: return form.name.trim().length > 0;
            case 1: return form.email.trim().length > 0 && form.email.includes('@');
            case 2: return form.event_type.trim().length > 0;
            case 3: return true; // times are optional
            case 4: return true; // venue + notes optional
            default: return false;
        }
    };

    // Fetch blocked dates
    useEffect(() => {
        fetch('/api/booking?action=availability')
            .then(r => r.json())
            .then(d => setBlockedDates(d.blockedDates || []))
            .catch(() => {});
    }, []);

    const set = (field: keyof FormData, value: any) =>
        setForm(prev => ({ ...prev, [field]: value }));

    const handleDateSelect = (date: string) => {
        set('event_date', date);
        setStep('details');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);

        try {
            const res = await fetch('/api/booking?action=request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    retainer: form.event_type === 'Retainer (Monthly)',
                }),
            });

            // Read as text first so we can surface a useful error when the
            // endpoint returns HTML (Vercel timeout, 500 page, etc.) instead of
            // the generic Safari "The string did not match the expected pattern"
            // that comes from JSON.parse on HTML.
            const rawText = await res.text();
            let data: any = null;
            try {
                data = rawText ? JSON.parse(rawText) : null;
            } catch {
                data = { error: `Server returned non-JSON (${res.status}): ${rawText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 180)}` };
            }

            if (!res.ok) {
                throw new Error(data?.error || `Submission failed (${res.status})`);
            }

            if (data?.notify && data.notify.sent === false && data.notify.error) {
                console.warn('[booking] notify did not send:', data.notify.error);
                setNotifyDebug(data.notify.error);
            } else {
                setNotifyDebug(null);
            }
            setStep('success');
        } catch (err: any) {
            setError(err?.message || 'Something went wrong. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (d: string) => {
        if (!d) return '';
        const [y, m, day] = d.split('-').map(Number);
        return new Date(y, m - 1, day).toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
        });
    };

    return (
        <>
            <SEOHead
                title="Book TLAU | THE LOST+UNFOUNDS"
                description="Candid-style photography for events, portraits, and brands. Shot primarily on Fujifilm X-S20. Check availability and submit a booking request."
                canonicalPath="/booking"
            />

            <div className="min-h-screen bg-black text-white px-4 py-16 md:py-24">
                <div className="max-w-5xl mx-auto">

                    {/* Header */}
                    <div className="mb-12 md:mb-16">
                        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30 mb-3">
                            @tlau.photos
                        </p>
                        <h1 className="text-4xl md:text-7xl font-black uppercase tracking-tight leading-none mb-4">
                            Book Me
                        </h1>
                        <p className="text-white/50 text-sm md:text-base max-w-lg leading-relaxed">
                            Candid-style photography for events, lifestyle shoots, portraits, and brand work.
                            I shoot primarily on a <span className="text-white font-bold">Fujifilm X-S20</span>,
                            and I'm happy to mix in other cameras when the project calls for a different feel.
                            Pick a date and I'll get back to you within 24 hours.
                        </p>
                    </div>

                    <AnimatePresence mode="wait">

                        {/* ── Step 1: Calendar ── */}
                        {step === 'calendar' && (
                            <motion.div
                                key="calendar"
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -16 }}
                                className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-24"
                            >
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40 mb-6">
                                        01 — Pick a Date
                                    </p>
                                    <BookingCalendar
                                        selected={form.event_date}
                                        blockedDates={blockedDates}
                                        onSelect={handleDateSelect}
                                    />
                                </div>

                                <div className="space-y-4 md:pt-10">
                                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">
                                        What to Expect
                                    </p>

                                    <div className="bg-white/[0.03] p-5">
                                        <p className="text-sm font-black uppercase tracking-wider text-white mb-1">The Approach</p>
                                        <p className="text-white/50 text-xs leading-relaxed">
                                            Candid-first. Minimal direction, real moments — whether it's a
                                            show, a lifestyle shoot, or a portrait, I photograph the way it
                                            actually feels, not the way a pose-me brief would want it. Primary
                                            body is a Fujifilm X-S20; I'll bring a different camera when the
                                            project calls for a different grain or feel.
                                        </p>
                                    </div>

                                    {[
                                        { label: 'Single Event', desc: 'Concert, show, portrait session, or any one-time gig.' },
                                        { label: 'Monthly Retainer', desc: 'Consistent coverage — locked-in rate, priority access to my schedule.' },
                                    ].map(item => (
                                        <div key={item.label} className="bg-white/[0.03] p-5">
                                            <p className="text-sm font-black uppercase tracking-wider text-white mb-1">{item.label}</p>
                                            <p className="text-white/40 text-xs leading-relaxed">{item.desc}</p>
                                        </div>
                                    ))}

                                    <div className="bg-white text-black p-5">
                                        <p className="text-sm font-black uppercase tracking-wider mb-1">50% Booking Fee</p>
                                        <p className="text-black/70 text-xs leading-relaxed">
                                            A 50% non-refundable booking fee is required to hold the date.
                                            Balance is due on or before the shoot. I'll send a contract + payment
                                            link after we confirm scope.
                                        </p>
                                    </div>

                                    <p className="text-white/20 text-[10px] leading-relaxed">
                                        Rates are custom based on scope — we'll discuss after your booking request comes in.
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {/* ── Step 2: Details (stepped wizard, one question per screen) ── */}
                        {step === 'details' && (
                            <motion.div
                                key="details"
                                ref={wizardRef}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -16 }}
                                className="max-w-md mx-auto scroll-mt-4"
                            >
                                {/* Context chip (collapsed by default, tap to expand) + progress */}
                                <div className="flex items-center gap-3 mb-6">
                                    <button
                                        onClick={() => setContextOpen(v => !v)}
                                        className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 transition-colors px-2.5 py-1.5"
                                        title="Selected date"
                                    >
                                        <CalendarIcon className="w-3.5 h-3.5 text-white/60" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-white/60">
                                            {new Date(form.event_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </span>
                                    </button>
                                    <div className="flex-1 flex items-center gap-1">
                                        {Array.from({ length: TOTAL_DETAILS_STEPS }).map((_, s) => (
                                            <div key={s} className={`h-1 flex-1 ${detailsStep >= s ? 'bg-white' : 'bg-white/20'}`} />
                                        ))}
                                    </div>
                                </div>
                                {contextOpen && (
                                    <div className="bg-white/5 p-3 mb-6 flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/40 mb-1">Selected Date</p>
                                            <p className="text-sm font-bold text-white">{formatDate(form.event_date)}</p>
                                        </div>
                                        <button
                                            onClick={() => { setStep('calendar'); setDetailsStep(0); setError(''); setContextOpen(false); }}
                                            className="text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-colors px-3 py-2 bg-white/5 hover:bg-white/10 whitespace-nowrap"
                                        >
                                            Change date
                                        </button>
                                    </div>
                                )}

                                {/* Step 0: Name */}
                                {detailsStep === 0 && (
                                    <div>
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 bg-white/10 flex items-center justify-center">
                                                <UserIcon className="w-5 h-5 text-white/60" />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold text-white">What's your name?</h2>
                                                <p className="text-white/40 text-sm">So I know who's booking</p>
                                            </div>
                                        </div>
                                        <input
                                            type="text"
                                            autoFocus
                                            placeholder="Full name"
                                            value={form.name}
                                            onChange={e => set('name', e.target.value)}
                                            className="w-full bg-white/5 rounded-none px-4 py-3 text-base sm:text-sm text-white placeholder-white/40 focus:outline-none focus:bg-white/10 transition-colors mb-3"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Business / Organization (optional)"
                                            value={form.business_name}
                                            onChange={e => set('business_name', e.target.value)}
                                            className="w-full bg-white/5 rounded-none px-4 py-3 text-base sm:text-sm text-white placeholder-white/40 focus:outline-none focus:bg-white/10 transition-colors"
                                        />
                                    </div>
                                )}

                                {/* Step 1: Email */}
                                {detailsStep === 1 && (
                                    <div>
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 bg-white/10 flex items-center justify-center">
                                                <EnvelopeIcon className="w-5 h-5 text-white/60" />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold text-white">Your email</h2>
                                                <p className="text-white/40 text-sm">I'll reach out here</p>
                                            </div>
                                        </div>
                                        <input
                                            type="email"
                                            autoFocus
                                            placeholder="your@email.com"
                                            value={form.email}
                                            onChange={e => set('email', e.target.value)}
                                            className="w-full bg-white/5 rounded-none px-4 py-3 text-base sm:text-sm text-white placeholder-white/40 focus:outline-none focus:bg-white/10 transition-colors mb-3"
                                        />
                                        <input
                                            type="tel"
                                            placeholder="Phone (optional)"
                                            value={form.phone}
                                            onChange={e => set('phone', e.target.value)}
                                            className="w-full bg-white/5 rounded-none px-4 py-3 text-base sm:text-sm text-white placeholder-white/40 focus:outline-none focus:bg-white/10 transition-colors"
                                        />
                                    </div>
                                )}

                                {/* Step 2: Event Type */}
                                {detailsStep === 2 && (
                                    <div>
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 bg-white/10 flex items-center justify-center">
                                                <CalendarIcon className="w-5 h-5 text-white/60" />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold text-white">What kind of shoot?</h2>
                                                <p className="text-white/40 text-sm">Candid-style, your vibe</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {EVENT_TYPES.map(t => (
                                                <button
                                                    key={t}
                                                    type="button"
                                                    onClick={() => set('event_type', t)}
                                                    className={`w-full px-3 py-2.5 text-[11px] text-center uppercase tracking-wider font-bold transition-colors rounded-none leading-tight ${form.event_type === t ? 'bg-white text-black' : 'bg-white/5 text-white hover:bg-white/10'}`}
                                                >
                                                    {t}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Step 3: Time slots (preset ranges, blocked slots greyed out) */}
                                {detailsStep === 3 && (
                                    <div>
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 bg-white/10 flex items-center justify-center">
                                                <ClockIcon className="w-5 h-5 text-white/60" />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold text-white">When does it run?</h2>
                                                <p className="text-white/40 text-sm">Pick a window — we'll refine when we talk</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 gap-2">
                                            {TIME_SLOTS.map(slot => {
                                                const blocked = isSlotBlocked(slot, bookedSlots);
                                                const selected = form.start_time === slot.start && form.end_time === slot.end;
                                                return (
                                                    <button
                                                        key={slot.label}
                                                        type="button"
                                                        disabled={blocked}
                                                        onClick={() => { set('start_time', slot.start); set('end_time', slot.end); }}
                                                        className={`w-full px-4 py-3 text-left transition-colors rounded-none flex items-center justify-between ${
                                                            blocked
                                                                ? 'bg-white/[0.02] text-white/20 cursor-not-allowed'
                                                                : selected
                                                                    ? 'bg-white text-black'
                                                                    : 'bg-white/5 text-white hover:bg-white/10'
                                                        }`}
                                                    >
                                                        <span className="font-black uppercase tracking-wider text-sm">{slot.label}</span>
                                                        <span className={`text-[10px] font-mono ${selected ? 'text-black/60' : blocked ? 'text-white/20' : 'text-white/40'}`}>
                                                            {blocked ? 'BOOKED' : slot.display}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                            <button
                                                type="button"
                                                onClick={() => { set('start_time', ''); set('end_time', ''); }}
                                                className={`w-full px-4 py-3 text-left transition-colors rounded-none flex items-center justify-between ${
                                                    !form.start_time && !form.end_time
                                                        ? 'bg-white text-black'
                                                        : 'bg-white/5 text-white hover:bg-white/10'
                                                }`}
                                            >
                                                <span className="font-black uppercase tracking-wider text-sm">Flexible</span>
                                                <span className={`text-[10px] font-mono ${!form.start_time && !form.end_time ? 'text-black/60' : 'text-white/40'}`}>
                                                    LET'S TALK
                                                </span>
                                            </button>
                                        </div>
                                        {bookedSlots.length > 0 && (
                                            <p className="text-white/30 text-[10px] mt-3 leading-relaxed">
                                                Some windows are already booked on this date. Pick an open one or choose Flexible and we'll work it out.
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Step 4: Venue + Notes */}
                                {detailsStep === 4 && (
                                    <div>
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 bg-white/10 flex items-center justify-center">
                                                <MapPinIcon className="w-5 h-5 text-white/60" />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold text-white">Where & anything else?</h2>
                                                <p className="text-white/40 text-sm">Venue + any details I should know</p>
                                            </div>
                                        </div>
                                        <input
                                            type="text"
                                            autoFocus
                                            placeholder="Venue name or city"
                                            value={form.location}
                                            onChange={e => set('location', e.target.value)}
                                            className="w-full bg-white/5 rounded-none px-4 py-3 text-base sm:text-sm text-white placeholder-white/40 focus:outline-none focus:bg-white/10 transition-colors mb-3"
                                        />
                                        <textarea
                                            rows={3}
                                            placeholder="Anything else — vibe, references, guests, crew…"
                                            value={form.notes}
                                            onChange={e => set('notes', e.target.value)}
                                            className="w-full bg-white/5 rounded-none px-4 py-3 text-base sm:text-sm text-white placeholder-white/40 focus:outline-none focus:bg-white/10 transition-colors resize-none"
                                        />

                                        <div className="bg-white/[0.04] p-3 mt-4">
                                            <p className="text-white/70 text-[11px] leading-relaxed">
                                                Submitting holds the date for you while we talk. Booking requires a{' '}
                                                <span className="text-white font-bold">50% non-refundable deposit</span>{' '}
                                                to finalize — I'll send a contract + payment link after we scope the shoot.
                                                We accept <span className="text-white font-bold">Bitcoin (Strike)</span>,
                                                Apple Pay, Cashapp, and Venmo.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {error && (
                                    <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest mt-4">
                                        {error}
                                    </p>
                                )}

                                {/* Navigation */}
                                <div className="flex gap-3 mt-6">
                                    {detailsStep > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setDetailsStep(s => s - 1)}
                                            className="px-5 py-3 bg-white/5 text-white text-[11px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors"
                                        >
                                            Back
                                        </button>
                                    )}
                                    {detailsStep < TOTAL_DETAILS_STEPS - 1 ? (
                                        <button
                                            type="button"
                                            onClick={() => { if (canProceedDetails()) setDetailsStep(s => s + 1); }}
                                            disabled={!canProceedDetails()}
                                            className="flex-1 px-5 py-3 bg-white text-black text-[11px] font-black uppercase tracking-widest hover:bg-white/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            Continue
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={(e) => handleSubmit(e as unknown as React.FormEvent)}
                                            disabled={submitting}
                                            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-white text-black text-[11px] font-black uppercase tracking-widest hover:bg-white/80 transition-colors disabled:opacity-40"
                                        >
                                            {submitting ? 'Sending…' : (<>Submit Request <ArrowLongRightIcon className="w-4 h-4" /></>)}
                                        </button>
                                    )}
                                </div>

                                <p className="text-white/20 text-[9px] text-center uppercase tracking-widest mt-4">
                                    I'll respond within 24 hours to confirm availability.
                                </p>
                            </motion.div>
                        )}

                        {/* ── Step 3: Success ── */}
                        {step === 'success' && (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.97 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="max-w-md mx-auto text-center py-16 space-y-6"
                            >
                                <CheckCircleIcon className="w-12 h-12 text-green-400 mx-auto" />
                                <h2 className="text-2xl font-black uppercase tracking-tight">Request Sent!</h2>
                                <p className="text-white/50 text-sm leading-relaxed">
                                    <span className="text-white font-bold">{formatDate(form.event_date)}</span>{' '}
                                    is on hold for you while we talk. I'll reach out within 24 hours to sort
                                    out logistics — nothing is finalized until we've scoped the shoot and
                                    the 50% deposit is received.
                                </p>
                                {notifyDebug && (
                                    <div className="bg-yellow-500/10 text-yellow-300 text-[10px] leading-relaxed p-3 text-left">
                                        <p className="font-black uppercase tracking-widest mb-1">Admin notice (debug)</p>
                                        <p className="break-all">Notify: {notifyDebug}</p>
                                    </div>
                                )}
                                <p className="text-white/30 text-xs">
                                    In the meantime, follow{' '}
                                    <a
                                        href="https://instagram.com/tlau.photos"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-white underline"
                                    >
                                        @tlau.photos
                                    </a>{' '}
                                    for the latest work.
                                </p>
                                <button
                                    onClick={() => { setForm(EMPTY_FORM); setStep('calendar'); }}
                                    className="text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white transition-colors"
                                >
                                    Submit another request
                                </button>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>
            </div>
        </>
    );
};

export default BookingPage;
