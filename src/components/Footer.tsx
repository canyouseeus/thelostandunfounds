import { Link } from 'react-router-dom'

/**
 * Footer link groups — customer-facing routes only.
 *
 * Two filters apply, and they are different things:
 *   1. Gated routes are excluded. /shop sits behind an admin gate, so /pay is
 *      the only checkout a visitor can actually reach; it gets its own call to
 *      action rather than being buried in a column.
 *   2. Internal-audience routes are excluded even when technically public —
 *      /king-midas-leaderboard (affiliate program internals) and /docs
 *      (contributor and photographer guides) mean nothing to a customer.
 *      /become-affiliate stays because it is recruitment, aimed outward.
 *
 * SEO (carried forward from the pre-redesign flat footer — do not drop):
 *   /services and /capabilities were in the sitemap and pre-rendered but linked
 *   from nowhere on the site, so Ahrefs reported them as orphan pages. The nav's
 *   SERVICES tab points at /?view=services — homepage state, not the real URL —
 *   so the footer is what actually gives these pages an inbound link. Every
 *   route the old footer linked must keep a link here.
 */
const COLUMNS: { heading: string; links: { to: string; label: string }[] }[] = [
  {
    heading: 'Explore',
    links: [
      { to: '/gallery', label: 'The Gallery' },
      { to: '/thelostarchives', label: 'The Lost Archives' },
      { to: '/events', label: 'Events' },
      { to: '/services', label: 'Services' },
      { to: '/capabilities', label: 'Capabilities' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { to: '/about', label: 'About' },
      { to: '/contact', label: 'Contact' },
      { to: '/advertise', label: 'Advertise' },
      { to: '/support', label: 'Support' },
    ],
  },
  {
    heading: 'Program',
    links: [
      { to: '/become-affiliate', label: 'Affiliate Program' },
      { to: '/king-midas-leaderboard', label: 'King Midas Leaderboard' },
      { to: '/docs', label: 'Documentation' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { to: '/privacy', label: 'Privacy Policy' },
      { to: '/terms', label: 'Terms of Use' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="relative z-30 bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-8">
        {/* Brand + columns */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-6">
          {/* Brand block spans wider so the columns sit to its right on desktop */}
          <div className="col-span-2">
            <img
              src="/logo.png"
              alt="THE LOST+UNFOUNDS"
              className="h-14 w-auto mb-4"
            />
            <p className="text-white/40 text-xs leading-relaxed max-w-[240px] normal-case">
              Austin, TX based editorial and nightlife photography. Revealing
              findings from the frontier and beyond.
            </p>
            {/* Site-wide entry point to checkout. /shop is admin-gated, so this
                is the only route by which a visitor can pay anything. */}
            <Link
              to="/pay"
              className="inline-block mt-5 px-5 py-2.5 bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-white/90 transition-colors"
            >
              Make a Payment
            </Link>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h3 className="text-[9px] font-black uppercase tracking-[0.25em] text-white/30 mb-4">
                {col.heading}
              </h3>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-white/60 hover:text-white transition-colors text-xs"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Baseline */}
        <div className="mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-white/30 text-[10px] uppercase tracking-widest">
            © {new Date().getFullYear()} THE LOST+UNFOUNDS. All rights reserved.
          </p>
          <a
            href="mailto:media@thelostandunfounds.com"
            className="text-white/30 hover:text-white transition-colors text-[10px] uppercase tracking-widest"
          >
            media@thelostandunfounds.com
          </a>
        </div>
      </div>
    </footer>
  )
}
