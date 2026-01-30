import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon, CheckIcon, ArrowDownTrayIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface Photo {
    id: string;
    title: string;
    thumbnail_url: string;
    google_drive_file_id: string;
}

interface PhotoLightboxProps {
    photo: Photo | null;
    onClose: () => void;
    onNext: () => void;
    onPrev: () => void;
    isSelected: boolean;
    isPurchased?: boolean;
    onToggleSelect: () => void;
    singlePhotoPrice?: number;
    galleryName?: string;
}

const PhotoLightbox: React.FC<PhotoLightboxProps> = ({
    photo,
    onClose,
    onNext,
    onPrev,
    isSelected,
    isPurchased = false,
    onToggleSelect,
    singlePhotoPrice = 5.00,
    galleryName
}) => {
    const [isImageLoading, setIsImageLoading] = useState(true);

    // Reset loading state when photo changes
    useEffect(() => {
        setIsImageLoading(true);
    }, [photo?.google_drive_file_id]);

    if (!photo) return null;


    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-8"
            >
                {/* Backdrop */}
                <div
                    className="absolute inset-0 bg-black/95 backdrop-blur-xl"
                    onClick={onClose}
                />

                {/* Content Container */}
                <div className="relative w-full max-w-6xl h-full flex flex-col items-center justify-center group">

                    {/* Header: Gallery Name */}
                    <motion.div
                        initial={{ y: -10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="mb-8 md:mb-12 mt-8"
                    >
                        <h3 className="text-white text-[10px] md:text-[11px] font-black tracking-[0.4em] md:tracking-[0.5em] uppercase">
                            {galleryName || 'Archive View'}
                        </h3>
                    </motion.div>

                    {/* Main Image Container */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex flex-col items-center justify-center w-full h-full pointer-events-none p-4"
                    >
                        {/* Inner generic wrapper that shrinks to fit the image */}
                        <div className="relative w-fit h-auto flex items-center justify-center">

                            {/* Watermark Overlay (Security) - Only if not purchased and image is loaded */}
                            {!isPurchased && (
                                <div className={`absolute inset-0 z-10 flex items-center justify-center pointer-events-none overflow-hidden transition-opacity duration-300 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}>
                                    <img
                                        src="/logo.png"
                                        alt="Watermark"
                                        className="w-1/2 h-auto brightness-0 invert opacity-[0.09] select-none"
                                    />
                                </div>
                            )}

                            <img
                                src={`https://lh3.googleusercontent.com/d/${photo.google_drive_file_id}=s3000`}
                                alt={photo.title}
                                className="max-h-[70vh] w-auto object-contain shadow-2xl select-none pointer-events-auto"
                                onContextMenu={(e) => e.preventDefault()}
                                draggable={false}
                                onLoad={() => setIsImageLoading(false)}
                                referrerPolicy="no-referrer"
                                crossOrigin="anonymous"
                            />

                            {/* Close Button - Overlaid on Photo - Only show when loaded */}
                            <button
                                onClick={onClose}
                                className={`absolute -top-12 right-0 md:top-4 md:right-4 z-50 p-2 bg-black/40 hover:bg-white backdrop-blur-md rounded-full text-white hover:text-black transition-all pointer-events-auto ${isImageLoading ? 'opacity-0 scale-0' : 'opacity-100 md:opacity-0 md:group-hover:opacity-100 scale-100'}`}
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>

                            {/* Status Badge - Only show when loaded */}
                            {isPurchased && (
                                <div className={`absolute top-4 left-4 z-20 flex items-center gap-1.5 bg-green-500 text-black px-2 py-1 rounded-none text-[8px] md:text-[9px] font-black uppercase tracking-[0.15em] shadow-lg transition-opacity duration-300 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}>
                                    <CheckCircleIcon className="w-3 h-3" />
                                    PROPRIETARY
                                </div>
                            )}
                        </div>

                        {/* Sub-header: Photo Title - Nested inside to stay close to image - Only show when loaded */}
                        <div className={`text-zinc-500 text-[9px] font-bold tracking-[0.2em] uppercase mt-6 pointer-events-auto transition-opacity duration-300 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}>
                            {photo.title || 'Untitled Archive'}
                        </div>
                    </motion.div>

                    <button
                        onClick={(e) => { e.stopPropagation(); onPrev(); }}
                        className={`absolute left-0 p-4 text-white hover:text-zinc-400 transition-all ${isImageLoading ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover:opacity-100'}`}
                    >
                        <ChevronLeftIcon className="w-12 h-12" />
                    </button>

                    <button
                        onClick={(e) => { e.stopPropagation(); onNext(); }}
                        className={`absolute right-0 p-4 text-white hover:text-zinc-400 transition-all ${isImageLoading ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover:opacity-100'}`}
                    >
                        <ChevronRightIcon className="w-12 h-12" />
                    </button>

                    <motion.div
                        initial={{ y: 0, opacity: 0 }}
                        animate={{ y: 0, opacity: isImageLoading ? 0 : 1 }}
                        className="mt-2 flex flex-col items-center gap-4 transition-opacity duration-300"
                    >

                        {isPurchased ? (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(`/api/gallery/stream?fileId=${photo.google_drive_file_id || photo.id}&download=true`, '_blank');
                                }}
                                className="flex items-center gap-2 px-8 py-3 bg-white hover:bg-zinc-200 text-black rounded-none font-black text-[10px] uppercase tracking-[0.25em] transition-all shadow-xl"
                            >
                                <ArrowDownTrayIcon className="w-4 h-4" />
                                <span>Download Original</span>
                            </button>
                        ) : (
                            <button
                                onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
                                className={`flex items-center gap-2 px-10 py-4 rounded-none font-black text-xs uppercase tracking-widest transition-all ${isSelected
                                    ? 'bg-zinc-800 text-white'
                                    : 'bg-white text-black hover:bg-zinc-200'
                                    }`}
                            >
                                {isSelected ? (
                                    <>
                                        <CheckIcon className="w-5 h-5 text-green-500" />
                                        <span>Selected</span>
                                    </>
                                ) : (
                                    <>
                                        <PlusIcon className="w-5 h-5" />
                                        <span>Add to Selection (${singlePhotoPrice.toFixed(2)})</span>
                                    </>
                                )}
                            </button>
                        )}
                    </motion.div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default PhotoLightbox;
