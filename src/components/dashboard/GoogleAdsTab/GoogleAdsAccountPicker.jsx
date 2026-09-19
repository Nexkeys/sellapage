// Lets a vendor choose which Google Ads account the tab works with. Connecting
// always took the first account Google lists, so a vendor with more than one
// Ads account on the same Google login could land on one without their
// campaigns. The server only accepts accounts that login can reach, and turns
// away manager accounts, which hold no campaigns of their own.
import { useState } from 'react'
import { auth } from '../../../firebase/config'
import { Loader2, Check, AlertCircle, ArrowLeftRight, X } from 'lucide-react'

async function post(body) {
  const token = await auth.currentUser?.getIdToken()
  const res = await fetch('/api/google-ads-accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.')
  return data
}

export default function GoogleAdsAccountPicker({ store }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [accounts, setAccounts] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(null)
  const currentId = String(store?.googleAdsCustomerId || '')

  const load = async () => {
    setOpen(true)
    setLoading(true)
    setError('')
    try {
      const data = await post({ storeId: store.id, action: 'list' })
      setAccounts(data.accounts || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const choose = async (id) => {
    setSaving(id)
    setError('')
    try {
      await post({ storeId: store.id, action: 'select', customerId: id })
      // Campaigns, reports and currency all hang off this account, so a clean
      // reload is the one way to be sure nothing from the old account lingers.
      window.location.reload()
    } catch (err) {
      setError(err.message)
      setSaving(null)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={load}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11px] font-semibold text-gray-600 transition-colors hover:bg-gray-50"
      >
        <ArrowLeftRight size={12} /> Switch account
      </button>
    )
  }

  const others = (accounts || []).filter((a) => String(a.id) !== currentId)

  return (
    <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-gray-700">Google Ads accounts on your Google login</p>
        <button type="button" onClick={() => setOpen(false)} className="rounded p-1 text-gray-400 hover:text-gray-600" aria-label="Close">
          <X size={13} />
        </button>
      </div>

      {loading && (
        <div className="space-y-2" aria-busy="true">
          {[0, 1].map((i) => <div key={i} className="h-11 animate-pulse rounded-lg bg-gray-200/70" />)}
        </div>
      )}

      {error && (
        <p className="mb-2 flex items-start gap-1.5 text-[11px] font-medium text-red-600">
          <AlertCircle size={12} className="mt-0.5 shrink-0" /> {error}
        </p>
      )}

      {!loading && accounts && others.length === 0 && (
        <p className="text-[11px] text-gray-500">
          This is the only Google Ads account on the Google login you connected. If your other campaigns are in an account on a different Google login, disconnect and connect with that login instead.
        </p>
      )}

      {!loading && accounts && others.length > 0 && (
        <ul className="space-y-1.5">
          {accounts.map((a) => {
            const isCurrent = String(a.id) === currentId
            return (
              <li key={a.id}>
                <button
                  type="button"
                  disabled={isCurrent || a.manager || saving !== null}
                  onClick={() => choose(a.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left transition-colors hover:border-gray-300 disabled:cursor-default disabled:hover:border-gray-200"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold text-gray-900">{a.name}</span>
                    <span className="block text-[10px] text-gray-400">
                      ID: {a.id}{a.currency ? ` · ${a.currency}` : ''}{a.manager ? ' · Manager account, holds no campaigns' : ''}
                    </span>
                  </span>
                  {isCurrent && <span className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-emerald-600"><Check size={12} /> In use</span>}
                  {saving === a.id && <Loader2 size={14} className="shrink-0 animate-spin text-gray-400" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
