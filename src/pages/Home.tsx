import { useState, useEffect } from 'react'

export default function Home() {
  const text = "CAN YOU SEE US?"
  const [displayedText, setDisplayedText] = useState('')
  const [showCursor, setShowCursor] = useState(true)

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
    <div className="app">
      <header className="header">
        <div className="logo-container">
          <img src="/logo.png" alt="Logo" className="logo" />
        </div>
        <h1>THE LOST+UNFOUNDS</h1>
      </header>
      <main className="main">
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
      </main>
      <footer className="footer">
        <p className="info">© {new Date().getFullYear()} THE LOST+UNFOUNDS. All rights reserved.</p>
      </footer>
    </div>
  )
}
