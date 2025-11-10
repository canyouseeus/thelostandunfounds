import { useEffect, useRef } from 'react'

interface VideoPreloaderProps {
  onComplete: () => void
}

export default function VideoPreloader({ onComplete }: VideoPreloaderProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hasEndedRef = useRef(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const localVideoUrl = '/preloader-video.mp4'

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Safety timeout - proceed to home page after 15 seconds if video doesn't play
    timeoutRef.current = setTimeout(() => {
      if (!hasEndedRef.current) {
        console.warn('Video timeout - proceeding to home page')
        hasEndedRef.current = true
        onComplete()
      }
    }, 15000)

    // Hide play button overlay by setting CSS and attributes
    try {
      video.style.setProperty('-webkit-media-controls', 'none', 'important')
      video.controls = false
      video.setAttribute('controls', 'false')
    } catch (e) {
      console.error('Error setting video attributes:', e)
    }
    
    // Use MutationObserver to hide any play buttons that get added
    const observer = new MutationObserver(() => {
      try {
        const playButtons = video.querySelectorAll('button, [role="button"], .play-button, [class*="play"]')
        playButtons.forEach(btn => {
          const element = btn as HTMLElement
          element.style.display = 'none'
          element.style.visibility = 'hidden'
          element.style.opacity = '0'
        })
      } catch (e) {
        // Ignore observer errors
      }
    })
    
    try {
      observer.observe(video, { childList: true, subtree: true, attributes: true })
    } catch (e) {
      console.error('Error setting up observer:', e)
    }

    const playVideo = async () => {
      if (hasEndedRef.current) return
      try {
        await video.play()
        // Clear timeout once video starts playing
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }
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
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }
        onComplete()
      }
    }

    const handleError = (e: Event) => {
      const videoEl = e.target as HTMLVideoElement
      console.error('Video error:', {
        error: videoEl.error,
        code: videoEl.error?.code,
        message: videoEl.error?.message,
        networkState: videoEl.networkState,
        readyState: videoEl.readyState
      })
      
      // If video fails to load, proceed to home page after a short delay
      setTimeout(() => {
        if (!hasEndedRef.current) {
          hasEndedRef.current = true
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
          }
          onComplete()
        }
      }, 2000)
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
    try {
      video.load()
    } catch (e) {
      console.error('Error loading video:', e)
      // If load fails, proceed to home page
      handleError(new Event('error'))
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
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
          video.play().catch(err => {
            console.error('Click play failed:', err)
            // If click play fails, proceed to home page
            if (!hasEndedRef.current) {
              hasEndedRef.current = true
              onComplete()
            }
          })
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
          onError={(e) => {
            console.error('Video onError handler:', e)
            const video = e.currentTarget
            setTimeout(() => {
              if (!hasEndedRef.current) {
                hasEndedRef.current = true
                onComplete()
              }
            }, 2000)
          }}
        />
      </div>
    </div>
  )
}
