import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import {
  MegaphoneIcon,
  ArrowRightIcon,
  ChatBubbleBottomCenterTextIcon
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

export default function Advertise() {
    const placements = [
        {
            title: "Above the Fold",
            description: "Your campaign runs at the very top of the page — above the navigation bar. The first thing every visitor sees, before anything else loads.",
        },
        {
            title: "Synchronized Slots",
            description: "Campaigns rotate on synchronized 8-second global intervals. Every visitor on the site sees the same slot at the same time — no impression is wasted.",
        },
        {
            title: "Homepage Priority",
            description: "The banner lives on the visitor homepage — the gallery and shop every visitor lands on. Prime real estate with maximum dwell time.",
        }
    ];

    return (
        <div className="min-h-screen bg-black text-white overflow-x-hidden">
            <Helmet>
                <title>ADVERTISE | THE LOST+UNFOUNDS</title>
                <meta name="description" content="Partner with THE LOST+UNFOUNDS. Your campaign sits above the navigation bar — the first impression for every visitor, every time." />
                <link rel="canonical" href="https://www.thelostandunfounds.com/advertise" />
            </Helmet>

            {/* Hero Section */}
            <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
                <div className="relative z-10 w-full max-w-5xl mx-auto px-6 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <h1 className="text-[clamp(2.5rem,9vw,8rem)] font-black tracking-tighter leading-[0.85] uppercase mb-6">
                            Advertise <br /> <span className="text-white/40">With Us</span>
                        </h1>
                        <p className="text-base md:text-2xl font-light text-white/50 max-w-2xl mx-auto mb-10">
                            Your brand. Above the navigation. First impression, every visit.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <a
                                href="mailto:media@thelostandunfounds.com"
                                className="w-full sm:w-auto px-8 py-4 bg-white text-black font-black uppercase tracking-widest text-xs hover:bg-zinc-200 transition-all flex items-center justify-center gap-3"
                            >
                                Contact Us
                                <ArrowRightIcon className="w-4 h-4" />
                            </a>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* How It Works */}
            <section className="py-16 md:py-24">
                <div className="max-w-7xl mx-auto px-6 md:px-8">
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20 mb-12 text-center">How It Works</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-12">
                        {placements.map((item, i) => (
                            <motion.div
                                key={item.title}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="p-6 md:p-8 border border-white/10 hover:border-white/30 transition-colors group"
                            >
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 mb-4">0{i + 1}</p>
                                <h3 className="text-lg md:text-xl font-black uppercase tracking-tight mb-3">{item.title}</h3>
                                <p className="text-white/40 text-sm leading-relaxed font-light">
                                    {item.description}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Placement Detail */}
            <section className="py-16 md:py-24 bg-white text-black">
                <div className="max-w-5xl mx-auto px-6 md:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-start md:items-center">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-black/30 mb-6">The Placement</p>
                            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none mb-6">
                                Above Everything
                            </h2>
                            <p className="text-black/60 leading-relaxed mb-4 font-light text-sm md:text-base">
                                Our banner sits at the very top of the page — pinned above the navigation bar in a fixed position. Visitors see your campaign the instant they arrive, before they interact with a single element.
                            </p>
                            <p className="text-black/60 leading-relaxed font-light text-sm md:text-base">
                                Campaigns are delivered on a synchronized 8-second rotation. Multiple brands can run concurrently, sharing slots across the global audience without cannibalizing each other's visibility.
                            </p>
                        </div>
                        <div className="space-y-0">
                            {[
                                { label: 'Position', value: 'Above the Navigation Bar' },
                                { label: 'Rotation', value: '8-Second Global Slots' },
                                { label: 'Surface', value: 'Visitor Homepage' },
                                { label: 'Audience', value: 'Photographers & Creatives' },
                            ].map(({ label, value }) => (
                                <div key={label} className="border-t border-black/10 py-4">
                                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-black/30 mb-1">{label}</p>
                                    <p className="font-black text-base md:text-xl uppercase tracking-tight">{value}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 md:py-32">
                <div className="max-w-3xl mx-auto px-6 text-center">
                    <MegaphoneIcon className="w-12 h-12 md:w-16 md:h-16 text-white/10 mx-auto mb-10" />
                    <h2 className="text-[clamp(2rem,8vw,4rem)] font-black uppercase tracking-tighter mb-6 leading-none">
                        Secure your <br /> placement
                    </h2>
                    <p className="text-white/40 mb-10 text-base font-light">
                        Reach out to discuss rates, availability, and campaign specs.
                    </p>
                    <a
                        href="mailto:media@thelostandunfounds.com"
                        className="inline-flex items-center justify-center gap-3 w-full sm:w-auto px-8 py-5 bg-white text-black font-black uppercase tracking-[0.15em] text-xs hover:bg-zinc-200 transition-colors break-all sm:break-normal"
                    >
                        media@thelostandunfounds.com
                        <ChatBubbleBottomCenterTextIcon className="w-5 h-5 shrink-0" />
                    </a>
                </div>
            </section>
        </div>
    );
}
