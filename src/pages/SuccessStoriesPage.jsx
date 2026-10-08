// src/pages/SuccessStoriesPage.jsx
//
// Public /success-stories: admin-approved reviews of Sellapage from vendors
// (text, optional photos and videos), featured ones first. Rebuilt 2026-10-08
// in the style of the new public pages. Same data as before
// (/api/platform-reviews-public), nothing invented: the hero's cards are the
// newest real stories, turning over one by one; with no stories yet the page
// says so and invites the first.
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Star, Quote, Film, ArrowRight, PenLine, Sparkles } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Reveal from '../components/Reveal'
import SEO from '../components/SEO'
import { pageSeo } from '../data/seoPages'
import { useAuth } from '../hooks/useAuth'
import { SkeletonCardGrid } from '../components/Skeleton'
import { Eyebrow, Script } from '../components/marketing/kit'
import { useClock, useOnScreen } from '../components/marketing/motion'

function formatDate(dateStr) {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-NG', { month: 'short', year: 'numeric' })
}

const initials = (n) => String(n || 'S').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()

function Stars({ rating, size = 14 }) {
  const r = Math.max(0, Math.min(5, Number(rating) || 0))
  if (!r) return null
  return <span className="flex items-center gap-0.5" aria-label={`${r} out of 5`}>{[1, 2, 3, 4, 5].map((i) => <Star key={i} size={size} className={i <= r ? 'fill-amber-400 text-amber-400' : 'fill-gray-100 text-gray-200'} />)}</span>
}

/** The newest stories as a stack of cards, the top one turning over every few seconds. */
function StoryStack({ reviews }) {
  const ref = useRef(null)
  const t = useClock(useOnScreen(ref), { stillAt: 0 })
  const list = reviews.slice(0, 5)
  if (!list.length) return null
  const top = Math.floor(t / 4500) % list.length
  return (
    <div ref={ref} className="relative mx-auto h-[330px] w-full max-w-[420px]">
      {list.map((r, i) => {
        const depth = (i - top + list.length) % list.length
        if (depth > 2) return null
        return (
          <article key={r.id} className="absolute inset-x-0 top-0 rounded-[28px] bg-white p-6 shadow-2xl shadow-forest-900/10 ring-1 ring-gray-100 transition-all duration-700 ease-out"
            style={{ transform: `translateY(${depth * 22}px) scale(${1 - depth * 0.05}) rotate(${depth === 0 ? -1.5 : depth === 1 ? 2 : -3}deg)`, zIndex: 10 - depth, opacity: depth === 2 ? 0.6 : 1 }}>
            <div className="flex items-center justify-between"><Stars rating={r.rating} /><Quote size={26} className="text-forest-100" /></div>
            <p className="mt-4 line-clamp-5 text-[15px] leading-relaxed text-gray-800">&ldquo;{String(r.reviewText || '').trim()}&rdquo;</p>
            <div className="mt-5 flex items-center gap-3 border-t border-gray-100 pt-4">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-forest text-[12px] font-extrabold text-white">{initials(r.authorName || r.storeName)}</span>
              <span className="min-w-0"><span className="block truncate text-[14px] font-bold text-gray-900">{r.authorName}</span><span className="block truncate text-[12px] text-gray-500">{r.storeName}</span></span>
            </div>
          </article>
        )
      })}
    </div>
  )
}

function ReviewCard({ review, featured = false, delay = 0 }) {
  return (
    <Reveal delay={delay} className={`flex flex-col rounded-[24px] bg-white p-5 sm:p-6 ${featured ? 'shadow-xl shadow-amber-100/60 ring-2 ring-amber-200' : 'ring-1 ring-gray-100 shadow-[0_1px_2px_rgba(16,24,40,0.04)]'}`}>
      <div className="flex items-center justify-between gap-3">
        <Stars rating={review.rating} />
        {featured && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700"><Sparkles size={11} />Featured</span>}
      </div>
      <p className={`mt-3 flex-1 leading-relaxed text-gray-700 ${featured ? 'text-[16px]' : 'text-[14px]'}`}>&ldquo;{review.reviewText}&rdquo;</p>
      {(review.images?.length > 0 || review.videos?.length > 0) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {(review.images || []).slice(0, 4).map((url, idx) => (
            <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="h-16 w-16 overflow-hidden rounded-xl ring-1 ring-gray-100"><img src={url} alt="" loading="lazy" className="h-full w-full object-cover" /></a>
          ))}
          {(review.videos || []).map((url, idx) => (
            <a key={idx} href={url} target="_blank" rel="noopener noreferrer" aria-label="Watch the video" className="flex h-16 w-16 items-center justify-center rounded-xl bg-gray-50 text-gray-400 ring-1 ring-gray-100"><Film size={20} /></a>
          ))}
        </div>
      )}
      <div className="mt-5 flex items-center gap-3 border-t border-gray-100 pt-4">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-forest-50 text-[12px] font-extrabold text-forest-700">{initials(review.authorName || review.storeName)}</span>
        <span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-bold text-gray-900">{review.authorName}</span>
          {review.storeSlug ? <Link to={`/${review.storeSlug}`} className="block truncate text-[12px] text-forest-700 hover:underline">{review.storeName}</Link> : <span className="block truncate text-[12px] text-gray-500">{review.storeName}</span>}
        </span>
        <span className="flex-shrink-0 text-[11px] text-gray-400">{formatDate(review.createdAt)}</span>
      </div>
    </Reveal>
  )
}

