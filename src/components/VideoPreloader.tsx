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

    // Ensure video is ready to autoplay
    video.muted = true
    video.volume = 0
    video.controls = false

    const handleEnded = () => {
      onComplete()
    }

    const handlePlay = () => {
      // Once playing, ensure no controls show
      video.controls = false
    }

    video.addEventListener('ended', handleEnded)
    video.addEventListener('play', handlePlay)

    // Try to play immediately - don't wait for events
    const playImmediately = async () => {
      try {
        video.muted = true
        await video.play()
      } catch (error) {
        // If autoplay fails, try again immediately
        setTimeout(() => {
          video.muted = true
          video.play().catch(() => {})
        }, 10)
      }
    }

    // Play immediately when component mounts
    playImmediately()

    return () => {
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('play', handlePlay)
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
      </div>
    </div>
  )
}
