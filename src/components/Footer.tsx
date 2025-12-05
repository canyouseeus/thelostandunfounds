import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="fixed inset-x-0 bottom-0 z-30 bg-black/90 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col md:flex-row items-center justify-center md:justify-between gap-3 text-center md:text-left">
          <div className="order-2 md:order-1 text-white text-xs sm:text-sm font-bold">
            © {new Date().getFullYear()} THE LOST+UNFOUNDS. All rights reserved.
          </div>
          <div className="order-1 md:order-2 flex flex-wrap justify-center md:justify-end items-center gap-4 text-xs sm:text-sm">
            <Link 
              to="/privacy" 
              className="text-white/60 hover:text-white transition-colors"
            >
              Privacy Policy
            </Link>
            <Link 
              to="/terms" 
              className="text-white/60 hover:text-white transition-colors"
            >
              Terms of Use
            </Link>
            <Link 
              to="/about" 
              className="text-white/60 hover:text-white transition-colors"
            >
              About
            </Link>
            <Link 
              to="/contact" 
              className="text-white/60 hover:text-white transition-colors"
            >
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
