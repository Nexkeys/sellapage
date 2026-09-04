//src/pages/JobsPage.jsx/
// Public "Jobs & Opportunities" listing page - /jobs. Built on the same
// hero-gradient + overlapping-search-card + infinite-scroll-grid structure as
// LiveStoresPage.jsx, adapted for server-paginated/filtered job data.
import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Search, Briefcase, MapPin, ArrowRight, Loader2, Store, AlertCircle, RefreshCw } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Reveal from '../components/Reveal'
import { JOB_CATEGORIES, JOB_TYPES, JOB_TYPE_BADGE, getCategoryLabel, getJobTypeLabel } from '../utils/jobCategories'
import SEO from '../components/SEO'
import { SkeletonCardGrid } from '../components/Skeleton'

const PAGE_SIZE = 20

export default function JobsPage() {
  const [jobs, setJobs] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [jobType, setJobType] = useState('all')
  const sentinelRef = useRef(null)

  const fetchJobs = useCallback(async (pageNum, replace) => {
    if (replace) setLoading(true)
    else setLoadingMore(true)
    setLoadError(false)
    try {
      const params = new URLSearchParams({
        action: 'list', page: String(pageNum), limit: String(PAGE_SIZE),
        category, type: jobType, search,
      })
      const res = await fetch(`/api/jobs-public?${params.toString()}`)
      const data = await res.json()
      setJobs(prev => replace ? (data.jobs || []) : [...prev, ...(data.jobs || [])])
      setTotal(data.total || 0)
      setPage(pageNum)
    } catch (err) {
      console.error('[JobsPage] load error:', err)
      setLoadError(true)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [category, jobType, search])

  useEffect(() => {
    const t = setTimeout(() => fetchJobs(1, true), 350)
    return () => clearTimeout(t)
  }, [category, jobType, search, fetchJobs])

  const hasMore = jobs.length < total

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore || loading) return
    fetchJobs(page + 1, false)
  }, [hasMore, loadingMore, loading, page, fetchJobs])

  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMore() },
      { rootMargin: '200px' }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, loadMore])

  return (
    <div className="min-h-screen bg-gray-50/50">
      <SEO
        title="Jobs & Opportunities"
        description="Find job openings and opportunities from Nigerian businesses. Apply directly via WhatsApp or email."
        url="/jobs"
        keywords="nigeria jobs, job openings nigeria, hiring nigeria, job opportunities, sellapage jobs"
      />
      <Navbar />

      <section className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-500 to-green-400">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTR2MkgyNHYyaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-5">
            <Briefcase size={14} className="text-white" />
            <span className="text-[11px] font-bold text-white uppercase tracking-wider">Sellapage Jobs & Opportunities</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-3 font-display">
            Find Work. Get Hired Fast.
          </h1>
          <p className="text-sm sm:text-base text-white/80 max-w-lg mx-auto leading-relaxed mb-6">
            Real openings posted directly by Sellapage vendors - contract, part-time, full-time, freelance, and gig work across Nigeria.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="#job-listings" className="w-full sm:w-auto px-5 py-2.5 bg-white text-brand-700 rounded-xl text-sm font-bold hover:bg-white/90 transition-all">
              Browse Jobs
            </a>
            <Link to="/dashboard" className="w-full sm:w-auto px-5 py-2.5 bg-white/10 border border-white/30 text-white rounded-xl text-sm font-bold hover:bg-white/20 transition-all">
              Post a Job
            </Link>
          </div>
        </div>
      </section>

      <div id="job-listings" className="max-w-7xl mx-auto px-4 sm:px-6 -mt-6 relative z-10 pb-16">
        <div className="max-w-3xl mx-auto mb-8 bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-200/50 p-3 sm:p-4 space-y-3">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search job title, business, or location..."
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20">
              <option value="all">All Categories</option>
              {JOB_CATEGORIES.map(c => <option key={c.slug} value={c.slug}>{c.label}</option>)}
            </select>
            <select value={jobType} onChange={e => setJobType(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20">
              <option value="all">All Job Types</option>
              {JOB_TYPES.map(t => <option key={t.slug} value={t.slug}>{t.label}</option>)}
            </select>
          </div>
          {(search.trim() || category !== 'all' || jobType !== 'all') && (
            <p className="text-xs text-gray-400 text-center">{total} {total === 1 ? 'job' : 'jobs'} found</p>
          )}
        </div>

        {loading && (
          <SkeletonCardGrid count={8} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" />
        )}

        {!loading && loadError && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 px-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
              <AlertCircle size={24} className="text-red-300" />
            </div>
            <p className="text-sm font-semibold text-gray-700">We could not load the jobs</p>
            <p className="text-xs text-gray-400 max-w-xs">Check your connection and try again.</p>
            <button
              onClick={() => fetchJobs(1, true)}
              className="mt-1 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-700"
            >
              <RefreshCw size={13} /> Try again
            </button>
          </div>
        )}

        {!loading && !loadError && jobs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
              <Briefcase size={24} className="text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-500">
              {search.trim() || category !== 'all' || jobType !== 'all' ? 'No jobs match your filters' : 'No job listings available yet'}
            </p>
            {(search.trim() || category !== 'all' || jobType !== 'all') && (
              <button onClick={() => { setSearch(''); setCategory('all'); setJobType('all') }} className="text-xs font-bold text-brand-600 hover:text-brand-700 transition-colors">
                Clear filters
              </button>
            )}
          </div>
        )}

        {!loading && jobs.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {jobs.map(job => <JobCard key={job.id} job={job} />)}
          </div>
        )}

        {hasMore && !loading && (
          <div ref={sentinelRef} className="flex justify-center py-8">
            {loadingMore && (
              <div className="flex items-center gap-2 text-gray-400">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-xs font-medium">Loading more jobs...</span>
              </div>
            )}
          </div>
        )}

        {!hasMore && !loading && jobs.length > 0 && (
          <p className="text-center text-xs text-gray-400 py-8">You've seen all jobs</p>
        )}
      </div>

      <Footer />
    </div>
  )
}

function JobCard({ job }) {
  return (
    <Reveal
      as={Link}
      to={`/jobs/${job.id}`}
      className="group block bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-lg hover:shadow-gray-200/60 hover:-translate-y-0.5 transition-all duration-300"
    >
      <div className="relative h-28 bg-gradient-to-br from-brand-50 to-green-50 overflow-hidden">
        <img
          src={job.imageUrl || '/og-image.png'}
          alt={job.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>

      <div className="p-4 space-y-2.5">
        <div>
          <h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-2 group-hover:text-brand-600 transition-colors">
            {job.title}
          </h3>
          <p className="flex items-center gap-1 text-[11px] text-gray-400 mt-1">
            <Store size={10} /> {job.businessName}
          </p>
        </div>

        <p className="flex items-center gap-1 text-[11px] text-gray-500">
          <MapPin size={11} /> {job.location}
        </p>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5">
            <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border ${JOB_TYPE_BADGE[job.jobType] || 'bg-gray-50 text-gray-600 border-gray-100'}`}>
              {getJobTypeLabel(job.jobType)}
            </span>
          </div>
          <ArrowRight size={14} className="text-gray-300 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all" />
        </div>
        <p className="text-[10px] text-gray-400">{getCategoryLabel(job.category)}</p>
      </div>
    </Reveal>
  )
}
