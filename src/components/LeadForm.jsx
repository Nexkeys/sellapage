//src/components/LeadForm.jsx/
import { useState } from 'react'
import { CheckCircle, Loader2, MessageCircle, User, Phone, HelpCircle } from 'lucide-react'
import { saveLead } from '../firebase/leads'

export default function LeadForm({ storeId, storeName, whatsappNumber, leadType = 'product' }) {
  const [form, setForm]         = useState({ name: '', phone: '', interest: '' })
  const [loading, setLoading]   = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError]       = useState('')

  const update = field => e => setForm(p => ({ ...p, [field]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.name.trim() || !form.phone.trim()) {
      setError('Please enter your name and phone number.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await saveLead(storeId, storeName, { ...form, leadType })
      setSubmitted(true)
    } catch {
      setError('Could not send your message. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center shadow-sm shadow-green-100/80">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={28} className="text-green-600" />
        </div>
        <h3 className="font-bold text-gray-900 text-xl mb-2">Message received!</h3>
        <p className="text-gray-500 text-sm">
          <span className="font-semibold text-gray-700">{storeName}</span> will reach out to you on WhatsApp shortly.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-gray-100/80 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex items-start gap-3">
        <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
          <MessageCircle size={18} className="text-green-600" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 text-base">Have a question?</h3>
          <p className="text-gray-500 text-sm mt-0.5">
            Leave your details and <span className="font-medium text-gray-700">{storeName}</span> will reply via WhatsApp.
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
              <User size={12} />Your Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={update('name')}
              placeholder="E.g. Amara Okafor"
              className="w-full px-4 py-3 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-xl outline-none placeholder:text-gray-400 transition-all focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
              <Phone size={12} />WhatsApp Number
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={update('phone')}
              placeholder="E.g. 08012345678"
              className="w-full px-4 py-3 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-xl outline-none placeholder:text-gray-400 transition-all focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
            />
          </div>
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
            <HelpCircle size={12} />What are you looking for?
            <span className="text-gray-400 font-normal normal-case tracking-normal ml-1">(Optional)</span>
          </label>
          <textarea
            value={form.interest}
            onChange={update('interest')}
            placeholder="E.g. I'm interested in the blue dress, do you have size M?"
            rows={3}
            className="w-full px-4 py-3 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-xl outline-none placeholder:text-gray-400 transition-all focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 resize-none"
          />
        </div>

        {error && (
          <p className="flex items-center gap-2 text-red-500 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-200 disabled:text-gray-400 text-white py-3.5 rounded-xl font-bold text-sm transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
        >
          {loading
            ? <><Loader2 size={16} className="animate-spin" />Sending...</>
            : <><MessageCircle size={16} />Send Enquiry</>
          }
        </button>
      </form>
    </div>
  )
}
