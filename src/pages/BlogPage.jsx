//src/pages/BlogPage.jsx/
// Public blog listing - /blog. Structural clone of JobsPage.jsx, adapted for
// editorial cards (thumbnail, category, title, excerpt, author/date/read-time).
import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, BookOpen, ArrowRight, Loader2, Clock } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Reveal from '../components/Reveal'
import SEO from '../components/SEO'
import { useDocumentHead } from '../hooks/useDocumentHead'
import { getExcerpt, formatBlogDate, getCategoryBadgeClass } from '../utils/blogHelpers'

const PAGE_SIZE = 20

export default function BlogPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [posts, setPosts] = useState([])
  const [categories, setCategories] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
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
    try {
      const params = new URLSearchParams({ action: 'list', page: String(pageNum), limit: String(PAGE_SIZE), category, tag, search })
      const res = await fetch(`/api/blog-public?${params.toString()}`)
      const data = await res.json()
      setPosts(prev => replace ? (data.posts || []) : [...prev, ...(data.posts || [])])
      setTotal(data.total || 0)
      setPage(pageNum)
    } catch (err) {
      console.error('[BlogPage] load error:', err)
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

  return (
    <div className="min-h-screen bg-gray-50/50">
      <SEO
        title="Blog"
        description="Tips, guides, and stories to help Nigerian entrepreneurs sell more with Sellapage."
        url="/blog"
        keywords="sellapage blog, nigerian business tips, ecommerce guide, online selling tips"
      />
      <Navbar />

      <section className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-500 to-green-400">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTR2MkgyNHYyaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-5">
            <BookOpen size={14} className="text-white" />
            <span className="text-[11px] font-bold text-white uppercase tracking-wider">Sellapage Blog</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-3 font-display">
            Tips to Sell Smarter
          </h1>
          <p className="text-sm sm:text-base text-white/80 max-w-lg mx-auto leading-relaxed">
            Guides, strategies, and stories to help Nigerian entrepreneurs grow their business.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-6 relative z-10 pb-16">
        <div className="max-w-3xl mx-auto mb-8 bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-200/50 p-3 sm:p-4 space-y-3">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search articles..."
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20">
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
          </select>
          {(search.trim() || category !== 'all' || tag !== 'all') && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">{total} {total === 1 ? 'article' : 'articles'} found{tag !== 'all' ? ` tagged "${tag}"` : ''}</p>
              <button onClick={clearFilters} className="text-xs font-bold text-brand-600 hover:text-brand-700">Clear</button>
            </div>
          )}
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={24} className="animate-spin text-brand-500" />
            <p className="text-sm text-gray-400">Loading articles...</p>
          </div>
        )}

        {!loading && posts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center"><BookOpen size={24} className="text-gray-300" /></div>
            <p className="text-sm font-semibold text-gray-500">{search.trim() || category !== 'all' || tag !== 'all' ? 'No articles match your filters' : 'No articles yet - check back soon'}</p>
          </div>
        )}

        {!loading && posts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                categoryLabel={categories.find(c => c.slug === post.category)?.name || post.category}
              />
            ))}
          </div>
        )}

        {hasMore && !loading && (
          <div ref={sentinelRef} className="flex justify-center py-8">
            {loadingMore && <div className="flex items-center gap-2 text-gray-400"><Loader2 size={16} className="animate-spin" /><span className="text-xs font-medium">Loading more...</span></div>}
          </div>
        )}

        {!hasMore && !loading && posts.length > 0 && <p className="text-center text-xs text-gray-400 py-8">You've seen all articles</p>}
      </div>

      <Footer />
    </div>
  )
}

function PostCard({ post, categoryLabel }) {
  return (
    <Reveal as={Link} to={`/blog/${post.slug}`} className="group block bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-lg hover:shadow-gray-200/60 hover:-translate-y-0.5 transition-all duration-300">
      <div className="relative h-32 bg-gradient-to-br from-brand-50 to-green-50 overflow-hidden">
        <img src={post.featuredImageUrl || '/og-image.png'} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
      </div>
      <div className="p-4 space-y-2">
        <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getCategoryBadgeClass(post.category)}`}>{categoryLabel}</span>
        <h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-2 group-hover:text-brand-600 transition-colors">{post.title}</h3>
        <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">{getExcerpt(post)}</p>
        <div className="flex items-center justify-between pt-1 text-[10px] text-gray-400">
          <span className="flex items-center gap-1"><Clock size={10} /> {post.readTimeMinutes} min read</span>
          <ArrowRight size={13} className="text-gray-300 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </Reveal>
  )
}
