import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import AuthModal from '../components/auth/AuthModal'

export default function Home() {
  const text = "CAN YOU SEE US?"
  const [displayedText, setDisplayedText] = useState('')
  const [showCursor, setShowCursor] = useState(true)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    const centerIndex = Math.floor(text.length / 2)
    let leftCount = 0  // Characters added to the left
    let rightCount = 1 // Characters added to the right (start with center char)
    let isRight = true // Start typing to the right first
    let typingComplete = false
    let blinkCount = 0
    
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
        typingComplete = true
        setShowCursor(true) // Ensure cursor is visible when typing completes
      }
    }, 100) // Adjust speed here (milliseconds per character)

    // Cursor blink animation
    const cursorInterval = setInterval(() => {
      if (typingComplete) {
        blinkCount++
        // 3 blinks = 6 state changes (visible->invisible->visible->invisible->visible->invisible)
        if (blinkCount >= 6) {
          setShowCursor(false)
          clearInterval(cursorInterval)
        } else {
          setShowCursor(prev => !prev)
        }
      } else {
        setShowCursor(prev => !prev)
      }
    }, 530)

    return () => {
      clearInterval(typeInterval)
      clearInterval(cursorInterval)
    }
  }, [text])

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          {!user && (
            <div className="mb-28 -mt-16">
              <button
                onClick={() => setAuthModalOpen(true)}
                className="px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition text-lg"
              >
                LOG IN / SIGN UP
              </button>
            </div>
          )}
          <div className="center-text">
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
        </div>
      </main>
      <footer className="py-6 text-center border-t border-white/10">
        <p className="text-white/60 text-sm">
          © {new Date().getFullYear()} THE LOST+UNFOUNDS. All rights reserved.
        </p>
      </footer>
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  )
}
