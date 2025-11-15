/**
 * Tools Documentation
 */

export default function Tools() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-4">Tools Guide</h1>
      <p className="text-white/70 mb-8">
        Learn how to use each tool available on THE LOST+UNFOUNDS platform.
      </p>

      <div className="space-y-8">
        {/* TikTok Downloader */}
        <section className="border-b border-white/10 pb-8">
          <h2 className="text-2xl font-bold text-white mb-4">TikTok Downloader</h2>
          <div className="space-y-4">
            <p className="text-white/80">
              Download TikTok videos without watermarks. Simply paste a TikTok URL and download the video.
            </p>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-2">How to Use</h3>
              <ol className="list-decimal list-inside space-y-2 text-white/70">
                <li>Copy the TikTok video URL from the app or website</li>
                <li>Navigate to the TikTok Downloader tool</li>
                <li>Paste the URL into the input field</li>
                <li>Click "Download" and wait for processing</li>
                <li>Download the video file</li>
              </ol>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-2">Limits</h3>
              <ul className="space-y-2 text-white/70">
                <li><strong>Free:</strong> 5 downloads per day</li>
                <li><strong>Premium:</strong> Unlimited downloads</li>
                <li><strong>Pro:</strong> Unlimited downloads + HD quality</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Coming Soon */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-4">More Tools Coming Soon</h2>
          <p className="text-white/70">
            We're constantly adding new tools to help you be more productive. Check back regularly for updates!
          </p>
        </section>
      </div>
    </div>
  );
}


