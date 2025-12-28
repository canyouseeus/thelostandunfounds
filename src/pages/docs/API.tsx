/**
 * API Documentation
 */

export default function API() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-4">API Reference</h1>
      <p className="text-white/70 mb-8">
        Integrate <strong className="font-bold text-white">THE LOST+UNFOUNDS</strong> tools into your applications using our REST API.
      </p>

      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-bold text-white mb-4">Authentication</h2>
          <p className="text-white/80 mb-4">
            All API requests require authentication using an API key. You can generate an API key in your account settings.
          </p>
          <div className="bg-black/50 border border-white rounded-none p-4">
            <pre className="text-white/80 text-sm overflow-x-auto">
              {`Authorization: Bearer YOUR_API_KEY`}
            </pre>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">Base URL</h2>
          <div className="bg-black/50 border border-white rounded-none p-4">
            <code className="text-white/80">https://api.thelostandunfounds.com/v1</code>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">Endpoints</h2>

          <div className="space-y-6">
            <div className="border-b border-white pb-6">
              <h3 className="text-xl font-semibold text-white mb-2">Download TikTok Video</h3>
              <div className="bg-black/50 border border-white rounded-none p-4 mb-3">
                <pre className="text-white/80 text-sm overflow-x-auto">
                  {`POST /tiktok/download
Content-Type: application/json

{
  "url": "https://www.tiktok.com/@user/video/1234567890"
}`}
                </pre>
              </div>
              <p className="text-white/70 text-sm mb-2"><strong>Response:</strong></p>
              <div className="bg-black/50 border border-white rounded-none p-4">
                <pre className="text-white/80 text-sm overflow-x-auto">
                  {`{
  "success": true,
  "videoUrl": "https://...",
  "title": "Video Title",
  "author": "@username"
}`}
                </pre>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">Rate Limits</h2>
          <div className="bg-black/50 border border-white rounded-none p-4">
            <ul className="space-y-2 text-white/70">
              <li><strong>Free:</strong> 100 requests per day</li>
              <li><strong>Premium:</strong> 1,000 requests per day</li>
              <li><strong>Pro:</strong> 10,000 requests per day</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">API Keys</h2>
          <p className="text-white/80 mb-4">
            API keys are available for Pro tier subscribers. Generate your API key in your account settings.
          </p>
          <div className="bg-black/50 border border-white rounded-none p-4">
            <p className="text-white/70 text-sm">
              To get started with the API, upgrade to Pro tier and generate your API key from the Settings page.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}


