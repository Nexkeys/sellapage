//src/components/dashboard/JobListingsTab.jsx/
// Self-contained dashboard tab (fetches/mutates its own data, like SellaAI.jsx)
// rather than being fully prop-drilled through Dashboard.jsx's state machine —
// keeps this large new module isolated from the existing 2000+ line dashboard
// state without touching it beyond the single render line.
import { useCallback, useEffect, useState } from 'react'
import {
  Briefcase, Plus, Edit2, Trash2, UploadCloud, X, Loader2, AlertCircle,
  ImageIcon, ToggleLeft, ToggleRight, Lock, Sparkles, Search, ChevronLeft,
  ChevronRight, CheckCircle2, MapPin, Clock, Wallet, Tag,
} from 'lucide-react'
import { auth } from '../../firebase/auth'
import { uploadSingleImage } from '../../firebase/products'
import { JOB_CATEGORIES, JOB_TYPES, JOB_TYPE_BADGE, JOB_STATUS_BADGE, getCategoryLabel, getJobTypeLabel } from '../../utils/jobCategories'

const JOB_LISTING_LIMITS = { starter: 5, growth: 25, pro: 50, premium: 999999 }
const PER_PAGE = 10

const EMPTY_FORM = {
  title: '', pay: '', mustHaves: '', location: '', availabilityTimeline: '',
  jobType: '', category: '', description: '', imageUrl: '',
}

