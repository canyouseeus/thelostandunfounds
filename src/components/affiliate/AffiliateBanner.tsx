import { Link } from 'react-router-dom';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

interface AffiliateBannerProps {
    /** Suppress the bottom margin — use when rendering inside a fixed header */
    noMargin?: boolean;
}

export default function AffiliateBanner({ noMargin }: AffiliateBannerProps) {
    return (
        <div className={`w-full bg-black relative overflow-hidden group${noMargin ? '' : ' mb-12'}`}>
            <Link
                to="/become-affiliate"
                className="relative block w-full py-4 px-4 md:px-8 transition-all hover:bg-white/[0.02]"
            >
                <div className="max-w-7xl mx-auto flex items-center justify-between relative z-10">
                    <div className="text-left">
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 leading-none mb-2" style={{ textAlign: 'left' }}>Affiliate Program</p>
                        <h3 className="text-lg md:text-xl font-black text-white uppercase tracking-tighter leading-none group-hover:tracking-tight transition-all duration-500" style={{ textAlign: 'left' }}>
                            Earn 42% of Profits <span className="text-white/40 font-light">— Join Our Affiliate Program</span>
                        </h3>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="hidden md:inline-flex items-center gap-3 px-6 py-3 bg-white text-black text-[10px] font-black uppercase tracking-[0.3em] group-hover:bg-zinc-200 transition-colors">
                            Become an Affiliate
                            <ArrowRightIcon className="w-4 h-4" />
                        </span>
                        <ArrowRightIcon className="md:hidden w-5 h-5 text-white/40 group-hover:text-white transition-all transform group-hover:translate-x-2" />
                    </div>
                </div>
            </Link>
        </div>
    );
}
