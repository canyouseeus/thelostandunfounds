import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CameraIcon,
    ComputerDesktopIcon,
    RocketLaunchIcon,
    MapPinIcon,
    ClockIcon,
    CalendarIcon,
    UserIcon,
    EnvelopeIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ArrowLongRightIcon,
    CheckCircleIcon,
    BoltIcon,
} from '@heroicons/react/24/outline';

// ── Service data ──────────────────────────────────────────────────────────────

const PHOTO_SERVICES = [
    {
        id: 'portrait',
        label: 'LIFESTYLE PORTRAIT',
        price: '$250',
        meta: '30–45 min · Downtown Austin',
        features: [
            '10–15 curated photos',
            'Same-day delivery',
            'Candid, lifestyle direction',
        ],
    },
    {
        id: 'event',
        label: 'EVENT COVERAGE',
        price: '$600',
        meta: '3 hours · Your venue',
        features: [
            '20–30 curated photos, next-day',
            'Event highlight reel within 48 hrs',
            '+$175/hr for additional hours',
        ],
    },
    {
        id: 'halfday',
        label: 'HALF-DAY CONTENT',
        price: '$800',
        meta: '4 hours · On location',
        features: [
            '30–50 curated photos',
            '2–3 short-form reels',
            'Lifestyle + product coverage',
        ],
    },
    {
        id: 'fullday',
        label: 'FULL-DAY CONTENT',
        price: '$1,400',
        meta: '8 hours · On location',
        features: [
            '50+ curated photos',
            '2–3 short-form reels',
            'Everything a brand needs in a single day',
        ],
        featured: true,
    },
];

const WEB_SERVICES = [
    {
        id: 'starter',
        label: 'STARTER',
        price: '$1,500',
        features: [
            'Template-based site',
            '5–8 pages',
            'Mobile responsive',
            'Vercel deployment',
        ],
    },
    {
        id: 'professional',
        label: 'PROFESSIONAL',
        price: '$3,500',
        features: [
            'Custom branding',
            'Dashboard / admin panel',
            'Booking system',
            'SEO optimization',
        ],
        featured: true,
    },
    {
        id: 'agency',
        label: 'AGENCY',
        price: '$6,000+',
        features: [
            'Full custom build',
            'CRM integration',
            'Email automation',
            'Payment processing',
        ],
    },
    {
        id: 'maintenance',
        label: 'MONTHLY MAINTENANCE',
        price: '$150–300/mo',
        features: [
            'Content updates',
            'Performance monitoring',
            'Priority support',
            'Security patches',
        ],
    },
];

const BUNDLES = [
    {
        id: 'launch',
        label: 'LAUNCH PACKAGE',
        price: '$2,500',
        tagline: 'Launch online, fully equipped.',
        features: [
            'Starter website (5–8 pages)',
            'Lifestyle portrait session',
            'Product & space photography for the site',
            'Same-day photo delivery',
        ],
    },
    {
        id: 'brand',
        label: 'BRAND PACKAGE',
        price: '$5,000',
        tagline: 'A complete brand presence, built and shot in one engagement.',
        features: [
            'Professional website with custom branding',
            'Half-day content shoot (4 hrs)',
            'Brand photography + social assets',
            'Short-form reel content',
        ],
        featured: true,
    },
];

const TRAVEL_TIERS = [
    { range: 'Downtown Austin', rate: 'Included' },
    { range: '15–50 mi', rate: '+$50' },
    { range: '50+ mi', rate: '+$100 + mileage' },
    { range: 'Overnight', rate: 'Lodging at cost' },
];

// ── Booking calendar/wizard ───────────────────────────────────────────────────

const EVENT_TYPES = [
    'Portrait Session',
    'Lifestyle Shoot',
    'Event Coverage',
    'Half-Day Content',
    'Full-Day Content',
    'Brand / Editorial',
    'Web Development',
    'Retainer (Monthly)',
    'Other',
];

interface TimeSlot { label: string; start: string; end: string; display: string }

const TIME_SLOTS: TimeSlot[] = [
    { label: 'Morning',   start: '09:00', end: '12:00', display: '9AM – 12PM' },
    { label: 'Afternoon', start: '12:00', end: '17:00', display: '12PM – 5PM' },
    { label: 'Evening',   start: '17:00', end: '20:00', display: '5PM – 8PM' },
    { label: 'Night',     start: '20:00', end: '23:00', display: '8PM – 11PM' },
];

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

    const prev = () => setCursor(c => {
        const m = c.month === 0 ? 11 : c.month - 1;
        const y = c.month === 0 ? c.year - 1 : c.year;
        return { year: y, month: m };
    });
    const next = () => setCursor(c => {
        const m = c.month === 11 ? 0 : c.month + 1;
        const y = c.month === 11 ? c.year + 1 : c.year;
        return { year: y, month: m };
    });

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
                    <div key={d} className="text-center text-[9px] font-black uppercase tracking-widest text-white/20 py-1">
                        {d}
                    </div>
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

