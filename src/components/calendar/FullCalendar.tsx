import React, { useState, useMemo } from 'react';
import { cn } from '../ui/utils';
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    CalendarIcon,
    PlusIcon,
    ClockIcon,
    ViewColumnsIcon,
    Squares2X2Icon
} from '@heroicons/react/24/outline';

type CalendarView = 'month' | 'week' | 'day';

interface CalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    className?: string;
    color?: string;
}

interface FullCalendarProps {
    events?: CalendarEvent[];
    onEventClick?: (event: CalendarEvent) => void;
    onDateSelect?: (date: Date) => void;
    className?: string;
}

export function FullCalendar({
    events = [],
    onEventClick,
    onDateSelect,
    className
}: FullCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<CalendarView>('month');

    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const hours = Array.from({ length: 24 }, (_, i) => i);

    // Navigation
    const next = () => {
        const newDate = new Date(currentDate);
        if (view === 'month') newDate.setMonth(currentDate.getMonth() + 1);
        else if (view === 'week') newDate.setDate(currentDate.getDate() + 7);
        else newDate.setDate(currentDate.getDate() + 1);
        setCurrentDate(newDate);
    };

    const prev = () => {
        const newDate = new Date(currentDate);
        if (view === 'month') newDate.setMonth(currentDate.getMonth() - 1);
        else if (view === 'week') newDate.setDate(currentDate.getDate() - 7);
        else newDate.setDate(currentDate.getDate() - 1);
        setCurrentDate(newDate);
    };

    const today = () => setCurrentDate(new Date());

    // Month Logic
    const monthData = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const days = [];
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = firstDay - 1; i >= 0; i--) {
            days.push({
                date: new Date(year, month - 1, prevMonthLastDay - i),
                currentMonth: false
            });
        }
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({
                date: new Date(year, month, i),
                currentMonth: true
            });
        }
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            days.push({
                date: new Date(year, month + 1, i),
                currentMonth: false
            });
        }
        return days;
    }, [currentDate]);

    // Week Logic
    const weekData = useMemo(() => {
        const start = new Date(currentDate);
        start.setDate(currentDate.getDate() - currentDate.getDay());
        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            days.push(d);
        }
        return days;
    }, [currentDate]);

    const renderMonthView = () => (
        <div className="grid grid-cols-7 h-full">
            {weekDays.map(day => (
                <div key={day} className="p-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/40 text-center">
                    {day}
                </div>
            ))}
            {monthData.map((day, idx) => {
                const isToday = day.date.toDateString() === new Date().toDateString();
                const dayEvents = events.filter(e => e.start.toDateString() === day.date.toDateString());

                return (
                    <div
                        key={idx}
                        className={cn(
                            "min-h-[140px] p-4 transition-colors group relative",
                            day.currentMonth ? "bg-black" : "bg-black opacity-20"
                        )}
                        onClick={() => onDateSelect?.(day.date)}
                    >
                        <div className="flex justify-center items-center mb-2">
                            <span className={cn(
                                "text-lg font-mono w-9 h-9 flex items-center justify-center rounded-none transition-all",
                                isToday ? "bg-white text-black font-black shadow-[0_0_20px_rgba(255,255,255,0.3)]" : day.currentMonth ? "text-white hover:bg-white/10" : "text-white/10"
                            )}>
                                {day.date.getDate()}
                            </span>
                        </div>

                        <div className="space-y-1">
                            {dayEvents.slice(0, 3).map(event => (
                                <div
                                    key={event.id}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEventClick?.(event);
                                    }}
                                    className={cn(
                                        "truncate text-[10px] p-1 rounded-none cursor-pointer transition-all hover:scale-[1.02]",
                                        event.className || "bg-white/10 text-white hover:bg-white/20"
                                    )}
                                    style={event.color ? { backgroundColor: `${event.color}20`, borderLeft: `2px solid ${event.color}`, color: event.color } : {}}
                                >
                                    {event.title}
                                </div>
                            ))}
                            {dayEvents.length > 3 && (
                                <div className="text-[9px] text-white/30 font-bold px-1">
                                    + {dayEvents.length - 3} more
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );

    const renderWeekView = () => (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex ml-16">
                {weekData.map((date, i) => (
                    <div key={i} className="flex-1 p-3 text-center">
                        <div className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1">{weekDays[date.getDay()]}</div>
                        <div className={cn(
                            "text-lg font-mono w-8 h-8 flex items-center justify-center mx-auto rounded-none",
                            date.toDateString() === new Date().toDateString() ? "bg-white text-black font-black" : "text-white"
                        )}>
                            {date.getDate()}
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto relative">
                <div className="flex h-[1440px]">
                    <div className="w-16 flex flex-col bg-black">
                        {hours.map(h => (
                            <div key={h} className="h-[60px] text-[10px] font-mono text-white/20 p-2 text-right">
                                {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
                            </div>
                        ))}
                    </div>
                    <div className="flex-1 flex relative gap-px">
                        {weekData.map((date, i) => (
                            <div key={i} className="flex-1 relative group day-column bg-black">
                                {hours.map(h => (
                                    <div key={h} className="h-[60px]" />
                                ))}
                                {events
                                    .filter(e => e.start.toDateString() === date.toDateString())
                                    .map(event => {
                                        const startMin = event.start.getHours() * 60 + event.start.getMinutes();
                                        const duration = Math.max(30, (event.end.getTime() - event.start.getTime()) / (1000 * 60));
                                        return (
                                            <div
                                                key={event.id}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onEventClick?.(event);
                                                }}
                                                className={cn(
                                                    "absolute left-1 right-1 p-2 rounded-none text-xs leading-none z-10 cursor-pointer shadow-xl backdrop-blur-sm transition-all hover:scale-[1.01] hover:z-20",
                                                    event.className || "bg-white/10 text-white border-white"
                                                )}
                                                style={{
                                                    top: `${startMin}px`,
                                                    height: `${duration}px`,
                                                    backgroundColor: event.color ? `${event.color}30` : undefined,
                                                    borderColor: event.color || undefined,
                                                    color: event.color || undefined
                                                }}
                                            >
                                                <div className="font-black text-[10px] mb-1 uppercase truncate">{event.title}</div>
                                                <div className="text-[9px] opacity-60">
                                                    {event.start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        );
                                    })
                                }
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderDayView = () => (
        <div className="h-full bg-black">
            <div className="flex flex-col h-full overflow-hidden">
                <div className="flex">
                    <div className="ml-16 flex-1 p-4 flex items-center gap-4">
                        <div className="text-3xl font-mono w-14 h-14 flex items-center justify-center rounded-none bg-white text-black font-black">
                            {currentDate.getDate()}
                        </div>
                        <div>
                            <div className="text-xs font-black uppercase tracking-[0.2em] text-white/40">{weekDays[currentDate.getDay()]}</div>
                            <div className="text-lg font-bold uppercase tracking-tight">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto relative">
                    <div className="flex h-[1440px]">
                        <div className="w-16 flex flex-col bg-black">
                            {hours.map(h => (
                                <div key={h} className="h-[60px] text-[10px] font-mono text-white/20 p-2 text-right">
                                    {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
                                </div>
                            ))}
                        </div>
                        <div className="flex-1 relative group">
                            {hours.map(h => (
                                <div key={h} className="h-[60px]" />
                            ))}
                            {events
                                .filter(e => e.start.toDateString() === currentDate.toDateString())
                                .map(event => {
                                    const startMin = event.start.getHours() * 60 + event.start.getMinutes();
                                    const duration = Math.max(40, (event.end.getTime() - event.start.getTime()) / (1000 * 60));
                                    return (
                                        <div
                                            key={event.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onEventClick?.(event);
                                            }}
                                            className={cn(
                                                "absolute left-4 right-4 p-4 rounded-none text-sm z-10 cursor-pointer shadow-2xl backdrop-blur-md transition-all hover:scale-[1.01]",
                                                event.className || "bg-white/10 text-white border-white"
                                            )}
                                            style={{
                                                top: `${startMin}px`,
                                                height: `${duration}px`,
                                                backgroundColor: event.color ? `${event.color}30` : undefined,
                                                borderColor: event.color || undefined,
                                                color: event.color || undefined
                                            }}
                                        >
                                            <div className="font-black text-xs mb-1 uppercase tracking-wider">{event.title}</div>
                                            <div className="text-xs opacity-60">
                                                {event.start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - {event.end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    );
                                })
                            }
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className={cn("flex flex-col h-full bg-black text-white font-sans", className)}>
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between p-8 gap-4 bg-black">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-black uppercase tracking-tighter">
                        {monthNames[currentDate.getMonth()]} <span className="text-white/60 font-mono text-sm ml-2">{currentDate.getFullYear()}</span>
                    </h2>
                    <div className="flex bg-black p-1">
                        <button onClick={prev} className="p-2 hover:bg-white/10 rounded-none transition-colors">
                            <ChevronLeftIcon className="w-5 h-5" />
                        </button>
                        <button onClick={today} className="px-4 py-1 text-xs font-bold uppercase tracking-widest hover:bg-white/10 rounded-none transition-colors">
                            Today
                        </button>
                        <button onClick={next} className="p-2 hover:bg-white/10 rounded-none transition-colors">
                            <ChevronRightIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex bg-black p-1 gap-1">
                    <button
                        onClick={() => setView('month')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-none text-xs font-bold uppercase tracking-widest transition-all",
                            view === 'month' ? "bg-white text-black" : "text-white/40 hover:bg-white/10"
                        )}
                    >
                        <Squares2X2Icon className="w-4 h-4" />
                        Month
                    </button>
                    <button
                        onClick={() => setView('week')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-none text-xs font-bold uppercase tracking-widest transition-all",
                            view === 'week' ? "bg-white text-black" : "text-white/40 hover:bg-white/10"
                        )}
                    >
                        <ViewColumnsIcon className="w-4 h-4" />
                        Week
                    </button>
                    <button
                        onClick={() => setView('day')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-none text-xs font-bold uppercase tracking-widest transition-all",
                            view === 'day' ? "bg-white text-black" : "text-white/40 hover:bg-white/10"
                        )}
                    >
                        <ClockIcon className="w-4 h-4" />
                        Day
                    </button>
                </div>
            </div>

            {/* Viewport */}
            <div className="flex-1 overflow-auto bg-black">
                {view === 'month' && renderMonthView()}
                {view === 'week' && renderWeekView()}
                {view === 'day' && renderDayView()}
            </div>
        </div>
    );
}
