// src/pages/BlogPage.jsx
// Public blog listing - /blog (/api/blog-public, paginated, infinite scroll).
// Rebuilt 2026-10-08 in the style of the new public pages: search in the hero,
// categories as chips, the newest article as a large lead card when nothing is
// filtered, then the grid.
import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, BookOpen, ArrowRight, Loader2, Clock, AlertCircle, RefreshCw } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Reveal from '../components/Reveal'
import SEO from '../components/SEO'
import { pageSeo } from '../data/seoPages'
import { useDocumentHead } from '../hooks/useDocumentHead'
import { getExcerpt, formatBlogDate, getCategoryBadgeClass } from '../utils/blogHelpers'
import { Eyebrow } from '../components/marketing/kit'
import { SkeletonCardGrid } from '../components/Skeleton'

const PAGE_SIZE = 20

export default function BlogPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [posts, setPosts] = useState([])
  const [categories, setCategories] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [search, setSearch] = useState('')
  const category = searchParams.get('category') || 'all'
  const tag = searchParams.get('tag') || 'all'
  const sentinelRef = useRef(null)

  useDocumentHead({
    title: 'Blog | Sellapage',
    description: 'Tips, guides, and stories to help Nigerian entrepreneurs sell more with Sellapage.',
  })

  useEffect(() => {
    fetch('/api/blog-public?action=list-categories')
      .then(res => res.json())
      .then(data => setCategories(data.categories || []))
      .catch(() => {})
  }, [])

  const fetchPosts = useCallback(async (pageNum, replace) => {
    if (replace) setLoading(true)
    else setLoadingMore(true)
    setLoadError(false)
    try {
      const params = new URLSearchParams({ action: 'list', page: String(pageNum), limit: String(PAGE_SIZE), category, tag, search })
      const res = await fetch(`/api/blog-public?${params.toString()}`)
      const data = await res.json()
      setPosts(prev => replace ? (data.posts || []) : [...prev, ...(data.posts || [])])
      setTotal(data.total || 0)
      setPage(pageNum)
    } catch (err) {
      console.error('[BlogPage] load error:', err)
      setLoadError(true)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [category, tag, search])

  useEffect(() => {
    const t = setTimeout(() => fetchPosts(1, true), 350)
    return () => clearTimeout(t)
  }, [category, tag, search, fetchPosts])

  const hasMore = posts.length < total

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore || loading) return
    fetchPosts(page + 1, false)
  }, [hasMore, loadingMore, loading, page, fetchPosts])

  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return
    const observer = new IntersectionObserver(entries => { if (entries[0].isIntersecting) loadMore() }, { rootMargin: '200px' })
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, loadMore])

  const setCategory = (val) => {
    const next = new URLSearchParams(searchParams)
    if (val === 'all') next.delete('category'); else next.set('category', val)
    next.delete('tag')
    setSearchParams(next)
  }

  const clearFilters = () => { setSearch(''); setSearchParams({}) }

  const filtered = search.trim() || category !== 'all' || tag !== 'all'
  const catName = (slug) => categories.find((c) => c.slug === slug)?.name || slug
  const lead = !filtered && posts.length > 2 ? posts[0] : null
  const grid = lead ? posts.slice(1) : posts
  const chip = (on) => `flex-shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-semibold transition ${on ? 'bg-forest text-white shadow-md shadow-forest/20' : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:ring-forest-200'}`

  return (
    <div className="min-h-screen overflow-x-clip bg-white font-body text-gray-900">
      <SEO {...pageSeo('/blog')} url="/blog" />
      <Navbar />

      <section className="relative overflow-hidden pb-10 pt-10 sm:pt-16">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[560px] bg-[radial-gradient(60%_55%_at_50%_0%,#d5f1e1_0%,rgba(236,249,242,0.6)_45%,#fff_100%)]" />
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <Reveal><Eyebrow>Sellapage blog</Eyebrow></Reveal>
          <Reveal delay={80}>
            <h1 className="mt-5 text-balance font-display text-[2.4rem] font-extrabold leading-[1.05] tracking-tight text-gray-950 sm:text-[3.3rem]">
              Ideas to run and <span className="text-forest-600">grow your business.</span>
            </h1>
          </Reveal>
          <Reveal delay={160}><p className="mx-auto mt-4 max-w-xl text-[15.5px] leading-relaxed text-gray-600 sm:text-[17px]">Practical guides for Nigerian business owners: selling online, pricing, delivery, customers and growth.</p></Reveal>
          <Reveal delay={220} className="relative mx-auto mt-7 max-w-xl">
            <Search size={19} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search articles" aria-label="Search articles"
              className="w-full rounded-2xl border border-gray-200 bg-white py-4 pl-12 pr-4 text-[15px] text-gray-900 shadow-xl shadow-forest-900/5 outline-none transition placeholder:text-gray-400 focus:border-forest-600 focus:ring-4 focus:ring-forest-50" />
          </Reveal>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        {categories.length > 0 && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0">
            <button type="button" onClick={() => setCategory('all')} className={chip(category === 'all')}>All articles</button>
            {categories.map((c) => <button key={c.id} type="button" onClick={() => setCategory(c.slug)} className={chip(category === c.slug)}>{c.name}</button>)}
          </div>
        )}
        {filtered && (
          <p className="mt-4 text-center text-[13px] text-gray-500">{loading ? 'Searching' : `${total} ${total === 1 ? 'article' : 'articles'} found${tag !== 'all' ? ` tagged "${tag}"` : ''}`}<button type="button" onClick={clearFilters} className="ml-2 font-bold text-forest-700 hover:underline">Clear</button></p>
        )}

        <div className="mt-8">
          {loading && <SkeletonCardGrid count={6} className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" />}

          {!loading && loadError && (
            <div className="flex flex-col items-center justify-center gap-3 px-4 py-20 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50"><AlertCircle size={24} className="text-red-400" /></span>
              <p className="text-[15px] font-bold text-gray-800">We could not load the articles</p>
              <p className="max-w-xs text-[13px] text-gray-500">Check your connection and try again.</p>
              <button type="button" onClick={() => fetchPosts(1, true)} className="mt-1 inline-flex items-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-[13px] font-bold text-white hover:bg-forest-700"><RefreshCw size={14} /> Try again</button>
            </div>
          )}

          {!loading && !loadError && posts.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-[28px] bg-gray-50 py-16 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white"><BookOpen size={24} className="text-gray-300" /></span>
              <p className="text-[15px] font-bold text-gray-700">{filtered ? 'No articles match your search' : 'New articles are on their way'}</p>
              {filtered && <button type="button" onClick={clearFilters} className="text-[13px] font-bold text-forest-700 hover:underline">Clear</button>}
            </div>
          )}

          {!loading && !loadError && lead && (
            <Reveal as={Link} to={`/blog/${lead.slug}`} className="group mb-6 grid grid-cols-1 overflow-hidden rounded-[28px] bg-white ring-1 ring-gray-100 transition duration-300 hover:shadow-2xl hover:shadow-forest-900/5 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
              <div className="relative h-56 overflow-hidden bg-forest-50 sm:h-72 md:h-full md:min-h-[320px]">
                {lead.featuredImageUrl
                  ? <img src={lead.featuredImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                  : <div className="absolute inset-0"><NoPhoto label={catName(lead.category)} big /></div>}
                <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-[11.5px] font-extrabold text-forest-700 shadow-sm">Latest</span>
              </div>
              <div className="flex flex-col justify-center p-6 sm:p-8">
                <span className={`w-fit rounded-full border px-2.5 py-0.5 text-[11.5px] font-bold ${getCategoryBadgeClass(lead.category)}`}>{catName(lead.category)}</span>
                <h2 className="mt-3 text-balance font-display text-[1.6rem] font-extrabold leading-tight text-gray-950 transition group-hover:text-forest-700 sm:text-[2rem]">{lead.title}</h2>
                <p className="mt-3 line-clamp-3 text-[15px] leading-relaxed text-gray-600">{getExcerpt(lead)}</p>
                <p className="mt-5 flex items-center gap-3 text-[12.5px] text-gray-500"><span className="flex items-center gap-1"><Clock size={13} />{lead.readTimeMinutes} min read</span>{formatBlogDate(lead.publishedAt) && <span>{formatBlogDate(lead.publishedAt)}</span>}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-bold text-forest-700">Read the article <ArrowRight size={16} className="transition group-hover:translate-x-1" /></span>
              </div>
            </Reveal>
          )}

          {!loading && !loadError && grid.length > 0 && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {grid.map((post) => <PostCard key={post.id} post={post} categoryLabel={catName(post.category)} />)}
            </div>
          )}

          {hasMore && !loading && (
            <div ref={sentinelRef} className="flex justify-center py-8">
              {loadingMore && <div className="flex items-center gap-2 text-gray-400"><Loader2 size={16} className="animate-spin" /><span className="text-[13px] font-medium">Loading more...</span></div>}
            </div>
          )}
          {!hasMore && !loading && posts.length > 0 && <p className="py-8 text-center text-[13px] text-gray-400">You have read to the end.</p>}
        </div>

        <Reveal className="mt-6 flex flex-col items-center gap-4 rounded-[28px] bg-forest p-6 text-center text-white sm:flex-row sm:p-8 sm:text-left">
          <div className="flex-1"><p className="font-display text-[19px] font-extrabold">Put the ideas to work.</p><p className="mt-1 text-[14px] text-white/75">Run and grow your business from one dashboard. The Starter plan is free.</p></div>
          <Link to="/login?mode=register" className="group inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-[14px] font-bold text-forest">Start free <ArrowRight size={16} className="transition group-hover:translate-x-1" /></Link>
        </Reveal>
      </div>

      <Footer />
    </div>
  )
}

