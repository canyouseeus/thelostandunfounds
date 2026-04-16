import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, HeartIcon } from '@heroicons/react/24/outline';

interface TipModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const TIPS = [
    {
        label: 'Venmo',
        handle: '@thelostandunfounds',
        url: 'https://venmo.com/u/thelostandunfounds',
    },
    {
        label: 'Cash App',
        handle: '$ILLKID24',
        url: 'https://cash.app/$ILLKID24',
    },
    {
        label: 'Bitcoin',
        handle: 'bc1q…tip',
        url: 'bitcoin:bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    },
];

const TipModal: React.FC<TipModalProps> = ({ isOpen, onClose }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.97 }}
                        transition={{ duration: 0.2 }}
                        className="relative bg-black border border-white/10 w-full max-w-sm p-8"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors"
                            aria-label="Close"
                        >
                            <XMarkIcon className="w-4 h-4" />
                        </button>

                        <div className="flex items-center gap-2 mb-4">
                            <HeartIcon className="w-3.5 h-3.5 text-white/30" />
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30">
                                Optional
                            </span>
                        </div>

                        <h2 className="text-xl font-black uppercase tracking-tight text-white mb-2">
                            Enjoy the photos.
                        </h2>
                        <p className="text-white/40 text-[11px] leading-relaxed mb-6">
                            Everything's free — tips are appreciated but never expected.
                            Tag <span className="text-white font-bold">@tlau.photos</span> when you post.
                        </p>

                        <div className="space-y-2 mb-6">
                            {TIPS.map((tip) => (
                                <a
                                    key={tip.label}
                                    href={tip.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between w-full px-4 py-3 bg-white/5 border border-white/10 hover:bg-white hover:text-black group transition-all"
                                >
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white group-hover:text-black transition-colors">
                                        {tip.label}
                                    </span>
                                    <span className="text-[10px] font-mono text-white/40 group-hover:text-black/60 transition-colors">
                                        {tip.handle}
                                    </span>
                                </a>
                            ))}
                        </div>

                        <button
                            onClick={onClose}
                            className="w-full text-[9px] font-black uppercase tracking-[0.2em] text-white/20 hover:text-white/50 transition-colors"
                        >
                            No thanks
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default TipModal;
