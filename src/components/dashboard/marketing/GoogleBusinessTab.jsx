// src/components/dashboard/marketing/GoogleBusinessTab.jsx
//
// Gets a vendor into Google Maps and the local "3-pack", then helps them
// collect the reviews that keep them there.
//
// WHY THIS AND NOT ANOTHER PRODUCT FEED
// The Merchant Center feed only serves people selling physical products. A
// tailor, caterer, barber, photographer or anyone taking bookings gets nothing
// from it. A Business Profile works whatever they sell, including online-only
// sellers with no shop address (service-area business, address hidden).
//
// WHY THE REVIEW HALF MATTERS MOST
// Reviews are roughly 15-20% of local ranking and the top three map results
// take about 42% of local clicks, so reviews are the difference between being
// found and being invisible. They also answer the other problem: about a
// quarter of Nigerian social-commerce shoppers report being scammed, so a
// stranger needs a reason to trust a name they have never seen.
//
// Sellapage can do the hard half that no competitor can: it holds the completed
// orders and the customers who placed them, so the vendor can ask exactly the
// people who actually bought.
import { useState, useEffect, useCallback } from 'react'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import {
  MapPin, Copy, Check, ExternalLink, Star, Loader2, AlertCircle, Users, Search,
} from 'lucide-react'
import { db } from '../../../firebase/config'
import { fetchStoreCollectionAsStaff, isActingAsStaffFor } from '../../../utils/staffDataFetch'
import { auth } from '../../../firebase/auth'
import { SkeletonRows } from '../../Skeleton'

const SETUP_STEPS = [
  {
    title: 'Create your profile',
    body: 'Open Google Business Profile and sign up with your business Google account. It is free.',
    link: 'https://business.google.com/create',
    linkLabel: 'Open Google Business Profile',
  },
  {
    title: 'Say you have no shop address, if you have none',
    body: 'When Google asks whether customers visit you at an address, choose No, then set the cities you deliver to. Your address stays hidden and you still show up in local searches.',
  },
  {
    title: 'Paste the details below',
    body: 'Use the description, service areas and store link from this page so your profile is complete. A complete profile gets far more clicks than a half-filled one.',
  },
  {
    title: 'Get your review link and come back',
    body: 'Once Google verifies you, open your profile, tap Ask for reviews and copy the short link. Paste it below and you can start asking your customers in one tap.',
  },
]

