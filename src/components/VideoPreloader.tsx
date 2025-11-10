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

    // Set all attributes for autoplay
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

    // MutationObserver to hide play button as soon as Safari adds it
    const observer = new MutationObserver((mutations) => {
      // Hide any play buttons or controls Safari adds
      const playButtons = video.querySelectorAll('*')
      playButtons.forEach((el: Element) => {
        const htmlEl = el as HTMLElement
        if (htmlEl.style) {
          const computedStyle = window.getComputedStyle(htmlEl)
          if (computedStyle.cursor === 'pointer' || 
              htmlEl.getAttribute('aria-label')?.toLowerCase().includes('play') ||
              htmlEl.className?.toLowerCase().includes('play')) {
            htmlEl.style.display = 'none'
            htmlEl.style.visibility = 'hidden'
            htmlEl.style.opacity = '0'
            htmlEl.style.pointerEvents = 'none'
          }
        }
      })
    })

    observer.observe(video, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    })

    // Also observe the container for any buttons Safari adds
    const containerObserver = new MutationObserver(() => {
      const buttons = document.querySelectorAll('button, [role="button"], [aria-label*="Play"], [aria-label*="play"]')
      buttons.forEach(btn => {
        const el = btn as HTMLElement
        if (el.closest('.video-container') || el.closest('.video-preloader')) {
          el.style.display = 'none'
          el.style.visibility = 'hidden'
          el.style.opacity = '0'
          el.style.pointerEvents = 'none'
        }
      })
    })

    const container = video.closest('.video-container')
    if (container) {
      containerObserver.observe(container, {
        childList: true,
        subtree: true,
        attributes: true
      })
    }

    const playVideo = async () => {
      if (video.paused) {
        try {
          video.muted = true
          video.volume = 0
          await video.play()
        } catch (error) {
          // Keep trying
        }
      }
    }

    const handleEnded = () => {
      observer.disconnect()
      containerObserver.disconnect()
      onComplete()
    }

    const handleCanPlay = () => {
      playVideo()
    }

    const handleLoadedData = () => {
      playVideo()
    }

    const handlePlay = () => {
      // Hide play button when video starts playing
      const buttons = document.querySelectorAll('button, [role="button"]')
      buttons.forEach(btn => {
        const el = btn as HTMLElement
        if (el.closest('.video-container') || el.closest('.video-preloader')) {
          el.style.display = 'none'
          el.style.visibility = 'hidden'
          el.style.opacity = '0'
        }
      })
    }

    video.addEventListener('ended', handleEnded)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('loadeddata', handleLoadedData)
    video.addEventListener('play', handlePlay)

    // Load and play
    video.load()
    playVideo()

    // Try multiple times
    setTimeout(() => playVideo(), 50)
    setTimeout(() => playVideo(), 100)
    setTimeout(() => playVideo(), 200)
    setTimeout(() => playVideo(), 500)

    return () => {
      observer.disconnect()
      containerObserver.disconnect()
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
