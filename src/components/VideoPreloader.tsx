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

    // Set all attributes for autoplay - do this immediately
    video.muted = true
    video.volume = 0
    video.controls = false
    video.setAttribute('muted', '')
    video.setAttribute('autoplay', '')
    video.setAttribute('playsinline', '')
    video.setAttribute('preload', 'auto')
    video.removeAttribute('controls')

    // Hide controls
    video.style.setProperty('-webkit-media-controls', 'none', 'important')

    // MutationObserver to hide play button as soon as browsers add it
    const hidePlayButtons = () => {
      // Hide any play buttons browsers add
      const buttons = document.querySelectorAll('button, [role="button"], [aria-label*="Play"], [aria-label*="play"], [class*="play"]')
      buttons.forEach(btn => {
        const el = btn as HTMLElement
        if (el.closest('.video-container') || el.closest('.video-preloader') || el.closest('video')) {
          el.style.display = 'none'
          el.style.visibility = 'hidden'
          el.style.opacity = '0'
          el.style.pointerEvents = 'none'
          el.style.width = '0'
          el.style.height = '0'
        }
      })
    }

    const observer = new MutationObserver(() => {
      hidePlayButtons()
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    })

    // Hide immediately and continuously
    hidePlayButtons()
    const hideInterval = setInterval(hidePlayButtons, 50)

    const playVideo = async () => {
      if (video.paused) {
        try {
          video.muted = true
          video.volume = 0
          await video.play()
          hidePlayButtons()
        } catch (error) {
          // Keep trying
        }
      }
    }

    const handleEnded = () => {
      observer.disconnect()
      clearInterval(hideInterval)
      onComplete()
    }

    const handleCanPlay = () => {
      playVideo()
      hidePlayButtons()
    }

    const handleLoadedData = () => {
      playVideo()
      hidePlayButtons()
    }

    const handlePlay = () => {
      hidePlayButtons()
    }

    video.addEventListener('ended', handleEnded)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('loadeddata', handleLoadedData)
    video.addEventListener('play', handlePlay)

    // Don't call load() - let autoplay work naturally
    // Try to play immediately
    playVideo()

    // Try multiple times
    setTimeout(() => playVideo(), 50)
    setTimeout(() => playVideo(), 100)
    setTimeout(() => playVideo(), 200)
    setTimeout(() => playVideo(), 500)

    return () => {
      observer.disconnect()
      clearInterval(hideInterval)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('loadeddata', handleLoadedData)
      video.removeEventListener('play', handlePlay)
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
