import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import EmailSignup from '../components/EmailSignup'

export default function Home() {
  const text = "CAN YOU SEE US?"
  const [logoOpacity, setLogoOpacity] = useState(0)
  const [showLogo, setShowLogo] = useState(true)
  const [showTyping, setShowTyping] = useState(false)
  const [displayedText, setDisplayedText] = useState('')
  const [showCursor, setShowCursor] = useState(false)
  const [typingComplete, setTypingComplete] = useState(false)
  const [showSignup, setShowSignup] = useState(false)
  const [textScale, setTextScale] = useState(1)
  const [textBlur, setTextBlur] = useState(0)
  const [headerSignalSent, setHeaderSignalSent] = useState(false)

  useEffect(() => {
    let fadeInInterval: NodeJS.Timeout | null = null
    let fadeOutInterval: NodeJS.Timeout | null = null
    let fadeOutTimer: NodeJS.Timeout | null = null

    // Fade in logo immediately when page loads
    const fadeInStart = Date.now()
    const fadeInDuration = 1000 // 1 second fade in

    fadeInInterval = setInterval(() => {
      const elapsed = Date.now() - fadeInStart
      const progress = Math.min(elapsed / fadeInDuration, 1)
      setLogoOpacity(progress)

      if (progress >= 1) {
        if (fadeInInterval) {
          clearInterval(fadeInInterval)
          fadeInInterval = null
        }
        setLogoOpacity(1)
      }
    }, 16) // ~60fps

    // After fade in (1s) + display (1s) = 2s total, start fade out
    fadeOutTimer = setTimeout(() => {
      const fadeOutStart = Date.now()
      const fadeOutDuration = 1000 // 1 second fade out

      fadeOutInterval = setInterval(() => {
        const elapsed = Date.now() - fadeOutStart
        const progress = Math.min(elapsed / fadeOutDuration, 1)
        setLogoOpacity(1 - progress)

        if (progress >= 1) {
          if (fadeOutInterval) {
            clearInterval(fadeOutInterval)
            fadeOutInterval = null
          }
          setLogoOpacity(0)
          setShowLogo(false)
          // Start typing animation after logo fades out
          setShowTyping(true)
        }
      }, 16)
    }, 2000) // 1s fade in + 1s display = 2s

    return () => {
      if (fadeInInterval) {
        clearInterval(fadeInInterval)
      }
      if (fadeOutInterval) {
        clearInterval(fadeOutInterval)
      }
      if (fadeOutTimer) {
        clearTimeout(fadeOutTimer)
      }
    }
  }, [])

  // Cursor blink animation - starts when typing begins
  useEffect(() => {
    if (!showTyping) return

    let cursorInterval: NodeJS.Timeout | null = null

    setShowCursor(true)
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
    let leftCount = 0
    let rightCount = 1
    let isRight = true

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
        setDisplayedText(text)
        setTypingComplete(true)
        // Hide cursor and start expansion; then show signup shortly after
        setShowCursor(false)
        setTimeout(() => {
          setShowSignup(true)
        }, 500)
      }
    }, 33) // ~33ms per character

    return () => {
      clearInterval(typeInterval)
    }
  }, [showTyping, text])

  // Start growing text and add blur once typing completes (cursor disappears)
  useEffect(() => {
    if (!typingComplete) return

    setTextBlur(2)
    const growStart = Date.now()
    const growInterval = setInterval(() => {
      const elapsed = Date.now() - growStart
      const scale = 1 + (elapsed / 10000) * 1
      setTextScale(scale)
    }, 16)

    return () => clearInterval(growInterval)
  }, [typingComplete])

  // Notify layout to fade header/nav in once the animation finishes
  useEffect(() => {
    if (!showSignup || headerSignalSent) return
    const timer = setTimeout(() => {
      window.dispatchEvent(new CustomEvent('home-animation-complete'))
      setHeaderSignalSent(true)
    }, 800) // allow the signup to finish its entrance
    return () => clearTimeout(timer)
  }, [showSignup, headerSignalSent])

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
        <main className="flex-1 flex flex-col items-center justify-center relative h-full gap-8">
          {/* Logo */}
          {showLogo && (
            <div
              className="flex items-center justify-center"
              style={{
                position: 'fixed',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 10,
              }}
            >
              <img
                src="/logo.png"
                alt="THE LOST+UNFOUNDS Logo"
                style={{
                  maxWidth: 'min(570px, 80vw)',
                  width: 'auto',
                  height: 'auto',
                  opacity: logoOpacity,
                  visibility: showLogo ? 'visible' : 'hidden',
                  display: 'block',
                  filter: 'none',
                  mixBlendMode: 'normal',
                  transition: 'opacity 0.1s linear',
                }}
              />
            </div>
          )}

          {/* Typing text - expands after cursor disappears */}
          {showTyping && (
            <div
              className="center-text fixed text-base sm:text-2xl md:text-3xl"
              style={{
                opacity: typingComplete ? 0.3 : 1,
                left: '50%',
                top: '50%',
                transform: `translate(-50%, -50%) scale(${textScale})`,
                filter: `blur(${textBlur}px)`,
                zIndex: 39,
                transition: 'opacity 1.5s ease-in-out, transform 0.1s linear, filter 0.5s ease-out',
                pointerEvents: 'none',
                willChange: 'opacity',
                position: 'fixed',
                padding: '0 1rem',
                maxWidth: '100vw',
                wordBreak: 'keep-all',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
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

          {/* Email Signup - slides up from bottom */}
          <div
            className="fixed flex flex-col items-center"
            style={{
              opacity: showSignup ? 1 : 0,
              visibility: showSignup ? 'visible' : 'hidden',
              left: '50%',
              top: showSignup ? '50%' : '100%',
              transform: showSignup ? 'translate(-50%, -50%)' : 'translate(-50%, 0)',
              width: '100%',
              maxWidth: 'min(500px, 90vw)',
              padding: '0 1rem',
              zIndex: 40,
              transition: 'opacity 1.5s ease-in-out, transform 1.5s ease-in-out, visibility 0s linear',
              pointerEvents: showSignup ? 'auto' : 'none',
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
        </main>
      </div>
    </>
  )
}
