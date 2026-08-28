import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ShieldAlert, Upload, X, Loader2, CheckCircle2, ArrowLeft, Image as ImageIcon } from 'lucide-react'
import Reveal from '../components/Reveal'
import SEO from '../components/SEO'

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

const OFFENSE_OPTIONS = [
  { value: 'scam', label: 'Scam / Fraud' },
  { value: 'fake_products', label: 'Fake Products' },
  { value: 'non_delivery', label: 'Non-Delivery' },
  { value: 'identity_theft', label: 'Identity Theft' },
  { value: 'counterfeit', label: 'Counterfeit Goods' },
  { value: 'other', label: 'Other' },
]

const WHERE_MET_OPTIONS = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'twitter', label: 'Twitter / X' },
  { value: 'in_person', label: 'In-Person' },
  { value: 'phone', label: 'Phone Call' },
  { value: 'other', label: 'Other' },
  { value: 'unknown', label: 'Sellapage Live Stores' },
]

export default function ReportStore() {
  const fileInputRef = useRef(null)
  const [form, setForm] = useState({
    storeUrl: '',
    reporterName: '',
    reporterEmail: '',
    reporterPhone: '',
    whereMet: '',
    offenseType: '',
    description: '',
  })
  const [screenshots, setScreenshots] = useState([])
  const [previews, setPreviews] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || [])
    if (screenshots.length + files.length > 3) {
      setError('Maximum 3 screenshots allowed.')
      return
    }
    const valid = files.filter(f => {
      if (f.size > 5 * 1024 * 1024) {
        setError('Each screenshot must be under 5MB.')
        return false
      }
      if (!f.type.startsWith('image/')) {
        setError('Only image files are accepted.')
        return false
      }
      return true
    })
    setError('')
    const newPreviews = valid.map(f => URL.createObjectURL(f))
    setScreenshots(prev => [...prev, ...valid])
    setPreviews(prev => [...prev, ...newPreviews])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeScreenshot = (index) => {
    URL.revokeObjectURL(previews[index])
    setScreenshots(prev => prev.filter((_, i) => i !== index))
    setPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const validate = () => {
    if (!form.storeUrl.trim()) return 'Please enter the store URL or name.'
    if (!form.reporterName.trim()) return 'Please enter your full name.'
    if (!form.reporterEmail.trim()) return 'Please enter your email address.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.reporterEmail.trim())) return 'Please enter a valid email address.'
    if (!form.reporterPhone.trim()) return 'Please enter your phone / WhatsApp number.'
    if (!form.whereMet) return 'Please select where you met this vendor.'
    if (!form.offenseType) return 'Please select what you are reporting.'
    if (!form.description.trim()) return 'Please describe what happened.'
    if (form.description.trim().length < 20) return 'Please provide more detail (at least 20 characters).'
    if (screenshots.length === 0) return 'Please upload at least one screenshot as proof.'
    return null
  }

  const uploadToCloudinary = async (file) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('upload_preset', UPLOAD_PRESET)
    fd.append('folder', 'sellapage/reports')
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST', body: fd,
    })
    if (!res.ok) throw new Error('Screenshot upload failed.')
    const data = await res.json()
    return data.secure_url
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    setSubmitting(true)
    try {
      const screenshotUrls = await Promise.all(screenshots.map(f => uploadToCloudinary(f)))

      const res = await fetch('/api/submit-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeUrl: form.storeUrl.trim(),
          reporterName: form.reporterName.trim(),
          reporterEmail: form.reporterEmail.trim(),
          reporterPhone: form.reporterPhone.trim(),
          whereMet: form.whereMet,
          offenseType: form.offenseType,
          description: form.description.trim(),
          screenshotUrls,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Submission failed.')
      setSubmitted(true)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 sm:p-10 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>
          <h1 className="font-display font-bold text-xl sm:text-2xl text-gray-900 mb-2">Report Submitted</h1>
          <p className="text-gray-500 text-sm mb-2">
            Thank you for helping keep Sellapage safe. We'll review your report within 24-48 hours.
          </p>
          <p className="text-gray-400 text-xs mb-6">Report ID: {Math.random().toString(36).slice(2, 10).toUpperCase()}</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
          >
            <ArrowLeft size={14} /> Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO
        title="Report a Store"
        description="Report a scam or fraudulent store on Sellapage. Help us keep the marketplace safe."
        url="/report-store"
        noIndex
      />
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex items-center gap-3">
          <Link to="/" className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0">
            <h1 className="font-display font-bold text-lg sm:text-xl text-gray-900 tracking-tight">Report a Store</h1>
            <p className="text-gray-400 text-xs">Help us keep the marketplace safe</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Error Banner */}
          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-3.5 text-red-600 text-sm font-medium flex items-start gap-2">
              <ShieldAlert size={16} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Store URL */}
          <Reveal className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 space-y-4">
            <h2 className="font-display font-bold text-sm text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 bg-green-50 rounded-lg flex items-center justify-center text-[10px] font-black text-green-600">1</span>
              Store Details
            </h2>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Store URL or Name *</label>
              <input
                type="text"
                name="storeUrl"
                value={form.storeUrl}
                onChange={handleChange}
                placeholder="e.g. sellapage.com.ng/denver-mall or Denver Mall"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
              />
            </div>
          </Reveal>

          {/* Reporter Info */}
          <Reveal delay={80} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 space-y-4">
            <h2 className="font-display font-bold text-sm text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 bg-green-50 rounded-lg flex items-center justify-center text-[10px] font-black text-green-600">2</span>
              Your Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Full Name *</label>
                <input
                  type="text"
                  name="reporterName"
                  value={form.reporterName}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Email Address *</label>
                <input
                  type="email"
                  name="reporterEmail"
                  value={form.reporterEmail}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Phone / WhatsApp *</label>
              <input
                type="tel"
                name="reporterPhone"
                value={form.reporterPhone}
                onChange={handleChange}
                placeholder="+234 801 234 5678"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
              />
            </div>
          </Reveal>

          {/* Report Details */}
          <Reveal delay={160} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 space-y-4">
            <h2 className="font-display font-bold text-sm text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 bg-green-50 rounded-lg flex items-center justify-center text-[10px] font-black text-green-600">3</span>
              Report Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Where did you meet this vendor? *</label>
                <select
                  name="whereMet"
                  value={form.whereMet}
                  onChange={handleChange}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all appearance-none"
                >
                  <option value="">Select one...</option>
                  {WHERE_MET_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">What are you reporting? *</label>
                <select
                  name="offenseType"
                  value={form.offenseType}
                  onChange={handleChange}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all appearance-none"
                >
                  <option value="">Select one...</option>
                  {OFFENSE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Describe what happened *</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Tell us what happened - include dates, amounts, and any relevant details..."
                rows={4}
                maxLength={1000}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all resize-none"
              />
              <p className="text-[10px] text-gray-400 mt-1 text-right">{form.description.length}/1000</p>
            </div>
          </Reveal>

          {/* Screenshot Upload */}
          <Reveal delay={240} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 space-y-4">
            <h2 className="font-display font-bold text-sm text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 bg-green-50 rounded-lg flex items-center justify-center text-[10px] font-black text-green-600">4</span>
              Screenshot Proof
            </h2>
            <p className="text-gray-400 text-xs">Upload up to 3 screenshots as evidence (max 5MB each, JPG or PNG).</p>

            {/* Previews */}
            {previews.length > 0 && (
              <div className="flex gap-2.5 flex-wrap">
                {previews.map((src, i) => (
                  <div key={i} className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border border-gray-200 group">
                    <img src={src} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeScreenshot(i)}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={10} />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-[8px] font-bold text-center py-0.5">
                      {i + 1}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Button */}
            {screenshots.length < 3 && (
              <label className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-gray-200 hover:border-green-400 rounded-xl px-4 py-5 cursor-pointer transition-colors group">
                <div className="w-10 h-10 bg-gray-100 group-hover:bg-green-50 rounded-xl flex items-center justify-center transition-colors">
                  <Upload size={18} className="text-gray-400 group-hover:text-green-600" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-gray-700">Tap to upload screenshot</p>
                  <p className="text-[10px] text-gray-400">{screenshots.length}/3 uploaded</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
            {screenshots.length >= 3 && (
              <div className="flex items-center gap-2 text-gray-400 text-xs">
                <ImageIcon size={14} /> Maximum screenshots reached (3/3)
              </div>
            )}
          </Reveal>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Submitting Report...
              </>
            ) : (
              <>
                <ShieldAlert size={16} /> Submit Report
              </>
            )}
          </button>

          <p className="text-center text-[10px] text-gray-400">
            False reports may result in account restrictions. We take every report seriously.
          </p>
        </form>
      </div>
    </div>
  )
}
