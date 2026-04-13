import React, { useState, useEffect } from 'react';
import { XMarkIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { pollStrikeInvoiceStatus } from '../../utils/checkout-utils';

const WALLETS = [
  {
    name: 'Strike',
    description: 'Easiest for beginners. Buy with a bank account or card.',
    ios: 'https://apps.apple.com/us/app/strike-bitcoin-payments/id1304396990',
    android: 'https://play.google.com/store/apps/details?id=zap.org',
    web: 'https://strike.me',
  },
  {
    name: 'Cash App',
    description: 'Already have Cash App? Enable Bitcoin and Lightning in settings.',
    ios: 'https://apps.apple.com/us/app/cash-app/id711923939',
    android: 'https://play.google.com/store/apps/details?id=com.squareup.cash',
    web: 'https://cash.app',
  },
  {
    name: 'Muun',
    description: 'Self-custody wallet. No account required.',
    ios: 'https://apps.apple.com/us/app/muun-wallet/id1482037683',
    android: 'https://play.google.com/store/apps/details?id=io.muun.apollo',
    web: 'https://muun.com',
  },
  {
    name: 'Phoenix',
    description: 'Non-custodial Lightning wallet for advanced users.',
    ios: 'https://apps.apple.com/us/app/phoenix-wallet/id1544097028',
    android: 'https://play.google.com/store/apps/details?id=fr.acinq.phoenix.mainnet',
    web: 'https://phoenix.acinq.co',
  },
];

function BitcoinInfoSection() {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-white/10 rounded-none">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-white/50 hover:text-white/80 transition-colors text-sm"
      >
        <span>New to Bitcoin Lightning? How to pay</span>
        {open ? <ChevronUpIcon className="w-4 h-4 flex-shrink-0" /> : <ChevronDownIcon className="w-4 h-4 flex-shrink-0" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 text-white/70 text-sm">
          <ol className="space-y-3 list-none">
            <li className="flex gap-3">
              <span className="text-yellow-400 font-bold flex-shrink-0">1.</span>
              <div>
                <p className="font-semibold text-white/90">Get a Lightning wallet</p>
                <p className="text-white/50 text-xs mt-0.5">Download any of these free apps on your phone:</p>
              </div>
            </li>
          </ol>

          <div className="space-y-2 pl-5">
            {WALLETS.map((w) => (
              <div key={w.name} className="bg-white/5 px-3 py-2 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white/90">{w.name}</span>
                  <div className="flex gap-2 text-xs">
                    <a href={w.ios} target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-white/80 underline">iOS</a>
                    <a href={w.android} target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-white/80 underline">Android</a>
                    <a href={w.web} target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-white/80 underline">Web</a>
                  </div>
                </div>
                <p className="text-white/40 text-xs">{w.description}</p>
              </div>
            ))}
          </div>

          <ol className="space-y-3 list-none">
            <li className="flex gap-3">
              <span className="text-yellow-400 font-bold flex-shrink-0">2.</span>
              <div>
                <p className="font-semibold text-white/90">Add funds</p>
                <p className="text-white/50 text-xs mt-0.5">Buy Bitcoin inside the app using a debit card or bank transfer. Strike and Cash App make this easiest.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-yellow-400 font-bold flex-shrink-0">3.</span>
              <div>
                <p className="font-semibold text-white/90">Scan or paste to pay</p>
                <p className="text-white/50 text-xs mt-0.5">Point your wallet's camera at the QR code above, or tap <span className="text-white/70">"Send"</span> and paste the invoice string. The exact dollar amount is pre-set — no math needed.</p>
              </div>
            </li>
          </ol>

          <p className="text-white/30 text-xs border-t border-white/10 pt-3">
            Bitcoin Lightning is instant and has near-zero fees. Your payment is final once confirmed.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Lightning Payment Modal
 * Shows a QR code of the Lightning invoice for the customer to scan with their wallet.
 * Polls for payment status and shows success/failure states.
 */
export function LightningPaymentModal({
  invoiceId,
  lnInvoice,
  expirationInSec,
  amount,
  description,
  onClose,
}: {
  invoiceId: string;
  lnInvoice: string;
  expirationInSec: number;
  amount: number;
  description: string;
  onClose: () => void;
}) {
  const [paymentState, setPaymentState] = useState<'waiting' | 'paid' | 'expired' | 'error'>('waiting');
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(expirationInSec);

  // Countdown timer
  useEffect(() => {
    if (paymentState !== 'waiting') return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setPaymentState('expired');
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [paymentState]);

  // Poll for payment status
  useEffect(() => {
    if (paymentState !== 'waiting') return;

    let cancelled = false;

    const poll = async () => {
      const result = await pollStrikeInvoiceStatus(invoiceId, (state) => {
        if (cancelled) return;
        if (state === 'PAID') {
          setPaymentState('paid');
        } else if (state === 'CANCELLED') {
          setPaymentState('expired');
        }
      }, { intervalMs: 3000, maxAttempts: Math.ceil(expirationInSec / 3) });

      if (!cancelled && result === 'TIMEOUT') {
        setPaymentState('expired');
      }
    };

    poll();
    return () => { cancelled = true; };
  }, [invoiceId, expirationInSec, paymentState]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(lnInvoice);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = lnInvoice;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(lnInvoice)}&bgcolor=000000&color=ffffff&margin=10`;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
    >
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative bg-black border border-white rounded-none shadow-2xl max-w-md w-full overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-white/80 hover:text-white w-10 h-10 flex items-center justify-center z-10"
          aria-label="Close"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>

        <div className="p-6 space-y-5">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold text-white">⚡ Pay with Bitcoin Lightning</h2>
            <p className="text-white/60 text-sm">{description}</p>
            <p className="text-2xl font-bold text-white">${amount.toFixed(2)} USD</p>
          </div>

          {paymentState === 'waiting' && (
            <>
              <div className="flex justify-center">
                <div className="bg-black p-2 border border-white/20">
                  <img
                    src={qrCodeUrl}
                    alt="Lightning Invoice QR Code"
                    className="w-[280px] h-[280px]"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>
              </div>

              <p className="text-center text-white/50 text-xs">
                Scan with Strike, Cash App, Muun, Phoenix, or any Lightning wallet
              </p>

              <BitcoinInfoSection />

              <div className="space-y-2">
                <div className="flex items-stretch gap-2">
                  <input
                    type="text"
                    readOnly
                    value={lnInvoice}
                    className="flex-1 bg-white/5 border border-white/20 text-white/70 text-xs px-3 py-2 rounded-none font-mono truncate"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    onClick={handleCopy}
                    className="bg-white text-black px-4 py-2 rounded-none text-sm font-semibold hover:bg-white/90 transition-colors whitespace-nowrap"
                  >
                    {copied ? '✓ Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="text-center">
                <p className={`text-sm font-mono ${timeLeft < 60 ? 'text-red-400' : 'text-white/50'}`}>
                  Expires in {formatTime(timeLeft)}
                </p>
                <div className="mt-2 w-full bg-white/10 h-1 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white/40 transition-all duration-1000 ease-linear"
                    style={{ width: `${(timeLeft / expirationInSec) * 100}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-white/40 text-sm">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                Waiting for payment...
              </div>
            </>
          )}

          {paymentState === 'paid' && (
            <div className="text-center space-y-4 py-8">
              <div className="text-6xl">✅</div>
              <h3 className="text-2xl font-bold text-green-400">Payment Received!</h3>
              <p className="text-white/60">Thank you for your purchase.</p>
              <button
                onClick={onClose}
                className="bg-white text-black px-6 py-3 rounded-none font-semibold hover:bg-white/90 transition-colors"
              >
                Done
              </button>
            </div>
          )}

          {paymentState === 'expired' && (
            <div className="text-center space-y-4 py-8">
              <div className="text-6xl">⏰</div>
              <h3 className="text-xl font-bold text-red-400">Invoice Expired</h3>
              <p className="text-white/60 text-sm">The Lightning invoice has expired. Please try again.</p>
              <button
                onClick={onClose}
                className="bg-white text-black px-6 py-3 rounded-none font-semibold hover:bg-white/90 transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
