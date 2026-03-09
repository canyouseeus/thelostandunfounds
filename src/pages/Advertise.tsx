import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { 
  MegaphoneIcon, 
  SparklesIcon, 
  UserGroupIcon, 
  PresentationChartBarIcon,
  ArrowRightIcon,
  ChatBubbleBottomCenterTextIcon
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

export default function Advertise() {
    const opportunities = [
        {
            title: "Premium Placements",
            description: "Secure high-visibility slots across THE GALLERY, Shop, and all editorial columns.",
            icon: SparklesIcon,
            color: "text-amber-500",
            bg: "bg-amber-500/10"
        },
        {
            title: "Audience Targeting",
            description: "Reach our dedicated community of photographers, tech enthusiasts, and creative professionals.",
            icon: UserGroupIcon,
            color: "text-blue-500",
            bg: "bg-blue-500/10"
        },
        {
            title: "Live Performance",
            description: "Real-time analytics and campaign performance tracking for every impression counts.",
            icon: PresentationChartBarIcon,
            color: "text-green-500",
            bg: "bg-green-500/10"
        }
    ];

    return (
        <div className="min-h-screen bg-black text-white pt-20">
            <Helmet>
                <title>ADVERTISE | THE LOST+UNFOUNDS</title>
                <meta name="description" content="Partner with THE LOST+UNFOUNDS. Discover premium advertising opportunities across our ecosystem of tools, galleries, and editorial content." />
                <link rel="canonical" href="https://www.thelostandunfounds.com/advertise" />
            </Helmet>

            {/* Hero Section */}
            <section className="relative h-[70vh] flex items-center justify-center overflow-hidden border-b border-white/5">
                <div className="absolute inset-0 opacity-20">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent " />
                </div>
                
                <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <span className="inline-block px-4 py-1 bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.4em] mb-8">
                            Marketplace
                        </span>
                        <h1 className="text-[clamp(3.5rem,10vw,8rem)] font-black tracking-tighter leading-[0.85] uppercase mb-8">
                            Advertise <br /> <span className="text-white/40">With Us</span>
                        </h1>
                        <p className="text-lg md:text-2xl font-light text-white/50 max-w-2xl mx-auto mb-12">
                            Connect your brand with the most influential photographers and creators in the field.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                            <a 
                                href="mailto:media@thelostandunfounds.com" 
                                className="px-10 py-5 bg-white text-black font-black uppercase tracking-widest text-xs hover:bg-zinc-200 transition-all flex items-center gap-3"
                            >
                                Contact Sales
                                <ArrowRightIcon className="w-4 h-4" />
                            </a>
                            <Link 
                                to="/docs/photographer-guide" 
                                className="text-white/40 hover:text-white text-xs font-black uppercase tracking-widest transition-colors flex items-center gap-2"
                            >
                                Read Guidelines
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Features */}
            <section className="py-24 border-b border-white/5">
                <div className="max-w-7xl mx-auto px-4 md:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        {opportunities.map((item, i) => (
                            <motion.div
                                key={item.title}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="p-8 bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors group"
                            >
                                <item.icon className={`w-12 h-12 ${item.color} mb-6 transition-transform group-hover:scale-110`} />
                                <h3 className="text-xl font-bold uppercase tracking-tight mb-4">{item.title}</h3>
                                <p className="text-white/40 text-sm leading-relaxed font-light">
                                    {item.description}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Reach Section */}
            <section className="py-24 bg-white/[0.01]">
                <div className="max-w-5xl mx-auto px-4 text-center">
                    <h2 className="text-xs font-black uppercase tracking-[0.5em] text-white/20 mb-8">Ecosystem Reach</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        <div>
                            <p className="text-4xl font-black mb-1 tracking-tighter">THE BLOG</p>
                            <p className="text-[10px] text-white/30 uppercase tracking-widest">Thought Leadership</p>
                        </div>
                        <div>
                            <p className="text-4xl font-black mb-1 tracking-tighter">GALLERY</p>
                            <p className="text-[10px] text-white/30 uppercase tracking-widest">Premium Visuals</p>
                        </div>
                        <div>
                            <p className="text-4xl font-black mb-1 tracking-tighter">TOOLS</p>
                            <p className="text-[10px] text-white/30 uppercase tracking-widest">Utility First</p>
                        </div>
                        <div>
                            <p className="text-4xl font-black mb-1 tracking-tighter">SHOP</p>
                            <p className="text-[10px] text-white/30 uppercase tracking-widest">Commerce Driven</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-32 border-t border-white/5">
                <div className="max-w-3xl mx-auto px-4 text-center">
                    <MegaphoneIcon className="w-20 h-20 text-white/10 mx-auto mb-12" />
                    <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-8 leading-none">
                        Ready to make <br /> an impression?
                    </h2>
                    <p className="text-white/40 mb-12 text-lg font-light">
                        Our team will work with you to design a campaign that aligns with our aesthetic and resonates with our audience.
                    </p>
                    <a 
                        href="mailto:media@thelostandunfounds.com" 
                        className="inline-flex items-center gap-3 px-12 py-6 bg-white text-black font-black uppercase tracking-[0.2em] text-sm hover:scale-105 transition-transform"
                    >
                        Get in Touch
                        <ChatBubbleBottomCenterTextIcon className="w-5 h-5" />
                    </a>
                </div>
            </section>
        </div>
    );
}
