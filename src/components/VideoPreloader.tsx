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

    // Ensure video is muted
    video.muted = true
    video.volume = 0
    video.controls = false

    const playVideo = async () => {
      try {
        video.muted = true
        await video.play()
      } catch (error) {
        // Autoplay failed, will wait for user interaction
      }
    }

    const handleEnded = () => {
      onComplete()
    }

    video.addEventListener('ended', handleEnded)

    // Try to play
    playVideo()

    return () => {
      video.removeEventListener('ended', handleEnded)
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
          controls={false}
          onClick={handleClick}
        />
      </div>
    </div>
  )
}
