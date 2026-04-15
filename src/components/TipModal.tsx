import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, HeartIcon } from '@heroicons/react/24/outline';

interface TipModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const VENMO_URL = 'https://venmo.com/u/thelostandunfounds';
const CASHAPP_URL = 'https://cash.app/$ILLKID24';

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
                        className="relative bg-black border border-white/20 w-full max-w-sm p-8"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
                            aria-label="Close"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-2 mb-1">
                            <HeartIcon className="w-4 h-4 text-white/60" />
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40">
                                Optional
                            </span>
                        </div>

                        <h2 className="text-lg font-black uppercase tracking-[0.15em] text-white mb-2">
                            Enjoy the photos!
                        </h2>
                        <p className="text-white/40 text-[11px] leading-relaxed mb-6">
                            Photos are free — but if you love the work and want to show some
                            love back, a tip goes a long way. Follow{' '}
                            <span className="text-white font-bold">@tlau.photos</span> on
                            Instagram too!
                        </p>

                        <div className="space-y-3 mb-6">
                            <a
                                href={VENMO_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between w-full px-5 py-3.5 bg-[#3D95CE] text-white font-black text-[11px] uppercase tracking-[0.2em] hover:bg-[#2d85be] transition-colors"
                            >
                                <span>Tip on Venmo</span>
                                <span className="opacity-70 text-xs font-bold">@thelostandunfounds</span>
                            </a>
                            <a
                                href={CASHAPP_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between w-full px-5 py-3.5 bg-[#00D632] text-black font-black text-[11px] uppercase tracking-[0.2em] hover:bg-[#00c02c] transition-colors"
                            >
                                <span>Tip on Cash App</span>
                                <span className="opacity-60 text-xs font-bold">$ILLKID24</span>
                            </a>
                        </div>

                        <button
                            onClick={onClose}
                            className="w-full text-[10px] text-white/25 hover:text-white/50 uppercase tracking-widest transition-colors"
                        >
                            No thanks, just download
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default TipModal;
