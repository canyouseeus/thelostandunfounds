import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-black/80 backdrop-blur-md border-t border-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-white/60 text-sm">
            © {new Date().getFullYear()} THE LOST+UNFOUNDS. All rights reserved.
          </div>
          <div className="flex items-center gap-6 text-sm">
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
