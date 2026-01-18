
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from './utils';
import { Play, Pause, RotateCcw } from 'lucide-react';

type ClockMode = 'clock' | 'stopwatch' | 'timer';
type TimerState = 'set' | 'countdown' | 'running';

interface ClockWidgetProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

export function ClockWidget({ className, size = 'md' }: ClockWidgetProps) {
    const [mode, setMode] = useState<ClockMode>('clock');

    // --- Clock State ---
    const [time, setTime] = useState(new Date());
    const [isDigital, setIsDigital] = useState(false); // Toggle between analog/digital in clock mode
    const [is24Hour, setIs24Hour] = useState(false); // 24h format toggle

    // --- Stopwatch State ---
    const [swElapsed, setSwElapsed] = useState(0);
    const [swRunning, setSwRunning] = useState(false);
    const swStartRef = useRef<number>(0);

    // --- Timer State ---
    const [timerState, setTimerState] = useState<TimerState>('set');
    const [timerInput, setTimerInput] = useState('');
    const [timerDuration, setTimerDuration] = useState(0);
    const [timerRemaining, setTimerRemaining] = useState(0);
    const [timerRunning, setTimerRunning] = useState(false);
    const [countdownVal, setCountdownVal] = useState(0);
    const [alarmTriggered, setAlarmTriggered] = useState(false);

    // Refs
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Init Audio & Clock Tick
    useEffect(() => {
        audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH+LkZSPiX51c3Z8goaGhYJ9eXZ0dXh7foCBgYB+fHp5eXp7fH5/gIB/fn18e3t7fH1+f4CAgH9+fXx7e3t8fX5/gICAf359fHt7e3x9fn+AgIB/fn18e3t7fH1+f4CAgH9+fXx7e3t8fX5/gICAf359fHt7e3x9fn+AgIB/fn18');

        const clockTimer = setInterval(() => {
            setTime(new Date());
        }, 1000);
        return () => {
            clearInterval(clockTimer);
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    // --- STOPWATCH LOGIC ---
    useEffect(() => {
        if (mode === 'stopwatch' && swRunning) {
            swStartRef.current = Date.now() - swElapsed;
            intervalRef.current = setInterval(() => {
                setSwElapsed(Date.now() - swStartRef.current);
            }, 30);
        } else if (mode === 'stopwatch' && !swRunning) {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
    }, [mode, swRunning]);

    // --- TIMER LOGIC ---
    useEffect(() => {
        if (mode === 'timer') {
            if (timerState === 'countdown' && countdownVal > 0) {
                const id = setTimeout(() => setCountdownVal(c => c - 1), 1000);
                return () => clearTimeout(id);
            } else if (timerState === 'countdown' && countdownVal === 0) {
                setTimerState('running');
                setTimerRunning(true);
                setTimerRemaining(timerDuration);
            }

            if (timerState === 'running' && timerRunning && timerRemaining > 0) {
                const endTime = Date.now() + timerRemaining;
                intervalRef.current = setInterval(() => {
                    const left = endTime - Date.now();
                    if (left <= 0) {
                        setTimerRemaining(0);
                        setTimerRunning(false);
                        setAlarmTriggered(true);
                        audioRef.current?.play();
                        clearInterval(intervalRef.current!);
                    } else {
                        setTimerRemaining(left);
                    }
                }, 100);
            }
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [mode, timerState, countdownVal, timerRunning, timerDuration]);

    useEffect(() => {
        if (mode === 'timer' && timerState === 'set') {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [mode, timerState]);


    // --- HELPERS ---
    const formatStopwatch = (ms: number) => {
        const totalSec = Math.floor(ms / 1000);
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        const cs = Math.floor((ms % 1000) / 10);
        return {
            left: m,
            right: `${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`
        };
    };

    const formatTimer = (ms: number) => {
        const totalSec = Math.ceil(ms / 1000);
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        return {
            left: m,
            right: s.toString().padStart(2, '0')
        };
    };

    const cycleMode = () => {
        if (mode === 'clock') setMode('stopwatch');
        else if (mode === 'stopwatch') setMode('timer');
        else setMode('clock');
    };

    // --- HANDLERS ---
    const handleSwToggle = () => setSwRunning(!swRunning);
    const handleSwReset = () => {
        setSwRunning(false);
        setSwElapsed(0);
    };

    const handleTimerSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const mins = parseInt(timerInput, 10);
        if (!isNaN(mins) && mins > 0) {
            setTimerDuration(mins * 60 * 1000);
            setCountdownVal(3);
            setTimerState('countdown');
        }
    };

    const handleTimerReset = () => {
        setTimerRunning(false);
        setAlarmTriggered(false);
        setTimerState('set');
        setTimerInput('');
        setTimerRemaining(0);
        audioRef.current?.pause();
        if (audioRef.current) audioRef.current.currentTime = 0;
    };


    // --- RENDER PARTS ---
    const hours = time.getHours();
    const minutes = time.getMinutes();
    const seconds = time.getSeconds();

    // Analog Calcs
    const secondDeg = (seconds / 60) * 360;
    const minuteDeg = ((minutes + seconds / 60) / 60) * 360;
    const hourDeg = ((hours % 12 + minutes / 60) / 12) * 360;

    // Digital Calcs for Clock
    const dh = is24Hour ? hours.toString().padStart(2, '0') : (hours % 12 || 12);
    const dm = minutes.toString().padStart(2, '0');
    const ds = seconds.toString().padStart(2, '0');
    const ampm = is24Hour ? '' : (hours >= 12 ? 'PM' : 'AM');

    // Values for Unified Display
    let leftDisplay: React.ReactNode = '';
    let rightDisplay: React.ReactNode = '';
    let showColon = true;
    let extraRight: React.ReactNode = null; // Seconds or decimals that sit next to right pane

    if (mode === 'clock') {
        leftDisplay = dh;
        rightDisplay = dm;
        extraRight = (
            <div className="absolute left-full top-0 ml-1 flex flex-col items-start leading-none">
                <span className={cn(
                    "text-[10px] font-bold text-white/30 mb-[2px]",
                    is24Hour ? "opacity-0" : "opacity-100"
                )}>{ampm}</span>
                <span className="text-xl font-mono text-white/40 tabular-nums">:{ds}</span>
            </div>
        );
    } else if (mode === 'stopwatch') {
        const { left, right } = formatStopwatch(swElapsed);
        leftDisplay = left;
        rightDisplay = right;
    } else if (mode === 'timer') {
        if (timerState === 'set') {
            showColon = false; // Custom input view
        } else if (timerState === 'countdown') {
            showColon = false; // Countdown view
        } else {
            const { left, right } = formatTimer(timerRemaining);
            leftDisplay = left;
            rightDisplay = right;
        }
    }


    // Unified render component for digits
    const UnifiedDigits = () => (
        <div className="relative flex items-center justify-center gap-1 tabular-nums select-none">
            {/* Left Pane */}
            <span className="text-5xl font-mono font-bold text-white tracking-tight tabular-nums">
                {leftDisplay}
            </span>

            {/* Colon */}
            {showColon && <span className="text-5xl font-mono font-bold text-white tracking-tight">:</span>}

            {/* Right Pane */}
            <div className="relative text-5xl font-mono font-bold text-white tracking-tight tabular-nums flex items-baseline">
                {rightDisplay}
                {/* Absolute Indicators */}
                {extraRight}
            </div>
        </div>
    );


    return (
        <div className={cn(
            'bg-black relative overflow-hidden flex flex-col select-none',
            'min-h-[200px]', // Ensure enough height
            className
        )}>
            {/* Top Label - Mode Switcher */}
            <div
                onClick={cycleMode}
                className="absolute top-4 left-0 right-0 text-center z-20 hover:cursor-pointer"
            >
                <span className="text-[10px] tracking-[0.2em] font-medium text-white/30 uppercase hover:text-white transition-colors">
                    {mode === 'clock' ? 'CLOCK' : mode === 'stopwatch' ? 'STOPWATCH' : 'TIMER'}
                </span>
            </div>

            {/* Main Display Area */}
            <div className="flex-1 relative flex items-center justify-center">

                {/* 1. CLOCK VIEW (Analog or Digital) */}
                <div className={cn(
                    "absolute inset-0 transition-opacity duration-300",
                    mode === 'clock' ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}>
                    {/* Analog Face */}
                    <div
                        className={cn("absolute inset-0 w-full h-full transition-opacity duration-500", !isDigital ? "opacity-100" : "opacity-0")}
                        onClick={() => setIsDigital(true)}
                    >
                        {/* Clock Face Border */}
                        <div className="absolute inset-2 border-2 border-white/20 rounded-full" />

                        {/* Hands - Flat Design, No Shadows */}
                        <div className="relative w-full h-full">
                            <div className="absolute top-1/2 left-1/2 w-2 h-2 -mt-1 -ml-1 rounded-full bg-white z-10" />
                            <div className="absolute left-1/2 bottom-1/2 origin-bottom w-[3px] h-[28%] bg-white transition-transform duration-500" style={{ transform: `translateX(-50%) rotate(${hourDeg}deg)` }} />
                            <div className="absolute left-1/2 bottom-1/2 origin-bottom w-[2px] h-[38%] bg-white transition-transform duration-500" style={{ transform: `translateX(-50%) rotate(${minuteDeg}deg)` }} />
                            <div className="absolute left-1/2 bottom-1/2 origin-bottom w-[1px] h-[42%] bg-white/40" style={{ transform: `translateX(-50%) rotate(${secondDeg}deg)` }} />
                        </div>
                    </div>

                    {/* Digital Clock View */}
                    <div
                        className={cn("absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-300", isDigital ? "opacity-100" : "opacity-0")}
                        onClick={() => setIsDigital(false)}
                    >
                        <div onClick={(e) => { e.stopPropagation(); setIs24Hour(!is24Hour); }} className="cursor-pointer hover:opacity-80 transition-opacity">
                            <UnifiedDigits />
                        </div>
                    </div>
                </div>

                {/* 2. STOPWATCH VIEW */}
                <div className={cn(
                    "absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-300",
                    mode === 'stopwatch' ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}>
                    {/* Stopwatch Digits */}
                    <UnifiedDigits />

                    {/* Controls */}
                    <div className="absolute bottom-6 flex items-center gap-4">
                        <button onClick={handleSwToggle} className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all">
                            {swRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
                        </button>
                        <button onClick={handleSwReset} className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all">
                            <RotateCcw className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* 3. TIMER VIEW */}
                <div className={cn(
                    "absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-300",
                    mode === 'timer' ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}>
                    {timerState === 'set' && (
                        <form onSubmit={handleTimerSubmit} className="flex flex-col items-center h-full justify-center relative">
                            <div className="flex items-center relative">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={timerInput}
                                    onChange={(e) => setTimerInput(e.target.value.replace(/\D/g, '').slice(0, 3))}
                                    placeholder="0"
                                    className="w-24 bg-transparent text-center text-5xl font-mono font-bold text-white focus:outline-none placeholder:text-white/20"
                                    autoFocus={mode === 'timer' && timerState === 'set'}
                                />
                                {/* Absolute positioned label so it doesn't shift input */}
                                <span className="absolute left-full top-1/2 -translate-y-1/2 text-white/40 text-sm ml-2">MIN</span>
                            </div>
                            {/* Absolute positioned button at bottom so it doesn't shift numbers */}
                            <button type="submit" className="absolute bottom-6 text-xs text-white/40 hover:text-white uppercase tracking-widest border border-white/20 px-3 py-1 rounded-full hover:cursor-pointer">
                                START
                            </button>
                        </form>
                    )}

                    {timerState === 'countdown' && (
                        <div className="text-5xl font-mono font-bold text-white animate-pulse">{countdownVal}</div>
                    )}

                    {timerState === 'running' && (
                        <>
                            <div className={cn("transition-colors", alarmTriggered ? "text-red-500" : "text-white")}>
                                <UnifiedDigits />
                            </div>

                            {/* Alarm Indicator - Absolute at bottom or top, not flowing */}
                            {alarmTriggered && <div className="absolute top-[65%] text-red-500 text-xs font-bold uppercase tracking-widest animate-pulse">TIME IS UP</div>}

                            <div className="absolute bottom-6 flex items-center gap-4">
                                {!alarmTriggered && (
                                    <button onClick={() => setTimerRunning(!timerRunning)} className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all">
                                        {timerRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
                                    </button>
                                )}
                                <button onClick={handleTimerReset} className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all">
                                    <RotateCcw className="w-4 h-4" />
                                </button>
                            </div>
                        </>
                    )}
                </div>

            </div>
        </div>
    );
}
