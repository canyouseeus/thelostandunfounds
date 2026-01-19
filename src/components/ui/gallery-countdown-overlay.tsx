/**
 * GalleryCountdownOverlay - Countdown timer overlay for gallery launch
 * Displays countdown until a specific time, then triggers sync and reveals gallery
 */

import React, { useState, useEffect, useCallback } from 'react';
import { cn } from './utils';

interface GalleryCountdownOverlayProps {
    coverImageUrl?: string;
    targetTime: Date;
    galleryName: string;
    onCountdownComplete?: () => void;
    className?: string;
}

export function GalleryCountdownOverlay({
    coverImageUrl,
    targetTime,
    galleryName,
    onCountdownComplete,
    className,
}: GalleryCountdownOverlayProps) {
    const [timeRemaining, setTimeRemaining] = useState<number>(0);
    const [isExpired, setIsExpired] = useState(false);

    // Calculate time remaining
    const calculateTimeRemaining = useCallback(() => {
        const now = new Date();
        const diff = targetTime.getTime() - now.getTime();
        return Math.max(0, diff);
    }, [targetTime]);

    // Initialize and update countdown
    useEffect(() => {
        // Check initial state
        const initialRemaining = calculateTimeRemaining();
        if (initialRemaining <= 0) {
            setIsExpired(true);
            return;
        }

        setTimeRemaining(initialRemaining);

        // Update every second
        const interval = setInterval(() => {
            const remaining = calculateTimeRemaining();
            setTimeRemaining(remaining);

            if (remaining <= 0) {
                setIsExpired(true);
                clearInterval(interval);
                onCountdownComplete?.();
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [calculateTimeRemaining, onCountdownComplete]);

    // Format time as HH:MM:SS
    const formatTime = (ms: number) => {
        const totalSeconds = Math.ceil(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (hours > 0) {
            return {
                display: `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
                label: 'HOURS'
            };
        }
        return {
            display: `${minutes}:${seconds.toString().padStart(2, '0')}`,
            label: 'MINUTES'
        };
    };

    // Don't render if expired
    if (isExpired) {
        return null;
    }

    const { display, label } = formatTime(timeRemaining);

    return (
        <div
            className={cn(
                'absolute inset-0 z-20 flex flex-col items-center justify-center',
                'bg-black/90 backdrop-blur-sm',
                'transition-opacity duration-500',
                className
            )}
        >
            {/* Background cover image with blur */}
            {coverImageUrl && (
                <div
                    className="absolute inset-0 bg-cover bg-center opacity-20 blur-sm"
                    style={{ backgroundImage: `url(${coverImageUrl})` }}
                />
            )}

            {/* Content */}
            <div className="relative z-10 text-center">
                {/* Gallery name */}
                <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase mb-2">
                    {galleryName}
                </div>

                {/* "Opens at" label */}
                <div className="text-xs tracking-[0.2em] text-white/60 uppercase mb-4">
                    GALLERY OPENS AT 11:11 AM
                </div>

                {/* Countdown display */}
                <div className="font-mono text-4xl md:text-5xl font-bold text-white tracking-tight mb-2">
                    {display}
                </div>

                {/* Time unit label */}
                <div className="text-[10px] tracking-[0.2em] text-white/30 uppercase">
                    {label}
                </div>
            </div>
        </div>
    );
}

/**
 * Hook to get today's target time at a specific hour
 */
export function useTargetTimeToday(hour: number, minute: number = 0): Date {
    const [targetTime] = useState(() => {
        const target = new Date();
        target.setHours(hour, minute, 0, 0);
        return target;
    });
    return targetTime;
}

/**
 * Check if a gallery should show the countdown overlay
 */
export function shouldShowCountdown(galleryName: string, targetTime: Date): boolean {
    // DISABLED: Countdown feature turned off
    return false;
}
