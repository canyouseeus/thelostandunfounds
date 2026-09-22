/* ============================================================
   DEMO SANDBOX — shared chrome.

   Joshua: "You should have a separate tab. ... the flash gallery has one page
   link, and the dashboard for them has another link. That's how you should
   have it set up for my thing: one that goes to my customer-facing website and
   one that goes to the admin dashboard."

   So every demo screen carries the same switcher: the customer-side tour, the
   owner console, the affiliate console. Three addresses, each sendable alone,
   and every one of them a sandbox — no session, no checkout, no live data.

   NOIR: background #000, no borders, no shadows, square corners, uppercase
   headings. Separation is surface tone only (noir-design surface ladder).
   ============================================================ */
import { Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export const DEMO_TABS = [
  { to: '/demo/tour', label: 'Customer site', note: 'Guided walkthrough' },
  { to: '/demo/dashboard', label: 'Owner dashboard', note: 'Sample data' },
  { to: '/demo/affiliate', label: 'Affiliate dashboard', note: 'Sample data' },
] as const;

export function DemoHead({ title, description }: { title: string; description: string }) {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {/* The sandbox must never compete with the real site in search. The
          demo index at /demos stays indexable; these fabricated-data screens
          do not. */}
      <meta name="robots" content="noindex,nofollow" />
    </Helmet>
  );
}

/** The strip that says, in plain words, that nothing here is real or wired up. */
export function DemoBanner({ text }: { text: string }) {
  return (
    <div className="w-full bg-white text-black" style={{ borderRadius: 0 }}>
      <div className="max-w-6xl mx-auto px-5 py-2">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-left">
          Demo sandbox — {text}
        </p>
      </div>
    </div>
  );
}

export function DemoTabs() {
  const { pathname } = useLocation();
  return (
    <div className="w-full bg-[#0a0a0a]" style={{ borderRadius: 0 }}>
      <div className="max-w-6xl mx-auto px-5 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          to="/demos"
          className="text-[10px] font-black uppercase tracking-[0.26em] text-white/45 hover:text-white transition-colors"
        >
          &larr; All demos
        </Link>

        <nav className="flex flex-wrap gap-2">
          {DEMO_TABS.map((t) => {
            const active = pathname === t.to;
            return (
              <Link
                key={t.to}
                to={t.to}
                style={{ borderRadius: 0 }}
                className={
                  'px-3 py-2 transition-colors ' +
                  (active
                    ? 'bg-white text-black'
                    : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white')
                }
              >
                <span className="block text-[11px] font-black uppercase tracking-[0.14em] text-left">
                  {t.label}
                </span>
                <span
                  className={
                    'block text-[9px] uppercase tracking-[0.14em] mt-0.5 text-left ' +
                    (active ? 'text-black/55' : 'text-white/35')
                  }
                >
                  {t.note}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

/** Wraps a demo screen: banner, switcher, then the screen itself. */
export function DemoShell({
  banner,
  children,
}: {
  banner: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black text-white" style={{ borderRadius: 0 }}>
      <DemoBanner text={banner} />
      <DemoTabs />
      {children}
      <div className="max-w-6xl mx-auto px-5 pb-16 pt-10">
        <p className="text-[11px] leading-relaxed text-white/40 text-left max-w-[70ch]">
          Every name, address, figure and chart in this sandbox is generated in your browser
          when the page loads, so it is different on every visit and matches nothing in the
          real platform. No account is signed in here, nothing can be purchased, and nothing
          you press is saved anywhere.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------- UI atoms -------------------------------- */

export function Panel({
  children,
  className = '',
  tone = 'subtle',
}: {
  children: React.ReactNode;
  className?: string;
  tone?: 'subtle' | 'raised';
}) {
  const bg = tone === 'raised' ? 'bg-[#0a0a0a]' : 'bg-white/5';
  return (
    <div className={`${bg} p-5 ${className}`} style={{ borderRadius: 0 }}>
      {children}
    </div>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[9.5px] font-black uppercase tracking-[0.24em] text-white/40 text-left">
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
  accent = 'text-white',
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <Panel>
      <Eyebrow>{label}</Eyebrow>
      <div className={`mt-2 text-2xl font-black tabular-nums text-left ${accent}`}>{value}</div>
      {sub && <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/35 text-left">{sub}</div>}
    </Panel>
  );
}
