// src/components/dashboard/LoyaltyTab.jsx
// Premium loyalty points: vendor settings plus a read only list of cards.
//
// The card list is deliberately read only. There is no way here to edit a
// balance or hand out points, which keeps the earned/redeemed figures a true
// record of what happened at checkout rather than something a vendor can adjust.
import { useState, useEffect, useCallback } from 'react'
import {
  Gift, Loader2, AlertCircle, Search, ChevronLeft, ChevronRight,
  Lock, CreditCard, Save, CheckCircle2, Snowflake,
} from 'lucide-react'
import { updateStore } from '../../firebase/auth'
import { SkeletonRows } from '../Skeleton'

const INPUT_CLASS =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/20'

const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`

export default function LoyaltyTab({ store, user, isPremium, navigateTo }) {
  const [enabled, setEnabled] = useState(store?.loyaltyEnabled === true)
  const [earnRate, setEarnRate] = useState(store?.loyaltyEarnRate ?? 100)
  const [redeemValue, setRedeemValue] = useState(store?.loyaltyRedeemValue ?? 1)
  const [minRedeem, setMinRedeem] = useState(store?.loyaltyMinRedeem ?? 100)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const [cards, setCards] = useState([])
  const [totals, setTotals] = useState({ outstanding: 0, earned: 0, redeemed: 0, outstandingValue: 0 })
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const loadCards = useCallback(async () => {
    if (!store?.id || !isPremium) { setLoading(false); return }
    setLoading(true)
    try {
      const token = await user?.getIdToken()
      const res = await fetch(
        `/api/loyalty-vendor?storeId=${store.id}&page=${page}&search=${encodeURIComponent(search)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.success) {
        setCards(data.cards || [])
        setTotals(data.totals || totals)
        setTotalPages(data.totalPages || 1)
        setTotal(data.total || 0)
      }
    } catch {
      /* list is non critical, settings above still work */
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.id, isPremium, page, search, user])

  useEffect(() => { loadCards() }, [loadCards])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      // Written straight to the store document, same as delivery zones. The
      // server reclamps all three values every time it uses them, so a bad
      // figure here cannot produce a free order.
      await updateStore(store.id, {
        loyaltyEnabled: enabled,
        loyaltyEarnRate: Math.max(10, Number(earnRate) || 100),
        loyaltyRedeemValue: Math.max(0.01, Number(redeemValue) || 1),
        loyaltyMinRedeem: Math.max(0, Number(minRedeem) || 0),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      console.error('[LoyaltyTab] save failed', err)
      setError('Could not save. Please try again.')
    } finally {
      setSaving(false)
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
            <h1 className="mb-3 text-xl font-bold tracking-tight text-gray-900">Loyalty Points</h1>
            <p className="mx-auto mb-6 max-w-sm text-sm leading-relaxed text-gray-500">
              Reward repeat customers automatically. They earn points as they shop and
              spend them at checkout with a code, no account needed.
            </p>
            <button
              type="button"
              onClick={() => navigateTo?.('billing')}
              className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-xs font-bold text-white transition-all hover:bg-green-700"
            >
              <CreditCard size={13} />
              Upgrade to Premium
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Worked example, recalculated live. Vendors reason about this far better than
  // they reason about "earn rate", and it is the fastest way to catch a rate
  // that is an order of magnitude off before it goes live.
  const examplePoints = Math.floor(10000 / (Number(earnRate) || 100))
  const exampleValue = Math.floor(examplePoints * (Number(redeemValue) || 1))
  // Total spend required to reach the minimum redemption threshold. This is the
  // number that catches a settings mistake, because the two inputs multiply.
  const spendToUnlock = (Number(minRedeem) || 0) * (Number(earnRate) || 100)

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-5">
      <div>
        <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-green-600">Retention</p>
        <h1 className="text-xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <Gift size={19} className="text-green-500" /> Loyalty Points
        </h1>
        <p className="mt-0.5 text-xs text-gray-400">
          Customers earn points when they buy, and spend them with a code at checkout.
        </p>
      </div>

      {/* Settings */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-bold text-gray-900 text-sm">Enable loyalty points</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              While this is off, nothing shows at checkout and no points are earned.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEnabled((v) => !v)}
            className={`inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full p-1 transition-colors ${
              enabled ? 'justify-end bg-green-600' : 'justify-start bg-gray-200'
            }`}
          >
            <span className="h-4 w-4 rounded-full bg-white shadow" />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Naira per point</label>
            <input type="number" min="10" value={earnRate}
              onChange={(e) => setEarnRate(e.target.value)} className={INPUT_CLASS} />
            <p className="text-[10px] text-gray-400 mt-1">Spend this much to earn 1 point.</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Point is worth</label>
            <input type="number" min="0.01" step="0.01" value={redeemValue}
              onChange={(e) => setRedeemValue(e.target.value)} className={INPUT_CLASS} />
            <p className="text-[10px] text-gray-400 mt-1">Naira off per point spent.</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Minimum to spend</label>
            <input type="number" min="0" value={minRedeem}
              onChange={(e) => setMinRedeem(e.target.value)} className={INPUT_CLASS} />
            <p className="text-[10px] text-gray-400 mt-1">Points needed before they can redeem.</p>
          </div>
        </div>

        <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-3 space-y-1">
          <p className="text-xs text-green-800">
            <strong>Example:</strong> a {naira(10000)} order earns{' '}
            <strong>{examplePoints} points</strong>, worth <strong>{naira(exampleValue)}</strong> off a future order.
          </p>
          <p className="text-xs text-green-800">
            A customer must spend <strong>{naira(spendToUnlock)}</strong> with you in
            total before they can redeem anything.
          </p>
        </div>

        {/* The minimum is set in POINTS, but what a vendor actually cares about
            is the naira spend it implies. Those two numbers multiply, so a
            reasonable looking minimum can quietly put redemption out of reach
            forever. Flagged rather than blocked, since it is their call. */}
        {spendToUnlock > 100000 && (
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
            <AlertCircle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              That is a high bar. At these settings a customer needs to spend{' '}
              <strong>{naira(spendToUnlock)}</strong> before their points become
              usable, so most will never reach it. Lower the minimum, or the naira
              per point, if you want the programme to actually get used.
            </p>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 text-xs font-medium text-red-600">
            <AlertCircle size={13} className="flex-shrink-0" /> {error}
          </div>
        )}

        <div className="flex items-center gap-2">
          <button type="button" onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50 transition-all">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Save settings
          </button>
          {saved && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600">
              <CheckCircle2 size={13} /> Saved
            </span>
          )}
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Cards issued', value: total },
          { label: 'Points outstanding', value: totals.outstanding },
          { label: 'Outstanding value', value: naira(totals.outstandingValue), wide: true },
          { label: 'Points redeemed', value: totals.redeemed },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-gray-100 bg-white p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{s.label}</p>
            <p className="mt-1 text-lg font-bold text-gray-900">
              {typeof s.value === 'number' ? s.value.toLocaleString() : s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Cards */}
      <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
        <div className="flex items-center gap-2 border-b border-gray-100 p-3">
          <Search size={14} className="text-gray-400 flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search name, email or code"
            className="flex-1 text-sm outline-none placeholder:text-gray-400"
          />
        </div>

        {loading ? (
          <SkeletonRows count={4} />
        ) : cards.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400 px-6">
            {search
              ? 'No cards match that search.'
              : 'No loyalty cards yet. One is created automatically the first time a customer completes an order.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  <th className="px-3 py-2.5">Customer</th>
                  <th className="px-3 py-2.5">Code</th>
                  <th className="px-3 py-2.5 text-right">Balance</th>
                  <th className="px-3 py-2.5 text-right">Earned</th>
                  <th className="px-3 py-2.5 text-right">Spent</th>
                </tr>
              </thead>
              <tbody>
                {cards.map((c) => (
                  <tr key={c.code} className="border-b border-gray-50 last:border-0">
                    <td className="px-3 py-2.5">
                      <p className="font-semibold text-gray-900 truncate max-w-[180px]">
                        {c.customerName || 'Customer'}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate max-w-[180px]">{c.customerEmail}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-mono text-xs text-gray-700">{c.code}</span>
                      {c.frozen && (
                        <span className="ml-1.5 inline-flex items-center gap-1 text-[9px] font-bold text-blue-500">
                          <Snowflake size={9} /> FROZEN
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-gray-900">{c.points.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right text-gray-500">{c.lifetimeEarned.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right text-gray-500">{c.lifetimeRedeemed.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2.5">
            <p className="text-[11px] text-gray-400">Page {page} of {totalPages}</p>
            <div className="flex items-center gap-1">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-gray-200 p-1.5 disabled:opacity-40 hover:bg-gray-50">
                <ChevronLeft size={14} />
              </button>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-gray-200 p-1.5 disabled:opacity-40 hover:bg-gray-50">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
