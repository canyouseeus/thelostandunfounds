
import React from 'react';
import { LoadingSpinner } from '../Loading';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRightIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface Photo {
    id: string;
    title: string;
    thumbnail_url: string;
    google_drive_file_id: string;
}

interface SelectionTrayProps {
    selectedPhotos: Photo[];
    onRemove: (id: string) => void;
    onCheckout: () => void;
    loading?: boolean;
    totalAmount: number;
}

const SelectionTray: React.FC<SelectionTrayProps> = ({
    selectedPhotos,
    onRemove,
    onCheckout,
    loading,
    totalAmount,
}) => {
    const count = selectedPhotos.length;

    if (count === 0) return null;

    return (
        <motion.div
            initial={{ y: 200 }}
            animate={{ y: 0 }}
            exit={{ y: 200 }}
            className="fixed bottom-0 left-0 right-0 z-50 px-4 md:px-8 py-0 flex justify-center pointer-events-none"
        >
            <div className="bg-zinc-950/95 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-full max-w-5xl px-4 md:px-6 py-3 md:py-2 flex flex-col md:flex-row items-center gap-6 pointer-events-auto">

                {/* Thumbnails */}
                <div className="hidden md:flex flex-1 w-full h-16 items-center order-1 mt-0">
                    <div className="flex items-center overflow-x-auto py-1 scrollbar-hide w-full justify-center md:justify-start">
                        <AnimatePresence mode="popLayout">
                            {selectedPhotos.map((photo, index) => (
                                <motion.div
                                    key={photo.id}
                                    layout
                                    initial={{ opacity: 0, x: 20, scale: 0.8 }}
                                    animate={{ opacity: 1, x: 0, scale: 1, zIndex: index }}
                                    whileHover={{ zIndex: 100 }}
                                    exit={{ opacity: 0, scale: 0.8, x: -20 }}
                                    className="relative group flex-shrink-0"
                                    style={{ marginLeft: index === 0 ? '0' : '-1.5rem' }}
                                >
                                    <img
                                        src={`/api/gallery/stream?fileId=${photo.google_drive_file_id}&size=160`}
                                        alt={photo.title}
                                        className="w-12 h-12 md:w-16 md:h-16 object-cover rounded border border-white/10 group-hover:border-white/30 transition-all group-hover:-translate-y-1"
                                    />
                                    <button
                                        onClick={() => onRemove(photo.id)}
                                        className="absolute -top-1.5 -right-1.5 bg-red-500 rounded-full p-0.5 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                    >
                                        <XMarkIcon className="w-3 h-3 text-white" />
                                    </button>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Total + Checkout.

                    The tray used to carry three separate micro-captions at 7-9px; "Card or
                    Bitcoin at checkout", "Personal use only · Commercial →" and the photo count
                    stacked around the amount and the button, which is what made it read as
                    noise. Both captions already appear on the gallery page itself (step 03 says
                    card or bitcoin; the licensing block sits above the grid), so the tray keeps
                    only what is specific to the selection: the amount and how many photos it
                    covers. Money is green-400, matching the headline price and the admin
                    revenue tiles. */}
                <div className="flex flex-row items-center justify-between gap-6 md:gap-12 w-full md:w-auto order-1 md:order-2">
                    <div className="flex items-baseline gap-2.5">
                        <span className="text-2xl md:text-3xl font-black text-green-400 tracking-tighter leading-none">
                            ${totalAmount.toFixed(2)}
                        </span>
                        <span className="text-[9px] font-black text-white/40 tracking-[0.2em] uppercase leading-none">
                            {count} Photo{count !== 1 ? 's' : ''}
                        </span>
                    </div>

                    <button
                        onClick={onCheckout}
                        disabled={loading}
                        className="group flex items-center gap-2 px-6 py-2.5 md:px-10 md:py-3.5 bg-white text-black font-black uppercase tracking-[0.2em] text-[10px] md:text-[11px] hover:bg-zinc-200 transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap shrink-0"
                    >
                        {loading ? (
                            <LoadingSpinner size="sm" className="text-black" />
                        ) : (
                            <>
                                CHECKOUT
                                <ArrowRightIcon className="w-3 h-3 md:w-4 md:h-4 transition-transform group-hover:translate-x-0.5" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default SelectionTray;
