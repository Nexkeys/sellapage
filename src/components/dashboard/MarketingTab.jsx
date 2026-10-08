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
import { Search, Megaphone, ShoppingBag, Image as ImageIcon, MapPin, ShieldCheck, ChevronRight } from 'lucide-react'
import SeoTab from './marketing/SeoTab'
import GoogleFeedTab from './marketing/GoogleFeedTab'
import ContentKitTab from './marketing/ContentKitTab'
import GoogleBusinessTab from './marketing/GoogleBusinessTab'
import GuaranteeTab from './marketing/GuaranteeTab'
import { auth } from '../../firebase/auth'

const SECTIONS = [
  {
    id: 'seo',
    label: 'Get found',
    title: 'Get found when customers search.',
    icon: Search,
    blurb: 'Control how your store is described on search engines and AI assistants. The better your information, the easier it is for new customers to find and trust you.',
  },
  {
    id: 'google',
    label: 'Free Google listings',
    title: 'Your products on Google, without paying for ads.',
    icon: ShoppingBag,
    blurb: 'Put your products on Google Search and Shopping without paying for ads.',
  },
  {
    id: 'maps',
    icon: MapPin,
    label: 'Google Maps',
    title: 'Be found by customers nearby.',
    // Free on every plan on purpose: it sends traffic to Google, costs us
    // nothing to run, and it is the only section that works for service and
    // booking vendors, who get nothing from the product feed.
    blurb: 'Show up when someone nearby searches for what you sell, and collect the reviews that keep you there.',
  },
  {
    id: 'content',
    icon: ImageIcon,
    label: 'Post kit',
    title: 'Ready-to-post content in seconds.',
    // Available on every plan, deliberately. It costs nothing to run (the card
    // is drawn in the browser), and a Starter vendor who uses it daily is the
    // one most likely to notice the locked sections next to it.
    blurb: 'Turn a product into a ready-to-post image, caption and hashtags for Instagram, WhatsApp status or TikTok.',
  },
  {
    id: 'guarantee',
    icon: ShieldCheck,
    label: 'Your guarantee',
    title: 'A promise buyers can trust.',
    // The only section that closes a sale rather than starting one. Every other
    // section brings a stranger to the page; this is what convinces them to pay
    // a name they have never bought from before.
    blurb: 'Give buyers a promise they can hold you to, so a stranger has a reason to trust you.',
  },
]

export default function MarketingTab({ store, storeUrl, products = [], navigateTo }) {
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
    <div className="mx-auto max-w-[1400px] p-4 sm:p-6">
      {/* Header (2026-10-07 design): where you are, what this section does. */}
      <nav className="mb-3 flex items-center gap-1.5 text-[12.5px] text-gray-500" aria-label="Breadcrumb">
        <Megaphone size={13} className="text-gray-400" /> Marketing <ChevronRight size={13} className="text-gray-300" /> <span className="font-semibold text-gray-800">{active.label}</span>
      </nav>
      <header className="relative mb-5 flex items-start gap-3 sm:gap-4">
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-forest-50 text-forest-600 sm:h-12 sm:w-12"><active.icon size={22} /></span>
        <div className="min-w-0 flex-1">
          <h1 className="text-balance font-display text-[1.6rem] font-extrabold leading-tight tracking-tight text-gray-950 sm:text-[2.1rem]">{active.title}</h1>
          <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-gray-500">{active.blurb}</p>
        </div>
        <p className="hidden -rotate-6 text-[22px] leading-[1.05] text-forest-700 lg:block" style={{ fontFamily: '"Caveat", cursive', fontWeight: 600 }}>More visibility.<br />More customers.</p>
      </header>

      <nav className="mb-5 flex gap-1 overflow-x-auto rounded-2xl border border-gray-100 bg-white p-1.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] [scrollbar-width:none]" aria-label="Marketing sections">
        {SECTIONS.map((s) => {
          const Icon = s.icon
          const on = s.id === section
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              aria-current={on ? 'page' : undefined}
              className={`inline-flex flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-colors ${
                on ? 'bg-forest text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon size={15} /> {s.label}
            </button>
          )
        })}
      </nav>

      {section === 'seo' && (
        <SeoTab store={store} storeUrl={storeUrl} navigateTo={navigateTo} onStatusChange={setStatus} />
      )}
      {/* Every section shares Get found's layout: settings left, preview right. */}
      {section === 'maps' && <GoogleBusinessTab store={store} storeUrl={storeUrl} />}
      {section === 'content' && <ContentKitTab store={store} storeUrl={storeUrl} />}
      {section === 'guarantee' && <GuaranteeTab store={store} />}
      {section === 'google' && (
        <GoogleFeedTab
          store={store}
          storeUrl={storeUrl}
          products={products}
          navigateTo={navigateTo}
          eligible={status.eligible}
          seoActive={status.active}
        />
      )}
    </div>
  )
}
