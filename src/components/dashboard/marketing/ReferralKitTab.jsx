// src/components/dashboard/marketing/ReferralKitTab.jsx
//
// Customer-to-customer referrals: a shopper shares a code, their friend gets a
// discount, and the shopper earns one for their next order. Word of mouth is
// the main way a Nigerian small business actually gets customers, and it costs
// the vendor nothing until it works.
//
// NOT to be confused with ReferralTab, which is the VENDOR referral programme
// (vendors referring vendors to Sellapage for real money, with bank payouts).
// That one touches `referralAvailable` and friends, which are locked in
// firestore.rules as money fields. Nothing here goes anywhere near them.
//
// WHY THIS TOUCHES NO CHECKOUT CODE
// A referral code here IS an ordinary discount document in
// stores/{id}/discounts. That means the whole redemption path already exists
// and is untouched:
//   - validate-discount.js checks code, isActive, expiry and usage limit
//   - handle-product-checkout.js increments usageCount when an order is placed
// So a referrer's usageCount IS their referral count. No hook, no new field on
// an order, and critically no edit to the checkout files that are being
// modified for abandoned-cart recovery at the same time as this.
import { useEffect, useState } from 'react'
import {
  Users, Plus, Copy, Check, Loader2, Gift, Share2, AlertCircle, Trash2,
} from 'lucide-react'
import {
  collection, getDocs, query, orderBy, addDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../../../firebase/config'
import { fetchStoreCollectionAsStaff, isActingAsStaffFor, writeStoreDocAsStaff } from '../../../utils/staffDataFetch'
import { SkeletonRows } from '../../Skeleton'

const PERCENTS = [5, 10, 15, 20]

/** Readable, unambiguous codes: no O/0 or I/1 to mistype off a WhatsApp message. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function makeCode(name) {
  const stem = String(name || '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 5) || 'FRIEND'
  let tail = ''
  for (let i = 0; i < 4; i++) tail += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  return `${stem}${tail}`
}

export default function ReferralKitTab({ store, storeUrl }) {
  const [codes, setCodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [percent, setPercent] = useState(10)
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState('')
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState('')

  const load = async () => {
    try {
      let items
      if (isActingAsStaffFor(store.id)) {
        items = await fetchStoreCollectionAsStaff('discounts', store.id)
      } else {
        const snap = await getDocs(
          query(collection(db, 'stores', store.id, 'discounts'), orderBy('createdAt', 'desc')),
        )
        items = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      }
      setCodes(items.filter((d) => d.isReferral === true))
    } catch {
      setError('Could not load your referral codes.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() /* eslint-disable-next-line */ }, [store?.id])

  const create = async () => {
    const who = name.trim()
    if (!who) return
    setCreating(true)
    setError('')
    try {
      // Collisions are vanishingly unlikely but not impossible, and a duplicate
      // code would silently send two people's referrals to one place.
      const existing = new Set(codes.map((c) => c.code))
      let code = makeCode(who)
      let guard = 0
      while (existing.has(code) && guard++ < 10) code = makeCode(who)

      const payload = {
        code,
        type: 'percentage',
        value: Number(percent),
        expiryDate: null,
        usageLimit: null,
        usageCount: 0,
        isActive: true,
        // The two fields that make this a referral rather than a plain discount.
        // Everything else is exactly the shape DiscountsTab writes, which is why
        // the existing validation and checkout paths accept it untouched.
        isReferral: true,
        referrerName: who,
        createdAt: serverTimestamp(),
      }

      if (isActingAsStaffFor(store.id)) {
        await writeStoreDocAsStaff({ type: 'discounts', storeId: store.id, op: 'create', data: payload })
      } else {
        await addDoc(collection(db, 'stores', store.id, 'discounts'), payload)
      }

      setName('')
      await load()
    } catch {
      setError('Could not create the code. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  const remove = async (id) => {
    setDeleting(id)
    try {
      if (isActingAsStaffFor(store.id)) {
        await writeStoreDocAsStaff({ type: 'discounts', storeId: store.id, op: 'delete', docId: id })
      } else {
        await deleteDoc(doc(db, 'stores', store.id, 'discounts', id))
      }
      setCodes((prev) => prev.filter((c) => c.id !== id))
    } catch {
      setError('Could not remove that code.')
    } finally {
      setDeleting('')
    }
  }

  const shareText = (c) =>
    `Shop at ${store?.businessName || store?.storeName} and use my code ${c.code} to get ${c.value}% off your first order.\n${storeUrl}`

  const copy = (text, key) => {
    navigator.clipboard?.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
  }

  const totalReferrals = codes.reduce((sum, c) => sum + Number(c.usageCount || 0), 0)

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-100 bg-white p-4">
        <div className="flex items-start gap-2.5">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-purple-50">
            <Users size={17} className="text-purple-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900">Let your customers bring you customers</p>
            <p className="mt-0.5 text-xs leading-relaxed text-gray-500">
              Give a customer their own code. Their friends get a discount, you get a new buyer,
              and you pay nothing unless it works.
            </p>
          </div>
        </div>
        {codes.length > 0 && (
          <div className="mt-3 flex gap-3">
            <div className="flex-1 rounded-xl bg-gray-50 p-3">
              <p className="text-lg font-black text-gray-900">{codes.length}</p>
              <p className="text-[11px] text-gray-500">codes given out</p>
            </div>
            <div className="flex-1 rounded-xl bg-gray-50 p-3">
              <p className="text-lg font-black text-green-600">{totalReferrals}</p>
              <p className="text-[11px] text-gray-500">orders from referrals</p>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4">
        <p className="text-sm font-bold text-gray-900">Create a code</p>
        <p className="mt-0.5 text-[11px] text-gray-400">
          Use the customer's name so you can tell whose code is working.
        </p>
        <div className="mt-2.5 space-y-2.5">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') create() }}
            placeholder="Customer's name"
            maxLength={40}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20"
          />
          <div>
            <p className="text-[11px] font-bold text-gray-700">Their friend gets</p>
            <div className="mt-1.5 flex gap-1.5">
              {PERCENTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPercent(p)}
                  className={`flex-1 rounded-xl py-2 text-xs font-bold transition-colors ${
                    percent === p ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-white text-gray-600'
                  }`}
                >
                  {p}% off
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={create}
            disabled={!name.trim() || creating}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400"
          >
            {creating ? <><Loader2 size={14} className="animate-spin" /> Creating...</> : <><Plus size={14} /> Create code</>}
          </button>
        </div>
      </div>

      {loading ? (
        <SkeletonRows count={3} />
      ) : codes.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center">
          <Gift size={24} className="mx-auto text-gray-300" />
          <p className="mt-3 text-sm font-bold text-gray-700">No referral codes yet</p>
          <p className="mt-1 text-xs text-gray-500">
            Start with your best repeat customers. They are the ones who will actually share it.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {codes.map((c) => (
            <div key={c.id} className="rounded-2xl border border-gray-100 bg-white p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-gray-900">{c.referrerName || 'Customer'}</p>
                    <span className="rounded-lg bg-gray-900 px-2 py-0.5 font-mono text-[11px] font-bold text-white">
                      {c.code}
                    </span>
                    <span className="rounded-lg bg-green-50 px-2 py-0.5 text-[11px] font-bold text-green-700">
                      {c.value}% off
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-gray-500">
                    {Number(c.usageCount || 0) === 0
                      ? 'No orders yet'
                      : `${c.usageCount} order${Number(c.usageCount) === 1 ? '' : 's'} from this code`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(c.id)}
                  disabled={deleting === c.id}
                  className="flex-shrink-0 text-gray-300 hover:text-red-500"
                  aria-label={`Remove ${c.code}`}
                >
                  {deleting === c.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </div>
              <button
                type="button"
                onClick={() => copy(shareText(c), c.id)}
                className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-[11px] font-bold text-gray-600 hover:border-green-300 hover:text-green-700"
              >
                {copied === c.id ? <Check size={12} /> : <Share2 size={12} />}
                {copied === c.id ? 'Copied' : 'Copy message to send them'}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
        <p className="text-xs font-bold text-gray-700">How it works</p>
        <ul className="mt-1.5 space-y-1 text-[11px] leading-relaxed text-gray-500">
          <li>Each code is a real discount code, so it works at checkout straight away.</li>
          <li>The order count updates automatically whenever someone uses that code.</li>
          <li>Reward your top referrers however you like: a free item, delivery, or their own discount.</li>
          <li>Codes also appear in Discounts, where you can pause or edit them.</li>
        </ul>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0 text-red-500" />
          <p className="text-xs font-semibold text-red-700">{error}</p>
        </div>
      )}
    </div>
  )
}
