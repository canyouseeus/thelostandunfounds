import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRightIcon, MegaphoneIcon } from '@heroicons/react/24/outline';

interface BannerData {
    campaign_id: string;
    title: string;
    image_url: string;
    link_url: string;
    is_enterprise: boolean;
    layer: 'enterprise' | 'public_queue' | 'public_idle';
}

interface MarketplaceBannerProps {
    surface: 'gallery' | 'shop' | 'blog';
}

/**
 * MarketplaceBanner - A surface-aware, dual-layer banner component.
 * Synchronized to 8-second global slots.
 */
export default function MarketplaceBanner({ surface }: MarketplaceBannerProps) {
    const [banner, setBanner] = useState<BannerData | null>(null);
    const [loading, setLoading] = useState(true);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        fetchBanner();

        // Synchronized refresh: Calculate time until next 8-second boundary
        const now = Date.now();
        const delay = 8000 - (now % 8000);

        const initialTimeout = setTimeout(() => {
            fetchBanner();
            timerRef.current = setInterval(fetchBanner, 8000);
        }, delay);

        return () => {
            clearTimeout(initialTimeout);
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [surface]);

    async function fetchBanner() {
        try {
            const { data, error } = await supabase.rpc('get_current_banner', {
                target_surface: surface
            });

            if (error) throw error;
            setBanner(data);
        } catch (err) {
            console.error('Error fetching marketplace banner:', err);
        } finally {
            setLoading(false);
        }
    }

    if (loading || !banner) {
        return (
            <div className="max-w-7xl mx-auto mb-12 px-4 md:px-8">
                <Link
                    to="/advertise"
                    className="group relative block w-full bg-zinc-900/10 border border-white/5 py-4 px-6 overflow-hidden transition-all hover:bg-zinc-900/20 hover:border-white/10"
                >
                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-white/5 flex items-center justify-center border border-white/10">
                                <MegaphoneIcon className="w-5 h-5 text-white/20" />
                            </div>
                            <div className="text-left">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 leading-none mb-1">MARKETPLACE</p>
                                <p className="text-sm font-light text-white/60 uppercase tracking-widest">ADVERTISE YOUR CONTENT WITH US</p>
                            </div>
                        </div>
                        <ArrowRightIcon className="w-5 h-5 text-white/10 group-hover:text-white transition-all transform group-hover:translate-x-1" />
                    </div>
                </Link>
            </div>
        );
    }

    const isIdle = banner.layer === 'public_idle';
    const isEnterprise = banner.layer === 'enterprise';

    return (
        <div className="max-w-7xl mx-auto mb-12 px-4 md:px-8">
            <AnimatePresence mode="wait">
                <motion.div
                    key={banner.campaign_id}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.02 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                >
                    <Link
                        to={banner.link_url}
                        className="group relative block w-full aspect-[21/9] md:aspect-[32/9] bg-black border border-white/10 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                    >
                        {/* Background Image */}
                        <div className="absolute inset-0">
                            <img
                                src={banner.image_url}
                                alt={banner.title}
                                className="w-full h-full object-cover opacity-60 grayscale transition-all duration-1000 group-hover:scale-105 group-hover:grayscale-0"
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent" />
                        </div>

                        {/* Content */}
                        <div className="absolute inset-0 flex flex-col justify-center p-8 md:p-12">
                            <div className="space-y-2 md:space-y-4 max-w-2xl text-left">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className={`text-[10px] md:text-xs font-black uppercase tracking-[0.4em] ${isEnterprise ? 'text-amber-500' : 'text-white/60'}`}>
                                        {isEnterprise ? 'PREMIUM PARTNER' : isIdle ? 'IDLE SLOT' : 'FEATURED'}
                                    </span>
                                    {isIdle && (
                                        <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest border border-white/10 px-2 py-0.5">
                                            Available Now
                                        </span>
                                    )}
                                </div>

                                <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter leading-none mb-4 group-hover:tracking-normal transition-all duration-700">
                                    {banner.title}
                                </h2>

                                <div className="pt-4">
                                    <span className="inline-flex items-center gap-3 px-6 py-3 bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] group-hover:bg-zinc-200 transition-colors">
                                        EXPLORE
                                        <ArrowRightIcon className="w-4 h-4" />
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Advertise Ribbon */}
                        <div className="absolute top-0 right-0 p-4">
                            <div className="flex gap-2">
                                {isEnterprise && (
                                    <span className="text-[8px] font-black uppercase tracking-widest text-amber-500/50 bg-black/50 backdrop-blur-sm px-3 py-1 border border-amber-500/20">
                                        ENTERPRISE
                                    </span>
                                )}
                                <Link
                                    to="/advertise"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-[8px] font-black uppercase tracking-widest text-white/30 hover:text-white transition-colors bg-black/50 backdrop-blur-sm px-3 py-1 border border-white/5"
                                >
                                    ADVERTISE
                                </Link>
                            </div>
                        </div>
                    </Link>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
