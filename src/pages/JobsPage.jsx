// src/pages/JobsPage.jsx
// Public "Jobs & Opportunities" listing page - /jobs. Server-paginated and
// filtered (/api/jobs-public) with infinite scroll. Rebuilt 2026-10-08 in the
// style of the new public pages: search in the hero, the newest real openings
// beside it, job types as chips, and a call to vendors to post a role.
import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Search, Briefcase, MapPin, ArrowRight, Loader2, Store, AlertCircle, RefreshCw } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Reveal from '../components/Reveal'
import { JOB_CATEGORIES, JOB_TYPES, JOB_TYPE_BADGE, getCategoryLabel, getJobTypeLabel } from '../utils/jobCategories'
import { Eyebrow, Script } from '../components/marketing/kit'
import SEO from '../components/SEO'
import { pageSeo } from '../data/seoPages'
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

  const filtered = search.trim() || category !== 'all' || jobType !== 'all'
  const clear = () => { setSearch(''); setCategory('all'); setJobType('all') }
  const chip = (on) => `flex-shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-semibold transition ${on ? 'bg-forest text-white shadow-md shadow-forest/20' : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:ring-forest-200'}`

  return (
    <div className="min-h-screen overflow-x-clip bg-white font-body text-gray-900">
      <SEO {...pageSeo('/jobs')} url="/jobs" />
      <Navbar />

      <section className="relative overflow-hidden pb-10 pt-10 sm:pt-16">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[620px] bg-[radial-gradient(60%_55%_at_30%_0%,#d5f1e1_0%,rgba(236,249,242,0.6)_45%,#fff_100%)]" />
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:px-8">
          <Reveal>
            <Eyebrow>Jobs and opportunities</Eyebrow>
            <h1 className="mt-5 text-balance font-display text-[2.5rem] font-extrabold leading-[1.04] tracking-tight text-gray-950 sm:text-[3.4rem] lg:text-[3.8rem]">
              Work with Nigerian businesses <span className="text-forest-600">that are growing.</span>
            </h1>
            <p className="mt-5 max-w-xl text-[15.5px] leading-relaxed text-gray-600 sm:text-[17px]">
              Real openings posted by businesses on Sellapage: full-time, part-time, contract, freelance and side gigs across Nigeria. Apply straight to the business, no account needed.
            </p>
            <div className="relative mt-7 max-w-xl">
              <Search size={19} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search a role, business or city" aria-label="Search jobs"
                className="w-full rounded-2xl border border-gray-200 bg-white py-4 pl-12 pr-4 text-[15px] text-gray-900 shadow-xl shadow-forest-900/5 outline-none transition placeholder:text-gray-400 focus:border-forest-600 focus:ring-4 focus:ring-forest-50" />
            </div>
            <p className="mt-3 text-[13px] text-gray-500">Hiring? <Link to="/dashboard?tab=job-listings" className="font-bold text-forest-700 hover:underline">Post a job from your dashboard</Link>, free on every plan.</p>
          </Reveal>
          <Reveal direction="left" delay={120} className="relative hidden lg:block">
            <div className="absolute inset-6 -z-10 rounded-[40px] bg-gradient-to-br from-forest-100 via-forest-50 to-white" />
            <div className="mx-auto max-w-[400px] space-y-3 p-4">
              {(jobs.length ? jobs.slice(0, 3) : []).map((job, i) => (
                <Link key={job.id} to={`/jobs/${job.id}`} className="flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-xl shadow-forest-900/5 ring-1 ring-gray-100 transition hover:-translate-y-0.5 animate-rise" style={{ animationDelay: `${i * 150}ms`, marginLeft: i === 1 ? 32 : 0 }}>
                  {job.imageUrl ? <img src={job.imageUrl} alt="" className="h-12 w-12 flex-shrink-0 rounded-xl object-cover" /> : <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-forest text-white"><Briefcase size={20} /></span>}
                  <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-bold text-gray-900">{job.title}</span><span className="block truncate text-[12px] text-gray-500">{job.businessName} · {job.location}</span></span>
                  <span className="flex-shrink-0 rounded-full bg-forest-50 px-2 py-0.5 text-[11px] font-bold text-forest-700">{getJobTypeLabel(job.jobType)}</span>
                </Link>
              ))}
              {!jobs.length && (
                <div className="rounded-3xl bg-white p-6 text-center shadow-xl shadow-forest-900/5 ring-1 ring-gray-100">
                  <Briefcase size={30} className="mx-auto text-forest-300" />
                  <p className="mt-3 font-display text-[17px] font-extrabold text-gray-900">{loading ? 'Finding openings' : 'New openings appear here'}</p>
                </div>
              )}
              <Script className="pt-2 text-center text-[24px] leading-none">Your next role is local</Script>
            </div>
          </Reveal>
        </div>
      </section>

      <div id="job-listings" className="mx-auto max-w-7xl scroll-mt-20 px-4 pb-16 sm:px-6 lg:px-8">
        <div className="space-y-3">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
            <button type="button" onClick={() => setJobType('all')} className={chip(jobType === 'all')}>All types</button>
            {JOB_TYPES.map((t) => <button key={t.slug} type="button" onClick={() => setJobType(t.slug)} className={chip(jobType === t.slug)}>{t.label}</button>)}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category" className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] text-gray-800 outline-none focus:border-forest-600 focus:ring-4 focus:ring-forest-50 sm:w-72">
              <option value="all">All categories</option>
              {JOB_CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
            </select>
            <p className="text-[13px] text-gray-500">{loading ? 'Loading jobs' : `${total} ${total === 1 ? 'opening' : 'openings'}${filtered ? ' match' : ''}`}{filtered && <button type="button" onClick={clear} className="ml-2 font-bold text-forest-700 hover:underline">Clear filters</button>}</p>
          </div>
        </div>

        <div className="mt-6">
          {loading && <SkeletonCardGrid count={8} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" />}

          {!loading && loadError && (
            <div className="flex flex-col items-center justify-center gap-3 px-4 py-20 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50"><AlertCircle size={24} className="text-red-400" /></span>
              <p className="text-[15px] font-bold text-gray-800">We could not load the jobs</p>
              <p className="max-w-xs text-[13px] text-gray-500">Check your connection and try again.</p>
              <button type="button" onClick={() => fetchJobs(1, true)} className="mt-1 inline-flex items-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-[13px] font-bold text-white hover:bg-forest-700"><RefreshCw size={14} /> Try again</button>
            </div>
          )}

          {!loading && !loadError && jobs.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-[28px] bg-gray-50 py-16 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white"><Briefcase size={24} className="text-gray-300" /></span>
              <p className="text-[15px] font-bold text-gray-700">{filtered ? 'No jobs match your filters' : 'No openings right now'}</p>
              {filtered ? <button type="button" onClick={clear} className="text-[13px] font-bold text-forest-700 hover:underline">Clear filters</button> : <p className="text-[13px] text-gray-500">Check back soon, or post one if you are hiring.</p>}
            </div>
          )}

          {!loading && jobs.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {jobs.map((job) => <JobCard key={job.id} job={job} />)}
            </div>
          )}

          {hasMore && !loading && (
            <div ref={sentinelRef} className="flex justify-center py-8">
              {loadingMore && <div className="flex items-center gap-2 text-gray-400"><Loader2 size={16} className="animate-spin" /><span className="text-[13px] font-medium">Loading more jobs...</span></div>}
            </div>
          )}
          {!hasMore && !loading && jobs.length > 0 && <p className="py-8 text-center text-[13px] text-gray-400">You have seen every opening.</p>}
        </div>

        <Reveal className="mt-10 flex flex-col items-center gap-4 rounded-[28px] bg-forest p-6 text-center text-white sm:flex-row sm:p-8 sm:text-left">
          <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-white/10"><Store size={22} /></span>
          <div className="flex-1"><p className="font-display text-[19px] font-extrabold">Hiring for your business?</p><p className="mt-1 text-[14px] text-white/75">Post openings from your Sellapage dashboard and get applications by WhatsApp or email.</p></div>
          <Link to="/dashboard?tab=job-listings" className="group inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-[14px] font-bold text-forest">Post a job <ArrowRight size={16} className="transition group-hover:translate-x-1" /></Link>
        </Reveal>
      </div>

      <Footer />
    </div>
  )
}

function JobCard({ job }) {
  return (
    <Reveal as={Link} to={`/jobs/${job.id}`} className="group flex flex-col overflow-hidden rounded-[22px] bg-white ring-1 ring-gray-100 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-forest-900/5 hover:ring-forest-200">
      <div className="relative h-32 overflow-hidden bg-gradient-to-br from-forest-50 to-white">
        {job.imageUrl
          ? <img src={job.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
          : <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-forest via-forest-700 to-forest-600 font-display text-[28px] font-extrabold text-white/90">{String(job.businessName || 'S').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}</div>}
        <span className={`absolute left-3 top-3 rounded-full border px-2.5 py-0.5 text-[11px] font-bold backdrop-blur ${JOB_TYPE_BADGE[job.jobType] || 'border-gray-100 bg-white/90 text-gray-700'}`}>{getJobTypeLabel(job.jobType)}</span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-gray-900 transition group-hover:text-forest-700">{job.title}</h3>
        <p className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-gray-500"><Store size={13} className="flex-shrink-0" /><span className="truncate">{job.businessName}</span></p>
        <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-gray-500"><MapPin size={13} className="flex-shrink-0" /><span className="truncate">{job.location}</span></p>
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="truncate text-[11.5px] font-semibold text-gray-400">{getCategoryLabel(job.category)}</span>
          <ArrowRight size={15} className="flex-shrink-0 text-gray-300 transition group-hover:translate-x-1 group-hover:text-forest-600" />
        </div>
      </div>
    </Reveal>
  )
}
