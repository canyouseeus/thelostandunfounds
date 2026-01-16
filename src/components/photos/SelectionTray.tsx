import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, X, CheckCircle } from 'lucide-react';
import { PricingOption } from './PhotoGallery';

interface Photo {
    id: string;
    title: string;
    thumbnail_url: string;
}

interface SelectionTrayProps {
    selectedPhotos: Photo[];
    onRemove: (id: string) => void;
    onCheckout: () => void;
    loading?: boolean;
    pricingOptions?: PricingOption[];
}

const SelectionTray: React.FC<SelectionTrayProps> = ({
    selectedPhotos,
    onRemove,
    onCheckout,
    loading,
    pricingOptions = []
}) => {
    const count = selectedPhotos.length;

    const pricing = useMemo(() => {
        if (count === 0) return { total: 0, message: 'Select photos to begin' };

        // Sort options by count descending to handle largest bundles first
        const sortedOptions = [...pricingOptions].sort((a, b) => b.photo_count - a.photo_count);

        // Find single photo price for base calculations and upsells
        const singleOption = pricingOptions.find(o => o.photo_count === 1);
        const singlePrice = singleOption?.price || 5.00;

        // Find standard bundle (usually 3) for upsell messaging
        const bundleOption = pricingOptions.find(o => o.photo_count > 1 && o.photo_count < 10);

        // Special messaging for small counts (upsells)
        if (bundleOption) {
            if (count < bundleOption.photo_count) {
                const diff = bundleOption.photo_count - count;
                return {
                    total: count * singlePrice,
                    message: `Add ${diff} more for the $${bundleOption.price.toFixed(0)} bundle!`
                };
            }
            if (count === bundleOption.photo_count) {
                return {
                    total: bundleOption.price,
                    message: `${bundleOption.name} Applied! (Best Value)`
                };
            }
        } else if (count === 1) {
            return { total: singlePrice, message: 'Single photo selected' };
        }

        // Standard calculation using available bundles
        let remaining = count;
        let total = 0;
        let msgParts: string[] = [];

        // Handle full gallery buyout (-1) if it's the only thing selected or if count is very high
        const buyoutOption = pricingOptions.find(o => o.photo_count === -1);
        if (buyoutOption && (count > 50)) { // Arbitrary threshold for suggesting buyout
            // For now we prioritize normal bundles unless it's cheaper
        }

        for (const option of sortedOptions) {
            if (option.photo_count <= 0) continue; // Skip buyout/invalid for this loop

            const numBundles = Math.floor(remaining / option.photo_count);
            if (numBundles > 0) {
                total += numBundles * option.price;
                remaining %= option.photo_count;
                msgParts.push(`${numBundles} ${option.name}${numBundles > 1 ? '(s)' : ''}`);
            }
        }

        // Add remaining as singles if not already covered
        if (remaining > 0) {
            total += remaining * singlePrice;
            msgParts.push(`${remaining} Photo${remaining > 1 ? 's' : ''}`);
        }

        return { total, message: msgParts.join(' + ') || 'Calculating...' };
    }, [count, pricingOptions]);

    if (count === 0) return null;

    return (
        <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 flex justify-center"
        >
            <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-4xl p-4 flex flex-col md:flex-row items-center gap-4">
                {/* Thumbnails */}
                <div className="flex -space-x-4 overflow-hidden py-2">
                    {selectedPhotos.map((photo) => (
                        <motion.div
                            key={photo.id}
                            layoutId={`photo-${photo.id}`}
                            className="relative group w-12 h-12 md:w-16 md:h-16 flex-shrink-0"
                        >
                            <img
                                src={photo.thumbnail_url}
                                alt={photo.title}
                                className="w-full h-full object-cover rounded-lg border-2 border-zinc-900 group-hover:border-zinc-700 transition-colors"
                                draggable={false}
                            />
                            <button
                                onClick={() => onRemove(photo.id)}
                                className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                            >
                                <X className="w-3 h-3 text-white" />
                            </button>
                        </motion.div>
                    ))}
                </div>

                {/* Pricing Info */}
                <div className="flex-grow text-left">
                    <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-lg">${pricing.total.toFixed(2)}</span>
                        <span className="text-zinc-400 text-sm hidden md:inline">• {count} Photo{count !== 1 ? 's' : ''}</span>
                    </div>
                    <p className={`text-xs ${count === 3 ? 'text-green-400' : 'text-zinc-500'}`}>
                        {pricing.message}
                    </p>
                </div>

                {/* Action */}
                <button
                    onClick={onCheckout}
                    disabled={loading}
                    className={`flex items-center gap-2 px-8 py-3 rounded-full font-bold transition-all ${count >= 3
                        ? 'bg-green-600 hover:bg-green-500 text-white scale-105 shadow-[0_0_20px_rgba(22,163,74,0.4)]'
                        : 'bg-white hover:bg-zinc-200 text-black'
                        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-t-transparent border-zinc-900 rounded-full animate-spin" />
                    ) : (
                        <>
                            {count >= 3 && <CheckCircle className="w-4 h-4" />}
                            <span>Checkout Now</span>
                            <ShoppingBag className="w-4 h-4" />
                        </>
                    )}
                </button>
            </div>
        </motion.div>
    );
};

export default SelectionTray;
