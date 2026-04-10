import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

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
    /** Suppress the bottom margin — use when rendering inside a fixed header */
    noMargin?: boolean;
}

/**
 * MarketplaceBanner - A surface-aware, dual-layer banner component.
 * Synchronized to 8-second global slots.
 */
export default function MarketplaceBanner({ surface, noMargin }: MarketplaceBannerProps) {
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
            <div className={`w-full bg-black border-y border-white/5 relative overflow-hidden group${noMargin ? '' : ' mb-12'}`}>
                <Link
                    to="/advertise"
                    className="relative block w-full py-8 px-4 md:px-8 transition-all hover:bg-white/[0.02]"
                >
                    <div className="max-w-7xl mx-auto flex items-center justify-between relative z-10">
                        <div className="text-left">
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 leading-none mb-2" style={{ textAlign: 'left' }}>Marketplace</p>
                            <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter leading-none group-hover:tracking-tight transition-all duration-500" style={{ textAlign: 'left' }}>
                                Advertise Your Content <span className="text-white/40 font-light">With Us</span>
                            </h3>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="hidden md:inline-block text-[10px] font-black uppercase tracking-widest text-white/20 group-hover:text-white/60 transition-colors">
                                Secure a Placement
                            </span>
                            <ArrowRightIcon className="w-5 h-5 text-white/20 group-hover:text-white transition-all transform group-hover:translate-x-2" />
                        </div>
                    </div>
                </Link>
            </div>
        );
    }

    const isIdle = banner.layer === 'public_idle';
    const isEnterprise = banner.layer === 'enterprise';

    return (
        <div className={`w-full border-b border-white/10 bg-black${noMargin ? '' : ' mb-12'}`}>
            <AnimatePresence mode="wait">
                <motion.div
                    key={banner.campaign_id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                >
                    <Link
                        to={banner.link_url}
                        className="group relative block w-full aspect-[21/9] md:aspect-[32/7] bg-black overflow-hidden"
                    >
                        {/* Background Image */}
                        <div className="absolute inset-0">
                            <img
                                src={banner.image_url}
                                alt={banner.title}
                                className="w-full h-full object-cover opacity-50 grayscale transition-all duration-1000 group-hover:scale-105 group-hover:grayscale-0 group-hover:opacity-70"
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                        </div>

                        {/* Content */}
                        <div className="absolute inset-0 flex flex-col justify-center px-4 md:px-12 lg:px-24">
                            <div className="max-w-4xl text-left" style={{ textAlign: 'left' }}>
                                <motion.div 
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="flex items-center gap-3 mb-4"
                                >
                                    <span className={`text-[10px] font-black uppercase tracking-[0.5em] ${isEnterprise ? 'text-amber-500' : 'text-white/40'}`}>
                                        {isEnterprise ? 'Premium Partner' : isIdle ? 'Idle Opportunity' : 'Featured Content'}
                                    </span>
                                    {isIdle && (
                                        <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] border border-white/10 px-3 py-1 bg-white/5">
                                            Available Now
                                        </span>
                                    )}
                                </motion.div>

                                <h2 className="text-4xl md:text-6xl lg:text-8xl font-black text-white uppercase tracking-tighter leading-[0.85] mb-8 group-hover:tracking-normal transition-all duration-1000" style={{ textAlign: 'left' }}>
                                    {banner.title}
                                </h2>

                                <div className="flex items-center gap-8">
                                    <span className="inline-flex items-center gap-3 px-8 py-4 bg-white text-black text-[10px] font-black uppercase tracking-[0.3em] group-hover:bg-zinc-200 transition-colors">
                                        Explore
                                        <ArrowRightIcon className="w-4 h-4" />
                                    </span>
                                    <div className="hidden md:block h-px w-24 bg-white/10 group-hover:w-32 transition-all duration-700" />
                                </div>
                            </div>
                        </div>

                        {/* Advertise Ribbon */}
                        <div className="absolute top-8 right-8 z-20">
                            <div className="flex gap-3">
                                {isEnterprise && (
                                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 bg-black/60 backdrop-blur-md px-4 py-2 border border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.1)]">
                                        ENTERPRISE
                                    </span>
                                )}
                                <Link
                                    to="/advertise"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white transition-all bg-black/60 backdrop-blur-md px-4 py-2 border border-white/10 hover:border-white/30"
                                >
                                    ADVERTISE
                                </Link>
                            </div>
                        </div>
                        
                        {/* Decorative scanlines */}
                        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_1px]" />
                    </Link>
                </motion.div>
            </AnimatePresence>
        </div>

    );
}
