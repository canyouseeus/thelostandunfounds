import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Plus, Check } from 'lucide-react';

interface Photo {
    id: string;
    title: string;
    thumbnail_url: string;
}

interface PhotoLightboxProps {
    photo: Photo | null;
    onClose: () => void;
    onNext: () => void;
    onPrev: () => void;
    isSelected: boolean;
    onToggleSelect: () => void;
    singlePhotoPrice?: number;
}

const PhotoLightbox: React.FC<PhotoLightboxProps> = ({
    photo,
    onClose,
    onNext,
    onPrev,
    isSelected,
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
                className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-8"
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

                            {/* Watermark Overlay (Security) */}
                            <div className="absolute inset-0 z-10 opacity-10 flex items-center justify-center select-none overflow-hidden rounded-lg">
                                <span className="text-4xl md:text-8xl font-black rotate-[-45deg] whitespace-nowrap">
                                    THE LOST+UNFOUNDS
                                </span>
                            </div>

                            <img
                                src={photo.thumbnail_url}
                                alt={photo.title}
                                className="max-h-[60vh] w-auto object-contain shadow-2xl rounded-lg select-none"
                                onContextMenu={(e) => e.preventDefault()}
                                draggable={false}
                            />

                            {/* Close Button - Overlaid on Photo */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 z-50 p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white transition-all pointer-events-auto opacity-0 group-hover:opacity-100"
                            >
                                <X className="w-5 h-5" />
                            </button>
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
                        <h3 className="text-zinc-400 text-sm font-medium tracking-widest uppercase">
                            {photo.title || 'Untitled Archive'}
                        </h3>

                        <button
                            onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
                            className={`flex items-center gap-2 px-8 py-4 rounded-full font-bold transition-all ${isSelected
                                ? 'bg-zinc-800 text-white'
                                : 'bg-white text-black hover:bg-zinc-200'
                                }`}
                        >
                            {isSelected ? (
                                <>
                                    <Check className="w-5 h-5" />
                                    <span>Selected</span>
                                </>
                            ) : (
                                <>
                                    <Plus className="w-5 h-5" />
                                    <span>Add to Selection (${singlePhotoPrice.toFixed(2)})</span>
                                </>
                            )}
                        </button>
                    </motion.div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default PhotoLightbox;
