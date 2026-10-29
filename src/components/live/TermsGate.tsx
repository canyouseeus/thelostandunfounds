/**
 * The agreement in front of every photographer upload.
 *
 * Nothing here is the gate itself — the server refuses uploads until an
 * agreement is on record (lib/api-handlers/_terms.ts). This collects it: the
 * rules that matter most, in plain words, a link to the full terms, and a box
 * that has to be ticked before AGREE does anything.
 *
 * `onAgree` sends the agreement; the version it agrees to comes from the
 * server, so a tab left open across a terms change cannot agree to old terms.
 *
 * Noir: black, uppercase, square, no borders and no shadows.
 */

import { useState } from 'react'

export default function TermsGate({ onAgree, askName = false }: {
  /** Receives the name typed in, when askName is on. */
  onAgree: (name?: string) => Promise<void>
  /** Upload links have no account behind them, so the agreement needs a name on it. */
  askName?: boolean
}) {
  const [checked, setChecked] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function agree() {
    setBusy(true)
    setError(null)
    try {
      await onAgree(askName ? name.trim() : undefined)
    } catch (err: any) {
      setError(err?.message || 'Could not record your agreement. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div data-tour="pg-terms" className="bg-black p-5 text-left" style={{ borderRadius: 0 }}>
      <h3 className="text-xs font-black uppercase tracking-[0.25em] mb-3">BEFORE YOU UPLOAD</h3>
      <p className="text-sm text-white/70 mb-3">
        Everything you send goes on a public site. Never upload:
      </p>
      <ul className="list-disc list-outside ml-5 space-y-1 text-sm text-white/70 mb-4">
        <li>Any nudity or sexual content involving anyone under 18</li>
        <li>Porn or sex acts, real or simulated</li>
        <li>Adult nudity without the person's signed consent and a checked ID showing they're 18+</li>
        <li>Violence, gore, abuse, harassment, hate or threats</li>
        <li>Photos of anyone taken or shared without their consent, or in a private setting</li>
        <li>Drug use, weapons used to threaten, or anything else illegal</li>
        <li>Work that is not yours or that you do not have the rights to</li>
      </ul>
      <p className="text-sm text-white/70 mb-4">
        Breaking these rules gets the content deleted, your access removed permanently, and
        illegal material reported to law enforcement. We may edit, hide or delete any upload at any time.
      </p>

      {askName && (
        <input className="w-full bg-white/5 text-white px-4 py-3 text-sm focus:outline-none focus:bg-white/10 mb-4"
          style={{ borderRadius: 0 }} placeholder="Your full name" autoComplete="name"
          value={name} onChange={e => setName(e.target.value)} />
      )}

      <label data-tour="pg-terms-agree" className="flex items-start gap-3 text-sm text-white/80 cursor-pointer mb-4">
        <input type="checkbox" className="mt-1 accent-white" checked={checked}
          onChange={e => setChecked(e.target.checked)} />
        <span>
          I have read and agree to the{' '}
          <a href="/terms/photographers" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-white">
            Photographer Terms
          </a>
          , and I am responsible for everything I upload.
        </span>
      </label>

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      <button data-tour="pg-terms-continue" type="button" disabled={!checked || busy || (askName && name.trim().length < 2)} onClick={agree}
        className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-colors disabled:opacity-40 bg-white text-black hover:bg-white/10 hover:text-white"
        style={{ borderRadius: 0 }}>
        {busy ? 'Saving…' : 'Agree and continue'}
      </button>
    </div>
  )
}
