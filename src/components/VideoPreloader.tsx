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

    // Ensure video is muted for autoplay
    video.muted = true
    video.volume = 0

    const playVideo = async () => {
      try {
        video.muted = true
        await video.play()
      } catch (error) {
        console.error('Autoplay failed:', error)
        // Try multiple times with delays
        setTimeout(() => {
          video.muted = true
          video.play().catch(() => {
            setTimeout(() => {
              video.muted = true
              video.play().catch(() => {})
            }, 500)
          })
        }, 300)
      }
    }

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

    // Also try playing after a short delay
    setTimeout(() => {
      playVideo()
    }, 100)

    return () => {
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('loadeddata', handleLoadedData)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('ended', handleEnded)
    }
  }, [onComplete])

  return (
    <div className="video-preloader">
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