// ── Service card components ───────────────────────────────────────────────────

const ServiceCard: React.FC<{
    label: string;
    price: string;
    meta?: string;
    features: string[];
    featured?: boolean;
}> = ({ label, price, meta, features, featured }) => {
    const base = featured
        ? 'bg-white text-black'
        : 'bg-white/[0.04] text-white';
    const priceColor = featured ? 'text-black' : 'text-white';
    const metaColor = featured ? 'text-black/50' : 'text-white/40';
    const featureColor = featured ? 'text-black/60' : 'text-white/50';
    const dotColor = featured ? 'bg-black/20' : 'bg-white/20';

    return (
        <div className={`${base} p-6 flex flex-col`}>
            <p className="text-[9px] font-black uppercase tracking-[0.3em] mb-3 opacity-60">{label}</p>
            <p className={`text-3xl font-black ${priceColor} mb-1`}>{price}</p>
            {meta && <p className={`text-[10px] font-bold uppercase tracking-wider ${metaColor} mb-5`}>{meta}</p>}
            <ul className="space-y-2 mt-auto">
                {features.map(f => (
                    <li key={f} className="flex items-start gap-2">
                        <span className={`w-1 h-1 rounded-full ${dotColor} mt-1.5 flex-shrink-0`} />
                        <span className={`text-xs leading-relaxed ${featureColor}`}>{f}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

// ── Main component ────────────────────────────────────────────────────────────

const BookingPage: React.FC = () => {
    const scheduleRef = useRef<HTMLDivElement>(null);

    // Booking wizard state
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
    const [conflictingEvents, setConflictingEvents] = useState<Array<{ id: string; title: string; location: string | null }>>([]);
    const wizardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!form.event_date) { setBookedSlots([]); setConflictingEvents([]); return; }
        fetch(`/api/booking?action=slots&date=${form.event_date}`)
            .then(r => r.ok ? r.json() : { slots: [], events: [] })
            .then(d => {
                setBookedSlots(d.slots || []);
                setConflictingEvents(d.events || []);
            })
            .catch(() => { setBookedSlots([]); setConflictingEvents([]); });
    }, [form.event_date]);

    useEffect(() => {
        requestAnimationFrame(() => {
            if (step === 'details' && wizardRef.current) {
                const navVar = getComputedStyle(document.documentElement).getPropertyValue('--nav-height').trim();
                const navH = navVar ? parseInt(navVar) : 64;
                const tabsH = 56;
                const rect = wizardRef.current.getBoundingClientRect();
                const top = window.pageYOffset + rect.top - navH - tabsH - 8;
                window.scrollTo({ top, behavior: 'smooth' });
            }
        });
    }, [detailsStep, step]);

    const canProceedDetails = (): boolean => {
        switch (detailsStep) {
            case 0: return form.name.trim().length > 0;
            case 1: return form.email.trim().length > 0 && form.email.includes('@');
            case 2: return form.event_type.trim().length > 0;
            case 3: return true;
            case 4: return true;
            default: return false;
        }
    };

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
            const rawText = await res.text();
            let data: any = null;
            try {
                data = rawText ? JSON.parse(rawText) : null;
            } catch {
                data = { error: `Server returned non-JSON (${res.status}): ${rawText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 180)}` };
            }
            if (!res.ok) throw new Error(data?.error || `Submission failed (${res.status})`);
            if (data?.notify && data.notify.sent === false && data.notify.error) {
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
            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
        });
    };

    const scrollToSchedule = () => {
        scheduleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <div className="min-h-screen bg-black text-white">

            {/* ── Hero ──────────────────────────────────────────────── */}
            <div className="px-4 md:px-8 pt-16 md:pt-24 pb-20 md:pb-28">
                <div className="max-w-5xl mx-auto">
                    <p className="text-[9px] font-black uppercase tracking-[0.5em] text-white/30 mb-4">
                        THE LOST+UNFOUNDS
                    </p>
                    <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tight leading-none text-white mb-6">
                        CREATIVE<br />AGENCY
                    </h1>
                    <p className="text-white/50 text-base md:text-lg max-w-xl leading-relaxed mb-10">
                        Photography and web development for brands, artists, and businesses in Austin.
                        Authentic moments, fast delivery, real results.
                    </p>
                    <button
                        onClick={scrollToSchedule}
                        className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 text-[11px] font-black uppercase tracking-widest hover:bg-white/90 transition-colors"
                    >
                        Schedule a Session
                        <ArrowLongRightIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* ── Photography Services ──────────────────────────────── */}
            <div className="px-4 md:px-8 py-16 md:py-20">
                <div className="max-w-5xl mx-auto">
                    <div className="flex items-center gap-4 mb-10">
                        <CameraIcon className="w-5 h-5 text-white/30 flex-shrink-0" />
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30 mb-1">01</p>
                            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white">
                                PHOTOGRAPHY
                            </h2>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {PHOTO_SERVICES.map(s => (
                            <ServiceCard key={s.id} {...s} />
                        ))}
                    </div>

                    {/* Travel pricing */}
                    <div className="mt-6 bg-white/[0.03] px-6 py-5">
                        <div className="flex items-center gap-2 mb-4">
                            <MapPinIcon className="w-4 h-4 text-white/30" />
                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40">Travel</p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {TRAVEL_TIERS.map(t => (
                                <div key={t.range}>
                                    <p className="text-[10px] font-black uppercase tracking-wider text-white/30 mb-1">{t.range}</p>
                                    <p className="text-sm font-black text-white">{t.rate}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Photography philosophy */}
                    <div className="mt-6 bg-white/[0.03] px-6 py-5 flex items-start gap-4">
                        <BoltIcon className="w-5 h-5 text-white/30 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-black uppercase tracking-wider text-white mb-1">
                                Authentic Moments, Delivered Fast
                            </p>
                            <p className="text-white/40 text-xs leading-relaxed max-w-2xl">
                                Shot on a{' '}
                                <span className="text-white font-bold">Fujifilm X-S20</span>{' '}
                                straight out of camera — no filters, no presets, no editing queue.
                                What you get is the real thing, preserved exactly as it happened,
                                and in your hands the same day.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Web Development ───────────────────────────────────── */}
            <div className="px-4 md:px-8 py-16 md:py-20">
                <div className="max-w-5xl mx-auto">
                    <div className="flex items-center gap-4 mb-10">
                        <ComputerDesktopIcon className="w-5 h-5 text-white/30 flex-shrink-0" />
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30 mb-1">02</p>
                            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white">
                                WEB DEVELOPMENT
                            </h2>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {WEB_SERVICES.map(s => (
                            <ServiceCard key={s.id} {...s} />
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Bundled Packages ──────────────────────────────────── */}
            <div className="px-4 md:px-8 py-16 md:py-20">
                <div className="max-w-5xl mx-auto">
                    <div className="flex items-center gap-4 mb-10">
                        <RocketLaunchIcon className="w-5 h-5 text-white/30 flex-shrink-0" />
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30 mb-1">03</p>
                            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white">
                                BUNDLED PACKAGES
                            </h2>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {BUNDLES.map(b => (
                            <div
                                key={b.id}
                                className={b.featured ? 'bg-white text-black p-6 flex flex-col' : 'bg-white/[0.04] text-white p-6 flex flex-col'}
                            >
                                <p className={`text-[9px] font-black uppercase tracking-[0.3em] mb-3 ${b.featured ? 'text-black/50' : 'text-white/40'}`}>
                                    {b.label}
                                </p>
                                <p className={`text-3xl font-black mb-1 ${b.featured ? 'text-black' : 'text-white'}`}>{b.price}</p>
                                <p className={`text-xs leading-relaxed mb-5 ${b.featured ? 'text-black/50' : 'text-white/40'}`}>
                                    {b.tagline}
                                </p>
                                <ul className="space-y-2 mt-auto">
                                    {b.features.map(f => (
                                        <li key={f} className="flex items-start gap-2">
                                            <span className={`w-1 h-1 rounded-full mt-1.5 flex-shrink-0 ${b.featured ? 'bg-black/20' : 'bg-white/20'}`} />
                                            <span className={`text-xs leading-relaxed ${b.featured ? 'text-black/60' : 'text-white/50'}`}>{f}</span>
                                        </li>
                                    ))}
                                </ul>
                                <button
                                    onClick={scrollToSchedule}
                                    className={`mt-6 w-full py-3 text-[11px] font-black uppercase tracking-widest transition-colors ${
                                        b.featured
                                            ? 'bg-black text-white hover:bg-black/80'
                                            : 'bg-white text-black hover:bg-white/90'
                                    }`}
                                >
                                    Book This Package
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 bg-white/[0.03] px-6 py-4 flex items-center gap-3">
                        <ClockIcon className="w-4 h-4 text-white/30 flex-shrink-0" />
                        <p className="text-white/40 text-xs">
                            All packages require a{' '}
                            <span className="text-white font-bold">50% deposit</span>{' '}
                            to hold the date. Balance due before the session.
                            Payment via Bitcoin (Strike), Apple Pay, Cashapp, or Venmo.
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Schedule a Session ────────────────────────────────── */}
            <div ref={scheduleRef} className="px-4 md:px-8 pt-16 md:pt-20 pb-32">
                <div className="max-w-5xl mx-auto">

                    <div className="mb-12">
                        <p className="text-[9px] font-black uppercase tracking-[0.5em] text-white/30 mb-3">
                            READY TO START
                        </p>
                        <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-white mb-3">
                            SCHEDULE A SESSION
                        </h2>
                        <p className="text-white/40 text-sm max-w-md">
                            Pick a date and we'll reach out within 24 hours to confirm scope and send a contract.
                        </p>
                    </div>

                    <AnimatePresence mode="wait">

                        {/* Calendar step */}
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
                                        Good to Know
                                    </p>
                                    <div className="bg-white/[0.03] p-5">
                                        <p className="text-sm font-black uppercase tracking-wider text-white mb-1">Response Time</p>
                                        <p className="text-white/50 text-xs leading-relaxed">
                                            All requests receive a reply within 24 hours. Selecting a date here
                                            holds a soft reservation while we confirm scope together.
                                        </p>
                                    </div>
                                    <div className="bg-white/[0.03] p-5">
                                        <p className="text-sm font-black uppercase tracking-wider text-white mb-1">Photography</p>
                                        <p className="text-white/40 text-xs leading-relaxed">
                                            Candid-first, lifestyle direction. Real moments, not posed briefs.
                                            Fujifilm X-S20, straight out of camera.
                                        </p>
                                    </div>
                                    <div className="bg-white/[0.03] p-5">
                                        <p className="text-sm font-black uppercase tracking-wider text-white mb-1">Web Projects</p>
                                        <p className="text-white/40 text-xs leading-relaxed">
                                            Initial call to scope the build, then a fixed-price proposal.
                                            Select "Web Development" in the service step.
                                        </p>
                                    </div>
                                    <div className="bg-white text-black p-5">
                                        <p className="text-sm font-black uppercase tracking-wider mb-1">50% Deposit Required</p>
                                        <p className="text-black/60 text-xs leading-relaxed">
                                            A 50% deposit holds your date. Balance is due before the session.
                                            Contract and payment link arrive after we confirm scope.
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Details wizard */}
                        {step === 'details' && (
                            <motion.div
                                key="details"
                                ref={wizardRef}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -16 }}
                                className="max-w-md scroll-mt-4"
                            >
                                <div className="flex items-center gap-3 mb-6">
                                    <button
                                        onClick={() => setContextOpen(v => !v)}
                                        className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 transition-colors px-2.5 py-1.5"
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

                                {detailsStep === 0 && (
                                    <div>
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 bg-white/10 flex items-center justify-center">
                                                <UserIcon className="w-5 h-5 text-white/60" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-white">What's your name?</h3>
                                                <p className="text-white/40 text-sm">So I know who's reaching out</p>
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

                                {detailsStep === 1 && (
                                    <div>
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 bg-white/10 flex items-center justify-center">
                                                <EnvelopeIcon className="w-5 h-5 text-white/60" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-white">Your email</h3>
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

                                {detailsStep === 2 && (
                                    <div>
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 bg-white/10 flex items-center justify-center">
                                                <CalendarIcon className="w-5 h-5 text-white/60" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-white">What service?</h3>
                                                <p className="text-white/40 text-sm">Select the closest match</p>
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

                                {detailsStep === 3 && (
                                    <div>
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 bg-white/10 flex items-center justify-center">
                                                <ClockIcon className="w-5 h-5 text-white/60" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-white">What time works?</h3>
                                                <p className="text-white/40 text-sm">Pick a window — we'll refine when we talk</p>
                                            </div>
                                        </div>
                                        {conflictingEvents.length > 0 && (
                                            <div className="bg-yellow-500/10 text-yellow-300 p-3 mb-3 text-[11px] leading-relaxed">
                                                <p className="font-black uppercase tracking-widest mb-1 text-[9px]">Already scheduled that day</p>
                                                {conflictingEvents.map(e => (
                                                    <p key={e.id}>{e.title}{e.location ? ` · ${e.location}` : ''}</p>
                                                ))}
                                                <p className="mt-2 text-yellow-300/70">
                                                    Pick a non-overlapping window, or select Flexible and we'll work it out.
                                                </p>
                                            </div>
                                        )}
                                        <div className="grid grid-cols-1 gap-2">
                                            {TIME_SLOTS.filter(slot => !isSlotBlocked(slot, bookedSlots)).map(slot => {
                                                const selected = form.start_time === slot.start && form.end_time === slot.end;
                                                return (
                                                    <button
                                                        key={slot.label}
                                                        type="button"
                                                        onClick={() => { set('start_time', slot.start); set('end_time', slot.end); }}
                                                        className={`w-full px-4 py-3 text-left transition-colors rounded-none flex items-center justify-between ${selected ? 'bg-white text-black' : 'bg-white/5 text-white hover:bg-white/10'}`}
                                                    >
                                                        <span className="font-black uppercase tracking-wider text-sm">{slot.label}</span>
                                                        <span className={`text-[10px] font-mono ${selected ? 'text-black/60' : 'text-white/40'}`}>{slot.display}</span>
                                                    </button>
                                                );
                                            })}
                                            <button
                                                type="button"
                                                onClick={() => { set('start_time', ''); set('end_time', ''); }}
                                                className={`w-full px-4 py-3 text-left transition-colors rounded-none flex items-center justify-between ${!form.start_time && !form.end_time ? 'bg-white text-black' : 'bg-white/5 text-white hover:bg-white/10'}`}
                                            >
                                                <span className="font-black uppercase tracking-wider text-sm">Flexible</span>
                                                <span className={`text-[10px] font-mono ${!form.start_time && !form.end_time ? 'text-black/60' : 'text-white/40'}`}>LET'S TALK</span>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {detailsStep === 4 && (
                                    <div>
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 bg-white/10 flex items-center justify-center">
                                                <MapPinIcon className="w-5 h-5 text-white/60" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-white">Where & anything else?</h3>
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
                                            placeholder="Anything else — vibe, references, budget, timeline…"
                                            value={form.notes}
                                            onChange={e => set('notes', e.target.value)}
                                            className="w-full bg-white/5 rounded-none px-4 py-3 text-base sm:text-sm text-white placeholder-white/40 focus:outline-none focus:bg-white/10 transition-colors resize-none"
                                        />
                                        <div className="bg-white/[0.04] p-3 mt-4">
                                            <p className="text-white/60 text-[11px] leading-relaxed">
                                                Submitting holds the date while we talk. A{' '}
                                                <span className="text-white font-bold">50% deposit</span>{' '}
                                                finalizes the booking — contract and payment link follow after we scope it out.
                                                Payment via{' '}
                                                <span className="text-white font-bold">Bitcoin (Strike)</span>,
                                                Apple Pay, Cashapp, or Venmo.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {error && (
                                    <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest mt-4">{error}</p>
                                )}

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
                                    Response within 24 hours.
                                </p>
                            </motion.div>
                        )}

                        {/* Success */}
                        {step === 'success' && (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.97 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="max-w-md text-center py-16 space-y-6"
                            >
                                <CheckCircleIcon className="w-12 h-12 text-green-400 mx-auto" />
                                <h3 className="text-2xl font-black uppercase tracking-tight">Request Sent</h3>
                                <p className="text-white/50 text-sm leading-relaxed">
                                    <span className="text-white font-bold">{formatDate(form.event_date)}</span>{' '}
                                    is on hold while we talk. I'll reach out within 24 hours to confirm
                                    scope — nothing is finalized until the deposit is received.
                                </p>
                                {notifyDebug && (
                                    <div className="bg-yellow-500/10 text-yellow-300 text-[10px] leading-relaxed p-3 text-left">
                                        <p className="font-black uppercase tracking-widest mb-1">Admin notice</p>
                                        <p className="break-all">{notifyDebug}</p>
                                    </div>
                                )}
                                <p className="text-white/30 text-xs">
                                    Follow{' '}
                                    <a href="https://instagram.com/tlau.photos" target="_blank" rel="noopener noreferrer" className="text-white underline">
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

        </div>
    );
};

export default BookingPage;
