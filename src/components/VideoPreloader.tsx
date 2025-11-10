import { useState, useEffect, useRef } from 'react'

interface VideoPreloaderProps {
  onComplete: () => void
}

export default function VideoPreloader({ onComplete }: VideoPreloaderProps) {
  const [isLoading, setIsLoading] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)

  const localVideoUrl = '/preloader-video.mov'

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleCanPlay = () => {
      setIsLoading(false)
      // Try to play the video
      video.play().catch((error) => {
        console.error('Error playing video:', error)
        // If autoplay fails, proceed anyway after a short delay
        setTimeout(() => {
          onComplete()
        }, 2000)
      })
    }

    const handleLoadedData = () => {
      setIsLoading(false)
    }

    const handleEnded = () => {
      onComplete()
    }

    const handleError = (e: Event) => {
      console.error('Video error:', e)
      // If video fails to load, proceed to home page after a delay
      setIsLoading(false)
      setTimeout(() => {
        onComplete()
      }, 2000)
    }

    const handlePlay = () => {
      setIsLoading(false)
    }

    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('loadeddata', handleLoadedData)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('error', handleError)
    video.addEventListener('play', handlePlay)

    // Load the video
    video.load()

    // Fallback timeout - if video doesn't play within 10 seconds, proceed
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.warn('Video loading timeout, proceeding to home page')
        onComplete()
      }
    }, 10000)

    return () => {
      clearTimeout(timeout)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('loadeddata', handleLoadedData)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('error', handleError)
      video.removeEventListener('play', handlePlay)
    }
  }, [isLoading, onComplete])

  return (
    <div className="video-preloader">
      <div className="video-container">
        {isLoading && (
          <div className="video-loading">
            <div className="loading-spinner"></div>
          </div>
        )}
        <video
          ref={videoRef}
          src={localVideoUrl}
          className="preloader-video"
          playsInline
          muted
          autoPlay
          preload="auto"
          onError={(e) => {
            console.error('Video element error:', e)
            console.error('Video src:', localVideoUrl)
          }}
        />
      </div>
    </div>
  )
}
