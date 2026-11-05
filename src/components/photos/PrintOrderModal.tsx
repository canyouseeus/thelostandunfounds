import React, { useState, useEffect, useMemo } from 'react';
import { XMarkIcon, ShoppingCartIcon, CreditCardIcon } from '@heroicons/react/24/outline';
import { ShippingAddressForm, EMPTY_SHIPPING_FORM, isShippingFormComplete, ShippingFormValue } from '../shop/ShippingAddressForm';
import { LightningPaymentModal } from '../shop/LightningPaymentModal';
import { getPhotoPrintCheckoutUrl, getPhotoPrintStrikeInvoice } from '../../utils/checkout-utils';
import { getAffiliateRef } from '../../utils/affiliate-tracking';

type Orientation = 'landscape' | 'portrait';

interface PrintOption {
  id: string;
  size_label: string;
  width_in: number;
  height_in: number;
  framed: boolean;
  frame_color: string | null;
  price: number;
  currency: string;
}

interface SizeGroup {
  key: string;
  widthIn: number;
  heightIn: number;
  unframed?: PrintOption;
}

export interface PrintablePhoto {
  id: string;
  title: string;
  googleDriveFileId: string;
  metadata?: { width?: number; height?: number } | null;
}

/**
 * Universal "order a print" flow for any gallery photo: pick a size and see
 * a live preview of the photo before paying. Framing is temporarily
 * unavailable while a proper frame mockup source is sourced. Orientation
 * (landscape/portrait) is detected from the photo's own pixel dimensions
 * so the preview and the Prodigi order sent to fulfillment always match
 * how the photo was actually shot.
 */
