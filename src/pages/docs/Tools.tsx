/**
 * Tools Documentation
 *
 * The tools are free. The old copy listed per-tier download caps against
 * subscription plans that do not exist.
 */

import { Link } from 'react-router-dom';

export default function Tools() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-4">Tools Guide</h1>
      <p className="text-white/70 mb-8">
        Small utilities we built for ourselves and left open to everyone. They are free, and they
        do not require an account.
      </p>

      <div className="space-y-px">
        <section className="bg-white/5 p-6" style={{ borderRadius: 0 }}>
          <h2 className="text-2xl font-bold text-white mb-4">TikTok Downloader</h2>
          <div className="space-y-4">
            <p className="text-white/80">
              Save a TikTok video you have the right to use — your own posts, or clips you have
              permission to reuse. Paste the URL and download the file.
            </p>
            <div className="bg-white/5 p-4" style={{ borderRadius: 0 }}>
              <h3 className="text-white font-semibold mb-2">How to use it</h3>
              <ol className="list-decimal list-inside space-y-2 text-white/70">
                <li>Copy the video URL from the TikTok app or website</li>
                <li>Open the TikTok Downloader tool</li>
                <li>Paste the URL into the input field</li>
                <li>Click Download and wait for processing</li>
                <li>Save the file</li>
              </ol>
            </div>
            <div className="bg-white/5 p-4" style={{ borderRadius: 0 }}>
              <h3 className="text-white font-semibold mb-2">Fair use</h3>
              <p className="text-white/70">
                Free to use, with rate limiting to keep the service up. Downloaded videos are not
                stored on our servers. You are responsible for holding the rights to anything you
                download and for how you use it.
              </p>
            </div>
            <Link
              to="/tools/tiktok-downloader"
              style={{ borderRadius: 0 }}
              className="inline-block px-4 py-2 bg-white text-black font-semibold hover:bg-white/90 transition"
            >
              Open the tool
            </Link>
          </div>
        </section>

        <section className="bg-white/5 p-6" style={{ borderRadius: 0 }}>
          <h2 className="text-2xl font-bold text-white mb-4">QR Tools</h2>
          <p className="text-white/80">
            Generate a QR code pointing at any URL — used on printed material, signage and event
            handouts.
          </p>
          <Link
            to="/qr"
            style={{ borderRadius: 0 }}
            className="inline-block mt-4 px-4 py-2 bg-white text-black font-semibold hover:bg-white/90 transition"
          >
            Open QR tools
          </Link>
        </section>

        <section className="bg-white/5 p-6" style={{ borderRadius: 0 }}>
          <h2 className="text-2xl font-bold text-white mb-4">More tools</h2>
          <p className="text-white/70">
            Tools get added when we need them. New ones show up on the{' '}
            <Link to="/tools" className="text-white underline">tools dashboard</Link> and in the{' '}
            <Link to="/changelog" className="text-white underline">changelog</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
