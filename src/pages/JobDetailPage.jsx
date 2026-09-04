//src/pages/JobDetailPage.jsx/
// Public job detail page - /jobs/:jobId. A full page (never a modal, per spec),
// with an editorial structural rhythm (breadcrumb → title → meta → hero image →
// content + sidebar) and an inline WhatsApp/Mail "apply" composer.
import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, MapPin, Wallet, Clock, Tag, Briefcase, Share2, Check,
  MessageCircle, Mail, ExternalLink, X,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Reveal from '../components/Reveal'
import { JOB_TYPE_BADGE, getCategoryLabel, getJobTypeLabel } from '../utils/jobCategories'
import SEO from '../components/SEO'
import { SkeletonArticle } from '../components/Skeleton'

export default function JobDetailPage() {
  const { jobId } = useParams()
  const [job, setJob] = useState(null)
  const [contact, setContact] = useState(null)
  const [storeLogoUrl, setStoreLogoUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [activeComposer, setActiveComposer] = useState(null) // 'whatsapp' | 'mail' | null
  const [message, setMessage] = useState('')
  const [subject, setSubject] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setNotFound(false)
      try {
        const res = await fetch(`/api/jobs-public?action=get&id=${jobId}`)
        if (res.status === 404) {
          if (!cancelled) setNotFound(true)
          return
        }
        const data = await res.json()
        if (!cancelled) {
          setJob(data.job)
          setContact(data.contact)
          setStoreLogoUrl(data.storeLogoUrl || '')
        }
      } catch (err) {
        console.error('[JobDetailPage] load error:', err)
        if (!cancelled) setNotFound(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [jobId])

  const openComposer = useCallback((type) => {
    if (!job) return
    const intro = `Hi ${job.businessName}, I saw your "${job.title}" opening on Sellapage and I'd like to apply. [Add a short intro about yourself here.] Please let me know the next steps. Thank you.`
    setMessage(intro)
    setSubject(`Application: ${job.title}`)
    setActiveComposer(type)
  }, [job])

  const sendWhatsapp = () => {
    const digits = (contact?.whatsapp || '').replace(/[^0-9]/g, '')
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const sendMail = () => {
    const url = `mailto:${contact?.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`
    window.location.href = url
  }

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      try { await navigator.share({ title: job?.title, url }); return } catch { /* user cancelled */ }
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard unavailable */ }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <Navbar />
        <SkeletonArticle />
        <Footer />
      </div>
    )
  }

  if (notFound || !job) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-24 gap-3 px-4 text-center">
          <Briefcase size={28} className="text-gray-300" />
          <p className="font-bold text-gray-700">This job listing isn't available</p>
          <p className="text-sm text-gray-400 max-w-sm">It may have been closed by the vendor or is no longer under review.</p>
          <Link to="/jobs" className="text-sm font-bold text-brand-600 hover:text-brand-700">Back to Jobs</Link>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <SEO
        title={job.title || 'Job Details'}
        description={job.description || `Apply for ${job.title || 'this position'} via Sellapage Jobs.`}
        url={`/jobs/${job.id}`}
        type="article"
        jsonLd={job.id ? {
          '@context': 'https://schema.org',
          '@type': 'JobPosting',
          title: job.title,
          description: job.description,
          datePosted: job.createdAt || job.postedAt,
          validThrough: job.deadline || job.validThrough,
          employmentType: job.type || 'FULL_TIME',
          hiringOrganization: {
            '@type': 'Organization',
            name: job.storeName || job.businessName || 'Sellapage Merchant',
          },
          jobLocation: {
            '@type': 'Place',
            address: {
              '@type': 'PostalAddress',
              addressLocality: job.location || job.city || '',
              addressRegion: job.state || '',
              addressCountry: 'NG',
            },
          },
          applicantLocationRequirements: {
            '@type': 'Country',
            name: 'NG',
          },
        } : null}
      />
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-4 flex-wrap">
          <Link to="/jobs" className="flex items-center gap-1 hover:text-brand-600 transition-colors font-semibold">
            <ArrowLeft size={13} /> Jobs
          </Link>
          <span>/</span>
          <span>{getCategoryLabel(job.category)}</span>
          <span>/</span>
          <span className="text-gray-600 truncate max-w-[160px]">{job.title}</span>
        </div>

        <Reveal className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight font-display leading-tight">
                {job.title}
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-3 text-xs text-gray-500">
                <span className="flex items-center gap-1 font-semibold text-gray-700">
                  {storeLogoUrl
                    ? <img src={storeLogoUrl} alt="" className="w-4 h-4 rounded-full object-cover" />
                    : <img src="/og-image.png" alt="" className="w-4 h-4 rounded-full object-cover" />}
                  {job.businessName}
                </span>
                <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${JOB_TYPE_BADGE[job.jobType] || 'bg-gray-50 text-gray-600 border-gray-100'}`}>
                  {getJobTypeLabel(job.jobType)}
                </span>
                <span>{job.createdAt ? new Date(job.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</span>
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-brand-50 to-green-50 aspect-video">
              <img src={job.imageUrl || '/og-image.png'} alt={job.title} className="w-full h-full object-cover" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <InfoTile icon={Wallet} label="Pay" value={job.pay} />
              <InfoTile icon={MapPin} label="Location" value={job.location} />
              <InfoTile icon={Clock} label="Timeline" value={job.availabilityTimeline} />
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5">
              <h2 className="font-bold text-gray-900 text-sm mb-2 flex items-center gap-1.5"><Tag size={13} className="text-brand-500" /> Must-Haves</h2>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{job.mustHaves}</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5">
              <h2 className="font-bold text-gray-900 text-sm mb-2">Full Description</h2>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{job.description}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 space-y-3 lg:sticky lg:top-20">
              <h2 className="font-bold text-gray-900 text-sm">Apply for this job</h2>

              <div className="flex flex-col gap-2">
                {contact?.whatsapp && (
                  <button onClick={() => openComposer('whatsapp')} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-bold transition-all">
                    <MessageCircle size={15} /> WhatsApp
                  </button>
                )}
                {contact?.email && (
                  <button onClick={() => openComposer('mail')} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-bold transition-all">
                    <Mail size={15} /> Email
                  </button>
                )}
                {contact?.applicationLink && (
                  <a href={contact.applicationLink} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-sm font-bold transition-all">
                    <ExternalLink size={15} /> Application Link
                  </a>
                )}
              </div>

              {activeComposer && (
                <div className="border border-gray-100 rounded-xl p-3 space-y-2 bg-gray-50/60">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-gray-700">{activeComposer === 'whatsapp' ? 'WhatsApp Message' : 'Email'}</p>
                    <button onClick={() => setActiveComposer(null)} className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors"><X size={14} /></button>
                  </div>
                  {activeComposer === 'mail' && (
                    <input value={subject} onChange={e => setSubject(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none bg-white focus:border-green-400 focus:ring-2 focus:ring-green-400/20" placeholder="Subject" />
                  )}
                  <textarea value={message} onChange={e => setMessage(e.target.value)} rows={5} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none bg-white focus:border-green-400 focus:ring-2 focus:ring-green-400/20 resize-none" />
                  <button onClick={activeComposer === 'whatsapp' ? sendWhatsapp : sendMail} className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-bold transition-all">
                    Send {activeComposer === 'whatsapp' ? 'via WhatsApp' : 'Email'}
                  </button>
                </div>
              )}

              <button onClick={handleShare} className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 text-gray-500 hover:bg-gray-50 rounded-xl text-xs font-bold transition-all">
                {copied ? <><Check size={13} className="text-green-500" /> Link Copied</> : <><Share2 size={13} /> Share This Job</>}
              </button>
            </div>
          </div>
        </Reveal>
      </div>

      <Footer />
    </div>
  )
}

function InfoTile({ icon: Icon, label, value }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3">
      <p className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-wide"><Icon size={11} /> {label}</p>
      <p className="text-sm font-semibold text-gray-800 mt-1 leading-snug">{value}</p>
    </div>
  )
}
