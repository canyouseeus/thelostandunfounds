
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import {
    CalendarIcon,
    MapPinIcon,
    TicketIcon,
    UsersIcon
} from '@heroicons/react/24/outline';
import { cn } from '../components/ui/utils';
import { LoadingOverlay } from '../components/Loading';
import { Helmet } from 'react-helmet-async';

interface Event {
    id: string;
    title: string;
    description: string;
    event_date: string;
    location: string;
    price_cents: number;
    capacity: number;
    image_url: string;
}

export default function Events() {
    const { user } = useAuth();
    const { success, error: showError } = useToast();
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState<string | null>(null);

    useEffect(() => {
        loadEvents();
    }, []);

    const loadEvents = async () => {
        try {
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .eq('status', 'published')
                .order('event_date', { ascending: true });

            if (error) throw error;
            setEvents(data || []);
        } catch (err) {
            console.error('Error loading events:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleBuyTicket = async (event: Event) => {
        if (!user) {
            showError('Please sign in to purchase tickets');
            return;
        }

        setPurchasing(event.id);

        try {
            // Create ticket record
            // In a real app, this would be after payment processing
            // Call RPC function to purchase ticket securely
            const { error } = await supabase.rpc('purchase_ticket', {
                p_event_id: event.id
            });

            if (error) throw error;

            success(`Ticket purchased for ${event.title}!`);
        } catch (err: any) {
            console.error('Error purchasing ticket:', err);
            showError('Failed to purchase ticket');
        } finally {
            setPurchasing(null);
        }
    };

    if (loading) return <LoadingOverlay />;

    return (
        <>
            <Helmet>
                <link rel="canonical" href="https://www.thelostandunfounds.com/events" />
            </Helmet>
            <div className="min-h-screen bg-black text-white pt-24 pb-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto space-y-12">
                    <div className="text-center">
                        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4">
                            Upcoming Events
                        </h1>
                        <p className="text-xl text-white/60 max-w-2xl mx-auto">
                            Join us for exclusive gatherings, workshops, and experiences.
                        </p>
                    </div>

                    {events.length === 0 ? (
                        <div className="text-center py-24 bg-white/5 rounded-2xl">
                            <CalendarIcon className="w-16 h-16 mx-auto text-white/20 mb-4" />
                            <p className="text-white/40 uppercase tracking-widest">No upcoming events scheduled</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {events.map((event) => (
                                <div key={event.id} className="group rounded-2xl bg-white/5 hover:bg-white/10 transition-colors flex flex-col h-full overflow-hidden">
                                    {event.image_url && (
                                        <div className="aspect-video w-full overflow-hidden bg-black/50 relative">
                                            <img
                                                src={event.image_url}
                                                alt={event.title}
                                                className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                                            />
                                            <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm shadow-xl text-white text-xs font-bold uppercase px-3 py-1 rounded-full">
                                                {event.price_cents > 0 ? `$${(event.price_cents / 100).toFixed(2)}` : 'Free'}
                                            </div>
                                        </div>
                                    )}

                                    <div className="p-6 flex-1 flex flex-col">
                                        <div className="flex items-center gap-2 text-xs font-mono text-white/40 mb-3 uppercase tracking-wider">
                                            <CalendarIcon className="w-4 h-4" />
                                            {new Date(event.event_date).toLocaleDateString(undefined, {
                                                weekday: 'short',
                                                month: 'long',
                                                day: 'numeric',
                                                hour: 'numeric',
                                                minute: '2-digit'
                                            })}
                                        </div>

                                        <h3 className="text-2xl font-bold uppercase tracking-tight mb-3 leading-none">
                                            {event.title}
                                        </h3>

                                        <div className="flex items-center gap-2 text-sm text-white/60 mb-4">
                                            <MapPinIcon className="w-4 h-4" />
                                            {event.location || 'TBA'}
                                        </div>

                                        {event.description && (
                                            <p className="text-white/60 text-sm leading-relaxed mb-6 flex-1 line-clamp-4">
                                                {event.description}
                                            </p>
                                        )}

                                        <button
                                            onClick={() => handleBuyTicket(event)}
                                            disabled={purchasing === event.id}
                                            className={cn(
                                                "w-full py-4 px-6 uppercase font-black text-sm tracking-widest transition-all relative overflow-hidden group/btn",
                                                purchasing === event.id
                                                    ? "bg-white/20 text-white/40 cursor-wait"
                                                    : "bg-white text-black hover:bg-white/90"
                                            )}
                                        >
                                            {purchasing === event.id ? 'Processing...' : (
                                                <span className="flex items-center justify-center gap-2">
                                                    Get Tickets <TicketIcon className="w-4 h-4" />
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
