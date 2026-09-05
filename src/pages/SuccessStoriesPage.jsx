//src/pages/SuccessStoriesPage.jsx/
// Public marketing page - /success-stories. Shows admin-approved vendor
// reviews of Sellapage (text + optional photos/videos), featured ones first.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Star, Quote, Film, ArrowRight } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Reveal from '../components/Reveal'
import SEO from '../components/SEO'
import { pageSeo } from '../data/seoPages'
import { useDocumentHead } from '../hooks/useDocumentHead'
import { SkeletonCardGrid } from '../components/Skeleton'

function formatDate(dateStr) {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-NG', { month: 'short', year: 'numeric' })
}

export default function SuccessStoriesPage() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  useDocumentHead({
    title: 'Success Stories | Sellapage',
    description: 'Real Nigerian vendors sharing what selling on Sellapage has done for their business.',
  })

  useEffect(() => {
    fetch('/api/platform-reviews-public?action=list&limit=60')
      .then((r) => r.json())
      .then((data) => setReviews(data.reviews || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const featured = reviews.filter((r) => r.featured)
  const rest = reviews.filter((r) => !r.featured)

  return (
    <div className="min-h-screen bg-gray-50/50">
      <SEO {...pageSeo("/success-stories")} url="/success-stories" />
      <Navbar />

      <section className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-500 to-green-400">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTR2MkgyNHYyaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-14 sm:py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-5">
            <Star size={14} className="text-white fill-white" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">Success Stories</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Real vendors. Real results.
          </h1>
          <p className="mt-4 text-sm sm:text-base text-white/90 max-w-xl mx-auto">
            Hear directly from Nigerian entrepreneurs who've grown their business selling on Sellapage.
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {loading ? (
          <SkeletonCardGrid count={6} className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" />
        ) : reviews.length === 0 ? (
          <div className="text-center py-24">
            <Quote size={32} className="mx-auto mb-4 text-gray-300" />
            <p className="text-sm text-gray-500">No stories published yet - check back soon.</p>
          </div>
        ) : (
          <>
            {featured.length > 0 && (
              <div className="mb-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
                {featured.map((r, i) => (
                  <ReviewCard key={r.id} review={r} featured delay={i * 100} />
                ))}
              </div>
            )}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((r, i) => (
                <ReviewCard key={r.id} review={r} delay={i * 80} />
              ))}
            </div>
          </>
        )}

        <Reveal className="mt-16 rounded-3xl bg-gray-950 px-6 py-10 text-center sm:px-12 sm:py-14">
          <h2 className="text-xl sm:text-2xl font-black text-white">Ready to start your own success story?</h2>
          <p className="mt-2 text-sm text-gray-400">Set up your free store on Sellapage in minutes.</p>
          <Link
            to="/register"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-green-600 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-green-700"
          >
            Get Started Free <ArrowRight size={15} />
          </Link>
        </Reveal>
      </section>

      <Footer />
    </div>
  )
}

function ReviewCard({ review, featured = false, delay = 0 }) {
  return (
    <Reveal delay={delay} className={`rounded-2xl border bg-white p-5 sm:p-6 ${featured ? 'border-amber-200 shadow-md shadow-amber-100/50' : 'border-gray-100'}`}>
      {featured && (
        <span className="mb-3 inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700">
          Featured Story
        </span>
      )}
      <div className="mb-2 flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} size={14} className={review.rating >= i ? 'fill-amber-400 text-amber-400' : 'fill-gray-100 text-gray-200'} />
        ))}
      </div>
      <p className="text-sm leading-relaxed text-gray-700">"{review.reviewText}"</p>

      {(review.images?.length > 0 || review.videos?.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {(review.images || []).slice(0, 4).map((url, idx) => (
            <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="h-14 w-14 overflow-hidden rounded-lg border border-gray-100">
              <img src={url} alt="" className="h-full w-full object-cover" />
            </a>
          ))}
          {(review.videos || []).map((url, idx) => (
            <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="flex h-14 w-14 items-center justify-center rounded-lg border border-gray-100 bg-gray-50 text-gray-400">
              <Film size={18} />
            </a>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-gray-50 pt-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-gray-900">{review.authorName}</p>
          <p className="truncate text-[11px] text-gray-400">{review.storeName}</p>
        </div>
        <p className="flex-shrink-0 text-[10px] text-gray-400">{formatDate(review.createdAt)}</p>
      </div>
    </Reveal>
  )
}
