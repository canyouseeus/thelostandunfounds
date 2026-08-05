
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from './utils';
import { PlayIcon, PauseIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

type ClockMode = 'clock' | 'stopwatch' | 'timer';
type TimerState = 'set' | 'countdown' | 'running';

interface ClockWidgetProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg';
    /** Hide the CLOCK/STOPWATCH/TIMER caption for tight placements. */
    hideLabel?: boolean;
    /** Pin to clock mode — no stopwatch/timer cycling. For small, display-only
     *  placements like the site header where the extra controls don't fit. */
    lockMode?: boolean;
}

export function ClockWidget({ className, size = 'md', hideLabel = false, lockMode = false }: ClockWidgetProps) {
    // "lg" renders compact on mobile and full-size at md+, so it fits narrow
    // dashboard columns; other sizes keep the original fixed full-size layout.
    const responsive = size === 'lg';
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

    const toggleClockType = useCallback(() => {
        if (!isDigital) {
            setIsDigital(true);
            setIs24Hour(false);
        } else if (!is24Hour) {
            setIs24Hour(true);
        } else {
            setIsDigital(false);
            setIs24Hour(false);
        }
    }, [isDigital, is24Hour]);

    const cycleMode = () => {
        if (lockMode) return;
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
            // Inline, so the parent's `items-baseline` puts the seconds on the
            // same baseline as the hours and minutes. Absolutely positioning
            // this block against the bottom of the box aligned it to the
            // descender space under the digits instead, which left the seconds
            // sitting low. AM/PM rides above the seconds off the same box.
            <span
                style={{ fontSize: '6.5cqw', lineHeight: 1 }}
                className="relative ml-1 font-mono text-white/40 tabular-nums leading-none"
            >
                :{ds}
                <span
                    style={{ fontSize: '3.4cqw', lineHeight: 1 }}
                    className={cn("absolute bottom-full left-0 mb-[2px] font-bold text-white/30 leading-none",
                        is24Hour ? "opacity-0" : "opacity-100")}
                >{ampm}</span>
            </span>
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
    // 15% of the face's width. On a 358px 4x4 that is ~54px, close to the
    // text-5xl this replaces; on an 81px 1x1 it is ~12px, which fits.
    const digitStyle = { fontSize: '15cqw', lineHeight: 1 } as const;
    const digitSize = "";

    const UnifiedDigits = () => (
        <div className="relative flex items-center justify-center gap-1 tabular-nums select-none">
            {/* Left Pane */}
            <span style={digitStyle} className={cn(digitSize, "font-mono font-bold text-white tracking-tight tabular-nums")}>
                {leftDisplay}
            </span>

            {/* Colon */}
            {showColon && <span style={digitStyle} className={cn(digitSize, "font-mono font-bold text-white tracking-tight")}>:</span>}

            {/* Right Pane */}
            <div style={digitStyle} className={cn(digitSize, "relative font-mono font-bold text-white tracking-tight tabular-nums flex items-baseline")}>
                {rightDisplay}
                {/* Absolute Indicators */}
                {extraRight}
            </div>
        </div>
    );


    return (
        <div
            style={{ containerType: 'size' }}
            className={cn(
            'bg-black relative overflow-hidden flex flex-col select-none',
            responsive ? 'min-h-[120px] md:min-h-[200px]' : 'min-h-[200px]', // Ensure enough height
            className
        )}>
            {/* Main Display Area */}
            <div className="flex-1 relative flex items-center justify-center">

                {/* 1. CLOCK VIEW (Analog or Digital) */}
                {mode === 'clock' && (
                    <div className="absolute inset-0 animate-in fade-in duration-300">
                        {!isDigital ? (
                            /* Analog Face */
                            <div
                                // The mode label occupies a fixed band across
                                // the top; the dial insets past it so the 12
                                // o'clock mark doesn't run through the word.
                                className={cn(
                                    "absolute inset-0 flex items-center justify-center",
                                    !hideLabel && (responsive ? "pt-6 md:pt-12" : "pt-12"),
                                )}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleClockType();
                                }}
                            >
                              {/* The dial is locked square inside whatever box
                                  it is given. Hand lengths are percentages of
                                  the face, so a non-square container — the
                                  64x46 header slot, for one — stretched them
                                  into an ellipse. This keeps every proportion
                                  fixed at every size. */}
                              <div className="relative h-full aspect-square max-w-full max-h-full">
                                {/* The dial: twelve hour marks, four of them
                                    long. Without them a large clock is three
                                    lines on an empty field — at 4x4 it read as
                                    a blank tile beside a calendar's month grid.
                                    Every dimension is a percentage of the face,
                                    like the hands, so the dial is the same
                                    drawing at 81px and at 744px. */}
                                {Array.from({ length: 12 }, (_, i) => {
                                    const major = i % 3 === 0;
                                    return (
                                        <div
                                            key={i}
                                            className="absolute inset-0 pointer-events-none"
                                            style={{ transform: `rotate(${i * 30}deg)` }}
                                        >
                                            <span
                                                className="absolute left-1/2 bg-white"
                                                style={{
                                                    top: '3%',
                                                    width: major ? 'max(1px, 0.9%)' : 'max(1px, 0.45%)',
                                                    height: major ? '7%' : '4%',
                                                    marginLeft: major ? 'max(-0.5px, -0.45%)' : 'max(-0.5px, -0.225%)',
                                                    opacity: major ? 0.85 : 0.35,
                                                }}
                                            />
                                        </div>
                                    );
                                })}

                                {/* Hands - Flat Design, No Shadows */}
                                <div className="relative w-full h-full">
                                    {/* Hand weight is a percentage of the face,
                                        like the lengths already were. Fixed
                                        pixel widths meant a hand stayed 3px
                                        whether the face was 612px or 135px, so
                                        the small sizes came out four times too
                                        heavy. The percentages are calibrated to
                                        reproduce the 4x4 weights exactly —
                                        3px, 2px and 1px on a 612px face — with
                                        a floor of one pixel so a hand can't
                                        vanish at 1x1. */}
                                    <div
                                        className="absolute top-1/2 left-1/2 rounded-full bg-white z-10"
                                        style={{ width: 'max(3px, 1.31%)', height: 'max(3px, 1.31%)', transform: 'translate(-50%, -50%)' }}
                                    />
                                    <div
                                        className="absolute left-1/2 bottom-1/2 origin-bottom h-[28%] bg-white transition-transform duration-500"
                                        style={{ width: 'max(1px, 0.49%)', transform: `translateX(-50%) rotate(${hourDeg}deg)` }}
                                    />
                                    <div
                                        className="absolute left-1/2 bottom-1/2 origin-bottom h-[38%] bg-white transition-transform duration-500"
                                        style={{ width: 'max(1px, 0.33%)', transform: `translateX(-50%) rotate(${minuteDeg}deg)` }}
                                    />
                                    <div
                                        className="absolute left-1/2 bottom-1/2 origin-bottom h-[42%] bg-white/40"
                                        style={{ width: 'max(1px, 0.16%)', transform: `translateX(-50%) rotate(${secondDeg}deg)` }}
                                    />
                                </div>
                              </div>
                            </div>
                        ) : (
                            <div
                                className="absolute inset-0 flex flex-col items-center justify-center"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleClockType();
                                }}
                            >
                                <div className="cursor-pointer hover:opacity-80 transition-opacity">
                                    <UnifiedDigits />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 2. STOPWATCH VIEW */}
                {mode === 'stopwatch' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center animate-in fade-in duration-300">
                        {/* Stopwatch Digits */}
                        <UnifiedDigits />

                        {/* Controls */}
                        <div className={cn("absolute flex items-center", responsive ? "bottom-2 md:bottom-6 gap-2 md:gap-4" : "bottom-6 gap-4")}>
                            <button onClick={handleSwToggle} className={cn("rounded-full bg-white/10 hover:bg-white/20 text-white transition-all", responsive ? "p-1.5 md:p-3" : "p-3")}>
                                {swRunning ? <PauseIcon className={responsive ? "w-3 h-3 md:w-5 md:h-5" : "w-5 h-5"} /> : <PlayIcon className={cn("ml-1", responsive ? "w-3 h-3 md:w-5 md:h-5" : "w-5 h-5")} />}
                            </button>
                            <button onClick={handleSwReset} className={cn("rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all", responsive ? "p-1.5 md:p-3" : "p-3")}>
                                <ArrowPathIcon className={responsive ? "w-2.5 h-2.5 md:w-4 md:h-4" : "w-4 h-4"} />
                            </button>
                        </div>
                    </div>
                )}

                {/* 3. TIMER VIEW */}
                {mode === 'timer' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center animate-in fade-in duration-300">
                        {timerState === 'set' && (
                            <form onSubmit={handleTimerSubmit} className="flex flex-col items-center h-full justify-center relative">
                                <div className="flex items-center relative">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={timerInput}
                                        onChange={(e) => setTimerInput(e.target.value.replace(/\D/g, '').slice(0, 3))}
                                        placeholder="0"
                                        className={cn(
                                            "bg-transparent text-center font-mono font-bold text-white focus:outline-none placeholder:text-white/20",
                                            responsive ? "w-12 md:w-24 text-2xl md:text-5xl" : "w-24 text-5xl"
                                        )}
                                        autoFocus={mode === 'timer' && timerState === 'set'}
                                    />
                                    {/* Absolute positioned label so it doesn't shift input */}
                                    <span className={cn("absolute left-full top-1/2 -translate-y-1/2 text-white/40", responsive ? "text-[10px] md:text-sm ml-1 md:ml-2" : "text-sm ml-2")}>MIN</span>
                                </div>
                                {/* Absolute positioned button at bottom so it doesn't shift numbers */}
                                <button type="submit" className={cn(
                                    "absolute text-white/40 hover:text-white uppercase tracking-widest bg-white/10 rounded-full hover:cursor-pointer hover:bg-white/20",
                                    responsive ? "bottom-2 md:bottom-6 text-[9px] md:text-xs px-2 py-0.5 md:px-3 md:py-1" : "bottom-6 text-xs px-3 py-1"
                                )}>
                                    START
                                </button>
                            </form>
                        )}

                        {timerState === 'countdown' && (
                            <div className={cn("font-mono font-bold text-white animate-pulse", responsive ? "text-2xl md:text-5xl" : "text-5xl")}>{countdownVal}</div>
                        )}

                        {timerState === 'running' && (
                            <>
                                <div className={cn("transition-colors", alarmTriggered ? "text-red-500" : "text-white")}>
                                    <UnifiedDigits />
                                </div>

                                {/* Alarm Indicator - Absolute at bottom or top, not flowing */}
                                {alarmTriggered && <div className={cn("absolute top-[65%] text-red-500 font-bold uppercase tracking-widest animate-pulse", responsive ? "text-[9px] md:text-xs" : "text-xs")}>TIME IS UP</div>}

                                <div className={cn("absolute flex items-center", responsive ? "bottom-2 md:bottom-6 gap-2 md:gap-4" : "bottom-6 gap-4")}>
                                    {!alarmTriggered && (
                                        <button onClick={() => setTimerRunning(!timerRunning)} className={cn("rounded-full bg-white/10 hover:bg-white/20 text-white transition-all", responsive ? "p-1.5 md:p-3" : "p-3")}>
                                            {timerRunning ? <PauseIcon className={responsive ? "w-3 h-3 md:w-5 md:h-5" : "w-5 h-5"} /> : <PlayIcon className={cn("ml-1", responsive ? "w-3 h-3 md:w-5 md:h-5" : "w-5 h-5")} />}
                                        </button>
                                    )}
                                    <button onClick={handleTimerReset} className={cn("rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all", responsive ? "p-1.5 md:p-3" : "p-3")}>
                                        <ArrowPathIcon className={responsive ? "w-2.5 h-2.5 md:w-4 md:h-4" : "w-4 h-4"} />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}

            </div>

            {/* Top Label - Mode Switcher - Large Tap Area */}
            <div
                className={cn("absolute top-0 left-0 right-0 z-20 flex items-start justify-center select-none", responsive ? "h-6 md:h-12 pt-1.5 md:pt-4" : "h-12 pt-4", lockMode ? "pointer-events-none" : "cursor-pointer")}
                onClick={cycleMode}
            >
                <div className={cn("bg-transparent", responsive ? "px-4 py-1 md:px-8 md:py-4" : "px-8 py-4")}>
                    {/* Label hidden in compact placements (e.g. the header) — the
                        tap area above still cycles clock → stopwatch → timer. */}
                    {!hideLabel && (
                        <span className={cn("tracking-[0.2em] font-medium text-white/30 uppercase hover:text-white transition-colors", responsive ? "text-[8px] md:text-[10px]" : "text-[10px]")}>
                            {mode === 'clock' ? 'CLOCK' : mode === 'stopwatch' ? 'STOPWATCH' : 'TIMER'}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

