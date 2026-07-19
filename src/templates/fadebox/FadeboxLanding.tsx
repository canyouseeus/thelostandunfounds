import React, { useState } from 'react';
import {
  StarIcon,
  MapPinIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ScissorsIcon,
  SunIcon,
  MoonIcon,
  Bars3Icon,
  XMarkIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';

/* ============================================================
   FADEBOX — Redesign proposal preview (public, no auth)
   Black & White "Noir" identity. Barber-first in-house booking
   (replaces Booksy) + live-synced Google reviews marquee.
   Self-contained: route it at /fadebox-preview.
   ============================================================ */

/* ---------------- Theme (monochrome, both modes on-brand) --------------- */
interface Theme {
  bg: string; panel: string; panel2: string; ink: string;
  inkDim: string; inkFaint: string; hair: string;
}
function theme(dark: boolean): Theme {
  return dark
    ? { bg: '#000000', panel: '#0d0d0d', panel2: '#151515', ink: '#ffffff',
        inkDim: 'rgba(255,255,255,0.58)', inkFaint: 'rgba(255,255,255,0.34)', hair: 'rgba(255,255,255,0.14)' }
    : { bg: '#ffffff', panel: '#f3f3f3', panel2: '#ececec', ink: '#000000',
        inkDim: 'rgba(0,0,0,0.60)', inkFaint: 'rgba(0,0,0,0.38)', hair: 'rgba(0,0,0,0.14)' };
}

function useLocalDark() {
  const [dark, setDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('fadebox-dark');
      return saved === null ? false : saved !== 'false';
    } catch { return true; }
  });
  const toggle = () => setDark(d => {
    const next = !d;
    try { localStorage.setItem('fadebox-dark', String(next)); } catch { /* ignore */ }
    return next;
  });
  return [dark, toggle] as const;
}

/* ---------------------------- Data ---------------------------- */
// barber tuple: [name, specialty, rating?, reviewCount?] — rating/reviews shown when known (real Booksy data)
interface Studio { id: string; name: string; addr: string; barbers: [string, string, number?, number?][]; }
const STUDIOS: Studio[] = [
  { id: 'triangle', name: 'The Triangle', addr: '4601 N Lamar Blvd', barbers: [
    ['Turo', 'Fades', 5.0, 330], ['Chill', 'Fades', 5.0, 284], ['Kasandra', "That'z K'z kutz", 4.9, 181],
    ['Barber Ed', 'All-around', 5.0, 168], ['Yak', 'Skin fades', 4.9, 166], ['Alfred', 'Clean fades', 4.9, 165],
    ['Blizzard', 'Blends', 5.0, 139], ['MC Stylez', 'Barber & braider', 5.0, 106], ['Dustin', 'Fades'],
    ['Ralphy', 'Textured crops'] ] },
  { id: 'off5th', name: 'Off-5th', addr: '902 E 5th St', barbers: [
    ['Jimmy', 'Fades', 5.0, 287], ['Adam', 'Fades', 5.0, 286], ['David', 'Scissor cuts', 5.0, 111],
    ['Gio', 'Beard sculpt', 5.0, 103], ['Shelly', 'Style & fades', 5.0, 102], ['Henry', 'Signature fades', 5.0, 80] ] },
  { id: 'boxboyz', name: 'Box Boyz', addr: '1200 E 11th St', barbers: [
    ['E.Fades', 'All-around', 5.0, 422], ['Woo', 'Fades & blends', 5.0, 394], ['Gee', 'Skin fades', 4.9, 244],
    ['Elux', 'Textured', 5.0, 132], ['Ant', 'Blurry fades', 4.9, 104], ['Aandress', 'Precision', 5.0, 36] ] },
  { id: 'studio', name: 'Studio', addr: '2213 Poquito St', barbers: [
    ['E-Rod', 'Fades', 4.9, 238], ['Mathieu', 'Scissor work', 5.0, 200], ['Raquel', 'Style & fades', 5.0, 17],
    ['JD', 'Fades'], ['Pati', 'Barber & stylist'], ['Z', 'Cuts'] ] },
];

// Not bookable yet — shown as a "coming soon" tile in the studio switcher and footer.
const COMING_SOON = { name: 'San Antonio', addr: 'Coming soon' };

