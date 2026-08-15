import { Link } from 'react-router-dom'
import LanguagePicker from './LanguagePicker'
import { useLanguage } from '../contexts/LanguageContext'

export default function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="relative z-30 bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col md:flex-row items-center justify-center md:justify-between gap-3 text-center md:text-left">
          <div className="order-2 md:order-1 text-white text-xs sm:text-sm font-bold">
            © {new Date().getFullYear()} <strong className="font-bold whitespace-nowrap">THE LOST+UNFOUNDS</strong>. {t('footer.rights')}
          </div>
          <div className="order-1 md:order-2 flex flex-wrap justify-center md:justify-end items-center gap-4 text-xs sm:text-sm">
            <Link
              to="/privacy"
              className="text-white/60 hover:!text-white transition-colors"
            >
              {t('footer.privacy')}
            </Link>
            <Link
              to="/terms"
              className="text-white/60 hover:!text-white transition-colors"
            >
              {t('footer.terms')}
            </Link>
            {/* The Lost Archives is the publication's own name — it stays in
                English in every locale, like THE LOST+UNFOUNDS itself. */}
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
              {t('footer.about')}
            </Link>
            <Link
              to="/contact"
              className="text-white/60 hover:!text-white transition-colors"
            >
              {t('footer.contact')}
            </Link>
            <Link
              to="/support"
              className="text-white/60 hover:!text-white transition-colors"
            >
              {t('footer.support')}
            </Link>
            <Link
              to="/advertise"
              className="text-white/60 hover:!text-white transition-colors"
            >
              {t('footer.advertise')}
            </Link>
            <Link
              to="/become-affiliate"
              className="text-white/60 hover:!text-white transition-colors"
            >
              {t('footer.affiliates')}
            </Link>
            {/* Site-wide entry point to checkout. /shop is admin-gated, so this
                is the only route by which a visitor can pay anything. */}
            <Link
              to="/pay"
              className="text-white hover:!text-white/60 transition-colors font-bold"
            >
              {t('footer.pay')}
            </Link>
            {/* The header hamburger only renders for signed-in users, so this is
                the language control a logged-out visitor actually reaches. */}
            <LanguagePicker variant="footer" />
          </div>
        </div>
      </div>
    </footer>
  )
}
