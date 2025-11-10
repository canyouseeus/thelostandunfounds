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

    const playVideo = async () => {
      if (!video.paused) return
      try {
        video.muted = true
        video.volume = 0
        await video.play()
      } catch (error) {
        // Try again
        setTimeout(() => {
          video.muted = true
          video.play().catch(() => {})
        }, 100)
      }
    }

    const handleEnded = () => {
      onComplete()
    }

    const handleCanPlay = () => {
      playVideo()
    }

    const handleLoadedData = () => {
      playVideo()
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
      setTimeout(() => playVideo(), delay)
    })

    return () => {
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
        {/* Canvas overlay to cover play button */}
        <canvas 
          className="video-overlay-canvas" 
          width="1" 
          height="1"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 1
          }}
        />
      </div>
    </div>
  )
}
