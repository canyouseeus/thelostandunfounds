import { useState, useEffect } from 'react'

export default function Home() {
  // Debug logging
  if (import.meta.env.DEV) {
    console.log('🏠 Home component rendering...');
  }
  
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
    <div className="app" style={{ minHeight: '100vh', backgroundColor: '#000000', color: '#ffffff' }}>
      <header className="header">
        <div className="logo-container">
          <img src="/logo.png" alt="Logo" className="logo" />
        </div>
        <h1>THE LOST+UNFOUNDS</h1>
      </header>
      <main className="main" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', width: '100%', backgroundColor: '#000000', color: '#ffffff' }}>
        <div className="center-text" style={{ fontSize: '1.5em', fontWeight: 400, letterSpacing: '0.1em', textAlign: 'center', margin: 0, color: '#ffffff', whiteSpace: 'nowrap' }}>
          {displayedText || 'Loading...'}
          <span 
            className="typing-cursor"
            style={{ 
              opacity: showCursor ? 1 : 0,
              transition: 'opacity 0.1s ease-in-out',
              color: '#ffffff',
              fontWeight: 300,
              marginLeft: '2px'
            }}
          >
            |
          </span>
        </div>
      </main>
      <footer className="footer" style={{ padding: '2rem', background: '#000000', color: '#aaaaaa', marginTop: 'auto' }}>
        <p className="info">© {new Date().getFullYear()} THE LOST+UNFOUNDS. All rights reserved.</p>
      </footer>
    </div>
  )
}
