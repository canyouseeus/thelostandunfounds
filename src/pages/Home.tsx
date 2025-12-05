import { useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { createPortal } from 'react-dom'

export default function Home() {
  useEffect(() => {
    // Remove any existing logo containers
    const existing = document.getElementById('home-logo-container')
    if (existing) existing.remove()

    // Create logo element and append to body
    const logoContainer = document.createElement('div')
    logoContainer.id = 'home-logo-container'
    logoContainer.style.cssText = 'position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 999999; pointer-events: none; opacity: 1;'
    document.body.appendChild(logoContainer)

    const logoImg = document.createElement('img')
    logoImg.src = '/logo.png'
    logoImg.alt = 'THE LOST+UNFOUNDS Logo'
    logoImg.style.cssText = 'max-width: min(570px, 80vw); width: auto; height: auto; opacity: 1; filter: none; display: block; background: transparent;'
    // Force image to load and check if it has transparency
    logoImg.onload = () => {
      // Ensure no transparency effects
      logoImg.style.opacity = '1'
      logoImg.style.filter = 'none'
    }
    logoContainer.appendChild(logoImg)

    return () => {
      const container = document.getElementById('home-logo-container')
      if (container) container.remove()
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
      <div style={{ height: '100vh', width: '100vw', backgroundColor: '#000000', margin: 0, padding: 0, position: 'fixed', top: 0, left: 0, zIndex: 1 }}>
      </div>
    </>
  )
}
