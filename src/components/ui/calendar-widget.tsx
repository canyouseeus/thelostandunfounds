import React, { useState } from 'react';
import { cn } from './utils';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'; // Assumed available, or I'll use text arrows if not

interface CalendarWidgetProps {
    className?: string;
    startDate?: Date | null;
    endDate?: Date | null;
    onDateSelect?: (date: Date) => void;
    interactive?: boolean;
}

export function CalendarWidget({
    className,
    startDate,
    endDate,
    onDateSelect,
    interactive = false
}: CalendarWidgetProps) {
    const today = new Date();
    // State for navigation
    const [viewDate, setViewDate] = useState(startDate || today);

    const currentMonth = viewDate.toLocaleString('default', { month: 'long' }).toUpperCase();
    const currentYear = viewDate.getFullYear();
    const currentDay = today.getDate();
    const isCurrentMonth = viewDate.getMonth() === today.getMonth() && viewDate.getFullYear() === today.getFullYear();

    // Get days in month
    const daysInMonth = new Date(currentYear, viewDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, viewDate.getMonth(), 1).getDay();

    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

    const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    const handlePrev = (e: React.MouseEvent) => {
        e.stopPropagation();
        setViewDate(new Date(currentYear, viewDate.getMonth() - 1, 1));
    };

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        setViewDate(new Date(currentYear, viewDate.getMonth() + 1, 1));
    };

    const isSelected = (day: number) => {
        if (!startDate) return false;
        const d = new Date(currentYear, viewDate.getMonth(), day);
        // Reset times for comparison
        d.setHours(0, 0, 0, 0);
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);

        if (endDate) {
            const end = new Date(endDate);
            end.setHours(0, 0, 0, 0);
            return d.getTime() === start.getTime() || d.getTime() === end.getTime();
        }
        return d.getTime() === start.getTime();
    };

    const isInRange = (day: number) => {
        if (!startDate || !endDate) return false;
        const d = new Date(currentYear, viewDate.getMonth(), day);
        d.setHours(0, 0, 0, 0);
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(0, 0, 0, 0);
        return d > start && d < end;
    };

    return (
        <div className={cn("bg-black p-6 flex flex-col items-center justify-center min-h-[280px]", className)}>
            <div className="w-full max-w-[240px]">
                {/* Header */}
                <div className="flex items-baseline justify-between mb-6 pb-2 relative">
                    {interactive && (
                        <button onClick={handlePrev} className="p-1 hover:text-white text-white/40 transition-colors absolute -left-2">
                            <ChevronLeftIcon className="w-4 h-4" />
                        </button>
                    )}

                    <div className="flex-1 flex gap-2 items-baseline justify-center">
                        <span className="text-xl font-bold text-white tracking-tight">{currentMonth}</span>
                        <span className="text-sm text-white/40 font-mono">{currentYear}</span>
                    </div>

                    {interactive && (
                        <button onClick={handleNext} className="p-1 hover:text-white text-white/40 transition-colors absolute -right-2">
                            <ChevronRightIcon className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-7 gap-y-3 gap-x-1 text-center">
                    {weekDays.map((d, i) => (
                        <div key={`${d}-${i}`} className="text-[10px] text-white/30 font-medium mb-1">{d}</div>
                    ))}

                    {/* Blanks */}
                    {blanks.map(i => (
                        <div key={`blank-${i}`} />
                    ))}

                    {/* Days */}
                    {days.map(d => {
                        const selected = isSelected(d);
                        const inRange = isInRange(d);
                        const isToday = isCurrentMonth && d === currentDay;

                        return (
                            <div key={d} className="flex items-center justify-center">
                                <button
                                    disabled={!interactive}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (interactive && onDateSelect) {
                                            onDateSelect(new Date(currentYear, viewDate.getMonth(), d));
                                        }
                                    }}
                                    className={cn(
                                        "w-7 h-7 flex items-center justify-center text-xs font-mono transition-all rounded-full relative",
                                        !interactive && "cursor-default",
                                        interactive && "cursor-pointer hover:bg-white/10",
                                        selected
                                            ? "bg-white text-black font-bold shadow-[0_0_15px_rgba(255,255,255,0.3)] z-10"
                                            : isToday && !isInRange
                                                ? "text-white font-semibold"
                                                : "text-white/60 hover:text-white",
                                        inRange && !selected && "bg-white/10 text-white rounded-none w-full mx-[-2px]"
                                    )}
                                >
                                    {d}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
