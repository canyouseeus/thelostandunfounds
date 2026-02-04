import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from './utils';
import { CalendarWidget } from './calendar-widget';

interface NoirDateRangePickerProps {
    startDate: string; // YYYY-MM-DD
    endDate: string;   // YYYY-MM-DD
    onChange: (start: string, end: string) => void;
    onClose: () => void;
}

export const NoirDateRangePicker: React.FC<NoirDateRangePickerProps> = ({
    startDate,
    endDate,
    onChange,
    onClose
}) => {
    // Internal state for selection is less relevant if we auto-apply, 
    // but useful for visual feedback before second click.
    // However, for "auto-apply", we can just pass changes up immediately.

    // We strictly follow the "click 1 = start, click 2 = end" pattern
    // The parent state handles the actual values.

    const handleDateSelect = (date: Date) => {
        const dateStr = date.toLocaleDateString('en-CA'); // YYYY-MM-DD

        if (!startDate || (startDate && endDate)) {
            // New selection starting (or restarting if both set)
            onChange(dateStr, '');
        } else if (startDate && !endDate) {
            // Completing selection
            if (new Date(dateStr) < new Date(startDate)) {
                // Backwards range -> swap
                onChange(dateStr, startDate);
            } else {
                onChange(startDate, dateStr);
            }
            // Optional: Close on completion? Usage often prefers seeing result first. 
            // User asked for "button go away", implying immediate action.
            // We can keep it open for visual confirmation or close. 
            // Let's keep it open so they see the range, but they can click backdrop to close.
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
            {/* Backdrop click handler */}
            <div className="absolute inset-0" onClick={onClose} />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative z-10 bg-black p-6 shadow-2xl" // Removed border
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6">
                    <span className="text-[10px] font-bold tracking-[0.2em] text-white">SELECT DATE RANGE</span>
                    <button
                        onClick={onClose}
                        className="text-white/50 hover:text-white transition-colors"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                <CalendarWidget
                    className="pb-0 min-h-[auto]"
                    interactive={true}
                    startDate={startDate ? new Date(startDate + 'T00:00:00') : null}
                    endDate={endDate ? new Date(endDate + 'T00:00:00') : null}
                    onDateSelect={handleDateSelect}
                />

                <div className="mt-6 text-center">
                    <p className="text-[10px] tracking-widest text-white/40">
                        SELECTION APPLIES AUTOMATICALLY
                    </p>
                </div>
            </motion.div>
        </div>
    );
};