export default function GoogleBusinessTab({ store, storeUrl }) {
  const [seo, setSeo] = useState(null)
  const [reviewUrl, setReviewUrl] = useState('')
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')

  const authed = useCallback(async (url, options = {}) => {
    const token = await auth.currentUser?.getIdToken()
    return fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) },
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [seoRes, customerList] = await Promise.all([
          authed('/api/store-seo?action=get').then((r) => r.json()).catch(() => null),
          (async () => {
            try {
              if (isActingAsStaffFor(store.id)) {
                return await fetchStoreCollectionAsStaff('customers', store.id)
              }
              const snap = await getDocs(
                query(collection(db, 'stores', store.id, 'customers'), orderBy('createdAt', 'desc')),
              )
              return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
            } catch {
              return []
            }
          })(),
        ])
        if (cancelled) return
        if (seoRes?.success) {
          setSeo(seoRes.seo || {})
          setReviewUrl(seoRes.seo?.googleReviewUrl || '')
        }
        setCustomers(customerList.filter((c) => c.phone))
      } catch {
        if (!cancelled) setError('Could not load your details.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [store?.id, authed])

  const saveReviewUrl = async () => {
    setSaving(true); setError(''); setSuccess('')
    try {
      const r = await authed('/api/store-seo?action=save', {
        method: 'POST',
        body: JSON.stringify({ seo: { ...(seo || {}), googleReviewUrl: reviewUrl } }),
      })
      const d = await r.json()
      if (!r.ok) { setError(d.message || 'Could not save that link.'); return }
      setSeo(d.seo)
      // The server drops anything that is not a real http(s) URL, so if it came
      // back empty the vendor pasted something that would never have worked.
      if (reviewUrl && !d.seo?.googleReviewUrl) {
        setError('That does not look like a valid link. Copy it again from your Google profile.')
        setReviewUrl('')
        return
      }
      setSuccess('Saved. You can now ask your customers for reviews.')
      setTimeout(() => setSuccess(''), 4000)
    } catch {
      setError('Could not save. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  const name = store?.businessName || store?.storeName || 'Your business'
  const publicUrl = storeUrl || `https://sellapage.com.ng/${store?.storeName || ''}`
  const areas = seo?.serviceAreas?.length ? seo.serviceAreas : []

  const profileDescription =
    seo?.about ||
    seo?.description ||
    store?.description ||
    `${name} sells online and delivers${areas.length ? ` to ${areas.join(', ')}` : ' across Nigeria'}. Order on ${publicUrl.replace(/^https?:\/\//, '')}.`

  const savedReviewUrl = seo?.googleReviewUrl || ''

  const reviewMessage = (customerName) =>
    `Hi${customerName ? ` ${customerName.split(' ')[0]}` : ''}, thank you for buying from ${name}. ` +
    `If you were happy with it, please drop a quick review here, it really helps us: ${savedReviewUrl}`

  const copy = (text, key) => {
    navigator.clipboard?.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
  }

  const filtered = search.trim()
    ? customers.filter((c) =>
        `${c.name || ''} ${c.phone || ''}`.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : customers

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-28 animate-pulse rounded-2xl bg-gray-100/70" />
        <SkeletonRows count={3} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-100 bg-white p-4">
        <div className="flex items-start gap-2.5">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50">
            <MapPin size={17} className="text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900">Show up when people search nearby</p>
            <p className="mt-0.5 text-xs leading-relaxed text-gray-500">
              People searching "cake in Ikeja" or "tailor near me" are ready to buy right now.
              A free Google profile puts you in those results, whatever you sell, even with no shop address.
            </p>
          </div>
        </div>
      </div>

      {/* Everything to paste, built from details the store already has. */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4">
        <p className="text-sm font-bold text-gray-900">Your details, ready to paste</p>
        <p className="mt-0.5 text-[11px] text-gray-400">
          Google asks for these when you set up. Nothing to write.
        </p>

        <div className="mt-3 space-y-3">
          {[
            ['Business name', name, 'name'],
            ['Description', profileDescription, 'desc'],
            ['Areas you deliver to', areas.length ? areas.join(', ') : 'Add these in Get found so they appear here', 'areas'],
            ['Website', publicUrl, 'url'],
          ].map(([label, value, key]) => (
            <div key={key}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-bold text-gray-700">{label}</p>
                <button
                  type="button"
                  onClick={() => copy(value, key)}
                  className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg bg-gray-900 px-2 py-1 text-[10px] font-bold text-white"
                >
                  {copied === key ? <Check size={11} /> : <Copy size={11} />} Copy
                </button>
              </div>
              <p className="mt-1 break-words rounded-xl bg-gray-50 p-2.5 text-[11px] leading-relaxed text-gray-600">
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4">
        <p className="mb-3 text-sm font-bold text-gray-900">How to set it up</p>
        <ol className="space-y-3">
          {SETUP_STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-900 text-[11px] font-bold text-white">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-900">{s.title}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-gray-500">{s.body}</p>
                {s.link && (
                  <a
                    href={s.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline"
                  >
                    {s.linkLabel} <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* The review engine. */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4">
        <div className="flex items-center gap-2">
          <Star size={15} className="text-amber-500" />
          <p className="text-sm font-bold text-gray-900">Ask for reviews</p>
        </div>
        <p className="mt-0.5 text-[11px] leading-relaxed text-gray-400">
          Reviews decide how high you appear in Google Maps, and they are what makes a stranger
          trust you enough to pay. Ask the people who already bought.
        </p>

        <label className="mt-3 block">
          <span className="text-[11px] font-bold text-gray-700">Your Google review link</span>
          <div className="mt-1.5 flex gap-2">
            <input
              type="url"
              inputMode="url"
              value={reviewUrl}
              onChange={(e) => setReviewUrl(e.target.value)}
              placeholder="https://g.page/r/..."
              className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20"
            />
            <button
              type="button"
              onClick={saveReviewUrl}
              disabled={saving}
              className="flex-shrink-0 rounded-xl bg-green-600 px-3 py-2 text-xs font-bold text-white disabled:bg-gray-200 disabled:text-gray-400"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
            </button>
          </div>
        </label>

        {!savedReviewUrl ? (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 p-2.5">
            <AlertCircle size={13} className="mt-0.5 flex-shrink-0 text-amber-600" />
            <p className="text-[11px] leading-relaxed text-amber-800">
              Add your review link above and your customer list appears here, each with a
              ready-made message you can send on WhatsApp in one tap.
            </p>
          </div>
        ) : customers.length === 0 ? (
          <div className="mt-3 rounded-xl bg-gray-50 p-4 text-center">
            <Users size={20} className="mx-auto text-gray-300" />
            <p className="mt-2 text-xs font-bold text-gray-700">No customers with a phone number yet</p>
            <p className="mt-0.5 text-[11px] text-gray-500">
              Once people order from you, they will show up here to ask.
            </p>
          </div>
        ) : (
          <>
            <div className="relative mt-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search your customers"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-green-400"
              />
            </div>

            <div className="mt-2.5 space-y-2">
              {filtered.slice(0, 40).map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-2.5 rounded-xl border border-gray-100 p-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-gray-900">{c.name || 'Customer'}</p>
                    <p className="truncate text-[11px] text-gray-400">{c.phone}</p>
                  </div>
                  <a
                    href={`https://wa.me/${String(c.phone).replace(/\D/g, '')}?text=${encodeURIComponent(reviewMessage(c.name))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 rounded-lg bg-green-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-green-700"
                  >
                    Ask
                  </a>
                </div>
              ))}
            </div>
            {filtered.length > 40 && (
              <p className="mt-2 text-center text-[10px] text-gray-400">
                Showing 40 of {filtered.length}. Search to find someone specific.
              </p>
            )}
          </>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0 text-red-500" />
          <p className="text-xs font-semibold text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 rounded-xl border border-green-100 bg-green-50 p-3">
          <Check size={14} className="mt-0.5 flex-shrink-0 text-green-600" />
          <p className="text-xs font-semibold text-green-700">{success}</p>
        </div>
      )}
    </div>
  )
}
