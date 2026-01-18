import React from 'react';
import { cn } from './utils';

export function CalendarWidget({ className }: { className?: string }) {
    const today = new Date();
    const currentMonth = today.toLocaleString('default', { month: 'long' }).toUpperCase();
    const currentYear = today.getFullYear();
    const currentDay = today.getDate();

    // Get days in month
    const daysInMonth = new Date(currentYear, today.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, today.getMonth(), 1).getDay();

    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

    const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    return (
        <div className={cn("bg-black p-6 flex flex-col items-center justify-center min-h-[280px]", className)}>
            <div className="w-full max-w-[240px]">
                {/* Header */}
                <div className="flex items-baseline justify-between mb-6 border-b border-white/10 pb-2">
                    <span className="text-xl font-bold text-white tracking-tight">{currentMonth}</span>
                    <span className="text-sm text-white/40 font-mono">{currentYear}</span>
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
                    {days.map(d => (
                        <div key={d} className="flex items-center justify-center">
                            <div className={cn(
                                "w-7 h-7 flex items-center justify-center text-xs font-mono transition-all rounded-full",
                                d === currentDay
                                    ? "bg-white text-black font-bold shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                                    : "text-white/60 hover:text-white"
                            )}>
                                {d}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
