import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, X, CheckCircle } from 'lucide-react';

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
}

const SelectionTray: React.FC<SelectionTrayProps> = ({
    selectedPhotos,
    onRemove,
    onCheckout,
    loading
}) => {
    const count = selectedPhotos.length;

    const pricing = useMemo(() => {
        if (count === 0) return { total: 0, message: 'Select photos to begin' };

        // Elite Bundle: 25 photos for $37.50 ($1.50 each)
        if (count === 25) return { total: 37.50, message: 'Elite Bundle Applied! ($1.50/photo)' };

        // Better messaging for upsells
        if (count === 1) return { total: 5.00, message: 'Add 2 more for the $8 bundle!' };
        if (count === 2) return { total: 10.00, message: 'Add 1 more to unlock the $8 bundle!' };
        if (count === 3) return { total: 8.00, message: 'Bundle Applied! (Best Value)' };

        // Suggest Elite Bundle if count is between 15 and 24
        if (count >= 15 && count < 25) {
            const currentTotal = (Math.floor(count / 3) * 8.00) + ((count % 3) * 5.00);
            const savings = currentTotal - 37.50;
            if (savings > 0) {
                return {
                    total: currentTotal,
                    message: `Add ${25 - count} more to save $${savings.toFixed(2)} with the Elite Bundle!`
                };
            }
        }

        // Standard Calculation
        const bundles25 = Math.floor(count / 25);
        let rem = count % 25;
        const bundles3 = Math.floor(rem / 3);
        const singles = rem % 3;

        const total = (bundles25 * 37.50) + (bundles3 * 8.00) + (singles * 5.00);

        let msg = '';
        if (bundles25 > 0) msg += `${bundles25} Elite Bundle(s)`;
        if (bundles3 > 0) msg += (msg ? ' + ' : '') + `${bundles3} Bundle(s)`;
        if (singles > 0) msg += (msg ? ' + ' : '') + `${singles} Photo(s)`;

        return { total, message: msg || 'Calculating...' };
    }, [count]);

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
