import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
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
  const [showReactWarning, setShowReactWarning] = useState(false)

  // Check if animation has started after 30 seconds
  useEffect(() => {
    const warningTimer = setTimeout(() => {
      // Check if animation hasn't progressed at all
      // If logo is still at initial state (fading-in with opacity 0) and no other animation has started,
      // it means React/animations haven't loaded properly
      const animationHasStarted = logoOpacity > 0 || logoState !== 'fading-in' || showTyping || typingComplete
      
      if (!animationHasStarted) {
        setShowReactWarning(true)
        console.error('❌ React animation failed: Animation sequence has not started after 30 seconds. React may not have loaded properly.')
      }
    }, 30000) // 30 seconds

    return () => {
      clearTimeout(warningTimer)
    }
  }, [logoState, logoOpacity, showTyping, typingComplete])

  // Logo animation sequence: fade in (1s) -> static (0.5s) -> fade out (0.33s) - 3x faster
  useEffect(() => {
    let fadeInIntervalRef: NodeJS.Timeout | null = null
    let fadeOutIntervalRef: NodeJS.Timeout | null = null
    
    // Start fading in - begin at opacity 0
    setLogoOpacity(0)
    setLogoState('fading-in')
    
    // Fade in over 1 second (3x faster: 3s / 3 = 1s)
    const fadeInStart = Date.now()
    fadeInIntervalRef = setInterval(() => {
      const elapsed = Date.now() - fadeInStart
      const progress = Math.min(elapsed / 1000, 1)
      setLogoOpacity(progress)
      
      if (progress >= 1) {
        if (fadeInIntervalRef) {
          clearInterval(fadeInIntervalRef)
          fadeInIntervalRef = null
        }
        setLogoOpacity(1) // Ensure it's exactly 1, not just close to it
        setLogoState('static')
      }
    }, 16) // ~60fps
    
    // After 1 second fade in + 0.5 seconds static, fade out (3x faster)
    const fadeOutTimer = setTimeout(() => {
      setLogoState('fading-out')
      const fadeOutStart = Date.now()
      fadeOutIntervalRef = setInterval(() => {
        const elapsed = Date.now() - fadeOutStart
        const progress = Math.min(elapsed / 333, 1) // 1s / 3 = 0.33s
        setLogoOpacity(1 - progress)
        
        if (progress >= 1) {
          if (fadeOutIntervalRef) {
            clearInterval(fadeOutIntervalRef)
            fadeOutIntervalRef = null
          }
          setLogoState('hidden')
          // Start typing animation after logo fades out + 0.5s delay (3x faster: 1.5s / 3 = 0.5s)
          setTimeout(() => {
            setShowTyping(true)
          }, 500)
        }
      }, 16)
    }, 1500) // 1s fade in + 0.5s static = 1.5s total before fade out (3x faster)

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
    }, 33) // 3x faster: 100ms / 3 = ~33ms per character

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
    <>
      <Helmet>
        <title>THE LOST+UNFOUNDS - CAN YOU SEE US?</title>
        <meta name="description" content="CAN YOU SEE US? THE LOST+UNFOUNDS - Revealing findings from the frontier and beyond. Intel from the field on development, AI, and building in the age of information." />
        <meta property="og:title" content="THE LOST+UNFOUNDS - CAN YOU SEE US?" />
        <meta property="og:description" content="Thanks for stopping by. Sign-up for updates and news! Revealing findings from the frontier and beyond." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.thelostandunfounds.com/" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="THE LOST+UNFOUNDS - CAN YOU SEE US?" />
        <meta name="twitter:description" content="Thanks for stopping by. Sign-up for updates and news!" />
      </Helmet>
      <div className="h-screen bg-black flex flex-col overflow-hidden">
      {/* React loading warning - only shown if animation hasn't started after 30 seconds */}
      {showReactWarning && (
        <div 
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[20000] bg-red-900/90 border border-white text-white px-6 py-4 rounded-none shadow-lg"
          style={{ maxWidth: '90%', width: 'auto' }}
        >
          <div className="font-bold mb-2">⚠️ React Loading Warning</div>
          <div className="text-sm">
            Animation sequence has not started after 30 seconds. React may not have loaded properly.
          </div>
        </div>
      )}
      <main className="flex-1 flex items-center justify-center relative h-full">
        {/* Background text - grows and blurs behind modals */}
        <div 
          className="center-text fixed text-base sm:text-2xl md:text-3xl"
          style={{
            left: '50%',
            top: '50%',
            transform: `translate(-50%, -50%) scale(${textScale})`,
            filter: `blur(${textBlur}px)`,
            transition: 'transform 0.1s linear, filter 0.5s ease-out',
            zIndex: 1,
            pointerEvents: 'none',
            opacity: typingComplete ? 0.3 : 0,
            padding: '0 1rem',
            maxWidth: '100vw',
            wordBreak: 'break-word',
            whiteSpace: 'normal',
          }}
        >
          {text}
        </div>

        {/* Foreground content - all centered at same point, sequential animation */}
        <div className="absolute inset-0 z-10 pointer-events-none">
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
                willChange: 'opacity',
              }}
            >
              <img 
                src="/logo.png" 
                alt="THE LOST+UNFOUNDS Logo" 
                className="max-w-[570px] h-auto sm:max-w-[570px] max-w-[80vw] sm:max-w-[570px] logo" 
                style={{ maxWidth: 'min(570px, 80vw)' }} 
              />
            </div>
          )}
          
          {/* Typing text - second in sequence, stays completely fixed */}
          {showTyping && (
            <div 
              className="center-text fixed text-base sm:text-2xl md:text-3xl"
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
                padding: '0 1rem',
                maxWidth: '100vw',
                wordBreak: 'break-word',
                whiteSpace: 'normal',
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
          
          {/* Email Signup - third in sequence, rises up from bottom to center */}
          <div 
            className="fixed"
            style={{
              opacity: showEmailSignup ? 1 : 0,
              visibility: showEmailSignup ? 'visible' : 'hidden',
              left: '50%',
              top: showEmailSignup ? '50%' : '100%',
              transform: showEmailSignup ? 'translate(-50%, -50%)' : 'translate(-50%, 0)',
              width: '100%',
              maxWidth: 'min(500px, 90vw)',
              padding: '0 1rem',
              zIndex: 1002,
              transition: 'opacity 1.5s ease-in-out, transform 1.5s ease-in-out, visibility 0s linear',
              pointerEvents: showEmailSignup ? 'auto' : 'none',
              willChange: 'opacity, transform',
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
              fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
              lineHeight: '1.5',
              padding: '0 0.5rem',
            }}>
              Thanks for stopping by. Sign-up for updates and news!
            </div>
          </div>
        </div>
      </main>
    </div>
    </>
  )
}
