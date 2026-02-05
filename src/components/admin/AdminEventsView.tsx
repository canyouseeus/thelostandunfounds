
import { useState, useEffect } from 'react';
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
    CheckCircleIcon,
    XCircleIcon
} from '@heroicons/react/24/outline';
import { cn } from '../../components/ui/utils';

interface Event {
    id: string;
    title: string;
    description: string;
    event_date: string;
    location: string;
    price_cents: number;
    capacity: number;
    image_url: string;
    status: 'draft' | 'published' | 'cancelled';
    created_at: string;
}

interface Ticket {
    id: string;
    customer_email: string;
    customer_name: string;
    status: 'valid' | 'used' | 'void';
    purchase_amount_cents: number;
    created_at: string;
}

interface AdminEventsViewProps {
    onBack: () => void;
}

export default function AdminEventsView({ onBack }: AdminEventsViewProps) {
    const { success, error: showError } = useToast();
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loadingTickets, setLoadingTickets] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<Partial<Event>>({});

    useEffect(() => {
        loadEvents();
    }, []);

    useEffect(() => {
        if (selectedEvent && !isEditing) {
            loadTickets(selectedEvent.id);
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
                owner_id: (await supabase.auth.getUser()).data.user?.id
            };

            let error;
            if (selectedEvent && selectedEvent.id) {
                // Update
                const { error: updateError } = await supabase
                    .from('events')
                    .update(eventData)
                    .eq('id', selectedEvent.id);
                error = updateError;
            } else {
                // Create
                const { error: insertError } = await supabase
                    .from('events')
                    .insert(eventData);
                error = insertError;
            }

            if (error) throw error;

            success('Event saved successfully');
            setIsEditing(false);
            setSelectedEvent(null);
            setEditForm({});
            loadEvents();
        } catch (err: any) {
            console.error('Error saving event:', err);
            showError(err.message || 'Failed to save event');
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
            case 'published': return 'text-green-400 bg-green-500/10 border-green-500/20';
            case 'draft': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
            case 'cancelled': return 'text-red-400 bg-red-500/10 border-red-500/20';
            default: return 'text-white/40 bg-white/5 border-white/10';
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
                {!isEditing && !selectedEvent && (
                    <button
                        onClick={() => {
                            setEditForm({ status: 'draft', price_cents: 0 });
                            setSelectedEvent({} as Event); // Placeholder for new
                            setIsEditing(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-black font-bold uppercase text-xs hover:bg-white/90 transition"
                    >
                        <PlusIcon className="w-4 h-4" />
                        Create Event
                    </button>
                )}
            </div>

            <div className="flex-1 bg-black/50 border border-white/10 flex overflow-hidden">
                {/* Events List */}
                <div className={`${(selectedEvent || isEditing) ? 'hidden md:flex' : 'flex'} w-full md:w-1/3 flex-col border-r border-white/10`}>
                    <div className="p-4 border-b border-white/10 bg-black/40 flex items-center justify-between">
                        <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4" />
                            Events
                        </h2>
                        <span className="text-[10px] font-mono text-white/40">{events.length} TOTAL</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {loading ? (
                            <div className="p-12 flex flex-col items-center justify-center text-white/20 gap-4">
                                <LoadingSpinner size="sm" className="text-white" />
                                <div className="text-[10px] font-mono uppercase tracking-widest">Loading...</div>
                            </div>
                        ) : events.length === 0 ? (
                            <div className="p-12 flex flex-col items-center justify-center text-white/20 gap-4 border border-dashed border-white/10 m-2">
                                <CalendarIcon className="w-8 h-8 opacity-20" />
                                <div className="text-[10px] font-mono uppercase tracking-widest">No events found</div>
                            </div>
                        ) : (
                            events.map(event => (
                                <div
                                    key={event.id}
                                    onClick={() => {
                                        setSelectedEvent(event);
                                        setIsEditing(false);
                                        setEditForm(event);
                                    }}
                                    className={cn(
                                        "p-4 cursor-pointer border border-transparent hover:border-white/10 hover:bg-white/5 transition-all text-left group",
                                        selectedEvent?.id === event.id ? "bg-white/10 border-white/20" : "border-white/5 bg-black/20"
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
                                        <span className="w-px h-3 bg-white/10" />
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
                <div className={`${(selectedEvent || isEditing) ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-black/20`}>
                    {(selectedEvent || isEditing) ? (
                        isEditing ? (
                            // Edit Form
                            <div className="p-6 overflow-y-auto">
                                <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
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

                                <div className="space-y-4 max-w-2xl">
                                    <div>
                                        <label className="block text-[10px] uppercase font-black tracking-[0.2em] text-white/40 mb-2">Title</label>
                                        <input
                                            type="text"
                                            className="w-full bg-black/50 border border-white/10 p-3 text-white text-sm font-mono focus:border-white/40 focus:outline-none focus:bg-white/5 transition-colors"
                                            value={editForm.title || ''}
                                            onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                                            placeholder="Event Title"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] uppercase font-black tracking-[0.2em] text-white/40 mb-2">Date & Time</label>
                                            <input
                                                type="datetime-local"
                                                className="w-full bg-black/50 border border-white/10 p-3 text-white text-sm font-mono focus:border-white/40 focus:outline-none focus:bg-white/5 transition-colors"
                                                value={editForm.event_date ? new Date(editForm.event_date).toISOString().slice(0, 16) : ''}
                                                onChange={e => setEditForm({ ...editForm, event_date: new Date(e.target.value).toISOString() })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] uppercase font-black tracking-[0.2em] text-white/40 mb-2">Status</label>
                                            <select
                                                className="w-full bg-black/50 border border-white/10 p-3 text-white text-sm font-mono focus:border-white/40 focus:outline-none appearance-none focus:bg-white/5 transition-colors uppercase"
                                                value={editForm.status || 'draft'}
                                                onChange={e => setEditForm({ ...editForm, status: e.target.value as any })}
                                            >
                                                <option value="draft">Draft</option>
                                                <option value="published">Published</option>
                                                <option value="cancelled">Cancelled</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] uppercase font-black tracking-[0.2em] text-white/40 mb-2">Location</label>
                                        <input
                                            type="text"
                                            className="w-full bg-black/50 border border-white/10 p-3 text-white text-sm font-mono focus:border-white/40 focus:outline-none focus:bg-white/5 transition-colors"
                                            value={editForm.location || ''}
                                            onChange={e => setEditForm({ ...editForm, location: e.target.value })}
                                            placeholder="Venue or Address"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] uppercase font-black tracking-[0.2em] text-white/40 mb-2">Price (Cents)</label>
                                            <input
                                                type="number"
                                                className="w-full bg-black/50 border border-white/10 p-3 text-white text-sm font-mono focus:border-white/40 focus:outline-none focus:bg-white/5 transition-colors"
                                                value={editForm.price_cents || 0}
                                                onChange={e => setEditForm({ ...editForm, price_cents: parseInt(e.target.value) })}
                                            />
                                            <p className="text-[10px] font-mono text-white/30 mt-1">
                                                ${((editForm.price_cents || 0) / 100).toFixed(2)}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] uppercase font-black tracking-[0.2em] text-white/40 mb-2">Capacity</label>
                                            <input
                                                type="number"
                                                className="w-full bg-black/50 border border-white/10 p-3 text-white text-sm font-mono focus:border-white/40 focus:outline-none focus:bg-white/5 transition-colors"
                                                value={editForm.capacity || ''}
                                                onChange={e => setEditForm({ ...editForm, capacity: parseInt(e.target.value) })}
                                                placeholder="Unlimited"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] uppercase font-black tracking-[0.2em] text-white/40 mb-2">Image URL</label>
                                        <input
                                            type="text"
                                            className="w-full bg-black/50 border border-white/10 p-3 text-white text-sm font-mono focus:border-white/40 focus:outline-none focus:bg-white/5 transition-colors"
                                            value={editForm.image_url || ''}
                                            onChange={e => setEditForm({ ...editForm, image_url: e.target.value })}
                                            placeholder="https://..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] uppercase font-black tracking-[0.2em] text-white/40 mb-2">Description</label>
                                        <textarea
                                            className="w-full h-32 bg-black/50 border border-white/10 p-3 text-white text-sm font-mono focus:border-white/40 focus:outline-none resize-none focus:bg-white/5 transition-colors"
                                            value={editForm.description || ''}
                                            onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                        />
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
                            <div className="flex flex-col h-full">
                                {/* Header */}
                                <div className="p-6 border-b border-white/10 flex justify-between items-start bg-black/40">
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
                                        <button
                                            onClick={() => {
                                                setEditForm(selectedEvent!);
                                                setIsEditing(true);
                                            }}
                                            className="p-2 border border-white/10 hover:bg-white/10 text-white/60 hover:text-white transition"
                                            title="Edit"
                                        >
                                            <PencilSquareIcon className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteEvent(selectedEvent!.id)}
                                            className="p-2 border border-red-500/30 hover:bg-red-500/10 text-red-400 hover:text-red-300 transition"
                                            title="Delete"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Description */}
                                {selectedEvent!.description && (
                                    <div className="p-6 border-b border-white/10 bg-black/30">
                                        <p className="text-white/80 leading-relaxed whitespace-pre-wrap text-sm">{selectedEvent!.description}</p>
                                    </div>
                                )}

                                {/* Tickets Section */}
                                <div className="flex-1 flex flex-col p-6 overflow-hidden">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                                            <TicketIcon className="w-4 h-4 text-white/40" />
                                            Tickets Sold ({tickets.length})
                                        </h3>
                                        <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
                                            Revenue: <span className="text-green-400 font-bold">${(tickets.reduce((sum, t) => sum + (t.purchase_amount_cents || 0), 0) / 100).toFixed(2)}</span>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto border border-white/10 bg-black/40">
                                        {loadingTickets ? (
                                            <div className="p-12 text-center text-[10px] font-mono uppercase tracking-widest text-white/40">Loading tickets...</div>
                                        ) : tickets.length === 0 ? (
                                            <div className="p-12 text-center text-[10px] font-mono uppercase tracking-widest text-white/40">No tickets sold yet</div>
                                        ) : (
                                            <table className="w-full text-left">
                                                <thead className="bg-white/5 text-white/40 sticky top-0">
                                                    <tr>
                                                        <th className="p-3 font-black uppercase text-[10px] tracking-widest">Status</th>
                                                        <th className="p-3 font-black uppercase text-[10px] tracking-widest">Customer</th>
                                                        <th className="p-3 font-black uppercase text-[10px] tracking-widest">Date</th>
                                                        <th className="p-3 font-black uppercase text-[10px] tracking-widest text-right">Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5 text-sm font-mono">
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
        </div>
    );
}