async function callJobsApi(action, { method = 'GET', body, storeId } = {}) {
  const user = auth.currentUser
  if (!user) throw new Error('Please sign in again.')
  const token = await user.getIdToken()
  const qs = method === 'GET' && storeId ? `&storeId=${storeId}` : ''
  const res = await fetch(`/api/job-listings?action=${action}${qs}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.')
  return data
}

export default function JobListingsTab({ store }) {
  const storeId = store?.id
  const plan = store?.plan || 'starter'
  const canUseAI = store?.hasGrowthFeatures ?? (plan === 'growth' || plan === 'pro' || plan === 'premium')
  const maxJobs = store?.maxJobListings ?? JOB_LISTING_LIMITS[plan] ?? JOB_LISTING_LIMITS.starter

  const [contactSaved, setContactSaved] = useState(!!store?.jobContactSavedAt)
  const [contactForm, setContactForm] = useState({
    whatsapp: store?.jobContactWhatsapp || '',
    email: store?.jobContactEmail || store?.email || '',
    applicationLink: store?.jobApplicationLink || '',
  })
  const [savingContact, setSavingContact] = useState(false)
  const [contactError, setContactError] = useState('')
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editingJob, setEditingJob] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const [aiNotes, setAiNotes] = useState('')
  const [showAiNotes, setShowAiNotes] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [aiError, setAiError] = useState('')

  const [deleting, setDeleting] = useState(null)
  const [toggling, setToggling] = useState(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const loadJobs = useCallback(async () => {
    if (!storeId) return
    setLoading(true)
    setListError('')
    try {
      const data = await callJobsApi('list', { storeId })
      setJobs(data.jobs || [])
    } catch (err) {
      setListError(err.message)
    } finally {
      setLoading(false)
    }
  }, [storeId])

  useEffect(() => {
    if (contactSaved) loadJobs()
    else setLoading(false)
  }, [contactSaved, loadJobs])

  const handleSaveContact = async () => {
    setContactError('')
    if (!contactForm.whatsapp.trim() || !contactForm.email.trim()) {
      return setContactError('Please provide your WhatsApp number and email.')
    }
    setSavingContact(true)
    try {
      await callJobsApi('save-contact', {
        method: 'POST',
        body: { storeId, ...contactForm },
      })
      setContactSaved(true)
      setShowSuccessModal(true)
    } catch (err) {
      setContactError(err.message)
    } finally {
      setSavingContact(false)
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingJob(null)
    setForm(EMPTY_FORM)
    setImageFile(null)
    setImagePreview('')
    setFormError('')
    setAiNotes('')
    setShowAiNotes(false)
    setAiError('')
  }

  const startEdit = (job) => {
    setEditingJob(job)
    setForm({
      title: job.title, pay: job.pay, mustHaves: job.mustHaves, location: job.location,
      availabilityTimeline: job.availabilityTimeline, jobType: job.jobType, category: job.category,
      description: job.description, imageUrl: job.imageUrl || '',
    })
    setImagePreview(job.imageUrl || '')
    setImageFile(null)
    setShowForm(true)
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setFormError('Image must be under 5MB.')
      return
    }
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result)
    reader.readAsDataURL(file)
  }

  const handleGenerateDescription = async () => {
    setAiError('')
    if (!form.title.trim()) {
      setAiError('Please enter a job title first.')
      return
    }
    setGenerating(true)
    try {
      const user = auth.currentUser
      const token = await user.getIdToken()
      const res = await fetch('/api/ai-describe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ storeId, mode: 'job', jobTitle: form.title, notes: aiNotes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate description.')
      setForm(prev => ({ ...prev, description: data.description }))
      setShowAiNotes(false)
    } catch (err) {
      setAiError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async () => {
    setFormError('')
    const required = ['title', 'pay', 'mustHaves', 'location', 'availabilityTimeline', 'jobType', 'category', 'description']
    for (const field of required) {
      if (!form[field] || !form[field].trim()) {
        setFormError('Please fill in all required fields.')
        return
      }
    }
    setSaving(true)
    try {
      let imageUrl = form.imageUrl
      if (imageFile) {
        imageUrl = await uploadSingleImage(imageFile, 'sellapage/jobs')
      }

      if (editingJob) {
        await callJobsApi('update', {
          method: 'POST',
          body: { storeId, jobId: editingJob.id, ...form, imageUrl },
        })
      } else {
        await callJobsApi('create', {
          method: 'POST',
          body: { storeId, ...form, imageUrl },
        })
      }
      resetForm()
      loadJobs()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (jobId) => {
    if (!window.confirm('Delete this job listing? This cannot be undone.')) return
    setDeleting(jobId)
    try {
      await callJobsApi('delete', { method: 'POST', body: { storeId, jobId } })
      setJobs(prev => prev.filter(j => j.id !== jobId))
    } catch (err) {
      alert(err.message)
    } finally {
      setDeleting(null)
    }
  }

  const handleToggle = async (job) => {
    setToggling(job.id)
    const prevActive = job.isActive
    setJobs(prev => prev.map(j => j.id === job.id ? { ...j, isActive: !prevActive } : j))
    try {
      await callJobsApi('toggle', { method: 'POST', body: { storeId, jobId: job.id } })
    } catch (err) {
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, isActive: prevActive } : j))
      alert(err.message)
    } finally {
      setToggling(null)
    }
  }

  const maxLabel = maxJobs >= 999999 ? 'Unlimited' : maxJobs
  const limitReached = maxJobs < 999999 && jobs.length >= maxJobs
  const pct = maxJobs >= 999999 ? 0 : Math.min(100, Math.round((jobs.length / maxJobs) * 100))

  const filteredJobs = jobs.filter(j => (j.title || '').toLowerCase().includes(searchTerm.trim().toLowerCase()))
  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / PER_PAGE))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedJobs = filteredJobs.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE)

  // ---- First-run gate: contact info required before posting ----
  if (!contactSaved) {
    return (
      <div className="p-4 sm:p-5 max-w-lg mx-auto space-y-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Briefcase size={20} className="text-green-500" /> Job Listings
          </h1>
          <p className="text-gray-400 text-xs mt-0.5">Post job openings from your dashboard, available on every plan.</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 space-y-4">
          <div>
            <p className="font-bold text-gray-900 text-sm">Before you start</p>
            <p className="text-gray-400 text-xs mt-0.5">Save your contact details so applicants can reach you. You can update these anytime.</p>
          </div>
          {contactError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
              <AlertCircle size={14} /> {contactError}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">WhatsApp Number (with country code) *</label>
            <input
              value={contactForm.whatsapp}
              onChange={e => setContactForm(prev => ({ ...prev, whatsapp: e.target.value }))}
              placeholder="e.g. +2348012345678"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none bg-white focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email *</label>
            <input
              value={contactForm.email}
              onChange={e => setContactForm(prev => ({ ...prev, email: e.target.value }))}
              placeholder="you@business.com"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none bg-white focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Application Link (optional)</label>
            <input
              value={contactForm.applicationLink}
              onChange={e => setContactForm(prev => ({ ...prev, applicationLink: e.target.value }))}
              placeholder="Google Form, careers page, etc."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none bg-white focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all"
            />
          </div>
          <button
            onClick={handleSaveContact}
            disabled={savingContact}
            className="w-full px-5 py-2.5 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
          >
            {savingContact ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : 'Save & Continue'}
          </button>
        </div>

        {showSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center space-y-3">
              <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto">
                <CheckCircle2 size={26} className="text-green-500" />
              </div>
              <p className="font-bold text-gray-900 text-base">Contact Info Saved</p>
              <p className="text-gray-400 text-xs">You can now post job listings from this tab.</p>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold transition-all"
              >
                Continue
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  const JobForm = () => (
    <div className="p-4 space-y-4">
      {formError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
          <AlertCircle size={14} /> {formError}
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Job Title *</label>
          <input value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))} placeholder="e.g. Social Media Manager" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none bg-white focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Pay / Offer *</label>
          <input value={form.pay} onChange={e => setForm(prev => ({ ...prev, pay: e.target.value }))} placeholder="e.g. ₦120,000/month or Negotiable" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none bg-white focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all" />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Category *</label>
          <select value={form.category} onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none bg-white focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all">
            <option value="">Select category</option>
            {JOB_CATEGORIES.map(c => <option key={c.slug} value={c.slug}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Job Type *</label>
          <select value={form.jobType} onChange={e => setForm(prev => ({ ...prev, jobType: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none bg-white focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all">
            <option value="">Select type</option>
            {JOB_TYPES.map(t => <option key={t.slug} value={t.slug}>{t.label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Location *</label>
          <input value={form.location} onChange={e => setForm(prev => ({ ...prev, location: e.target.value }))} placeholder="e.g. Lagos (Remote)" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none bg-white focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Availability Timeline *</label>
          <input value={form.availabilityTimeline} onChange={e => setForm(prev => ({ ...prev, availabilityTimeline: e.target.value }))} placeholder="e.g. Immediate" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none bg-white focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Must-Haves / Requirements *</label>
        <textarea value={form.mustHaves} onChange={e => setForm(prev => ({ ...prev, mustHaves: e.target.value }))} rows={2} placeholder="e.g. 2+ years experience, good communication skills..." className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none bg-white focus:border-green-400 focus:ring-2 focus:ring-green-400/20 resize-none transition-all" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-semibold text-gray-700">Description *</label>
          {canUseAI ? (
            <button type="button" onClick={() => setShowAiNotes(v => !v)} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-all border border-green-200">
              <Sparkles size={11} /> Generate with AI
            </button>
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-gray-400 font-semibold px-2 py-1 rounded-lg bg-gray-50 border border-gray-200">
              <Lock size={10} /> AI — Growth+
            </span>
          )}
        </div>
        {showAiNotes && canUseAI && (
          <div className="mb-2 p-3 bg-green-50/50 border border-green-100 rounded-xl space-y-2">
            <p className="text-[11px] text-gray-500">Type at least 10 sentences of rough notes about the role — the AI will turn it into a polished description.</p>
            <textarea value={aiNotes} onChange={e => setAiNotes(e.target.value)} rows={4} placeholder="This role involves... The ideal candidate should..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none bg-white focus:border-green-400 focus:ring-2 focus:ring-green-400/20 resize-none transition-all" />
            {aiError && <p className="text-red-500 text-xs font-medium">{aiError}</p>}
            <button type="button" onClick={handleGenerateDescription} disabled={generating} className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white transition-all">
              {generating ? <><Loader2 size={11} className="animate-spin" /> Generating...</> : 'Generate Description'}
            </button>
          </div>
        )}
        <textarea value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} rows={5} placeholder="Full job description..." className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none bg-white focus:border-green-400 focus:ring-2 focus:ring-green-400/20 resize-none transition-all" />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-2">Image (Optional)</label>
        <div className="flex flex-wrap gap-2">
          {imagePreview && (
            <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 group">
              <img src={imagePreview} alt="" className="w-full h-full object-cover" />
              <button onClick={() => { setImagePreview(''); setImageFile(null); setForm(prev => ({ ...prev, imageUrl: '' })) }} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <X size={16} className="text-white" />
              </button>
            </div>
          )}
          {!imagePreview && (
            <label className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-green-400 hover:bg-green-50/30 transition-all group">
              <UploadCloud size={16} className="text-gray-300 group-hover:text-green-400 transition-colors mb-0.5" />
              <span className="text-[10px] text-gray-300 group-hover:text-green-400 font-medium">Upload</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </label>
          )}
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <button onClick={resetForm} className="flex-1 sm:flex-none px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="flex-1 sm:flex-none px-5 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2">
          {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : editingJob ? 'Update Job' : 'Post Job'}
        </button>
      </div>
    </div>
  )

  return (
    <div className="p-4 sm:p-5 max-w-5xl mx-auto space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Briefcase size={20} className="text-green-500" /> Job Listings
          </h1>
          <p className="text-gray-400 text-xs mt-0.5">Post job openings and manage applications, available on every plan.</p>
        </div>
        {!limitReached && !showForm && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0">
            <Plus size={14} /> Post Job
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3.5">
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-xs font-semibold text-gray-700">{jobs.length} of {maxLabel} listings used</p>
          <span className="text-xs font-bold text-gray-400 capitalize">{plan} plan</span>
        </div>
        {maxJobs < 999999 && (
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-amber-400' : 'bg-green-400'}`} style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>

      {limitReached && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          <AlertCircle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-800 font-semibold text-xs">Plan limit reached — {maxJobs}/{maxJobs} listings</p>
            <p className="text-amber-700 text-xs mt-0.5">You've used all {maxJobs} job listing slots. Upgrade your plan to post more.</p>
          </div>
        </div>
      )}

      {listError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
          <AlertCircle size={14} /> {listError}
        </div>
      )}

      {showForm && !editingJob && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="font-bold text-gray-900 text-sm">Post New Job</h2>
            <button onClick={resetForm} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"><X size={15} /></button>
          </div>
          <JobForm />
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="text-green-500 animate-spin" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 flex flex-col items-center justify-center py-14 gap-3">
          <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center">
            <Briefcase size={20} className="text-green-400" />
          </div>
          <div className="text-center">
            <p className="font-bold text-gray-800 text-sm">No job listings yet</p>
            <p className="text-gray-400 text-xs mt-0.5 max-w-xs">Post your first opening to start receiving applicants.</p>
          </div>
          {!limitReached && !showForm && (
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all">
              <Plus size={14} /> Post Job
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl border border-gray-100 p-3 sm:p-4">
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1) }}
                placeholder="Search by job title"
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-green-400 focus:ring-2 focus:ring-green-400/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {paginatedJobs.map(job => {
              const isInactive = job.isActive === false
              if (editingJob?.id === job.id) {
                return (
                  <div key={job.id} className="sm:col-span-2 lg:col-span-3 bg-white rounded-2xl border border-green-200 shadow-lg shadow-green-100/70 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                      <h2 className="font-bold text-gray-900 text-sm">Edit Job</h2>
                      <button onClick={resetForm} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"><X size={15} /></button>
                    </div>
                    <JobForm />
                  </div>
                )
              }
              return (
                <div key={job.id} className={`bg-white rounded-2xl border overflow-hidden transition-all ${isInactive ? 'border-gray-100 opacity-70' : 'border-gray-100 hover:border-green-100 hover:shadow-lg hover:shadow-gray-200/80 hover:-translate-y-0.5'}`}>
                  <div className="aspect-video bg-gray-100 overflow-hidden relative">
                    {job.imageUrl ? (
                      <img src={job.imageUrl} alt={job.title} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                        <ImageIcon size={20} className="text-gray-300" />
                        <p className="text-xs text-gray-300">No image</p>
                      </div>
                    )}
                    <div className="absolute top-2 left-2 flex gap-1 z-10">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${JOB_STATUS_BADGE[job.status] || JOB_STATUS_BADGE.pending}`}>
                        {job.status === 'pending' ? 'Pending Review' : job.status === 'approved' ? 'Approved' : 'Rejected'}
                      </span>
                      {isInactive && <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-800/80 text-white rounded-full">Hidden</span>}
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    <p className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">{job.title}</p>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${JOB_TYPE_BADGE[job.jobType] || 'bg-gray-50 text-gray-600 border-gray-100'}`}>
                        {getJobTypeLabel(job.jobType)}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 border border-gray-100">
                        <Tag size={10} /> {getCategoryLabel(job.category)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-gray-400">
                      <span className="flex items-center gap-1"><MapPin size={11} /> {job.location}</span>
                      <span className="flex items-center gap-1"><Wallet size={11} /> {job.pay}</span>
                    </div>

                    {job.status === 'rejected' && job.rejectionReason && (
                      <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                        <p className="text-[10px] font-bold text-red-700 uppercase tracking-wide mb-0.5">Rejected</p>
                        <p className="text-[11px] text-red-600 leading-snug">{job.rejectionReason}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => startEdit(job)} className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Edit">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(job.id)} disabled={deleting === job.id} className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50" title="Delete">
                          {deleting === job.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      </div>
                      <button
                        onClick={() => handleToggle(job)}
                        disabled={toggling === job.id}
                        className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${isInactive ? 'text-gray-400 bg-gray-100 hover:bg-gray-200' : 'text-green-600 bg-green-50 hover:bg-green-100'}`}
                        title={isInactive ? 'Make visible' : 'Hide job'}
                      >
                        {isInactive ? <ToggleLeft size={14} /> : <ToggleRight size={14} />}
                        {isInactive ? 'Off' : 'On'}
                      </button>
                    </div>

                    {job.status === 'rejected' && (
                      <button onClick={() => startEdit(job)} className="w-full mt-1 px-3 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-xs font-bold transition-all">
                        Edit & Resubmit
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {filteredJobs.length > PER_PAGE && (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white px-3 py-2.5">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1} className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600 transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">
                <ChevronLeft size={13} /> Previous
              </button>
              <span className="text-xs font-bold text-gray-500">{safePage} / {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600 transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">
                Next <ChevronRight size={13} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
