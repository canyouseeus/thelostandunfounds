import { useEffect } from 'react'

export default function TikTokDownloader() {
  useEffect(() => {
    // Redirect to the TikTok downloader app
    window.location.href = '/tiktok-downloader/index.html'
  }, [])

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <p className="text-white/80">Loading TikTok Downloader...</p>
        </div>
      </div>
    </div>
  )
}
