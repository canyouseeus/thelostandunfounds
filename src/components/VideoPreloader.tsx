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

    // Hide play button overlay by setting CSS and attributes
    video.style.setProperty('-webkit-media-controls', 'none', 'important')
    video.controls = false
    video.setAttribute('controls', 'false')
    
    // Use MutationObserver to hide any play buttons that get added
    const observer = new MutationObserver(() => {
      const playButtons = video.querySelectorAll('button, [role="button"], .play-button, [class*="play"]')
      playButtons.forEach(btn => {
        const element = btn as HTMLElement
        element.style.display = 'none'
        element.style.visibility = 'hidden'
        element.style.opacity = '0'
      })
    })
    
    observer.observe(video, { childList: true, subtree: true, attributes: true })

    const playVideo = async () => {
      if (hasEndedRef.current) return
      try {
        await video.play()
        // Force hide controls after play starts
        video.controls = false
        video.setAttribute('controls', 'false')
      } catch (error) {
        console.error('Error playing video:', error)
        // If autoplay fails, enable pointer events so user can click
        video.style.setProperty('pointer-events', 'auto', 'important')
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

    // Handle click to play if autoplay fails
    const handleClick = () => {
      if (!hasEndedRef.current && video.paused) {
        playVideo()
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
    video.addEventListener('click', handleClick)

    // Load the video
    video.load()

    return () => {
      observer.disconnect()
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('loadeddata', handleLoadedData)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('error', handleError)
      video.removeEventListener('click', handleClick)
    }
  }, [onComplete])

  return (
    <div 
      className="video-preloader"
      onClick={(e) => {
        const video = videoRef.current
        if (video && video.paused && !hasEndedRef.current) {
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
          controls={false}
          disablePictureInPicture
          disableRemotePlayback
        />
      </div>
    </div>
  )
}
