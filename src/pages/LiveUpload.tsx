/**
 * Photographer upload page — /live/upload#<tlu_live_ key>
 *
 * The link the owner hands a photographer for an event. It needs no account:
 * the key in the URL is the credential, and all it can do is drop photos into
 * one gallery's review inbox. Nothing sent here is public until the owner
 * publishes it from /admin/live.
 *
 * The key rides in the fragment, not the path or query, so it never reaches a
 * server log or a Referer header.
 *
 * Noir: black, uppercase, square, no borders and no shadows.
 */

import { useEffect, useState } from 'react'
import LiveUploader from '../components/live/LiveUploader'

const KEY_PATTERN = /^tlu_live_[A-Za-z0-9_-]{20,}$/

export default function LiveUpload() {
  const [key] = useState(() => decodeURIComponent(window.location.hash.replace(/^#/, '')).trim())
  const [gallery, setGallery] = useState<{ name: string; live: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!KEY_PATTERN.test(key)) {
      setError('This upload link is incomplete. Ask for a new one.')
      return
    }
    fetch('/api/gallery/ingest-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: '{}',
    })
      .then(async res => {
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.error || 'This upload link is not valid.')
        setGallery({ name: json.name, live: json.live })
      })
      .catch(err => setError(err.message))
  }, [key])

  return (
    <div className="min-h-screen bg-black text-white px-5 pt-12 pb-24">
      <div className="max-w-2xl mx-auto text-left">
        <h1 className="text-3xl font-black uppercase tracking-[0.2em] mb-2">SEND PHOTOS</h1>

        {error && (
          <div className="bg-red-500/10 p-4 mt-6" style={{ borderRadius: 0 }}>
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {!error && !gallery && <p className="text-xs uppercase tracking-[0.2em] text-white/40 mt-6">Checking link…</p>}

        {gallery && (
          <>
            <p className="text-sm text-white/60 mb-8">
              To <span className="text-white font-bold uppercase tracking-wider">{gallery.name}</span>.
              Photos go to the review inbox first; nothing is public until it's approved.
            </p>

            <div className="bg-white/5 p-6 mb-8" style={{ borderRadius: 0 }}>
              <LiveUploader uploadKey={key} />
            </div>

            <div className="bg-white/5 p-6" style={{ borderRadius: 0 }}>
              <h2 className="text-xs font-black uppercase tracking-[0.25em] mb-4">FROM YOUR CAMERA</h2>
              <ol className="space-y-2 text-sm text-white/60 list-decimal pl-5">
                <li>Turn on your camera's transfer to your phone (Canon Camera Connect, Fujifilm XApp, Nikon SnapBridge, Sony Creators' App).</li>
                <li>Let the shots land in your phone's photos.</li>
                <li>Come back here, tap <span className="text-white">Choose photos</span>, and pick the batch.</li>
              </ol>
              <p className="text-xs text-white/40 mt-4">
                Keep this page bookmarked for the night — the link works until it's turned off.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
