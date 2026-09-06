//src/components/dashboard/SupportTab.jsx/
import { useState } from 'react'
import {
  HelpCircle,
  MessageSquare,
  Loader2,
  CheckCircle,
  AlertCircle,
  Zap,
  Mail,
  Send,
  ChevronDown,
} from 'lucide-react'

const CATEGORIES = [
  { value: 'general',       label: 'General Question' },
  { value: 'products',      label: 'Products and Store' },
  { value: 'billing',       label: 'Billing and Plans' },
  { value: 'technical',     label: 'Technical Issue' },
  { value: 'feature',       label: 'Feature Request' },
]

const FAQS = [
  { q: 'How do I share my store link?', a: 'Copy your link from the Dashboard tab and share it on WhatsApp, Instagram, or anywhere online.' },
  { q: 'How do customers order?', a: 'Customers use the order button on your store page and connect directly through your active order flow.' },
  { q: 'Can I upgrade or downgrade my plan?', a: 'Yes. Go to Settings, then Plan and Billing to manage your subscription.' },
  { q: 'What happens to my products if I downgrade?', a: 'Your products stay saved, but only the amount allowed by your plan will show on your store page.' },
]

// isGrowthOrPro deliberately includes premium, so this banner shows for Growth,
// Pro AND Premium. The old label was a two-branch ternary that special-cased
// 'pro' and defaulted everything else to 'Growth', which told Premium vendors
// they were on Growth. A lookup keeps each plan correct and degrades to neutral
// wording rather than naming the wrong plan if a new tier is added later.
const PRIORITY_PLAN_LABELS = {
  growth: 'Growth',
  pro: 'Pro',
  premium: 'Premium',
}

export default function SupportTab({
  store, plan, isGrowthOrPro,
  onSubmit, submitting, submitError, submitSuccess,
}) {
  const [form, setForm] = useState({ category: 'general', message: '' })
  const [openFaq, setOpenFaq] = useState(FAQS[0].q)

  const handleSubmit = () => onSubmit(form)

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-5">
      <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-green-600">
              Support Desk
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">Support</h1>
              {isGrowthOrPro && (
                <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-[11px] font-bold text-green-700">
                  <Zap size={11} /> Priority
                </span>
              )}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-gray-400 sm:text-sm">
              Send a clear message and the Sellapage team will follow up with your store details attached.
            </p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-500">
            <span className="font-bold text-gray-800">{store?.storeName || store?.businessName || 'Your store'}</span>
            <span className="block capitalize">{plan || 'starter'} plan</span>
          </div>
        </div>
      </div>

      {isGrowthOrPro && (
        <div className="flex items-start gap-3 rounded-2xl border border-green-100 bg-green-50 px-4 py-3">
          <Zap size={16} className="mt-0.5 flex-shrink-0 text-green-600" />
          <p className="text-sm font-medium leading-relaxed text-green-800">
            {PRIORITY_PLAN_LABELS[plan]
              ? `${PRIORITY_PLAN_LABELS[plan]} support is prioritized for faster review.`
              : 'Your support requests are prioritized for faster review.'}
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-600">
            <MessageSquare size={16} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900">Send a Message</h2>
            <p className="mt-0.5 text-[11px] text-gray-400">Choose a category and tell us what you need help with.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700">Category</label>
            <div className="relative">
              <select
                value={form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 pr-9 text-sm outline-none transition-all focus:border-green-400 focus:ring-2 focus:ring-green-400/20"
              >
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700">Message *</label>
            <textarea
              value={form.message}
              onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
              rows={6}
              placeholder="Describe the issue or question clearly."
              className="w-full resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition-all placeholder:text-gray-400 focus:border-green-400 focus:ring-2 focus:ring-green-400/20"
            />
          </div>

          {submitError && (
            <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
              <AlertCircle size={14} /> {submitError}
            </div>
          )}
          {submitSuccess && (
            <div className="flex items-center gap-2 rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
              <CheckCircle size={14} /> {submitSuccess}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || !form.message.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 py-3 text-sm font-bold text-white transition-all hover:bg-green-600 disabled:bg-gray-200 disabled:text-gray-400"
          >
            {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            {submitting ? 'Sending...' : 'Send Message'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-50 text-green-600">
              <MessageSquare size={16} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">WhatsApp</p>
              <p className="text-[11px] text-gray-400"><a href="https://wa.me/2348120525256" target="_blank" rel="noopener noreferrer">Click Here To Send Us A Message</a></p>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-gray-500">Use this when you need a quick clarification or want to continue a support conversation.</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50 text-gray-600">
              <Mail size={16} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Email Support</p>
              <p className="text-[11px] text-gray-400">sellapage.ng@gmail.com</p>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-gray-500">Use email for account, billing, or technical issues that need more detail.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-600">
            <HelpCircle size={16} />
          </div>
          <h2 className="text-sm font-bold text-gray-900">Frequently Asked Questions</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {FAQS.map(({ q, a }) => {
            const isOpen = openFaq === q
            return (
              <button
                key={q}
                type="button"
                onClick={() => setOpenFaq(isOpen ? '' : q)}
                className="w-full py-3 text-left"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-gray-800">{q}</span>
                  <ChevronDown size={14} className={`flex-shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </span>
                {isOpen && (
                  <span className="mt-1 block text-xs leading-relaxed text-gray-400">{a}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
