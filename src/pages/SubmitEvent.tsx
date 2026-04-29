import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { Helmet } from 'react-helmet-async';
import { CalendarIcon, MapPinIcon, CurrencyDollarIcon, UsersIcon, TrashIcon, PlusIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { LoadingSpinner } from '../components/Loading';

interface FormField {
    id: string;
    label: string;
    type: 'text' | 'textarea' | 'select' | 'checkbox';
    required: boolean;
    options?: string[];
}

export default function SubmitEvent() {
    const { user } = useAuth();
    const { success, error: showError } = useToast();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        event_date: '',
        location: '',
        price_cents: '0',
        capacity: '50',
        image_url: '',
        ticket_tiers: [] as { id: string, name: string, price_cents: number, capacity?: number }[],
        price_scaling_trigger: 0,
        price_increment_percent: 0,
        settings: {
            pricing_format: 'tickets', // 'tickets', 'rsvp', 'external', 'open'
            pricing_model: 'standard', // 'standard', 'donation', 'dynamic', 'early_bird'
            early_bird_limit: 0,
            early_bird_price_cents: 0,
            after_early_bird_model: 'standard',
            external_url: '',
            custom_form: [] as FormField[]
        }
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            showError('You must be signed in to submit an event.');
            return;
        }

        setLoading(true);

        try {
            // Merge pricing-model config into settings so Events.tsx can read from one JSONB
            const mergedSettings = {
                ...formData.settings,
                price_scaling_trigger: formData.price_scaling_trigger || undefined,
                price_increment_percent: formData.price_increment_percent || undefined,
            };

            const { data, error } = await supabase.from('events').insert([{
                owner_id: user.id,
                title: formData.title,
                description: formData.description,
                event_date: new Date(formData.event_date).toISOString(),
                location: formData.location,
                price_cents: parseInt(formData.price_cents, 10),
                capacity: parseInt(formData.capacity, 10),
                image_url: formData.image_url || null,
                ticket_tiers: formData.ticket_tiers,
                settings: mergedSettings,
                status: 'pending' // Force pending status for public submissions
            }]).select().single();

            if (error) throw error;

            success('Event submitted successfully! It is now pending admin review.');

            if (data?.id) {
                try {
                    await fetch('/api/events/notifications', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ eventId: data.id, action: 'submitted' })
                    });
                } catch (e) {
                    console.error("Failed to notify admin", e);
                }
            }

            // Reset form
            setFormData({
                title: '',
                description: '',
                event_date: '',
                location: '',
                price_cents: '0',
                capacity: '50',
                image_url: '',
                ticket_tiers: [],
                price_scaling_trigger: 0,
                price_increment_percent: 0,
                settings: {
                    pricing_format: 'tickets',
                    pricing_model: 'standard',
                    early_bird_limit: 0,
                    early_bird_price_cents: 0,
                    after_early_bird_model: 'standard',
                    external_url: '',
                    custom_form: []
                }
            });

        } catch (err: any) {
            console.error('Submission error:', err);
            showError(err.message || 'Failed to submit event.');
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-black text-white pt-32 pb-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-3xl font-black uppercase tracking-tighter mb-4">Sign In Required</h1>
                    <p className="text-white/60 uppercase tracking-widest text-sm">You must be signed in to submit an event.</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <Helmet>
                <title>THE LOST+UNFOUNDS | Submit Event</title>
                <meta name="description" content="Submit your unique event to be featured on THE LOST+UNFOUNDS. We are looking for gatherings, workshops, and experiences from the frontier." />
                <link rel="canonical" href="https://www.thelostandunfounds.com/submit-event" />
            </Helmet>

            <div className="min-h-screen bg-black text-white pt-24 pb-24 px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl mx-auto">

                    <div className="mb-12 pb-8">
                        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-4">
                            Submit an Event
                        </h1>
                        <p className="text-lg text-white/60">
                            Partner with THE LOST+UNFOUNDS to host your next gathering, workshop, or experience. All submissions are subject to review before publication.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Title */}
                        <div className="space-y-2">
                            <label className="block text-xs font-black text-white/60 uppercase tracking-widest">
                                Event Title *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.title}
                                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                className="w-full bg-white/5 px-4 py-3 text-white focus:bg-white/10 border-none outline-none transition-colors"
                                placeholder="E.g., Summer Gallery Showcase"
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <label className="block text-xs font-black text-white/60 uppercase tracking-widest">
                                Description *
                            </label>
                            <textarea
                                required
                                rows={6}
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                className="w-full bg-white/5 px-4 py-3 text-white focus:bg-white/10 border-none outline-none transition-colors resize-y"
                                placeholder="Describe the event, what attendees can expect, and any important details..."
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Date & Time */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-xs font-black text-white/60 uppercase tracking-widest">
                                    <CalendarIcon className="w-4 h-4" /> Date & Time *
                                </label>
                                <input
                                    type="datetime-local"
                                    required
                                    value={formData.event_date}
                                    onChange={(e) => setFormData(prev => ({ ...prev, event_date: e.target.value }))}
                                    className="w-full bg-white/5 px-4 py-3 text-white focus:bg-white/10 border-none outline-none transition-colors [color-scheme:dark]"
                                />
                            </div>

                            {/* Pricing Format selector */}
                            <div className="md:col-span-2 space-y-2">
                                <label className="flex items-center gap-2 text-xs font-black text-white/60 uppercase tracking-widest">
                                    Pricing Format *
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger type="button" className="cursor-help">
                                                <InformationCircleIcon className="w-4 h-4 text-white/40 hover:text-white transition-colors" />
                                            </TooltipTrigger>
                                            <TooltipContent className="bg-zinc-900 text-white rounded-none p-3 max-w-xs shadow-xl z-50">
                                                <div className="space-y-2 text-xs uppercase tracking-wider leading-relaxed">
                                                    <p><span className="text-white font-black">Tickets:</span> Standard paid entry with optional tiers and scaling.</p>
                                                    <p><span className="text-white font-black">RSVP:</span> Free registration for headcount tracking.</p>
                                                    <p><span className="text-white font-black">External:</span> Link to another ticketing site (Eventbrite, etc).</p>
                                                    <p><span className="text-white font-black">Open:</span> No registration required. Open to the public.</p>
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </label>
                                <select
                                    value={formData.settings.pricing_format}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        settings: {
                                            ...prev.settings,
                                            pricing_format: e.target.value as any,
                                            pricing_model: e.target.value === 'rsvp' ? 'standard' : prev.settings.pricing_model
                                        },
                                        price_cents: e.target.value === 'rsvp' ? '0' : prev.price_cents
                                    }))}
                                    className="w-full bg-white/5 px-4 py-3 text-white focus:bg-white/10 border-none outline-none transition-colors appearance-none uppercase text-sm font-black tracking-widest"
                                >
                                    <option value="tickets">Tickets (Paid/Standard)</option>
                                    <option value="rsvp">RSVP (Free)</option>
                                    <option value="external">External Link</option>
                                    <option value="open">Open Admission</option>
                                </select>
                            </div>

                            {/* External URL - Only shown if format is external */}
                            {formData.settings.pricing_format === 'external' && (
                                <div className="md:col-span-2 space-y-2 animate-in fade-in duration-200">
                                    <label className="block text-xs font-black text-white/60 uppercase tracking-widest">
                                        External Ticketing URL *
                                    </label>
                                    <input
                                        type="url"
                                        required
                                        value={formData.settings.external_url}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            settings: { ...prev.settings, external_url: e.target.value }
                                        }))}
                                        className="w-full bg-white/5 px-4 py-3 text-white focus:bg-white/10 outline-none transition-colors"
                                        placeholder="https://eventbrite.com/your-event-link"
                                    />
                                </div>
                            )}

                            {/* Location */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-xs font-black text-white/60 uppercase tracking-widest">
                                    <MapPinIcon className="w-4 h-4" /> Location *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.location}
                                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                                    className="w-full bg-white/5 px-4 py-3 text-white focus:bg-white/10 border-none outline-none transition-colors"
                                    placeholder="Venue name or full address"
                                />
                            </div>

                            {/* Price - Only if tickets or external */}
                            {/* Ticket Price - Only for Ticketed events & not Donation based */}
                            {formData.settings.pricing_format === 'tickets' && formData.settings.pricing_model !== 'donation' && (
                                <div className="space-y-2 animate-in fade-in duration-300">
                                    <label className="flex items-center gap-2 text-xs font-black text-white/60 uppercase tracking-widest">
                                        <CurrencyDollarIcon className="w-4 h-4" />
                                        {formData.settings.pricing_model === 'early_bird' ? 'Post-Early Bird Price *' : 'Base Ticket Price *'}
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-mono">$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            required
                                            value={parseInt(formData.price_cents) / 100}
                                            onChange={(e) => setFormData(prev => ({ ...prev, price_cents: Math.round(parseFloat(e.target.value) * 100).toString() }))}
                                            className="w-full bg-white/5 pl-10 pr-4 py-3 text-white focus:bg-white/10 border-none outline-none transition-colors font-mono"
                                            placeholder="20.00"
                                        />
                                    </div>
                                    <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">
                                        {formData.settings.pricing_model === 'dynamic'
                                            ? 'Starting price for the first batch of tickets.'
                                            : formData.settings.pricing_model === 'early_bird'
                                                ? 'Price after early bird tickets sell out.'
                                                : 'Standard price for a single ticket.'}
                                    </p>
                                </div>
                            )}
                            {/* Pricing Model - Only for Tickets */}
                            {formData.settings.pricing_format === 'tickets' && (
                                <div className="md:col-span-2 space-y-4 pt-8 animate-in fade-in duration-500">
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-xs font-black text-white/60 uppercase tracking-widest">Pricing Model</h4>
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger type="button" className="cursor-help">
                                                    <InformationCircleIcon className="w-4 h-4 text-white/40 hover:text-white transition-colors" />
                                                </TooltipTrigger>
                                                <TooltipContent className="bg-zinc-900 text-white rounded-none p-3 max-w-xs shadow-xl z-50">
                                                    <p className="text-xs font-medium tracking-normal normal-case">Choose how your tickets are priced. Standard is fixed, Donation is pay-what-you-want, Rate Changer increases prices as tickets sell, and Early Bird is a flat rate that jumps after a limit.</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                        {[
                                            { id: 'standard', label: 'Standard', desc: 'Fixed Price' },
                                            { id: 'donation', label: 'Donation', desc: 'Pay What You Want' },
                                            { id: 'dynamic', label: 'Rate Changer', desc: 'Supply + Demand' },
                                            { id: 'early_bird', label: 'Early Bird', desc: 'Flat Rate Jumps' }
                                        ].map((model) => (
                                            <button
                                                key={model.id}
                                                type="button"
                                                onClick={() => setFormData(prev => ({
                                                    ...prev,
                                                    settings: { ...prev.settings, pricing_model: model.id as any }
                                                }))}
                                                className={`p-3 text-left transition-all ${formData.settings.pricing_model === model.id
                                                        ? 'bg-white text-black'
                                                        : 'bg-white/5 text-white hover:bg-white/10'
                                                    }`}
                                            >
                                                <div className="text-[10px] font-black uppercase tracking-widest mb-1">{model.label}</div>
                                                <div className={`text-[9px] uppercase tracking-wider ${formData.settings.pricing_model === model.id ? 'text-black/60' : 'text-white/40'}`}>
                                                    {model.desc}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                    {/* Donation Model Info */}
                                    {formData.settings.pricing_model === 'donation' && (
                                        <div className="bg-white/5 p-4">
                                            <p className="text-xs text-white/60 font-medium">Guests will be prompted to enter a custom amount during checkout. You can set a minimum suggested donation in the description.</p>
                                        </div>
                                    )}
                                    {/* Early Bird Fields */}
                                    {formData.settings.pricing_model === 'early_bird' && (
                                        <div className="bg-white/5 p-6 space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="block text-[10px] uppercase font-black tracking-widest text-white/40">Early Bird Price (USD)</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 font-mono text-sm">$</span>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            value={formData.settings.early_bird_price_cents / 100}
                                                            onChange={(e) => setFormData(prev => ({
                                                                ...prev,
                                                                settings: { ...prev.settings, early_bird_price_cents: Math.round(parseFloat(e.target.value) * 100) }
                                                            }))}
                                                            className="w-full bg-white/5 pl-7 pr-3 py-2 text-white focus:bg-white/10 outline-none font-mono transition-colors text-sm"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="block text-[10px] uppercase font-black tracking-widest text-white/40">Early Bird Limit (Tickets)</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={formData.settings.early_bird_limit || ''}
                                                        onChange={(e) => setFormData(prev => ({
                                                            ...prev,
                                                            settings: { ...prev.settings, early_bird_limit: parseInt(e.target.value) || 0 }
                                                        }))}
                                                        className="w-full bg-white/5 px-3 py-2 text-white focus:bg-white/10 outline-none font-mono transition-colors text-sm"
                                                        placeholder="e.g., 20"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block text-[10px] uppercase font-black tracking-widest text-white/40">After Early Bird, switch to:</label>
                                                <div className="flex gap-2">
                                                    {['standard', 'dynamic'].map((opt) => (
                                                        <button
                                                            key={opt}
                                                            type="button"
                                                            onClick={() => setFormData(prev => ({
                                                                ...prev,
                                                                settings: { ...prev.settings, after_early_bird_model: opt as any }
                                                            }))}
                                                            className={`flex-1 py-2 px-3 text-[10px] uppercase font-black tracking-widest transition-colors ${formData.settings.after_early_bird_model === opt
                                                                    ? 'bg-white text-black'
                                                                    : 'bg-white/5 text-white hover:bg-white/10'
                                                                }`}
                                                        >
                                                            {opt === 'standard' ? 'Standard Price' : 'Rate Changer (Scaling)'}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {/* Dynamic (Rate Changer) Fields */}
                                    {(formData.settings.pricing_model === 'dynamic' || (formData.settings.pricing_model === 'early_bird' && formData.settings.after_early_bird_model === 'dynamic')) && (
                                        <div className="bg-white/5 p-6">
                                            <div className="flex items-center gap-2 mb-4">
                                                <h5 className="text-[10px] font-black text-white/60 uppercase tracking-widest">Pricing Scaling (Rate Changer)</h5>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="block text-[10px] uppercase font-black tracking-widest text-white/40">Tickets Sold before increase</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        placeholder="e.g., 25"
                                                        value={formData.price_scaling_trigger || ''}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, price_scaling_trigger: parseInt(e.target.value) || 0 }))}
                                                        className="w-full bg-white/5 px-4 py-2 text-white focus:bg-white/10 outline-none font-mono transition-colors text-sm"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="block text-[10px] uppercase font-black tracking-widest text-white/40">Price Increase (%)</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        placeholder="e.g., 10"
                                                        value={formData.price_increment_percent || ''}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, price_increment_percent: parseInt(e.target.value) || 0 }))}
                                                        className="w-full bg-white/5 px-4 py-2 text-white focus:bg-white/10 outline-none font-mono transition-colors text-sm"
                                                    />
                                                </div>
                                            </div>
                                            <p className="text-[9px] text-white/40 uppercase tracking-widest mt-4 font-mono">
                                                Formula: Price jumps by {formData.price_increment_percent}% after every {formData.price_scaling_trigger} sales.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Capacity - Only if not Open Admission */}
                            {formData.settings.pricing_format !== 'open' && (
                                <div className="md:col-span-2 space-y-2">
                                    <label className="flex items-center gap-2 text-xs font-black text-white/60 uppercase tracking-widest">
                                        <UsersIcon className="w-4 h-4" /> {formData.settings.pricing_format === 'external' ? 'Venue Capacity' : 'Total Capacity *'}
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger type="button" className="cursor-help">
                                                    <InformationCircleIcon className="w-4 h-4 text-white/40 hover:text-white transition-colors" />
                                                </TooltipTrigger>
                                                <TooltipContent className="bg-zinc-900 text-white rounded-none p-3 max-w-xs shadow-xl z-50">
                                                    <p className="text-xs font-medium tracking-normal normal-case">
                                                        {formData.settings.pricing_format === 'external'
                                                            ? 'Total capacity of the venue for informational purposes.'
                                                            : 'The maximum number of attendees allowed across the entire event. Ticket tiers will be capped so their combined sales don\'t exceed this total.'}
                                                    </p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        required
                                        value={formData.capacity}
                                        onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
                                        className="w-full bg-white/5 px-4 py-3 text-white focus:bg-white/10 outline-none transition-colors font-mono"
                                        placeholder="50"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Ticket Tiers - Only for Ticketed events */}
                        {formData.settings.pricing_format === 'tickets' && (
                            <div className="md:col-span-2 space-y-4 pt-8">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-xs font-black text-white/60 uppercase tracking-widest">Ticket Tiers (Optional)</h4>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger type="button" className="cursor-help">
                                                        <InformationCircleIcon className="w-4 h-4 text-white/40 hover:text-white transition-colors" />
                                                    </TooltipTrigger>
                                                    <TooltipContent className="bg-zinc-900 text-white rounded-none p-3 max-w-xs shadow-xl z-50">
                                                        <p className="text-xs font-medium tracking-normal normal-case">Offer multiple pricing options like "VIP" or "Early Bird". Each tier acts as a separate ticket option with its own price and optional quantity limit.</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                        <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Add advanced pricing options for different groups.</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const tiers = [...formData.ticket_tiers];
                                            tiers.push({
                                                id: 'tier_' + Math.random().toString(36).substring(2, 9),
                                                name: '',
                                                price_cents: parseInt(formData.price_cents) || 0
                                            });
                                            setFormData(prev => ({ ...prev, ticket_tiers: tiers }));
                                        }}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-white/5 text-white/60 hover:text-white hover:bg-white/10 text-[10px] uppercase font-black tracking-widest transition-colors"
                                    >
                                        <PlusIcon className="w-3 h-3" /> Add Tier
                                    </button>
                                </div>

                                {formData.ticket_tiers.length > 0 && (
                                    <div className="space-y-2">
                                        {formData.ticket_tiers.map((tier, idx) => (
                                            <div key={tier.id} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end bg-white/5 p-4 group">
                                                <div className="col-span-1 md:col-span-1">
                                                    <label className="block text-[10px] uppercase font-black tracking-widest text-white/40 mb-2">Category Name</label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g., VIP, Student"
                                                        value={tier.name}
                                                        onChange={(e) => {
                                                            const tiers = [...formData.ticket_tiers];
                                                            tiers[idx].name = e.target.value;
                                                            setFormData(prev => ({ ...prev, ticket_tiers: tiers }));
                                                        }}
                                                        className="w-full bg-white/5 px-3 py-2 text-white focus:bg-white/10 outline-none transition-colors text-sm"
                                                        required
                                                    />
                                                </div>
                                                <div className="col-span-1 md:col-span-1">
                                                    <label className="block text-[10px] uppercase font-black tracking-widest text-white/40 mb-2">Price (USD)</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">$</span>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            placeholder="0.00"
                                                            value={tier.price_cents / 100}
                                                            onChange={(e) => {
                                                                const tiers = [...formData.ticket_tiers];
                                                                tiers[idx].price_cents = Math.round(parseFloat(e.target.value) * 100);
                                                                setFormData(prev => ({ ...prev, ticket_tiers: tiers }));
                                                            }}
                                                            className="w-full bg-white/5 pl-7 pr-3 py-2 text-white focus:bg-white/10 outline-none font-mono transition-colors text-sm"
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                                <div className="col-span-1 md:col-span-1">
                                                    <label className="block text-[10px] uppercase font-black tracking-widest text-white/40 mb-2">Qty (Opt)</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        placeholder="Unlimited"
                                                        value={tier.capacity || ''}
                                                        onChange={(e) => {
                                                            const tiers = [...formData.ticket_tiers];
                                                            tiers[idx].capacity = e.target.value ? parseInt(e.target.value) : undefined;
                                                            setFormData(prev => ({ ...prev, ticket_tiers: tiers }));
                                                        }}
                                                        className="w-full bg-white/5 px-3 py-2 text-white focus:bg-white/10 outline-none font-mono transition-colors text-sm"
                                                    />
                                                </div>
                                                <div className="col-span-1 flex justify-end">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const tiers = [...formData.ticket_tiers];
                                                            tiers.splice(idx, 1);
                                                            setFormData(prev => ({ ...prev, ticket_tiers: tiers }));
                                                        }}
                                                        className="p-2 text-white/20 hover:text-red-400 transition-colors"
                                                        title="Remove Tier"
                                                    >
                                                        <TrashIcon className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}



                        {/* Registration Form Builder - Only if RSVP or Tickets */}
                        {(formData.settings.pricing_format === 'rsvp' || formData.settings.pricing_format === 'tickets') && (
                            <div className="md:col-span-2 space-y-4 pt-8">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-xs font-black text-white/60 uppercase tracking-widest">Registration Form (Optional)</h4>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger type="button" className="cursor-help">
                                                        <InformationCircleIcon className="w-4 h-4 text-white/40 hover:text-white transition-colors" />
                                                    </TooltipTrigger>
                                                    <TooltipContent className="bg-zinc-900 text-white rounded-none p-3 max-w-xs shadow-xl z-50">
                                                        <p className="text-xs font-medium tracking-normal normal-case">Collect custom information from attendees during registration (e.g., dietary needs, how they found out, etc).</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                        <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Define custom fields for your registration form.</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const fields = [...(formData.settings?.custom_form || [])];
                                            fields.push({
                                                id: 'field_' + Math.random().toString(36).substring(2, 9),
                                                label: '',
                                                type: 'text',
                                                required: false
                                            });
                                            setFormData(prev => ({ ...prev, settings: { ...prev.settings, custom_form: fields } }));
                                        }}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-white/5 text-white/60 hover:text-white hover:bg-white/10 text-[10px] uppercase font-black tracking-widest transition-colors"
                                    >
                                        <PlusIcon className="w-3 h-3" /> Add Field
                                    </button>
                                </div>

                                {formData.settings?.custom_form?.length > 0 && (
                                    <div className="space-y-4">
                                        {formData.settings.custom_form.map((field, idx) => (
                                            <div key={field.id} className="bg-white/5 p-6 space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <label className="block text-[10px] uppercase font-black tracking-widest text-white/40">Field Label</label>
                                                        <input
                                                            type="text"
                                                            value={field.label}
                                                            onChange={e => {
                                                                const fields = [...formData.settings.custom_form];
                                                                fields[idx].label = e.target.value;
                                                                setFormData(prev => ({ ...prev, settings: { ...prev.settings, custom_form: fields } }));
                                                            }}
                                                            className="w-full bg-white/5 px-3 py-2 text-white focus:bg-white/10 outline-none transition-colors text-sm"
                                                            placeholder="e.g. Dietary Requirements"
                                                            required
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="block text-[10px] uppercase font-black tracking-widest text-white/40">Type</label>
                                                        <select
                                                            value={field.type}
                                                            onChange={e => {
                                                                const fields = [...formData.settings.custom_form];
                                                                fields[idx].type = e.target.value as any;
                                                                setFormData(prev => ({ ...prev, settings: { ...prev.settings, custom_form: fields } }));
                                                            }}
                                                            className="w-full bg-white/5 px-3 py-2 text-white focus:bg-white/10 outline-none transition-colors text-sm uppercase"
                                                        >
                                                            <option value="text">Short Text</option>
                                                            <option value="textarea">Long Text</option>
                                                            <option value="select">Dropdown</option>
                                                            <option value="checkbox">Checkbox</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                {field.type === 'select' && (
                                                    <div className="space-y-2">
                                                        <label className="block text-[10px] uppercase font-black tracking-widest text-white/40">Options (Comma separated)</label>
                                                        <input
                                                            type="text"
                                                            value={field.options?.join(', ') || ''}
                                                            onChange={e => {
                                                                const fields = [...formData.settings.custom_form];
                                                                fields[idx].options = e.target.value.split(',').map(s => s.trim()).filter(s => s !== '');
                                                                setFormData(prev => ({ ...prev, settings: { ...prev.settings, custom_form: fields } }));
                                                            }}
                                                            className="w-full bg-white/5 px-3 py-2 text-white focus:bg-white/10 outline-none transition-colors text-sm"
                                                            placeholder="Option 1, Option 2, Option 3"
                                                            required
                                                        />
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between pt-2">
                                                    <label className="flex items-center gap-2 cursor-pointer group">
                                                        <input
                                                            type="checkbox"
                                                            className="sr-only"
                                                            checked={field.required}
                                                            onChange={e => {
                                                                const fields = [...formData.settings.custom_form];
                                                                fields[idx].required = e.target.checked;
                                                                setFormData(prev => ({ ...prev, settings: { ...prev.settings, custom_form: fields } }));
                                                            }}
                                                        />
                                                        <div className={`w-4 h-4 flex items-center justify-center transition-colors ${field.required ? 'bg-white' : 'bg-white/10 group-hover:bg-white/20'}`}>
                                                            {field.required && <PlusIcon className="w-3 h-3 text-black rotate-45" />}
                                                        </div>
                                                        <span className="text-[10px] uppercase font-black tracking-widest text-white/40">Required Field</span>
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const fields = [...formData.settings.custom_form];
                                                            fields.splice(idx, 1);
                                                            setFormData(prev => ({ ...prev, settings: { ...prev.settings, custom_form: fields } }));
                                                        }}
                                                        className="text-[10px] uppercase font-black tracking-widest text-red-500/60 hover:text-red-500 transition-colors flex items-center gap-1"
                                                    >
                                                        <TrashIcon className="w-3 h-3" /> Remove
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Image URL */}
                        <div className="space-y-2">
                            <label className="block text-xs font-black text-white/60 uppercase tracking-widest">
                                Featured Image URL
                            </label>
                            <input
                                type="url"
                                value={formData.image_url}
                                onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                                className="w-full bg-white/5 px-4 py-3 text-white focus:bg-white/10 outline-none transition-colors"
                                placeholder="https://example.com/image.jpg"
                            />
                            {formData.image_url && (
                                <div className="mt-4 aspect-video w-full max-w-sm overflow-hidden bg-black/50">
                                    <img
                                        src={formData.image_url}
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                        onError={(e) => (e.currentTarget.style.display = 'none')}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Submit Button */}
                        <div className="pt-8">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 px-8 bg-white text-black font-black uppercase tracking-[0.2em] text-sm hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                            >
                                {loading ? (
                                    <>
                                        <LoadingSpinner />
                                        <span>Submitting...</span>
                                    </>
                                ) : (
                                    'Submit for Review'
                                )}
                            </button>
                            <p className="text-center text-[10px] text-white/40 uppercase tracking-widest mt-4">
                                By submitting, you agree to our terms of service regarding event hosting.
                            </p>
                        </div>

                    </form>
                </div>
            </div>
        </>
    );
}
