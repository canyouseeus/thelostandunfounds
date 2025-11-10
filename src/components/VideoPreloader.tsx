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

    // Ensure video is muted (required for autoplay)
    video.muted = true
    video.setAttribute('muted', 'true')

    const handleEnded = () => {
      onComplete()
    }

    video.addEventListener('ended', handleEnded)

    // Try to play on any user interaction
    const handleInteraction = () => {
      if (video.paused) {
        video.play().catch(() => {})
      }
    }

    document.addEventListener('click', handleInteraction, { once: true })
    document.addEventListener('touchstart', handleInteraction, { once: true })

    return () => {
      video.removeEventListener('ended', handleEnded)
      document.removeEventListener('click', handleInteraction)
      document.removeEventListener('touchstart', handleInteraction)
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
      <div className="video-container" onClick={handleClick}>
        <video
          ref={videoRef}
          className="preloader-video"
          autoPlay
          muted
          playsInline
          preload="auto"
          onClick={handleClick}
        >
          <source src={localVideoUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  )
}
