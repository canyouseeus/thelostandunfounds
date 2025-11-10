import { useEffect, useRef } from 'react'

interface VideoPreloaderProps {
  onComplete: () => void
}

export default function VideoPreloader({ onComplete }: VideoPreloaderProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hasPlayedRef = useRef(false)

  const localVideoUrl = '/preloader-video.mp4'

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Ensure video is muted for autoplay
    video.muted = true
    video.volume = 0

    const playVideo = async () => {
      if (hasPlayedRef.current && !video.paused) return
      
      try {
        video.muted = true
        await video.play()
        hasPlayedRef.current = true
      } catch (error) {
        console.error('Autoplay failed:', error)
      }
    }

    // Try to play on any user interaction
    const handleUserInteraction = () => {
      playVideo()
    }

    // Add event listeners for user interaction
    document.addEventListener('touchstart', handleUserInteraction, { once: true })
    document.addEventListener('click', handleUserInteraction, { once: true })
    document.addEventListener('keydown', handleUserInteraction, { once: true })

    const handleCanPlay = () => {
      playVideo()
    }

    const handleLoadedData = () => {
      playVideo()
    }

    const handleLoadedMetadata = () => {
      playVideo()
    }

    const handleEnded = () => {
      onComplete()
    }

    // Try to play immediately
    if (video.readyState >= 2) {
      playVideo()
    }

    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('loadeddata', handleLoadedData)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('ended', handleEnded)

    // Try playing multiple times with delays
    setTimeout(() => playVideo(), 100)
    setTimeout(() => playVideo(), 500)
    setTimeout(() => playVideo(), 1000)

    return () => {
      document.removeEventListener('touchstart', handleUserInteraction)
      document.removeEventListener('click', handleUserInteraction)
      document.removeEventListener('keydown', handleUserInteraction)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('loadeddata', handleLoadedData)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('ended', handleEnded)
    }
  }, [onComplete])

  return (
    <div 
      className="video-preloader"
      onClick={() => {
        const video = videoRef.current
        if (video && video.paused) {
          video.play()
        }
      }}
    >
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
        />
      </div>
    </div>
  )
}
