import React, { useState } from 'react';
import { cn } from './utils';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface CalendarWidgetProps {
    className?: string;
    startDate?: Date | null;
    endDate?: Date | null;
    onDateSelect?: (date: Date) => void;
    interactive?: boolean;
    viewDate?: Date;
    onMonthChange?: (d: Date) => void;
    dotsByDate?: Map<string, { bookings: number; events: number; photos: number; blocked: boolean }>;
    /**
     * 'default' (≈240px column, used in date pickers and sidebars) or
     * 'large' (scales up at md/lg breakpoints, for full-width admin master calendar).
     */
    size?: 'default' | 'large';
}

export function CalendarWidget({
    className,
    startDate,
    endDate,
    onDateSelect,
    interactive = false,
    viewDate: controlledViewDate,
    onMonthChange,
    dotsByDate,
    size = 'default',
}: CalendarWidgetProps) {
    const isLarge = size === 'large';
    const today = new Date();
    const [internalViewDate, setInternalViewDate] = useState(startDate || today);
    const viewDate = controlledViewDate ?? internalViewDate;

    const currentMonth = viewDate.toLocaleString('default', { month: 'long' }).toUpperCase();
    const currentYear = viewDate.getFullYear();
    const currentDay = today.getDate();
    const isCurrentMonth = viewDate.getMonth() === today.getMonth() && viewDate.getFullYear() === today.getFullYear();

    const daysInMonth = new Date(currentYear, viewDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, viewDate.getMonth(), 1).getDay();

    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

    const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    const navigate = (delta: number) => {
        const next = new Date(currentYear, viewDate.getMonth() + delta, 1);
        if (onMonthChange) onMonthChange(next);
        else setInternalViewDate(next);
    };

    const handlePrev = (e: React.MouseEvent) => { e.stopPropagation(); navigate(-1); };
    const handleNext = (e: React.MouseEvent) => { e.stopPropagation(); navigate(1); };

    const normalize = (d: Date) => {
        const copy = new Date(d);
        copy.setHours(0, 0, 0, 0);
        return copy;
    };

    const toYMD = (d: Date) => d.toLocaleDateString('en-CA');

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
        <div className={cn(
            "bg-black p-6 flex flex-col items-center justify-center",
            isLarge ? "min-h-[280px] md:min-h-[520px] lg:min-h-[640px]" : "min-h-[280px]",
            className,
        )}>
            <div className={cn("w-full", isLarge ? "max-w-[240px] md:max-w-[680px] lg:max-w-[920px]" : "max-w-[240px]")}>
                {/* Header */}
                <div className={cn("flex items-baseline justify-between pb-2 relative", isLarge ? "mb-6 md:mb-8" : "mb-6")}>
                    {interactive && (
                        <button onClick={handlePrev} className="p-1 hover:text-white text-white/40 transition-colors absolute -left-2">
                            <ChevronLeftIcon className={cn(isLarge ? "w-4 h-4 md:w-6 md:h-6" : "w-4 h-4")} />
                        </button>
                    )}
                    <div className={cn("flex-1 flex items-baseline justify-center", isLarge ? "gap-2 md:gap-3" : "gap-2")}>
                        <span className={cn("font-bold text-white tracking-tight", isLarge ? "text-xl md:text-3xl lg:text-4xl" : "text-xl")}>{currentMonth}</span>
                        <span className={cn("text-white/40 font-mono", isLarge ? "text-sm md:text-lg" : "text-sm")}>{currentYear}</span>
                    </div>
                    {interactive && (
                        <button onClick={handleNext} className="p-1 hover:text-white text-white/40 transition-colors absolute -right-2">
                            <ChevronRightIcon className={cn(isLarge ? "w-4 h-4 md:w-6 md:h-6" : "w-4 h-4")} />
                        </button>
                    )}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-7 text-center">
                    {weekDays.map((d, i) => (
                        <div key={`${d}-${i}`} className={cn("text-white/30 font-medium flex items-center justify-center", isLarge ? "text-[10px] md:text-xs lg:text-sm h-8 md:h-10" : "text-[10px] h-8")}>
                            {d}
                        </div>
                    ))}

                    {blanks.map(i => (
                        <div key={`blank-${i}`} className={cn(isLarge ? "h-10 md:h-16 lg:h-20" : "h-10")} />
                    ))}

                    {days.map(d => {
                        const dayIsStart = isStart(d);
                        const dayIsEnd = isEnd(d);
                        const dayInRange = isInRange(d);
                        const selected = dayIsStart || dayIsEnd;
                        const isToday = isCurrentMonth && d === currentDay;
                        const hasRange = !!(startNorm && endNorm && startNorm.getTime() !== endNorm.getTime());

                        const ymd = toYMD(new Date(currentYear, viewDate.getMonth(), d));
                        const dots = dotsByDate?.get(ymd);
                        const hasDots = dots && (dots.bookings > 0 || dots.events > 0 || dots.photos > 0 || dots.blocked);

                        return (
                            <div key={d} className={cn("relative flex flex-col items-center justify-start", isLarge ? "h-10 md:h-16 lg:h-20 pt-[3px] md:pt-2" : "h-10 pt-[3px]")}>
                                {/* Range fill */}
                                {hasRange && (dayIsStart || dayIsEnd || dayInRange) && (
                                    <div
                                        className={cn(
                                            "absolute bg-transparent border-y border-white/20",
                                            isLarge ? "top-[3px] bottom-[3px] md:top-2 md:bottom-2" : "top-[3px] bottom-[3px]",
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
                                        "relative z-10 flex items-center justify-center font-mono transition-all rounded-full",
                                        isLarge ? "w-7 h-7 md:w-11 md:h-11 lg:w-14 lg:h-14 text-xs md:text-base lg:text-lg" : "w-7 h-7 text-xs",
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

                                {/* Activity dots */}
                                {hasDots && (
                                    <div className={cn("flex items-center", isLarge ? "gap-[2px] md:gap-1 mt-[1px] md:mt-1" : "gap-[2px] mt-[1px]")}>
                                        {dots!.bookings > 0 && <span className={cn("bg-yellow-400 rounded-full", isLarge ? "w-[3px] h-[3px] md:w-[5px] md:h-[5px]" : "w-[3px] h-[3px]")} />}
                                        {dots!.events > 0 && <span className={cn("bg-green-400 rounded-full", isLarge ? "w-[3px] h-[3px] md:w-[5px] md:h-[5px]" : "w-[3px] h-[3px]")} />}
                                        {dots!.photos > 0 && <span className={cn("bg-white/60 rounded-full", isLarge ? "w-[3px] h-[3px] md:w-[5px] md:h-[5px]" : "w-[3px] h-[3px]")} />}
                                        {dots!.blocked && <span className={cn("bg-red-400 rounded-full", isLarge ? "w-[3px] h-[3px] md:w-[5px] md:h-[5px]" : "w-[3px] h-[3px]")} />}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
