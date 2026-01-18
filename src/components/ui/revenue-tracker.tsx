/**
 * RevenueTracker - Hero component for admin dashboard
 * Displays total revenue with time period toggle and expandable charts
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, TrendingUp, DollarSign } from 'lucide-react';
import { AnimatedNumber } from './animated-number';
import { DashboardCharts } from '../admin/DashboardCharts';
import { cn } from './utils';

type TimePeriod = 'all' | 'yearly' | 'monthly' | 'weekly' | 'daily';

interface RevenueTrackerProps {
    affiliateRevenue: number;
    galleryRevenue: number;
    subscriberRevenue: number;
    galleryPhotoCount?: number;
    usersCount?: number;
    history?: {
        revenue: string[];
        newsletter: string[];
        affiliates: string[];
    };
    stats?: {
        revenue: number;
        newsletter: number;
        affiliates: number;
    };
}

export function RevenueTracker({
    affiliateRevenue = 0,
    galleryRevenue = 0,
    subscriberRevenue = 0,
    galleryPhotoCount = 0,
    usersCount = 0,
    history,
    stats,
}: RevenueTrackerProps) {
    const [timePeriod, setTimePeriod] = useState<TimePeriod>('all');
    const [isExpanded, setIsExpanded] = useState(true);

    const totalRevenue = affiliateRevenue + galleryRevenue + subscriberRevenue;

    // For now, time period just shows total - will filter data when backend supports it
    const getDisplayRevenue = () => {
        // TODO: Filter by actual time periods when data supports it
        switch (timePeriod) {
            case 'daily':
                return totalRevenue * 0.03; // Placeholder
            case 'weekly':
                return totalRevenue * 0.15; // Placeholder
            case 'monthly':
                return totalRevenue * 0.4; // Placeholder
            case 'yearly':
                return totalRevenue * 0.9; // Placeholder
            case 'all':
            default:
                return totalRevenue;
        }
    };

    const periods: { key: TimePeriod; label: string }[] = [
        { key: 'all', label: 'ALL TIME' },
        { key: 'yearly', label: 'YTD' },
        { key: 'monthly', label: 'MTD' },
        { key: 'weekly', label: '7D' },
        { key: 'daily', label: '24H' },
    ];

    return (
        <div className="w-full mb-6 relative z-10">
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
                            <DollarSign className="w-4 h-4 text-white/50" />
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
                            {totalRevenue > 0 && (
                                <div className="flex items-center gap-1 text-green-400 ml-2">
                                    <TrendingUp className="w-4 h-4 md:w-5 md:h-5" />
                                    <span className="text-sm md:text-lg font-bold font-mono">+{((getDisplayRevenue() / totalRevenue) * 100).toFixed(0)}%</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Revenue Breakdown - Responsive Grid */}
                    <div className="grid grid-cols-3 gap-2 md:gap-4 py-4 px-4 bg-white/[0.02]">
                        <div className="text-center">
                            <div className="text-[9px] md:text-[10px] text-white/40 uppercase tracking-wider mb-1">Gallery</div>
                            <div className="text-lg md:text-xl font-bold text-white font-mono">
                                <AnimatedNumber value={galleryPhotoCount} />
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-[9px] md:text-[10px] text-white/40 uppercase tracking-wider mb-1">Affiliates</div>
                            <div className="text-lg md:text-xl font-bold text-white font-mono">
                                $<AnimatedNumber value={affiliateRevenue} decimals={0} />
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-[9px] md:text-[10px] text-white/40 uppercase tracking-wider mb-1">Users</div>
                            <div className="text-lg md:text-xl font-bold text-white font-mono">
                                <AnimatedNumber value={usersCount} />
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
