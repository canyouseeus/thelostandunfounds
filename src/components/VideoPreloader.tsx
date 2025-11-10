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

    // Ensure video is muted and set all attributes
    video.muted = true
    video.volume = 0
    video.controls = false
    video.setAttribute('muted', 'true')
    video.setAttribute('autoplay', 'true')
    video.setAttribute('playsinline', 'true')
    video.setAttribute('preload', 'auto')

    const playVideo = async () => {
      if (video.paused) {
        try {
          video.muted = true
          await video.play()
        } catch (error) {
          // Silently fail and try again later
        }
      }
    }

    const handleEnded = () => {
      onComplete()
    }

    const handleCanPlayThrough = () => {
      playVideo()
    }

    const handleLoadedData = () => {
      playVideo()
    }

    const handleLoadedMetadata = () => {
      playVideo()
    }

    // Load the video first
    video.load()

    video.addEventListener('ended', handleEnded)
    video.addEventListener('canplaythrough', handleCanPlayThrough)
    video.addEventListener('loadeddata', handleLoadedData)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)

    // Try to play after video is loaded
    const tryPlay = () => {
      if (video.readyState >= 3) {
        playVideo()
      } else {
        setTimeout(tryPlay, 100)
      }
    }

    tryPlay()

    return () => {
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('canplaythrough', handleCanPlayThrough)
      video.removeEventListener('loadeddata', handleLoadedData)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
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
