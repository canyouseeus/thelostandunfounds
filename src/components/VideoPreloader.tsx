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

    // Set all attributes for autoplay
    video.muted = true
    video.volume = 0
    video.controls = false
    video.setAttribute('muted', 'true')
    video.setAttribute('playsinline', 'true')
    video.setAttribute('autoplay', 'true')
    video.setAttribute('preload', 'auto')
    
    // Try to hide controls programmatically
    video.style.setProperty('-webkit-media-controls', 'none', 'important')
    video.style.setProperty('pointer-events', 'auto', 'important')

    const playVideo = async () => {
      try {
        video.muted = true
        await video.play()
      } catch (error) {
        // Will wait for user interaction
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

    // Try to play immediately
    playVideo()

    // Also try after delays
    setTimeout(() => playVideo(), 100)
    setTimeout(() => playVideo(), 500)

    return () => {
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('loadeddata', handleLoadedData)
    }
  }, [onComplete])

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const video = videoRef.current
    if (video && video.paused) {
      video.play().catch(() => {})
    }
  }

  return (
    <div className="video-preloader" onClick={handleClick}>
      <div className="video-container">
        <video
          ref={videoRef}
          src={localVideoUrl}
          className="preloader-video"
          playsInline
          muted
          autoPlay
          preload="auto"
          playsinline
          controls={false}
          onClick={handleClick}
        />
        {/* Transparent overlay to cover play button */}
        <div className="video-overlay" onClick={handleClick} />
      </div>
    </div>
  )
}
