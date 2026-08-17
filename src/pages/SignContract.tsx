/**
 * Public contract signing page: /sign/:token
 *
 * The token in the URL is the entire credential, so this page never asks for
 * a login. It fetches the document, records the view, and takes a signature.
 *
 * Design: Noir: pure black, uppercase headings, square corners, and NO
 * borders or shadows (`no-border-design` is the authority; separation comes
 * from surface tone and spacing alone).
 *
 * One deliberate departure: the signature pad itself is a WHITE surface with
 * BLACK ink. The signed PDF renders on white paper, so a white-ink signature
 * would be invisible in the document the client actually keeps.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'

interface SignerView {
  name: string
  email: string
  role: string
  status: string
  signed_at: string | null
}

interface ContractView {
  id: string
  title: string
  body: string
  status: string
  expires_at: string | null
}

interface OtherSigner {
  name: string
  role: string
  status: string
  sign_order: number
}

type BlockedReason =
  | 'voided' | 'expired' | 'already_signed' | 'declined' | 'awaiting_other_signer' | null

const BLOCKED_COPY: Record<string, { title: string; message: string }> = {
  voided: {
    title: 'DOCUMENT VOIDED',
    message: 'This document has been withdrawn and can no longer be signed. Contact us if you believe this is a mistake.',
  },
  expired: {
    title: 'LINK EXPIRED',
    message: 'This signing link has expired. Reply to the email you received and we will send a fresh one.',
  },
  declined: {
    title: 'DOCUMENT DECLINED',
    message: 'You declined this document. Contact us if you would like it reissued.',
  },
  awaiting_other_signer: {
    title: 'AWAITING ANOTHER SIGNER',
    message: 'Another party needs to sign before you. We will email you the moment it is your turn.',
  },
}

export default function SignContract() {
  const { token } = useParams<{ token: string }>()

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [contract, setContract] = useState<ContractView | null>(null)
  const [signer, setSigner] = useState<SignerView | null>(null)
  const [others, setOthers] = useState<OtherSigner[]>([])
  const [blocked, setBlocked] = useState<BlockedReason>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

  const [mode, setMode] = useState<'draw' | 'type'>('draw')
  const [typedName, setTypedName] = useState('')
  const [consent, setConsent] = useState(false)
  const [agreedRead, setAgreedRead] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const [declining, setDeclining] = useState(false)
  const [declineReason, setDeclineReason] = useState('')

  // ── Signature pad ─────────────────────────────────────────────────────────
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)
  const [hasSig, setHasSig] = useState(false)

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      const t = e.touches[0]
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY }
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    drawing.current = true
    lastPos.current = getPos(e, canvas)
  }, [])

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (!drawing.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const pos = getPos(e, canvas)
    if (lastPos.current) {
      ctx.beginPath()
      // Black ink: the PDF this ends up in is printed on white.
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.moveTo(lastPos.current.x, lastPos.current.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
      setHasSig(true)
    }
    lastPos.current = pos
  }, [])

  const endDraw = useCallback(() => {
    drawing.current = false
    lastPos.current = null
  }, [])

  const clearSig = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx?.clearRect(0, 0, canvas.width, canvas.height)
    setHasSig(false)
  }, [])

  /**
   * Flatten the transparent canvas onto opaque white before export. A PNG with
   * an alpha channel renders as a black box in some PDF viewers, which would
   * blot out the signature line.
   */
  const exportSignature = (): string | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const out = document.createElement('canvas')
    out.width = canvas.width
    out.height = canvas.height
    const ctx = out.getContext('2d')
    if (!ctx) return null
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, out.width, out.height)
    ctx.drawImage(canvas, 0, 0)
    return out.toDataURL('image/png')
  }

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    if (!token) {
      setLoadError('This signing link is not valid.')
      setLoading(false)
      return
    }

    ;(async () => {
      try {
        const res = await fetch(`/api/contracts/sign?token=${encodeURIComponent(token)}`)
        const data = await res.json()
        if (cancelled) return
        if (!res.ok) {
          setLoadError(data?.error || 'This signing link is not valid.')
        } else {
          setContract(data.contract)
          setSigner(data.signer)
          setOthers(data.otherSigners || [])
          setBlocked(data.blocked)
          setPdfUrl(data.pdfUrl)
          if (data.signer?.name) setTypedName(data.signer.name)
        }
      } catch {
        if (!cancelled) setLoadError('We could not load this document. Please try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [token])

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSign = async () => {
    setError(null)

    if (!agreedRead) return setError('Please confirm you have read the document.')
    if (!consent) return setError('Please agree to sign electronically.')
    if (mode === 'draw' && !hasSig) return setError('Please draw your signature in the box.')
    if (mode === 'type' && typedName.trim().length < 2) {
      return setError('Please type your full legal name.')
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/contracts/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          signature_type: mode,
          signature_data: mode === 'draw' ? exportSignature() : null,
          typed_name: mode === 'type' ? typedName.trim() : null,
          consent_esign: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || 'We could not record your signature. Please try again.')
      } else {
        setPdfUrl(data.pdfUrl || null)
        setDone(true)
      }
    } catch {
      setError('We could not reach the server. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDecline = async () => {
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/contracts/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, decline: true, reason: declineReason.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) setError(data?.error || 'Could not record your response.')
      else setBlocked('declined')
    } catch {
      setError('We could not reach the server. Please try again.')
    } finally {
      setSubmitting(false)
      setDeclining(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-black text-white px-5 py-16">
      <div className="max-w-3xl mx-auto">{children}</div>
    </div>
  )

  if (loading) {
    return shell(
      <p className="text-white/40 text-xs uppercase tracking-[0.3em] font-bold">Loading document…</p>
    )
  }

  if (loadError) {
    return shell(
      <div className="bg-white/5 p-10" style={{ borderRadius: 0 }}>
        <h1 className="text-2xl font-black uppercase tracking-[0.2em] mb-4">LINK NOT VALID</h1>
        <p className="text-white/60 text-sm leading-relaxed">{loadError}</p>
      </div>
    )
  }

  if (done) {
    return shell(
      <div className="bg-white/5 p-10" style={{ borderRadius: 0 }}>
        <h1 className="text-2xl font-black uppercase tracking-[0.2em] mb-4">SIGNATURE RECORDED</h1>
        <p className="text-white/60 text-sm leading-relaxed mb-8">
          Thank you, {signer?.name}. Your signature on “{contract?.title}” has been recorded and a
          confirmation is on its way to {signer?.email}.
        </p>
        {pdfUrl && (
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
             className="inline-block bg-white text-black px-8 py-4 text-xs font-black uppercase tracking-[0.2em] hover:bg-white/90 transition-colors"
             style={{ borderRadius: 0 }}>
            Download signed PDF
          </a>
        )}
      </div>
    )
  }

  const blockedInfo = blocked && blocked !== 'already_signed' ? BLOCKED_COPY[blocked] : null

  return shell(
    <>
      {/* Masthead */}
      <div className="mb-10">
        <p className="text-[9px] font-black uppercase tracking-[0.5em] text-white/30 mb-3">
          THE LOST+UNFOUNDS
        </p>
        <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-[0.15em] leading-tight">
          {contract?.title}
        </h1>
        {signer && (
          <p className="text-white/40 text-xs mt-4 tracking-wide">
            Prepared for {signer.name} · {signer.email}
          </p>
        )}
      </div>

      {/* Already signed */}
      {blocked === 'already_signed' && (
        <div className="bg-white/5 p-8 mb-8" style={{ borderRadius: 0 }}>
          <h2 className="text-sm font-black uppercase tracking-[0.25em] mb-3">ALREADY SIGNED</h2>
          <p className="text-white/60 text-sm leading-relaxed mb-6">
            You signed this document
            {signer?.signed_at ? ` on ${new Date(signer.signed_at).toLocaleString()}` : ''}.
          </p>
          {pdfUrl && (
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
               className="inline-block bg-white text-black px-8 py-4 text-xs font-black uppercase tracking-[0.2em] hover:bg-white/90 transition-colors"
               style={{ borderRadius: 0 }}>
              Download signed PDF
            </a>
          )}
        </div>
      )}

      {blockedInfo && (
        <div className="bg-white/5 p-8 mb-8" style={{ borderRadius: 0 }}>
          <h2 className="text-sm font-black uppercase tracking-[0.25em] mb-3">{blockedInfo.title}</h2>
          <p className="text-white/60 text-sm leading-relaxed">{blockedInfo.message}</p>
        </div>
      )}

      {/* Document body */}
      <div className="bg-white/5 p-8 sm:p-10 mb-8" style={{ borderRadius: 0 }}>
        {String(contract?.body || '').split(/\n{2,}/).map((block, i) => {
          const text = block.trim()
          if (!text) return null
          if (text.startsWith('## ')) {
            return (
              <h2 key={i} className="text-xs font-black uppercase tracking-[0.25em] text-white mt-8 mb-3 first:mt-0">
                {text.slice(3)}
              </h2>
            )
          }
          return (
            <p key={i} className="text-white/70 text-sm leading-relaxed mb-4 text-left whitespace-pre-wrap">
              {text}
            </p>
          )
        })}
      </div>

      {/* Other parties */}
      {others.length > 0 && (
        <div className="bg-white/5 p-6 mb-8" style={{ borderRadius: 0 }}>
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30 mb-4">
            Other parties
          </p>
          {others.map((o, i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <span className="text-sm text-white/70">{o.name}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                {o.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Signing form */}
      {!blocked && (
        <div className="bg-white/5 p-8 sm:p-10" style={{ borderRadius: 0 }}>
          <h2 className="text-sm font-black uppercase tracking-[0.25em] mb-8">YOUR SIGNATURE</h2>

          {/* Mode toggle */}
          <div className="flex gap-2 mb-6">
            {(['draw', 'type'] as const).map(m => (
              <button key={m} type="button" onClick={() => setMode(m)}
                className={`px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${
                  mode === m ? 'bg-white text-black' : 'bg-white/5 text-white/50 hover:bg-white/10'
                }`}
                style={{ borderRadius: 0 }}>
                {m === 'draw' ? 'Draw it' : 'Type it'}
              </button>
            ))}
          </div>

          {mode === 'draw' ? (
            <div className="mb-6">
              {/* White pad, black ink: matches the printed PDF. */}
              <div className="relative bg-white" style={{ borderRadius: 0 }}>
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={260}
                  className="w-full touch-none cursor-crosshair block"
                  style={{ height: '180px' }}
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={endDraw}
                  onMouseLeave={endDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={endDraw}
                />
                {!hasSig && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="text-black/25 text-xs uppercase tracking-[0.3em] font-bold">
                      Sign here
                    </p>
                  </div>
                )}
              </div>
              {hasSig && (
                <button type="button" onClick={clearSig}
                  className="mt-3 text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors">
                  Clear signature
                </button>
              )}
            </div>
          ) : (
            <div className="mb-6">
              <input
                type="text"
                value={typedName}
                onChange={e => setTypedName(e.target.value)}
                placeholder="Your full legal name"
                className="w-full bg-white/5 px-5 py-4 text-lg text-white placeholder-white/25 outline-none focus:bg-white/10 transition-colors"
                style={{ borderRadius: 0, fontFamily: 'Georgia, serif', fontStyle: 'italic' }}
              />
              <p className="text-white/30 text-[10px] mt-3 leading-relaxed">
                Typing your name applies it as your electronic signature.
              </p>
            </div>
          )}

          {/* Consent */}
          <label className="flex items-start gap-3 mb-4 cursor-pointer">
            <input type="checkbox" checked={agreedRead}
              onChange={e => setAgreedRead(e.target.checked)}
              className="mt-1 accent-white" />
            <span className="text-white/60 text-xs leading-relaxed">
              I have read this document in full and agree to its terms.
            </span>
          </label>
          <label className="flex items-start gap-3 mb-8 cursor-pointer">
            <input type="checkbox" checked={consent}
              onChange={e => setConsent(e.target.checked)}
              className="mt-1 accent-white" />
            <span className="text-white/60 text-xs leading-relaxed">
              I agree to sign electronically, and that my electronic signature is the legal
              equivalent of my handwritten signature. My name, email, IP address and the time of
              signing will be recorded.
            </span>
          </label>

          {error && (
            <div className="bg-red-500/10 p-4 mb-6" style={{ borderRadius: 0 }}>
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button type="button" onClick={handleSign} disabled={submitting}
              className="flex-1 bg-white text-black py-4 text-xs font-black uppercase tracking-[0.2em] hover:bg-white/90 disabled:opacity-40 transition-colors"
              style={{ borderRadius: 0 }}>
              {submitting ? 'Recording…' : 'Sign document'}
            </button>
            <button type="button" onClick={() => setDeclining(v => !v)} disabled={submitting}
              className="bg-white/5 text-white/50 px-8 py-4 text-xs font-black uppercase tracking-[0.2em] hover:bg-white/10 disabled:opacity-40 transition-colors"
              style={{ borderRadius: 0 }}>
              Decline
            </button>
          </div>

          {declining && (
            <div className="mt-6 bg-white/5 p-6" style={{ borderRadius: 0 }}>
              <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30 mb-4">
                Decline to sign
              </p>
              <textarea
                value={declineReason}
                onChange={e => setDeclineReason(e.target.value)}
                rows={3}
                placeholder="Optional: let us know why"
                className="w-full bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:bg-white/10 transition-colors mb-4"
                style={{ borderRadius: 0 }}
              />
              <button type="button" onClick={handleDecline} disabled={submitting}
                className="bg-white/10 text-white px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/20 disabled:opacity-40 transition-colors"
                style={{ borderRadius: 0 }}>
                Confirm decline
              </button>
            </div>
          )}
        </div>
      )}

      <p className="text-white/20 text-[10px] text-center mt-10 tracking-wide">
        Secured by THE LOST+UNFOUNDS · thelostandunfounds.com
      </p>
    </>
  )
}
