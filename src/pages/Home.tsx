import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import EmailSignup from '../components/EmailSignup'

export default function Home() {
  const [logoOpacity, setLogoOpacity] = useState(0)
  const [showLogo, setShowLogo] = useState(true)
  const [showSignup, setShowSignup] = useState(false)

  useEffect(() => {
    let fadeInInterval: NodeJS.Timeout | null = null
    let fadeOutInterval: NodeJS.Timeout | null = null
    let fadeOutTimer: NodeJS.Timeout | null = null
    
    // Fade in logo immediately when page loads
    const fadeInStart = Date.now()
    const fadeInDuration = 500 // 0.5 seconds fade in
    
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

    // After fade in (0.5s) + display (3s) = 3.5s total, start fade out
    fadeOutTimer = setTimeout(() => {
      const fadeOutStart = Date.now()
      const fadeOutDuration = 1500 // 1.5 seconds fade out
      
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
          // Show signup form after logo fades out
          setShowSignup(true)
        }
      }, 16)
    }, 3500) // 0.5s fade in + 3s display = 3.5s

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
          
          {/* Email Signup */}
          {showSignup && (
            <div 
              className="flex flex-col items-center"
              style={{
                width: '100%',
                maxWidth: 'min(500px, 90vw)',
                padding: '0 1rem',
                opacity: showSignup ? 1 : 0,
                transition: 'opacity 0.5s ease-in',
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
                marginTop: '1.5rem',
              }}>
                Thanks for stopping by. Sign-up for updates and news!
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  )
}
