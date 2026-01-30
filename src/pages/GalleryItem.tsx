import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LockClosedIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';

interface PhotoLibrary {
    id: string;
    name: string;
    slug: string;
    description: string;
    is_private: boolean;
    cover_image_url?: string;
    google_drive_folder_id?: string;
}

interface GalleryItemProps {
    lib: PhotoLibrary;
    index: number;
    userIsAdmin: boolean;
    authLoading: boolean;
    onGalleryClick: (library: PhotoLibrary) => void;
}

export default function GalleryItem({ lib, index, userIsAdmin, authLoading, onGalleryClick }: GalleryItemProps) {
    const { user } = useAuth();

    // DISABLED: Countdown was a one-time launch event (already passed)
    // Keeping variables for component compatibility but always unlocked
    const isLocked = false;
    const timeRemaining = null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => !isLocked && onGalleryClick(lib)}
            className={`group relative bg-black transition-all duration-500 overflow-hidden aspect-square flex flex-col justify-end p-8 ${!isLocked ? 'hover:bg-[#0a0a0a] cursor-pointer' : 'cursor-not-allowed'} rounded-none`}
        >
            {/* Background Image/Overlay */}
            {lib.cover_image_url ? (
                <div
                    className={`absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-110 ${isLocked ? 'grayscale opacity-20' : 'opacity-40 group-hover:opacity-60'}`}
                    style={{ backgroundImage: `url(${lib.cover_image_url})` }}
                />
            ) : (
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 opacity-60" />
            )}

            {/* Locked Overlay */}
            {isLocked && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                    <LockClosedIcon className="w-8 h-8 text-white mb-4" />
                    <div className="text-4xl font-black text-white tracking-widest tabular-nums">
                        {timeRemaining}
                    </div>
                    <div className="text-xs font-bold text-white/50 tracking-[0.2em] mt-2 uppercase">
                        Unlocks at 11:11 AM
                    </div>
                </div>
            )}

            {/* Hover Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-80 group-hover:opacity-40 transition-opacity duration-500" />

            {/* Content Wrapper - Fixed height layout so title doesn't move */}
            <div className={`relative z-10 ${isLocked ? 'opacity-20' : 'opacity-100'}`}>
                {/* Badge */}
                <div className="flex items-center mb-3">
                    {lib.is_private ? (
                        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1">
                            <LockClosedIcon className="w-3 h-3 text-white" />
                            <span className="text-[10px] font-bold text-white tracking-widest uppercase">Private</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 bg-white px-3 py-1">
                            <span className="text-[10px] font-bold text-black tracking-widest uppercase">Public</span>
                        </div>
                    )}
                </div>

                {/* Title - Fixed position, no movement */}
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight uppercase group-hover:translate-x-2 transition-transform duration-500">
                    {lib.name}
                </h2>

                {/* Description - Fixed 2-line container height */}
                <div className="h-[2.75rem] mt-3">
                    <p className="text-sm text-white/60 line-clamp-2 font-light leading-relaxed group-hover:text-white/80 transition-colors duration-500">
                        {lib.description}
                    </p>
                </div>

                {/* View Gallery Link */}
                <div className="pt-2 flex items-center gap-2 text-[10px] font-black tracking-widest uppercase text-white opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                    {lib.is_private && !user ? 'Log in to View' : 'View Gallery'}
                    <ArrowRightIcon className="w-3 h-3" />
                </div>
            </div>
        </motion.div>
    );
}
