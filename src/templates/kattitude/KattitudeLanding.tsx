import { useState, useEffect } from 'react';
import {
  CalendarDaysIcon,
  CheckCircleIcon,
  StarIcon,
  PhoneIcon,
  ArrowRightIcon,
  Bars3Icon,
  XMarkIcon,
  ClockIcon,
  MapPinIcon,
  SparklesIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  CameraIcon,
  BoltIcon,
  PaintBrushIcon,
} from '@heroicons/react/24/outline';

const PINK = '#E91E8C';
const GOLD = '#B8860B';
const BEE = 'https://kattitudekollection.com/cdn/shop/files/Black_White_Circle_Bee_Icon_Food_Logo_-_1.png';

function useLocalDark() {
  const [dark, setDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('kattitude-dark');
      return saved === null ? true : saved !== 'false';
    } catch { return true; }
  });
  const toggle = () => {
    setDark(d => {
      const next = !d;
      try { localStorage.setItem('kattitude-dark', String(next)); } catch {}
      return next;
    });
  };
  return [dark, toggle] as const;
}

function Navbar({ dark, toggleDark }: { dark: boolean; toggleDark: () => void }) {
  const [open, setOpen] = useState(false);
  const links = ['Styles', 'How It Works', 'Artists', 'Testimonials'];

  const bg = dark ? 'rgba(10,10,10,0.96)' : 'rgba(255,255,255,0.96)';
  const logoText = dark ? '#ffffff' : '#0a0a0a';
  const linkColor = dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const linkHover = dark ? '#ffffff' : '#0a0a0a';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50" style={{ background: bg, backdropFilter: 'blur(12px)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={BEE} alt="Kattitude bee logo" className="w-8 h-8 object-contain rounded-full" />
          <div>
            <div className="font-black text-sm tracking-widest uppercase leading-none" style={{ color: logoText }}>Kattitude</div>
            <div className="text-[10px] tracking-[0.2em] uppercase leading-none mt-0.5" style={{ color: PINK }}>Tattoo Studio</div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-7">
          {links.map(link => (
            <a key={link} href={`#${link.toLowerCase().replace(/\s+/g, '-')}`}
              className="text-[11px] tracking-widest uppercase transition-colors hover:opacity-100"
              style={{ color: linkColor }}>
              {link}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <a href="https://www.instagram.com/kattitudetattoo" target="_blank" rel="noopener noreferrer"
            className="text-[11px] tracking-wider uppercase transition-colors" style={{ color: linkColor }}>
            @kattitudetattoo
          </a>
          <button onClick={toggleDark}
            className="w-8 h-8 flex items-center justify-center text-base rounded-full transition-all"
            style={{ color: dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)', background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
            aria-label="Toggle dark mode">
            {dark ? '☀' : '◑'}
          </button>
          <a href="#book" className="px-5 py-2 text-xs font-black tracking-widest uppercase transition-opacity hover:opacity-90"
            style={{ background: GOLD, color: '#ffffff' }}>
            Book Now
          </a>
        </div>

        <button onClick={() => setOpen(!open)} className="md:hidden"
          style={{ color: dark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>
          {open ? <XMarkIcon className="w-5 h-5" /> : <Bars3Icon className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden px-4 py-4 space-y-1" style={{ background: dark ? '#0a0a0a' : '#ffffff' }}>
          {links.map(link => (
            <a key={link} href={`#${link.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => setOpen(false)}
              className="block py-2.5 text-sm transition-colors"
              style={{ color: dark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>
              {link}
            </a>
          ))}
          <div className="flex items-center gap-2 pt-2">
            <button onClick={toggleDark} className="py-2.5 text-sm" style={{ color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
              {dark ? '☀ Light' : '◑ Dark'}
            </button>
          </div>
          <a href="#book" className="block w-full mt-2 py-3 text-sm font-black tracking-widest uppercase text-center"
            style={{ background: GOLD, color: '#ffffff' }}>
            Book Now
          </a>
        </div>
      )}
    </nav>
  );
}

function Hero({ dark }: { dark: boolean }) {
  const bg = dark ? '#0a0a0a' : '#ffffff';
  const textPrimary = dark ? '#ffffff' : '#0a0a0a';
  const textMuted = dark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
  const cardBg = dark ? '#111111' : '#f5f5f5';

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16" style={{ background: bg }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 80% 60% at 50% 10%, ${PINK}0a 0%, transparent 70%)` }} />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center pt-16 pb-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 text-[10px] tracking-[0.3em] uppercase font-medium"
          style={{ color: dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: PINK }} />
          Austin, TX · East Side · @kattitudetattoo
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight uppercase leading-none mb-6" style={{ color: textPrimary }}>
          Ink With<br />
          <span style={{ color: PINK }}>Attitude.</span>
        </h1>

        <p className="max-w-xl mx-auto text-base sm:text-lg leading-relaxed mb-10" style={{ color: textMuted }}>
          Custom tattoo artistry in Austin, TX. Traditional, fine line, blackwork, and color realism — every piece designed for you, every time.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
          <a href="#book" className="flex items-center gap-2 px-8 py-4 text-sm font-black tracking-widest uppercase transition-opacity hover:opacity-90 w-full sm:w-auto justify-center"
            style={{ background: GOLD, color: '#ffffff' }}>
            Book Your Session <ArrowRightIcon className="w-4 h-4" />
          </a>
          <a href="https://www.instagram.com/kattitudetattoo" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-8 py-4 text-sm font-black tracking-widest uppercase transition-colors w-full sm:w-auto justify-center"
            style={{ background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)', color: dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}>
            View Portfolio
          </a>
        </div>

        <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto">
          {[
            { value: '8+', label: 'Years of Experience' },
            { value: '5★', label: 'Average Rating' },
            { value: '1K+', label: 'Tattoos Completed' },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-black" style={{ color: textPrimary }}>{stat.value}</div>
              <div className="text-[10px] tracking-widest uppercase mt-1" style={{ color: dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        style={{ color: dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.2)' }}>
        <span className="text-[9px] tracking-[0.3em] uppercase">Scroll</span>
        <div className="w-px h-8" style={{ background: `linear-gradient(to bottom, ${dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'}, transparent)` }} />
      </div>
    </section>
  );
}

function Styles({ dark }: { dark: boolean }) {
  const bg = dark ? '#0a0a0a' : '#ffffff';
  const cardBg = dark ? '#111111' : '#f5f5f5';
  const cardHover = dark ? '#191919' : '#ebebeb';
  const textPrimary = dark ? '#ffffff' : '#0a0a0a';
  const textMuted = dark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
  const textFaint = dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.28)';

  const styles = [
    {
      icon: <PaintBrushIcon className="w-7 h-7" />,
      title: 'Traditional',
      tag: 'Bold & Timeless',
      description: 'Classic American and neo-traditional work with bold lines, saturated color fills, and iconic imagery built to last a lifetime.',
      features: ['Bold outlines', 'Saturated fills', 'Classic iconography', 'Vintage flash available'],
    },
    {
      icon: <SparklesIcon className="w-7 h-7" />,
      title: 'Fine Line',
      tag: 'Delicate & Precise',
      description: 'Intricate single-needle and micro-detail work. Botanical, geometric, portrait, and script designs executed with surgical precision.',
      features: ['Single-needle detail', 'Micro botanicals', 'Script & lettering', 'Geometric patterns'],
    },
    {
      icon: <BoltIcon className="w-7 h-7" />,
      title: 'Blackwork',
      tag: 'Dark & Graphic',
      description: 'High-contrast black ink only — from solid black fills and tribal patterns to ornamental sleeve-ready compositions.',
      features: ['Solid black fills', 'Tribal & ornamental', 'Dotwork shading', 'Sleeve compositions'],
    },
    {
      icon: <CameraIcon className="w-7 h-7" />,
      title: 'Color Realism',
      tag: 'Photographic Detail',
      description: 'Full-color photorealistic portraits, nature scenes, and pop-culture references that look like they belong in a gallery.',
      features: ['Portrait realism', 'Wildlife & nature', 'Pop art & fandom', 'Vibrant color blends'],
    },
    {
      icon: <StarIcon className="w-7 h-7" />,
      title: 'Illustrative',
      tag: 'Artistic & Unique',
      description: 'Where tattooing meets illustration. Custom characters, storybook scenes, anime, and stylized artwork designed from scratch.',
      features: ['Custom characters', 'Anime & manga style', 'Storybook scenes', 'Full-color illustration'],
    },
    {
      icon: <ShieldCheckIcon className="w-7 h-7" />,
      title: 'Cover-Ups',
      tag: 'Transformation',
      description: 'Breathe new life into old or unwanted tattoos. Kat specializes in creative cover-ups that exceed your expectations.',
      features: ['Old tattoo assessment', 'Creative redesign', 'Full coverage work', 'Laser-prep guidance'],
    },
  ];

  return (
    <section id="styles" className="py-24 px-4 sm:px-6" style={{ background: bg }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-14">
          <div className="text-[10px] tracking-[0.35em] uppercase mb-3" style={{ color: textFaint }}>What We Do</div>
          <h2 className="text-4xl font-black uppercase tracking-tight" style={{ color: PINK }}>Styles</h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {styles.map(s => (
            <div key={s.title} className="p-6 flex flex-col transition-colors duration-300 cursor-default group"
              style={{ background: cardBg }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = cardHover}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = cardBg}>
              <div className="flex items-start justify-between mb-5">
                <div style={{ color: textFaint }}>{s.icon}</div>
                <span className="text-[9px] tracking-[0.2em] uppercase px-2 py-1"
                  style={{ color: dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.28)', background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)' }}>
                  {s.tag}
                </span>
              </div>
              <h3 className="font-black text-xl uppercase tracking-tight mb-3" style={{ color: textPrimary }}>{s.title}</h3>
              <p className="text-sm leading-relaxed mb-6 flex-1" style={{ color: textMuted }}>{s.description}</p>
              <ul className="space-y-2">
                {s.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs" style={{ color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.45)' }}>
                    <CheckCircleIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)' }} />
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

function HowItWorks({ dark }: { dark: boolean }) {
  const bg = dark ? '#111111' : '#f5f5f5';
  const cardBg = dark ? '#0a0a0a' : '#ffffff';
  const textPrimary = dark ? '#ffffff' : '#0a0a0a';
  const textMuted = dark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
  const textFaint = dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.28)';

  const steps = [
    {
      step: '01', icon: <UserGroupIcon className="w-6 h-6" />,
      title: 'Select Your Artist',
      body: 'Browse artist profiles and choose the one whose style matches your vision. Each artist specializes in different techniques.',
    },
    {
      step: '02', icon: <PaintBrushIcon className="w-6 h-6" />,
      title: 'Pick Your Style',
      body: 'Traditional, fine line, blackwork, color realism — tell us what vibe you\'re going for and describe your concept.',
    },
    {
      step: '03', icon: <CameraIcon className="w-6 h-6" />,
      title: 'Upload Your Reference',
      body: 'Share inspiration images, sketches, or existing tattoos. The more reference you provide, the better your custom design.',
    },
    {
      step: '04', icon: <BoltIcon className="w-6 h-6" />,
      title: 'Get Your Estimate',
      body: 'Your artist will review your reference photos and provide a personalized price and time estimate based on your concept.',
    },
    {
      step: '05', icon: <ShieldCheckIcon className="w-6 h-6" />,
      title: 'Sign Waiver & Pay Deposit',
      body: 'Review and sign your consent waiver digitally, then secure your appointment with a deposit. It\'s that simple.',
      phase2: true,
    },
  ];

  return (
    <section id="how-it-works" className="py-24 px-4 sm:px-6" style={{ background: bg }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-14">
          <div className="text-[10px] tracking-[0.35em] uppercase mb-3" style={{ color: textFaint }}>The Process</div>
          <h2 className="text-4xl font-black uppercase tracking-tight" style={{ color: PINK }}>How It Works</h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {steps.map(s => (
            <div key={s.step} className="p-6" style={{ background: cardBg }}>
              <div className="flex items-start justify-between mb-4">
                <div style={{ color: textFaint }}>{s.icon}</div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-4xl font-black select-none leading-none" style={{ color: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)' }}>{s.step}</span>
                  {s.phase2 && (
                    <span className="text-[8px] tracking-[0.2em] uppercase px-1.5 py-0.5 font-bold" style={{ color: PINK, background: `${PINK}18` }}>Phase 2</span>
                  )}
                </div>
              </div>
              <h3 className="font-bold text-sm uppercase tracking-wider mb-3" style={{ color: textPrimary }}>{s.title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: textMuted }}>{s.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 p-6" style={{ background: `${PINK}0d` }}>
          <div className="flex items-start gap-3">
            <SparklesIcon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: PINK }} />
            <div>
              <div className="text-sm font-bold uppercase tracking-wider mb-1" style={{ color: PINK }}>Step 5 — Digital Booking Coming Soon</div>
              <p className="text-xs leading-relaxed" style={{ color: textMuted }}>
                We're building a digital booking flow for waivers and deposit collection — sign and pay before you even walk in the door. Join the waitlist to be first access.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Artists({ dark }: { dark: boolean }) {
  const bg = dark ? '#0a0a0a' : '#ffffff';
  const cardBg = dark ? '#111111' : '#f5f5f5';
  const textPrimary = dark ? '#ffffff' : '#0a0a0a';
  const textMuted = dark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
  const textFaint = dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.28)';

  const team = [
    {
      initials: 'KH',
      name: 'Katherine "Kat" Herrera',
      role: 'Owner & Lead Artist',
      instagram: '@kattitudetattoo',
      specialties: ['Fine Line', 'Color Realism', 'Illustrative', 'Cover-Ups'],
      bio: 'Kat is a self-taught artist with 8+ years of experience. Known for her delicate fine line work and vibrant realism, she brings your concept to life with precision and flair.',
      availability: 'Booking 6–8 weeks out',
      rating: 5,
    },
    {
      initials: 'MR',
      name: 'Marco Reyes',
      role: 'Guest Artist',
      instagram: '@marcoreyes.ink',
      specialties: ['Blackwork', 'Traditional', 'Tribal', 'Geometric'],
      bio: 'Marco specializes in bold, graphic blackwork and classic American traditional. If you want something that pops, Marco is your artist.',
      availability: 'Booking 4–5 weeks out',
      rating: 5,
    },
    {
      initials: 'SL',
      name: 'Sofia Lee',
      role: 'Guest Artist',
      instagram: '@sofialee.tats',
      specialties: ['Fine Line', 'Botanical', 'Minimalist', 'Script'],
      bio: 'Sofia brings a soft, feminine touch to fine line tattooing. Her botanical and script work has earned her a loyal following across Austin.',
      availability: 'Booking 3–4 weeks out',
      rating: 5,
    },
  ];

  return (
    <section id="artists" className="py-24 px-4 sm:px-6" style={{ background: bg }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-14">
          <div className="text-[10px] tracking-[0.35em] uppercase mb-3" style={{ color: textFaint }}>The Team</div>
          <h2 className="text-4xl font-black uppercase tracking-tight" style={{ color: PINK }}>Artists</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {team.map(artist => (
            <div key={artist.name} className="p-6 flex flex-col" style={{ background: cardBg }}>
              <div className="flex items-start gap-4 mb-5">
                <div className="w-14 h-14 flex items-center justify-center flex-shrink-0 font-black text-lg"
                  style={{ background: `${PINK}18`, color: PINK }}>
                  {artist.initials}
                </div>
                <div>
                  <div className="font-bold text-sm" style={{ color: textPrimary }}>{artist.name}</div>
                  <div className="text-[10px] tracking-widest uppercase mt-0.5" style={{ color: PINK }}>{artist.role}</div>
                  <div className="text-xs mt-0.5" style={{ color: textFaint }}>{artist.instagram}</div>
                </div>
              </div>

              <p className="text-xs leading-relaxed mb-5 flex-1" style={{ color: textMuted }}>{artist.bio}</p>

              <div className="flex flex-wrap gap-1.5 mb-5">
                {artist.specialties.map(s => (
                  <span key={s} className="text-[9px] tracking-[0.15em] uppercase px-2 py-1 font-medium"
                    style={{ color: dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)' }}>
                    {s}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex gap-0.5">
                  {Array.from({ length: artist.rating }).map((_, i) => (
                    <StarIcon key={i} className="w-3 h-3 fill-current" style={{ color: GOLD }} />
                  ))}
                </div>
                <span className="text-[10px]" style={{ color: textFaint }}>{artist.availability}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials({ dark }: { dark: boolean }) {
  const bg = dark ? '#111111' : '#f5f5f5';
  const cardBg = dark ? '#0a0a0a' : '#ffffff';
  const textPrimary = dark ? '#ffffff' : '#0a0a0a';
  const textMuted = dark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)';
  const textFaint = dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.28)';

  const testimonials = [
    {
      name: 'Camila V.', location: 'East Austin', rating: 5,
      text: "Kat is the most talented artist I've ever sat with. She took my vague idea and turned it into the most beautiful fine line piece I could have imagined. Zero hesitation recommending her to everyone.",
    },
    {
      name: 'Jordan T.', location: 'South Congress', rating: 5,
      text: "I came in for a cover-up I'd been dreading for years. Kat not only covered it — she completely transformed it into a sleeve centerpiece I'm obsessed with. The studio is clean, professional, and fun.",
    },
    {
      name: 'Priya M.', location: 'Domain Northside', rating: 5,
      text: "Got my first tattoo at Kattitude and I'll never go anywhere else. Kat made me feel completely at ease, walked me through everything, and the color realism portrait she did is absolutely stunning.",
    },
  ];

  return (
    <section id="testimonials" className="py-24 px-4 sm:px-6" style={{ background: bg }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-14">
          <div className="text-[10px] tracking-[0.35em] uppercase mb-3" style={{ color: textFaint }}>What Clients Say</div>
          <h2 className="text-4xl font-black uppercase tracking-tight" style={{ color: PINK }}>Testimonials</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {testimonials.map(t => (
            <div key={t.name} className="p-6 flex flex-col" style={{ background: cardBg }}>
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <StarIcon key={i} className="w-3.5 h-3.5 fill-current" style={{ color: GOLD }} />
                ))}
              </div>
              <p className="text-sm leading-relaxed italic flex-1 mb-6" style={{ color: textMuted }}>"{t.text}"</p>
              <div>
                <div className="font-bold text-sm" style={{ color: textPrimary }}>{t.name}</div>
                <div className="text-xs mt-0.5" style={{ color: textFaint }}>{t.location}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BookingCTA({ dark }: { dark: boolean }) {
  const bg = dark ? '#0a0a0a' : '#ffffff';
  const formBg = dark ? '#111111' : '#f5f5f5';
  const inputBg = dark ? '#0a0a0a' : '#ffffff';
  const textPrimary = dark ? '#ffffff' : '#0a0a0a';
  const textMuted = dark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
  const textFaint = dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.28)';
  const inputText = dark ? '#ffffff' : '#0a0a0a';
  const placeholderColor = dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.25)';

  return (
    <section id="book" className="py-24 px-4 sm:px-6" style={{ background: bg }}>
      <div className="max-w-3xl mx-auto text-center">
        <SparklesIcon className="w-7 h-7 mx-auto mb-6" style={{ color: textFaint }} />
        <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tight mb-6" style={{ color: PINK }}>
          Ready to Book?
        </h2>
        <p className="text-lg mb-10" style={{ color: textMuted }}>
          Custom tattoos in Austin, TX. Fill out the form and Kat will be in touch within 48 hours to discuss your concept.
        </p>

        <div className="p-8 mb-8 text-left" style={{ background: formBg }}>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            {[
              { label: 'Your Name', placeholder: 'First & Last Name', type: 'text' },
              { label: 'Email or Phone', placeholder: 'your@email.com', type: 'text' },
            ].map(field => (
              <div key={field.label}>
                <label className="block text-[10px] tracking-[0.2em] uppercase mb-2" style={{ color: textFaint }}>{field.label}</label>
                <input type={field.type} placeholder={field.placeholder}
                  style={{ background: inputBg, color: inputText, caretColor: PINK }}
                  className="w-full px-4 py-3 text-sm focus:outline-none"
                  onFocus={e => (e.target as HTMLInputElement).style.boxShadow = `inset 0 0 0 1px ${PINK}40`}
                  onBlur={e => (e.target as HTMLInputElement).style.boxShadow = 'none'} />
              </div>
            ))}
            <div>
              <label className="block text-[10px] tracking-[0.2em] uppercase mb-2" style={{ color: textFaint }}>Tattoo Style</label>
              <select style={{ background: inputBg, color: textMuted, appearance: 'none' }}
                className="w-full px-4 py-3 text-sm focus:outline-none">
                <option>Fine Line</option>
                <option>Traditional</option>
                <option>Blackwork</option>
                <option>Color Realism</option>
                <option>Illustrative</option>
                <option>Cover-Up</option>
                <option>Not Sure Yet</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.2em] uppercase mb-2" style={{ color: textFaint }}>Approximate Size</label>
              <select style={{ background: inputBg, color: textMuted, appearance: 'none' }}
                className="w-full px-4 py-3 text-sm focus:outline-none">
                <option>Small (credit card)</option>
                <option>Medium (palm-sized)</option>
                <option>Large (hand-sized)</option>
                <option>XL (multi-session)</option>
              </select>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-[10px] tracking-[0.2em] uppercase mb-2" style={{ color: textFaint }}>Describe Your Concept</label>
            <textarea placeholder="Tell us about your tattoo idea — subject, placement, inspiration, or anything else that helps..." rows={4}
              style={{ background: inputBg, color: inputText, caretColor: PINK }}
              className="w-full px-4 py-3 text-sm focus:outline-none resize-none" />
          </div>
          <button className="w-full py-4 text-sm font-black tracking-widest uppercase flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
            style={{ background: GOLD, color: '#ffffff' }}>
            Submit Consultation Request <ArrowRightIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs" style={{ color: textFaint }}>
          <div className="flex items-center gap-1.5"><PhoneIcon className="w-3.5 h-3.5" />(512) 555-0420</div>
          <div className="w-px h-4" style={{ background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />
          <div className="flex items-center gap-1.5"><ClockIcon className="w-3.5 h-3.5" />Tue–Sat, 11am–7pm</div>
          <div className="w-px h-4" style={{ background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />
          <div className="flex items-center gap-1.5"><MapPinIcon className="w-3.5 h-3.5" />East Austin, TX</div>
        </div>
      </div>
    </section>
  );
}

function Footer({ dark }: { dark: boolean }) {
  const bg = dark ? '#111111' : '#f5f5f5';
  const textPrimary = dark ? '#ffffff' : '#0a0a0a';
  const textFaint = dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.28)';
  const textLink = dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.45)';

  return (
    <footer className="py-12 px-4 sm:px-6" style={{ background: bg }}>
      <div className="max-w-6xl mx-auto">
        <div className="grid sm:grid-cols-3 gap-8 mb-10">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <img src={BEE} alt="Kattitude" className="w-7 h-7 object-contain rounded-full" />
              <div>
                <div className="font-black text-sm tracking-widest uppercase leading-none" style={{ color: textPrimary }}>Kattitude</div>
                <div className="text-[8px] tracking-[0.25em] uppercase leading-none mt-0.5" style={{ color: PINK }}>Tattoo Studio</div>
              </div>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: textFaint }}>
              Custom tattoo artistry in East Austin, TX. Owner and lead artist: Katherine "Kat" Herrera.
            </p>
          </div>

          <div>
            <div className="text-[10px] tracking-[0.25em] uppercase mb-4" style={{ color: textFaint }}>Quick Links</div>
            <div className="space-y-2">
              {['Styles', 'How It Works', 'Artists', 'Testimonials', 'Book Now', 'Merch Store'].map(link => (
                <a key={link} href="#" className="block text-xs transition-colors hover:opacity-80" style={{ color: textLink }}>{link}</a>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] tracking-[0.25em] uppercase mb-4" style={{ color: textFaint }}>Contact</div>
            <div className="space-y-3">
              {[
                { icon: <PhoneIcon className="w-3.5 h-3.5 flex-shrink-0" />, text: '(512) 555-0420' },
                { icon: <MapPinIcon className="w-3.5 h-3.5 flex-shrink-0" />, text: 'East Austin, TX' },
                { icon: <ClockIcon className="w-3.5 h-3.5 flex-shrink-0" />, text: 'Tue–Sat, 11:00am–7:00pm' },
              ].map(row => (
                <div key={row.text} className="flex items-center gap-2 text-xs" style={{ color: textLink }}>
                  {row.icon}{row.text}
                </div>
              ))}
              <div className="pt-1">
                <a href="https://www.instagram.com/kattitudetattoo" target="_blank" rel="noopener noreferrer"
                  className="text-xs font-medium transition-colors" style={{ color: PINK }}>
                  @kattitudetattoo →
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-2"
          style={{ borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'}` }}>
          <div className="text-[10px] tracking-widest uppercase" style={{ color: textFaint }}>
            © 2026 Kattitude Tattoo Studio. All rights reserved.
          </div>
          <div className="text-[10px]" style={{ color: textFaint }}>Austin, TX · Licensed &amp; Insured</div>
        </div>
      </div>
    </footer>
  );
}

export default function KattitudeLanding() {
  const [dark, toggleDark] = useLocalDark();

  return (
    <div className="min-h-screen font-sans" style={{ background: dark ? '#0a0a0a' : '#ffffff' }}>
      <Navbar dark={dark} toggleDark={toggleDark} />
      <main>
        <Hero dark={dark} />
        <Styles dark={dark} />
        <HowItWorks dark={dark} />
        <Artists dark={dark} />
        <Testimonials dark={dark} />
        <BookingCTA dark={dark} />
      </main>
      <Footer dark={dark} />
    </div>
  );
}
