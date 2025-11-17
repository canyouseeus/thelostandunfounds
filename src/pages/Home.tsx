import { useState, useEffect } from 'react'
import EmailSignup from '../components/EmailSignup'

export default function Home() {
  const text = "CAN YOU SEE US?"
  const [displayedText, setDisplayedText] = useState('')
  const [showEmailSignup, setShowEmailSignup] = useState(false)
  const [typingComplete, setTypingComplete] = useState(false)
  const [textScale, setTextScale] = useState(1)
  const [textBlur, setTextBlur] = useState(0)
  const [showCursor, setShowCursor] = useState(false) // Start hidden, show when typing starts
  const [logoState, setLogoState] = useState<'fading-in' | 'static' | 'fading-out' | 'hidden'>('fading-in')
  const [logoOpacity, setLogoOpacity] = useState(0)
  const [showTyping, setShowTyping] = useState(false)

  // Logo animation sequence: fade in (3s) -> static (2s) -> fade out (1s)
  useEffect(() => {
    let fadeInIntervalRef: NodeJS.Timeout | null = null
    let fadeOutIntervalRef: NodeJS.Timeout | null = null
    
    // Start fading in - begin at opacity 0
    setLogoOpacity(0)
    setLogoState('fading-in')
    
    // Fade in over 3 seconds
    const fadeInStart = Date.now()
    fadeInIntervalRef = setInterval(() => {
      const elapsed = Date.now() - fadeInStart
      const progress = Math.min(elapsed / 3000, 1)
      setLogoOpacity(progress)
      
      if (progress >= 1) {
        if (fadeInIntervalRef) {
          clearInterval(fadeInIntervalRef)
          fadeInIntervalRef = null
        }
        setLogoState('static')
      }
    }, 16) // ~60fps
    
    // After 3 seconds fade in + 2 seconds static, fade out
    const fadeOutTimer = setTimeout(() => {
      setLogoState('fading-out')
      const fadeOutStart = Date.now()
      fadeOutIntervalRef = setInterval(() => {
        const elapsed = Date.now() - fadeOutStart
        const progress = Math.min(elapsed / 1000, 1)
        setLogoOpacity(1 - progress)
        
        if (progress >= 1) {
          if (fadeOutIntervalRef) {
            clearInterval(fadeOutIntervalRef)
            fadeOutIntervalRef = null
          }
          setLogoState('hidden')
          // Start typing animation after logo fades out + 1.5s delay
          setTimeout(() => {
            setShowTyping(true)
          }, 1500)
        }
      }, 16)
    }, 5000) // 3s fade in + 2s static = 5s total before fade out

    return () => {
      if (fadeInIntervalRef) {
        clearInterval(fadeInIntervalRef)
        fadeInIntervalRef = null
      }
      if (fadeOutIntervalRef) {
        clearInterval(fadeOutIntervalRef)
        fadeOutIntervalRef = null
      }
      clearTimeout(fadeOutTimer)
    }
  }, [])

  // Cursor blink animation - starts when typing begins
  useEffect(() => {
    if (!showTyping) return
    
    let cursorInterval: NodeJS.Timeout | null = null
    
    setShowCursor(true) // Show cursor when typing starts
    cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev)
    }, 530)

    return () => {
      if (cursorInterval) {
        clearInterval(cursorInterval)
      }
    }
  }, [showTyping])

  // Start typing animation when showTyping becomes true
  useEffect(() => {
    if (!showTyping) return

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
        setTypingComplete(true)
      }
    }, 100) // Adjust speed here (milliseconds per character)

    return () => {
      clearInterval(typeInterval)
    }
  }, [showTyping, text])

  // Show email signup after typing completes
  useEffect(() => {
    if (typingComplete) {
      setShowEmailSignup(true)
      // Start growing text and add blur when signup appears
      setTextBlur(2)
      const growStart = Date.now()
      const growInterval = setInterval(() => {
        const elapsed = Date.now() - growStart
        // Grow continuously - no limit
        const scale = 1 + (elapsed / 10000) * 1
        setTextScale(scale)
      }, 16)
      
      return () => clearInterval(growInterval)
    }
  }, [typingComplete])


  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden">
      <main className="flex-1 flex items-center justify-center relative h-full">
        {/* Background text - grows and blurs behind modals */}
        <div 
          className="center-text fixed"
          style={{
            left: '50%',
            top: '50%',
            transform: `translate(-50%, -50%) scale(${textScale})`,
            filter: `blur(${textBlur}px)`,
            transition: 'transform 0.1s linear, filter 0.5s ease-out',
            zIndex: 1,
            pointerEvents: 'none',
            opacity: typingComplete ? 0.3 : 0,
          }}
        >
          {text}
        </div>

        {/* Foreground content - all centered at same point, sequential animation */}
        <div className="absolute inset-0 z-10">
          {/* Logo - first in sequence */}
          {logoState !== 'hidden' && (
            <div 
              className="fixed"
              style={{
                opacity: logoOpacity,
                transition: logoState === 'static' ? 'opacity 0s' : 'opacity 0.016s linear',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 1000,
              }}
            >
              <img src="/logo.png" alt="THE LOST+UNFOUNDS Logo" className="max-w-[570px] h-auto" style={{ maxWidth: '570px' }} />
            </div>
          )}
          
          {/* Typing text - second in sequence, stays completely fixed */}
          {showTyping && (
            <div 
              className="center-text fixed"
              style={{
                opacity: showEmailSignup ? 0 : 1,
                visibility: showEmailSignup ? 'hidden' : 'visible',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 1001,
                transition: 'opacity 1.5s ease-in-out, visibility 0s linear 1.5s',
                pointerEvents: showEmailSignup ? 'none' : 'auto',
                willChange: 'opacity',
                position: 'fixed',
              }}
            >
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
          )}
          
          {/* Email Signup - third in sequence, fades in at exact same position */}
          <div 
            className="fixed"
            style={{
              opacity: showEmailSignup ? 1 : 0,
              visibility: showEmailSignup ? 'visible' : 'hidden',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: '100%',
              maxWidth: '500px',
              padding: '0 1rem',
              zIndex: 1002,
              transition: 'opacity 1.5s ease-in-out, visibility 0s linear',
              pointerEvents: showEmailSignup ? 'auto' : 'none',
              willChange: 'opacity',
              position: 'fixed',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
            }}
          >
            <EmailSignup />
            {/* Copy text below subscribe modal */}
            <div style={{
              textAlign: 'center',
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '0.875rem',
              lineHeight: '1.5',
            }}>
              Thanks for stopping by. Sign-up for updates and news!
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
