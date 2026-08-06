import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';

/**
 * Express booking for a client we already have on file.
 *
 * A returning client sent a personal booking link should not be walked through
 * the five-step wizard asking their name, business and service — we hold all of
 * that in the CRM. This modal greets them by name and asks only what we cannot
 * know: when, where, and how to get into the unit. Submitting generates the
 * invoice and Stripe deposit link straight away.
 *
 * The client is resolved server-side from the row id in the link, so no
 * personal details travel in the URL.
 */

interface Client { id: string; name: string; email: string; business?: string | null }

interface TimeSlot { label: string; start: string; end: string; display: string }

const TIME_SLOTS: TimeSlot[] = [
    { label: 'Early Morning', start: '06:00', end: '08:00', display: '6AM – 8AM' },
    { label: 'Morning', start: '09:00', end: '12:00', display: '9AM – 12PM' },
    { label: 'Afternoon', start: '12:00', end: '17:00', display: '12PM – 5PM' },
    { label: 'Evening', start: '17:00', end: '20:00', display: '5PM – 8PM' },
    { label: 'Night', start: '20:00', end: '23:00', display: '8PM – 11PM' },
];

const BEDROOM_OPTIONS = [
    { value: 1, label: 'Studio / 1', price: 195 },
    { value: 2, label: '2 bed', price: 265 },
    { value: 3, label: '3 bed', price: 335 },
    { value: 4, label: '4+ / lux', price: 425 },
];

const DAYS_AHEAD = 21;

function isoDate(d: Date) { return d.toISOString().slice(0, 10); }

