// src/components/admin/MarketplaceAccess.jsx
// Dropshipping Marketplace > Access. Two controls:
//   1. the stage: who sees the real marketplace at all
//   2. early access: which stores get it while the stage is "testing"
// Both are server-enforced (_lib/marketplace-gate.js); this is the panel for
// them, so nobody has to edit Firestore by hand or redeploy to flip a switch.
import { useState, useCallback, useEffect } from 'react'
import {
  Lock, FlaskConical, Globe, Search, Loader2, AlertCircle, Check, Store, RefreshCw, Info,
} from 'lucide-react'

async function callAdmin(action, authHeaders, { method = 'GET', body, query = '' } = {}) {
  const res = await fetch(`/api/admin-marketplace?action=${action}${query}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Something went wrong')
  return data
}

const STAGES = [
  {
    id: 'coming_soon',
    label: 'Coming soon',
    Icon: Lock,
    blurb: 'Nobody can use the marketplace. Every vendor sees the coming soon page and the waitlist.',
  },
  {
    id: 'testing',
    label: 'Testing',
    Icon: FlaskConical,
    blurb: 'Only the stores you give early access to below. Everyone else still sees coming soon.',
  },
  {
    id: 'live',
    label: 'Live',
    Icon: Globe,
    blurb: 'Open to every Pro and Premium vendor, suppliers still needing approval.',
  },
]

function Toggle({ on, busy, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={busy}
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${on ? 'bg-green-600' : 'bg-gray-200'}`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${on ? 'translate-x-5' : 'translate-x-0.5'}`}>
        {busy && <Loader2 size={12} className="m-1 animate-spin text-gray-400" />}
      </span>
    </button>
  )
}

function StoreRow({ store, on, busy, onToggle }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gray-50">
        <Store size={13} className="text-gray-500" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2">
          <p className="truncate text-xs font-bold text-gray-900">{store.name || store.email || store.storeId}</p>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-500">{store.plan}</span>
        </div>
        <p className="mt-0.5 truncate text-[11px] text-gray-500">
          {store.email}{store.storeName ? ` · /${store.storeName}` : ''}
        </p>
      </div>
      <Toggle on={on} busy={busy} onChange={(v) => onToggle(store, v)} label={`Early access for ${store.name || store.storeId}`} />
    </div>
  )
}

export default function MarketplaceAccess({ authHeaders }) {
  const [state, setState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingStage, setSavingStage] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const [busyStore, setBusyStore] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setState(await callAdmin('access', authHeaders))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [authHeaders])

  // Deferred, like the waitlist view next door: loading synchronously inside
  // the effect body sets state during render and cascades.
  useEffect(() => {
    const t = setTimeout(() => { load() }, 0)
    return () => clearTimeout(t)
  }, [load])

  const setStage = async (stage) => {
    setSavingStage(stage)
    setError('')
    try {
      await callAdmin('set-stage', authHeaders, { method: 'POST', body: { stage } })
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingStage('')
    }
  }

  const search = async () => {
    const q = query.trim()
    if (q.length < 2) return
    setSearching(true)
    setError('')
    try {
      const data = await callAdmin('find-store', authHeaders, { query: `&q=${encodeURIComponent(q)}` })
      setResults(data.stores || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setSearching(false)
    }
  }

  const toggleTester = async (store, on) => {
    setBusyStore(store.storeId)
    setError('')
    try {
      await callAdmin('set-tester', authHeaders, { method: 'POST', body: { storeId: store.storeId, on } })
      setResults((r) => (r ? r.map((s) => (s.storeId === store.storeId ? { ...s, isTester: on } : s)) : r))
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyStore('')
    }
  }

  if (loading && !state) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-gray-100 bg-white p-12">
        <Loader2 size={18} className="animate-spin text-gray-300" />
      </div>
    )
  }

  const stage = state?.stage || 'coming_soon'
  const testers = state?.testers || []
  const frozen = !!state?.lockedByEnv
  const canSet = state?.canSetStage && !frozen

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-gray-800">Who can use the marketplace</h3>
            <p className="mt-0.5 text-xs text-gray-400">
              Vendors always see the coming soon page and the waitlist. This decides who gets the real thing.
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            aria-label="Refresh"
            className="flex-shrink-0 rounded-xl bg-gray-900 px-3 py-2 text-xs font-bold text-white disabled:bg-gray-200"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {STAGES.map(({ id, label, Icon, blurb }) => {
            const active = stage === id
            return (
              <button
                key={id}
                type="button"
                disabled={!canSet || savingStage !== ''}
                onClick={() => setStage(id)}
                className={`rounded-xl border-2 p-3 text-left transition-all disabled:cursor-not-allowed ${
                  active ? 'border-green-500 bg-green-50/60' : 'border-gray-100 bg-white hover:border-gray-200'
                } ${!canSet ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <Icon size={14} className={active ? 'text-green-600' : 'text-gray-400'} />
                  <span className={`text-xs font-bold ${active ? 'text-green-700' : 'text-gray-700'}`}>{label}</span>
                  {savingStage === id ? (
                    <Loader2 size={12} className="ml-auto animate-spin text-gray-400" />
                  ) : active ? (
                    <Check size={13} className="ml-auto text-green-600" />
                  ) : null}
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-gray-500">{blurb}</p>
              </button>
            )
          })}
        </div>

        {frozen && (
          <p className="mt-3 flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-800">
            <Lock size={13} className="mt-0.5 flex-shrink-0" />
            <span>
              The <code>DROPSHIPPING_STAGE</code> environment variable is set to <strong>{state.lockedByEnv}</strong> in Vercel,
              and it overrides this panel. Remove it there to control the stage from here.
            </span>
          </p>
        )}
        {!frozen && !state?.canSetStage && (
          <p className="mt-3 text-[11px] text-gray-400">Only a super admin can change the stage.</p>
        )}
        <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-gray-400">
          <Info size={12} className="mt-0.5 flex-shrink-0" />
          Server side this takes effect within a minute. Vendors&apos; browsers can take up to an hour, because the public
          config is cached at the edge.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5">
        <h3 className="text-sm font-bold text-gray-800">Early access</h3>
        <p className="mt-0.5 text-xs text-gray-400">
          These stores get the real marketplace while the stage is <strong>Testing</strong>. A vendor can never switch this on
          themselves.
        </p>

        <div className="mt-3 flex gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
            <Search size={15} className="flex-shrink-0 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') search() }}
              placeholder="Store id, store link name or email"
              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-gray-900 outline-none placeholder:text-gray-400"
            />
          </div>
          <button
            type="button"
            onClick={search}
            disabled={searching || query.trim().length < 2}
            className="flex-shrink-0 rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white disabled:bg-gray-200"
          >
            {searching ? <Loader2 size={12} className="animate-spin" /> : 'Find'}
          </button>
        </div>

        {results && (
          <div className="mt-3 overflow-hidden rounded-xl border border-gray-100">
            {results.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-gray-400">
                No store with that id, link name or email.
              </p>
            ) : (
              <div className="divide-y divide-gray-50">
                {results.map((s) => (
                  <StoreRow key={s.storeId} store={s} on={s.isTester} busy={busyStore === s.storeId} onToggle={toggleTester} />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            With early access ({testers.length})
          </p>
          {testers.length === 0 ? (
            <p className="mt-2 rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center text-xs text-gray-400">
              No store has early access yet. Find one above and switch it on.
            </p>
          ) : (
            <div className="mt-2 overflow-hidden rounded-xl border border-gray-100">
              <div className="divide-y divide-gray-50">
                {testers.map((s) => (
                  <StoreRow key={s.storeId} store={s} on busy={busyStore === s.storeId} onToggle={toggleTester} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
