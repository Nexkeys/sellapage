// src/components/dashboard/MarketplaceTab.jsx
// Dropshipping marketplace, Phase 0. One component, two tabs:
//   role="supply"   -> Supplier Hub
//   role="dropship" -> Dropship Marketplace
// Both are "coming soon" for now: what it will do, the waitlist, and a live
// checklist of what the vendor will need at launch so they can get ready now.
// Owner only (Dashboard.jsx does not render it for staff).
import { useState } from 'react'
import {
  Warehouse, PackageSearch, CheckCircle2, Circle, Clock, ArrowRight, Loader2, ExternalLink, BellRing,
} from 'lucide-react'
import { readInterest, readiness } from '../../utils/marketplace'

const COPY = {
  supply: {
    title: 'Supplier Hub',
    Icon: Warehouse,
    pitch:
      'Supply your products to sellers across Nigeria. Dropshippers add your products to their stores and sell them for you. You ship each order and get paid automatically the moment the customer pays.',
    steps: [
      ['Get approved', 'Apply once with your CAC, verified phone and a short video of your stock. Our team reviews every supplier.'],
      ['List your products', 'Put products from your Products tab on the marketplace with a wholesale price, and switch any of them off at any time.'],
      ['Ship and get paid', 'When a dropshipper makes a sale you get the order to ship, and your share is paid to your bank automatically.'],
    ],
    notify: 'Tell me when I can apply',
  },
  dropship: {
    title: 'Dropship Marketplace',
    Icon: PackageSearch,
    pitch:
      'Sell products without buying or holding stock. Pick products from approved suppliers, add them to your store at your own price, and keep the difference on every sale. The supplier ships to your customer.',
    steps: [
      ['Pick products', 'Browse approved suppliers and add their products to your store, right from here or from the public marketplace page.'],
      ['Set your price', 'Choose your selling price above the wholesale price. You see what you earn on every sale before you add it.'],
      ['Sell and earn', 'Customers pay on your store, the supplier ships, and your profit is paid to your bank automatically.'],
    ],
    notify: 'Tell me when it opens',
  },
}

export default function MarketplaceTab({ role, store, navigateTo, onJoin }) {
  const copy = COPY[role] || COPY.supply
  const { Icon } = copy
  const joined = readInterest(store)[role] === true
  const checks = readiness(store, role)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')

  const join = async () => {
    setJoining(true)
    setError('')
    try {
      await onJoin(role)
    } catch {
      setError('Could not save that. Please try again.')
    } finally {
      setJoining(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-gray-900">
            {copy.title}
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
              Coming soon
            </span>
          </h1>
          <p className="mt-0.5 text-xs text-gray-400">Part of the Sellapage Dropshipping Marketplace.</p>
        </div>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-green-600 to-emerald-700 p-5 text-white sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/15">
            <Icon size={20} />
          </div>
          <p className="text-sm leading-relaxed text-green-50">{copy.pitch}</p>
        </div>

        <div className="mt-5 rounded-xl bg-white/10 p-3.5">
          {joined ? (
            <p className="flex items-start gap-2 text-sm font-semibold">
              <BellRing size={16} className="mt-0.5 flex-shrink-0" />
              <span>You&apos;re on the waitlist. We&apos;ll notify you here and by email the moment it opens.</span>
            </p>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold">Be first in line when it opens.</p>
              <button
                type="button"
                onClick={join}
                disabled={joining}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-green-700 hover:bg-green-50 disabled:opacity-60"
              >
                {joining ? <Loader2 size={14} className="animate-spin" /> : <BellRing size={14} />}
                {copy.notify}
              </button>
            </div>
          )}
          {error && <p className="mt-2 text-xs font-semibold text-red-100">{error}</p>}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5">
        <h2 className="text-sm font-bold text-gray-900">How it will work</h2>
        <ol className="mt-3 space-y-3">
          {copy.steps.map(([title, text], i) => (
            <li key={title} className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-50 text-xs font-bold text-green-700">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">{title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5">
        <h2 className="text-sm font-bold text-gray-900">Get ready now</h2>
        <p className="mt-0.5 text-xs text-gray-500">
          {role === 'supply'
            ? 'Everything you will need to apply as a supplier. Anything you finish now is one less step at launch.'
            : 'What you will need to start dropshipping. Anything you finish now is one less step at launch.'}
        </p>
        <ul className="mt-3 divide-y divide-gray-50">
          {checks.map((c) => (
            <li key={c.key} className="flex items-center gap-3 py-2.5">
              {c.done ? (
                <CheckCircle2 size={17} className="flex-shrink-0 text-green-600" />
              ) : c.pending ? (
                <Clock size={17} className="flex-shrink-0 text-gray-300" />
              ) : (
                <Circle size={17} className="flex-shrink-0 text-gray-300" />
              )}
              <span className={`min-w-0 flex-1 text-sm ${c.done ? 'text-gray-500' : 'font-medium text-gray-800'}`}>{c.label}</span>
              {!c.done && c.tab && (
                <button
                  type="button"
                  onClick={() => navigateTo?.(c.tab)}
                  className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] font-bold text-gray-600 hover:bg-gray-50"
                >
                  {c.key === 'plan' ? 'Upgrade' : 'Set up'} <ArrowRight size={11} />
                </button>
              )}
              {c.pending && <span className="flex-shrink-0 text-[11px] text-gray-400">At launch</span>}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-2 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
        <a
          href="/dropshipping"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-semibold text-green-700 hover:underline"
        >
          See the public marketplace page <ExternalLink size={11} />
        </a>
        <button type="button" onClick={() => navigateTo?.('settings')} className="text-left font-semibold hover:text-gray-700 sm:text-right">
          Change your dropshipping choices in Settings
        </button>
      </div>
    </div>
  )
}