export default function ExpressBookingModal({
    clientId,
    eventType,
    promoCode,
    discountPct = 0,
    initialBedrooms,
    onClose,
}: {
    clientId: string;
    eventType: string;
    promoCode?: string;
    discountPct?: number;
    initialBedrooms?: number;
    onClose: () => void;
}) {
    const [client, setClient] = useState<Client | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    const [blockedDates, setBlockedDates] = useState<string[]>([]);
    const [date, setDate] = useState('');
    const [allowedSlots, setAllowedSlots] = useState<string[] | null>(null);
    const [slot, setSlot] = useState<TimeSlot | null>(null);
    const [bedrooms, setBedrooms] = useState<number | undefined>(initialBedrooms);
    const [location, setLocation] = useState('');
    const [access, setAccess] = useState('');

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState<{ invoiceNumber?: string; total?: number } | null>(null);

    const isAirbnb = eventType === 'Airbnb / Short-Term Rental';

    useEffect(() => {
        let alive = true;
        Promise.all([
            fetch(`/api/booking?action=client&id=${encodeURIComponent(clientId)}`).then(r => r.ok ? r.json() : Promise.reject(new Error('client'))),
            fetch('/api/booking?action=availability').then(r => r.ok ? r.json() : { blockedDates: [] }),
        ])
            .then(([c, a]) => {
                if (!alive) return;
                setClient(c.client);
                setBlockedDates(a.blockedDates || []);
            })
            .catch(() => { if (alive) setLoadError('We could not load your details. Please reply to our email and we will book it for you.'); })
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, [clientId]);

    // Only offer dates we can actually cover.
    const dates = useMemo(() => {
        const out: Date[] = [];
        const today = new Date();
        for (let i = 1; i <= DAYS_AHEAD; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            if (!blockedDates.includes(isoDate(d))) out.push(d);
        }
        return out;
    }, [blockedDates]);

    useEffect(() => {
        if (!date) { setAllowedSlots(null); setSlot(null); return; }
        setSlot(null);
        fetch(`/api/booking?action=slots&date=${date}`)
            .then(r => r.ok ? r.json() : { allowedSlots: null })
            .then(d => setAllowedSlots(Array.isArray(d.allowedSlots) ? d.allowedSlots : null))
            .catch(() => setAllowedSlots(null));
    }, [date]);

    const openSlots = TIME_SLOTS.filter(s => !allowedSlots || allowedSlots.includes(s.label));

    const basePrice = isAirbnb
        ? BEDROOM_OPTIONS.find(o => o.value === bedrooms)?.price
        : undefined;
    const finalPrice = basePrice != null
        ? Math.round(basePrice * (1 - discountPct / 100) * 100) / 100
        : undefined;

    const canSubmit = !!date && !!slot && location.trim().length > 0 && (!isAirbnb || !!bedrooms);

    const submit = async () => {
        if (!client || !slot) return;
        setSubmitting(true);
        setError('');
        try {
            const res = await fetch('/api/booking?action=request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: client.name,
                    email: client.email,
                    business_name: client.business || '',
                    event_type: eventType,
                    event_date: date,
                    start_time: slot.start,
                    end_time: slot.end,
                    location: location.trim(),
                    bedrooms,
                    notes: [
                        access.trim() && `Access: ${access.trim()}`,
                        promoCode && `Promo code: ${promoCode}`,
                    ].filter(Boolean).join('\n\n'),
                }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) throw new Error(data?.error || `Could not confirm (${res.status})`);
            setDone({ invoiceNumber: data?.quote?.invoiceNumber, total: data?.quote?.total });
        } catch (e: any) {
            setError(e?.message || 'Something went wrong. Please reply to our email.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-start md:items-center justify-center overflow-y-auto p-4 py-10"
            >
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-lg bg-[#0a0a0a]"
                >
                    <div className="flex items-start justify-between gap-4 p-6 pb-0">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30 mb-2">
                                EXPRESS BOOKING
                            </p>
                            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white leading-none">
                                {loading ? 'ONE MOMENT' : done ? 'BOOKING CONFIRMED' : `HI ${(client?.name || '').split(' ')[0].toUpperCase()}`}
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            aria-label="Close"
                            className="p-2 bg-white/5 hover:bg-white/10 transition-colors flex-shrink-0"
                        >
                            <XMarkIcon className="w-5 h-5 text-white/60" />
                        </button>
                    </div>

                    <div className="p-6">
                        {loading && (
                            <p className="text-white/40 text-sm">Loading your details…</p>
                        )}

                        {!loading && loadError && (
                            <p className="text-white/70 text-sm">{loadError}</p>
                        )}

                        {!loading && !loadError && done && (
                            <div>
                                <p className="text-white text-sm leading-relaxed mb-4">
                                    Thanks {client?.name?.split(' ')[0]} — your shoot is booked and
                                    {done.invoiceNumber ? ` invoice ${done.invoiceNumber}` : ' your invoice'} is on its way
                                    to {client?.email}.
                                </p>
                                <div className="bg-white/5 p-4 mb-6">
                                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/40 mb-1">Next step</p>
                                    <p className="text-white text-sm">
                                        Pay the deposit from the invoice to lock the date. The remaining
                                        balance is collected on the day, once the shoot is complete.
                                    </p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="w-full px-6 py-4 bg-white text-black font-black uppercase tracking-widest text-sm hover:bg-zinc-200 transition-colors"
                                >
                                    Done
                                </button>
                            </div>
                        )}

                        {!loading && !loadError && !done && (
                            <>
                                <p className="text-white/60 text-sm leading-relaxed mb-6">
                                    Thanks for booking again. We have your details on file — just add
                                    the last few things and we'll generate your invoice.
                                </p>

                                {isAirbnb && !initialBedrooms && (
                                    <div className="mb-6">
                                        <p className="text-white text-sm font-bold mb-1">How many bedrooms?</p>
                                        <p className="text-white/40 text-xs mb-3">Sets your rate.</p>
                                        <div className="grid grid-cols-4 gap-2">
                                            {BEDROOM_OPTIONS.map(o => (
                                                <button
                                                    key={o.value}
                                                    onClick={() => setBedrooms(o.value)}
                                                    className={`px-2 py-3 text-center transition-colors ${bedrooms === o.value ? 'bg-white text-black' : 'bg-white/5 text-white hover:bg-white/10'}`}
                                                >
                                                    <span className="block text-[10px] font-black uppercase tracking-wider leading-tight">{o.label}</span>
                                                    <span className={`block text-[10px] font-mono mt-1 ${bedrooms === o.value ? 'text-black/60' : 'text-white/40'}`}>${o.price}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="mb-6">
                                    <p className="text-white text-sm font-bold mb-1">Which day?</p>
                                    <p className="text-white/40 text-xs mb-3">Only dates we can cover are shown.</p>
                                    <div className="flex gap-2 overflow-x-auto pb-2">
                                        {dates.map(d => {
                                            const v = isoDate(d);
                                            const on = date === v;
                                            return (
                                                <button
                                                    key={v}
                                                    onClick={() => setDate(v)}
                                                    className={`flex-shrink-0 px-4 py-3 text-center transition-colors ${on ? 'bg-white text-black' : 'bg-white/5 text-white hover:bg-white/10'}`}
                                                >
                                                    <span className="block text-[9px] font-black uppercase tracking-widest opacity-60">
                                                        {d.toLocaleDateString('en-US', { weekday: 'short' })}
                                                    </span>
                                                    <span className="block text-sm font-black">
                                                        {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {date && (
                                    <div className="mb-6">
                                        <p className="text-white text-sm font-bold mb-1">What time?</p>
                                        <p className="text-white/40 text-xs mb-3">
                                            {openSlots.length === 0
                                                ? 'Nothing open on that day — try another.'
                                                : 'These are the windows we can cover.'}
                                        </p>
                                        <div className="grid grid-cols-1 gap-2">
                                            {openSlots.map(s => {
                                                const on = slot?.label === s.label;
                                                return (
                                                    <button
                                                        key={s.label}
                                                        onClick={() => setSlot(s)}
                                                        className={`w-full px-4 py-3 text-left transition-colors flex items-center justify-between ${on ? 'bg-white text-black' : 'bg-white/5 text-white hover:bg-white/10'}`}
                                                    >
                                                        <span className="font-black uppercase tracking-wider text-sm">{s.label}</span>
                                                        <span className={`text-[10px] font-mono ${on ? 'text-black/60' : 'text-white/40'}`}>{s.display}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className="mb-6">
                                    <p className="text-white text-sm font-bold mb-1">Where is it?</p>
                                    <input
                                        value={location}
                                        onChange={e => setLocation(e.target.value)}
                                        placeholder="Street address, unit number, city"
                                        className="w-full bg-white/5 px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:bg-white/10 transition-colors"
                                    />
                                </div>

                                <div className="mb-6">
                                    <p className="text-white text-sm font-bold mb-1">How do we get in?</p>
                                    <p className="text-white/40 text-xs mb-3">
                                        Lockbox or gate code, parking, who to call on the day.
                                    </p>
                                    <textarea
                                        value={access}
                                        onChange={e => setAccess(e.target.value)}
                                        rows={3}
                                        placeholder="Gate code 4821, unit 204, lockbox code 1105. Visitor parking out front."
                                        className="w-full bg-white/5 px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:bg-white/10 transition-colors resize-none"
                                    />
                                </div>

                                {finalPrice != null && (
                                    <div className="bg-white/5 p-4 mb-6">
                                        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/40 mb-1">Your rate</p>
                                        <p className="text-white text-xl font-black">
                                            ${finalPrice.toFixed(2)}
                                            {discountPct > 0 && basePrice != null && (
                                                <span className="text-white/30 text-sm font-bold ml-2 line-through">${basePrice.toFixed(2)}</span>
                                            )}
                                        </p>
                                        {discountPct > 0 && promoCode && (
                                            <p className="text-white/40 text-xs mt-1">{discountPct}% off applied · {promoCode}</p>
                                        )}
                                    </div>
                                )}

                                {error && <p className="text-white/80 text-sm mb-4">{error}</p>}

                                <button
                                    onClick={submit}
                                    disabled={!canSubmit || submitting}
                                    className="w-full px-6 py-4 bg-white text-black font-black uppercase tracking-widest text-sm hover:bg-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {submitting ? 'Generating…' : 'Generate invoice & confirm'}
                                </button>
                                <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest text-center mt-3">
                                    Invoice and deposit link sent to {client?.email}
                                </p>
                            </>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
