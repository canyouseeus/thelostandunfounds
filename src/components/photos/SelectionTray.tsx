
import React, { useMemo } from 'react';
import { useToast } from '../Toast';
import { LoadingSpinner } from '../Loading';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBagIcon, XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { PricingOption } from './PhotoGallery';

interface Photo {
    id: string;
    title: string;
    thumbnail_url: string;
    google_drive_file_id: string;
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
        if (count === 0) return { total: 0, messages: [] };

        const sortedOptions = [...pricingOptions].sort((a, b) => b.photo_count - a.photo_count);
        const singleOption = pricingOptions.find(o => o.photo_count === 1);
        const singlePrice = singleOption?.price || 5.00;

        const sbTarget = pricingOptions.find(o => o.photo_count >= 3 && o.photo_count < 10)?.photo_count || 3;
        const eliteTarget = pricingOptions.find(o => o.photo_count >= 10)?.photo_count || 25;

        let remaining = count;
        let total = 0;
        for (const option of sortedOptions) {
            if (option.photo_count <= 0) continue;
            const numBundles = Math.floor(remaining / option.photo_count);
            if (numBundles > 0) {
                total += numBundles * option.price;
                remaining %= option.photo_count;
            }
        }
        if (remaining > 0) total += remaining * singlePrice;

        const messages: { text: string; highlight?: boolean; secondary?: string }[] = [];

        // Elite Bundle Progress (Always show)
        const toElite = count % eliteTarget === 0 ? eliteTarget : eliteTarget - (count % eliteTarget);
        messages.push({
            text: `ADD ${toElite} MORE FOR `,
            highlight: true,
            secondary: 'YOUR NEXT ELITE BUNDLE'
        });

        // Standard Bundle Progress (Always show)
        const toSB = count % sbTarget === 0 ? sbTarget : sbTarget - (count % sbTarget);
        messages.push({
            text: `ADD ${toSB} MORE FOR THE `,
            highlight: true,
            secondary: `NEXT STANDARD BUNDLE`
        });

        return { total, messages };
    }, [count, pricingOptions]);

    if (count === 0) return null;

    return (
        <motion.div
            initial={{ y: 200 }}
            animate={{ y: 0 }}
            exit={{ y: 200 }}
            className="fixed bottom-0 left-0 right-0 z-50 px-4 md:px-8 py-0 flex justify-center pointer-events-none"
        >
            <div className="bg-zinc-950/95 backdrop-blur-2xl rounded-none shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-full max-w-5xl px-4 md:px-6 py-1.5 md:py-2 flex flex-col md:flex-row items-center gap-6 pointer-events-auto">

                {/* Thumbnails Section */}
                <div className="hidden md:flex flex-1 w-full h-16 items-center order-1 mt-0">
                    <div className="flex items-center overflow-x-auto py-1 scrollbar-hide w-full justify-center md:justify-start">
                        <AnimatePresence mode="popLayout">
                            {selectedPhotos.map((photo, index) => (
                                <motion.div
                                    key={photo.id}
                                    layout
                                    initial={{ opacity: 0, x: 20, scale: 0.8 }}
                                    animate={{
                                        opacity: 1,
                                        x: 0,
                                        scale: 1,
                                        zIndex: index
                                    }}
                                    whileHover={{ zIndex: 100 }}
                                    exit={{ opacity: 0, scale: 0.8, x: -20 }}
                                    className="relative group flex-shrink-0"
                                    style={{
                                        marginLeft: index === 0 ? '0' : '-1.5rem'
                                    }}
                                >
                                    <img
                                        src={`https://lh3.googleusercontent.com/d/${photo.google_drive_file_id}=s160`}
                                        alt={photo.title}
                                        className="w-12 h-12 md:w-16 md:h-16 object-cover rounded border border-white/10 group-hover:border-white/30 transition-all group-hover:-translate-y-1"
                                    />
                                    <button
                                        onClick={() => onRemove(photo.id)}
                                        className="absolute -top-1.5 -right-1.5 bg-red-500 rounded-full p-0.5 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                    >
                                        <XMarkIcon className="w-3 h-3 text-white" />
                                    </button>
                                </motion.div >
                            ))}
                        </AnimatePresence >
                    </div >
                </div >

                {/* Pricing & Logic Section */}
                < div className="flex flex-row items-center justify-between gap-6 md:gap-12 w-full md:w-auto order-1 md:order-2" >
                    <div className="flex flex-col justify-center">
                        {/* Price & Count Line */}
                        <div className="flex items-baseline gap-3 mb-1">
                            <span className="text-xl md:text-3xl font-black text-white tracking-tighter tabular-nums leading-none">
                                ${pricing.total.toFixed(2)}
                            </span>
                            <span className="text-[8px] md:text-[9px] font-black text-zinc-500 tracking-[0.2em] uppercase leading-none">
                                {count} COLLECTED
                            </span>
                        </div>

                        {/* Bundle Progress: Aligned for a clean vertical edge */}
                        <div className="flex flex-col space-y-0.5">
                            {pricing.messages.map((msg, idx) => (
                                <div key={idx} className="flex items-start gap-1.5">
                                    <div className={`w-1 h-1 rounded-full shrink-0 mt-1 ${msg.highlight ? 'bg-green-500' : 'bg-zinc-700'}`} />
                                    <p className="text-[7px] md:text-[9px] font-black tracking-widest uppercase leading-tight">
                                        <span className="text-zinc-500">{msg.text}</span>
                                        {msg.secondary && (
                                            <span className={msg.highlight ? 'text-green-500' : 'text-zinc-400'}>
                                                {msg.secondary}
                                            </span>
                                        )}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Checkout Button */}
                    <button
                        onClick={onCheckout}
                        disabled={loading}
                        className="group relative flex items-center gap-2 px-6 py-2 md:px-10 md:py-3.5 bg-white text-black rounded-none font-black uppercase tracking-[0.2em] text-[10px] md:text-[11px] hover:bg-zinc-200 transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap shrink-0"
                    >
                        {loading ? (
                            <LoadingSpinner size="sm" className="text-black" />
                        ) : (
                            <>
                                CHECKOUT
                                <ShoppingBagIcon className="w-3 h-3 md:w-4 md:h-4 transition-transform group-hover:translate-x-0.5" />
                            </>
                        )}

                        {count >= 3 && (
                            <div className="absolute -top-1.5 -right-1.5 md:-top-2 md:-right-2 bg-green-500 text-black p-0.5 md:p-1 rounded-full shadow-lg">
                                <CheckCircleIcon className="w-2.5 h-2.5 md:w-3.5 md:h-3.5" />
                            </div>
                        )}
                    </button>
                </div >
            </div >
        </motion.div >
    );
};

export default SelectionTray;
