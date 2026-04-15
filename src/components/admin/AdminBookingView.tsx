import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    CalendarIcon,
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
    LockClosedIcon,
    LockOpenIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
} from '@heroicons/react/24/outline';

interface Booking {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    event_type: string;
    event_date: string;
    start_time: string | null;
    end_time: string | null;
    location: string | null;
    notes: string | null;
    retainer: boolean;
    status: 'pending' | 'confirmed' | 'declined' | 'cancelled';
    admin_notes: string | null;
    created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
    pending: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    confirmed: 'text-green-400 bg-green-400/10 border-green-400/20',
    declined: 'text-red-400 bg-red-400/10 border-red-400/20',
    cancelled: 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20',
};

const MONTH_NAMES = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December',
];
const DAY_NAMES = ['S','M','T','W','T','F','S'];

function getAdminHeaders(): HeadersInit {
    const secret = (window as any).__ADMIN_SECRET__ || '';
    return {
        'Content-Type': 'application/json',
        'x-admin-secret': secret,
    };
}

const AdminBookingView: React.FC = () => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [blockedDates, setBlockedDates] = useState<string[]>([]);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Booking | null>(null);
    const [adminNotes, setAdminNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'bookings' | 'calendar'>('bookings');

    // Calendar state for blocking dates
    const today = new Date();
    const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
    const [blockNote, setBlockNote] = useState('');
    const [blockingDate, setBlockingDate] = useState<string | null>(null);

    const fetchBookings = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(
                `/api/booking?action=admin&status=${statusFilter}`,
                { headers: getAdminHeaders() }
            );
            const data = await res.json();
            setBookings(data.bookings || []);
        } catch {
            // silently fail
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    const fetchAvailability = useCallback(async () => {
        const res = await fetch('/api/booking?action=availability');
        const data = await res.json();
        setBlockedDates(data.blockedDates || []);
    }, []);

    useEffect(() => { fetchBookings(); }, [fetchBookings]);
    useEffect(() => { fetchAvailability(); }, [fetchAvailability]);

    const updateStatus = async (id: string, status: string) => {
        setSaving(true);
        await fetch('/api/booking?action=admin', {
            method: 'PATCH',
            headers: getAdminHeaders(),
            body: JSON.stringify({ id, status, admin_notes: adminNotes }),
        });
        setSaving(false);
        setSelected(null);
        fetchBookings();
    };

    const toggleBlock = async (dateStr: string) => {
        const isBlocked = blockedDates.includes(dateStr);
        if (isBlocked) {
            await fetch('/api/booking?action=block', {
                method: 'DELETE',
                headers: getAdminHeaders(),
                body: JSON.stringify({ date: dateStr }),
            });
        } else {
            setBlockingDate(dateStr);
            return; // Let the UI show the note input
        }
        fetchAvailability();
    };

    const confirmBlock = async () => {
        if (!blockingDate) return;
        await fetch('/api/booking?action=block', {
            method: 'POST',
            headers: getAdminHeaders(),
            body: JSON.stringify({ date: blockingDate, note: blockNote }),
        });
        setBlockingDate(null);
        setBlockNote('');
        fetchAvailability();
    };

    const fmtDate = (d: string) => {
        const [y, m, day] = d.split('-').map(Number);
        return new Date(y, m - 1, day).toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric',
        });
    };

    // Calendar days
    const calDays = (() => {
        const firstDay = new Date(cursor.year, cursor.month, 1).getDay();
        const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
        const cells: (number | null)[] = [];
        for (let i = 0; i < firstDay; i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) cells.push(d);
        return cells;
    })();

    const fmtCell = (d: number) => {
        const mm = String(cursor.month + 1).padStart(2, '0');
        const dd = String(d).padStart(2, '0');
        return `${cursor.year}-${mm}-${dd}`;
    };

    const bookedDates = bookings
        .filter(b => b.status === 'confirmed' || b.status === 'pending')
        .map(b => b.event_date);

    return (
        <div className="space-y-6">
            {/* Tab switcher */}
            <div className="flex gap-8 border-b border-white/10 pb-0">
                {(['bookings', 'calendar'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-3 text-[10px] font-black uppercase tracking-[0.2em] transition-colors relative ${
                            activeTab === tab ? 'text-white' : 'text-white/30 hover:text-white/60'
                        }`}
                    >
                        {tab}
                        {activeTab === tab && (
                            <motion.div layoutId="bookingTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
                        )}
                    </button>
                ))}
            </div>

            {/* ── Bookings Tab ── */}
            {activeTab === 'bookings' && (
                <div className="space-y-4">
                    {/* Status filter */}
                    <div className="flex gap-2 flex-wrap">
                        {['all', 'pending', 'confirmed', 'declined', 'cancelled'].map(s => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest border transition-colors ${
                                    statusFilter === s
                                        ? 'bg-white text-black border-white'
                                        : 'text-white/40 border-white/10 hover:border-white/30'
                                }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <div className="text-white/30 text-xs uppercase tracking-widest animate-pulse py-8">Loading...</div>
                    ) : bookings.length === 0 ? (
                        <div className="text-white/20 text-xs uppercase tracking-widest py-8">No bookings found.</div>
                    ) : (
                        <div className="space-y-2">
                            {bookings.map(b => (
                                <div
                                    key={b.id}
                                    onClick={() => { setSelected(b); setAdminNotes(b.admin_notes || ''); }}
                                    className="border border-white/10 p-4 cursor-pointer hover:border-white/30 transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-sm font-black text-white truncate">{b.name}</span>
                                                <span className={`px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest border ${STATUS_COLORS[b.status]}`}>
                                                    {b.status}
                                                </span>
                                                {b.retainer && (
                                                    <span className="px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest border border-purple-400/20 bg-purple-400/10 text-purple-400">
                                                        Retainer
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-white/50 text-xs">{b.email}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-xs font-bold text-white">{fmtDate(b.event_date)}</p>
                                            <p className="text-white/40 text-[10px]">{b.event_type}</p>
                                        </div>
                                    </div>
                                    {(b.location || b.start_time) && (
                                        <div className="flex gap-4 mt-2 text-[10px] text-white/30">
                                            {b.location && <span>📍 {b.location}</span>}
                                            {b.start_time && <span>🕐 {b.start_time}{b.end_time ? ` – ${b.end_time}` : ''}</span>}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Calendar Tab ── */}
            {activeTab === 'calendar' && (
                <div className="max-w-sm space-y-6">
                    <div className="flex items-center justify-between mb-2">
                        <button onClick={() => setCursor(c => ({ year: c.month === 0 ? c.year - 1 : c.year, month: c.month === 0 ? 11 : c.month - 1 }))} className="p-1 text-white/40 hover:text-white">
                            <ChevronLeftIcon className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-black uppercase tracking-[0.2em]">
                            {MONTH_NAMES[cursor.month]} {cursor.year}
                        </span>
                        <button onClick={() => setCursor(c => ({ year: c.month === 11 ? c.year + 1 : c.year, month: c.month === 11 ? 0 : c.month + 1 }))} className="p-1 text-white/40 hover:text-white">
                            <ChevronRightIcon className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="grid grid-cols-7 mb-1">
                        {DAY_NAMES.map((d, i) => (
                            <div key={i} className="text-center text-[9px] font-black text-white/20 py-1">{d}</div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-0.5">
                        {calDays.map((d, i) => {
                            if (!d) return <div key={`e-${i}`} />;
                            const dateStr = fmtCell(d);
                            const blocked = blockedDates.includes(dateStr);
                            const booked = bookedDates.includes(dateStr);

                            return (
                                <button
                                    key={dateStr}
                                    onClick={() => toggleBlock(dateStr)}
                                    title={blocked ? 'Click to unblock' : 'Click to block'}
                                    className={`aspect-square flex items-center justify-center text-[11px] font-bold transition-all relative
                                        ${blocked ? 'bg-red-900/40 text-red-400 border border-red-900/50' : booked ? 'bg-yellow-900/30 text-yellow-400' : 'text-white/50 hover:bg-white/10'}
                                    `}
                                >
                                    {d}
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex gap-4 text-[9px] text-white/30 font-bold uppercase tracking-widest">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-900/60 border border-red-900" /> Blocked</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-yellow-900/40" /> Booked</span>
                    </div>

                    {blockingDate && (
                        <div className="border border-white/20 p-4 space-y-3">
                            <p className="text-xs font-black uppercase tracking-wider text-white">
                                Block {fmtDate(blockingDate)}?
                            </p>
                            <input
                                type="text"
                                value={blockNote}
                                onChange={e => setBlockNote(e.target.value)}
                                placeholder="Reason (optional)"
                                className="w-full bg-white/5 border border-white/10 px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none"
                            />
                            <div className="flex gap-2">
                                <button onClick={confirmBlock} className="flex-1 py-2 bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-colors">
                                    Block Date
                                </button>
                                <button onClick={() => setBlockingDate(null)} className="px-4 py-2 border border-white/20 text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white transition-colors">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Booking Detail Drawer ── */}
            {selected && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm"
                    onClick={() => setSelected(null)}
                >
                    <motion.div
                        initial={{ y: 40, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="bg-zinc-950 border border-white/20 w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-lg font-black text-white">{selected.name}</h3>
                                <p className="text-white/40 text-xs">{selected.email}</p>
                            </div>
                            <button onClick={() => setSelected(null)} className="text-white/30 hover:text-white">
                                <XCircleIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div><p className="text-white/30 uppercase tracking-widest mb-0.5">Date</p><p className="font-bold">{fmtDate(selected.event_date)}</p></div>
                            <div><p className="text-white/30 uppercase tracking-widest mb-0.5">Type</p><p className="font-bold">{selected.event_type}</p></div>
                            {selected.start_time && <div><p className="text-white/30 uppercase tracking-widest mb-0.5">Time</p><p className="font-bold">{selected.start_time}{selected.end_time ? ` – ${selected.end_time}` : ''}</p></div>}
                            {selected.location && <div><p className="text-white/30 uppercase tracking-widest mb-0.5">Location</p><p className="font-bold">{selected.location}</p></div>}
                            {selected.phone && <div><p className="text-white/30 uppercase tracking-widest mb-0.5">Phone</p><p className="font-bold">{selected.phone}</p></div>}
                        </div>

                        {selected.notes && (
                            <div>
                                <p className="text-white/30 text-[9px] uppercase tracking-widest mb-1">Client Notes</p>
                                <p className="text-white/70 text-sm leading-relaxed bg-white/5 p-3">{selected.notes}</p>
                            </div>
                        )}

                        <div>
                            <p className="text-white/30 text-[9px] uppercase tracking-widest mb-1">Admin Notes</p>
                            <textarea
                                value={adminNotes}
                                onChange={e => setAdminNotes(e.target.value)}
                                rows={2}
                                className="w-full bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none resize-none"
                                placeholder="Internal notes..."
                            />
                        </div>

                        <div className="flex gap-2 flex-wrap">
                            <button onClick={() => updateStatus(selected.id, 'confirmed')} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-green-500 transition-colors disabled:opacity-50">
                                <CheckCircleIcon className="w-3.5 h-3.5" /> Confirm
                            </button>
                            <button onClick={() => updateStatus(selected.id, 'declined')} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-red-900 text-red-300 text-[10px] font-black uppercase tracking-widest hover:bg-red-800 transition-colors disabled:opacity-50">
                                <XCircleIcon className="w-3.5 h-3.5" /> Decline
                            </button>
                            <button onClick={() => updateStatus(selected.id, 'cancelled')} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 border border-white/20 text-white/40 text-[10px] font-black uppercase tracking-widest hover:border-white/40 hover:text-white/60 transition-colors disabled:opacity-50">
                                Cancel
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </div>
    );
};

export default AdminBookingView;
