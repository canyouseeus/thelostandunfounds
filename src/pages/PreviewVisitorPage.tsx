/**
 * PREVIEW ONLY — not a production route.
 * Shows exactly what visitors will see when the gallery-homepage branch ships:
 *   • Visitor-mode nav (logo only, no hamburger)
 *   • Gallery / Shop toggle at the top
 *   • Real gallery and shop content below
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { cn } from '../components/ui/utils'
import Gallery from './Gallery'
import Shop from './Shop'

export default function PreviewVisitorPage() {
  const [viewMode, setViewMode] = useState<'gallery' | 'shop'>('gallery')

  return (
    <div className="min-h-screen bg-black flex flex-col">

      {/* Preview banner — sits above everything */}
      <div className="fixed top-0 left-0 w-full h-8 bg-black flex items-center justify-center z-[1000]">
        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30">
          Preview Mode — Visitor Homepage
        </p>
      </div>

      {/* Visitor-mode nav — logo only, no hamburger */}
      <nav className="fixed top-8 left-0 w-full bg-black z-[999]">
        <div className="flex items-center h-16 px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="text-white font-bold text-sm sm:text-lg md:text-xl whitespace-nowrap"
          >
            THE LOST+UNFOUNDS
          </Link>
        </div>
      </nav>

      <main className="pt-24 flex-1">

        {/* Gallery / Shop toggle — same style as the Public / Private tab */}
        <div className="px-4 md:px-8 pt-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex gap-12 border-b border-white/5 pb-2">
              <button
                onClick={() => setViewMode('gallery')}
                className={cn(
                  'text-[10px] font-black uppercase tracking-[0.3em] transition-all relative pb-2',
                  viewMode === 'gallery' ? 'text-white' : 'text-white/30 hover:text-white/60'
                )}
              >
                Gallery
                {viewMode === 'gallery' && (
                  <motion.div
                    layoutId="previewToggleUnderline"
                    className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-white"
                  />
                )}
              </button>
              <button
                onClick={() => setViewMode('shop')}
                className={cn(
                  'text-[10px] font-black uppercase tracking-[0.3em] transition-all relative pb-2',
                  viewMode === 'shop' ? 'text-white' : 'text-white/30 hover:text-white/60'
                )}
              >
                Shop
                {viewMode === 'shop' && (
                  <motion.div
                    layoutId="previewToggleUnderline"
                    className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-white"
                  />
                )}
              </button>
            </div>
          </div>
        </div>

        {viewMode === 'gallery' ? <Gallery /> : <Shop />}

      </main>
    </div>
  )
}
