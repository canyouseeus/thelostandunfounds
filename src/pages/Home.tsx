import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ShoppingBag, Wrench, DollarSign } from 'lucide-react'
import EmailSignup from '../components/EmailSignup'

export default function Home() {
  const text = "CAN YOU SEE US?"
  const [displayedText, setDisplayedText] = useState('')
  const [showCursor, setShowCursor] = useState(true)

  useEffect(() => {
    const centerIndex = Math.floor(text.length / 2)
    let leftCount = 0  // Characters added to the left
    let rightCount = 1 // Characters added to the right (start with center char)
    let isRight = true // Start typing to the right first
    
    const typeInterval = setInterval(() => {
      if (isRight && rightCount <= text.length - centerIndex) {
        // Type to the right
        const start = centerIndex - leftCount
        const end = centerIndex + rightCount
        setDisplayedText(text.substring(start, end))
        rightCount++
        isRight = false
      } else if (!isRight && leftCount < centerIndex) {
        // Type to the left
        leftCount++
        const start = centerIndex - leftCount
        const end = centerIndex + rightCount - 1
        setDisplayedText(text.substring(start, end))
        isRight = true
      } else {
        // Animation complete
        clearInterval(typeInterval)
        setDisplayedText(text) // Ensure full text is displayed
      }
    }, 100) // Adjust speed here (milliseconds per character)

    // Cursor blink animation
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev)
    }, 530)

    return () => {
      clearInterval(typeInterval)
      clearInterval(cursorInterval)
    }
  }, [text])

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center w-full max-w-4xl">
          <div className="center-text mb-8">
            {displayedText}
            <span 
              className="typing-cursor"
              style={{ 
                opacity: showCursor ? 1 : 0,
                transition: 'opacity 0.1s ease-in-out'
              }}
            >
              |
            </span>
          </div>
          
          <div className="mt-12 flex justify-center mb-8">
            <EmailSignup />
          </div>

          {/* Navigation Links */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            <Link
              to="/tools"
              className="group bg-black border border-white/10 rounded-lg px-6 py-4 hover:border-white/30 transition-all duration-300 flex flex-col items-center gap-2"
            >
              <Wrench className="w-6 h-6 text-white/60 group-hover:text-white transition-colors" />
              <span className="text-white font-semibold">Explore Tools</span>
              <ArrowRight className="w-4 h-4 text-white/50 group-hover:text-white/80 group-hover:translate-x-1 transition-all" />
            </Link>
            
            <Link
              to="/shop"
              className="group bg-black border border-white/10 rounded-lg px-6 py-4 hover:border-white/30 transition-all duration-300 flex flex-col items-center gap-2"
            >
              <ShoppingBag className="w-6 h-6 text-white/60 group-hover:text-white transition-colors" />
              <span className="text-white font-semibold">Shop</span>
              <ArrowRight className="w-4 h-4 text-white/50 group-hover:text-white/80 group-hover:translate-x-1 transition-all" />
            </Link>
            
            <Link
              to="/pricing"
              className="group bg-black border border-white/10 rounded-lg px-6 py-4 hover:border-white/30 transition-all duration-300 flex flex-col items-center gap-2"
            >
              <DollarSign className="w-6 h-6 text-white/60 group-hover:text-white transition-colors" />
              <span className="text-white font-semibold">Pricing</span>
              <ArrowRight className="w-4 h-4 text-white/50 group-hover:text-white/80 group-hover:translate-x-1 transition-all" />
            </Link>
          </div>
        </div>
      </main>
      <footer className="py-6 text-center border-t border-white/10">
        <p className="text-white/60 text-sm mb-2">
          © {new Date().getFullYear()} THE LOST+UNFOUNDS. All rights reserved.
        </p>
        <Link 
          to="/reset-newsletter" 
          className="text-white/40 hover:text-white/60 text-xs underline transition"
        >
          Reset Newsletter (Admin)
        </Link>
      </footer>
    </div>
  )
}
