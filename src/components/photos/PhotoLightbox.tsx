import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Plus, Check, Download, CheckCircle } from 'lucide-react';

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
}

const PhotoLightbox: React.FC<PhotoLightboxProps> = ({
    photo,
    onClose,
    onNext,
    onPrev,
    isSelected,
    isPurchased = false,
    onToggleSelect,
    singlePhotoPrice = 5.00
}) => {
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

                    {/* Main Image Container */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex items-center justify-center w-full h-full pointer-events-none p-4"
                    >
                        {/* Inner generic wrapper that shrinks to fit the image */}
                        <div className="relative w-fit h-auto flex items-center justify-center">

                            {/* Watermark Overlay (Security) - Only if not purchased */}
                            {!isPurchased && (
                                <div className="absolute inset-0 z-10 opacity-10 flex items-center justify-center select-none overflow-hidden rounded-lg pointer-events-none">
                                    <span className="text-4xl md:text-8xl font-black rotate-[-45deg] whitespace-nowrap uppercase tracking-[1em]">
                                        THE LOST+UNFOUNDS
                                    </span>
                                </div>
                            )}

                            <img
                                src={`https://lh3.googleusercontent.com/d/${photo.google_drive_file_id}=s3000`}
                                alt={photo.title}
                                className="max-h-[70vh] w-auto object-contain shadow-2xl rounded-lg select-none pointer-events-auto"
                                onContextMenu={(e) => e.preventDefault()}
                                draggable={false}
                                referrerPolicy="no-referrer"
                                crossOrigin="anonymous"
                            />

                            {/* Close Button - Overlaid on Photo */}
                            <button
                                onClick={onClose}
                                className="absolute -top-12 right-0 md:top-4 md:right-4 z-50 p-2 bg-black/40 hover:bg-white backdrop-blur-md rounded-full text-white hover:text-black transition-all pointer-events-auto opacity-100 md:opacity-0 md:group-hover:opacity-100"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {/* Status Badge */}
                            {isPurchased && (
                                <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-green-500 text-black px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                                    <CheckCircle className="w-4 h-4" />
                                    PROPRIETARY
                                </div>
                            )}
                        </div>
                    </motion.div>

                    <button
                        onClick={(e) => { e.stopPropagation(); onPrev(); }}
                        className="absolute left-0 p-4 text-white hover:text-zinc-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                        <ChevronLeft className="w-12 h-12" />
                    </button>

                    <button
                        onClick={(e) => { e.stopPropagation(); onNext(); }}
                        className="absolute right-0 p-4 text-white hover:text-zinc-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                        <ChevronRight className="w-12 h-12" />
                    </button>

                    {/* Selection Action Bar (Footer of Lightbox) */}
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="mt-8 flex flex-col items-center gap-4"
                    >
                        <h3 className="text-zinc-400 text-[10px] font-black tracking-[0.3em] uppercase">
                            {photo.title || 'Untitled Archive'}
                        </h3>

                        {isPurchased ? (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(`/api/gallery/stream?fileId=${photo.google_drive_file_id || photo.id}&download=true`, '_blank');
                                }}
                                className="flex items-center gap-3 px-12 py-4 bg-green-500 hover:bg-green-400 text-black rounded-full font-black text-xs uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                            >
                                <Download className="w-5 h-5" />
                                <span>Download Original</span>
                            </button>
                        ) : (
                            <button
                                onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
                                className={`flex items-center gap-2 px-10 py-4 rounded-full font-black text-xs uppercase tracking-widest transition-all ${isSelected
                                    ? 'bg-zinc-800 text-white'
                                    : 'bg-white text-black hover:bg-zinc-200'
                                    }`}
                            >
                                {isSelected ? (
                                    <>
                                        <Check className="w-5 h-5 text-green-500" />
                                        <span>Selected</span>
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-5 h-5" />
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
