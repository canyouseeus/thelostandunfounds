import { useEffect, useRef } from 'react'

interface VideoPreloaderProps {
  onComplete: () => void
}

export default function VideoPreloader({ onComplete }: VideoPreloaderProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  const localVideoUrl = '/preloader-video.mp4'

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Force mute and remove any audio
    video.muted = true
    video.volume = 0
    video.controls = false
    
    // Set attributes
    video.setAttribute('muted', '')
    video.setAttribute('autoplay', '')
    video.setAttribute('playsinline', '')
    video.setAttribute('preload', 'auto')
    video.removeAttribute('controls')

    // Hide controls via CSS
    video.style.setProperty('-webkit-media-controls', 'none', 'important')
    video.style.setProperty('pointer-events', 'auto', 'important')

    // Continuously hide play button overlay
    const hidePlayButton = () => {
      // Hide any play buttons that Safari adds
      const playButtons = document.querySelectorAll('button[aria-label*="Play"], .play-button, [class*="play"]')
      playButtons.forEach(btn => {
        const el = btn as HTMLElement
        el.style.display = 'none'
        el.style.visibility = 'hidden'
        el.style.opacity = '0'
        el.style.pointerEvents = 'none'
      })
      
      // Hide webkit media controls
      const style = document.createElement('style')
      style.textContent = `
        video.preloader-video::-webkit-media-controls-overlay-play-button,
        video.preloader-video::-webkit-media-controls-play-button {
          display: none !important;
          opacity: 0 !important;
          visibility: hidden !important;
          pointer-events: none !important;
          width: 0 !important;
          height: 0 !important;
        }
      `
      document.head.appendChild(style)
    }

    // Run immediately and continuously
    hidePlayButton()
    const hideInterval = setInterval(hidePlayButton, 100)

    const playVideo = async () => {
      if (!video.paused) return
      try {
        video.muted = true
        video.volume = 0
        await video.play()
        // Hide play button after play starts
        hidePlayButton()
      } catch (error) {
        // Try again
        setTimeout(() => {
          video.muted = true
          video.play().catch(() => {})
        }, 100)
      }
    }

    const handleEnded = () => {
      clearInterval(hideInterval)
      onComplete()
    }

    const handleCanPlay = () => {
      playVideo()
      hidePlayButton()
    }

    const handleLoadedData = () => {
      playVideo()
      hidePlayButton()
    }

    video.addEventListener('ended', handleEnded)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('loadeddata', handleLoadedData)

    // Load and try to play
    video.load()
    playVideo()

    // Keep trying
    const intervals = [100, 200, 500, 1000]
    intervals.forEach(delay => {
      setTimeout(() => {
        playVideo()
        hidePlayButton()
      }, delay)
    })

    return () => {
      clearInterval(hideInterval)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('loadeddata', handleLoadedData)
    }
  }, [onComplete])

  return (
    <div className="video-preloader">
      <div className="video-container">
        <video
          ref={videoRef}
          className="preloader-video"
          autoPlay
          muted
          playsInline
          preload="auto"
        >
          <source src={localVideoUrl} type="video/mp4" />
        </video>
        {/* Solid overlay to cover play button */}
        <div 
          className="video-overlay-cover"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'transparent',
            zIndex: 999,
            pointerEvents: 'none'
          }}
        />
      </div>
    </div>
  )
}
