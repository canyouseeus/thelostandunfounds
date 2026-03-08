
import { useState, useEffect, useRef } from 'react';
import { LoadingSpinner, LoadingOverlay } from '../Loading';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/Toast';
import {
    CalendarIcon,
    MapPinIcon,
    CurrencyDollarIcon,
    UsersIcon,
    PlusIcon,
    PencilSquareIcon,
    TrashIcon,
    ArrowLeftIcon,
    TicketIcon,
    ArrowPathIcon,
    CheckCircleIcon,
    XCircleIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ClockIcon,
    Bars3Icon,
    Squares2X2Icon,
    MegaphoneIcon,
    InformationCircleIcon,
    CheckIcon,
    CheckCircleIcon as CheckCircleIconOutline
} from '@heroicons/react/24/outline';
import { Tooltip as TooltipRoot, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { cn } from '../../components/ui/utils';
import { FullCalendar as CustomFullCalendar } from '../calendar/FullCalendar';

// --- Local time helpers (avoid UTC shifts from toISOString) ---
function toLocalISOString(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatDisplayDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${month}/${day}/${year}, ${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
}

// --- Custom Date/Time Picker ---
function EventDateTimePicker({ value, onChange }: { value: string; onChange: (val: string) => void }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Parse current value into local date parts
    const currentDate = value ? new Date(value) : new Date();
    const isValid = value && !isNaN(currentDate.getTime());

    const [viewMonth, setViewMonth] = useState(isValid ? currentDate.getMonth() : new Date().getMonth());
    const [viewYear, setViewYear] = useState(isValid ? currentDate.getFullYear() : new Date().getFullYear());

    const selectedDay = isValid ? currentDate.getDate() : null;
    const selectedMonth = isValid ? currentDate.getMonth() : null;
    const selectedYear = isValid ? currentDate.getFullYear() : null;

    // Time state (12-hour)
    const rawHours = isValid ? currentDate.getHours() : 12;
    const currentAmPm = rawHours >= 12 ? 'PM' : 'AM';
    const currentHour12 = rawHours % 12 || 12;
    const currentMinute = isValid ? currentDate.getMinutes() : 0;

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        if (open) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    // Build a new date from parts in local time
    const buildDate = (
        year: number, month: number, day: number,
        hour12: number, minute: number, ampm: string
    ): string => {
        let h = hour12 % 12;
        if (ampm === 'PM') h += 12;
        const d = new Date(year, month, day, h, minute, 0);
        return toLocalISOString(d);
    };

    const handleDaySelect = (day: number) => {
        onChange(buildDate(viewYear, viewMonth, day, currentHour12, currentMinute, currentAmPm));
    };

    const handleHourChange = (h: number) => {
        if (!isValid) return;
        onChange(buildDate(selectedYear!, selectedMonth!, selectedDay!, h, currentMinute, currentAmPm));
    };

    const handleMinuteChange = (m: number) => {
        if (!isValid) return;
        onChange(buildDate(selectedYear!, selectedMonth!, selectedDay!, currentHour12, m, currentAmPm));
    };

    const handleAmPmToggle = () => {
        if (!isValid) return;
        const newAmPm = currentAmPm === 'AM' ? 'PM' : 'AM';
        onChange(buildDate(selectedYear!, selectedMonth!, selectedDay!, currentHour12, currentMinute, newAmPm));
    };

    // Calendar data
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const blanks = Array.from({ length: firstDayOfWeek }, (_, i) => i);
    const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const monthName = new Date(viewYear, viewMonth).toLocaleString('default', { month: 'long' }).toUpperCase();
    const today = new Date();
    const isCurrentMonth = viewMonth === today.getMonth() && viewYear === today.getFullYear();

    // Hour/minute options
    const hours = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const minutes = Array.from({ length: 12 }, (_, i) => i * 5); // 0, 5, 10, ..., 55

    return (
        <div ref={ref} className="relative">
            {/* Display field */}
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="w-full bg-white/5 hover:bg-white/10 p-3 rounded-none text-white text-sm font-mono focus:bg-white/10 focus:outline-none transition-colors text-left flex items-center justify-between"
            >
                <span className={isValid ? 'text-white' : 'text-white/30'}>
                    {isValid ? formatDisplayDate(value) : 'Select date & time'}
                </span>
                <CalendarIcon className="w-4 h-4 text-white/40" />
            </button>

            {/* Dropdown picker */}
            {open && (
                <div className="absolute z-50 top-full left-0 mt-2 bg-[#111] rounded-none shadow-2xl shadow-black flex overflow-hidden">
                    {/* Calendar side */}
                    <div className="p-4 min-w-[260px]">
                        {/* Month/Year header */}
                        <div className="flex items-center justify-between mb-4">
                            <button
                                type="button"
                                onClick={() => {
                                    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
                                    else setViewMonth(viewMonth - 1);
                                }}
                                className="p-1 hover:text-white text-white/40 transition-colors"
                            >
                                <ChevronLeftIcon className="w-4 h-4" />
                            </button>
                            <div className="flex gap-2 items-baseline">
                                <span className="text-sm font-bold text-white tracking-tight">{monthName}</span>
                                <span className="text-xs text-white/40 font-mono">{viewYear}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
                                    else setViewMonth(viewMonth + 1);
                                }}
                                className="p-1 hover:text-white text-white/40 transition-colors"
                            >
                                <ChevronRightIcon className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Weekday headers */}
                        <div className="grid grid-cols-7 gap-y-1 gap-x-1 text-center mb-1">
                            {weekDays.map((d, i) => (
                                <div key={`wd-${i}`} className="text-[10px] text-white/30 font-medium py-1">{d}</div>
                            ))}
                        </div>

                        {/* Day grid */}
                        <div className="grid grid-cols-7 gap-y-1 gap-x-1 text-center">
                            {blanks.map(i => <div key={`b-${i}`} />)}
                            {days.map(d => {
                                const isSelected = selectedDay === d && selectedMonth === viewMonth && selectedYear === viewYear;
                                const isToday = isCurrentMonth && d === today.getDate();
                                return (
                                    <button
                                        type="button"
                                        key={d}
                                        onClick={() => handleDaySelect(d)}
                                        className={cn(
                                            "w-8 h-8 flex items-center justify-center text-xs font-mono transition-all rounded-none cursor-pointer",
                                            isSelected
                                                ? "bg-white text-black font-bold shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                                                : isToday
                                                    ? "text-white font-semibold hover:bg-white/10"
                                                    : "text-white/60 hover:text-white hover:bg-white/10"
                                        )}
                                    >
                                        {d}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Quick actions */}
                        <div className="flex items-center justify-between mt-3 pt-3 bg-white/5">
                            <button
                                type="button"
                                onClick={() => onChange('')}
                                className="text-[10px] font-mono text-white/40 hover:text-white uppercase tracking-widest transition-colors"
                            >
                                Clear
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const now = new Date();
                                    setViewMonth(now.getMonth());
                                    setViewYear(now.getFullYear());
                                    handleDaySelect(now.getDate());
                                }}
                                className="text-[10px] font-mono text-blue-400 hover:text-blue-300 uppercase tracking-widest transition-colors"
                            >
                                Today
                            </button>
                        </div>
                    </div>

                    {/* Time side */}
                    <div className="p-4 flex flex-col items-center justify-center min-w-[140px] bg-white/5">
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-3 flex items-center gap-1.5">
                            <ClockIcon className="w-3 h-3" />
                            Time
                        </div>
                        <input
                            type="time"
                            className="bg-white/10 hover:bg-white/20 p-3 rounded-none text-white font-mono text-xl text-center outline-none focus:ring-2 focus:ring-white/20 cursor-pointer w-full transition-colors [color-scheme:dark] flex-1 max-h-[60px]"
                            value={`${rawHours.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`}
                            onChange={(e) => {
                                if (!e.target.value || !isValid) return;
                                const [h, m] = e.target.value.split(':').map(Number);
                                onChange(buildDate(selectedYear!, selectedMonth!, selectedDay!, h % 12 || 12, m, h >= 12 ? 'PM' : 'AM'));
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

interface TicketTier {
    id: string;
    name: string;
    price_cents: number;
    capacity?: number;
}

interface FormField {
    id: string;
    label: string;
    type: 'text' | 'textarea' | 'select' | 'checkbox';
    required: boolean;
    options?: string[]; // Only for 'select'
}

function Tooltip({ children, content }: { children: React.ReactNode; content: string }) {
    return (
        <TooltipProvider>
            <TooltipRoot>
                <TooltipTrigger asChild>{children}</TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px] text-center">{content}</TooltipContent>
            </TooltipRoot>
        </TooltipProvider>
    );
}

interface EventSettings {
    early_bird_deadline?: string;
    refund_policy?: string;
    show_remaining_capacity?: boolean;
    pricing_format?: 'tickets' | 'rsvp' | 'external' | 'open';
    external_url?: string;
    custom_form?: FormField[];
}

interface CalendarEvent {
    id: string;
    title: string;
    description: string;
    event_date: string;
    location: string;
    price_cents: number;
    capacity: number;
    image_url: string;
    status: 'draft' | 'published' | 'cancelled' | 'pending';
    ticket_tiers: TicketTier[];
    settings: EventSettings;
    price_scaling_trigger?: number;
    price_increment_percent?: number;
    is_promoted?: boolean;
    promotion_banner_url?: string;
    promotion_tagline?: string;
    created_at: string;
}

interface Ticket {
    id: string;
    customer_email: string;
    customer_name: string;
    status: 'valid' | 'used' | 'void';
    purchase_amount_cents: number;
    tier_id?: string;
    created_at: string;
}

interface AdminEventsViewProps {
    onBack: () => void;
}

export default function AdminEventsView({ onBack }: AdminEventsViewProps) {
    const { success, error: showError } = useToast();
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loadingTickets, setLoadingTickets] = useState(false);
    const [rsvps, setRSVPs] = useState<any[]>([]);
    const [loadingRSVPs, setLoadingRSVPs] = useState(false);
    const [rsvpsActive, setRSVPsActive] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<Partial<CalendarEvent>>({
        ticket_tiers: [],
        settings: {
            show_remaining_capacity: true
        },
        price_scaling_trigger: 0,
        price_increment_percent: 0,
        is_promoted: false,
        promotion_banner_url: '',
        promotion_tagline: ''
    });
    const [activeView, setActiveView] = useState<'list' | 'calendar'>('list');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'published' | 'draft' | 'cancelled'>('all');

    // Announcement state
    const [announcingEvent, setAnnouncingEvent] = useState<CalendarEvent | null>(null);
    const [announcementDraft, setAnnouncementDraft] = useState({ subject: '', customMessage: '' });
    const [sendingAnnouncement, setSendingAnnouncement] = useState(false);

    const filteredEvents = events.filter(e => statusFilter === 'all' || e.status === statusFilter);

    useEffect(() => {
        loadEvents();
    }, []);

    useEffect(() => {
        if (selectedEvent && !isEditing) {
            loadTickets(selectedEvent.id);
            loadRSVPs(selectedEvent.id);
        }
    }, [selectedEvent, isEditing]);

    const loadEvents = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .order('event_date', { ascending: true });

            if (error) throw error;
            setEvents(data || []);
        } catch (err: any) {
            console.error('Error loading events:', err);
            showError('Failed to load events');
        } finally {
            setLoading(false);
        }
    };

    const loadTickets = async (eventId: string) => {
        setLoadingTickets(true);
        try {
            const { data, error } = await supabase
                .from('event_tickets')
                .select('*')
                .eq('event_id', eventId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTickets(data || []);
        } catch (err: any) {
            console.error('Error loading tickets:', err);
            showError('Failed to load tickets');
        } finally {
            setLoadingTickets(false);
        }
    };

    const loadRSVPs = async (eventId: string) => {
        setLoadingRSVPs(true);
        try {
            const { data, error } = await supabase
                .from('event_rsvps')
                .select('*')
                .eq('event_id', eventId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRSVPs(data || []);
        } catch (err: any) {
            console.error('Error loading RSVPs:', err);
            showError('Failed to load RSVPs');
        } finally {
            setLoadingRSVPs(false);
        }
    };

    const handleSaveEvent = async () => {
        try {
            if (!editForm.title || !editForm.event_date) {
                showError('Title and Date are required');
                return;
            }

            const eventData = {
                title: editForm.title,
                description: editForm.description,
                event_date: editForm.event_date,
                location: editForm.location,
                price_cents: editForm.price_cents || 0,
                capacity: editForm.capacity,
                image_url: editForm.image_url,
                status: editForm.status || 'draft',
                ticket_tiers: editForm.ticket_tiers || [],
                settings: editForm.settings || {},
                price_scaling_trigger: editForm.price_scaling_trigger || 0,
                price_increment_percent: editForm.price_increment_percent || 0,
                owner_id: (await supabase.auth.getUser()).data.user?.id
            };

            let error;
            let currentEventId = selectedEvent?.id;
            const isNewPublish = eventData.status === 'published' && (!selectedEvent || selectedEvent.status !== 'published');

            if (selectedEvent && selectedEvent.id) {
                // Update
                const { error: updateError } = await supabase
                    .from('events')
                    .update(eventData)
                    .eq('id', selectedEvent.id);
                error = updateError;
            } else {
                // Create
                const { data, error: insertError } = await supabase
                    .from('events')
                    .insert(eventData)
                    .select()
                    .single();
                error = insertError;
                if (data) currentEventId = data.id;
            }

            if (error) throw error;

            success('Event saved successfully');

            if (isNewPublish && currentEventId) {
                // Find event to announce
                const evToAnnounce = eventData as any;
                evToAnnounce.id = currentEventId;
                openAnnouncementDraft(evToAnnounce);
            }

            setIsEditing(false);
            setSelectedEvent(null);
            setEditForm({
                ticket_tiers: [],
                settings: { show_remaining_capacity: true },
                price_scaling_trigger: 0,
                price_increment_percent: 0,
                is_promoted: false,
                promotion_banner_url: '',
                promotion_tagline: ''
            });
            loadEvents();
        } catch (err: any) {
            console.error('Error saving event:', err);
            showError(err.message || 'Failed to save event');
        }
    };

    const openAnnouncementDraft = (event: CalendarEvent) => {
        setAnnouncingEvent(event);
        setAnnouncementDraft({
            subject: `New Event: ${event.title}`,
            customMessage: `We just posted a new event: ${event.title}. It will be on ${formatDisplayDate(event.event_date)} at ${event.location}.`
        });
    };

    const sendAnnouncement = async () => {
        if (!announcingEvent) return;
        setSendingAnnouncement(true);
        try {
            const event = announcingEvent;
            const eventDateStr = formatDisplayDate(event.event_date);

            let messageHtml = '';
            if (announcementDraft.customMessage) {
                messageHtml = `<p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">${announcementDraft.customMessage.replace(/\n/g, '<br/>')}</p>`;
            }

            const contentHtml = `
                <div style="font-family: Arial, sans-serif; color: #ffffff; text-align: left; padding: 20px;">
                    ${messageHtml}
                    <div style="background-color: #111111; padding: 20px; border: 1px solid #333333;">
                        <h2 style="font-size: 24px; font-weight: bold; margin-bottom: 20px;">${event.title}</h2>
                        ${event.image_url ? `<img src="${event.image_url}" alt="Event Image" style="max-width: 100%; border-radius: 0; margin-bottom: 20px;" />` : ''}
                        <p style="font-size: 16px; margin-bottom: 10px;"><strong>When:</strong> ${eventDateStr}</p>
                        <p style="font-size: 16px; margin-bottom: 20px;"><strong>Where:</strong> ${event.location}</p>
                        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px;">${event.description?.replace(/\n/g, '<br/>') || ''}</p>
                        <a href="https://www.thelostandunfounds.com/events#${event.id}" style="display: inline-block; background-color: #ffffff; color: #000000; padding: 12px 24px; text-decoration: none; font-weight: bold; font-size: 16px;">View Event Details</a>
                    </div>
                </div>
            `;

            const response = await fetch('/api/newsletter/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject: announcementDraft.subject,
                    content: announcementDraft.customMessage || `New event: ${event.title}`,
                    contentHtml
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to send announcement');
            }

            success('Event announced to mailing list!');
            setAnnouncingEvent(null);
        } catch (err: any) {
            console.error('Announce error:', err);
            showError('Failed to announce to mailing list: ' + err.message);
        } finally {
            setSendingAnnouncement(false);
        }
    };

    const handleDeleteEvent = async (id: string) => {
        if (!confirm('Are you sure you want to delete this event? This cannot be undone.')) return;

        try {
            const { error } = await supabase.from('events').delete().eq('id', id);
            if (error) throw error;
            success('Event deleted');
            loadEvents();
            if (selectedEvent?.id === id) setSelectedEvent(null);
        } catch (err: any) {
            showError('Failed to delete event');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'published': return 'text-green-400 bg-green-500/10';
            case 'draft': return 'text-yellow-400 bg-yellow-500/10';
            case 'cancelled': return 'text-red-400 bg-red-500/10';
            case 'pending': return 'text-blue-400 bg-blue-500/10';
            default: return 'text-white/40 bg-white/5';
        }
    };

    if (loading) {
        return <LoadingOverlay message="Loading Events" />;
    }

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
                <button onClick={onBack} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
                    <ArrowLeftIcon className="w-4 h-4" />
                    Back to Dashboard
                </button>
                <div className="flex items-center gap-3">
                    <div className="flex bg-white/5 p-1 rounded-none mr-2">
                        <button
                            onClick={() => setActiveView('list')}
                            className={cn(
                                "p-2 rounded-none transition-all",
                                activeView === 'list' ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white"
                            )}
                            title="List View"
                        >
                            <Bars3Icon className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setActiveView('calendar')}
                            className={cn(
                                "p-2 rounded-none transition-all",
                                activeView === 'calendar' ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white"
                            )}
                            title="Calendar View"
                        >
                            <CalendarIcon className="w-4 h-4" />
                        </button>
                    </div>

                    {!isEditing && !selectedEvent && (
                        <button
                            onClick={() => {
                                setEditForm({ status: 'draft', price_cents: 0 });
                                setSelectedEvent({} as CalendarEvent); // Placeholder for new
                                setIsEditing(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-black font-bold uppercase text-xs hover:bg-white/90 transition"
                        >
                            <PlusIcon className="w-4 h-4" />
                            Create Event
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                {activeView === 'calendar' && !isEditing && !selectedEvent ? (
                    <div className="h-full bg-black overflow-hidden">
                        <CustomFullCalendar
                            events={events.map(e => ({
                                id: e.id,
                                title: e.title,
                                start: new Date(e.event_date),
                                end: new Date(new Date(e.event_date).getTime() + 2 * 60 * 60 * 1000), // Default 2 hours
                                className: getStatusColor(e.status),
                                color: e.status === 'published' ? '#4ade80' : e.status === 'draft' ? '#fbbf24' : '#f87171'
                            }))}
                            onEventClick={(e) => {
                                const fullEvent = events.find(ev => ev.id === e.id);
                                if (fullEvent) setSelectedEvent(fullEvent);
                            }}
                            onDateSelect={(date) => {
                                setEditForm({
                                    title: '',
                                    description: '',
                                    event_date: date.toISOString().slice(0, 16),
                                    location: '',
                                    price_cents: 0,
                                    capacity: undefined,
                                    image_url: '',
                                    status: 'draft',
                                    ticket_tiers: [],
                                    settings: {
                                        show_remaining_capacity: true,
                                        pricing_format: 'tickets'
                                    }
                                });
                                setSelectedEvent({} as CalendarEvent);
                                setIsEditing(true);
                            }}
                        />
                    </div>
                ) : (
                    <div className="flex-1 bg-black flex h-full overflow-hidden rounded-none">
                        {/* Events List */}
                        <div className={(selectedEvent || isEditing) ? 'hidden' : 'flex w-full md:w-1/3 flex-col bg-black rounded-none overflow-hidden'}>
                            <div className="p-4 bg-black border-b border-white/10">
                                <div className="flex items-center justify-between mb-3">
                                    <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                                        <CalendarIcon className="w-4 h-4" />
                                        Events
                                    </h2>
                                    <span className="text-[10px] font-mono text-white/40">{filteredEvents.length} TOTAL</span>
                                </div>
                                {/* Filters */}
                                <div className="flex flex-wrap gap-2">
                                    {['all', 'pending', 'published', 'draft'].map((status) => (
                                        <button
                                            key={status}
                                            onClick={() => setStatusFilter(status as any)}
                                            className={cn(
                                                "px-2 py-1 text-[10px] uppercase font-black tracking-widest transition-colors",
                                                statusFilter === status
                                                    ? "bg-white text-black"
                                                    : "bg-white/5 text-white/40 hover:text-white"
                                            )}
                                        >
                                            {status}
                                            {status === 'pending' && events.some(e => e.status === 'pending') && (
                                                <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                {loading ? (
                                    <div className="p-12 flex flex-col items-center justify-center text-white/20 gap-4">
                                        <LoadingSpinner size="sm" className="text-white" />
                                        <div className="text-[10px] font-mono uppercase tracking-widest">Loading...</div>
                                    </div>
                                ) : filteredEvents.length === 0 ? (
                                    <div className="p-12 flex flex-col items-center justify-center text-white/20 gap-4 m-2">
                                        <CalendarIcon className="w-8 h-8 opacity-20" />
                                        <div className="text-[10px] font-mono uppercase tracking-widest">No events found</div>
                                    </div>
                                ) : (
                                    filteredEvents.map(event => (
                                        <div
                                            key={event.id}
                                            onClick={() => {
                                                setSelectedEvent(event);
                                                setIsEditing(false);
                                                setEditForm({
                                                    ...event,
                                                    ticket_tiers: event.ticket_tiers || [],
                                                    settings: event.settings || { show_remaining_capacity: true },
                                                    price_scaling_trigger: event.price_scaling_trigger || 0,
                                                    price_increment_percent: event.price_increment_percent || 0
                                                });
                                            }}
                                            className={cn(
                                                "p-4 cursor-pointer rounded-none hover:bg-white/10 transition-all text-left group mb-2 mx-2",
                                                selectedEvent?.id === event.id ? "bg-white/10 shadow-lg" : "bg-black"
                                            )}
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <span className={cn(
                                                    "text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 border",
                                                    getStatusColor(event.status)
                                                )}>
                                                    {event.status}
                                                </span>
                                                <span className="text-[10px] text-white/30 font-mono">
                                                    {new Date(event.event_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                </span>
                                            </div>
                                            <h3 className="text-sm font-bold text-white mb-2 leading-tight group-hover:text-white/90">{event.title}</h3>
                                            <div className="flex items-center gap-3 text-[10px] font-mono text-white/50 uppercase tracking-wide">
                                                <span className="flex items-center gap-1.5">
                                                    <MapPinIcon className="w-3 h-3" />
                                                    {event.location || 'TBD'}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <TicketIcon className="w-3 h-3" />
                                                    {event.price_cents > 0 ? `$${(event.price_cents / 100).toFixed(2)}` : 'FREE'}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Editor / Details */}
                        <div className={`${(selectedEvent || isEditing) ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-black`}>
                            {(selectedEvent || isEditing) ? (
                                isEditing ? (
                                    // Edit Form
                                    <div className="p-6 overflow-y-auto">
                                        <div className="flex items-center justify-between mb-8 pb-4">
                                            <h2 className="text-xl font-black text-white uppercase tracking-tighter">
                                                {selectedEvent?.id ? 'Edit Event' : 'New Event'}
                                            </h2>
                                            <button
                                                onClick={() => {
                                                    setIsEditing(false);
                                                    if (!selectedEvent?.id) setSelectedEvent(null);
                                                }}
                                                className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>

                                        <div className="space-y-4 max-w-4xl">
                                            <div>
                                                <label className="block text-[10px] uppercase font-black tracking-[0.2em] text-white/40 mb-2">Title</label>
                                                <input
                                                    type="text"
                                                    className="w-full bg-black hover:bg-white/10 p-3 rounded-none text-white text-sm font-mono focus:bg-white/10 focus:outline-none transition-colors"
                                                    value={editForm.title || ''}
                                                    onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                                                    placeholder="Event Title"
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                                                <div>
                                                    <label className="block text-[10px] uppercase font-black tracking-[0.2em] text-white/40 mb-1">Date & Time</label>
                                                    <EventDateTimePicker
                                                        value={editForm.event_date || ''}
                                                        onChange={(val) => setEditForm({ ...editForm, event_date: val })}
                                                    />
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                                                    <div>
                                                        <div className="flex items-center gap-1.5 mb-1">
                                                            <label className="block text-[10px] uppercase font-black tracking-[0.2em] text-white/40">Pricing Format</label>
                                                            <Tooltip content="Select how attendees will register or pay for this event.">
                                                                <InformationCircleIcon className="w-3 h-3 text-white/20 hover:text-white/40 transition-colors" />
                                                            </Tooltip>
                                                        </div>
                                                        <select
                                                            className="w-full bg-black hover:bg-white/10 p-3 rounded-none text-white text-sm font-mono focus:bg-white/10 focus:outline-none appearance-none transition-colors uppercase leading-tight"
                                                            value={editForm.settings?.pricing_format || 'tickets'}
                                                            onChange={e => {
                                                                const format = e.target.value as any;
                                                                setEditForm({
                                                                    ...editForm,
                                                                    settings: { ...editForm.settings, pricing_format: format },
                                                                    price_cents: (format === 'rsvp' || format === 'open') ? 0 : editForm.price_cents
                                                                });
                                                            }}
                                                        >
                                                            <option value="tickets">Tickets</option>
                                                            <option value="rsvp">RSVP (Free)</option>
                                                            <option value="external">External Link</option>
                                                            <option value="open">Open Admission</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] uppercase font-black tracking-[0.2em] text-white/40 mb-1">Status</label>
                                                        <select
                                                            className="w-full bg-black hover:bg-white/10 p-3 rounded-none text-white text-sm font-mono focus:bg-white/10 focus:outline-none appearance-none transition-colors uppercase leading-tight"
                                                            value={editForm.status || 'draft'}
                                                            onChange={e => setEditForm({ ...editForm, status: e.target.value as any })}
                                                        >
                                                            <option value="draft">Draft</option>
                                                            <option value="pending">Pending</option>
                                                            <option value="published">Published</option>
                                                            <option value="cancelled">Cancelled</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                {editForm.settings?.pricing_format === 'external' && (
                                                    <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                                                        <div className="flex items-center gap-1.5 mb-1">
                                                            <label className="block text-[10px] uppercase font-black tracking-[0.2em] text-white/40">External Ticket/Event URL</label>
                                                            <Tooltip content="Paste the link to the external platform (e.g. Eventbrite, Resident Advisor) where attendees should register.">
                                                                <InformationCircleIcon className="w-3 h-3 text-white/20 hover:text-white/40 transition-colors" />
                                                            </Tooltip>
                                                        </div>
                                                        <input
                                                            type="url"
                                                            className="w-full bg-black hover:bg-white/10 p-3 rounded-none text-white text-sm font-mono focus:bg-white/10 focus:outline-none transition-colors"
                                                            value={editForm.settings?.external_url || ''}
                                                            onChange={e => setEditForm({
                                                                ...editForm,
                                                                settings: { ...editForm.settings, external_url: e.target.value }
                                                            })}
                                                            placeholder="https://..."
                                                            required
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-2">
                                                <div className="md:col-span-2">
                                                    <label className="block text-[10px] uppercase font-black tracking-[0.2em] text-white/40 mb-1">Location</label>
                                                    <input
                                                        type="text"
                                                        className="w-full bg-black hover:bg-white/10 p-3 rounded-none text-white text-sm font-mono focus:bg-white/10 focus:outline-none transition-colors"
                                                        value={editForm.location || ''}
                                                        onChange={e => setEditForm({ ...editForm, location: e.target.value })}
                                                        placeholder="Venue or Address"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] uppercase font-black tracking-[0.2em] text-white/40 mb-1">Image URL</label>
                                                    <input
                                                        type="text"
                                                        className="w-full bg-black hover:bg-white/10 p-3 rounded-none text-white text-sm font-mono focus:bg-white/10 focus:outline-none transition-colors"
                                                        value={editForm.image_url || ''}
                                                        onChange={e => setEditForm({ ...editForm, image_url: e.target.value })}
                                                        placeholder="https://..."
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                                                {(editForm.settings?.pricing_format === 'tickets' || !editForm.settings?.pricing_format) && (
                                                    <div className="animate-in fade-in duration-200">
                                                        <label className="block text-[10px] uppercase font-black tracking-[0.2em] text-white/40 mb-1">Price ($ USD)</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            className="w-full bg-black hover:bg-white/10 p-3 rounded-none text-white text-sm font-mono focus:bg-white/10 focus:outline-none transition-colors"
                                                            value={editForm.price_cents ? (editForm.price_cents / 100).toFixed(2) : ''}
                                                            onChange={e => {
                                                                const val = parseFloat(e.target.value);
                                                                setEditForm({ ...editForm, price_cents: isNaN(val) ? 0 : Math.round(val * 100) });
                                                            }}
                                                            placeholder="0.00"
                                                        />
                                                    </div>
                                                )}
                                                {editForm.settings?.pricing_format !== 'open' && (
                                                    <div className="animate-in fade-in duration-200">
                                                        <label className="block text-[10px] uppercase font-black tracking-[0.2em] text-white/40 mb-1">Capacity</label>
                                                        <input
                                                            type="number"
                                                            className="w-full bg-black hover:bg-white/10 p-3 rounded-none text-white text-sm font-mono focus:bg-white/10 focus:outline-none transition-colors"
                                                            value={editForm.capacity || ''}
                                                            onChange={e => setEditForm({ ...editForm, capacity: e.target.value ? parseInt(e.target.value) : undefined })}
                                                            placeholder="Unlimited"
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-[10px] uppercase font-black tracking-[0.2em] text-white/40 mb-2">Description</label>
                                                <textarea
                                                    className="w-full h-32 bg-black hover:bg-white/10 p-3 rounded-none text-white text-sm font-mono focus:bg-white/10 focus:outline-none resize-none transition-colors"
                                                    value={editForm.description || ''}
                                                    onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                                />
                                            </div>

                                            {(editForm.settings?.pricing_format === 'tickets' || !editForm.settings?.pricing_format) && (
                                                <div className="space-y-4 pt-4 border-t border-white/10 text-left animate-in fade-in duration-300">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="text-[10px] uppercase font-black tracking-[0.2em] text-white">Ticket Tiers</h4>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const tiers = [...(editForm.ticket_tiers || [])];
                                                                tiers.push({
                                                                    id: Math.random().toString(36).substr(2, 9),
                                                                    name: '',
                                                                    price_cents: 0,
                                                                    capacity: undefined
                                                                });
                                                                setEditForm({ ...editForm, ticket_tiers: tiers });
                                                            }}
                                                            className="text-[10px] font-black uppercase tracking-widest text-white hover:text-white/70 transition-colors flex items-center gap-2"
                                                        >
                                                            <PlusIcon className="w-3 h-3" />
                                                            Add Tier
                                                        </button>
                                                    </div>

                                                    {(editForm.ticket_tiers || []).length === 0 ? (
                                                        <div className="text-[10px] font-mono text-white/20 uppercase tracking-widest text-center py-4 border border-dashed border-white/5">
                                                            No custom tiers defined. Uses base price.
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            {(editForm.ticket_tiers || []).map((tier, idx) => (
                                                                <div key={tier.id} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end bg-white/5 p-3 rounded-none group">
                                                                    <div className="md:col-span-2">
                                                                        <label className="block text-[8px] uppercase font-black tracking-widest text-white/30 mb-1 leading-none">Tier Name</label>
                                                                        <input
                                                                            type="text"
                                                                            className="w-full bg-black p-2 text-xs font-mono text-white rounded-none border-b border-white/10 focus:border-white focus:outline-none transition-colors"
                                                                            value={tier.name}
                                                                            onChange={e => {
                                                                                const tiers = [...(editForm.ticket_tiers || [])];
                                                                                tiers[idx].name = e.target.value;
                                                                                setEditForm({ ...editForm, ticket_tiers: tiers });
                                                                            }}
                                                                            placeholder="e.g. Early Bird, VIP"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-[8px] uppercase font-black tracking-widest text-white/30 mb-1 leading-none">Price ($)</label>
                                                                        <input
                                                                            type="number"
                                                                            step="0.01"
                                                                            className="w-full bg-black p-2 text-xs font-mono text-white rounded-none border-b border-white/10 focus:border-white focus:outline-none transition-colors"
                                                                            value={tier.price_cents / 100}
                                                                            onChange={e => {
                                                                                const tiers = [...(editForm.ticket_tiers || [])];
                                                                                tiers[idx].price_cents = Math.round(parseFloat(e.target.value) * 100);
                                                                                setEditForm({ ...editForm, ticket_tiers: tiers });
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="flex-1">
                                                                            <label className="block text-[8px] uppercase font-black tracking-widest text-white/30 mb-1 leading-none">Cap</label>
                                                                            <input
                                                                                type="number"
                                                                                className="w-full bg-black p-2 text-xs font-mono text-white rounded-none border-b border-white/10 focus:border-white focus:outline-none transition-colors"
                                                                                value={tier.capacity || ''}
                                                                                onChange={e => {
                                                                                    const tiers = [...(editForm.ticket_tiers || [])];
                                                                                    tiers[idx].capacity = e.target.value ? parseInt(e.target.value) : undefined;
                                                                                    setEditForm({ ...editForm, ticket_tiers: tiers });
                                                                                }}
                                                                                placeholder="∞"
                                                                            />
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                const tiers = [...(editForm.ticket_tiers || [])];
                                                                                tiers.splice(idx, 1);
                                                                                setEditForm({ ...editForm, ticket_tiers: tiers });
                                                                            }}
                                                                            className="p-2 text-white/20 hover:text-red-500 transition-colors"
                                                                        >
                                                                            <TrashIcon className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Advanced Settings Section */}
                                            <div className="space-y-4 pt-4 border-t border-white/10 text-left">
                                                <h4 className="text-[10px] uppercase font-black tracking-[0.2em] text-white">Advanced Settings</h4>

                                                {/* Promotion Settings */}
                                                <div className="grid grid-cols-1 gap-4 p-3 bg-white/5 border border-white/10 mb-4">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-white/60">Promote on Banner</label>
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditForm({ ...editForm, is_promoted: !editForm.is_promoted })}
                                                            className={cn(
                                                                "w-12 h-6 transition-colors border border-white/20 relative",
                                                                editForm.is_promoted ? "bg-white" : "bg-black"
                                                            )}
                                                        >
                                                            <div className={cn(
                                                                "absolute top-1 w-4 h-4 transition-all",
                                                                editForm.is_promoted ? "right-1 bg-black" : "left-1 bg-white"
                                                            )} />
                                                        </button>
                                                    </div>

                                                    {editForm.is_promoted && (
                                                        <>
                                                            <div className="space-y-1 text-left">
                                                                <label className="text-[8px] font-black uppercase tracking-widest text-white/40">Promotion Tagline</label>
                                                                <input
                                                                    type="text"
                                                                    value={editForm.promotion_tagline || ''}
                                                                    onChange={(e) => setEditForm({ ...editForm, promotion_tagline: e.target.value })}
                                                                    placeholder="e.g. JOIN US FOR AN EXCLUSIVE NIGHT"
                                                                    className="w-full bg-black border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:border-white transition-colors uppercase tracking-widest"
                                                                />
                                                            </div>
                                                            <div className="space-y-1 text-left">
                                                                <label className="text-[8px] font-black uppercase tracking-widest text-white/40">Banner Image URL (Optional)</label>
                                                                <input
                                                                    type="text"
                                                                    value={editForm.promotion_banner_url || ''}
                                                                    onChange={(e) => setEditForm({ ...editForm, promotion_banner_url: e.target.value })}
                                                                    placeholder="https://..."
                                                                    className="w-full bg-black border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:border-white transition-colors"
                                                                />
                                                            </div>
                                                        </>
                                                    )}
                                                </div>

                                                {/* Pricing Escalation */}
                                                {(editForm.settings?.pricing_format === 'tickets' || !editForm.settings?.pricing_format) && (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/5 p-4 rounded-none animate-in fade-in duration-300">
                                                        <div>
                                                            <label className="block text-[8px] uppercase font-black tracking-widest text-white/30 mb-1 leading-none">Price Escalation Increment (%)</label>
                                                            <input
                                                                type="number"
                                                                step="0.1"
                                                                className="w-full bg-black p-2 text-xs font-mono text-white rounded-none border-b border-white/10 focus:border-white focus:outline-none transition-colors"
                                                                value={editForm.price_increment_percent || 0}
                                                                onChange={e => setEditForm({ ...editForm, price_increment_percent: parseFloat(e.target.value) })}
                                                                placeholder="e.g. 5.0"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[8px] uppercase font-black tracking-widest text-white/30 mb-1 leading-none">Increase every N tickets</label>
                                                            <input
                                                                type="number"
                                                                className="w-full bg-black p-2 text-xs font-mono text-white rounded-none border-b border-white/10 focus:border-white focus:outline-none transition-colors"
                                                                value={editForm.price_scaling_trigger || 0}
                                                                onChange={e => setEditForm({ ...editForm, price_scaling_trigger: parseInt(e.target.value) })}
                                                                placeholder="e.g. 10"
                                                            />
                                                        </div>
                                                        <div className="md:col-span-2">
                                                            <p className="text-[9px] text-white/40 font-mono uppercase tracking-wide">
                                                                Smart pricing: increases base price by {editForm.price_increment_percent}% every {editForm.price_scaling_trigger} tickets sold.
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Registration Form Builder */}
                                                <div className="space-y-4 pt-4 border-t border-white/10 text-left animate-in fade-in duration-300">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="text-[10px] uppercase font-black tracking-[0.2em] text-white">Registration Form Fields</h4>
                                                            <Tooltip content="Add custom fields to collect specific information from attendees during registration.">
                                                                <InformationCircleIcon className="w-3 h-3 text-white/20 hover:text-white/40 transition-colors" />
                                                            </Tooltip>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const fields = [...(editForm.settings?.custom_form || [])];
                                                                fields.push({
                                                                    id: Math.random().toString(36).substr(2, 9),
                                                                    label: '',
                                                                    type: 'text',
                                                                    required: false
                                                                });
                                                                setEditForm({
                                                                    ...editForm,
                                                                    settings: { ...editForm.settings, custom_form: fields }
                                                                });
                                                            }}
                                                            className="text-[10px] font-black uppercase tracking-widest text-white hover:text-white/70 transition-colors flex items-center gap-2"
                                                        >
                                                            <PlusIcon className="w-3 h-3" />
                                                            Add Field
                                                        </button>
                                                    </div>

                                                    {(editForm.settings?.custom_form || []).length === 0 ? (
                                                        <div className="text-[10px] font-mono text-white/20 uppercase tracking-widest text-center py-4 border border-dashed border-white/5">
                                                            No custom form fields. Only email/name collected.
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            {(editForm.settings?.custom_form || []).map((field, idx) => (
                                                                <div key={field.id} className="bg-white/5 p-4 rounded-none group border border-white/5 space-y-3">
                                                                    <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                                                                        <div className="md:col-span-3">
                                                                            <label className="block text-[8px] uppercase font-black tracking-widest text-white/30 mb-1 leading-none">Field Label</label>
                                                                            <input
                                                                                type="text"
                                                                                className="w-full bg-black p-2 text-xs font-mono text-white rounded-none border-b border-white/10 focus:border-white focus:outline-none transition-colors"
                                                                                value={field.label}
                                                                                onChange={e => {
                                                                                    const fields = [...(editForm.settings?.custom_form || [])];
                                                                                    fields[idx].label = e.target.value;
                                                                                    setEditForm({ ...editForm, settings: { ...editForm.settings, custom_form: fields } });
                                                                                }}
                                                                                placeholder="e.g. Dietary Restrictions, Portfolio Link"
                                                                            />
                                                                        </div>
                                                                        <div className="md:col-span-2">
                                                                            <label className="block text-[8px] uppercase font-black tracking-widest text-white/30 mb-1 leading-none">Type</label>
                                                                            <select
                                                                                className="w-full bg-black p-2 text-xs font-mono text-white rounded-none border-b border-white/10 focus:border-white focus:outline-none transition-colors uppercase"
                                                                                value={field.type}
                                                                                onChange={e => {
                                                                                    const fields = [...(editForm.settings?.custom_form || [])];
                                                                                    fields[idx].type = e.target.value as any;
                                                                                    setEditForm({ ...editForm, settings: { ...editForm.settings, custom_form: fields } });
                                                                                }}
                                                                            >
                                                                                <option value="text">Short Text</option>
                                                                                <option value="textarea">Long Text</option>
                                                                                <option value="select">Dropdown</option>
                                                                                <option value="checkbox">Checkbox</option>
                                                                            </select>
                                                                        </div>
                                                                        <div className="flex items-center justify-between gap-4">
                                                                            <label className="flex items-center gap-2 cursor-pointer group/req">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    className="sr-only"
                                                                                    checked={field.required}
                                                                                    onChange={e => {
                                                                                        const fields = [...(editForm.settings?.custom_form || [])];
                                                                                        fields[idx].required = e.target.checked;
                                                                                        setEditForm({ ...editForm, settings: { ...editForm.settings, custom_form: fields } });
                                                                                    }}
                                                                                />
                                                                                <div className={cn(
                                                                                    "w-4 h-4 border flex items-center justify-center transition-colors",
                                                                                    field.required ? "bg-white border-white" : "bg-black border-white/20 group-hover/req:border-white/40"
                                                                                )}>
                                                                                    {field.required && <CheckCircleIconOutline className="w-3 h-3 text-black" />}
                                                                                </div>
                                                                                <span className="text-[8px] uppercase font-black tracking-widest text-white/40">Req</span>
                                                                            </label>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    const fields = [...(editForm.settings?.custom_form || [])];
                                                                                    fields.splice(idx, 1);
                                                                                    setEditForm({ ...editForm, settings: { ...editForm.settings, custom_form: fields } });
                                                                                }}
                                                                                className="p-2 text-white/20 hover:text-red-500 transition-colors"
                                                                            >
                                                                                <TrashIcon className="w-4 h-4" />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                    {field.type === 'select' && (
                                                                        <div className="pl-4 border-l border-white/10 space-y-2 animate-in slide-in-from-left-2 duration-300">
                                                                            <label className="block text-[8px] uppercase font-black tracking-widest text-white/30 mb-1 leading-none">Options (one per line)</label>
                                                                            <textarea
                                                                                className="w-full bg-black p-2 text-xs font-mono text-white rounded-none border-b border-white/10 focus:border-white focus:outline-none transition-colors min-h-[60px]"
                                                                                value={field.options?.join('\n') || ''}
                                                                                onChange={e => {
                                                                                    const fields = [...(editForm.settings?.custom_form || [])];
                                                                                    fields[idx].options = e.target.value.split('\n').filter(opt => opt.trim());
                                                                                    setEditForm({ ...editForm, settings: { ...editForm.settings, custom_form: fields } });
                                                                                }}
                                                                                placeholder="Option 1&#10;Option 2"
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-[8px] uppercase font-black tracking-widest text-white/30 mb-1 leading-none">Early Bird Deadline</label>
                                                        <input
                                                            type="datetime-local"
                                                            className="w-full bg-black p-2 text-xs font-mono text-white rounded-none border-b border-white/10 focus:border-white focus:outline-none transition-colors"
                                                            value={editForm.settings?.early_bird_deadline || ''}
                                                            onChange={e => setEditForm({
                                                                ...editForm,
                                                                settings: { ...editForm.settings, early_bird_deadline: e.target.value }
                                                            })}
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2 h-full pt-4">
                                                        <input
                                                            type="checkbox"
                                                            id="show_remaining"
                                                            className="w-4 h-4 bg-black border border-white/20 rounded-none checked:bg-white checked:border-white transition-all cursor-pointer"
                                                            checked={editForm.settings?.show_remaining_capacity ?? true}
                                                            onChange={e => setEditForm({
                                                                ...editForm,
                                                                settings: { ...editForm.settings, show_remaining_capacity: e.target.checked }
                                                            })}
                                                        />
                                                        <label htmlFor="show_remaining" className="text-[10px] uppercase font-black tracking-widest text-white/50 cursor-pointer">Show Remaining Capacity</label>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-[8px] uppercase font-black tracking-widest text-white/30 mb-1 leading-none">Refund Policy</label>
                                                    <input
                                                        type="text"
                                                        className="w-full bg-black p-2 text-xs font-mono text-white rounded-none border-b border-white/10 focus:border-white focus:outline-none transition-colors"
                                                        value={editForm.settings?.refund_policy || ''}
                                                        onChange={e => setEditForm({
                                                            ...editForm,
                                                            settings: { ...editForm.settings, refund_policy: e.target.value }
                                                        })}
                                                        placeholder="e.g. Non-refundable"
                                                    />
                                                </div>
                                            </div>

                                            <div className="pt-4 flex gap-4">
                                                <button
                                                    onClick={handleSaveEvent}
                                                    className="px-6 py-3 bg-white text-black font-bold uppercase text-xs hover:bg-white/90 transition"
                                                >
                                                    Save Event
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    // View Details
                                    <div className="flex flex-col h-full bg-black">
                                        {/* Header */}
                                        <div className="p-6 flex justify-between items-start bg-black rounded-none mb-4">
                                            <div>
                                                <div className="flex items-center gap-3 mb-2">
                                                    <button
                                                        onClick={() => setSelectedEvent(null)}
                                                        className="md:hidden text-white/60 hover:text-white"
                                                    >
                                                        <ArrowLeftIcon className="w-4 h-4" />
                                                    </button>
                                                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter">{selectedEvent!.title}</h2>
                                                    <span className={cn(
                                                        "text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 border",
                                                        getStatusColor(selectedEvent!.status)
                                                    )}>
                                                        {selectedEvent!.status}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-4 text-xs font-mono text-white/50 uppercase tracking-wide">
                                                    <span className="flex items-center gap-1.5">
                                                        <CalendarIcon className="w-4 h-4" />
                                                        {new Date(selectedEvent!.event_date).toLocaleString()}
                                                    </span>
                                                    <span className="flex items-center gap-1.5">
                                                        <MapPinIcon className="w-4 h-4" />
                                                        {selectedEvent!.location || 'TBD'}
                                                    </span>
                                                    <span className="flex items-center gap-1.5">
                                                        <CurrencyDollarIcon className="w-4 h-4" />
                                                        {selectedEvent!.price_cents > 0 ? `$${(selectedEvent!.price_cents / 100).toFixed(2)}` : 'FREE'}
                                                    </span>
                                                    {selectedEvent!.capacity && (
                                                        <span className="flex items-center gap-1.5">
                                                            <UsersIcon className="w-4 h-4" />
                                                            Capacity: {selectedEvent!.capacity}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                {selectedEvent!.status === 'pending' && (
                                                    <button
                                                        onClick={async () => {
                                                            try {
                                                                const { error } = await supabase.from('events').update({ status: 'published' }).eq('id', selectedEvent!.id);
                                                                if (error) throw error;
                                                                loadEvents();
                                                                const updatedEvent = { ...selectedEvent!, status: 'published' as const };
                                                                setSelectedEvent(updatedEvent);
                                                                openAnnouncementDraft(updatedEvent);
                                                            } catch (err) {
                                                                console.error("Failed to approve", err);
                                                            }
                                                        }}
                                                        className="p-2 hover:bg-green-500/10 text-green-400 hover:text-green-300 transition"
                                                        title="Approve & Publish"
                                                    >
                                                        <CheckCircleIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {selectedEvent!.status === 'published' && (
                                                    <button
                                                        onClick={() => openAnnouncementDraft(selectedEvent!)}
                                                        className="p-2 hover:bg-yellow-500/10 text-yellow-500 hover:text-yellow-400 transition"
                                                        title="Announce to Mailing List"
                                                    >
                                                        <MegaphoneIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => {
                                                        loadTickets(selectedEvent!.id);
                                                        loadRSVPs(selectedEvent!.id);
                                                    }}
                                                    className="p-2 hover:bg-white/10 text-white/60 hover:text-white transition"
                                                    title="Refresh Data"
                                                >
                                                    <ArrowPathIcon className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setEditForm(selectedEvent!);
                                                        setIsEditing(true);
                                                    }}
                                                    className="p-2 hover:bg-white/10 text-white/60 hover:text-white transition"
                                                    title="Edit"
                                                >
                                                    <PencilSquareIcon className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteEvent(selectedEvent!.id)}
                                                    className="p-2 hover:bg-red-500/10 text-red-400 hover:text-red-300 transition"
                                                    title={selectedEvent!.status === 'pending' ? 'Reject & Delete' : 'Delete'}
                                                >
                                                    {selectedEvent!.status === 'pending' ? <XCircleIcon className="w-4 h-4" /> : <TrashIcon className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Description */}
                                        {selectedEvent!.description && (
                                            <div className="p-6 bg-black rounded-none mb-4 mx-6 border border-white/10">
                                                <p className="text-white/80 leading-relaxed whitespace-pre-wrap text-sm">{selectedEvent!.description}</p>
                                            </div>
                                        )}

                                        {/* Stats Overview */}
                                        <div className="grid grid-cols-2 gap-4 px-6 mb-4">
                                            <div className="bg-white/5 p-4 border border-white/10">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Tickets Sold</div>
                                                <div className="text-2xl font-black text-white">{tickets.length} / {selectedEvent?.capacity || '∞'}</div>
                                            </div>
                                            <div className="bg-white/5 p-4 border border-white/10">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">RSVPs (Free)</div>
                                                <div className="text-2xl font-black text-white">{rsvps.length}</div>
                                            </div>
                                        </div>

                                        {/* Tabs for Tickets/RSVPs */}
                                        <div className="flex-1 flex flex-col p-6 overflow-hidden">
                                            <div className="flex border-b border-white/10 mb-4">
                                                <button
                                                    onClick={() => setRSVPsActive(false)}
                                                    className={cn(
                                                        "px-4 py-2 text-[10px] font-black uppercase tracking-widest border-b-2 transition-colors",
                                                        !rsvpsActive ? "border-white text-white" : "border-transparent text-white/40 hover:text-white"
                                                    )}
                                                >
                                                    Tickets ({tickets.length})
                                                </button>
                                                <button
                                                    onClick={() => setRSVPsActive(true)}
                                                    className={cn(
                                                        "px-4 py-2 text-[10px] font-black uppercase tracking-widest border-b-2 transition-colors",
                                                        rsvpsActive ? "border-white text-white" : "border-transparent text-white/40 hover:text-white"
                                                    )}
                                                >
                                                    RSVPs ({rsvps.length})
                                                </button>
                                            </div>

                                            <div className="flex-1 overflow-y-auto bg-black">
                                                {!rsvpsActive ? (
                                                    /* Tickets Table */
                                                    loadingTickets ? (
                                                        <div className="p-12 text-center text-[10px] font-mono uppercase tracking-widest text-white/40">Loading tickets...</div>
                                                    ) : tickets.length === 0 ? (
                                                        <div className="p-12 text-center text-[10px] font-mono uppercase tracking-widest text-white/40">No tickets sold yet</div>
                                                    ) : (
                                                        <table className="w-full text-left">
                                                            <thead className="bg-white/5 text-white/40 sticky top-0">
                                                                <tr>
                                                                    <th className="p-3 font-black uppercase text-[10px] tracking-widest">Status</th>
                                                                    <th className="p-3 font-black uppercase text-[10px] tracking-widest">Customer</th>
                                                                    <th className="p-3 font-black uppercase text-[10px] tracking-widest">Tier</th>
                                                                    <th className="p-3 font-black uppercase text-[10px] tracking-widest">Date</th>
                                                                    <th className="p-3 font-black uppercase text-[10px] tracking-widest text-right">Amount</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-white/5 text-sm font-mono text-left">
                                                                {tickets.map(ticket => (
                                                                    <tr key={ticket.id} className="hover:bg-white/5 transition-colors">
                                                                        <td className="p-3">
                                                                            <span className={cn(
                                                                                "text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 border",
                                                                                ticket.status === 'valid' ? "text-green-400 border-green-500/20 bg-green-500/10" :
                                                                                    ticket.status === 'used' ? "text-blue-400 border-blue-500/20 bg-blue-500/10" :
                                                                                        "text-red-400 border-red-500/20 bg-red-500/10"
                                                                            )}>
                                                                                {ticket.status}
                                                                            </span>
                                                                        </td>
                                                                        <td className="p-3">
                                                                            <div className="text-white font-bold text-xs uppercase tracking-wide">{ticket.customer_name || 'Guest'}</div>
                                                                            <div className="text-white/40 text-[10px]">{ticket.customer_email}</div>
                                                                        </td>
                                                                        <td className="p-3">
                                                                            <span className="text-[10px] font-mono text-white/60 uppercase">
                                                                                {selectedEvent?.ticket_tiers?.find(t => t.id === ticket.tier_id)?.name || 'Basic'}
                                                                            </span>
                                                                        </td>
                                                                        <td className="p-3 text-white/40 text-[10px]">
                                                                            {new Date(ticket.created_at).toLocaleDateString()}
                                                                        </td>
                                                                        <td className="p-3 text-right text-white/80">
                                                                            ${(ticket.purchase_amount_cents / 100).toFixed(2)}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    )
                                                ) : (
                                                    /* RSVPs Table */
                                                    loadingRSVPs ? (
                                                        <div className="p-12 text-center text-[10px] font-mono uppercase tracking-widest text-white/40">Loading RSVPs...</div>
                                                    ) : rsvps.length === 0 ? (
                                                        <div className="p-12 text-center text-[10px] font-mono uppercase tracking-widest text-white/40">No RSVPs yet</div>
                                                    ) : (
                                                        <table className="w-full text-left">
                                                            <thead className="bg-white/5 text-white/40 sticky top-0">
                                                                <tr>
                                                                    <th className="p-3 font-black uppercase text-[10px] tracking-widest">Name</th>
                                                                    <th className="p-3 font-black uppercase text-[10px] tracking-widest">Email</th>
                                                                    <th className="p-3 font-black uppercase text-[10px] tracking-widest text-right">Date</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-white/5 text-sm font-mono text-left">
                                                                {rsvps.map(rsvp => (
                                                                    <tr key={rsvp.id} className="hover:bg-white/5 transition-colors">
                                                                        <td className="p-3">
                                                                            <div className="text-white font-bold text-xs uppercase tracking-wide">{rsvp.name || 'Guest'}</div>
                                                                        </td>
                                                                        <td className="p-3 text-white/40 text-[10px]">
                                                                            {rsvp.email}
                                                                        </td>
                                                                        <td className="p-3 text-right text-white/40 text-[10px]">
                                                                            {new Date(rsvp.created_at).toLocaleDateString()}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-white/20 gap-4">
                                    <CalendarIcon className="w-16 h-16 opacity-20" />
                                    <div className="text-[10px] font-mono uppercase tracking-widest">Select an event to view details</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
