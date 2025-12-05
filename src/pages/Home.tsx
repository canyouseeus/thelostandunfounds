import { useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { createPortal } from 'react-dom'

export default function Home() {
  useEffect(() => {
    // Create logo element and append to body to escape any stacking contexts
    const logoContainer = document.createElement('div')
    logoContainer.id = 'home-logo-container'
    logoContainer.style.cssText = `
      position: fixed !important;
      left: 50% !important;
      top: 50% !important;
      transform: translate(-50%, -50%) !important;
      z-index: 2147483647 !important;
      pointer-events: none !important;
      opacity: 1 !important;
      will-change: auto !important;
    `
    document.body.appendChild(logoContainer)

    const logoImg = document.createElement('img')
    logoImg.src = '/logo.png'
    logoImg.alt = 'THE LOST+UNFOUNDS Logo'
    logoImg.style.cssText = `
      max-width: min(570px, 80vw) !important;
      width: auto !important;
      height: auto !important;
      opacity: 1 !important;
      filter: none !important;
      mix-blend-mode: normal !important;
      display: block !important;
      visibility: visible !important;
      image-rendering: auto !important;
    `
    logoContainer.appendChild(logoImg)

    return () => {
      if (document.body.contains(logoContainer)) {
        document.body.removeChild(logoContainer)
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
      </div>
    </>
  )
}
