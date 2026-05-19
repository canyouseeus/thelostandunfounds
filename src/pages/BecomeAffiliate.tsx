import { Link } from 'react-router-dom';
import {
    Expandable,
    ExpandableCard,
    ExpandableCardHeader,
    ExpandableCardContent,
    ExpandableCardFooter,
    ExpandableContent,
    ExpandableTrigger,
} from '../components/ui/expandable';
import KingMidasTicker from '../components/KingMidasTicker';
import SEOHead from '../components/SEOHead';
import BrandName from '../components/ui/BrandName';

interface ExpandableInfoCardProps {
    title: string;
    body: string;
}

function ExpandableInfoCard({ title, body }: ExpandableInfoCardProps) {
    return (
        <Expandable
            expandDirection="vertical"
            expandBehavior="replace"
            initialDelay={0}
            transition={{ duration: 0.2, ease: 'easeOut' }}
        >
            {({ isExpanded }) => (
                <ExpandableTrigger>
                    <div
                        className="rounded-none"
                        style={{
                            minHeight: isExpanded ? '260px' : '120px',
                            transition: 'min-height 0.2s ease-out',
                        }}
                    >
                        <ExpandableCard
                            className="bg-black rounded-none h-full flex flex-col relative overflow-hidden transition-transform duration-300 hover:-translate-y-1 cursor-pointer"
                            collapsedSize={{ height: 120 }}
                            expandedSize={{ height: 260 }}
                            hoverToExpand={false}
                        >
                            <ExpandableCardHeader className="p-0">
                                <h3 className="text-xl font-bold text-white uppercase tracking-widest text-left">
                                    {title}
                                </h3>
                            </ExpandableCardHeader>

                            <ExpandableCardContent className="flex-1 min-h-0 p-0 mt-3">
                                <ExpandableContent preset="fade" keepMounted={false}>
                                    <p className="text-white leading-relaxed text-left">{body}</p>
                                </ExpandableContent>
                            </ExpandableCardContent>

                            <ExpandableCardFooter className="mt-auto p-0 pt-3">
                                <span className="text-white text-xs font-bold uppercase tracking-widest whitespace-nowrap">
                                    {isExpanded ? 'Click to collapse' : 'Click to expand →'}
                                </span>
                            </ExpandableCardFooter>
                        </ExpandableCard>
                    </div>
                </ExpandableTrigger>
            )}
        </Expandable>
    );
}

interface ExpandableFeatureListProps {
    title: string;
    intro: string;
    features: string[];
}

