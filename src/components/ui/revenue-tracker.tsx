/**
 * RevenueTracker - Hero component for admin dashboard
 * Displays total revenue with time period toggle and expandable charts
 */

import React, { useState } from 'react';
import {
    ChevronDownIcon,
    ChevronRightIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { AnimatedNumber } from './animated-number';
import { DashboardCharts } from '../admin/DashboardCharts';
import { cn } from './utils';

type TimePeriod = 'all' | 'yearly' | 'ninetyDay' | 'sixtyDay' | 'monthly' | 'weekly' | 'daily';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Length of each bounded period. 'all' is excluded — it has no fixed span. */
const PERIOD_MS: Record<Exclude<TimePeriod, 'all'>, number> = {
    daily: DAY_MS,
    weekly: 7 * DAY_MS,
    monthly: 30 * DAY_MS,
    sixtyDay: 60 * DAY_MS,
    ninetyDay: 90 * DAY_MS,
    yearly: 365 * DAY_MS,
};

interface RevenueTrackerProps {
    affiliateRevenue: number;
    galleryRevenue: number;
    subscriberRevenue: number;
    bookingRevenue?: number;
    galleryPhotoCount?: number;
    usersCount?: number;
    history?: {
        revenue: (string | { date: string; amount: number })[];
        newsletter: string[];
        affiliates: string[];
        bookings?: (string | { date: string; amount: number })[];
    };
    stats?: {
        revenue: number;
        newsletter: number;
        affiliates: number;
        bookings?: number;
    };
}

export function RevenueTracker({
    affiliateRevenue = 0,
    galleryRevenue = 0,
    subscriberRevenue = 0,
    bookingRevenue = 0,
    galleryPhotoCount = 0,
    usersCount = 0,
    history,
    stats,
}: RevenueTrackerProps) {
    const [timePeriod, setTimePeriod] = useState<TimePeriod>('all');
    const [isExpanded, setIsExpanded] = useState(true);

    const totalRevenue = affiliateRevenue + galleryRevenue + subscriberRevenue + bookingRevenue;

    const sumBetween = (startTime: number, endTime: number) => {
        if (!history?.revenue) return 0;
        return history.revenue
            .map(item =>
                typeof item === 'string'
                    ? { time: new Date(item).getTime(), amount: 0 }
                    : { time: new Date(item.date).getTime(), amount: item.amount },
            )
            .filter(item => item.time >= startTime && item.time < endTime)
            .reduce((sum, item) => sum + item.amount, 0);
    };

    // Revenue inside the selected window. ALL TIME uses the live totals rather
    // than history, so it stays correct even if history is empty.
    const getDisplayRevenue = () => {
        if (timePeriod === 'all') return totalRevenue;
        if (!history || !history.revenue || history.revenue.length === 0) return 0;
        const now = Date.now();
        return sumBetween(now - PERIOD_MS[timePeriod], now);
    };

    /**
     * Period-over-period change: this window vs the immediately preceding
     * window of equal length.
     *
     * Growing from a zero baseline has no defined percentage, so the gain
     * itself is reported as the percentage: $0 last week to $270 this week
     * reads +270%. Only two cases render nothing: ALL TIME (no prior period
     * exists) and zero-to-zero (nothing happened either side).
     */
    const getPeriodChange = (): { pct: number; up: boolean } | null => {
        if (timePeriod === 'all') return null;

        const span = PERIOD_MS[timePeriod];
        const now = Date.now();
        const current = sumBetween(now - span, now);
        const previous = sumBetween(now - 2 * span, now - span);

        if (previous === 0) {
            if (current === 0) return null;
            return { pct: current, up: true };
        }

        const pct = ((current - previous) / previous) * 100;
        return { pct, up: pct >= 0 };
    };

    const periodChange = getPeriodChange();

    const periods: { key: TimePeriod; label: string }[] = [
        { key: 'all', label: 'ALL TIME' },
        { key: 'yearly', label: 'YTD' },
        { key: 'ninetyDay', label: '90D' },
        { key: 'sixtyDay', label: '60D' },
        { key: 'monthly', label: 'MTD' },
        { key: 'weekly', label: '7D' },
        { key: 'daily', label: '24H' },
    ];

    return (
        <div className="w-full mb-0 md:mb-6 relative z-10">
            {/* Hero Revenue Section */}
            <div
                className={cn(
                    'bg-black transition-all duration-300',
                    isExpanded && 'bg-black'
                )}
            >
                {/* Main Revenue Display Container */}
                <div className="relative overflow-hidden flex flex-col">

                    {/* Time Period Selector - Horizontal, Scrollable on mobile */}
                    <div className="flex items-center justify-center gap-1 py-4 px-4 overflow-x-auto scrollbar-hide">
                        {periods.map((period) => (
                            <button
                                key={period.key}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setTimePeriod(period.key);
                                }}
                                className={cn(
                                    'px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap',
                                    timePeriod === period.key
                                        ? 'text-black bg-white'
                                        : 'text-white/40 hover:text-white hover:bg-white/10'
                                )}
                            >
                                {period.label}
                            </button>
                        ))}
                    </div>

                    {/* Main Revenue Data - Centered */}
                    <div className="flex flex-col items-center justify-center py-8 px-4">
                        {/* Label */}
                        <div className="flex items-center gap-2 mb-4">
                            <CurrencyDollarIcon className="w-4 h-4 text-white/50" />
                            <span className="text-xs text-white/40 uppercase tracking-[0.2em] font-medium">
                                Total Revenue
                            </span>
                        </div>

                        {/* Number Group - Responsive sizing */}
                        <div className="flex items-baseline justify-center gap-2">
                            <span className="text-3xl md:text-5xl font-medium text-white/40">$</span>
                            <span className="text-5xl sm:text-6xl md:text-8xl font-black text-white font-mono tracking-tighter">
                                <AnimatedNumber value={getDisplayRevenue()} />
                            </span>
                            {periodChange && (
                                <div
                                    className={`flex items-center gap-1 ml-2 ${periodChange.up ? 'text-green-400' : 'text-red-400'}`}
                                    title={`vs previous ${periods.find(p => p.key === timePeriod)?.label ?? 'period'}`}
                                >
                                    {periodChange.up ? (
                                        <ArrowTrendingUpIcon className="w-4 h-4 md:w-5 md:h-5" />
                                    ) : (
                                        <ArrowTrendingDownIcon className="w-4 h-4 md:w-5 md:h-5" />
                                    )}
                                    <span className="text-sm md:text-lg font-bold font-mono">
                                        {periodChange.up ? '+' : ''}{periodChange.pct.toFixed(0)}%
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Revenue Breakdown - Responsive Grid */}
                    <div className="grid grid-cols-4 gap-2 md:gap-4 py-4 px-4 bg-white/[0.02]">
                        <div className="text-center">
                            <div className="text-[9px] md:text-[10px] text-white/40 uppercase tracking-wider mb-1">Gallery</div>
                            <div className="text-lg md:text-xl font-bold text-white font-mono">
                                $<AnimatedNumber value={galleryRevenue} decimals={0} />
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-[9px] md:text-[10px] text-white/40 uppercase tracking-wider mb-1">Affiliates</div>
                            <div className="text-lg md:text-xl font-bold text-white font-mono">
                                $<AnimatedNumber value={affiliateRevenue} decimals={0} />
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-[9px] md:text-[10px] text-white/40 uppercase tracking-wider mb-1">Subs</div>
                            <div className="text-lg md:text-xl font-bold text-white font-mono">
                                $<AnimatedNumber value={subscriberRevenue} decimals={0} />
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-[9px] md:text-[10px] text-amber-400/70 uppercase tracking-wider mb-1">Bookings</div>
                            <div className="text-lg md:text-xl font-bold text-amber-400 font-mono">
                                $<AnimatedNumber value={bookingRevenue} decimals={0} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Expandable Charts Section */}
                {isExpanded && (
                    <div className="pt-4 px-2 pb-4 md:p-6 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="h-56 md:h-80">
                            <DashboardCharts
                                stats={stats || {
                                    revenue: subscriberRevenue,
                                    newsletter: 0,
                                    affiliates: affiliateRevenue + galleryRevenue,
                                    bookings: bookingRevenue,
                                }}
                                history={history}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
