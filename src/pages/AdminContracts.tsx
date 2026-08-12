/**
 * Admin contracts console — /admin/contracts
 *
 * Create a contract from a saved template (or free text), send it for
 * signature, and track status. Noir: black, uppercase, square, no borders and
 * no shadows (`no-border-design` is the authority).
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface Template {
  id: string
  name: string
  description: string | null
  body: string
  variables: string[]
}

interface Signer {
  id: string
  name: string
  email: string
  role: string
  sign_order: number
  status: string
  signed_at: string | null
}

interface Contract {
  id: string
  title: string
  status: string
  created_at: string
  sent_at: string | null
  completed_at: string | null
  pdf_token: string | null
  contract_signers: Signer[]
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'DRAFT',
  sent: 'SENT',
  viewed: 'VIEWED',
  signed: 'SIGNED',
  completed: 'COMPLETED',
  declined: 'DECLINED',
  voided: 'VOIDED',
}

/** Status colour. Text-only — no borders, no badges with outlines. */
const STATUS_TONE: Record<string, string> = {
  draft: 'text-white/40',
  sent: 'text-blue-400',
  viewed: 'text-blue-400',
  signed: 'text-green-400',
  completed: 'text-green-400',
  declined: 'text-red-400',
  voided: 'text-white/30',
}

