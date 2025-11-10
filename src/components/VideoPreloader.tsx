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

    const playVideo = async () => {
      try {
        await video.play()
      } catch (error) {
        console.error('Error playing video:', error)
        // If autoplay fails, try again after a short delay
        setTimeout(() => {
          video.play().catch(() => {
            // If still fails, proceed to home page
            onComplete()
          })
        }, 100)
      }
    }

    const handleCanPlay = () => {
      playVideo()
    }

    const handleLoadedData = () => {
      playVideo()
    }

    const handleEnded = () => {
      onComplete()
    }

    const handleError = () => {
      // If video fails to load, proceed to home page after a delay
      setTimeout(() => {
        onComplete()
      }, 2000)
    }

    // Try to play immediately if video is already loaded
    if (video.readyState >= 2) {
      playVideo()
    }

    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('loadeddata', handleLoadedData)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('error', handleError)

    // Load and try to play the video
    video.load()
    playVideo()

    return () => {
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('loadeddata', handleLoadedData)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('error', handleError)
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
          controls={false}
        />
      </div>
    </div>
  )
}
