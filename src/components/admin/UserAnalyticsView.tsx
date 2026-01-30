
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { LoadingSpinner } from '../Loading';
import { BookOpenIcon, BoltIcon, ClockIcon } from '@heroicons/react/24/outline';

interface AnalyticsEvent {
    id: string;
    event_type: string;
    resource_id: string;
    metadata: any;
    duration?: number;
    created_at: string;
}

export function UserAnalyticsView() {
    const [events, setEvents] = useState<AnalyticsEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadEvents();

        // Subscription for real-time updates
        const subscription = supabase
            .channel('analytics-updates')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'user_analytics' },
                (payload) => {
                    const newEvent = payload.new as AnalyticsEvent;
                    setEvents(prev => [newEvent, ...prev].slice(0, 50));
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const loadEvents = async () => {
        try {
            const { data, error } = await supabase
                .from('user_analytics')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            setEvents(data || []);
        } catch (error) {
            console.error('Error loading analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="flex justify-center p-8"><LoadingSpinner /></div>;

    if (events.length === 0) {
        return (
            <div className="text-center py-8 text-white/30 text-sm font-mono">
                No activity recorded yet.
            </div>
        );
    }

    return (
        <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {events.map((event) => (
                <div key={event.id} className="bg-white/[0.03] p-3 hover:border-white/30 transition-colors flex items-start gap-3">
                    <div className="mt-0.5">
                        {event.event_type === 'read_article' ? (
                            <BookOpenIcon className="w-3 h-3 text-green-400" />
                        ) : event.event_type === 'page_view' ? (
                            <ClockIcon className="w-3 h-3 text-blue-400" />
                        ) : (
                            <BoltIcon className="w-3 h-3 text-white/50" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs font-bold text-white uppercase tracking-wider">
                                {event.event_type.replace('_', ' ')}
                            </span>
                            <span className="text-[10px] text-white/30 font-mono">
                                {new Date(event.created_at).toLocaleTimeString()}
                            </span>
                        </div>
                        <p className="text-xs text-white/70 truncate mb-1">
                            {event.metadata?.title || event.resource_id}
                        </p>
                        {event.duration && (
                            <div className="text-[10px] text-white/40 font-mono">
                                Duration: {event.duration}s
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
