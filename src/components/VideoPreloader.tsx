import { useState, useEffect, useRef } from 'react'

interface VideoPreloaderProps {
  onComplete: () => void
}

export default function VideoPreloader({ onComplete }: VideoPreloaderProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Convert Google Drive share link to direct video URL
  // Try multiple formats for better compatibility
  const videoId = '1q_Kh1AQIvn4frjm0kHZzCHIW3GQY1oGR'
  const videoUrl = `https://drive.google.com/uc?export=view&id=${videoId}`

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleCanPlay = () => {
      setIsLoading(false)
      video.play().catch((error) => {
        console.error('Error playing video:', error)
        // Try to play anyway, some browsers require user interaction
      })
    }

    const handleLoadedData = () => {
      setIsLoading(false)
    }

    const handleEnded = () => {
      onComplete()
    }

    const handleError = () => {
      console.error('Video loading error, trying alternative method...')
      setHasError(true)
      setIsLoading(false)
      // If video fails to load, proceed to home page after a delay
      setTimeout(() => {
        onComplete()
      }, 2000)
    }

    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('loadeddata', handleLoadedData)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('error', handleError)

    // Set video source and try to load
    video.load()

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
        {isLoading && !hasError && (
          <div className="video-loading">
            <div className="loading-spinner"></div>
          </div>
        )}
        {hasError && (
          <div className="video-error">
            <p>Loading video...</p>
          </div>
        )}
        <video
          ref={videoRef}
          src={videoUrl}
          className="preloader-video"
          playsInline
          muted
          autoPlay
          style={{ display: isLoading ? 'none' : 'block' }}
        />
      </div>
    </div>
  )
}