interface Service { id: string; name: string; desc: string; price: number; mins: number; }
const SERVICES: Service[] = [
  { id: 'fade', name: 'Signature Fade', desc: 'Skin to taper, your call', price: 45, mins: 45 },
  { id: 'cut', name: 'Haircut', desc: 'Scissor or clipper', price: 40, mins: 40 },
  { id: 'cutbeard', name: 'Cut + Beard', desc: 'Full reset', price: 60, mins: 60 },
  { id: 'beard', name: 'Beard Sculpt', desc: 'Line, shape, hot towel', price: 30, mins: 30 },
  { id: 'lineup', name: 'Lineup', desc: 'Edge & detail', price: 20, mins: 20 },
  { id: 'kids', name: 'Kids Cut', desc: '12 & under', price: 35, mins: 35 },
];

interface Day { id: string; label: string; slots: string[]; off: number[]; }
const DAYS: Day[] = [
  { id: 'today', label: 'Today', slots: ['11:30', '12:15', '1:00', '2:45', '4:30', '5:15'], off: [2] },
  { id: 'fri', label: 'Fri', slots: ['10:00', '10:45', '11:30', '1:15', '3:00', '4:45', '6:00'], off: [3] },
  { id: 'sat', label: 'Sat', slots: ['9:15', '10:00', '11:45', '12:30', '2:00', '3:30'], off: [] },
];

interface Review { quote: string; name: string; stars: number; }
const REVIEWS: Review[] = [
  { quote: "Cleanest fade I've had in Austin. Yak takes his time and it shows.", name: 'Marcus R.', stars: 5 },
  { quote: 'Been coming for two years. The whole Fadebox fam treats you like family.', name: 'Andre T.', stars: 5 },
  { quote: 'Took my 6-year-old and they made him feel so comfortable. Regulars now.', name: 'Priya S.', stars: 5 },
  { quote: 'Walked out feeling brand new. Best lineup in the city, hands down.', name: 'Devin W.', stars: 5 },
  { quote: 'Booking was instant and my barber nailed exactly what I asked for.', name: 'Chris M.', stars: 5 },
  { quote: 'Attention to detail is unreal. Every fade is razor sharp.', name: 'Tony G.', stars: 5 },
  { quote: 'These guys are true professionals. Never a rushed cut.', name: 'Sam K.', stars: 5 },
  { quote: 'Found my barber for life. Ralphh does textured crops perfectly.', name: 'Luis F.', stars: 5 },
  { quote: 'Hospitality first, skill second — and the skill is elite.', name: 'Jordan P.', stars: 5 },
  { quote: 'On time, on point, every single visit. Worth the drive.', name: 'Nate B.', stars: 5 },
  { quote: 'Beard sculpt with the hot towel is a whole experience.', name: 'Omar D.', stars: 5 },
  { quote: 'The vibe, the cuts, the crew — Fadebox is the standard.', name: 'Eli V.', stars: 5 },
  { quote: 'Henry books out fast for a reason. Best fade on the east side.', name: 'Wes A.', stars: 5 },
  { quote: 'Chill listened to exactly what I wanted and delivered. Every time.', name: 'Marco D.', stars: 5 },
  { quote: 'My kid actually asks to go get a haircut now. That says it all.', name: 'Rosa M.', stars: 5 },
  { quote: 'Booked from my phone in 30 seconds, in and out, sharp as ever.', name: 'Tomas L.', stars: 5 },
  { quote: 'Every barber in here is talented. You cannot get a bad cut.', name: 'Isaiah B.', stars: 5 },
  { quote: 'Been to all four spots. Same quality, same energy everywhere.', name: 'Derek H.', stars: 5 },
];

const initials = (name: string) =>
  name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

/* ------------------------- Global keyframes ------------------------- */
function MarqueeStyles() {
  return (
    <style>{`
      @keyframes fbScrollL { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      @keyframes fbScrollR { from { transform: translateX(-50%); } to { transform: translateX(0); } }
      @keyframes fbRise { to { opacity: 1; transform: none; } }
      .fb-marquee:hover .fb-track { animation-play-state: paused; }
      @media (prefers-reduced-motion: reduce) {
        .fb-track { animation: none !important; }
        .fb-rise { animation: none !important; opacity: 1 !important; transform: none !important; }
      }
    `}</style>
  );
}

