//src/components/dashboard/SupportTab.jsx/
import { useState } from 'react'
import { HelpCircle, MessageSquare, Loader2, CheckCircle, AlertCircle, Zap } from 'lucide-react'

const CATEGORIES = [
  { value: 'general',       label: 'General Question' },
  { value: 'products',      label: 'Products & Store' },
  { value: 'billing',       label: 'Billing & Plans' },
  { value: 'technical',     label: 'Technical Issue' },
  { value: 'feature',       label: 'Feature Request' },
]

export default function SupportTab({
  store, plan, isGrowthOrPro,
  onSubmit, submitting, submitError, submitSuccess,
}) {
  const [form, setForm] = useState({ category: 'general', message: '' })

  const handleSubmit = () => onSubmit(form)

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Support</h1>
            {isGrowthOrPro && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 flex items-center gap-1">
                <Zap size={10} /> Priority
              </span>
            )}
          </div>
          <p className="text-gray-400 text-sm mt-1">
            {isGrowthOrPro
              ? 'Priority support — our team will get back to you faster.'
              : 'We\'re here to help. Send us a message below.'}
          </p>
        </div>
      </div>

      {/* Priority callout */}
      {isGrowthOrPro && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-2xl px-4 py-3">
          <Zap size={16} className="text-green-500 flex-shrink-0" />
          <p className="text-green-700 text-sm font-medium">
            {plan === 'pro' ? 'Pro' : 'Growth'} plan — you have priority support. Expect a faster response time. ⚡
          </p>
        </div>
      )}

      {/* Message form */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="font-bold text-gray-900 text-base flex items-center gap-2">
          <MessageSquare size={16} className="text-green-500" /> Send a Message
        </h2>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Category</label>
          <select
            value={form.category}
            onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 bg-white transition-all"
          >
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Message *</label>
          <textarea
            value={form.message}
            onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
            rows={5}
            placeholder="Describe your issue or question in detail..."
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 resize-none transition-all"
          />
        </div>

        {submitError && (
          <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-100 px-4 py-3 rounded-xl">
            <AlertCircle size={14} /> {submitError}
          </div>
        )}
        {submitSuccess && (
          <div className="flex items-center gap-2 text-green-700 text-sm bg-green-50 border border-green-100 px-4 py-3 rounded-xl">
            <CheckCircle size={14} /> {submitSuccess}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting || !form.message.trim()}
          className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-200 disabled:text-gray-400 text-white py-3 rounded-xl text-sm font-bold transition-all"
        >
          {submitting ? <Loader2 size={15} className="animate-spin" /> : <MessageSquare size={15} />}
          {submitting ? 'Sending...' : 'Send Message'}
        </button>
      </div>

      {/* Contact options */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <h2 className="font-bold text-gray-900 text-base">Other Ways to Reach Us</h2>
        <div className="space-y-2.5">
          <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-100 rounded-xl">
            <span className="text-green-600 text-lg">💬</span>
            <div>
              <p className="font-semibold text-sm text-gray-800">WhatsApp</p>
              <p className="text-gray-400 text-xs">Chat with us directly on WhatsApp for quick help</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl">
            <span className="text-gray-600 text-lg">📧</span>
            <div>
              <p className="font-semibold text-sm text-gray-800">Email Support</p>
              <p className="text-gray-400 text-xs">sellapage.ng@gmail.com — we reply within 24 hours</p>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <h2 className="font-bold text-gray-900 text-base">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {[
            { q: 'How do I share my store link?', a: 'Copy your link from the Dashboard tab and share it on WhatsApp, Instagram bio, or anywhere online.' },
            { q: 'How do customers order?', a: 'Customers tap the WhatsApp order button on your store page and are connected directly to your WhatsApp.' },
            { q: 'Can I upgrade or downgrade my plan?', a: 'Yes — go to Settings → Plan & Billing to manage your subscription.' },
            { q: 'What happens to my products if I downgrade?', a: 'Your products stay saved, but only up to your plan\'s limit will show on your store page.' },
          ].map(({ q, a }) => (
            <div key={q} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
              <p className="font-semibold text-gray-800 text-sm">{q}</p>
              <p className="text-gray-400 text-xs mt-1 leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
