import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CalendarIcon,
    ClockIcon,
    MapPinIcon,
    CheckCircleIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ArrowLongRightIcon,
    CameraIcon,
    FilmIcon,
    PhotoIcon,
} from '@heroicons/react/24/outline';
import SEOHead from '../components/SEOHead';

// ─── Constants ────────────────────────────────────────────────

const EVENT_TYPES = [
    'Paparazzi Package',
    'Concert / Show',
    'Club / Nightlife',
    'Portrait Session',
    'Brand / Editorial',
    'Wedding / Event',
    'Retainer (Monthly)',
    'Other',
];

// Places I frequently shoot
const FREQUENT_VENUES = [
    'Stubb\'s Waller Creek Amphitheater',
    'Empire Control Room & Garage',
    'Emo\'s Austin',
    'Mohawk Austin',
    'ACL Live at the Moody Center',
    'The Parish',
    'Antone\'s Nightclub',
    'Long Center for the Performing Arts',
    'Rainey Street / Red River Cultural District',
    '6th Street / Downtown Austin',
];

// ─── Paparazzi Package ────────────────────────────────────────

const PaparazziPackage: React.FC<{ onBook: () => void }> = ({ onBook }) => (
    <div className="border border-white/10 p-6 md:p-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
            <div>
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 mb-1">
                    Featured Package
                </p>
                <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white">
                    Paparazzi Package
                </h2>
            </div>
            <div className="text-right shrink-0">
                <p className="text-3xl font-black text-white">$500</p>
                <p className="text-[9px] font-black uppercase tracking-widest text-white/30">booking fee</p>
            </div>
        </div>

        <div className="h-px bg-white/10" />

        {/* Deliverables */}
        <div className="space-y-3">
            {[
                { icon: FilmIcon, text: '1 reel of your engagement' },
                { icon: PhotoIcon, text: 'Minimum 30 high-res photos' },
                { icon: ClockIcon, text: '3 hours of shooting on location' },
                { icon: MapPinIcon, text: 'On-site at your event' },
            ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-white/30 shrink-0" />
                    <span className="text-sm text-white/70 font-medium">{text}</span>
                </div>
            ))}
        </div>

        <div className="h-px bg-white/10" />

        {/* Deposit note */}
        <div className="bg-white/5 border border-white/10 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">
                Deposit Required
            </p>
            <p className="text-xs text-white/40 leading-relaxed">
                50% deposit ($250) due at booking to secure your date.
                Remaining balance due day of shoot.
            </p>
        </div>

        <button
            onClick={onBook}
            className="w-full flex items-center justify-center gap-3 bg-white text-black py-4 text-[11px] font-black uppercase tracking-[0.2em] hover:bg-zinc-200 transition-colors"
        >
            Book This Package
            <ArrowLongRightIcon className="w-4 h-4" />
        </button>
    </div>
);

// ─── Types ────────────────────────────────────────────────────

interface FormData {
    name: string;
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
    name: '', email: '', phone: '', event_type: '',
    event_date: '', start_time: '', end_time: '',
    location: '', notes: '', retainer: false,
};

