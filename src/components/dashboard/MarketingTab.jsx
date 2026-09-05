//src/components/dashboard/MarketingTab.jsx/
//
// Rebuilt 2026-09-05. The previous version was a "Monthly Success Score", a
// daily checklist of busywork ("Price Audit: review your catalog prices"), and
// two Growth Campaign cards that were WAITLIST buttons - one of them a waitlist
// for Promotions & Discounts, which already ships as its own tab. None of it
// could get a vendor a single customer.
//
// The rule for anything that lives here now: it has to help a vendor GET a
// customer, not help them admire their business. Reporting belongs in Analytics
// and is deliberately not duplicated here.
import { useState } from 'react'
import { Search, Megaphone } from 'lucide-react'
import SeoTab from './marketing/SeoTab'

const SECTIONS = [
  {
    id: 'seo',
    label: 'Get found',
    icon: Search,
    blurb: 'Make Google and AI assistants describe your store to people searching for what you sell.',
  },
]

export default function MarketingTab({ store, storeUrl, navigateTo }) {
  const [section, setSection] = useState('seo')
  const active = SECTIONS.find((s) => s.id === section) || SECTIONS[0]

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <header className="mb-4">
        <div className="flex items-center gap-2">
          <Megaphone size={18} className="text-gray-400" />
          <h1 className="font-display text-lg font-extrabold text-gray-900">Marketing</h1>
        </div>
        <p className="mt-0.5 text-xs text-gray-500">
          Tools that bring customers to your store.
        </p>
      </header>

      {/* Sub-tabs. Rendered even with one section so adding the next ones does
          not move anything the vendor has already learned to find. */}
      {SECTIONS.length > 1 && (
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
                  on ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 border border-gray-100 hover:text-gray-800'
                }`}
              >
                <Icon size={13} /> {s.label}
              </button>
            )
          })}
        </nav>
      )}

      <p className="mb-4 text-xs leading-relaxed text-gray-500">{active.blurb}</p>

      {section === 'seo' && <SeoTab store={store} storeUrl={storeUrl} navigateTo={navigateTo} />}
    </div>
  )
}
