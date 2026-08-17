import { Link } from 'react-router-dom';
import AffiliateProgramName from '../ui/AffiliateProgramName';

interface AffiliateBannerProps {
    /** Suppress the bottom margin: use when rendering inside a fixed header */
    noMargin?: boolean;
}

export default function AffiliateBanner({ noMargin }: AffiliateBannerProps) {
    return (
        <div className={`w-full bg-white relative overflow-hidden group${noMargin ? '' : ' mb-12'}`}>
            <Link
                to="/become-affiliate"
                className="relative block w-full py-4 px-4 md:px-8 transition-all hover:bg-black/[0.02]"
            >
                <div className="max-w-7xl mx-auto flex items-center gap-4 md:gap-6 relative z-10">
                    {/* Left column: flex-1 so the artwork below lands dead centre */}
                    <div className="flex-1 min-w-0 text-left">
                        <AffiliateProgramName
                            as="p"
                            className="text-[10px] tracking-[0.4em] text-black/30 leading-none mb-2 text-left"
                        />
                        <h3 className="text-lg md:text-xl font-black text-black uppercase tracking-tighter leading-none group-hover:tracking-tight transition-all duration-500" style={{ textAlign: 'left' }}>
                            Earn 42% of Profits
                        </h3>
                    </div>

                    {/* Reserves the centre column's width so neither the copy nor the
                        CTA can ever run under the artwork. Width only: the artwork
                        itself is absolutely positioned below and adds no height. */}
                    <div className="shrink-0 w-[100px] md:w-[240px]" aria-hidden="true" />

                    {/* Right column: flex-1 mirrors the left so the artwork stays centred */}
                    <div className="flex-1 flex items-center justify-end">
                        <span className="inline-flex items-center px-4 md:px-6 py-3 bg-black text-white text-[10px] font-black uppercase tracking-[0.3em] group-hover:bg-zinc-800 transition-colors whitespace-nowrap">
                            Join Now
                        </span>
                    </div>
                </div>

                {/* QUANTUM JUMP: absolutely positioned, so it contributes zero height:
                    the banner stays a fixed strip and the artwork simply crops top and
                    bottom against the wrapper's overflow-hidden. */}
                <img
                    src="/quantum-jump.png"
                    alt="QUANTUM JUMPING TO A CITY NEAR YOU"
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 h-[100px] md:h-[240px] w-auto max-w-none block pointer-events-none group-hover:opacity-70 transition-opacity"
                />
            </Link>
        </div>
    );
}
