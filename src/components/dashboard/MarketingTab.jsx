//src/components/dashboard/MarketingTab.jsx/
//
// Rebuilt 2026-09-05. The previous version was a "Monthly Success Score", a
// daily checklist of busywork ("Price Audit: review your catalog prices"), and
// two Growth Campaign cards that were WAITLIST buttons - one of them a waitlist
// for Promotions & Discounts, which already ships as its own tab. None of it
// could get a vendor a single customer.
//
// The rule for anything that lives here: it has to help a vendor GET a
// customer, not help them admire their business. Reporting belongs in Analytics
// and is deliberately not duplicated here.
import { useState, useEffect, useCallback } from 'react'
import { Search, Megaphone, ShoppingBag, Image as ImageIcon, Activity } from 'lucide-react'
import SeoTab from './marketing/SeoTab'
import GoogleFeedTab from './marketing/GoogleFeedTab'
import ContentKitTab from './marketing/ContentKitTab'
import MetaPixelTab from './marketing/MetaPixelTab'
import { auth } from '../../firebase/auth'

const SECTIONS = [
  {
    id: 'seo',
    label: 'Get found',
    icon: Search,
    blurb: 'Make Google and AI assistants describe your store to people searching for what you sell.',
  },
  {
    id: 'google',
    label: 'Free Google listings',
    icon: ShoppingBag,
    blurb: 'Put your products on Google Search and Shopping without paying for ads.',
  },
  {
    id: 'pixel',
    label: 'Meta Pixel',
    icon: Activity,
    blurb: 'Track which Facebook and Instagram ads actually lead to sales, using your own Meta pixel.',
  },
  {
    id: 'content',
    icon: ImageIcon,
    label: 'Post kit',
    // Available on every plan, deliberately. It costs nothing to run (the card
    // is drawn in the browser), and a Starter vendor who uses it daily is the
    // one most likely to notice the locked sections next to it.
    blurb: 'Turn a product into a ready-to-post image, caption and hashtags for Instagram, WhatsApp status or TikTok.',
  },
]

export default function MarketingTab({ store, storeUrl, navigateTo, isPremium = false }) {
  const [section, setSection] = useState('seo')
  // Status is held here so the Google feed section knows whether the store is
  // eligible and switched on without the vendor having to visit Get Found first.
  const [status, setStatus] = useState({ eligible: false, active: false })

  const loadStatus = useCallback(async () => {
    try {
      const token = await auth.currentUser?.getIdToken()
      const r = await fetch('/api/store-seo?action=get', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const d = await r.json()
      if (d?.success) setStatus({ eligible: d.eligible, active: d.active })
    } catch {
      // Leaving the defaults means the paid sections show as locked rather than
      // wrongly telling a vendor their feed is live.
    }
  }, [])

  useEffect(() => { loadStatus() }, [loadStatus])

  const active = SECTIONS.find((s) => s.id === section) || SECTIONS[0]

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <header className="mb-4">
        <div className="flex items-center gap-2">
          <Megaphone size={18} className="text-gray-400" />
          <h1 className="font-display text-lg font-extrabold text-gray-900">Marketing</h1>
        </div>
        <p className="mt-0.5 text-xs text-gray-500">Tools that bring customers to your store.</p>
      </header>

      <nav className="mb-4 flex gap-1.5 overflow-x-auto pb-1" aria-label="Marketing sections">
        {SECTIONS.map((s) => {
          const Icon = s.icon
          const on = s.id === section
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                on ? 'bg-gray-900 text-white' : 'border border-gray-100 bg-white text-gray-500 hover:text-gray-800'
              }`}
            >
              <Icon size={13} /> {s.label}
            </button>
          )
        })}
      </nav>

      <p className="mb-4 text-xs leading-relaxed text-gray-500">{active.blurb}</p>

      {section === 'seo' && (
        <SeoTab store={store} storeUrl={storeUrl} navigateTo={navigateTo} onStatusChange={setStatus} />
      )}
      {section === 'content' && <ContentKitTab store={store} storeUrl={storeUrl} />}
      {section === 'pixel' && (
        <MetaPixelTab store={store} isPremium={isPremium} navigateTo={navigateTo} />
      )}
      {section === 'google' && (
        <GoogleFeedTab
          store={store}
          storeUrl={storeUrl}
          eligible={status.eligible}
          seoActive={status.active}
        />
      )}
    </div>
  )
}
