
import React from 'react';
import { LoadingSpinner } from '../Loading';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDownTrayIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { PricingOption } from './PhotoGallery';

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
    pricingOptions?: PricingOption[];
    creditBalance: number | null;
    creditEmail: string | null;
}

const SelectionTray: React.FC<SelectionTrayProps> = ({
    selectedPhotos,
    onRemove,
    onCheckout,
    loading,
    creditBalance,
    creditEmail,
}) => {
    const count = selectedPhotos.length;

    if (count === 0) return null;

    const hasEmail = !!creditEmail;
    const balance = creditBalance ?? 0;
    const canCoverAll = hasEmail && balance >= count;
    const shortfall = hasEmail ? Math.max(0, count - balance) : 0;

    let labelLine1: React.ReactNode;
    let labelLine2: string;
    let buttonLabel: React.ReactNode;

    if (!hasEmail) {
        labelLine1 = <span className="text-xl md:text-3xl font-black text-white tracking-tighter leading-none">FREE</span>;
        labelLine2 = `${count} SELECTED`;
        buttonLabel = 'GET FREE ACCESS';
    } else if (canCoverAll) {
        labelLine1 = (
            <span className="text-xl md:text-3xl font-black text-white tracking-tighter leading-none">
                {count} CREDIT{count !== 1 ? 'S' : ''}
            </span>
        );
        labelLine2 = `${balance - count} REMAINING AFTER`;
        buttonLabel = (
            <>
                DOWNLOAD FREE
                <ArrowDownTrayIcon className="w-3 h-3 md:w-4 md:h-4 transition-transform group-hover:translate-y-0.5" />
            </>
        );
    } else {
        labelLine1 = (
            <span className="text-xl md:text-3xl font-black text-white tracking-tighter leading-none">
                {balance > 0 ? `${balance} / ${count}` : `${count}`}
            </span>
        );
        labelLine2 = shortfall > 0 ? `${shortfall} REQUIRE PAYMENT` : `${count} SELECTED`;
        buttonLabel = `CHECKOUT ($${(shortfall * 1000).toLocaleString()})`;
    }

    return (
        <motion.div
            initial={{ y: 200 }}
            animate={{ y: 0 }}
            exit={{ y: 200 }}
            className="fixed bottom-0 left-0 right-0 z-50 px-4 md:px-8 py-0 flex justify-center pointer-events-none"
        >
            <div className="bg-zinc-950/95 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-full max-w-5xl px-4 md:px-6 py-1.5 md:py-2 flex flex-col md:flex-row items-center gap-6 pointer-events-auto">

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
                                        src={`https://lh3.googleusercontent.com/d/${photo.google_drive_file_id}=s160`}
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

                {/* Count + Button */}
                <div className="flex flex-row items-center justify-between gap-6 md:gap-12 w-full md:w-auto order-1 md:order-2">
                    <div className="flex flex-col justify-center">
                        <div className="flex items-baseline gap-3">
                            {labelLine1}
                            <span className="text-[8px] md:text-[9px] font-black text-zinc-500 tracking-[0.2em] uppercase leading-none">
                                {labelLine2}
                            </span>
                        </div>
                        {hasEmail && creditBalance !== null && (
                            <p className="text-[7px] text-white/30 uppercase tracking-widest mt-0.5">
                                {canCoverAll ? '@tlau.photos watermark included' : `${balance} credit${balance !== 1 ? 's' : ''} available`}
                            </p>
                        )}
                        {!hasEmail && (
                            <p className="text-[7px] text-white/30 uppercase tracking-widest mt-0.5">
                                Enter email for 100 free credits
                            </p>
                        )}
                    </div>

                    <button
                        onClick={onCheckout}
                        disabled={loading}
                        className="group flex items-center gap-2 px-6 py-2 md:px-10 md:py-3.5 bg-white text-black font-black uppercase tracking-[0.2em] text-[10px] md:text-[11px] hover:bg-zinc-200 transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap shrink-0"
                    >
                        {loading ? (
                            <LoadingSpinner size="sm" className="text-black" />
                        ) : (
                            buttonLabel
                        )}
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default SelectionTray;
