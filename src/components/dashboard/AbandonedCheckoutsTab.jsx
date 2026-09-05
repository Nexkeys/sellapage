// src/components/dashboard/AbandonedCheckoutsTab.jsx
// Premium tab: abandoned checkouts, with a manual Send reminder per row.
//
// Manual by design. The vendor decides who gets contacted, which keeps
// automated mail from going out under their store name without their knowledge.
// The trade-off is speed, since recovery emails work best within about an hour;
// see Docs/ABANDONED-CHECKOUT-PLAN.md section 2.
//
// Every rule that protects the customer (Premium, toggle on, not already paid,
// not already reminded, 24 hour per-customer throttle) is enforced server side
// in _lib/abandoned-checkout.js. Nothing here is load bearing for that.
import { useState, useEffect, useCallback } from 'react'
import {
  ShoppingCart, Loader2, AlertCircle, Lock, CreditCard, Send, CheckCircle2,
  Clock, MailCheck,
} from 'lucide-react'
import { updateStore } from '../../firebase/auth'

const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`

function timeAgo(iso) {
  if (!iso) return ''
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function AbandonedCheckoutsTab({ store, user, isPremium, navigateTo }) {
  const [enabled, setEnabled] = useState(store?.abandonedRecoveryEnabled === true)
  const [savingToggle, setSavingToggle] = useState(false)

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [sendingRef, setSendingRef] = useState(null)
  const [notice, setNotice] = useState(null)

  const load = useCallback(async () => {
    if (!store?.id || !user || !isPremium) { setLoading(false); return }
    setLoading(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch(
        `/api/abandoned-checkout-vendor?storeId=${store.id}&page=${page}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      if (!res.ok) { setData(null); return }
      const json = await res.json().catch(() => null)
      setData(json?.success ? json : null)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [store?.id, user, isPremium, page])

  useEffect(() => { load() }, [load])

  const handleToggle = async () => {
    const next = !enabled
    setSavingToggle(true)
    setNotice(null)
    try {
      await updateStore(store.id, { abandonedRecoveryEnabled: next })
      setEnabled(next)
      setNotice({
        kind: 'ok',
        text: next
          ? 'Recovery is on. New abandoned checkouts will be saved from now.'
          : 'Recovery is off. Nothing new will be saved.',
      })
    } catch {
      setNotice({ kind: 'err', text: 'Could not save that. Please try again.' })
    } finally {
      setSavingToggle(false)
    }
  }

  const handleSend = async (reference) => {
    setSendingRef(reference)
    setNotice(null)
    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/abandoned-checkout-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ storeId: store.id, reference }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json.success) {
        setNotice({ kind: 'ok', text: 'Reminder sent.' })
        await load()
      } else {
        // The server explains precisely why nothing was sent (already paid,
        // throttled, already reminded). A vendor who pressed a button deserves
        // better than silence.
        setNotice({ kind: 'err', text: json.message || 'The reminder could not be sent.' })
      }
    } catch {
      setNotice({ kind: 'err', text: 'Network problem. Please try again.' })
    } finally {
      setSendingRef(null)
    }
  }

  if (!isPremium) {
    return (
      <div className="mx-auto max-w-4xl p-4 sm:p-5">
        <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
          <div className="px-6 py-14 text-center sm:py-16">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 border border-green-100">
              <Lock size={22} className="text-green-600" strokeWidth={1.8} />
            </div>
            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-green-600">Premium Only</p>
            <h1 className="mb-3 text-xl font-bold tracking-tight text-gray-900">Abandoned Checkouts</h1>
            <p className="mx-auto mb-6 max-w-sm text-sm leading-relaxed text-gray-500">
              See who started an order and did not finish, then send them a reminder
              in one tap.
            </p>
            <button
              type="button"
              onClick={() => navigateTo?.('billing')}
              className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-xs font-bold text-white transition-all hover:bg-green-700"
            >
              <CreditCard size={13} /> Upgrade to Premium
            </button>
          </div>
        </div>
      </div>
    )
  }

  const summary = data?.summary
  const checkouts = data?.checkouts || []
  const reminded = checkouts.filter((c) => c.reminderSent && !c.recovered)
  const rate = summary?.abandoned > 0
    ? Math.round((summary.recovered / summary.abandoned) * 100)
    : 0

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 sm:p-5">
      <div>
        <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-green-600">Recovery</p>
        <h1 className="text-xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <ShoppingCart size={19} className="text-green-500" /> Abandoned Checkouts
        </h1>
        <p className="mt-0.5 text-xs text-gray-400">
          Customers who reached the payment page and did not pay. Send one reminder each.
        </p>
      </div>

      {/* Toggle */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold text-gray-900 text-sm">Save abandoned checkouts</p>
            <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
              While this is off, nothing is saved at all: no names, no emails, no baskets.
              Records are deleted automatically after 30 days.
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggle}
            disabled={savingToggle}
            className={`inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full p-1 transition-colors disabled:opacity-50 ${
              enabled ? 'justify-end bg-green-600' : 'justify-start bg-gray-200'
            }`}
          >
            <span className="h-4 w-4 rounded-full bg-white shadow" />
          </button>
        </div>
      </div>

      {notice && (
        <div className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-medium ${
          notice.kind === 'ok'
            ? 'bg-green-50 border-green-100 text-green-700'
            : 'bg-red-50 border-red-100 text-red-600'
        }`}>
          {notice.kind === 'ok' ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
          {notice.text}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-gray-100 bg-white py-16">
          <Loader2 size={22} className="animate-spin text-green-600" />
        </div>
      ) : !data || data.total === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white py-16 text-center px-6">
          <p className="text-sm text-gray-500 font-semibold">No abandoned checkouts yet</p>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto leading-relaxed">
            {enabled
              ? 'One appears here when a customer reaches the payment page and does not complete the order.'
              : 'Switch the toggle above on to start saving them.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Abandoned', value: summary.abandoned },
              { label: 'Recovered', value: `${summary.recovered} (${rate}%)` },
              { label: 'Recovered value', value: naira(summary.recoveredValue) },
              { label: 'Still unpaid', value: naira(summary.lostValue) },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-gray-100 bg-white p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{s.label}</p>
                <p className="mt-1 text-lg font-bold text-gray-900">
                  {typeof s.value === 'number' ? s.value.toLocaleString() : s.value}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    <th className="px-3 py-2.5">Customer</th>
                    <th className="px-3 py-2.5">Left behind</th>
                    <th className="px-3 py-2.5 text-right">Value</th>
                    <th className="px-3 py-2.5 text-right">When</th>
                    <th className="px-3 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {checkouts.map((c) => (
                    <tr key={c.reference} className="border-b border-gray-50 last:border-0">
                      <td className="px-3 py-2.5">
                        <p className="font-semibold text-gray-900 truncate max-w-[150px]">
                          {c.customerName || 'Customer'}
                        </p>
                        <p className="text-[11px] text-gray-400 truncate max-w-[150px]">{c.customerEmail}</p>
                      </td>
                      <td className="px-3 py-2.5 text-gray-600 text-xs truncate max-w-[180px]">
                        {c.itemSummary || '-'}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-gray-900">{naira(c.grandTotal)}</td>
                      <td className="px-3 py-2.5 text-right text-[11px] text-gray-400">{timeAgo(c.createdAt)}</td>
                      <td className="px-3 py-2.5 text-right">
                        {c.recovered ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-600">
                            <CheckCircle2 size={11} /> Paid
                          </span>
                        ) : c.reminderSent ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-400">
                            <MailCheck size={11} /> Reminded
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSend(c.reference)}
                            disabled={sendingRef === c.reference || !enabled}
                            className="inline-flex items-center gap-1 rounded-lg border border-green-500 px-2.5 py-1 text-[11px] font-bold text-green-600 hover:bg-green-50 disabled:opacity-40 transition-all"
                          >
                            {sendingRef === c.reference
                              ? <Loader2 size={11} className="animate-spin" />
                              : <Send size={11} />}
                            Remind
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2.5">
                <p className="text-[11px] text-gray-400">Page {page} of {data.totalPages}</p>
                <div className="flex gap-1">
                  <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                    className="rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-bold disabled:opacity-40 hover:bg-gray-50">
                    Prev
                  </button>
                  <button type="button" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}
                    className="rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-bold disabled:opacity-40 hover:bg-gray-50">
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Reminder history. Derived from the same records rather than a second
              collection, so there is no extra read and nothing to keep in sync. */}
          {reminded.length > 0 && (
            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              <p className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-1.5">
                <MailCheck size={14} className="text-gray-400" /> Reminders sent
              </p>
              <div className="space-y-1.5">
                {reminded.map((c) => (
                  <div key={c.reference} className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-gray-600 truncate">
                      {c.customerName || 'Customer'} <span className="text-gray-400">{c.customerEmail}</span>
                    </span>
                    <span className="flex items-center gap-1 text-gray-400 flex-shrink-0">
                      <Clock size={10} /> {timeAgo(c.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