export default function SuccessStoriesPage() {
  const { user } = useAuth()
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/platform-reviews-public?action=list&limit=60')
      .then((r) => r.json())
      .then((data) => setReviews((data.reviews || []).filter((r) => String(r.reviewText || '').trim())))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const featured = reviews.filter((r) => r.featured)
  const rest = reviews.filter((r) => !r.featured)
  const shareTo = user ? '/dashboard?tab=leave-review' : '/login'

  return (
    <div className="min-h-screen overflow-x-clip bg-white font-body text-gray-900">
      <SEO {...pageSeo('/success-stories')} url="/success-stories" />
      <Navbar />

      <section className="relative overflow-hidden pb-14 pt-10 sm:pt-16">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px] bg-[radial-gradient(60%_55%_at_30%_0%,#d5f1e1_0%,rgba(236,249,242,0.6)_45%,#fff_100%)]" />
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:px-8">
          <Reveal>
            <Eyebrow>Success stories</Eyebrow>
            <h1 className="mt-5 text-balance font-display text-[2.5rem] font-extrabold leading-[1.04] tracking-tight text-gray-950 sm:text-[3.4rem] lg:text-[3.8rem]">
              Real businesses, <span className="text-forest-600">in their own words.</span>
            </h1>
            <p className="mt-5 max-w-xl text-[15.5px] leading-relaxed text-gray-600 sm:text-[17px]">
              Nigerian business owners on what running and growing their business with Sellapage is like. Every story is from a real vendor and checked before it is published.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link to="/login?mode=register" className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-forest px-6 py-4 text-[15px] font-bold text-white shadow-xl shadow-forest/25 transition hover:bg-forest-700">Start your own story <ArrowRight size={17} className="transition group-hover:translate-x-1" /></Link>
              <Link to={shareTo} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-[15px] font-bold text-gray-800 ring-1 ring-gray-200 transition hover:bg-gray-50"><PenLine size={17} className="text-forest-600" />Share yours</Link>
            </div>
          </Reveal>
          <Reveal direction="left" delay={120} className="relative">
            {reviews.length > 0 ? <StoryStack reviews={reviews} /> : (
              <div className="mx-auto flex h-[300px] w-full max-w-[420px] flex-col items-center justify-center rounded-[28px] bg-white p-8 text-center shadow-xl shadow-forest-900/5 ring-1 ring-gray-100">
                <Quote size={34} className="text-forest-200" />
                <p className="mt-4 font-display text-[18px] font-extrabold text-gray-900">{loading ? 'Loading stories' : 'The first stories are on their way'}</p>
                {!loading && <p className="mt-1 text-[13.5px] text-gray-500">Selling on Sellapage? Yours could be first.</p>}
              </div>
            )}
            <Script className="absolute -bottom-2 left-2 hidden -rotate-6 text-[24px] leading-none lg:block">Small steps,<br />big dreams</Script>
          </Reveal>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {loading ? (
            <SkeletonCardGrid count={6} className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" />
          ) : reviews.length > 0 && (
            <>
              {featured.length > 0 && (
                <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2">
                  {featured.map((r, i) => <ReviewCard key={r.id} review={r} featured delay={i * 100} />)}
                </div>
              )}
              <div className="grid grid-cols-1 items-start gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((r, i) => <ReviewCard key={r.id} review={r} delay={(i % 3) * 80} />)}
              </div>
            </>
          )}

          <Reveal className="relative mt-16 overflow-hidden rounded-[32px] bg-forest px-6 py-12 text-center text-white sm:px-12 sm:py-16">
            <h2 className="mx-auto max-w-2xl text-balance font-display text-[1.9rem] font-extrabold leading-tight sm:text-[2.5rem]">Ready to start your own success story?</h2>
            <p className="mx-auto mt-3 max-w-md text-[15px] text-white/75">Your store can be live the same day. The Starter plan is free, no card needed.</p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/login?mode=register" className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-[15px] font-bold text-forest transition hover:bg-forest-50">Start free <ArrowRight size={17} className="transition group-hover:translate-x-1" /></Link>
              <Link to={shareTo} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-6 py-4 text-[15px] font-bold text-white ring-1 ring-white/20 transition hover:bg-white/15"><PenLine size={16} />Share your story</Link>
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  )
}
