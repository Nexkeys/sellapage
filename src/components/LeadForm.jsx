import { useState } from 'react'
import { CheckCircle, Loader2 } from 'lucide-react'
import { saveLead } from '../firebase/leads'

export default function LeadForm({ storeId, storeName, whatsappNumber }) {
  const [form, setForm] = useState({ name: '', phone: '', interest: '' })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const update = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.phone.trim()) {
      setError('Please enter your name and phone number.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await saveLead(storeId, storeName, form)
      setSubmitted(true)
    } catch {
      setError('Could not send your message. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="bg-brand-50 border border-brand-200 rounded-2xl p-8 text-center">
        <CheckCircle size={44} className="text-brand-500 mx-auto mb-3" />
        <h3 className="font-display font-bold text-gray-900 text-xl mb-2">Message received!</h3>
        <p className="text-gray-500 text-sm">
          <span className="font-semibold">{storeName}</span> will reach out to you on WhatsApp shortly.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h3 className="font-display font-bold text-gray-900 text-xl mb-1">Have a question?</h3>
      <p className="text-gray-500 text-sm mb-5">
        Leave your details and <span className="font-medium text-gray-700">{storeName}</span> will reply via WhatsApp.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Name</label>
          <input
            type="text"
            value={form.name}
            onChange={update('name')}
            placeholder="E.g. Amara Okafor"
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">WhatsApp Number</label>
          <input
            type="tel"
            value={form.phone}
            onChange={update('phone')}
            placeholder="E.g. 08012345678"
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            What are you looking for?
            <span className="text-gray-400 font-normal"> (Optional)</span>
          </label>
          <textarea
            value={form.interest}
            onChange={update('interest')}
            placeholder="E.g. I'm interested in the blue dress, do you have size M?"
            rows={3}
            className="input-field resize-none"
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-gray-200 disabled:text-gray-400 text-white py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Sending...
            </>
          ) : (
            'Send Enquiry'
          )}
        </button>
      </form>
    </div>
  )
}