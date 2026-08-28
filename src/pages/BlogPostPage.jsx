//src/pages/BlogPostPage.jsx/
// Public blog post detail page — /blog/:slug. Emulates the "Execora" reference
// screenshot's structural rhythm (breadcrumb -> title -> meta row -> hero image
// -> body + sidebar with share/tags/related), adapted to Sellapage's own brand.
import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Loader2, Clock, BookOpen, Check, Share2, Twitter, Facebook,
  Linkedin, MessageCircle,
} from 'lucide-react'
// Plain browser DOMPurify — NOT isomorphic-dompurify, which drags jsdom into
// the dependency tree (see the note in blog-admin.js). This runs in the
// browser where a real DOM already exists.
import DOMPurify from 'dompurify'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Reveal from '../components/Reveal'
import BlogCommentSection from '../components/BlogCommentSection'
import { useDocumentHead } from '../hooks/useDocumentHead'
import { getExcerpt, formatBlogDate, getCategoryBadgeClass } from '../utils/blogHelpers'
import SEO from '../components/SEO'

export default function BlogPostPage() {
  const { slug } = useParams()
  const [post, setPost] = useState(null)
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setNotFound(false)
      try {
        const res = await fetch(`/api/blog-public?action=get&slug=${slug}`)
        if (res.status === 404) { if (!cancelled) setNotFound(true); return }
        const data = await res.json()
        if (!cancelled) { setPost(data.post); setRelated(data.related || []) }
      } catch (err) {
        console.error('[BlogPostPage] load error:', err)
        if (!cancelled) setNotFound(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [slug])

  useDocumentHead({
    title: post ? (post.metaTitle || post.title) : 'Blog | Sellapage',
    description: post ? (post.metaDescription || getExcerpt(post)) : undefined,
  })

  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''

  const handleCopyLink = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: post?.title, url: shareUrl }); return } catch { /* cancelled */ }
    }
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard unavailable */ }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <Navbar />
        <div className="flex items-center justify-center py-24"><Loader2 size={24} className="animate-spin text-brand-500" /></div>
        <Footer />
      </div>
    )
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-24 gap-3 px-4 text-center">
          <BookOpen size={28} className="text-gray-300" />
          <p className="font-bold text-gray-700">This article isn't available</p>
          <p className="text-sm text-gray-400 max-w-sm">It may have been unpublished or the link is incorrect.</p>
          <Link to="/blog" className="text-sm font-bold text-brand-600 hover:text-brand-700">Back to Blog</Link>
        </div>
        <Footer />
      </div>
    )
  }

  const shareText = encodeURIComponent(post.title)
  const shareUrlEnc = encodeURIComponent(shareUrl)

  return (
    <div className="min-h-screen bg-gray-50/50">
      <SEO
        title={post.metaTitle || post.title}
        description={post.metaDescription || getExcerpt(post)}
        url={`/blog/${slug}`}
        image={post.featuredImage}
        type="article"
        jsonLd={post.id ? {
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: post.title,
          description: post.metaDescription || getExcerpt(post),
          image: post.featuredImage,
          datePublished: post.publishedAt || post.createdAt,
          dateModified: post.updatedAt || post.publishedAt || post.createdAt,
          author: {
            '@type': 'Organization',
            name: post.authorName || 'Sellapage',
            url: 'https://sellapage.com.ng',
          },
          publisher: {
            '@type': 'Organization',
            name: 'Sellapage',
            url: 'https://sellapage.com.ng',
            logo: {
              '@type': 'ImageObject',
              url: 'https://sellapage.com.ng/og-image.png',
            },
          },
          mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': `https://sellapage.com.ng/blog/${slug}`,
          },
        } : null}
      />
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-4 flex-wrap">
          <Link to="/" className="hover:text-brand-600 font-semibold">Home</Link>
          <span>/</span>
          <Link to="/blog" className="flex items-center gap-1 hover:text-brand-600 font-semibold">
            <ArrowLeft size={13} /> Blog
          </Link>
          <span>/</span>
          <span className="text-gray-600 truncate max-w-[160px]">{post.categoryName}</span>
        </div>

        <Reveal className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight font-display leading-tight">
                {post.title}
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-3 text-xs text-gray-500">
                <span className="flex items-center gap-1.5 font-semibold text-gray-700">
                  <img src="/og-image.png" alt="" className="w-5 h-5 rounded-full object-cover" />
                  {post.authorName}
                </span>
                <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${getCategoryBadgeClass(post.category)}`}>
                  {post.categoryName}
                </span>
                <span className="flex items-center gap-1"><Clock size={11} /> {post.readTimeMinutes} min read</span>
                <span>{formatBlogDate(post.publishedAt)}</span>
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-brand-50 to-green-50 aspect-video">
              <img src={post.featuredImageUrl || '/og-image.png'} alt={post.title} className="w-full h-full object-cover" />
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5">
              {/* Defence in depth: blog-admin.js already sanitizes on write, but
                  posts created before that change are still stored raw, and this
                  renders on the same origin as vendor/admin Firebase sessions. */}
              <div
                className="blog-content"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.contentHtml || '') }}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 space-y-3 lg:sticky lg:top-20">
              <h2 className="font-bold text-gray-900 text-sm">Share on Social Media</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <a href={`https://twitter.com/intent/tweet?url=${shareUrlEnc}&text=${shareText}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors" title="Share on X"><Twitter size={15} /></a>
                <a href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrlEnc}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors" title="Share on Facebook"><Facebook size={15} /></a>
                <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrlEnc}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors" title="Share on LinkedIn"><Linkedin size={15} /></a>
                <a href={`https://wa.me/?text=${shareText}%20${shareUrlEnc}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors" title="Share on WhatsApp"><MessageCircle size={15} /></a>
                <button onClick={handleCopyLink} className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors" title="Copy link">
                  {copied ? <Check size={15} className="text-green-500" /> : <Share2 size={15} />}
                </button>
              </div>

              {post.tags?.length > 0 && (
                <div>
                  <h2 className="font-bold text-gray-900 text-sm mb-2">All Tags</h2>
                  <div className="flex flex-wrap gap-1.5">
                    {post.tags.map(t => (
                      <Link key={t} to={`/blog?tag=${t}`} className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${getCategoryBadgeClass(t)}`}>
                        #{t}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {related.length > 0 && (
                <div>
                  <h2 className="font-bold text-gray-900 text-sm mb-2">Related Blogs</h2>
                  <div className="space-y-3">
                    {related.map(r => (
                      <Link key={r.id} to={`/blog/${r.slug}`} className="flex gap-2.5 group">
                        <img src={r.featuredImageUrl || '/og-image.png'} alt={r.title} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-800 line-clamp-2 group-hover:text-brand-600 transition-colors">{r.title}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{formatBlogDate(r.publishedAt)}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Reveal>

        <div className="mt-6">
          <BlogCommentSection postId={post.id} commentsEnabled={post.commentsEnabled} />
        </div>
      </div>

      <Footer />
    </div>
  )
}