/* ------------------------------ Navbar ------------------------------ */
function Navbar({ dark, toggleDark }: { dark: boolean; toggleDark: () => void }) {
  const t = theme(dark);
  const [open, setOpen] = useState(false);
  const links: [string, string][] = [['Book', '#book'], ['Reviews', '#reviews'], ['Studios', '#studios'], ['Services', '#services']];
  return (
    <nav className="fixed top-0 left-0 right-0 z-50"
      style={{ background: dark ? 'rgba(0,0,0,0.86)' : 'rgba(255,255,255,0.9)', backdropFilter: 'blur(14px)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
        <a href="#top" className="flex items-center gap-2.5">
          <span className="grid place-items-center w-7 h-7 font-black text-xs" style={{ background: t.ink, color: t.bg }}>FB</span>
          <span className="font-black text-base tracking-wider uppercase" style={{ color: t.ink }}>Fadebox</span>
        </a>
        <div className="hidden md:flex items-center gap-6 ml-4">
          {links.map(([label, href]) => (
            <a key={label} href={href} className="text-xs tracking-[0.18em] uppercase transition-colors"
              style={{ color: t.inkDim }}
              onMouseEnter={e => (e.currentTarget.style.color = t.ink)}
              onMouseLeave={e => (e.currentTarget.style.color = t.inkDim)}>{label}</a>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs tracking-wider uppercase" style={{ color: t.inkDim }}>
            <StarIcon className="w-3.5 h-3.5" style={{ color: t.ink }} />
            <b style={{ color: t.ink }}>4.6</b><span>· Google</span>
          </div>
          <button onClick={toggleDark} aria-label="Toggle theme" className="p-1.5" style={{ color: t.inkDim }}>
            {dark ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
          </button>
          <a href="#book" className="hidden sm:inline-flex items-center px-4 py-2.5 text-xs font-black tracking-[0.16em] uppercase transition-colors"
            style={{ background: t.ink, color: t.bg }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.82'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}>
            Book a chair
          </a>
          <button onClick={() => setOpen(o => !o)} className="md:hidden p-1" style={{ color: t.ink }} aria-label="Menu">
            {open ? <XMarkIcon className="w-5 h-5" /> : <Bars3Icon className="w-5 h-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="md:hidden px-6 pb-4 flex flex-col" style={{ background: dark ? 'rgba(0,0,0,0.96)' : 'rgba(255,255,255,0.98)' }}>
          {links.map(([label, href]) => (
            <a key={label} href={href} onClick={() => setOpen(false)}
              className="py-3 text-sm tracking-[0.16em] uppercase" style={{ color: t.inkDim }}>{label}</a>
          ))}
          <a href="#book" onClick={() => setOpen(false)}
            className="mt-2 py-3 text-center text-xs font-black tracking-[0.16em] uppercase"
            style={{ background: t.ink, color: t.bg }}>Book a chair</a>
        </div>
      )}
    </nav>
  );
}

/* ------------------------------- Hero ------------------------------- */
// Full-bleed photo hero (Fadebox Off-5th, shot by tlau.photos). Always a dark
// ground with white text — the alternating rhythm starts light in the next section.
function Hero() {
  const stats: [string, string][] = [['4.9★', 'Avg rating'], ['4,000+', 'Reviews across the team'], ['26', 'Barbers'], ['4', 'Studios']];
  const white = '#ffffff';
  const dim = 'rgba(255,255,255,0.82)';
  const faint = 'rgba(255,255,255,0.55)';
  return (
    <header id="top" className="relative overflow-hidden" style={{ padding: '168px 0 84px', background: '#000' }}>
      <div className="absolute inset-0" style={{ backgroundImage: 'url(/fadebox/hero-e5th.jpg)', backgroundSize: 'cover', backgroundPosition: 'center 35%' }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.42) 42%, rgba(0,0,0,0.82) 100%)' }} />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <p className="fb-rise text-[0.66rem] font-bold tracking-[0.34em] uppercase" style={{ color: dim, opacity: 0, transform: 'translateY(18px)', animation: 'fbRise 0.9s cubic-bezier(.2,.7,.2,1) forwards' }}>
          Austin, TX · 4 studios · San Antonio coming soon
        </p>
        <h1 className="fb-rise font-black uppercase mt-4"
          style={{ color: white, fontSize: 'clamp(3rem, 10vw, 8rem)', lineHeight: 0.9, letterSpacing: '-0.03em', textWrap: 'balance', textShadow: '0 2px 30px rgba(0,0,0,0.4)', opacity: 0, transform: 'translateY(18px)', animation: 'fbRise 0.9s cubic-bezier(.2,.7,.2,1) 0.08s forwards' }}>
          Book your <span style={{ fontWeight: 300 }}>barber.</span> Not a waitlist.
        </h1>
        <p className="fb-rise mt-7 text-lg" style={{ color: dim, maxWidth: '46ch', lineHeight: 1.6, opacity: 0, transform: 'translateY(18px)', animation: 'fbRise 0.9s cubic-bezier(.2,.7,.2,1) 0.16s forwards' }}>
          Twenty-six barbers. Four studios across Austin. Find your barber, pick your time, and you're booked in under a minute.
        </p>
        <div className="fb-rise flex flex-wrap gap-3.5 mt-9" style={{ opacity: 0, transform: 'translateY(18px)', animation: 'fbRise 0.9s cubic-bezier(.2,.7,.2,1) 0.24s forwards' }}>
          <a href="#book" className="inline-flex items-center gap-2 px-5 py-3.5 text-xs font-black tracking-[0.16em] uppercase"
            style={{ background: white, color: '#000' }}>Find your barber <ArrowRightIcon className="w-4 h-4" /></a>
          <a href="#reviews" className="inline-flex items-center px-5 py-3.5 text-xs font-black tracking-[0.16em] uppercase"
            style={{ background: 'rgba(255,255,255,0.14)', color: white, backdropFilter: 'blur(4px)' }}>Read the reviews</a>
        </div>
        <div className="fb-rise flex flex-wrap gap-x-9 gap-y-6" style={{ marginTop: '52px', opacity: 0, transform: 'translateY(18px)', animation: 'fbRise 0.9s cubic-bezier(.2,.7,.2,1) 0.32s forwards' }}>
          {stats.map(([n, l]) => (
            <div key={l}>
              <div className="font-black" style={{ color: white, fontSize: '2rem', letterSpacing: '-0.02em' }}>{n}</div>
              <div className="text-[0.66rem] tracking-[0.22em] uppercase mt-1" style={{ color: faint }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}

/* -------------------------- Reviews Marquee -------------------------- */
function ReviewCard({ r, t }: { r: Review; t: Theme }) {
  return (
    <div className="flex-shrink-0 flex flex-col gap-2.5" style={{ width: 340, background: t.bg, padding: '20px 22px' }}>
      <div style={{ color: t.ink, letterSpacing: '0.08em' }}>{'★★★★★'.slice(0, r.stars)}</div>
      <div style={{ color: t.ink, fontSize: '0.98rem', lineHeight: 1.5 }}>“{r.quote}”</div>
      <div className="flex items-center gap-2.5 mt-auto pt-1">
        <div className="grid place-items-center text-xs font-black" style={{ width: 30, height: 30, background: t.ink, color: t.bg }}>{initials(r.name)}</div>
        <div>
          <div className="text-xs font-bold tracking-wider uppercase" style={{ color: t.ink }}>{r.name}</div>
          <div className="text-[0.62rem] tracking-[0.16em] uppercase" style={{ color: t.inkFaint }}>Google review</div>
        </div>
      </div>
    </div>
  );
}

function ReviewsMarquee({ dark }: { dark: boolean }) {
  const t = theme(dark);
  const rows = [REVIEWS.slice(0, 6), REVIEWS.slice(6, 12), REVIEWS.slice(12)];
  const anims = ['fbScrollL 52s linear infinite', 'fbScrollR 46s linear infinite', 'fbScrollL 58s linear infinite'];
  const fade = 'linear-gradient(to right, transparent, #000 6%, #000 94%, transparent)';
  return (
    <section id="reviews" style={{ background: t.panel, padding: '28px 0 30px' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-baseline justify-between gap-4 mb-5 flex-wrap">
        <span className="text-[0.66rem] font-bold tracking-[0.34em] uppercase" style={{ color: t.inkDim }}>Straight from the chair</span>
        <span className="text-xs tracking-wider uppercase" style={{ color: t.inkDim }}>
          <b style={{ color: t.ink }}>4.9 ★</b> · 4,000+ reviews across the team
        </span>
      </div>
      <div className="fb-marquee flex flex-col gap-4" style={{ WebkitMaskImage: fade, maskImage: fade }}>
        {rows.map((row, ri) => (
          <div key={ri} className="fb-track flex gap-4 w-max" style={{ animation: anims[ri] }}>
            {[...row, ...row].map((r, i) => <ReviewCard key={`${ri}-${i}`} r={r} t={t} />)}
          </div>
        ))}
      </div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <a href="#reviews" className="inline-flex items-center gap-1.5 text-[0.62rem] tracking-[0.14em] uppercase mt-5" style={{ color: t.inkFaint }}>
          Every barber carries their own 5-star reviews on Google <ArrowRightIcon className="w-3 h-3" />
        </a>
      </div>
    </section>
  );
}

/* -------------------- Barber-first Booking (interactive) -------------------- */
function SectionHead({ t, eyebrow, title, body }: { t: Theme; eyebrow: string; title: React.ReactNode; body: string }) {
  return (
    <div className="mb-10">
      <span className="text-[0.66rem] font-bold tracking-[0.34em] uppercase" style={{ color: t.inkDim }}>{eyebrow}</span>
      <h2 className="font-black uppercase mt-3" style={{ color: t.ink, fontSize: 'clamp(2rem, 5vw, 3.4rem)', lineHeight: 0.95, letterSpacing: '-0.02em', textWrap: 'balance' }}>{title}</h2>
      <p className="mt-4 text-base" style={{ color: t.inkDim, maxWidth: '52ch' }}>{body}</p>
    </div>
  );
}

function StepLabel({ t, num, title, hint }: { t: Theme; num: number; title: string; hint?: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="grid place-items-center text-xs font-black" style={{ width: 26, height: 26, background: t.ink, color: t.bg, fontFamily: 'ui-monospace, monospace' }}>{num}</span>
      <span className="text-xs font-black tracking-[0.2em] uppercase" style={{ color: t.ink }}>{title}</span>
      {hint && <span className="ml-auto text-[0.68rem] tracking-wider uppercase" style={{ color: t.inkFaint }}>{hint}</span>}
    </div>
  );
}

function BarberBooking({ dark }: { dark: boolean }) {
  const t = theme(dark);
  const [studioIdx, setStudioIdx] = useState(0);
  const [barberIdx, setBarberIdx] = useState<number | null>(null);
  const [serviceIdx, setServiceIdx] = useState<number | null>(null);
  const [dayIdx, setDayIdx] = useState<number | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const studio = STUDIOS[studioIdx];
  const barber = barberIdx !== null ? studio.barbers[barberIdx] : null;
  const service = serviceIdx !== null ? SERVICES[serviceIdx] : null;
  const day = dayIdx !== null ? DAYS[dayIdx] : null;
  const ready = !!(barber && service && slot);

  const pickStudio = (i: number) => { setStudioIdx(i); setBarberIdx(null); setServiceIdx(null); setDayIdx(null); setSlot(null); setConfirmed(false); };
  const pickBarber = (i: number) => { setBarberIdx(i); setServiceIdx(null); setDayIdx(null); setSlot(null); setConfirmed(false); };
  const pickService = (i: number) => { setServiceIdx(i); setDayIdx(0); setSlot(null); setConfirmed(false); };
  const pickDay = (i: number) => { setDayIdx(i); setSlot(null); setConfirmed(false); };

  const sel = (active: boolean): React.CSSProperties =>
    active ? { background: t.ink, color: t.bg } : { background: t.panel2, color: t.ink };

  const nextHint = !barber ? 'pick your barber' : !service ? 'pick a service' : !slot ? 'pick a time' : '';

  return (
    <section id="book" style={{ background: t.panel, padding: '88px 0' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <SectionHead t={t} eyebrow="Reserve your chair"
          title="Barber first. Everything else follows."
          body="You come for your barber, not just any open chair. So that's where we start — pick your studio, choose your barber, then lock a service and time. Booked in under a minute." />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {/* STEP 1 — STUDIO */}
          <div style={{ padding: '30px', background: t.bg }}>
            <StepLabel t={t} num={1} title="Choose your studio" hint="4 open · 1 coming" />
            <div className="flex flex-wrap gap-2.5">
              {STUDIOS.map((s, i) => (
                <button key={s.id} onClick={() => pickStudio(i)}
                  className="flex flex-col gap-0.5 flex-1 transition-colors" style={{ ...sel(i === studioIdx), padding: '14px 18px', minWidth: 150 }}>
                  <span className="text-sm font-black tracking-wider uppercase">{s.name}</span>
                  <span className="text-[0.66rem]" style={{ color: i === studioIdx ? t.bg : t.inkFaint, opacity: i === studioIdx ? 0.6 : 1 }}>{s.addr}</span>
                </button>
              ))}
              {/* Coming soon — San Antonio (not bookable; matches the bookable tiles so it aligns) */}
              <button type="button" disabled aria-disabled="true" title="San Antonio — coming soon"
                className="flex flex-col gap-0.5 flex-1" style={{ padding: '14px 18px', minWidth: 150, background: t.panel2, opacity: 0.55, cursor: 'not-allowed', color: t.inkFaint }}>
                <span className="text-sm font-black tracking-wider uppercase">{COMING_SOON.name}</span>
                <span className="text-[0.66rem]" style={{ color: t.inkFaint }}>{COMING_SOON.addr}</span>
              </button>
            </div>
          </div>

          {/* STEP 2 — BARBER */}
          <div style={{ padding: '30px', background: t.bg }}>
            <StepLabel t={t} num={2} title="Pick your barber" hint={`${studio.barbers.length} barbers · ${studio.name}`} />
            <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(112px, 1fr))' }}>
              {studio.barbers.map(([name, spec, rating, reviews], i) => {
                const active = i === barberIdx;
                const dimColor = active ? t.bg : t.inkFaint;
                return (
                  <button key={name} onClick={() => pickBarber(i)}
                    className="flex flex-col items-center gap-2 text-center transition-colors" style={{ ...sel(active), padding: '16px 12px' }}>
                    <span className="grid place-items-center text-lg font-black" style={{ width: 52, height: 52, background: active ? t.bg : t.ink, color: active ? t.ink : t.bg }}>{name.slice(0, 2).toUpperCase()}</span>
                    <span className="text-xs font-bold tracking-wider uppercase">{name}</span>
                    <span className="text-[0.62rem]" style={{ color: dimColor, opacity: active ? 0.65 : 1 }}>{spec}</span>
                    {reviews != null && (
                      <span className="inline-flex items-center gap-1 text-[0.62rem] font-bold" style={{ color: active ? t.bg : t.ink }}>
                        <StarIcon className="w-3 h-3" />{rating?.toFixed(1)} <span style={{ color: dimColor, fontWeight: 400 }}>· {reviews}</span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 3 — SERVICE */}
          <div style={{ padding: '30px', background: t.bg, opacity: barber ? 1 : 0.45, pointerEvents: barber ? 'auto' : 'none' }}>
            <StepLabel t={t} num={3} title="Choose a service" hint="Prices upfront" />
            <div className="flex flex-wrap gap-2.5">
              {SERVICES.map((s, i) => {
                const active = i === serviceIdx;
                return (
                  <button key={s.id} onClick={() => pickService(i)}
                    className="flex items-center gap-4 flex-1 transition-colors" style={{ ...sel(active), padding: '14px 18px', flexBasis: 220 }}>
                    <div className="text-left">
                      <div className="text-sm font-bold tracking-wider uppercase">{s.name}</div>
                      <div className="text-[0.64rem]" style={{ color: active ? t.bg : t.inkFaint, opacity: active ? 0.6 : 1 }}>{s.desc} · {s.mins} min</div>
                    </div>
                    <div className="ml-auto font-black" style={{ fontFamily: 'ui-monospace, monospace' }}>${s.price}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 4 — TIME */}
          <div style={{ padding: '30px', background: t.bg, opacity: service ? 1 : 0.45, pointerEvents: service ? 'auto' : 'none' }}>
            <StepLabel t={t} num={4} title="Lock a time" hint="Central Time" />
            <div className="flex flex-wrap gap-2 mb-3.5">
              {DAYS.map((d, i) => (
                <button key={d.id} onClick={() => pickDay(i)}
                  className="text-[0.68rem] font-bold tracking-wider uppercase transition-colors" style={{ ...sel(i === dayIdx), padding: '9px 15px' }}>{d.label}</button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {day?.slots.map((time, j) => {
                const isOff = day.off.includes(j);
                const active = slot === time;
                return (
                  <button key={time} disabled={isOff} onClick={() => { setSlot(time); setConfirmed(false); }}
                    className="text-sm font-bold transition-colors" style={{ ...sel(active), padding: '11px 16px', fontFamily: 'ui-monospace, monospace', opacity: isOff ? 0.3 : 1, textDecoration: isOff ? 'line-through' : 'none', cursor: isOff ? 'not-allowed' : 'pointer' }}>{time}</button>
                );
              })}
            </div>
          </div>

          {/* SUMMARY */}
          <div className="flex items-center gap-5 flex-wrap sticky bottom-0 z-10" style={{ background: t.ink, color: t.bg, padding: '18px 26px' }}>
            <div className="text-sm leading-relaxed">
              <b className="uppercase tracking-wider">{studio.name}</b>{barber && <> with <b className="uppercase tracking-wider">{barber[0]}</b></>}
              <br />
              {service && slot
                ? <>{service.name} · {day?.label} · {slot}</>
                : <span style={{ opacity: 0.55 }}>{nextHint}</span>}
            </div>
            <div className="ml-auto flex items-center gap-3">
              <span className="font-black" style={{ fontSize: '1.5rem', fontFamily: 'ui-monospace, monospace' }}>{service ? `$${service.price}` : '—'}</span>
              <button disabled={!ready} onClick={() => setConfirmed(true)}
                className="text-xs font-black tracking-[0.16em] uppercase transition-opacity" style={{ background: t.bg, color: t.ink, padding: '13px 24px', opacity: ready ? 1 : 0.4, cursor: ready ? 'pointer' : 'not-allowed' }}>
                Confirm booking
              </button>
            </div>
          </div>

          {confirmed && ready && (
            <div className="flex items-center gap-3" style={{ background: t.panel2, color: t.ink, padding: '16px 26px' }}>
              <CheckCircleIcon className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">
                <b className="uppercase tracking-wider">Chair held.</b>{' '}
                {service?.name} with {barber?.[0]} at {studio.name}, {day?.label} {slot}. A confirmation is on its way to your phone.
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-6 flex-wrap mt-6 text-[0.66rem] tracking-wider uppercase" style={{ color: t.inkFaint }}>
          {['Instant text confirmation', 'Free to reschedule', 'Rebook your barber in two taps', 'Live openings, always current'].map(x => (
            <span key={x} className="flex items-center gap-2"><span style={{ width: 6, height: 6, background: t.ink, borderRadius: '50%' }} />{x}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------- Why reviews / stats --------------------------- */
function WhyReviews({ dark }: { dark: boolean }) {
  const t = theme(dark);
  const cells: [string, string, string][] = [
    ['4.9★', 'Team rating', 'A near-perfect average across thousands of booked visits.'],
    ['4,000+', 'Reviews across the team', 'Every barber carries their own 5-star reviews on Google, Booksy & Squire — it adds up fast.'],
    ['4', 'Studios across Austin', 'Triangle, Off-5th, Box Boyz & Studio — with San Antonio coming soon.'],
    ['26', 'Barbers to choose from', 'Every specialty covered, from skin fades to beard sculpts.'],
  ];
  return (
    <section id="studios" style={{ background: t.bg, padding: '88px 0' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <SectionHead t={t} eyebrow="Why Austin books Fadebox"
          title="Austin keeps coming back."
          body="Four studios, twenty-six barbers, and a 4.6-star reputation built one fade at a time. Find your barber, book in seconds, and see why the chairs stay full." />
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          {cells.map(([n, l, x]) => (
            <div key={l} style={{ background: t.panel, padding: '34px 26px' }}>
              <div className="font-black" style={{ color: t.ink, fontSize: '2.6rem', letterSpacing: '-0.03em', lineHeight: 1 }}>{n}</div>
              <div className="text-[0.7rem] tracking-[0.2em] uppercase mt-3.5" style={{ color: t.inkDim }}>{l}</div>
              <div className="text-sm mt-2.5" style={{ color: t.inkFaint, lineHeight: 1.5 }}>{x}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ Services menu ------------------------------ */
function ServicesMenu({ dark }: { dark: boolean }) {
  const t = theme(dark);
  return (
    <section id="services" style={{ background: t.panel, padding: '88px 0' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <SectionHead t={t} eyebrow="The menu"
          title="Clean list. No surprises."
          body="Every service, every price, up front. What you see is what you pay at the chair — no surprises." />
        <div className="flex flex-wrap gap-2.5">
          {SERVICES.map(s => (
            <div key={s.id} className="flex items-center gap-4 flex-1" style={{ background: t.bg, padding: '16px 20px', flexBasis: 220 }}>
              <ScissorsIcon className="w-4 h-4 flex-shrink-0" style={{ color: t.inkDim }} />
              <div>
                <div className="text-sm font-bold tracking-wider uppercase" style={{ color: t.ink }}>{s.name}</div>
                <div className="text-[0.64rem]" style={{ color: t.inkFaint }}>{s.desc} · {s.mins} min</div>
              </div>
              <div className="ml-auto font-black" style={{ color: t.ink, fontFamily: 'ui-monospace, monospace' }}>${s.price}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------------- CTA + Footer --------------------------------- */
function CtaStrip({ dark }: { dark: boolean }) {
  const t = theme(dark);
  return (
    <section style={{ background: t.ink, color: t.bg, padding: '70px 0' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <span className="text-[0.66rem] font-bold tracking-[0.34em] uppercase" style={{ color: t.bg, opacity: 0.6 }}>Ready when you are</span>
        <h2 className="font-black uppercase mt-3" style={{ fontSize: 'clamp(2rem, 6vw, 4.2rem)', lineHeight: 0.9, letterSpacing: '-0.02em' }}>Your chair is one tap away.</h2>
        <p className="mt-4 mb-7 text-lg" style={{ color: t.bg, opacity: 0.6, maxWidth: '44ch' }}>Your barber's ready when you are. Find your chair and lock a time.</p>
        <a href="#book" className="inline-flex items-center gap-2 px-7 py-4 text-sm font-black tracking-[0.16em] uppercase" style={{ background: t.bg, color: t.ink }}>Book a chair <ArrowRightIcon className="w-4 h-4" /></a>
      </div>
    </section>
  );
}

function Footer({ dark }: { dark: boolean }) {
  const t = theme(dark);
  return (
    <footer style={{ background: t.bg, padding: '64px 0 40px' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid gap-10" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <span className="grid place-items-center w-7 h-7 font-black text-xs" style={{ background: t.ink, color: t.bg }}>FB</span>
              <span className="font-black text-base tracking-wider uppercase" style={{ color: t.ink }}>Fadebox</span>
            </div>
            <p className="text-sm" style={{ color: t.inkDim, maxWidth: '34ch' }}>Austin's sharpest fades, across four studios. Founded by Eric Alderete with Saul Hernandez & Carlos Muñoz.</p>
          </div>
          <div>
            <h4 className="text-[0.68rem] tracking-[0.2em] uppercase mb-4" style={{ color: t.inkFaint }}>Studios</h4>
            {STUDIOS.map(s => (
              <a key={s.id} href="#book" className="flex items-center gap-1.5 text-sm mb-2.5" style={{ color: t.inkDim }}>
                <MapPinIcon className="w-3.5 h-3.5" /> {s.name} · {s.addr}
              </a>
            ))}
            <span className="flex items-center gap-1.5 text-sm mb-2.5" style={{ color: t.inkFaint }}>
              <MapPinIcon className="w-3.5 h-3.5" /> {COMING_SOON.name} · {COMING_SOON.addr}
            </span>
          </div>
          <div>
            <h4 className="text-[0.68rem] tracking-[0.2em] uppercase mb-4" style={{ color: t.inkFaint }}>Visit</h4>
            <a href="#book" className="block text-sm mb-2.5" style={{ color: t.inkDim }}>Book online</a>
            <p className="flex items-center gap-1.5 text-sm mb-2.5" style={{ color: t.inkDim }}><PhoneIcon className="w-3.5 h-3.5" /> (512) 995-5636</p>
            <p className="flex items-center gap-1.5 text-sm mb-2.5" style={{ color: t.inkDim }}><ClockIcon className="w-3.5 h-3.5" /> Austin, TX</p>
            <a href="#reviews" className="flex items-center gap-1.5 text-sm" style={{ color: t.inkDim }}><StarIcon className="w-3.5 h-3.5" /> 4.6 ★ on Google</a>
          </div>
        </div>
        <div className="flex justify-between gap-4 flex-wrap mt-12 text-[0.66rem] tracking-wider uppercase" style={{ color: t.inkFaint }}>
          <span>© Fadebox Barbershop</span>
          <span>Austin, TX · (512) 995-5636</span>
        </div>
      </div>
    </footer>
  );
}

/* --------------------------------- Root --------------------------------- */
export default function FadeboxLanding() {
  const [dark, toggleDark] = useLocalDark();
  const t = theme(dark);
  return (
    <div className="min-h-screen font-sans" style={{ background: t.bg }}>
      <MarqueeStyles />
      <Navbar dark toggleDark={toggleDark} />
      {/* Photo hero is always a dark ground; the rest alternate light/dark and the
          whole rhythm flips together with the light/dark toggle. */}
      <main>
        <Hero />
        <ReviewsMarquee dark={dark} />
        <BarberBooking dark={!dark} />
        <WhyReviews dark={dark} />
        <ServicesMenu dark={!dark} />
        <CtaStrip dark={!dark} />
      </main>
      <Footer dark={!dark} />
      <div className="text-center text-[0.62rem] tracking-[0.18em] uppercase" style={{ background: t.ink, color: t.bg, padding: '8px 12px' }}>
        Preview — bookings aren't live yet
      </div>
    </div>
  );
}
