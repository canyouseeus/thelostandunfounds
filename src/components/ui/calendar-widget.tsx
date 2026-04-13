import React, { useState } from 'react';
import { cn } from './utils';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

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
    const [viewDate, setViewDate] = useState(startDate || today);

    const currentMonth = viewDate.toLocaleString('default', { month: 'long' }).toUpperCase();
    const currentYear = viewDate.getFullYear();
    const currentDay = today.getDate();
    const isCurrentMonth = viewDate.getMonth() === today.getMonth() && viewDate.getFullYear() === today.getFullYear();

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

    const normalize = (d: Date) => {
        const copy = new Date(d);
        copy.setHours(0, 0, 0, 0);
        return copy;
    };

    const getDayDate = (day: number) => normalize(new Date(currentYear, viewDate.getMonth(), day));

    const startNorm = startDate ? normalize(startDate) : null;
    const endNorm = endDate ? normalize(endDate) : null;

    const isStart = (day: number) => !!startNorm && getDayDate(day).getTime() === startNorm.getTime();
    const isEnd = (day: number) => !!endNorm && getDayDate(day).getTime() === endNorm.getTime();
    const isInRange = (day: number) => {
        if (!startNorm || !endNorm) return false;
        const d = getDayDate(day);
        return d > startNorm && d < endNorm;
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

                {/* Grid — no gap-x so range fill is seamless between cells */}
                <div className="grid grid-cols-7 text-center">
                    {weekDays.map((d, i) => (
                        <div key={`${d}-${i}`} className="text-[10px] text-white/30 font-medium h-8 flex items-center justify-center">
                            {d}
                        </div>
                    ))}

                    {blanks.map(i => (
                        <div key={`blank-${i}`} className="h-8" />
                    ))}

                    {days.map(d => {
                        const dayIsStart = isStart(d);
                        const dayIsEnd = isEnd(d);
                        const dayInRange = isInRange(d);
                        const selected = dayIsStart || dayIsEnd;
                        const isToday = isCurrentMonth && d === currentDay;
                        const hasRange = !!(startNorm && endNorm && startNorm.getTime() !== endNorm.getTime());

                        return (
                            <div key={d} className="relative h-8 flex items-center justify-center">
                                {/* Airbnb-style pill fill — transparent band connecting start→end */}
                                {hasRange && (dayIsStart || dayIsEnd || dayInRange) && (
                                    <div
                                        className={cn(
                                            "absolute inset-y-[5px] bg-transparent border-y border-white/20",
                                            dayInRange && "inset-x-0",
                                            dayIsStart && !dayIsEnd && "left-1/2 right-0",
                                            dayIsEnd && !dayIsStart && "left-0 right-1/2",
                                        )}
                                    />
                                )}

                                <button
                                    disabled={!interactive}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (interactive && onDateSelect) {
                                            onDateSelect(new Date(currentYear, viewDate.getMonth(), d));
                                        }
                                    }}
                                    className={cn(
                                        "relative z-10 w-7 h-7 flex items-center justify-center text-xs font-mono transition-all rounded-full",
                                        !interactive && "cursor-default",
                                        selected
                                            ? "bg-white text-black font-bold"
                                            : dayInRange
                                                ? "text-white"
                                                : isToday
                                                    ? "text-white font-semibold"
                                                    : "text-white/60",
                                        interactive && !selected && "cursor-pointer hover:bg-white/15 hover:text-white",
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
