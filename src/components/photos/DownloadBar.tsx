import React from 'react';
import { motion } from 'framer-motion';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { splitIntoZipParts } from '../../lib/galleryZip';

interface DownloadBarProps {
    /** Photos that will be zipped: the selection, or every downloadable photo. */
    count: number;
    /** True when `count` is a hand-picked selection rather than "everything". */
    isSelection: boolean;
    totalDownloadable: number;
    onSelectAll: () => void;
    onClear: () => void;
    /** Called with the 0-based part to download. Each part is one tap, one zip. */
    onDownload: (part: number) => void;
}

/**
 * Bottom bar for the "Your Assets" tab — the download counterpart to
 * SelectionTray's checkout. A shoot up to ZIP_MAX_FILES photos is one button,
 * one file. A larger one is split into a few numbered parts, each its own tap:
 * Safari only honours a download that starts from a tap, so the parts cannot
 * be fired in a loop, and a handful of taps beats one per photo.
 */
const DownloadBar: React.FC<DownloadBarProps> = ({
    count,
    isSelection,
    totalDownloadable,
    onSelectAll,
    onClear,
    onDownload,
}) => {
    const partCount = splitIntoZipParts(new Array(count)).length;
    const allSelected = isSelection && count === totalDownloadable;

    return (
        <motion.div
            initial={{ y: 200 }}
            animate={{ y: 0 }}
            exit={{ y: 200 }}
            className="fixed bottom-0 left-0 right-0 z-50 px-4 md:px-8 py-0 flex justify-center pointer-events-none"
        >
            <div className="bg-zinc-950/95 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-full max-w-5xl px-4 md:px-6 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-8 pointer-events-auto">
                <div className="flex items-center justify-between md:justify-start gap-4">
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] leading-none">
                        {count} Photo{count !== 1 ? 's' : ''}{isSelection ? ' Selected' : ''}
                    </span>
                    <div className="flex items-center gap-3">
                        {!allSelected && (
                            <button
                                onClick={onSelectAll}
                                className="text-[9px] font-black text-white/50 hover:text-white uppercase tracking-[0.2em] transition-colors"
                            >
                                Select All
                            </button>
                        )}
                        {isSelection && (
                            <button
                                onClick={onClear}
                                className="text-[9px] font-black text-white/50 hover:text-white uppercase tracking-[0.2em] transition-colors"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {partCount <= 1 ? (
                        <button
                            onClick={() => onDownload(0)}
                            className="flex items-center justify-center gap-2 w-full md:w-auto px-6 py-3 bg-white text-black font-black uppercase tracking-[0.2em] text-[10px] md:text-[11px] hover:bg-zinc-200 transition-all active:scale-95 whitespace-nowrap"
                        >
                            <ArrowDownTrayIcon className="w-4 h-4" />
                            Download {isSelection ? 'Selected' : 'All'} (.ZIP)
                        </button>
                    ) : (
                        Array.from({ length: partCount }, (_, i) => (
                            <button
                                key={i}
                                onClick={() => onDownload(i)}
                                className="flex items-center justify-center gap-2 flex-1 md:flex-none px-4 py-3 bg-white text-black font-black uppercase tracking-[0.15em] text-[10px] hover:bg-zinc-200 transition-all active:scale-95 whitespace-nowrap"
                            >
                                <ArrowDownTrayIcon className="w-4 h-4" />
                                Part {i + 1} of {partCount}
                            </button>
                        ))
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default DownloadBar;
