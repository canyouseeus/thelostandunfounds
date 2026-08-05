/**
 * DEMO MODE — the overview.
 *
 * Says plainly what is real and what is not, because a demo that is coy about
 * that is worse than no demo. Real photos, real merch, real components, real
 * flows. False numbers, and nothing saves.
 */

import { Link } from 'react-router-dom';

const SURFACES = [
  { to: '/demo/dashboard', title: 'Dashboard', body: 'The four readables — flow, capacity, geography, money. Every card explains where its number comes from.' },
  { to: '/demo/clients', title: 'Clients', body: 'One profile shape for everybody: identity, stage, billing trace, open requests.' },
  { to: '/demo/seo', title: 'SEO', body: 'Ahrefs-shaped metrics with what each one actually tells you.' },
  { to: '/demo/signup', title: 'Signup', body: 'Walk the whole form. Hit save. See the payload that would have been written, then watch it reset.' },
  { to: '/shop?demo=1', title: 'Shop', body: 'The real shop. Add to cart, check out, and the payment stops at authorization.' },
  { to: '/?demo=1', title: 'Gallery', body: 'The real gallery, the real photos. Demo mode follows the ?demo=1 anywhere on the site.' },
];

export default function DemoHome() {
  return (
    <div>
      <h1 className="text-white text-2xl sm:text-4xl font-black uppercase tracking-[0.2em] text-left">
        Demo Mode
      </h1>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 max-w-4xl">
        <div className="bg-white/5 p-6" style={{ borderRadius: 0 }}>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 text-left">
            What is real
          </p>
          <p className="mt-3 text-white/70 text-[13px] leading-relaxed text-left">
            Everything you can see and click. The same photos, the same merch, the same
            components, the same pages. This is not a mockup of the site — it is the site,
            with one flag set. When the real dashboard gets better, this gets better.
          </p>
        </div>
        <div className="bg-white/5 p-6" style={{ borderRadius: 0 }}>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 text-left">
            What is not
          </p>
          <p className="mt-3 text-white/70 text-[13px] leading-relaxed text-left">
            The figures. Revenue, order counts, subscribers, commission — all shifted, so the
            relationships between them hold but the magnitudes are false. And nothing writes:
            every form runs to the end, shows you its payload, and resets.
          </p>
        </div>
      </div>

      <h2 className="mt-14 text-white text-sm font-black uppercase tracking-[0.3em] text-left">
        Where To Go
      </h2>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SURFACES.map(s => (
          <Link
            key={s.to}
            to={s.to}
            className="bg-white/5 hover:bg-white/10 transition-colors p-6 block"
            style={{ borderRadius: 0 }}
          >
            <p className="text-white text-[12px] font-black uppercase tracking-[0.25em] text-left">
              {s.title}
            </p>
            <p className="mt-3 text-white/50 text-[13px] leading-relaxed text-left">{s.body}</p>
          </Link>
        ))}
      </div>

      <p className="mt-14 text-white/25 text-[11px] uppercase tracking-[0.2em] text-left">
        Add ?demo=1 to any page on the site to enter demo mode there
      </p>
    </div>
  );
}