/** For a post with no photo: a green panel with the category, not a blown-up logo. */
function NoPhoto({ label, big = false }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-forest via-forest-700 to-forest-600">
      <span className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/5" />
      <span className="absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-white/5" />
      <span className="relative flex flex-col items-center gap-2 text-white">
        <BookOpen size={big ? 40 : 28} className="text-forest-100" />
        {label && <span className={`font-display font-extrabold ${big ? 'text-[20px]' : 'text-[14px]'}`}>{label}</span>}
      </span>
    </div>
  )
}

function PostCard({ post, categoryLabel }) {
  return (
    <Reveal as={Link} to={`/blog/${post.slug}`} className="group flex flex-col overflow-hidden rounded-[22px] bg-white ring-1 ring-gray-100 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-forest-900/5 hover:ring-forest-200">
      <div className="relative h-44 overflow-hidden bg-forest-50">
        {post.featuredImageUrl
          ? <img src={post.featuredImageUrl} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
          : <NoPhoto label={categoryLabel} />}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <span className={`w-fit rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${getCategoryBadgeClass(post.category)}`}>{categoryLabel}</span>
        <h3 className="mt-2.5 line-clamp-2 font-display text-[17px] font-extrabold leading-snug text-gray-900 transition group-hover:text-forest-700">{post.title}</h3>
        <p className="mt-2 line-clamp-2 text-[13.5px] leading-relaxed text-gray-500">{getExcerpt(post)}</p>
        <div className="mt-auto flex items-center justify-between pt-4 text-[12px] text-gray-400">
          <span className="flex items-center gap-1"><Clock size={12} />{post.readTimeMinutes} min read</span>
          <ArrowRight size={15} className="text-gray-300 transition group-hover:translate-x-1 group-hover:text-forest-600" />
        </div>
      </div>
    </Reveal>
  )
}
