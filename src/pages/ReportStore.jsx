// src/pages/ReportStore.jsx
//
// Report a store (/report-store). Rebuilt 2026-10-08 in the style of the new
// public pages: how reporting works and safety tips up top, then the same four
// part form (store, you, what happened, proof) with a progress bar, choices as
// tappable chips, and the real report reference on the success screen.
// The form logic, validation and /api/submit-report call are unchanged.
import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldAlert, Upload, X, Loader2, CheckCircle2, ArrowLeft, Image as ImageIcon, FileWarning, SearchCheck, Ban, ShieldCheck, BadgeCheck, CreditCard, Camera,
  Check, AlertCircle,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Reveal from '../components/Reveal'
import SEO from '../components/SEO'
import { pageSeo } from '../data/seoPages'

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
  // The id the server saved the report under (submit-report.js), shown so
  // the reporter can quote it. It used to show a random string saved nowhere.
  const [reportId, setReportId] = useState('')
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
      setReportId(data.reportId || '')
      setSubmitted(true)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const steps = [
    ['Store', !!form.storeUrl.trim()],
    ['You', !!(form.reporterName.trim() && form.reporterEmail.trim() && form.reporterPhone.trim())],
    ['What happened', !!(form.whereMet && form.offenseType && form.description.trim().length >= 20)],
    ['Proof', screenshots.length > 0],
  ]
  const done = steps.filter(([, ok]) => ok).length
  const field = 'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-[14px] text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-forest-600 focus:ring-4 focus:ring-forest-50'
  const label = 'mb-1.5 block text-[13px] font-bold text-gray-800'
  const pick = (name, value) => setForm((prev) => ({ ...prev, [name]: value }))

  if (submitted) {
    return (
      <div className="min-h-screen overflow-x-clip bg-white font-body text-gray-900">
        <SEO {...pageSeo('/report-store')} url="/report-store" />
        <Navbar />
        <section className="relative px-4 py-16 sm:py-24">
          <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(60%_60%_at_50%_0%,#d5f1e1_0%,#fff_100%)]" />
          <div className="mx-auto max-w-lg rounded-[32px] bg-white p-8 text-center shadow-2xl shadow-forest-900/10 ring-1 ring-gray-100 sm:p-10" role="status">
            <span className="relative mx-auto flex h-20 w-20 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-forest-600/15 [animation-iteration-count:2]" />
              <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-forest text-white animate-pop"><CheckCircle2 size={38} /></span>
            </span>
            <h1 className="mt-6 font-display text-[1.8rem] font-extrabold text-gray-950">Report received.</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-gray-600">Thank you for helping keep Sellapage safe. Our team reviews every report and may contact you by email or WhatsApp for more detail.</p>
            {reportId && (
              <div className="mt-6 rounded-2xl bg-gray-50 p-4">
                <p className="text-[12px] font-semibold text-gray-500">Your report reference</p>
                <p className="mt-1 break-all font-mono text-[15px] font-bold text-gray-900">{reportId}</p>
                <p className="mt-1 text-[11.5px] text-gray-400">Quote it if you contact us about this report.</p>
              </div>
            )}
            <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
              <Link to="/" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-forest px-5 py-3 text-[14px] font-bold text-white hover:bg-forest-700"><ArrowLeft size={15} />Back to home</Link>
              <Link to="/contact" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-[14px] font-bold text-gray-800 ring-1 ring-gray-200 hover:bg-gray-50">Contact us</Link>
            </div>
          </div>
        </section>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen overflow-x-clip bg-white font-body text-gray-900">
      <SEO {...pageSeo('/report-store')} url="/report-store" />
      <Navbar />

      <section className="relative overflow-hidden pb-8 pt-10 sm:pt-14">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(60%_60%_at_20%_0%,#fde7e7_0%,rgba(255,247,237,0.7)_40%,#fff_100%)]" />
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:px-8">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-md bg-red-50 px-2 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-red-700 ring-1 ring-red-100"><ShieldAlert size={13} />Trust and safety</span>
            <h1 className="mt-5 text-balance font-display text-[2.4rem] font-extrabold leading-[1.05] tracking-tight text-gray-950 sm:text-[3.2rem]">Report a store.</h1>
            <p className="mt-4 max-w-xl text-[15.5px] leading-relaxed text-gray-600 sm:text-[16.5px]">If a store on Sellapage scammed you, sold fake goods, did not deliver or broke the rules, tell us. Anyone can report, with or without a Sellapage account.</p>
            <ol className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[[FileWarning, 'You report', 'With screenshots as proof'], [SearchCheck, 'We review', 'Our team looks at every report'], [Ban, 'We act', 'Stores that break the rules are removed']].map(([I, t, d], i) => (
                <li key={t} className="relative flex items-center gap-3 rounded-2xl bg-white p-3.5 ring-1 ring-gray-100 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:block sm:p-4">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-forest-50 text-forest-600 sm:h-auto sm:w-auto sm:justify-start sm:bg-transparent"><I size={20} /></span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-bold text-gray-900 sm:mt-2"><span className="mr-1.5 text-[11px] font-extrabold text-gray-300">0{i + 1}</span>{t}</span>
                    <span className="block text-[12.5px] leading-snug text-gray-500">{d}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Reveal>
          <Reveal delay={120} direction="left" className="rounded-[28px] bg-forest p-6 text-white sm:p-7">
            <p className="flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-[0.14em] text-forest-100"><ShieldCheck size={15} />Before you pay any store</p>
            <ul className="mt-4 space-y-3.5">
              {[
                [BadgeCheck, 'Look for verification badges', 'A CAC verified or phone verified badge means the store proved who it is to us.'],
                [CreditCard, 'Pay on the store, not by transfer', 'Paying through the store checkout gives you a receipt and an order record.'],
                [ShieldCheck, 'Check the store guarantee', 'Many stores state what they will do if something goes wrong.'],
                [Camera, 'Keep screenshots', 'Chats, receipts and payment alerts help us act quickly.'],
              ].map(([I, t, d]) => (
                <li key={t} className="flex items-start gap-3">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/10"><I size={17} /></span>
                  <span><span className="block text-[14px] font-bold">{t}</span><span className="block text-[12.5px] leading-snug text-white/70">{d}</span></span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          {/* Progress through the four parts */}
          <div className="sticky top-16 z-20 -mx-4 mb-5 bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:px-5 sm:ring-1 sm:ring-gray-100">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13px] font-bold text-gray-800">{done === 4 ? 'Ready to send' : `${done} of 4 parts done`}</p>
              <div className="flex gap-1.5">{steps.map(([t, ok]) => <span key={t} title={t} className={`h-1.5 w-8 rounded-full transition-colors duration-500 sm:w-12 ${ok ? 'bg-forest-600' : 'bg-gray-200'}`} />)}</div>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {error && (
              <div className="flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 p-3.5 text-[13.5px] font-semibold text-red-700" role="alert">
                <AlertCircle size={17} className="mt-0.5 flex-shrink-0" /><span>{error}</span>
              </div>
            )}

            <Card n={1} title="The store" ok={steps[0][1]}>
              <label className={label} htmlFor="rs-store">Store link or name <span className="text-red-500">*</span></label>
              <input id="rs-store" type="text" name="storeUrl" value={form.storeUrl} onChange={handleChange} placeholder="sellapage.com.ng/storename or the store name" className={field} />
            </Card>

            <Card n={2} title="About you" ok={steps[1][1]} sub="Only our team sees this, to follow up on your report.">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div><label className={label} htmlFor="rs-name">Full name <span className="text-red-500">*</span></label><input id="rs-name" type="text" name="reporterName" autoComplete="name" value={form.reporterName} onChange={handleChange} className={field} /></div>
                <div><label className={label} htmlFor="rs-email">Email address <span className="text-red-500">*</span></label><input id="rs-email" type="email" name="reporterEmail" autoComplete="email" inputMode="email" value={form.reporterEmail} onChange={handleChange} className={field} /></div>
              </div>
              <div className="mt-3"><label className={label} htmlFor="rs-phone">Phone or WhatsApp <span className="text-red-500">*</span></label><input id="rs-phone" type="tel" name="reporterPhone" autoComplete="tel" inputMode="tel" value={form.reporterPhone} onChange={handleChange} placeholder="+234" className={field} /></div>
            </Card>

            <Card n={3} title="What happened" ok={steps[2][1]}>
              <p className={label}>What are you reporting? <span className="text-red-500">*</span></p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="What are you reporting">
                {OFFENSE_OPTIONS.map((o) => (
                  <button key={o.value} type="button" role="radio" aria-checked={form.offenseType === o.value} onClick={() => pick('offenseType', o.value)}
                    className={`rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold transition ${form.offenseType === o.value ? 'bg-red-600 text-white shadow-md shadow-red-600/20' : 'bg-gray-50 text-gray-700 ring-1 ring-gray-100 hover:bg-red-50'}`}>{o.label}</button>
                ))}
              </div>
              <p className={`${label} mt-5`}>Where did you meet this vendor? <span className="text-red-500">*</span></p>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Where did you meet this vendor">
                {WHERE_MET_OPTIONS.map((o) => (
                  <button key={o.value} type="button" role="radio" aria-checked={form.whereMet === o.value} onClick={() => pick('whereMet', o.value)}
                    className={`rounded-full px-3.5 py-2 text-[13px] font-semibold transition ${form.whereMet === o.value ? 'bg-forest text-white' : 'bg-gray-50 text-gray-700 ring-1 ring-gray-100 hover:bg-forest-50'}`}>{o.label}</button>
                ))}
              </div>
              <div className="mt-5">
                <label className={label} htmlFor="rs-desc">Describe what happened <span className="text-red-500">*</span></label>
                <textarea id="rs-desc" name="description" value={form.description} onChange={handleChange} rows={5} maxLength={1000} placeholder="Include dates, amounts and anything that helps us understand." className={`${field} resize-none`} />
                <p className={`mt-1 text-right text-[11.5px] tabular-nums ${form.description.trim().length > 0 && form.description.trim().length < 20 ? 'text-amber-600' : 'text-gray-400'}`}>{form.description.length}/1000{form.description.trim().length > 0 && form.description.trim().length < 20 ? ' · a little more detail, please' : ''}</p>
              </div>
            </Card>

            <Card n={4} title="Screenshot proof" ok={steps[3][1]} sub="Up to 3 images, 5MB each, JPG or PNG. At least one is needed.">
              {previews.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2.5">
                  {previews.map((src, i) => (
                    <div key={i} className="relative h-24 w-24 overflow-hidden rounded-2xl ring-1 ring-gray-200 animate-pop">
                      <img src={src} alt={`Screenshot ${i + 1}`} className="h-full w-full object-cover" />
                      <button type="button" onClick={() => removeScreenshot(i)} aria-label={`Remove screenshot ${i + 1}`} className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-gray-900/80 text-white"><X size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
              {screenshots.length < 3 ? (
                <label className="group flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 px-4 py-7 text-center transition hover:border-forest-300 hover:bg-forest-50/40">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-500 transition group-hover:bg-forest-50 group-hover:text-forest-600"><Upload size={20} /></span>
                  <span className="text-[14px] font-bold text-gray-800">Add a screenshot</span>
                  <span className="text-[12px] text-gray-500">{screenshots.length} of 3 added</span>
                  <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/jpg" onChange={handleFileChange} className="sr-only" />
                </label>
              ) : <p className="flex items-center gap-2 text-[13px] text-gray-500"><ImageIcon size={15} />That is the most you can add (3 of 3).</p>}
            </Card>

            <button type="submit" disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 py-4 text-[15px] font-bold text-white shadow-xl shadow-red-600/20 transition hover:bg-red-700 disabled:bg-red-300">
              {submitting ? <><Loader2 size={17} className="animate-spin" />Sending your report...</> : <><ShieldAlert size={17} />Send report</>}
            </button>
            <p className="text-center text-[12px] text-gray-500">False reports may be rejected. We take every report seriously.</p>
          </form>
        </div>
      </section>

      <Footer />
    </div>
  )
}

function Card({ n, title, sub, ok, children }) {
  return (
    <section className={`rounded-[24px] bg-white p-5 transition sm:p-6 ${ok ? 'ring-2 ring-forest-200' : 'ring-1 ring-gray-100'} shadow-[0_1px_2px_rgba(16,24,40,0.04)]`}>
      <div className="mb-4 flex items-start gap-3">
        <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-[13px] font-extrabold transition-colors ${ok ? 'bg-forest-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{ok ? <Check size={15} strokeWidth={3} /> : n}</span>
        <div><h2 className="font-display text-[17px] font-extrabold text-gray-950">{title}</h2>{sub && <p className="text-[12.5px] text-gray-500">{sub}</p>}</div>
      </div>
      {children}
    </section>
  )
}
