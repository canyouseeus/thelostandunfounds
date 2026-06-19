import { useState } from 'react';
import {
  TruckIcon,
  MapPinIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  StarIcon,
  PhoneIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ArrowRightIcon,
  Bars3Icon,
  XMarkIcon,
  BeakerIcon,
  ClockIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

const ICY = '#4fc3f7';

function Navbar() {
  const [open, setOpen] = useState(false);
  const links = ['Services', 'Service Area', 'How It Works', 'Testimonials', 'Affiliates'];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0d1117]/95 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: ICY }}>
            <BeakerIcon className="w-4 h-4 text-[#0d1117]" />
          </div>
          <div>
            <div className="text-white font-bold text-sm tracking-wider uppercase leading-none">Silva Star</div>
            <div className="text-[10px] tracking-[0.2em] uppercase leading-none mt-0.5 text-[#4fc3f7]">Water Solutions</div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-6">
          {links.map(link => (
            <a key={link} href={`#${link.toLowerCase().replace(/\s+/g, '-')}`}
              className="text-white/50 hover:text-white text-xs tracking-widest uppercase transition-colors">
              {link}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-4">
          <a href="tel:+15124081234" className="flex items-center gap-1.5 text-white/50 hover:text-white text-xs transition-colors">
            <PhoneIcon className="w-3.5 h-3.5" />
            (512) 408-1234
          </a>
          <button className="px-4 py-2 text-xs font-bold tracking-widest uppercase text-[#0d1117] hover:opacity-90 transition-opacity" style={{ background: ICY }}>
            Book Now
          </button>
        </div>

        <button onClick={() => setOpen(!open)} className="md:hidden text-white/60 hover:text-white">
          {open ? <XMarkIcon className="w-5 h-5" /> : <Bars3Icon className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-[#0d1117] px-4 py-4 space-y-1">
          {links.map(link => (
            <a key={link} href={`#${link.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => setOpen(false)}
              className="block text-white/60 hover:text-white text-sm py-2.5 transition-colors">
              {link}
            </a>
          ))}
          <button className="w-full mt-3 py-3 text-sm font-bold tracking-widest uppercase text-[#0d1117]" style={{ background: ICY }}>
            Book a Service
          </button>
        </div>
      )}
    </nav>
  );
}

function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-[#0d1117] overflow-hidden">
      {/* Subtle radial glow only — no grid */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 20%, rgba(79,195,247,0.06) 0%, transparent 70%)' }} />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center pt-24 pb-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 text-[10px] tracking-[0.3em] uppercase font-medium text-white/40">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4fc3f7] animate-pulse" />
          Serving Austin, TX &amp; Surrounding Areas
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-white tracking-tight uppercase leading-none mb-6">
          Grey Water<br />
          <span style={{ color: ICY }}>Disposal</span><br />
          Done Right
        </h1>

        <p className="max-w-xl mx-auto text-white/50 text-base sm:text-lg leading-relaxed mb-10">
          Professional grey water and grease removal for food trucks, festivals, and events across Austin. Fast, reliable, licensed — so you can focus on what matters.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
          <button className="flex items-center gap-2 px-8 py-4 text-sm font-bold tracking-widest uppercase text-[#0d1117] hover:opacity-90 transition-opacity w-full sm:w-auto justify-center"
            style={{ background: ICY }}>
            Book a Service <ArrowRightIcon className="w-4 h-4" />
          </button>
          <button className="flex items-center gap-2 px-8 py-4 text-sm font-bold tracking-widest uppercase text-white/70 hover:text-white bg-white/5 hover:bg-white/10 transition-colors w-full sm:w-auto justify-center">
            Get a Quote
          </button>
        </div>

        <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto">
          {[
            { value: '500+', label: 'Jobs Completed' },
            { value: '4.9★', label: 'Average Rating' },
            { value: '48hr', label: 'Max Turnaround' },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-black text-white">{stat.value}</div>
              <div className="text-[10px] text-white/35 tracking-widest uppercase mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/20">
        <span className="text-[9px] tracking-[0.3em] uppercase">Scroll</span>
        <div className="w-px h-8 bg-gradient-to-b from-white/20 to-transparent" />
      </div>
    </section>
  );
}

function Services() {
  const services = [
    {
      icon: <TruckIcon className="w-7 h-7" />,
      title: 'Grey Water Disposal',
      tag: 'Core Service',
      description: 'We pump, haul, and legally dispose of grey water from sinks, steamers, and floor drains. EPA-compliant. No mess, no stress.',
      features: ['Food trucks & trailers', 'Festival booths', 'Catering events', 'Same-day dispatch available'],
    },
    {
      icon: <BeakerIcon className="w-7 h-7" />,
      title: 'Grease Removal',
      tag: 'Via Subcontractor',
      description: 'Full grease trap and interceptor service coordinated through our licensed subcontractor network. One call handles it all.',
      features: ['Grease trap pump-out', 'Interceptor cleaning', 'Compliance documentation', 'Scheduled maintenance plans'],
    },
    {
      icon: <CalendarDaysIcon className="w-7 h-7" />,
      title: 'Event Services',
      tag: 'Multi-Vendor',
      description: 'Managing a festival or farmers market? We work directly with event organizers to service multiple vendors in a single visit.',
      features: ['Multi-vendor coordination', 'Pre/post event service', 'Emergency on-site support', 'Volume pricing available'],
    },
  ];

  return (
    <section id="services" className="bg-[#0d1117] py-24 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-14">
          <div className="text-[10px] tracking-[0.35em] uppercase text-white/30 mb-3">What We Do</div>
          <h2 className="text-4xl font-black text-white uppercase tracking-tight">Services</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {services.map(s => (
            <div key={s.title} className="bg-[#161b22] p-6 flex flex-col hover:bg-[#1c2233] transition-colors duration-300">
              <div className="flex items-start justify-between mb-5">
                <div className="text-white/40">{s.icon}</div>
                <span className="text-[9px] tracking-[0.2em] uppercase text-white/30 bg-white/5 px-2 py-1">
                  {s.tag}
                </span>
              </div>
              <h3 className="text-white font-bold text-xl uppercase tracking-tight mb-3">{s.title}</h3>
              <p className="text-white/45 text-sm leading-relaxed mb-6 flex-1">{s.description}</p>
              <ul className="space-y-2">
                {s.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-white/50">
                    <CheckCircleIcon className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ServiceArea() {
  const areas = [
    'Austin (All Zones)', 'Round Rock', 'Cedar Park', 'Georgetown',
    'Pflugerville', 'Kyle / Buda', 'Bastrop', 'San Marcos', 'Lockhart', 'Elgin',
  ];

  return (
    <section id="service-area" className="bg-[#111827] py-24 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="text-[10px] tracking-[0.35em] uppercase text-white/30 mb-3">Where We Operate</div>
            <h2 className="text-4xl font-black text-white uppercase tracking-tight mb-6">Serving Greater Austin</h2>
            <p className="text-white/45 leading-relaxed mb-8">
              Based in Austin, TX — we cover a 60-mile radius including all major food truck parks, festival venues, and event grounds. Not on the list? Call us anyway.
            </p>
            <div className="flex items-center gap-3 mb-8">
              <MapPinIcon className="w-4 h-4 text-white/40 flex-shrink-0" />
              <span className="text-white/50 text-sm">Austin, TX — 60-mile service radius</span>
            </div>
            <button className="flex items-center gap-2 px-6 py-3 text-xs font-bold tracking-widest uppercase text-[#0d1117] hover:opacity-90 transition-opacity"
              style={{ background: ICY }}>
              Check My Area <ArrowRightIcon className="w-4 h-4" />
            </button>
          </div>

          <div>
            <div className="text-[10px] tracking-[0.25em] uppercase text-white/25 mb-4">Covered Areas</div>
            <div className="grid grid-cols-2 gap-2">
              {areas.map(area => (
                <div key={area} className="flex items-center gap-2 bg-[#161b22] px-4 py-3 text-sm text-white/55">
                  <span className="w-1 h-1 rounded-full bg-white/25 flex-shrink-0" />
                  {area}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      step: '01', icon: <CalendarDaysIcon className="w-6 h-6" />,
      title: 'Book Online or Call',
      body: 'Use our booking form or call us directly. Tell us your location, vehicle type, and preferred time window.',
    },
    {
      step: '02', icon: <TruckIcon className="w-6 h-6" />,
      title: 'We Come to You',
      body: 'Our licensed technician arrives at your food truck, event site, or kitchen with all necessary equipment.',
    },
    {
      step: '03', icon: <ShieldCheckIcon className="w-6 h-6" />,
      title: 'Fast & Compliant Removal',
      body: 'Grey water is pumped, transported, and disposed of at a licensed facility. You get a service receipt.',
    },
    {
      step: '04', icon: <CurrencyDollarIcon className="w-6 h-6" />,
      title: 'Simple Invoicing',
      body: 'Pay on-site or via invoice. Volume discounts available for regular customers and event organizers.',
    },
  ];

  return (
    <section id="how-it-works" className="bg-[#0d1117] py-24 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-14">
          <div className="text-[10px] tracking-[0.35em] uppercase text-white/30 mb-3">The Process</div>
          <h2 className="text-4xl font-black text-white uppercase tracking-tight">How It Works</h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map(s => (
            <div key={s.step} className="bg-[#161b22] p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="text-white/35">{s.icon}</div>
                <span className="text-4xl font-black text-white/5 select-none leading-none">{s.step}</span>
              </div>
              <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-3">{s.title}</h3>
              <p className="text-white/45 text-xs leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const testimonials = [
    {
      name: 'Maria R.', biz: 'La Paloma Tacos — East Austin', rating: 5,
      text: "Daniel and his crew are the most reliable service I've used. They showed up on time, got it done fast, and left zero mess. I've recommended them to every food truck operator I know.",
    },
    {
      name: 'Tyler M.', biz: 'ATX Burger Co. — Food Truck', rating: 5,
      text: 'Used them at the Barton Springs Festival last summer. They handled 12 vendors without a single hitch. The event coordinator was blown away. Will use every season.',
    },
    {
      name: 'Jess L.', biz: 'Green Sprout Kitchen — SoCo', rating: 5,
      text: "Finally a service that doesn't ghost you. I get a confirmation, a reminder, and an invoice. That's all I want. Simple, professional, done.",
    },
  ];

  return (
    <section id="testimonials" className="bg-[#111827] py-24 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-14">
          <div className="text-[10px] tracking-[0.35em] uppercase text-white/30 mb-3">What Customers Say</div>
          <h2 className="text-4xl font-black text-white uppercase tracking-tight">Testimonials</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {testimonials.map(t => (
            <div key={t.name} className="bg-[#161b22] p-6 flex flex-col">
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <StarIcon key={i} className="w-3.5 h-3.5 text-white/40 fill-current" />
                ))}
              </div>
              <p className="text-white/60 text-sm leading-relaxed italic flex-1 mb-6">"{t.text}"</p>
              <div>
                <div className="text-white font-bold text-sm">{t.name}</div>
                <div className="text-white/35 text-xs mt-0.5">{t.biz}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AffiliateSection() {
  return (
    <section id="affiliates" className="bg-[#0d1117] py-24 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="text-[10px] tracking-[0.35em] uppercase text-white/30 mb-3">Referral Program</div>
            <h2 className="text-4xl font-black text-white uppercase tracking-tight mb-6">
              Refer a Customer,<br />
              <span style={{ color: ICY }}>Earn Commission</span>
            </h2>
            <p className="text-white/45 leading-relaxed mb-6">
              Know another food truck operator or event organizer who needs grey water service? Send them our way and earn a commission on their first booking.
            </p>
            <ul className="space-y-4 mb-8">
              {[
                'Earn up to 10% on referred jobs',
                'No cap on referral earnings',
                'Track your referrals in real-time',
                'Get paid monthly via direct deposit',
              ].map(item => (
                <li key={item} className="flex items-start gap-3 text-sm text-white/55">
                  <CheckCircleIcon className="w-4 h-4 text-white/30 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
            <button className="flex items-center gap-2 px-6 py-3 text-xs font-bold tracking-widest uppercase text-[#0d1117] hover:opacity-90 transition-opacity"
              style={{ background: ICY }}>
              Join the Referral Program <UserGroupIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-[#161b22] p-6">
            <div className="text-[10px] tracking-[0.25em] uppercase text-white/30 mb-6">Your Referral Dashboard (Preview)</div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { label: 'Active Referrals', val: '—' },
                { label: 'This Month Earned', val: '$—' },
                { label: 'Total Conversions', val: '—' },
                { label: 'Pending Payout', val: '$—' },
              ].map(card => (
                <div key={card.label} className="bg-[#0d1117] p-4">
                  <div className="text-2xl font-black text-white mb-1">{card.val}</div>
                  <div className="text-[9px] text-white/30 tracking-[0.2em] uppercase">{card.label}</div>
                </div>
              ))}
            </div>

            <div className="bg-[#0d1117] p-4 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-white/30 tracking-[0.2em] uppercase mb-1">Your Referral Link</div>
                <div className="text-sm font-mono text-white/70">silvastar.com/ref/YOURCODE</div>
              </div>
              <button className="text-[10px] tracking-[0.2em] uppercase text-white/40 hover:text-white transition-colors px-3 py-2 bg-white/5 hover:bg-white/10">
                Copy
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BookingCTA() {
  return (
    <section className="bg-[#111827] py-24 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto text-center">
        <SparklesIcon className="w-7 h-7 text-white/30 mx-auto mb-6" />
        <h2 className="text-4xl sm:text-5xl font-black text-white uppercase tracking-tight mb-6">Ready to Book?</h2>
        <p className="text-white/45 text-lg mb-10">
          Serving food truck operators across Austin. No contracts, no hassle — just clean, compliant service when you need it.
        </p>

        <div className="bg-[#161b22] p-8 mb-8 text-left">
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[10px] tracking-[0.2em] uppercase text-white/35 mb-2">Your Name</label>
              <input type="text" placeholder="Daniel Silva"
                className="w-full bg-[#0d1117] text-white placeholder-white/20 px-4 py-3 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.2em] uppercase text-white/35 mb-2">Phone / Email</label>
              <input type="text" placeholder="(512) 000-0000"
                className="w-full bg-[#0d1117] text-white placeholder-white/20 px-4 py-3 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.2em] uppercase text-white/35 mb-2">Service Type</label>
              <select className="w-full bg-[#0d1117] text-white/60 px-4 py-3 text-sm focus:outline-none appearance-none">
                <option>Grey Water Disposal</option>
                <option>Grease Removal</option>
                <option>Event Service</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.2em] uppercase text-white/35 mb-2">Preferred Date</label>
              <input type="date"
                className="w-full bg-[#0d1117] text-white/60 px-4 py-3 text-sm focus:outline-none" />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-[10px] tracking-[0.2em] uppercase text-white/35 mb-2">Location / Notes</label>
            <textarea placeholder="Food truck location, event name, or notes..." rows={3}
              className="w-full bg-[#0d1117] text-white placeholder-white/20 px-4 py-3 text-sm focus:outline-none resize-none" />
          </div>
          <button className="w-full py-4 text-sm font-bold tracking-widest uppercase text-[#0d1117] flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            style={{ background: ICY }}>
            Submit Booking Request <ArrowRightIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-center gap-6 text-xs text-white/25">
          <div className="flex items-center gap-1.5"><PhoneIcon className="w-3.5 h-3.5" />(512) 408-1234</div>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-1.5"><ClockIcon className="w-3.5 h-3.5" />Mon–Sat, 7am–7pm</div>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-1.5"><MapPinIcon className="w-3.5 h-3.5" />Austin, TX</div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-[#0d1117] py-12 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid sm:grid-cols-3 gap-8 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: ICY }}>
                <BeakerIcon className="w-3.5 h-3.5 text-[#0d1117]" />
              </div>
              <div>
                <div className="text-white font-bold text-sm tracking-wider uppercase leading-none">Silva Star</div>
                <div className="text-[8px] tracking-[0.25em] uppercase leading-none mt-0.5 text-white/40">Water Solutions</div>
              </div>
            </div>
            <p className="text-white/35 text-xs leading-relaxed">
              Licensed grey water disposal for Austin food trucks, festivals, and events. Owned and operated by Daniel Silva.
            </p>
          </div>

          <div>
            <div className="text-[10px] tracking-[0.25em] uppercase text-white/25 mb-4">Quick Links</div>
            <div className="space-y-2">
              {['Services', 'Service Area', 'How It Works', 'Testimonials', 'Affiliate Program', 'Book Now'].map(link => (
                <a key={link} href="#" className="block text-xs text-white/40 hover:text-white/70 transition-colors">{link}</a>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] tracking-[0.25em] uppercase text-white/25 mb-4">Contact</div>
            <div className="space-y-3">
              {[
                { icon: <PhoneIcon className="w-3.5 h-3.5 flex-shrink-0" />, text: '(512) 408-1234' },
                { icon: <MapPinIcon className="w-3.5 h-3.5 flex-shrink-0" />, text: 'Austin, TX — 60-mile radius' },
                { icon: <ClockIcon className="w-3.5 h-3.5 flex-shrink-0" />, text: 'Mon–Sat, 7:00am–7:00pm' },
              ].map(row => (
                <div key={row.text} className="flex items-center gap-2 text-xs text-white/40">
                  {row.icon}{row.text}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="text-[10px] text-white/20 tracking-widest uppercase">
            © 2025 Silva Star Water Solutions. All rights reserved.
          </div>
          <div className="text-[10px] text-white/20">Licensed &amp; Insured · Austin, TX</div>
        </div>
      </div>
    </footer>
  );
}

export default function SilvaStarLanding() {
  return (
    <div className="min-h-screen bg-[#0d1117] font-sans">
      <Navbar />
      <main>
        <Hero />
        <Services />
        <ServiceArea />
        <HowItWorks />
        <Testimonials />
        <AffiliateSection />
        <BookingCTA />
      </main>
      <Footer />
    </div>
  );
}
