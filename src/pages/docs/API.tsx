/**
 * Developer Access
 *
 * There is no public API. This page used to document api.thelostandunfounds.com/v1,
 * bearer keys generated in account settings, and per-tier rate limits — none of
 * which exist. Saying so plainly is better than publishing an endpoint that
 * returns nothing.
 */

import { Link } from 'react-router-dom';

export default function API() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-4">Developer Access</h1>
      <p className="text-white/70 mb-8">
        <strong className="font-bold text-white">THE LOST+UNFOUNDS</strong> does not currently offer
        a public API. There are no API keys to generate and no published endpoints to call.
      </p>

      <div className="space-y-px">
        <section className="bg-white/5 p-6" style={{ borderRadius: 0 }}>
          <h2 className="text-2xl font-bold text-white mb-3">What exists today</h2>
          <ul className="list-disc list-inside space-y-2 text-white/70">
            <li>The site's own endpoints are internal — authenticated, rate-limited, and not documented for third-party use</li>
            <li>Affiliate tracking works through the links generated in your affiliate dashboard, not through an API</li>
            <li>Client galleries are delivered by invite link and sign-in, not by programmatic access</li>
            <li>The blog is readable as ordinary web pages and is indexed normally</li>
          </ul>
        </section>

        <section className="bg-white/5 p-6" style={{ borderRadius: 0 }}>
          <h2 className="text-2xl font-bold text-white mb-3">Automated access policy</h2>
          <p className="text-white/80">
            Scraping, bulk downloading, or using our content or images to train a machine-learning
            model is not permitted without written consent. See the{' '}
            <Link to="/terms" className="text-white underline">Terms of Service</Link>. Normal
            search-engine crawling within robots.txt is welcome.
          </p>
        </section>

        <section className="bg-white/5 p-6" style={{ borderRadius: 0 }}>
          <h2 className="text-2xl font-bold text-white mb-3">Need an integration?</h2>
          <p className="text-white/80 mb-4">
            We build integrations for client projects — booking flows, galleries, dashboards,
            payment and delivery pipelines. If you need to connect something to the platform, tell
            us what you're building and we'll scope it.
          </p>
          <Link
            to="/contact"
            style={{ borderRadius: 0 }}
            className="inline-block px-4 py-2 bg-white text-black font-semibold hover:bg-white/90 transition"
          >
            Get in touch
          </Link>
        </section>
      </div>

      <p className="text-white/50 text-sm mt-8">
        If a public API ships, it will appear in the{' '}
        <Link to="/changelog" className="text-white underline">changelog</Link> and here.
      </p>
    </div>
  );
}
