import { useState, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import {
  MegaphoneIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';

export default function Advertise() {
    const formRef = useRef<HTMLDivElement>(null);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        brand: '',
        message: '',
    });
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const howItWorks = [
        {
            title: "Above the Fold",
            description: "Your campaign runs pinned above the navigation bar — the very first thing every visitor sees when they land on the site, before they scroll or click anything.",
        },
        {
            title: "One Slot = 8 Seconds",
            description: "The banner runs on a global 8-second clock. Each tick is a \"slot.\" Your campaign fills the banner for the full duration of every slot you own. The clock is shared — when your slot is live, every visitor on the site sees it at the same moment.",
        },
        {
            title: "Idle Bonus",
            description: "When your last slot ends and no new campaign has started, your banner keeps running in idle until another brand takes over. You're never cut off cold — and you get a renewal offer before that window closes.",
        },
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // TODO: wire up to backend / email endpoint
            await new Promise((resolve) => setTimeout(resolve, 1000));
            setSubmitted(true);
            setFormData({ name: '', email: '', brand: '', message: '' });
        } catch {
            // handle error
        } finally {
            setLoading(false);
        }
    };

    const scrollToForm = () => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const inputClass =
        "w-full px-4 py-3 bg-black border border-white/20 text-white placeholder-white/25 focus:outline-none focus:border-white transition-colors text-sm font-mono uppercase tracking-wider";
    const labelClass =
        "block text-[10px] font-black uppercase tracking-[0.4em] text-white/40 mb-2";

    return (
        <div className="min-h-screen bg-black text-white overflow-x-hidden">
            <Helmet>
                <title>ADVERTISE | THE LOST+UNFOUNDS</title>
                <meta name="description" content="Partner with THE LOST+UNFOUNDS. Your campaign sits above the navigation bar — the first impression for every visitor, every time." />
                <link rel="canonical" href="https://www.thelostandunfounds.com/advertise" />
            </Helmet>

            {/* Hero */}
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
                        <button
                            onClick={scrollToForm}
                            className="w-full sm:w-auto px-8 py-4 bg-white text-black font-black uppercase tracking-widest text-xs hover:bg-zinc-200 transition-all inline-flex items-center justify-center gap-3 whitespace-nowrap"
                        >
                            Get In Touch
                            <ArrowRightIcon className="w-4 h-4 shrink-0" />
                        </button>
                    </motion.div>
                </div>
            </section>

            {/* How It Works */}
            <section className="py-16 md:py-24">
                <div className="max-w-7xl mx-auto px-6 md:px-8">
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20 mb-12 text-center">How It Works</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-12">
                        {howItWorks.map((item, i) => (
                            <motion.div
                                key={item.title}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="p-6 md:p-8 border border-white/10 hover:border-white/30 transition-colors"
                            >
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 mb-4">0{i + 1}</p>
                                <h3 className="text-lg md:text-xl font-black uppercase tracking-tight mb-3">{item.title}</h3>
                                <p className="text-white/40 text-sm leading-relaxed font-light">
                                    {item.description}
                                </p>
                            </motion.div>
                        ))}
                    </div>

                    {/* Slots math callout */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        className="mt-10 border border-white/10 px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                    >
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 shrink-0">Slots at a Glance</p>
                        <div className="flex flex-wrap gap-x-8 gap-y-2">
                            {[
                                { slots: '1 slot', time: '8 seconds' },
                                { slots: '100 slots', time: '~13 minutes' },
                                { slots: '450 slots', time: '~1 hour' },
                                { slots: '10,800 slots', time: '~1 day' },
                            ].map(({ slots, time }) => (
                                <div key={slots} className="flex items-baseline gap-2">
                                    <span className="text-sm font-black text-white uppercase tracking-tight">{slots}</span>
                                    <span className="text-[10px] text-white/30 font-mono">=</span>
                                    <span className="text-sm text-white/50 font-light">{time}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Two Tiers */}
            <section className="py-16 md:py-24 border-t border-white/10">
                <div className="max-w-5xl mx-auto px-6 md:px-8">
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20 mb-12 text-center">Two Ways to Run</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-white/10">

                        {/* Public Slots */}
                        <div className="p-8 md:p-10 border-b md:border-b-0 md:border-r border-white/10">
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 mb-6">Public Queue</p>
                            <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tighter leading-none mb-6">
                                Buy Slots,<br />Own the Clock
                            </h3>
                            <ul className="space-y-4 text-sm text-white/50 font-light leading-relaxed">
                                <li className="flex gap-3">
                                    <span className="text-white/20 shrink-0 mt-0.5">—</span>
                                    Purchase individual 8-second slots. Each slot you own is a guaranteed moment of exclusive airtime.
                                </li>
                                <li className="flex gap-3">
                                    <span className="text-white/20 shrink-0 mt-0.5">—</span>
                                    Multiple brands can each hold different slots and cycle in sequence — no one shares a slot, no impressions are split.
                                </li>
                                <li className="flex gap-3">
                                    <span className="text-white/20 shrink-0 mt-0.5">—</span>
                                    When your last slot passes and no new campaign takes over, your banner continues in <span className="text-white/70">idle mode</span> — still live, still visible — until another brand purchases the next slot.
                                </li>
                                <li className="flex gap-3">
                                    <span className="text-white/20 shrink-0 mt-0.5">—</span>
                                    Runs on the gallery, shop, and blog surfaces.
                                </li>
                            </ul>
                        </div>

                        {/* Enterprise */}
                        <div className="p-8 md:p-10">
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 mb-6">Enterprise</p>
                            <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tighter leading-none mb-6">
                                Reserve a<br />Time Block
                            </h3>
                            <ul className="space-y-4 text-sm text-white/50 font-light leading-relaxed">
                                <li className="flex gap-3">
                                    <span className="text-white/20 shrink-0 mt-0.5">—</span>
                                    Reserve a continuous window — hours, days, or longer. Your campaign holds the banner for the entire duration without rotation.
                                </li>
                                <li className="flex gap-3">
                                    <span className="text-white/20 shrink-0 mt-0.5">—</span>
                                    Enterprise reservations override all public slots. While your block is active, no other campaign appears — on any surface you've reserved.
                                </li>
                                <li className="flex gap-3">
                                    <span className="text-white/20 shrink-0 mt-0.5">—</span>
                                    Target one surface (gallery, shop, or blog) or all three simultaneously.
                                </li>
                                <li className="flex gap-3">
                                    <span className="text-white/20 shrink-0 mt-0.5">—</span>
                                    Rates and availability discussed directly. Contact us to reserve.
                                </li>
                            </ul>
                        </div>
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
                                The banner is pinned above the navigation bar in a fixed position. Visitors see your campaign the instant they arrive — before they scroll, before they search, before they interact with anything.
                            </p>
                            <p className="text-black/60 leading-relaxed font-light text-sm md:text-base">
                                The 8-second clock is synchronized globally, not per-user. There is no randomization — when the slot ticks over, every person on the site sees the transition at the same moment. If you own the next slot, you own the next moment for every visitor simultaneously.
                            </p>
                        </div>
                        <div className="space-y-0">
                            {[
                                { label: 'Position', value: 'Above the Navigation Bar' },
                                { label: 'Slot Duration', value: '8 Seconds Per Slot' },
                                { label: 'Surfaces', value: 'Gallery, Shop & Blog' },
                                { label: 'Audience', value: 'Photographers & Creatives' },
                                { label: 'Minimum', value: 'Discussed on Inquiry' },
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

            {/* Contact Form */}
            <section ref={formRef} className="py-20 md:py-32">
                <div className="max-w-xl mx-auto px-6">
                    <div className="text-center mb-12">
                        <MegaphoneIcon className="w-12 h-12 md:w-16 md:h-16 text-white/10 mx-auto mb-10" />
                        <h2 className="text-[clamp(2rem,8vw,4rem)] font-black uppercase tracking-tighter mb-4 leading-none">
                            Secure your <br /> placement
                        </h2>
                        <p className="text-white/40 text-base font-light">
                            Reach out to discuss rates, slot counts, and availability.
                        </p>
                    </div>

                    {submitted ? (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center py-12 border border-white/10 px-8"
                        >
                            <CheckCircleIcon className="w-12 h-12 text-white/60 mx-auto mb-6" />
                            <h3 className="text-xl font-black uppercase tracking-tight mb-3">Inquiry Received</h3>
                            <p className="text-white/40 text-sm font-light mb-8">
                                We'll be in touch shortly to discuss your campaign.
                            </p>
                            <button
                                onClick={() => setSubmitted(false)}
                                className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50 hover:text-white transition-colors"
                            >
                                Submit Another
                            </button>
                        </motion.div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label htmlFor="adv-name" className={labelClass}>Name</label>
                                <input
                                    id="adv-name"
                                    type="text"
                                    required
                                    placeholder="Your name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <label htmlFor="adv-email" className={labelClass}>Email</label>
                                <input
                                    id="adv-email"
                                    type="email"
                                    required
                                    placeholder="your@email.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <label htmlFor="adv-brand" className={labelClass}>Brand / Company</label>
                                <input
                                    id="adv-brand"
                                    type="text"
                                    required
                                    placeholder="Your brand or company"
                                    value={formData.brand}
                                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <label htmlFor="adv-message" className={labelClass}>Campaign Brief</label>
                                <textarea
                                    id="adv-message"
                                    required
                                    rows={5}
                                    placeholder="Tell us about your campaign, goals, and timeline..."
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    className={`${inputClass} resize-none`}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full px-8 py-4 bg-white text-black font-black uppercase tracking-[0.2em] text-xs hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 whitespace-nowrap"
                            >
                                {loading ? 'Sending...' : (
                                    <>
                                        Send Inquiry
                                        <PaperAirplaneIcon className="w-4 h-4 shrink-0" />
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </section>
        </div>
    );
}