export default function PrintOrderModal({ photo, onClose }: { photo: PrintablePhoto; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [options, setOptions] = useState<PrintOption[]>([]);

  const [orientation, setOrientation] = useState<Orientation | null>(
    photo.metadata?.width && photo.metadata?.height
      ? photo.metadata.width >= photo.metadata.height ? 'landscape' : 'portrait'
      : null
  );

  const [selectedSizeKey, setSelectedSizeKey] = useState<string | null>(null);

  const [showShippingForm, setShowShippingForm] = useState(false);
  const [shipping, setShipping] = useState<ShippingFormValue>(EMPTY_SHIPPING_FORM);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [lightningPayment, setLightningPayment] = useState<{
    invoiceId: string; lnInvoice: string; expirationInSec: number; amount: number; description: string;
  } | null>(null);

  const previewUrl = `/api/gallery/stream?fileId=${photo.googleDriveFileId}&size=1200`;

  // Fall back to a client-side probe when Drive's stored metadata is missing
  // dimensions (older synced rows, or non-standard mime types).
  useEffect(() => {
    if (orientation) return;
    const img = new Image();
    img.onload = () => setOrientation(img.naturalWidth >= img.naturalHeight ? 'landscape' : 'portrait');
    img.onerror = () => setOrientation('landscape');
    img.src = previewUrl;
  }, [orientation, previewUrl]);

  useEffect(() => {
    fetch('/api/prodigi/print-catalog')
      .then((r) => r.json())
      .then((data) => {
        setOptions(data.options || []);
      })
      .catch(() => setLoadError('Could not load print options. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  const sizeGroups = useMemo<SizeGroup[]>(() => {
    const map = new Map<string, SizeGroup>();
    for (const opt of options) {
      if (opt.framed) continue;
      const key = `${opt.width_in}x${opt.height_in}`;
      map.set(key, { key, widthIn: opt.width_in, heightIn: opt.height_in, unframed: opt });
    }
    return [...map.values()].sort((a, b) => a.widthIn * a.heightIn - b.widthIn * b.heightIn);
  }, [options]);

  // Default to the middle size once the catalog loads.
  useEffect(() => {
    if (sizeGroups.length > 0 && !selectedSizeKey) {
      setSelectedSizeKey(sizeGroups[Math.floor((sizeGroups.length - 1) / 2)].key);
    }
  }, [sizeGroups, selectedSizeKey]);

  const selectedGroup = sizeGroups.find((g) => g.key === selectedSizeKey) || null;
  const selectedOption = selectedGroup?.unframed || null;

  const handleCardCheckout = async () => {
    if (!selectedOption || !orientation) return;
    setCheckoutError(null);
    setStripeLoading(true);
    try {
      const result = await getPhotoPrintCheckoutUrl({
        photoId: photo.id,
        printOptionId: selectedOption.id,
        orientation,
        affiliateRef: getAffiliateRef(),
      });
      window.location.href = result.url;
    } catch (error: any) {
      setCheckoutError(error.message || 'Failed to start checkout. Please try again.');
      setStripeLoading(false);
    }
  };

  const handleBitcoinClick = () => {
    if (!selectedOption || !orientation) return;
    setCheckoutError(null);
    setShowShippingForm(true);
  };

  const handleShippingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError(null);
    if (!isShippingFormComplete(shipping)) {
      setCheckoutError('Please fill in all required fields.');
      return;
    }
    if (!selectedOption || !orientation) return;

    try {
      setCheckoutLoading(true);
      const result = await getPhotoPrintStrikeInvoice({
        photoId: photo.id,
        printOptionId: selectedOption.id,
        orientation,
        recipient: {
          name: shipping.name,
          email: shipping.email,
          address: {
            line1: shipping.line1,
            line2: shipping.line2 || undefined,
            townOrCity: shipping.townOrCity,
            stateOrCounty: shipping.stateOrCounty || undefined,
            postalOrZipCode: shipping.postalOrZipCode,
            countryCode: shipping.countryCode,
          },
        },
        affiliateRef: getAffiliateRef(),
      });
      setLightningPayment({
        invoiceId: result.invoiceId,
        lnInvoice: result.lnInvoice,
        expirationInSec: result.expirationInSec,
        amount: selectedOption.price,
        description: `Photo print — ${selectedOption.size_label}`,
      });
    } catch (error: any) {
      setCheckoutError(error.message || 'Failed to start checkout. Please try again.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (lightningPayment) {
    return (
      <LightningPaymentModal
        invoiceId={lightningPayment.invoiceId}
        lnInvoice={lightningPayment.lnInvoice}
        expirationInSec={lightningPayment.expirationInSec}
        amount={lightningPayment.amount}
        description={lightningPayment.description}
        onClose={onClose}
      />
    );
  }

  // Phone: a full-screen sheet that scrolls as one column. sm+: a centred
  // two-column card. min-w-0 on both columns stops any long word from
  // widening the grid past the viewport.
  return (
    <div className="fixed inset-0 z-[9999] flex items-stretch sm:items-center justify-center sm:px-4" role="dialog" aria-modal="true" aria-label="Order a print">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-[#0a0a0a] w-full h-[100dvh] sm:h-auto sm:max-w-3xl sm:max-h-[92vh] overflow-y-auto overflow-x-hidden overscroll-contain"
        style={{ borderRadius: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          type="button"
          className="absolute top-2 right-2 text-white bg-black/60 hover:bg-black flex items-center justify-center w-10 h-10 z-10"
          style={{ borderRadius: 0 }}
          aria-label="Close"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-2">
          <div className="min-w-0 bg-white/5 flex items-center justify-center p-4 sm:p-6">
            <img src={previewUrl} alt="Print preview" className="max-w-full max-h-[42dvh] sm:max-h-[70vh] w-auto h-auto object-contain" />
          </div>

          <div className="min-w-0 p-4 sm:p-6 space-y-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <h2 className="text-lg font-black uppercase tracking-widest text-white">Order a Print</h2>

            {loading ? (
              <p className="text-white/50 text-sm">Loading print options…</p>
            ) : loadError ? (
              <p className="text-red-400 text-sm">{loadError}</p>
            ) : sizeGroups.length === 0 ? (
              <p className="text-white/50 text-sm">Prints aren't available right now. Please check back soon.</p>
            ) : showShippingForm ? (
              <form onSubmit={handleShippingSubmit} className="space-y-3">
                <ShippingAddressForm value={shipping} onChange={setShipping} />
                {checkoutError && <p className="text-xs text-red-400">{checkoutError}</p>}
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowShippingForm(false)} className="flex-1 sm:flex-none px-4 py-3 sm:py-2 text-white/60 bg-white/10 hover:text-white hover:bg-white/20 transition-colors font-semibold text-sm" style={{ borderRadius: 0 }}>
                    Back
                  </button>
                  <button type="submit" disabled={checkoutLoading} className={`flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white text-black px-4 py-3 sm:py-2 hover:bg-white/90 transition-colors font-semibold text-sm ${checkoutLoading ? 'opacity-50 pointer-events-none' : ''}`} style={{ borderRadius: 0 }}>
                    {checkoutLoading ? <span className="animate-pulse">Creating invoice…</span> : 'Pay with Bitcoin ⚡'}
                  </button>
                </div>
              </form>
            ) : (
              <>
                {/* Size picker */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Choose Your Size</p>
                  <div className="grid grid-cols-3 gap-2">
                    {sizeGroups.map((g) => {
                      const active = g.key === selectedSizeKey;
                      const displayPrice = g.unframed?.price;
                      return (
                        <button
                          key={g.key}
                          onClick={() => setSelectedSizeKey(g.key)}
                          className={`min-w-0 flex flex-col items-center gap-1 px-2 py-3 transition-colors ${active ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
                          style={{ borderRadius: 0 }}
                        >
                          <span className="text-sm font-black whitespace-nowrap">{g.widthIn}×{g.heightIn}"</span>
                          {displayPrice !== undefined && <span className="text-[11px] font-mono opacity-80">${displayPrice.toFixed(0)}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedOption && (
                  <div className="flex flex-col gap-1 pt-1">
                    <span className="text-2xl font-bold text-white">${selectedOption.price.toFixed(2)}</span>
                    <span className="text-white/40 text-[11px] uppercase tracking-widest leading-relaxed">
                      Ships US · CA · UK · AU in 1–3 weeks ·{' '}
                      <a href="/shipping" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">Shipping & returns</a>
                    </span>
                  </div>
                )}

                {checkoutError && <p className="text-xs text-red-400">{checkoutError}</p>}

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                  <button
                    onClick={handleBitcoinClick}
                    disabled={!selectedOption || !orientation}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white text-black px-4 py-3 sm:py-2 hover:bg-white/90 transition-colors font-semibold text-sm disabled:opacity-40"
                    style={{ borderRadius: 0 }}
                  >
                    <ShoppingCartIcon className="w-4 h-4" />
                    Pay with Bitcoin ⚡
                  </button>
                  <button
                    onClick={handleCardCheckout}
                    disabled={!selectedOption || !orientation || stripeLoading}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white/10 text-white px-4 py-3 sm:py-2 hover:bg-white hover:text-black transition-colors font-semibold text-sm disabled:opacity-40 ${stripeLoading ? 'pointer-events-none' : ''}`}
                    style={{ borderRadius: 0 }}
                  >
                    {stripeLoading ? (
                      <span className="animate-pulse">Redirecting…</span>
                    ) : (
                      <>
                        <CreditCardIcon className="w-4 h-4" />
                        Pay with Card
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
