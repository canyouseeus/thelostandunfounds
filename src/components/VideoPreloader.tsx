import { useState, useEffect, useRef } from 'react'

interface VideoPreloaderProps {
  onComplete: () => void
}

export default function VideoPreloader({ onComplete }: VideoPreloaderProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [useIframe, setUseIframe] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Google Drive video ID
  const videoId = '1q_Kh1AQIvn4frjm0kHZzCHIW3GQY1oGR'
  
  // Priority 1: Try local video file first (download video and place in public/preloader-video.mp4)
  // Priority 2: Try direct video URL (may not work due to CORS)
  // Priority 3: Fallback to iframe embed
  const localVideoUrl = '/preloader-video.mp4'
  const videoUrl = `https://drive.google.com/uc?export=download&id=${videoId}`
  const embedUrl = `https://drive.google.com/file/d/${videoId}/preview`

  // Video duration in seconds - UPDATE THIS based on your actual video length
  const VIDEO_DURATION = 30 // Change this to match your video length

  useEffect(() => {
    if (!useIframe) {
      // Try direct video element first
      const video = videoRef.current
      if (!video) return

      // Try local video first, fallback to Google Drive
      let currentSrc = localVideoUrl
      video.src = currentSrc

      const handleCanPlay = () => {
        setIsLoading(false)
        video.play().catch((error) => {
          console.error('Error playing video:', error)
          // If direct video fails, try iframe
          setUseIframe(true)
        })
      }

      const handleLoadedData = () => {
        setIsLoading(false)
      }

      const handleEnded = () => {
        onComplete()
      }

      const handleError = () => {
        // If local video fails, try Google Drive URL
        if (currentSrc === localVideoUrl) {
          console.log('Local video not found, trying Google Drive...')
          currentSrc = videoUrl
          video.src = currentSrc
          video.load()
        } else {
          // Both failed, try iframe
          console.error('Direct video failed, trying iframe...')
          setUseIframe(true)
        }
      }

      video.addEventListener('canplay', handleCanPlay)
      video.addEventListener('loadeddata', handleLoadedData)
      video.addEventListener('ended', handleEnded)
      video.addEventListener('error', handleError)

      video.load()

      // Timeout fallback
      timeoutRef.current = setTimeout(() => {
        if (isLoading && !useIframe) {
          console.warn('Video loading timeout, trying iframe...')
          setUseIframe(true)
        }
      }, 5000)

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
        video.removeEventListener('canplay', handleCanPlay)
        video.removeEventListener('loadeddata', handleLoadedData)
        video.removeEventListener('ended', handleEnded)
        video.removeEventListener('error', handleError)
      }
    } else {
      // Use iframe fallback
      const iframe = iframeRef.current
      if (iframe) {
        const handleLoad = () => {
          setIsLoading(false)
          // Since we can't detect when iframe video ends, use timeout
          timeoutRef.current = setTimeout(() => {
            onComplete()
          }, VIDEO_DURATION * 1000)
        }

        iframe.addEventListener('load', handleLoad)

        return () => {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
          }
          iframe.removeEventListener('load', handleLoad)
        }
      }
    }
  }, [useIframe, isLoading, onComplete, VIDEO_DURATION, localVideoUrl, videoUrl])

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
        {!useIframe ? (
          <video
            ref={videoRef}
            className="preloader-video"
            playsInline
            muted
            autoPlay
            style={{ display: isLoading ? 'none' : 'block' }}
          />
        ) : (
          <iframe
            ref={iframeRef}
            src={embedUrl}
            className="preloader-video"
            allow="autoplay; encrypted-media"
            allowFullScreen
            style={{ 
              display: isLoading ? 'none' : 'block',
              border: 'none',
              width: '100%',
              height: '100%'
            }}
          />
        )}
      </div>
    </div>
  )
}
