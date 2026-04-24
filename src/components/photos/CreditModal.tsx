import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';

interface CreditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (email: string, balance: number) => void;
}

const CreditModal: React.FC<CreditModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [newsletterOptIn, setNewsletterOptIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hp, setHp] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (hp) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/credits/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, newsletter: newsletterOptIn, hp })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        return;
      }

      localStorage.setItem('credit_email', trimmed);
      onSuccess(trimmed, data.credits_remaining);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center px-4 bg-black/90"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
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

            <div className="mb-6">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-1">
                Free Access
              </p>
              <h2 className="text-xl font-black uppercase tracking-tight text-white mb-2">
                100 Free Credits
              </h2>
              <p className="text-white/40 text-[11px] leading-relaxed">
                Every download uses 1 credit. Enter your email to claim 100 credits — enough to download 100 photos, free.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Honeypot — invisible to humans, filled by bots */}
              <input
                type="text"
                name="website"
                value={hp}
                onChange={(e) => setHp(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="hidden"
              />

              <div>
                <label htmlFor="credit-email" className="block text-[10px] font-black uppercase tracking-widest text-white/50 mb-2">
                  Email Address
                </label>
                <input
                  id="credit-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm focus:outline-none focus:border-white/40 transition-colors"
                />
              </div>

              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex-shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    checked={newsletterOptIn}
                    onChange={(e) => setNewsletterOptIn(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 border transition-colors ${newsletterOptIn ? 'bg-white border-white' : 'bg-transparent border-white/30 group-hover:border-white/60'}`}>
                    {newsletterOptIn && <CheckIcon className="w-3 h-3 text-black mx-auto mt-0.5" />}
                  </div>
                </div>
                <span className="text-[10px] text-white/40 group-hover:text-white/60 transition-colors leading-relaxed">
                  Subscribe to updates and new drops
                </span>
              </label>

              {error && (
                <p className="text-[10px] text-red-400 font-medium">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-white text-black text-[11px] font-black uppercase tracking-[0.2em] hover:bg-white/90 transition-colors disabled:opacity-50"
              >
                {loading ? 'Claiming...' : 'Claim 100 Free Credits'}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CreditModal;
