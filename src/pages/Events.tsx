
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import {
    CalendarIcon,
    MapPinIcon,
    TicketIcon,
    UsersIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import { cn } from '../components/ui/utils';
import { LoadingOverlay } from '../components/Loading';
import { Helmet } from 'react-helmet-async';

interface FormField {
    id: string;
    label: string;
    type: 'text' | 'textarea' | 'select' | 'checkbox';
    required: boolean;
    options?: string[];
}

interface Event {
    id: string;
    title: string;
    description: string;
    event_date: string;
    location: string;
    price_cents: number;
    capacity: number;
    image_url: string;
    settings?: {
        show_remaining_capacity?: boolean;
        pricing_format?: 'tickets' | 'rsvp' | 'external' | 'open';
        pricing_model?: 'standard' | 'donation' | 'dynamic' | 'early_bird';
        early_bird_limit?: number;
        early_bird_price_cents?: number;
        after_early_bird_model?: 'standard' | 'dynamic';
        price_scaling_trigger?: number;
        price_increment_percent?: number;
        external_url?: string;
        custom_form?: FormField[];
    };
    ticket_tiers?: {
        id: string;
        name: string;
        price_cents: number;
        capacity?: number;
    }[];
    sold_count?: number;
}

export default function Events() {
    const { user } = useAuth();
    const { success, error: showError } = useToast();
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showRegistrationForm, setShowRegistrationForm] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [formResponses, setFormResponses] = useState<Record<string, any>>({});
    const [donationAmount, setDonationAmount] = useState<string>('');
    const [selectedTier, setSelectedTier] = useState<string | null>(null);
    const [isProcessingDirectAction, setIsProcessingDirectAction] = useState<string | null>(null);

    const calculateCurrentPrice = (event: Event) => {
        const model = event.settings?.pricing_model || 'standard';
        const count = event.sold_count || 0;

        if (model === 'early_bird' && event.settings?.early_bird_limit) {
            if (count < event.settings.early_bird_limit) {
                return event.settings.early_bird_price_cents || event.price_cents;
            }
            // After early bird
            if (event.settings.after_early_bird_model === 'dynamic') {
                const remainingCount = count - event.settings.early_bird_limit;
                const trigger = event.settings.price_scaling_trigger || 1;
                const increments = Math.floor(remainingCount / trigger);
                const percent = (event.settings.price_increment_percent || 0) / 100;
                return Math.round(event.price_cents * Math.pow(1 + percent, increments));
            }
            return event.price_cents;
        }

        if (model === 'dynamic') {
            const trigger = event.settings?.price_scaling_trigger || 1;
            const increments = Math.floor(count / trigger);
            const percent = (event.settings?.price_increment_percent || 0) / 100;
            return Math.round(event.price_cents * Math.pow(1 + percent, increments));
        }

        return event.price_cents;
    };

    useEffect(() => {
        loadEvents();
    }, []);

    const loadEvents = async () => {
        try {
            const { data, error } = await supabase
                .rpc('get_published_events_with_counts');

            if (error) throw error;
            setEvents(data || []);
        } catch (err) {
            console.error('Error loading events:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRSVP = async (event: Event, responses: Record<string, any> = {}) => {
        if (!user) {
            showError('Please sign in to RSVP');
            return;
        }

        // If this event has a custom form and we haven't collected responses yet
        if (event.settings?.custom_form && event.settings.custom_form.length > 0 && Object.keys(responses).length === 0) {
            setSelectedEvent(event);
            setFormResponses({});
            setShowRegistrationForm(true);
            return;
        }

        setIsProcessingDirectAction(event.id);
        try {
            const { error } = await supabase.rpc('rsvp_event', {
                p_event_id: event.id,
                p_form_responses: responses
            });

            if (error) throw error;
            success(`You're on the list for ${event.title}!`);
            setShowRegistrationForm(false);
            loadEvents();
        } catch (err: any) {
            console.error('RSVP error:', err);
            showError('Failed to RSVP');
        } finally {
            setIsProcessingDirectAction(null);
        }
    };

    const handleBuyTicket = async (event: Event, responses: Record<string, any> = {}, options: { tierId?: string, amountCents?: number } = {}) => {
        if (!user) {
            showError('Please sign in to purchase tickets');
            return;
        }

        const model = event.settings?.pricing_model || 'standard';

        // Validation for Donation
        if (model === 'donation' && !options.amountCents && !showRegistrationForm) {
            setSelectedEvent(event);
            setFormResponses({});
            setDonationAmount('');
            setShowRegistrationForm(true);
            return;
        }

        // If this event has a custom form and we haven't collected responses yet
        if (event.settings?.custom_form && event.settings.custom_form.length > 0 && Object.keys(responses).length === 0 && !showRegistrationForm) {
            setSelectedEvent(event);
            setFormResponses({});
            setShowRegistrationForm(true);
            return;
        }

        setIsProcessingDirectAction(event.id);

        try {
            const { error } = await supabase.rpc('purchase_ticket', {
                p_event_id: event.id,
                p_form_responses: responses,
                p_tier_id: options.tierId,
                p_amount_cents: options.amountCents
            });

            if (error) throw error;

            success(`Ticket purchased for ${event.title}!`);
            setShowRegistrationForm(false);
            setDonationAmount('');
            setSelectedTier(null);
            loadEvents();
        } catch (err: any) {
            console.error('Error purchasing ticket:', err);
            showError(err.message || 'Failed to purchase ticket');
        } finally {
            setIsProcessingDirectAction(null);
        }
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEvent) return;

        setIsSubmitting(true);
        const format = selectedEvent.settings?.pricing_format || (selectedEvent.price_cents > 0 ? 'tickets' : 'rsvp');
        const model = selectedEvent.settings?.pricing_model || 'standard';

        if (format === 'rsvp') {
            await handleRSVP(selectedEvent, formResponses);
        } else {
            const options: any = {};
            if (model === 'donation') {
                const cents = Math.round(parseFloat(donationAmount) * 100);
                if (isNaN(cents) || cents <= 0) {
                    showError('Please enter a valid donation amount');
                    setIsSubmitting(false);
                    return;
                }
                options.amountCents = cents;
            }
            if (selectedTier) {
                options.tierId = selectedTier;
            }
            await handleBuyTicket(selectedEvent, formResponses, options);
        }
        setIsSubmitting(false);
    };

    if (loading) return <LoadingOverlay />;

    return (
        <>
            <Helmet>
                <title>THE LOST+UNFOUNDS | Upcoming Events</title>
                <meta name="description" content="Join THE LOST+UNFOUNDS for exclusive gatherings, workshops, and experiences pushing boundaries at the frontier. Book tickets for upcoming events." />
                <link rel="canonical" href="https://www.thelostandunfounds.com/events" />
            </Helmet>
            <div className="min-h-screen bg-black text-white pt-24 pb-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto space-y-12">
                    <div className="text-center">
                        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4">
                            Upcoming Events
                        </h1>
                        <p className="text-xl text-white/60 max-w-2xl mx-auto mb-8">
                            Join us for exclusive gatherings, workshops, and experiences.
                        </p>

                        {user && (
                            <Link
                                to="/submit-event"
                                className="inline-block bg-white text-black font-black uppercase tracking-widest text-[10px] md:text-sm px-8 py-4 hover:bg-white/90 transition-colors"
                            >
                                Submit an Event
                            </Link>
                        )}
                    </div>

                    {events.length === 0 ? (
                        <div className="text-center py-24 border border-white/5 bg-transparent">
                            <CalendarIcon className="w-16 h-16 mx-auto text-white/20 mb-4" />
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">No upcoming events scheduled</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {events.map((event) => (
                                <div key={event.id} id={event.id} className="group border border-white/10 bg-transparent hover:border-white/20 transition-colors flex flex-col h-full overflow-hidden">
                                    {event.image_url && (
                                        <div className="aspect-video w-full overflow-hidden bg-black/50 relative">
                                            <img
                                                src={event.image_url}
                                                alt={event.title}
                                                className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                                            />
                                            <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm border border-white/10 text-white text-[10px] font-black tracking-widest uppercase px-3 py-1">
                                                {(() => {
                                                    const format = event.settings?.pricing_format || (event.price_cents > 0 ? 'tickets' : 'rsvp');
                                                    const model = event.settings?.pricing_model || 'standard';

                                                    if (format === 'rsvp') return 'Free RSVP';
                                                    if (format === 'external') return 'External';
                                                    if (format === 'open') return 'Public';
                                                    if (model === 'donation') return 'Donation';

                                                    // Dynamic pricing display
                                                    const currentPrice = calculateCurrentPrice(event);
                                                    return `$${(currentPrice / 100).toFixed(2)}${model === 'dynamic' ? '+' : ''}`;
                                                })()}
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

                                        {/* Capacity Counter */}
                                        {event.settings?.show_remaining_capacity && event.capacity && (
                                            <div className="mb-4">
                                                <div className="flex justify-between text-[10px] uppercase font-black tracking-widest text-white/40 mb-1">
                                                    <span>{event.price_cents > 0 ? 'Tickets Sold' : 'Attending'}</span>
                                                    <span>{event.sold_count || 0} / {event.capacity}</span>
                                                </div>
                                                <div className="h-1 bg-white/5 w-full">
                                                    <div
                                                        className="h-full bg-white transition-all duration-500"
                                                        style={{ width: `${Math.min(100, ((event.sold_count || 0) / (event.capacity || 1)) * 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Action Button */}
                                        {(() => {
                                            const format = event.settings?.pricing_format || (event.price_cents > 0 ? 'tickets' : 'rsvp');

                                            if (format === 'external') {
                                                return (
                                                    <a
                                                        href={event.settings?.external_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="w-full py-4 px-6 uppercase font-black text-sm tracking-widest bg-white text-black hover:bg-white/90 transition-all text-center flex items-center justify-center gap-2"
                                                    >
                                                        Register Externally <TicketIcon className="w-4 h-4" />
                                                    </a>
                                                );
                                            }

                                            if (format === 'open') {
                                                return (
                                                    <div className="w-full py-4 px-6 uppercase font-black text-sm tracking-widest bg-white/5 text-white/40 text-center border border-white/10">
                                                        Open Admission
                                                    </div>
                                                );
                                            }

                                            if (format === 'rsvp') {
                                                return (
                                                    <button
                                                        onClick={() => handleRSVP(event)}
                                                        disabled={isProcessingDirectAction === event.id}
                                                        className={cn(
                                                            "w-full py-4 px-6 uppercase font-black text-sm tracking-widest transition-all relative overflow-hidden group/btn",
                                                            isProcessingDirectAction === event.id
                                                                ? "bg-white/20 text-white/40 cursor-wait"
                                                                : "bg-white text-black hover:bg-white/90"
                                                        )}
                                                    >
                                                        {isProcessingDirectAction === event.id ? 'Processing...' : (
                                                            <span className="flex items-center justify-center gap-2">
                                                                RSVP NOW <UsersIcon className="w-4 h-4" />
                                                            </span>
                                                        )}
                                                    </button>
                                                );
                                            }

                                            // Default to Tickets — pricing-model aware
                                            const model = event.settings?.pricing_model || 'standard';
                                            const isSoldOut = event.capacity && (event.sold_count || 0) >= event.capacity;

                                            if (isSoldOut) {
                                                return (
                                                    <div className="w-full py-4 px-6 uppercase font-black text-sm tracking-widest bg-white/5 text-white/40 text-center border border-white/10">
                                                        Sold Out
                                                    </div>
                                                );
                                            }

                                            const buttonLabel = (() => {
                                                if (model === 'donation') return 'Donate & Attend';
                                                if (model === 'early_bird') {
                                                    const limit = event.settings?.early_bird_limit || 0;
                                                    const sold = event.sold_count || 0;
                                                    if (sold < limit) {
                                                        const earlyPrice = (event.settings?.early_bird_price_cents || 0) / 100;
                                                        return `Early Bird — $${earlyPrice.toFixed(2)}`;
                                                    }
                                                    const currentPrice = calculateCurrentPrice(event) / 100;
                                                    return `Get Tickets — $${currentPrice.toFixed(2)}`;
                                                }
                                                if (model === 'dynamic') {
                                                    const currentPrice = calculateCurrentPrice(event) / 100;
                                                    return `Get Tickets — $${currentPrice.toFixed(2)}`;
                                                }
                                                return 'Get Tickets';
                                            })();

                                            return (
                                                <button
                                                    onClick={() => handleBuyTicket(event)}
                                                    disabled={isProcessingDirectAction === event.id}
                                                    className={cn(
                                                        "w-full py-4 px-6 uppercase font-black text-sm tracking-widest transition-all relative overflow-hidden group/btn",
                                                        isProcessingDirectAction === event.id
                                                            ? "bg-white/20 text-white/40 cursor-wait"
                                                            : "bg-white text-black hover:bg-white/90"
                                                    )}
                                                >
                                                    {isProcessingDirectAction === event.id ? 'Processing...' : (
                                                        <span className="flex items-center justify-center gap-2">
                                                            {buttonLabel} <TicketIcon className="w-4 h-4" />
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Registration Form Modal */}
            {showRegistrationForm && selectedEvent && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/90 backdrop-blur-xl"
                        onClick={() => setShowRegistrationForm(false)}
                    />
                    <div className="relative w-full max-w-lg bg-black border border-white/20 p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
                        <button
                            onClick={() => setShowRegistrationForm(false)}
                            className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
                        >
                            <XMarkIcon className="w-6 h-6" />
                        </button>

                        <div className="mb-8">
                            <h2 className="text-2xl font-black uppercase tracking-tighter text-white mb-2">
                                {selectedEvent.settings?.pricing_model === 'donation' ? 'Support Event' : 'Registration'}
                            </h2>
                            <p className="text-white/60 text-sm uppercase tracking-widest font-black">
                                {selectedEvent.title}
                            </p>
                        </div>

                        <form onSubmit={handleFormSubmit} className="space-y-6">
                            {/* Donation Input */}
                            {selectedEvent.settings?.pricing_model === 'donation' && (
                                <div className="space-y-2 text-left">
                                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                                        Donation Amount (USD) <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-mono font-bold">$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            required
                                            value={donationAmount}
                                            onChange={(e) => setDonationAmount(e.target.value)}
                                            placeholder="20.00"
                                            className="w-full bg-white/5 border border-white/10 pl-10 pr-4 py-4 text-white focus:border-white/40 focus:outline-none transition-colors font-mono text-xl"
                                        />
                                    </div>
                                    <p className="text-[10px] text-white/40 uppercase tracking-widest pt-1">
                                        Enter any amount to support this event.
                                    </p>
                                </div>
                            )}

                            {/* Ticket Tiers Selection */}
                            {selectedEvent.ticket_tiers && selectedEvent.ticket_tiers.length > 0 && selectedEvent.settings?.pricing_model !== 'donation' && (
                                <div className="space-y-2 text-left">
                                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-3">
                                        Select Ticket Type
                                    </label>
                                    <div className="space-y-2">
                                        {selectedEvent.ticket_tiers.map((tier) => (
                                            <button
                                                key={tier.id}
                                                type="button"
                                                onClick={() => setSelectedTier(tier.id)}
                                                className={cn(
                                                    "w-full p-4 flex items-center justify-between border transition-all text-left",
                                                    selectedTier === tier.id
                                                        ? "bg-white border-white text-black"
                                                        : "bg-white/5 border-white/10 text-white hover:border-white/30"
                                                )}
                                            >
                                                <div>
                                                    <div className="text-xs font-black uppercase tracking-widest mb-1">{tier.name}</div>
                                                    {tier.capacity && (
                                                        <div className={cn("text-[9px] uppercase tracking-wider", selectedTier === tier.id ? "text-black/60" : "text-white/40")}>
                                                            {tier.capacity} Available
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="font-mono font-bold">
                                                    ${(tier.price_cents / 100).toFixed(2)}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {selectedEvent.settings?.custom_form?.map((field) => (
                                <div key={field.id} className="space-y-2 text-left">
                                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                                        {field.label} {field.required && <span className="text-red-500">*</span>}
                                    </label>

                                    {field.type === 'text' && (
                                        <input
                                            type="text"
                                            required={field.required}
                                            value={formResponses[field.id] || ''}
                                            onChange={(e) => setFormResponses(prev => ({ ...prev, [field.id]: e.target.value }))}
                                            className="w-full bg-white/5 border border-white/10 px-4 py-3 text-white focus:border-white/40 focus:outline-none transition-colors"
                                        />
                                    )}

                                    {field.type === 'textarea' && (
                                        <textarea
                                            required={field.required}
                                            value={formResponses[field.id] || ''}
                                            onChange={(e) => setFormResponses(prev => ({ ...prev, [field.id]: e.target.value }))}
                                            rows={3}
                                            className="w-full bg-white/5 border border-white/10 px-4 py-3 text-white focus:border-white/40 focus:outline-none transition-colors resize-none"
                                        />
                                    )}

                                    {field.type === 'select' && (
                                        <select
                                            required={field.required}
                                            value={formResponses[field.id] || ''}
                                            onChange={(e) => setFormResponses(prev => ({ ...prev, [field.id]: e.target.value }))}
                                            className="w-full bg-white/5 border border-white/10 px-4 py-3 text-white focus:border-white/40 focus:outline-none transition-colors appearance-none"
                                        >
                                            <option value="" className="bg-black">Select an option</option>
                                            {field.options?.map((option) => (
                                                <option key={option} value={option} className="bg-black">
                                                    {option}
                                                </option>
                                            ))}
                                        </select>
                                    )}

                                    {field.type === 'checkbox' && (
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <div className="relative">
                                                <input
                                                    type="checkbox"
                                                    required={field.required}
                                                    checked={formResponses[field.id] || false}
                                                    onChange={(e) => setFormResponses(prev => ({ ...prev, [field.id]: e.target.checked }))}
                                                    className="sr-only"
                                                />
                                                <div className={cn(
                                                    "w-5 h-5 border border-white/20 transition-colors group-hover:border-white/40 flex items-center justify-center",
                                                    formResponses[field.id] ? "bg-white" : "bg-transparent"
                                                )}>
                                                    {formResponses[field.id] && (
                                                        <div className="w-2.5 h-2.5 bg-black" />
                                                    )}
                                                </div>
                                            </div>
                                            <span className="text-sm text-white/60 group-hover:text-white transition-colors">
                                                Confirm selection
                                            </span>
                                        </label>
                                    )}
                                </div>
                            ))}

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-4 mt-8 bg-white text-black font-black uppercase tracking-[0.2em] text-sm hover:bg-white/90 disabled:bg-white/20 disabled:text-white/40 transition-all"
                            >
                                {isSubmitting ? 'PROCESSING...' : (
                                    selectedEvent.settings?.pricing_format === 'rsvp' || selectedEvent.price_cents === 0
                                        ? 'CONFIRM RSVP'
                                        : 'PROCEED TO PAYMENT'
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
