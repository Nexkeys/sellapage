//src/components/BlogCommentSection.jsx/
// Public comment section for a blog post. Mobile-first, paginated (10/page).
// Renders nothing at all - no header, no count, no form - when comments are
// disabled for the post, per spec.
import { useState, useEffect, useCallback } from 'react'
import { MessageSquare, Loader2, AlertCircle, Send } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const PAGE_SIZE = 10

export default function BlogCommentSection({ postId, commentsEnabled }) {
  const { user, store } = useAuth()
  const [comments, setComments] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [disabled, setDisabled] = useState(!commentsEnabled)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const loadComments = useCallback(async (pageNum, replace) => {
    if (replace) setLoading(true)
    else setLoadingMore(true)
    try {
      const res = await fetch(`/api/blog-public?action=list-comments&postId=${postId}&page=${pageNum}&limit=${PAGE_SIZE}`)
      const data = await res.json()
      if (data.commentsDisabled) { setDisabled(true); return }
      setComments(prev => replace ? (data.comments || []) : [...prev, ...(data.comments || [])])
      setTotal(data.total || 0)
      setPage(pageNum)
    } catch (err) {
      console.error('[BlogCommentSection] load error:', err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [postId])

  useEffect(() => {
    if (!commentsEnabled) { setDisabled(true); setLoading(false); return }
    loadComments(1, true)
  }, [postId, commentsEnabled, loadComments])

  if (disabled) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!body.trim()) return
    setSending(true)
    try {
      const headers = { 'Content-Type': 'application/json' }
      if (user) {
        const token = await user.getIdToken()
        headers.Authorization = `Bearer ${token}`
      }
      const res = await fetch(`/api/blog-public?action=submit-comment&postId=${postId}`, {
        method: 'POST', headers, body: JSON.stringify({ body: body.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to post comment')
      setComments(prev => [data.comment, ...prev])
      setTotal(t => t + 1)
      setBody('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  const hasMore = comments.length < total

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 space-y-4">
      <h2 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
        <MessageSquare size={15} className="text-brand-500" /> {total} {total === 1 ? 'Comment' : 'Comments'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-2">
        <p className="text-xs text-gray-400">Commenting as <span className="font-semibold text-gray-600">{store?.businessName || store?.storeName || 'Anonymous'}</span></p>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Share your thoughts..."
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20 resize-none"
        />
        {error && <p className="flex items-center gap-1.5 text-xs text-red-600"><AlertCircle size={12} /> {error}</p>}
        <button type="submit" disabled={sending || !body.trim()} className="flex items-center gap-1.5 px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 text-white rounded-xl text-xs font-bold transition-all">
          {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Post Comment
        </button>
      </form>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-brand-500" /></div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">Be the first to comment.</p>
      ) : (
        <div className="space-y-3">
          {comments.map(c => (
            <div key={c.id} className="border-t border-gray-100 pt-3 first:border-t-0 first:pt-0">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-gray-800">{c.authorName}</p>
                <p className="text-[10px] text-gray-400">{c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }) : ''}</p>
              </div>
              <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap leading-relaxed">{c.body}</p>
            </div>
          ))}
          {hasMore && (
            <button onClick={() => loadComments(page + 1, false)} disabled={loadingMore} className="w-full py-2 text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center justify-center gap-1.5">
              {loadingMore ? <Loader2 size={13} className="animate-spin" /> : null} Show more comments
            </button>
          )}
        </div>
      )}
    </div>
  )
}
