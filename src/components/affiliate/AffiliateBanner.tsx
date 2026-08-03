import { useNavigate } from 'react-router-dom';
import { ArrowRightIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import AffiliateProgramName from '../ui/AffiliateProgramName';

const PLAYBOOK_URL = 'https://drive.google.com/file/d/1lb2nIMcM9rOkE7FVirVVhUQKe62nkI7h/view?usp=drive_link';

interface AffiliateBannerProps {
    /** Suppress the bottom margin — use when rendering inside a fixed header */
    noMargin?: boolean;
}

export default function AffiliateBanner({ noMargin }: AffiliateBannerProps) {
    const navigate = useNavigate();

    // Not an <a>/<Link> — the Drive link below is a real nested anchor, and
    // an anchor can't contain another anchor without breaking the DOM.
    return (
        <div
            className={`w-full bg-white relative overflow-hidden group cursor-pointer${noMargin ? '' : ' mb-12'}`}
            role="link"
            tabIndex={0}
            onClick={() => navigate('/become-affiliate')}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate('/become-affiliate');
                }
            }}
        >
            <div className="relative block w-full py-4 px-4 md:px-8 transition-all hover:bg-black/[0.02]">
                <div className="max-w-7xl mx-auto flex items-center justify-between relative z-10">
                    <div className="text-left">
                        <AffiliateProgramName
                            as="p"
                            className="text-[10px] tracking-[0.4em] text-black/30 leading-none mb-2 text-left"
                        />
                        <h3 className="text-lg md:text-xl font-black text-black uppercase tracking-tighter leading-none group-hover:tracking-tight transition-all duration-500" style={{ textAlign: 'left' }}>
                            Earn 42% of Profits <span className="text-black/40 font-light">— Join</span>{' '}
                            <AffiliateProgramName as="span" className="text-black" />
                        </h3>
                        <a
                            href={PLAYBOOK_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="relative z-20 mt-2 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-black/50 underline underline-offset-4 hover:text-black transition-colors"
                        >
                            Quantum Jump
                            <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                        </a>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="hidden md:inline-flex items-center gap-3 px-6 py-3 bg-black text-white text-[10px] font-black uppercase tracking-[0.3em] group-hover:bg-zinc-800 transition-colors">
                            Become an Affiliate
                            <ArrowRightIcon className="w-4 h-4" />
                        </span>
                        <ArrowRightIcon className="md:hidden w-5 h-5 text-black/40 group-hover:text-black transition-all transform group-hover:translate-x-2" />
                    </div>
                </div>
            </div>
        </div>
    );
}