function ExpandableFeatureList({ title, intro, features }: ExpandableFeatureListProps) {
    const featuresHeight = 90 + features.length * 36;
    return (
        <Expandable
            expandDirection="vertical"
            expandBehavior="replace"
            initialDelay={0}
            transition={{ duration: 0.2, ease: 'easeOut' }}
        >
            {({ isExpanded }) => (
                <ExpandableTrigger>
                    <div
                        className="rounded-none"
                        style={{
                            minHeight: isExpanded ? `${160 + featuresHeight}px` : '160px',
                            transition: 'min-height 0.2s ease-out',
                        }}
                    >
                        <ExpandableCard
                            className="bg-black rounded-none h-full flex flex-col relative overflow-hidden transition-transform duration-300 hover:-translate-y-1 cursor-pointer"
                            collapsedSize={{ height: 160 }}
                            expandedSize={{ height: 160 + featuresHeight }}
                            hoverToExpand={false}
                        >
                            <ExpandableCardHeader className="p-0">
                                <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter text-left mb-3">
                                    {title}
                                </h2>
                                <p className="text-white text-base md:text-lg text-left">{intro}</p>
                            </ExpandableCardHeader>

                            <ExpandableCardContent className="flex-1 min-h-0 p-0 mt-4">
                                <ExpandableContent preset="fade" stagger staggerChildren={0.05} keepMounted={false}>
                                    <ul className="space-y-3">
                                        {features.map((feature, i) => (
                                            <li key={i} className="text-white font-medium text-left">
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>
                                </ExpandableContent>
                            </ExpandableCardContent>

                            <ExpandableCardFooter className="mt-auto p-0 pt-4">
                                <span className="text-white text-xs font-bold uppercase tracking-widest whitespace-nowrap">
                                    {isExpanded ? 'Click to collapse' : 'Click to expand →'}
                                </span>
                            </ExpandableCardFooter>
                        </ExpandableCard>
                    </div>
                </ExpandableTrigger>
            )}
        </Expandable>
    );
}

export default function BecomeAffiliate() {
    return (
        <>
        <SEOHead
            title="Become an Affiliate - Earn 42% of Profits"
            description="Join THE LOST+UNFOUNDS affiliate network. Earn 42% of the profit on every sale, compete for the King Midas 8% profit pool, and build your earning network."
            canonicalPath="/become-affiliate"
        />
        <div className="min-h-screen bg-black text-white">
            <KingMidasTicker />

            {/* Hero Section */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('/affiliate/hero.jpg')] opacity-30 grayscale bg-cover bg-center" />
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />

                <div className="container mx-auto px-4 pt-12 pb-10 md:pt-20 md:pb-16 relative z-10">
                    <div className="max-w-4xl mx-auto text-left">
                        <div className="text-white text-[10px] font-black uppercase tracking-[0.4em] mb-6">
                            Join the #1 Creator Affiliate Program
                        </div>

                        <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tighter uppercase leading-none">
                            Earn 42% of Profits<br />
                            On Every Sale
                        </h1>

                        <p className="text-lg md:text-xl text-white mb-8 max-w-2xl leading-relaxed">
                            Join the <BrandName /> affiliate network. Get lifetime commissions on referred customers, compete for the King Midas 8% profit pool, and build your own earning network.
                        </p>

                        <div className="flex flex-row items-stretch gap-3 sm:gap-4">
                            <Link
                                to="/dashboard"
                                className="flex-1 sm:flex-none min-w-0 px-3 sm:px-8 py-4 bg-white text-black font-black text-xs sm:text-lg uppercase tracking-wider sm:tracking-widest hover:bg-white/90 transition-all flex items-center justify-center text-center whitespace-nowrap"
                            >
                                Join Program Now
                            </Link>
                            <Link
                                to="/king-midas-leaderboard"
                                className="flex-1 sm:flex-none min-w-0 px-3 sm:px-8 py-4 bg-black text-white font-bold text-xs sm:text-lg uppercase tracking-wider sm:tracking-widest outline outline-1 outline-white hover:bg-white hover:text-black transition-colors flex items-center justify-center text-center whitespace-nowrap"
                            >
                                View Prize Pool
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Benefits Grid (expandable cards) */}
            <div className="py-10 md:py-14">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
                        <ExpandableInfoCard
                            title="High Commissions"
                            body="Earn an industry-leading 42% of the profit on every sale you refer. Your referrals are locked to you for life."
                        />
                        <ExpandableInfoCard
                            title="King Midas Pool"
                            body="Top affiliates compete daily for a share of 8% of the entire site's daily profits. Rankings reset every 24 hours."
                        />
                        <ExpandableInfoCard
                            title="2-Tier MLM"
                            body="Recruit other affiliates and earn 2% of profits on their sales (Level 1) and 1% of profits on their recruits' sales (Level 2)."
                        />
                    </div>
                </div>
            </div>

            {/* Features (single expandable card) */}
            <div className="py-10 md:py-14">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto">
                        <ExpandableFeatureList
                            title="Everything You Need To Succeed"
                            intro="We provide all the tools, tracking, and assets you need to maximize your earnings from day one."
                            features={[
                                'Real-time link tracking & analytics',
                                'Instant payouts via Stripe Connect',
                                'Custom referral codes',
                                'Automated tax handling',
                                'Marketing assets & banners',
                                'Dedicated affiliate support',
                            ]}
                        />
                        <div className="mt-6">
                            <Link
                                to="/dashboard"
                                className="inline-block text-white font-bold uppercase tracking-widest underline underline-offset-4 hover:no-underline"
                            >
                                Start Earning Today
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* CTA */}
            <div className="py-10 md:py-14">
                <div className="container mx-auto px-4 text-left max-w-4xl">
                    <h2 className="text-4xl md:text-6xl font-black text-white mb-6 uppercase tracking-tighter">
                        Ready to Rule?
                    </h2>
                    <p className="text-xl text-white mb-8 max-w-2xl">
                        Join the ranks of top earners and start building your empire today.
                    </p>
                    <Link
                        to="/dashboard"
                        className="inline-block px-6 sm:px-12 py-4 sm:py-5 bg-white text-black font-black text-base sm:text-xl uppercase tracking-widest hover:bg-white/90 transition-colors whitespace-nowrap"
                    >
                        Become an Affiliate
                    </Link>
                </div>
            </div>
        </div>
        </>
    );
}
