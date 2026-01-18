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
                    // Removed hover states for flat design
                    isExpanded && 'bg-black'
                )}
            >
                {/* Main Revenue Display Container */}
                <div className="relative min-h-[220px] overflow-hidden flex flex-col justify-between pt-12">

                    {/* Date Toggles - Absolute Left */}
                    <div className="absolute left-6 top-8 flex flex-col gap-2 z-20">
                        {periods.map((period) => (
                            <button
                                key={period.key}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setTimePeriod(period.key);
                                }}
                                className={cn(
                                    'px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider transition-all text-left border-l-2',
                                    timePeriod === period.key
                                        ? 'border-white text-white pl-3'
                                        : 'border-transparent text-white/30 hover:text-white pl-3 hover:border-white/20'
                                )}
                            >
                                {period.label}
                            </button>
                        ))}
                    </div>

                    {/* Main Revenue Data - Centered in remaining space */}
                    <div className="flex-1 flex flex-col items-center justify-center py-8 z-10">
                        {/* Label */}
                        <div className="flex items-center gap-2 mb-3">
                            <DollarSign className="w-4 h-4 text-white/70" />
                            <span className="text-xs text-white/50 uppercase tracking-[0.2em] font-medium">
                                Total Revenue
                            </span>
                        </div>

                        {/* Number Group */}
                        <div className="flex items-baseline justify-center gap-1">
                            <span className="text-4xl md:text-5xl font-medium text-white/50 -translate-y-2">$</span>
                            <span className="text-6xl md:text-8xl font-black text-white font-mono tracking-tighter">
                                <AnimatedNumber value={getDisplayRevenue()} />
                            </span>
                            {totalRevenue > 0 && (
                                <div className="flex items-center gap-1 text-green-400 -mt-8">
                                    <TrendingUp className="w-5 h-5" />
                                    <span className="text-lg font-bold font-mono">+{((getDisplayRevenue() / totalRevenue) * 100).toFixed(0)}%</span>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-8 mt-4 text-xs font-mono text-white/30 uppercase tracking-widest hidden md:flex">
                            <span>Affiliate Profits <span className="text-white">${affiliateRevenue}</span></span>
                        </div>
                    </div>

                    {/* Revenue Breakdown - Bottom Grid */}
                    <div className="grid grid-cols-3 gap-4 pb-6 px-6 z-20 bg-black">
                        <div className="text-center group">
                            <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1 group-hover:text-white/60 transition-colors">Gallery Photos</div>
                            <div className="text-xl font-bold text-white font-mono">
                                <AnimatedNumber value={galleryPhotoCount} />
                            </div>
                        </div>
                        <div className="text-center group">
                            <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1 group-hover:text-white/60 transition-colors">Affiliate Profits</div>
                            <div className="text-xl font-bold text-white font-mono">
                                $<AnimatedNumber value={affiliateRevenue} decimals={0} />
                            </div>
                        </div>
                        <div className="text-center group">
                            <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1 group-hover:text-white/60 transition-colors">Users</div>
                            <div className="text-xl font-bold text-white font-mono">
                                <AnimatedNumber value={usersCount} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Expandable Charts Section */}
                {isExpanded && (
                    <div className="pt-4 px-4 pb-4 md:p-6 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="h-64 md:h-80">
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
