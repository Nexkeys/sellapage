//src/components/admin/BlogAdmin.jsx/
// Self-contained Blog admin shell (own fetches/state, like JobListingsTab.jsx/
// SellaAI.jsx) - the first Admin.jsx tab factored out of the dense inline-JSX
// pattern, since a Tiptap composer with slug/SEO/scheduling/comments-moderation
// doesn't fit the Announcements-style plain-input mold every other tab uses.
import { useState, useCallback, useEffect } from 'react'
import {
  BookOpen, Plus, Edit2, Trash2, Loader2, AlertCircle, X, MessageSquare,
  ToggleLeft, ToggleRight, Tag,
} from 'lucide-react'
import BlogPostEditor from './BlogPostEditor'
import { SkeletonRows } from '../Skeleton'

// `authHeaders` is an async function returning an Authorization header carrying
// the caller's Firebase ID token (see Admin.jsx). It replaces the old static
// x-admin-token string, which was read from a VITE_ variable and therefore
// shipped to every browser in the production bundle.
async function callBlogAdmin(action, authHeaders, { method = 'GET', body, query = '' } = {}) {
  const res = await fetch(`/api/blog-admin?action=${action}${query}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Something went wrong')
  return data
}

export default function BlogAdmin({ authHeaders, adminUid }) {
  const [view, setView] = useState('list')
  const [editingPostId, setEditingPostId] = useState(null)

  const [posts, setPosts] = useState([])
  const [stats, setStats] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(null)

  const [categories, setCategories] = useState([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [creatingCategory, setCreatingCategory] = useState(false)
  const [categoriesOpen, setCategoriesOpen] = useState(false)

  const [expandedPostId, setExpandedPostId] = useState(null)
  const [comments, setComments] = useState([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [deletingComment, setDeletingComment] = useState(null)
  const [togglingComments, setTogglingComments] = useState(null)

  const loadPosts = useCallback(async (status = 'all') => {
    setLoading(true)
    setError('')
    try {
      const data = await callBlogAdmin('list-posts', authHeaders, { query: `&status=${status}` })
      setPosts(data.posts || [])
      setStats(data.stats || null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [authHeaders])

  const loadCategories = useCallback(async () => {
    try {
      const data = await callBlogAdmin('list-categories', authHeaders)
      setCategories(data.categories || [])
    } catch { /* surfaced via posts list error state if needed */ }
  }, [authHeaders])

  useEffect(() => { loadPosts(statusFilter) }, [statusFilter, loadPosts])
  useEffect(() => { loadCategories() }, [loadCategories])

  const handleDeletePost = async (id) => {
    if (!window.confirm('Delete this post permanently? This cannot be undone.')) return
    setDeleting(id)
    try {
      await callBlogAdmin('delete-post', authHeaders, { method: 'POST', body: { id } })
      setPosts(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      alert(err.message)
    } finally {
      setDeleting(null)
    }
  }

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return
    setCreatingCategory(true)
    try {
      await callBlogAdmin('create-category', authHeaders, { method: 'POST', body: { name: newCategoryName.trim() } })
      setNewCategoryName('')
      loadCategories()
    } catch (err) {
      alert(err.message)
    } finally {
      setCreatingCategory(false)
    }
  }

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Delete this category?')) return
    try {
      await callBlogAdmin('delete-category', authHeaders, { method: 'POST', body: { id } })
      setCategories(prev => prev.filter(c => c.id !== id))
    } catch (err) {
      alert(err.message)
    }
  }

  const toggleExpanded = async (postId) => {
    if (expandedPostId === postId) { setExpandedPostId(null); return }
    setExpandedPostId(postId)
    setLoadingComments(true)
    try {
      const data = await callBlogAdmin('list-comments', authHeaders, { query: `&postId=${postId}` })
      setComments(data.comments || [])
    } catch {
      setComments([])
    } finally {
      setLoadingComments(false)
    }
  }

  const handleDeleteComment = async (postId, commentId) => {
    setDeletingComment(commentId)
    try {
      await callBlogAdmin('delete-comment', authHeaders, { method: 'POST', body: { postId, commentId } })
      setComments(prev => prev.filter(c => c.id !== commentId))
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, commentCount: Math.max(0, (p.commentCount || 0) - 1) } : p))
    } catch (err) {
      alert(err.message)
    } finally {
      setDeletingComment(null)
    }
  }

  const handleToggleComments = async (post) => {
    setTogglingComments(post.id)
    const next = !post.commentsEnabled
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, commentsEnabled: next } : p))
    try {
      await callBlogAdmin('toggle-comments', authHeaders, { method: 'POST', body: { postId: post.id, enabled: next } })
    } catch (err) {
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, commentsEnabled: !next } : p))
      alert(err.message)
    } finally {
      setTogglingComments(null)
    }
  }

  if (view === 'editor') {
    return (
      <div className="p-4 sm:p-5 max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5">
          <BlogPostEditor
            authHeaders={authHeaders}
            adminUid={adminUid}
            postId={editingPostId}
            onClose={() => { setView('list'); setEditingPostId(null) }}
            onSaved={() => { setView('list'); setEditingPostId(null); loadPosts(statusFilter) }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-5 max-w-5xl mx-auto space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <BookOpen size={20} className="text-green-500" /> Blog
          </h1>
          <p className="text-gray-400 text-xs mt-0.5">Posts published on sellapage.com.ng/blog.</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => setCategoriesOpen(v => !v)} className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-xl text-xs font-bold transition-all">
            <Tag size={13} /> Categories
          </button>
          <button onClick={() => { setEditingPostId(null); setView('editor') }} className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all">
            <Plus size={14} /> New Post
          </button>
        </div>
      </div>

      {categoriesOpen && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <p className="text-xs font-bold text-gray-700">Manage Categories</p>
          <div className="flex flex-wrap gap-1.5">
            {categories.map(c => (
              <span key={c.id} className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
                {c.name}
                <button onClick={() => handleDeleteCategory(c.id)} className="text-gray-400 hover:text-red-600"><X size={11} /></button>
              </span>
            ))}
            {categories.length === 0 && <p className="text-xs text-gray-400">No categories yet.</p>}
          </div>
          <div className="flex gap-2">
            <input value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleCreateCategory() }} placeholder="New category name" className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20" />
            <button onClick={handleCreateCategory} disabled={creatingCategory || !newCategoryName.trim()} className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-lg text-xs font-bold">
              {creatingCategory ? <Loader2 size={13} className="animate-spin" /> : 'Add'}
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {['all', 'draft', 'scheduled', 'published'].map(f => (
          <button key={f} onClick={() => setStatusFilter(f)} className={`px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${statusFilter === f ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>
            {f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { l: 'Total', v: stats.total, c: 'text-gray-900' },
            { l: 'Draft', v: stats.draft, c: 'text-gray-500' },
            { l: 'Scheduled', v: stats.scheduled, c: 'text-amber-600' },
            { l: 'Published', v: stats.published, c: 'text-green-600' },
          ].map(s => (
            <div key={s.l} className="bg-white rounded-lg border border-gray-100 p-2.5 text-center">
              <p className="text-[9px] text-gray-400 font-bold uppercase">{s.l}</p>
              <p className={`text-lg font-black mt-0.5 ${s.c}`}>{s.v}</p>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {loading ? (
        <SkeletonRows count={5} />
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 flex flex-col items-center justify-center py-14 gap-3">
          <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center"><BookOpen size={20} className="text-green-400" /></div>
          <p className="font-bold text-gray-800 text-sm">No posts yet</p>
          <button onClick={() => { setEditingPostId(null); setView('editor') }} className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-bold">
            <Plus size={14} /> New Post
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="divide-y divide-gray-50">
            {posts.map(p => (
              <div key={p.id} className="px-4 py-3 hover:bg-gray-50/50">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900 truncate">{p.title}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">/blog/{p.slug} · {p.commentCount} comments</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${p.status === 'draft' ? 'bg-gray-100 text-gray-500 border-gray-200' : p.status === 'scheduled' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-green-50 text-green-600 border-green-200'}`}>{p.status}</span>
                    <button onClick={() => { setEditingPostId(p.id); setView('editor') }} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50" title="Edit"><Edit2 size={13} /></button>
                    <button onClick={() => handleDeletePost(p.id)} disabled={deleting === p.id} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50" title="Delete">
                      {deleting === p.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    </button>
                    <button onClick={() => toggleExpanded(p.id)} className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-200">
                      {expandedPostId === p.id ? 'Close' : 'Comments'}
                    </button>
                  </div>
                </div>

                {expandedPostId === p.id && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                    <button
                      onClick={() => handleToggleComments(p)}
                      disabled={togglingComments === p.id}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${p.commentsEnabled ? 'text-green-600 bg-green-50 hover:bg-green-100' : 'text-gray-400 bg-gray-100 hover:bg-gray-200'}`}
                    >
                      {p.commentsEnabled ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                      Comments {p.commentsEnabled ? 'On' : 'Off'}
                    </button>

                    {loadingComments ? (
                      <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-green-500" /></div>
                    ) : comments.length === 0 ? (
                      <p className="text-xs text-gray-400 flex items-center gap-1.5"><MessageSquare size={12} /> No comments yet.</p>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {comments.map(c => (
                          <div key={c.id} className="flex items-start justify-between gap-2 bg-gray-50/60 rounded-lg px-3 py-2">
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold text-gray-700">{c.authorName}</p>
                              <p className="text-xs text-gray-600 mt-0.5 whitespace-pre-wrap">{c.body}</p>
                            </div>
                            <button onClick={() => handleDeleteComment(p.id, c.id)} disabled={deletingComment === c.id} className="p-1 rounded text-gray-400 hover:text-red-600 flex-shrink-0 disabled:opacity-50">
                              {deletingComment === c.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