export default function AdminContracts() {
  const { user } = useAuth()
  const adminEmail = user?.email || ''

  const [contracts, setContracts] = useState<Contract[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [bodyText, setBodyText] = useState('')
  const [signerName, setSignerName] = useState('')
  const [signerEmail, setSignerEmail] = useState('')
  const [variables, setVariables] = useState<Record<string, string>>({})

  const api = useCallback(async (action: string, payload: Record<string, unknown> = {}) => {
    const res = await fetch('/api/contracts/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-email': adminEmail },
      body: JSON.stringify({ action, ...payload }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error || `${action} failed`)
    return data
  }, [adminEmail])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [c, t] = await Promise.all([api('list'), api('list_templates')])
      setContracts(c.contracts || [])
      setTemplates(t.templates || [])
    } catch (e: any) {
      setError(e?.message || 'Could not load contracts')
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => { if (adminEmail) load() }, [adminEmail, load])

  const selectedTemplate = useMemo(
    () => templates.find(t => t.id === templateId) || null,
    [templates, templateId]
  )

  // Placeholders come from the chosen template, or from free text as typed.
  const activeVariables = useMemo(() => {
    const source = selectedTemplate?.body || bodyText
    const found: string[] = []
    const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g
    let m: RegExpExecArray | null
    while ((m = re.exec(source)) !== null) if (!found.includes(m[1])) found.push(m[1])
    return found
  }, [selectedTemplate, bodyText])

  const resetForm = () => {
    setTitle(''); setTemplateId(''); setBodyText('')
    setSignerName(''); setSignerEmail(''); setVariables({})
  }

  const handleCreate = async (sendNow: boolean) => {
    setError(null); setNotice(null)
    if (!title.trim()) return setError('Give the contract a title.')
    if (!signerName.trim()) return setError('Add the signer’s name.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signerEmail.trim())) {
      return setError('Add a valid signer email.')
    }
    if (!templateId && !bodyText.trim()) return setError('Choose a template or write the contract.')

    setBusy(true)
    try {
      const created = await api('create', {
        title: title.trim(),
        template_id: templateId || null,
        body: templateId ? null : bodyText,
        variables,
        signers: [{ name: signerName.trim(), email: signerEmail.trim(), role: 'client', sign_order: 1 }],
      })
      if (sendNow) {
        await api('send', { id: created.contract.id })
        setNotice(`Sent to ${signerEmail.trim()}.`)
      } else {
        setNotice('Draft saved.')
      }
      resetForm()
      setCreating(false)
      await load()
    } catch (e: any) {
      setError(e?.message || 'Could not create the contract')
    } finally {
      setBusy(false)
    }
  }

  const act = async (action: string, id: string, extra: Record<string, unknown> = {}) => {
    setError(null); setNotice(null); setBusy(true)
    try {
      await api(action, { id, ...extra })
      setNotice(action === 'void' ? 'Contract voided.' : 'Invitation sent.')
      await load()
    } catch (e: any) {
      setError(e?.message || `Could not ${action}`)
    } finally {
      setBusy(false)
    }
  }

  const field = 'w-full bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:bg-white/10 transition-colors'
  const label = 'block text-[9px] font-black uppercase tracking-[0.4em] text-white/30 mb-2'

  return (
    <div className="min-h-screen bg-black text-white px-5 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-10 gap-4 flex-wrap">
          <h1 className="text-3xl font-black uppercase tracking-[0.2em]">CONTRACTS</h1>
          <button onClick={() => { setCreating(v => !v); setNotice(null); setError(null) }}
            className="bg-white text-black px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/90 transition-colors"
            style={{ borderRadius: 0 }}>
            {creating ? 'Close' : 'New contract'}
          </button>
        </div>

        {notice && (
          <div className="bg-green-500/10 p-4 mb-6" style={{ borderRadius: 0 }}>
            <p className="text-green-400 text-sm">{notice}</p>
          </div>
        )}
        {error && (
          <div className="bg-red-500/10 p-4 mb-6" style={{ borderRadius: 0 }}>
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Create */}
        {creating && (
          <div className="bg-white/5 p-8 mb-10" style={{ borderRadius: 0 }}>
            <h2 className="text-sm font-black uppercase tracking-[0.25em] mb-8">NEW CONTRACT</h2>

            <div className="mb-6">
              <label className={label}>Title</label>
              <input className={field} style={{ borderRadius: 0 }} value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Photography Services Agreement" />
            </div>

            <div className="grid sm:grid-cols-2 gap-6 mb-6">
              <div>
                <label className={label}>Signer name</label>
                <input className={field} style={{ borderRadius: 0 }} value={signerName}
                  onChange={e => setSignerName(e.target.value)} placeholder="Jordan Reyes" />
              </div>
              <div>
                <label className={label}>Signer email</label>
                <input className={field} style={{ borderRadius: 0 }} value={signerEmail}
                  onChange={e => setSignerEmail(e.target.value)} placeholder="jordan@example.com" />
              </div>
            </div>

            <div className="mb-6">
              <label className={label}>Template</label>
              <select className={field} style={{ borderRadius: 0 }} value={templateId}
                onChange={e => { setTemplateId(e.target.value); setVariables({}) }}>
                <option value="">— Write it myself —</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {!templateId && (
              <div className="mb-6">
                <label className={label}>Contract text</label>
                <textarea className={field} style={{ borderRadius: 0 }} rows={12}
                  value={bodyText} onChange={e => setBodyText(e.target.value)}
                  placeholder={'## Scope of work\n\nThe Photographer agrees to…\n\nUse {{placeholders}} for details you fill in per client.'} />
                <p className="text-white/30 text-[10px] mt-2 leading-relaxed">
                  Blank line = new paragraph. Start a line with <code>## </code> for a section heading.
                </p>
              </div>
            )}

            {activeVariables.length > 0 && (
              <div className="mb-6">
                <label className={label}>Fill in the blanks</label>
                <div className="grid sm:grid-cols-2 gap-4">
                  {activeVariables.map(v => (
                    <div key={v}>
                      <p className="text-white/40 text-[10px] uppercase tracking-widest mb-2">{v}</p>
                      <input className={field} style={{ borderRadius: 0 }}
                        value={variables[v] || ''}
                        onChange={e => setVariables(prev => ({ ...prev, [v]: e.target.value }))} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <button onClick={() => handleCreate(true)} disabled={busy}
                className="flex-1 bg-white text-black py-4 text-xs font-black uppercase tracking-[0.2em] hover:bg-white/90 disabled:opacity-40 transition-colors"
                style={{ borderRadius: 0 }}>
                {busy ? 'Working…' : 'Create & send'}
              </button>
              <button onClick={() => handleCreate(false)} disabled={busy}
                className="bg-white/10 text-white px-8 py-4 text-xs font-black uppercase tracking-[0.2em] hover:bg-white/20 disabled:opacity-40 transition-colors"
                style={{ borderRadius: 0 }}>
                Save draft
              </button>
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <p className="text-white/40 text-xs uppercase tracking-[0.3em] font-bold">Loading…</p>
        ) : contracts.length === 0 ? (
          <div className="bg-white/5 p-10" style={{ borderRadius: 0 }}>
            <p className="text-white/40 text-sm">
              No contracts yet. Create one to send your first document for signature.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {contracts.map(c => {
              const signer = c.contract_signers?.[0]
              return (
                <div key={c.id} className="bg-white/5 p-6" style={{ borderRadius: 0 }}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-sm font-black uppercase tracking-[0.15em] mb-2">
                        {c.title}
                      </h3>
                      <p className="text-white/40 text-xs">
                        {signer ? `${signer.name} · ${signer.email}` : 'No signer'}
                      </p>
                      <p className="text-white/25 text-[10px] mt-2 tracking-wide">
                        Created {new Date(c.created_at).toLocaleDateString()}
                        {c.completed_at && ` · Completed ${new Date(c.completed_at).toLocaleDateString()}`}
                      </p>
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-[0.25em] ${STATUS_TONE[c.status] || 'text-white/40'}`}>
                      {STATUS_LABEL[c.status] || c.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-6">
                    {['draft', 'sent', 'viewed'].includes(c.status) && (
                      <button onClick={() => act(c.status === 'draft' ? 'send' : 'resend', c.id)}
                        disabled={busy}
                        className="bg-white/10 px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/20 disabled:opacity-40 transition-colors"
                        style={{ borderRadius: 0 }}>
                        {c.status === 'draft' ? 'Send' : 'Resend'}
                      </button>
                    )}
                    {c.pdf_token && (
                      <a href={`/api/contracts/pdf?id=${c.id}&token=${c.pdf_token}`}
                         target="_blank" rel="noopener noreferrer"
                         className="bg-white/10 px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/20 transition-colors"
                         style={{ borderRadius: 0 }}>
                        View PDF
                      </a>
                    )}
                    {!['voided', 'completed'].includes(c.status) && (
                      <button onClick={() => act('void', c.id)} disabled={busy}
                        className="bg-white/5 text-white/40 px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/10 disabled:opacity-40 transition-colors"
                        style={{ borderRadius: 0 }}>
                        Void
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
