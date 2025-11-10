import { useEffect, useRef } from 'react'

interface VideoPreloaderProps {
  onComplete: () => void
}

export default function VideoPreloader({ onComplete }: VideoPreloaderProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hasEndedRef = useRef(false)

  const localVideoUrl = '/preloader-video.mp4'

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const playVideo = async () => {
      if (hasEndedRef.current) return
      try {
        await video.play()
      } catch (error) {
        console.error('Error playing video:', error)
        // If autoplay fails, try again after a short delay
        setTimeout(() => {
          if (!hasEndedRef.current) {
            video.play().catch((err) => {
              console.error('Retry play failed:', err)
            })
          }
        }, 100)
      }
    }

    const handleCanPlay = () => {
      if (!hasEndedRef.current) {
        playVideo()
      }
    }

    const handleLoadedData = () => {
      if (!hasEndedRef.current) {
        playVideo()
      }
    }

    const handleEnded = () => {
      if (!hasEndedRef.current) {
        hasEndedRef.current = true
        onComplete()
      }
    }

    const handleError = (e: Event) => {
      const videoEl = e.target as HTMLVideoElement
      console.error('Video error:', {
        error: videoEl.error,
        code: videoEl.error?.code,
        message: videoEl.error?.message
      })
      // Only proceed if it's a fatal error, otherwise let video try to recover
      if (videoEl.error && videoEl.error.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
        setTimeout(() => {
          if (!hasEndedRef.current) {
            hasEndedRef.current = true
            onComplete()
          }
        }, 2000)
      }
    }

    // Try to play immediately if video is already loaded
    if (video.readyState >= 2 && !hasEndedRef.current) {
      playVideo()
    }

    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('loadeddata', handleLoadedData)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('error', handleError)

    // Load the video
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
