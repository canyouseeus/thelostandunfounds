import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { pollStrikeInvoiceStatus } from '../utils/checkout-utils';

type ZapPhase = 'idle' | 'selecting' | 'creating' | 'invoice' | 'paid' | 'expired' | 'error';

const PRESETS = [
    { sats: 100, label: '100' },
    { sats: 1000, label: '1K' },
    { sats: 5000, label: '5K' },
];

interface ZapInvoice {
    invoiceId: string;
    lnInvoice: string;
    expirationInSec: number;
    amountSats: number;
}

export function ZapButton({
    photoTitle,
    className = '',
}: {
    photoTitle?: string;
    className?: string;
}) {
    const [phase, setPhase] = useState<ZapPhase>('idle');
    const [customSats, setCustomSats] = useState('');
    const [invoice, setInvoice] = useState<ZapInvoice | null>(null);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);

    // Countdown when invoice is active
    useEffect(() => {
        if (phase !== 'invoice' || !invoice) return;
        setTimeLeft(invoice.expirationInSec);
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    setPhase('expired');
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [phase, invoice]);

    // Poll for payment confirmation
    useEffect(() => {
        if (phase !== 'invoice' || !invoice) return;
        let cancelled = false;
        const poll = async () => {
            const result = await pollStrikeInvoiceStatus(
                invoice.invoiceId,
                (state) => {
                    if (cancelled) return;
                    if (state === 'PAID') setPhase('paid');
                    else if (state === 'CANCELLED') setPhase('expired');
                },
                { intervalMs: 3000, maxAttempts: Math.ceil(invoice.expirationInSec / 3) }
            );
            if (!cancelled && result === 'TIMEOUT') setPhase('expired');
        };
        poll();
        return () => {
            cancelled = true;
        };
    }, [phase, invoice]);

    const createZap = async (sats: number) => {
        setPhase('creating');
        setError('');
        try {
            const res = await fetch('/api/nostr/zap', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amountSats: sats,
                    description: photoTitle
                        ? `⚡ Zap: ${photoTitle} — THE LOST+UNFOUNDS`
                        : '⚡ Nostr Zap — THE LOST+UNFOUNDS',
                }),
            });
            if (!res.ok) throw new Error('Failed');
            const data = await res.json();
            setInvoice({
                invoiceId: data.invoiceId,
                lnInvoice: data.lnInvoice,
                expirationInSec: data.expirationInSec,
                amountSats: sats,
            });
            setPhase('invoice');
        } catch {
            setError('Could not create invoice. Try again.');
            setPhase('error');
        }
    };

    const handleCustom = () => {
        const n = parseInt(customSats, 10);
        if (n >= 100 && n <= 1_000_000) createZap(n);
    };

    const handleCopy = async () => {
        if (!invoice) return;
        try {
            await navigator.clipboard.writeText(invoice.lnInvoice);
        } catch {
            const ta = document.createElement('textarea');
            ta.value = invoice.lnInvoice;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const formatTime = (s: number) =>
        `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

    const close = () => {
        setPhase('idle');
        setInvoice(null);
        setError('');
        setCustomSats('');
    };

    const qrUrl = invoice
        ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(invoice.lnInvoice)}&bgcolor=000000&color=ffffff&margin=10`
        : '';

    return (
        <>
            <button
                onClick={() => setPhase('selecting')}
                className={`flex items-center gap-1.5 px-5 py-2.5 bg-black border border-white/25 hover:border-white text-white rounded-none font-black text-[10px] uppercase tracking-[0.2em] transition-all ${className}`}
            >
                <span>⚡</span>
                <span>Zap</span>
            </button>

            {phase !== 'idle' && (
                <div
                    className="fixed inset-0 z-[10002] flex items-center justify-center px-4"
                    role="dialog"
                    aria-modal="true"
                    onKeyDown={(e) => e.key === 'Escape' && close()}
                >
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={close} />
                    <div
                        className="relative bg-black border border-white/25 rounded-none shadow-2xl max-w-sm w-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={close}
                            className="absolute top-3 right-3 text-white/50 hover:text-white transition-colors z-10"
                            aria-label="Close"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>

                        <div className="p-6 space-y-5">
                            {/* Amount selection */}
                            {(phase === 'selecting' || phase === 'error') && (
                                <>
                                    <div className="text-center space-y-1">
                                        <h2 className="text-base font-black text-white uppercase tracking-[0.25em]">
                                            ⚡ Zap
                                        </h2>
                                        <p className="text-white/40 text-[10px] uppercase tracking-widest">
                                            Send a Lightning tip
                                        </p>
                                    </div>

                                    {error && (
                                        <p className="text-red-400 text-xs text-center">{error}</p>
                                    )}

                                    <div className="grid grid-cols-3 gap-2">
                                        {PRESETS.map((p) => (
                                            <button
                                                key={p.sats}
                                                onClick={() => createZap(p.sats)}
                                                className="group py-3 bg-white/5 hover:bg-white border border-white/20 hover:border-white rounded-none transition-all"
                                            >
                                                <span className="block font-black text-sm text-white group-hover:text-black transition-colors">
                                                    {p.label}
                                                </span>
                                                <span className="block text-[9px] font-bold tracking-widest text-white/40 group-hover:text-black/50 transition-colors mt-0.5">
                                                    SATS
                                                </span>
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            min={100}
                                            max={1000000}
                                            placeholder="Custom sats"
                                            value={customSats}
                                            onChange={(e) => setCustomSats(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleCustom()}
                                            className="flex-1 bg-white/5 border border-white/20 focus:border-white/50 text-white text-sm px-3 py-2 rounded-none placeholder-white/25 outline-none transition-colors"
                                        />
                                        <button
                                            onClick={handleCustom}
                                            className="px-4 py-2 bg-white text-black rounded-none font-black text-[10px] uppercase tracking-widest hover:bg-white/90 transition-colors"
                                        >
                                            Zap
                                        </button>
                                    </div>

                                    <p className="text-white/25 text-[10px] text-center tracking-widest">
                                        MIN 100 SATS
                                    </p>
                                </>
                            )}

                            {/* Creating invoice */}
                            {phase === 'creating' && (
                                <div className="text-center py-10 space-y-3">
                                    <div className="text-3xl animate-pulse">⚡</div>
                                    <p className="text-white/50 text-xs uppercase tracking-widest">
                                        Creating invoice...
                                    </p>
                                </div>
                            )}

                            {/* QR + payment */}
                            {phase === 'invoice' && invoice && (
                                <>
                                    <div className="text-center space-y-1">
                                        <h2 className="text-base font-black text-white uppercase tracking-[0.2em]">
                                            ⚡ {invoice.amountSats.toLocaleString()} sats
                                        </h2>
                                        <p className="text-white/40 text-[10px] uppercase tracking-widest">
                                            Scan with any Lightning wallet
                                        </p>
                                    </div>

                                    <div className="flex justify-center">
                                        <div className="bg-black p-2 border border-white/20">
                                            <img
                                                src={qrUrl}
                                                alt="Lightning invoice QR code"
                                                className="w-[240px] h-[240px]"
                                                style={{ imageRendering: 'pixelated' }}
                                            />
                                        </div>
                                    </div>

                                    <p className="text-center text-white/40 text-[10px]">
                                        Strike · Cash App · Phoenix · Muun · any wallet
                                    </p>

                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            readOnly
                                            value={invoice.lnInvoice}
                                            className="flex-1 bg-white/5 border border-white/20 text-white/50 text-xs px-3 py-2 rounded-none font-mono truncate"
                                            onClick={(e) => (e.target as HTMLInputElement).select()}
                                        />
                                        <button
                                            onClick={handleCopy}
                                            className="px-3 py-2 bg-white text-black rounded-none font-black text-xs hover:bg-white/90 transition-colors whitespace-nowrap"
                                        >
                                            {copied ? '✓' : 'Copy'}
                                        </button>
                                    </div>

                                    <div className="text-center space-y-1.5">
                                        <p
                                            className={`text-xs font-mono ${timeLeft < 60 ? 'text-red-400' : 'text-white/40'}`}
                                        >
                                            Expires in {formatTime(timeLeft)}
                                        </p>
                                        <div className="w-full bg-white/10 h-px">
                                            <div
                                                className="h-full bg-white/40 transition-all duration-1000 ease-linear"
                                                style={{
                                                    width: `${(timeLeft / invoice.expirationInSec) * 100}%`,
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-center gap-2 text-white/35 text-[10px] uppercase tracking-widest">
                                        <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" />
                                        Waiting for payment...
                                    </div>
                                </>
                            )}

                            {/* Paid */}
                            {phase === 'paid' && (
                                <div className="text-center py-10 space-y-4">
                                    <div className="text-5xl">⚡</div>
                                    <h3 className="text-xl font-black text-white uppercase tracking-[0.25em]">
                                        Zapped!
                                    </h3>
                                    <p className="text-white/40 text-sm">Thank you for the zap.</p>
                                    <button
                                        onClick={close}
                                        className="px-6 py-2.5 bg-white text-black rounded-none font-black text-[10px] uppercase tracking-widest hover:bg-white/90 transition-colors"
                                    >
                                        Done
                                    </button>
                                </div>
                            )}

                            {/* Expired */}
                            {phase === 'expired' && (
                                <div className="text-center py-10 space-y-4">
                                    <div className="text-5xl">⏰</div>
                                    <h3 className="text-lg font-black text-red-400 uppercase tracking-[0.2em]">
                                        Expired
                                    </h3>
                                    <p className="text-white/40 text-sm">Invoice expired. Try again.</p>
                                    <button
                                        onClick={() => {
                                            setInvoice(null);
                                            setPhase('selecting');
                                        }}
                                        className="px-6 py-2.5 bg-white text-black rounded-none font-black text-[10px] uppercase tracking-widest hover:bg-white/90 transition-colors"
                                    >
                                        Try Again
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