const MONTH_NAMES = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December',
];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Calendar ─────────────────────────────────────────────────

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

    const prev = () => setCursor(c => ({
        year: c.month === 0 ? c.year - 1 : c.year,
        month: c.month === 0 ? 11 : c.month - 1,
    }));
    const next = () => setCursor(c => ({
        year: c.month === 11 ? c.year + 1 : c.year,
        month: c.month === 11 ? 0 : c.month + 1,
    }));

    return (
        <div className="w-full">
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

            <div className="grid grid-cols-7 mb-1">
                {DAY_NAMES.map(d => (
                    <div key={d} className="text-center text-[9px] font-black uppercase tracking-widest text-white/20 py-1">{d}</div>
                ))}
            </div>

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
                            className={`aspect-square flex items-center justify-center text-[11px] font-bold transition-all
                                ${isSel ? 'bg-white text-black' : disabled ? 'text-white/15 cursor-not-allowed' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}
                        >
                            {d}
                        </button>
                    );
                })}
            </div>

            <div className="mt-3 flex items-center gap-4 text-[9px] text-white/30 font-bold uppercase tracking-widest">
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-white/15 inline-block" />Unavailable</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-white inline-block" />Selected</span>
            </div>
        </div>
    );
};

// ─── Main Page ────────────────────────────────────────────────

const BookingPage: React.FC = () => {
    const [form, setForm] = useState<FormData>(EMPTY_FORM);
    const [blockedDates, setBlockedDates] = useState<string[]>([]);
    const [step, setStep] = useState<'overview' | 'calendar' | 'details' | 'success'>('overview');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

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
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Submission failed');
            setStep('success');
        } catch (err: any) {
            setError(err.message || 'Something went wrong. Please try again.');
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

    const startPaparazziBooking = () => {
        set('event_type', 'Paparazzi Package');
        setStep('calendar');
    };

    return (
        <>
            <SEOHead
                title="Book @tlau.photos | THE LOST+UNFOUNDS"
                description="Book @tlau.photos for concerts, events, portraits, or the Paparazzi Package — 3 hours, 30+ photos, and a reel. Check availability and submit a request."
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
                        <p className="text-white/40 text-sm md:text-base max-w-md leading-relaxed">
                            Available for concerts, events, portraits, brand work, and monthly retainers.
                            I'll get back to you within 24 hours.
                        </p>
                    </div>

                    <AnimatePresence mode="wait">

                        {/* ── Step 0: Overview ── */}
                        {step === 'overview' && (
                            <motion.div
                                key="overview"
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -16 }}
                                className="space-y-12"
                            >
                                {/* Paparazzi Package */}
                                <PaparazziPackage onBook={startPaparazziBooking} />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Other booking types */}
                                    <div className="space-y-4">
                                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">
                                            Other Booking Types
                                        </p>
                                        {[
                                            { label: 'Single Event', desc: 'Concert, show, club night, or any one-off gig. Pricing quoted on scope.' },
                                            { label: 'Portrait / Editorial', desc: 'One-on-one sessions, brand content, or creative editorial work.' },
                                            { label: 'Monthly Retainer', desc: 'Locked-in rate with priority access to my schedule every month.' },
                                        ].map(item => (
                                            <div key={item.label} className="border border-white/10 p-5">
                                                <p className="text-sm font-black uppercase tracking-wider text-white mb-1">{item.label}</p>
                                                <p className="text-white/40 text-xs leading-relaxed">{item.desc}</p>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => setStep('calendar')}
                                            className="w-full flex items-center justify-center gap-2 border border-white/20 text-white py-3 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white hover:text-black transition-colors"
                                        >
                                            Book Custom Date
                                            <ArrowLongRightIcon className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Frequent venues */}
                                    <div className="space-y-4">
                                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">
                                            Places I Frequently Shoot
                                        </p>
                                        <div className="space-y-1">
                                            {FREQUENT_VENUES.map(venue => (
                                                <div key={venue} className="flex items-center gap-3 py-2 border-b border-white/5">
                                                    <MapPinIcon className="w-3 h-3 text-white/20 shrink-0" />
                                                    <span className="text-xs text-white/50 font-medium">{venue}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-white/20 text-[9px] leading-relaxed">
                                            Not on the list? I travel. Reach out.
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )}

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
                                    <button
                                        onClick={() => setStep('overview')}
                                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white mb-8 transition-colors"
                                    >
                                        <ChevronLeftIcon className="w-3 h-3" />
                                        Back
                                    </button>
                                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40 mb-6">
                                        Pick a Date
                                    </p>
                                    <BookingCalendar
                                        selected={form.event_date}
                                        blockedDates={blockedDates}
                                        onSelect={handleDateSelect}
                                    />
                                </div>

                                <div className="space-y-4 md:pt-16">
                                    {form.event_type === 'Paparazzi Package' && (
                                        <div className="border border-white/10 p-4 space-y-1">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Selected Package</p>
                                            <p className="text-sm font-black text-white">Paparazzi Package — $500</p>
                                            <p className="text-white/30 text-[10px]">3 hrs · 30+ photos · 1 reel · 50% deposit</p>
                                        </div>
                                    )}
                                    <p className="text-white/20 text-[10px] leading-relaxed">
                                        Select a date to continue to the details form. Blocked dates are already booked or unavailable.
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {/* ── Step 2: Details Form ── */}
                        {step === 'details' && (
                            <motion.div
                                key="details"
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -16 }}
                                className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-24"
                            >
                                <div>
                                    <button
                                        onClick={() => setStep('calendar')}
                                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white mb-8 transition-colors"
                                    >
                                        <ChevronLeftIcon className="w-3 h-3" />
                                        Change date
                                    </button>

                                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 mb-1">Selected Date</p>
                                    <p className="text-xl font-black uppercase tracking-tight text-white mb-8">
                                        {formatDate(form.event_date)}
                                    </p>

                                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40 mb-4">
                                        Tell me about the shoot
                                    </p>
                                    <div className="space-y-3 text-[10px] text-white/30 font-bold uppercase tracking-widest">
                                        <div className="flex items-center gap-2"><CalendarIcon className="w-3.5 h-3.5" /> Event type &amp; details</div>
                                        <div className="flex items-center gap-2"><ClockIcon className="w-3.5 h-3.5" /> Start &amp; end times</div>
                                        <div className="flex items-center gap-2"><MapPinIcon className="w-3.5 h-3.5" /> Venue / location</div>
                                    </div>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1.5">Your Name *</label>
                                        <input type="text" value={form.name} onChange={e => set('name', e.target.value)} required placeholder="Full name"
                                            className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/40 transition-colors" />
                                    </div>

                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1.5">Email *</label>
                                        <input type="email" value={form.email} onChange={e => set('email', e.target.value)} required placeholder="your@email.com"
                                            className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/40 transition-colors" />
                                    </div>

                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1.5">Phone</label>
                                        <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+1 (555) 000-0000"
                                            className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/40 transition-colors" />
                                    </div>

                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1.5">Event Type *</label>
                                        <select value={form.event_type} onChange={e => set('event_type', e.target.value)} required
                                            className="w-full bg-zinc-950 border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:border-white/40 transition-colors appearance-none">
                                            <option value="" disabled>Select type...</option>
                                            {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>

                                    {form.event_type === 'Paparazzi Package' && (
                                        <div className="bg-white/5 border border-white/10 px-4 py-3 text-[10px] text-white/40 leading-relaxed">
                                            <span className="text-white font-bold">Paparazzi Package — $500</span><br />
                                            3 hrs on location · 30+ high-res photos · 1 reel · 50% deposit due at booking.
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1.5">Start Time</label>
                                            <input type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:border-white/40 transition-colors" />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1.5">End Time</label>
                                            <input type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:border-white/40 transition-colors" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1.5">Venue / Location</label>
                                        <input type="text" value={form.location} onChange={e => set('location', e.target.value)} placeholder="Venue name or city"
                                            className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/40 transition-colors" />
                                    </div>

                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1.5">Additional Notes</label>
                                        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
                                            placeholder="Any details I should know..."
                                            className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/40 transition-colors resize-none" />
                                    </div>

                                    {error && (
                                        <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest">{error}</p>
                                    )}

                                    <button type="submit" disabled={submitting}
                                        className="w-full flex items-center justify-center gap-3 bg-white text-black py-4 text-[11px] font-black uppercase tracking-[0.2em] hover:bg-zinc-200 transition-colors disabled:opacity-50">
                                        {submitting ? 'Sending...' : (<>Submit Booking Request<ArrowLongRightIcon className="w-4 h-4" /></>)}
                                    </button>

                                    <p className="text-white/20 text-[9px] text-center uppercase tracking-widest">
                                        I'll respond within 24 hours to confirm availability.
                                    </p>
                                </form>
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
                                <CheckCircleIcon className="w-12 h-12 text-white/60 mx-auto" />
                                <h2 className="text-2xl font-black uppercase tracking-tight">Request Sent.</h2>
                                <p className="text-white/40 text-sm leading-relaxed">
                                    Booking request for{' '}
                                    <span className="text-white font-bold">{formatDate(form.event_date)}</span>{' '}
                                    received. I'll be in touch within 24 hours.
                                </p>
                                <p className="text-white/30 text-xs">
                                    Follow{' '}
                                    <a href="https://instagram.com/tlau.photos" target="_blank" rel="noopener noreferrer" className="text-white underline">
                                        @tlau.photos
                                    </a>{' '}
                                    for the latest work.
                                </p>
                                <button
                                    onClick={() => { setForm(EMPTY_FORM); setStep('overview'); }}
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
