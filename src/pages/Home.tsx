import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-black">
      <nav className="bg-black/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center space-x-2 text-white hover:text-white/80 transition">
              <span className="text-xl font-bold">THE LOST+UNFOUNDS</span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link 
                to="/tools" 
                className="text-white hover:text-white/80 transition"
              >
                Explore Tools
              </Link>
            </div>
          </div>
        </div>
      </nav>
      <main className="pb-6 pt-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-12">
            <h1 className="text-6xl font-bold text-white mb-6">
              THE LOST+UNFOUNDS
            </h1>
            <p className="text-xl text-white/80 mb-8">
              Discover powerful tools and utilities
            </p>
            <Link
              to="/tools"
              className="inline-flex items-center gap-2 bg-white text-black px-8 py-4 rounded-lg font-semibold hover:bg-white/90 transition-colors"
            >
              Explore Tools
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
