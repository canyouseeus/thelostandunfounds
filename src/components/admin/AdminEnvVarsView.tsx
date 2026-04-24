import { useState, useEffect, useCallback } from 'react'
import {
  KeyIcon,
  PlusIcon,
  ArrowPathIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'

interface EnvVar {
  id: string
  key: string
  type: 'encrypted' | 'plain' | 'secret' | 'sensitive' | 'system'
  target: string[]
  gitBranch: string | null
  updatedAt: number
  createdAt: number
  masked: string
}

type FormMode = 'create' | 'edit' | null

interface FormState {
  mode: FormMode
  envId?: string
  key: string
  value: string
  target: string[]
  type: 'encrypted' | 'plain'
}

const TARGET_OPTIONS = ['production', 'preview', 'development']

function formatDate(ts: number | undefined) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function targetBadge(targets: string[]) {
  if (!targets?.length) return null
  const colors: Record<string, string> = {
    production: 'bg-green-500/10 text-green-400',
    preview: 'bg-blue-500/10 text-blue-400',
    development: 'bg-yellow-500/10 text-yellow-400',
  }
  return (
    <div className="flex gap-1 flex-wrap">
      {targets.map((t) => (
        <span key={t} className={`px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${colors[t] || 'bg-white/10 text-white/60'}`}>
          {t}
        </span>
      ))}
    </div>
  )
}

export default function AdminEnvVarsView() {
  const [envs, setEnvs] = useState<EnvVar[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>({
    mode: null,
    key: '',
    value: '',
    target: ['production', 'preview', 'development'],
    type: 'encrypted',
  })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [redeploying, setRedeploying] = useState(false)
  const [redeploySuccess, setRedeploySuccess] = useState(false)
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const showStatus = (type: 'success' | 'error', text: string) => {
    setStatusMsg({ type, text })
    setTimeout(() => setStatusMsg(null), 4000)
  }

  const fetchEnvs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch('/api/admin/env-vars')
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Failed to load env vars')
      setEnvs(data.envs || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEnvs()
  }, [fetchEnvs])

  function openCreate() {
    setForm({ mode: 'create', key: '', value: '', target: ['production', 'preview', 'development'], type: 'encrypted' })
  }

  function openEdit(env: EnvVar) {
    setForm({ mode: 'edit', envId: env.id, key: env.key, value: '', target: env.target || ['production'], type: 'encrypted' })
  }

  function closeForm() {
    setForm((f) => ({ ...f, mode: null }))
  }

  function toggleTarget(t: string) {
    setForm((f) => ({
      ...f,
      target: f.target.includes(t) ? f.target.filter((x) => x !== t) : [...f.target, t],
    }))
  }

  async function handleSave() {
    if (!form.key || !form.value) return
    setSaving(true)
    try {
      const body =
        form.mode === 'create'
          ? { action: 'create', key: form.key, value: form.value, target: form.target, type: form.type }
          : { action: 'update', envId: form.envId, value: form.value, target: form.target, type: form.type }

      const r = await fetch('/api/admin/env-vars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Failed to save')
      showStatus('success', form.mode === 'create' ? 'Environment variable created.' : 'Environment variable updated.')
      closeForm()
      await fetchEnvs()
    } catch (e: any) {
      showStatus('error', e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(env: EnvVar) {
    if (!confirm(`Delete ${env.key}? This cannot be undone.`)) return
    setDeletingId(env.id)
    try {
      const r = await fetch('/api/admin/env-vars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', envId: env.id }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Failed to delete')
      showStatus('success', `${env.key} deleted.`)
      await fetchEnvs()
    } catch (e: any) {
      showStatus('error', e.message)
    } finally {
      setDeletingId(null)
    }
  }

  async function handleRedeploy() {
    if (!confirm('Trigger a new production deployment? This will redeploy the latest build with the updated env vars.')) return
    setRedeploying(true)
    setRedeploySuccess(false)
    try {
      const r = await fetch('/api/admin/env-vars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'redeploy' }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Failed to redeploy')
      setRedeploySuccess(true)
      showStatus('success', `Deployment triggered. ID: ${data.deploymentId || '—'}`)
    } catch (e: any) {
      showStatus('error', e.message)
    } finally {
      setRedeploying(false)
    }
  }

  const filtered = searchQuery
    ? envs.filter((e) => e.key.toLowerCase().includes(searchQuery.toLowerCase()))
    : envs

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <KeyIcon className="w-5 h-5 text-white/40" />
          <h3 className="text-base font-black text-white tracking-widest uppercase">Environment Variables</h3>
          <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">{envs.length} vars</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRedeploy}
            disabled={redeploying}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all ${
              redeploySuccess
                ? 'bg-green-500/10 text-green-400'
                : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white'
            } disabled:opacity-40`}
          >
            <CloudArrowUpIcon className="w-3.5 h-3.5" />
            {redeploying ? 'Deploying…' : redeploySuccess ? 'Deployed!' : 'Redeploy'}
          </button>
          <button
            onClick={fetchEnvs}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-40"
          >
            <ArrowPathIcon className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black text-[10px] font-bold uppercase tracking-widest hover:bg-white/90 transition-all"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            Add Var
          </button>
        </div>
      </div>

      {/* Status banner */}
      {statusMsg && (
        <div className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider ${
          statusMsg.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
        }`}>
          {statusMsg.type === 'error' && <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />}
          {statusMsg.type === 'success' && <CheckIcon className="w-4 h-4 shrink-0" />}
          {statusMsg.text}
        </div>
      )}

      {/* Config notice */}
      {!loading && !error && envs.length === 0 && (
        <div className="bg-yellow-500/5 border border-yellow-500/20 px-4 py-3 text-xs text-yellow-400/80">
          <strong className="uppercase tracking-widest">Setup required:</strong> Set{' '}
          <code className="font-mono">VERCEL_API_TOKEN</code> and{' '}
          <code className="font-mono">VERCEL_PROJECT_ID</code> in your Vercel environment to enable this panel.
        </div>
      )}

      {/* Create/Edit form */}
      {form.mode && (
        <div className="bg-white/5 p-5 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-white uppercase tracking-widest">
              {form.mode === 'create' ? 'New Environment Variable' : `Edit ${form.key}`}
            </span>
            <button onClick={closeForm} className="text-white/40 hover:text-white transition-colors">
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>

          {form.mode === 'create' && (
            <div>
              <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Key</label>
              <input
                type="text"
                value={form.key}
                onChange={(e) => setForm((f) => ({ ...f, key: e.target.value.toUpperCase().replace(/\s/g, '_') }))}
                placeholder="MY_API_KEY"
                className="w-full bg-black/40 border border-white/10 text-white text-sm font-mono px-3 py-2 focus:outline-none focus:border-white/30 placeholder:text-white/20"
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">
              Value {form.mode === 'edit' && <span className="normal-case text-white/30">(leave empty to keep current)</span>}
            </label>
            <input
              type="password"
              value={form.value}
              onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
              placeholder={form.mode === 'edit' ? '••••••••  (enter new value to update)' : 'sk-...'}
              className="w-full bg-black/40 border border-white/10 text-white text-sm font-mono px-3 py-2 focus:outline-none focus:border-white/30 placeholder:text-white/20"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Target</label>
            <div className="flex gap-2">
              {TARGET_OPTIONS.map((t) => (
                <button
                  key={t}
                  onClick={() => toggleTarget(t)}
                  className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all ${
                    form.target.includes(t)
                      ? 'bg-white text-black'
                      : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Type</label>
            <div className="flex gap-2">
              {(['encrypted', 'plain'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setForm((f) => ({ ...f, type: t }))}
                  className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all ${
                    form.type === t ? 'bg-white text-black' : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving || !form.key || (form.mode === 'create' && !form.value)}
              className="flex items-center gap-1.5 px-4 py-2 bg-white text-black text-[10px] font-bold uppercase tracking-widest hover:bg-white/90 transition-all disabled:opacity-40"
            >
              <CheckIcon className="w-3.5 h-3.5" />
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={closeForm}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      {envs.length > 5 && (
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter variables…"
          className="w-full bg-white/5 border border-white/10 text-white text-sm font-mono px-3 py-2 focus:outline-none focus:border-white/20 placeholder:text-white/20"
        />
      )}

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 text-red-400 text-xs font-bold uppercase tracking-wider">
          <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-1">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-white/3 animate-pulse" />
          ))}
        </div>
      )}

      {/* Env var list */}
      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-1">
          {filtered.map((env) => (
            <div
              key={env.id}
              className="flex items-center gap-3 px-4 py-3 bg-white/3 hover:bg-white/5 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white font-mono text-xs font-bold truncate">{env.key}</span>
                  <span className="text-white/20 font-mono text-xs shrink-0">=</span>
                  <span className="text-white/30 font-mono text-xs shrink-0">{env.masked}</span>
                </div>
                <div className="flex items-center gap-3">
                  {targetBadge(env.target)}
                  <span className="flex items-center gap-1 text-[9px] text-white/25 uppercase tracking-wider">
                    <ClockIcon className="w-2.5 h-2.5" />
                    {formatDate(env.updatedAt)}
                  </span>
                  <span className="text-[9px] text-white/20 uppercase tracking-wider">{env.type}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  onClick={() => openEdit(env)}
                  className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 transition-all"
                  title="Edit value"
                >
                  <PencilIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(env)}
                  disabled={deletingId === env.id}
                  className="p-1.5 text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40"
                  title="Delete"
                >
                  {deletingId === env.id ? (
                    <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <TrashIcon className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && envs.length > 0 && (
        <p className="text-white/30 text-xs uppercase tracking-wider px-1">No variables match "{searchQuery}"</p>
      )}

      {/* Redeploy note */}
      {envs.length > 0 && (
        <p className="text-white/20 text-[10px] uppercase tracking-wider px-1">
          Changes to environment variables require a redeployment to take effect.
        </p>
      )}
    </div>
  )
}
