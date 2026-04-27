import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

interface DownloadEmailModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (email: string) => void;
    photoCount?: number;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DownloadEmailModal: React.FC<DownloadEmailModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    photoCount = 1,
}) => {
    const [email, setEmail] = useState('');
    const [err, setErr] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = email.trim();
        if (!EMAIL_RE.test(trimmed)) {
            setErr('Enter a valid email address.');
            return;
        }
        setErr(null);
        onSubmit(trimmed);
    };

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
                            <ArrowDownTrayIcon className="w-4 h-4 text-white/60" />
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40">
                                Before you download
                            </span>
                        </div>

                        <h2 className="text-lg font-black uppercase tracking-[0.15em] text-white mb-2">
                            {photoCount > 1 ? `${photoCount} photos` : 'Your photo'}
                        </h2>
                        <p className="text-white/40 text-[11px] leading-relaxed mb-5">
                            Enter your email to download. We use this to track your downloads
                            and occasionally share new drops — never spam, unsubscribe anytime.
                        </p>

                        <form onSubmit={handleSubmit}>
                            <input
                                type="email"
                                autoFocus
                                required
                                value={email}
                                onChange={e => { setEmail(e.target.value); if (err) setErr(null); }}
                                placeholder="you@email.com"
                                className="w-full bg-black border border-white/20 text-white text-sm px-3 py-3 placeholder-white/20 focus:outline-none focus:border-white/50 mb-2"
                            />
                            {err && (
                                <p className="text-red-400 text-[10px] uppercase tracking-widest mb-2">{err}</p>
                            )}
                            <button
                                type="submit"
                                className="w-full px-5 py-3.5 bg-white text-black font-black text-[11px] uppercase tracking-[0.2em] hover:bg-white/80 transition-colors mt-4"
                            >
                                Continue to Download
                            </button>
                        </form>

                        <p className="text-[9px] text-white/30 leading-relaxed text-center mt-4">
                            Licensed for personal use only.{' '}
                            <a href="/licensing" className="text-white/50 hover:text-white underline underline-offset-2 transition-colors">
                                Commercial licensing →
                            </a>
                        </p>

                        <button
                            onClick={onClose}
                            className="w-full text-[10px] text-white/25 hover:text-white/50 uppercase tracking-widest transition-colors mt-4"
                        >
                            Cancel
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default DownloadEmailModal;
