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
//
// Redesigned 2026-10-08 to match Get found: setup and the review requests on
// the left, and on the right how the profile can look on Google Maps, built
// from the store's own details.
import { useState, useEffect, useCallback } from 'react'
import { collection, query, orderBy } from 'firebase/firestore';
import { getDocs } from '../../../firebase/metered';
import { MapPin, Star, Loader2, Users, Search, Globe, MessageCircle } from 'lucide-react'
import { db } from '../../../firebase/config'
import { fetchStoreCollectionAsStaff, isActingAsStaffFor } from '../../../utils/staffDataFetch'
import { auth } from '../../../firebase/auth'
import { SkeletonRows } from '../../Skeleton'
import { Panel, CopyRow, Steps, Notice, SideLabel, INPUT } from './ui'

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

  const category = seo?.category || store?.category || 'Business'
  const setupDone = savedReviewUrl ? 4 : 0

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-4">
        <Panel icon={MapPin} title="Show up when people search nearby" sub={'People searching "cake in Ikeja" or "tailor near me" are ready to buy right now. A free Google profile puts you in those results, whatever you sell, even with no shop address.'} />

        <Panel title="Your details, ready to paste" sub="Google asks for these when you set up. Nothing to write.">
          <div className="space-y-4">
            {[
              ['Business name', name, 'name'],
              ['Description', profileDescription, 'desc'],
              ['Areas you deliver to', areas.length ? areas.join(', ') : 'Add these in Get found so they appear here', 'areas'],
              ['Website', publicUrl, 'url'],
            ].map(([label, value, key]) => (
              <CopyRow key={key} label={label} value={value} mono={key === 'url'} copied={copied === key} onCopy={() => copy(value, key)} disabled={key === 'areas' && !areas.length} />
            ))}
          </div>
        </Panel>

        <Panel title="How to set it up" sub="Free, and about fifteen minutes. Google verifies you, usually within a few days.">
          <Steps steps={SETUP_STEPS} done={setupDone} />
        </Panel>

        {/* The review engine. */}
        <Panel icon={Star} title="Ask for reviews" sub="Reviews decide how high you appear in Google Maps, and they are what makes a stranger trust you enough to pay. Ask the people who already bought.">
          <label className="block">
            <span className="text-[12.5px] font-bold text-gray-800">Your Google review link</span>
            <div className="mt-1.5 flex gap-2">
              <input type="url" inputMode="url" value={reviewUrl} onChange={(e) => setReviewUrl(e.target.value)} placeholder="https://g.page/r/..." className={`${INPUT} min-w-0 flex-1`} />
              <button type="button" onClick={saveReviewUrl} disabled={saving} className="flex-shrink-0 rounded-xl bg-forest px-4 text-[13px] font-bold text-white transition hover:bg-forest-700 disabled:bg-gray-200 disabled:text-gray-400">
                {saving ? <Loader2 size={15} className="animate-spin" /> : 'Save'}
              </button>
            </div>
          </label>

          {!savedReviewUrl ? (
            <div className="mt-3"><Notice tone="warn">Add your review link above and your customer list appears here, each with a ready-made message you can send on WhatsApp in one tap.</Notice></div>
          ) : customers.length === 0 ? (
            <div className="mt-3 rounded-xl bg-gray-50 p-5 text-center">
              <Users size={22} className="mx-auto text-gray-300" />
              <p className="mt-2 text-[13px] font-bold text-gray-700">No customers with a phone number yet</p>
              <p className="mt-0.5 text-[12px] text-gray-500">Once people order from you, they will show up here to ask.</p>
            </div>
          ) : (
            <>
              <div className="relative mt-4">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search your customers" className={`${INPUT} pl-9`} />
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {filtered.slice(0, 40).map((c) => (
                  <div key={c.id} className="flex items-center gap-2.5 rounded-xl border border-gray-100 p-2.5">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-forest-50 text-[11px] font-bold text-forest-700">{String(c.name || 'C').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold text-gray-900">{c.name || 'Customer'}</p>
                      <p className="truncate text-[11.5px] text-gray-400">{c.phone}</p>
                    </div>
                    <a href={`https://wa.me/${String(c.phone).replace(/\D/g, '')}?text=${encodeURIComponent(reviewMessage(c.name))}`} target="_blank" rel="noopener noreferrer"
                      className="flex-shrink-0 rounded-lg bg-forest-600 px-3 py-1.5 text-[12px] font-bold text-white hover:bg-forest">Ask</a>
                  </div>
                ))}
              </div>
              {filtered.length > 40 && <p className="mt-2 text-center text-[11px] text-gray-400">Showing 40 of {filtered.length}. Search to find someone specific.</p>}
            </>
          )}
        </Panel>

        {error && <Notice tone="error">{error}</Notice>}
        {success && <Notice tone="ok">{success}</Notice>}
      </div>

      <aside className="min-w-0 space-y-4 lg:sticky lg:top-4 lg:self-start">
        <div>
          <SideLabel>On Google Maps</SideLabel>
          <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            {/* A drawn map: roads, a park, and the pin where customers find you. */}
            <div className="relative h-40 overflow-hidden bg-[#eef3ec]" aria-hidden="true">
              <svg viewBox="0 0 400 160" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
                <rect x="250" y="10" width="110" height="60" rx="10" fill="#cfe8c9" />
                <path d="M-10 110 C80 100 140 130 220 110 S340 70 420 80" stroke="#fff" strokeWidth="14" fill="none" />
                <path d="M120 -10 L150 170" stroke="#fff" strokeWidth="10" />
                <path d="M300 -10 L270 170" stroke="#fde68a" strokeWidth="8" />
                <path d="M-10 40 L410 55" stroke="#fff" strokeWidth="6" />
              </svg>
              <span className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-full">
                <span className="absolute left-1/2 top-full h-3 w-8 -translate-x-1/2 rounded-[50%] bg-black/15" />
                <span className="absolute left-1/2 top-full h-10 w-10 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-[#EA4335]/20" />
                <svg viewBox="0 0 24 24" className="relative h-10 w-10 drop-shadow-md"><path d="M12 2C7.6 2 4 5.4 4 9.8 4 15.5 12 22 12 22s8-6.5 8-12.2C20 5.4 16.4 2 12 2Z" fill="#EA4335" /><circle cx="12" cy="9.6" r="3.2" fill="#fff" /></svg>
              </span>
            </div>
            <div className="p-4">
              <p className="font-display text-[18px] font-extrabold leading-tight text-gray-900">{name}</p>
              <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-gray-500">
                <span>{savedReviewUrl ? 'Collecting reviews' : 'New on Google'}</span>
                <span>·</span><span className="truncate">{category}</span>
              </p>
              <div className="mt-3 flex gap-2">
                {['Website', 'Call', 'Share'].map((b, i) => <span key={b} className={`flex-1 rounded-full py-1.5 text-center text-[11.5px] font-semibold ${i === 0 ? 'bg-[#1a73e8] text-white' : 'border border-gray-200 text-[#1a73e8]'}`}>{b}</span>)}
              </div>
              <ul className="mt-3 space-y-2 border-t border-gray-100 pt-3 text-[12px] text-gray-600">
                <li className="flex items-start gap-2"><MapPin size={14} className="mt-0.5 flex-shrink-0 text-gray-400" />{areas.length ? `Delivers to ${areas.slice(0, 4).join(', ')}${areas.length > 4 ? ' and more' : ''}` : 'Your delivery areas show here'}</li>
                <li className="flex items-start gap-2"><Globe size={14} className="mt-0.5 flex-shrink-0 text-gray-400" /><span className="truncate">{publicUrl.replace(/^https?:\/\//, '')}</span></li>
              </ul>
              <p className="mt-3 line-clamp-3 text-[12px] leading-relaxed text-gray-500">{profileDescription}</p>
            </div>
          </section>
          <p className="mt-2 px-1 text-[11.5px] leading-relaxed text-gray-400">How your profile can look once Google verifies it. Google decides the final layout.</p>
        </div>

        {savedReviewUrl && (
          <Panel tone="green" icon={MessageCircle} title="The message customers get" sub="Sent from your WhatsApp, with the customer's first name filled in. Shown here for a customer called Chiamaka.">
            <p className="rounded-2xl rounded-tl-md bg-white px-3.5 py-2.5 text-[12.5px] leading-relaxed text-gray-700 shadow-sm">{reviewMessage('Chiamaka')}</p>
          </Panel>
        )}
      </aside>
    </div>
  )
}
