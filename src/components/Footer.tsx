import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="relative z-30 bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col md:flex-row items-center justify-center md:justify-between gap-3 text-center md:text-left">
          <div className="order-2 md:order-1 text-white text-xs sm:text-sm font-bold">
            © {new Date().getFullYear()} <strong className="font-bold whitespace-nowrap">THE LOST+UNFOUNDS</strong>. All rights reserved.
          </div>
          <div className="order-1 md:order-2 flex flex-wrap justify-center md:justify-end items-center gap-4 text-xs sm:text-sm">
            <Link
              to="/privacy"
              className="text-white/60 hover:!text-white transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms"
              className="text-white/60 hover:!text-white transition-colors"
            >
              Terms of Use
            </Link>
            <Link
              to="/thelostarchives"
              className="text-white/60 hover:!text-white transition-colors"
            >
              The Lost Archives
            </Link>
            <Link
              to="/about"
              className="text-white/60 hover:!text-white transition-colors"
            >
              About
            </Link>
            <Link
              to="/contact"
              className="text-white/60 hover:!text-white transition-colors"
            >
              Contact
            </Link>
            <Link
              to="/support"
              className="text-white/60 hover:!text-white transition-colors"
            >
              Support
            </Link>
            {/* Services and Capabilities were in the sitemap and pre-rendered but
                linked from nowhere on the site, so Ahrefs reported them as orphan
                pages. The nav's SERVICES tab points at /?view=services — homepage
                state, not the real URL — so the footer is what actually gives
                these pages an inbound link. */}
            <Link
              to="/services"
              className="text-white/60 hover:!text-white transition-colors"
            >
              Services
            </Link>
            <Link
              to="/capabilities"
              className="text-white/60 hover:!text-white transition-colors"
            >
              Capabilities
            </Link>
            <Link
              to="/advertise"
              className="text-white/60 hover:!text-white transition-colors"
            >
              Advertise
            </Link>
            <Link
              to="/become-affiliate"
              className="text-white/60 hover:!text-white transition-colors"
            >
              Affiliates
            </Link>
            {/* Site-wide entry point to checkout. /shop is admin-gated, so this
                is the only route by which a visitor can pay anything. */}
            <Link
              to="/pay"
              className="text-white hover:!text-white/60 transition-colors font-bold"
            >
              Pay
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
