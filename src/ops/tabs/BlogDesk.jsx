// src/ops/tabs/BlogDesk.jsx
//
// Blog: posts laid out like the magazine they become, categories beside
// them, comments moderated per post. Writing and editing use the existing
// rich-text editor (components/admin/BlogPostEditor.jsx) in a full-screen
// sheet, so nothing about how posts are saved changes (/api/blog-admin).
import { lazy, Suspense, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { BookOpen, Plus, Pencil, Trash2, MessageSquare, ExternalLink, Tag, X, Loader2, CalendarClock, ImageIcon } from 'lucide-react'
import { useOpsData } from '../opsKit'
import { opsJson, opsHeaders } from '../opsSession'
import { Chips, Pager, Pill, Empty, Notice, Btn, Drawer, useClientPages, useConfirm, fmtDate, timeAgo } from './kit'

const BlogPostEditor = lazy(() => import('../../components/admin/BlogPostEditor'))
const STATUS = { published: ['Published', 'green'], draft: ['Draft', 'slate'], scheduled: ['Scheduled', 'blue'] }
const postUrl = (slug) => `https://sellapage.com.ng/blog/${slug}`

function EditorSheet({ me, postId, onClose, onSaved }) {
  return createPortal(
    <div className="fixed inset-0 z-[125] overflow-y-auto bg-slate-900/50 backdrop-blur-sm animate-in fade-in" role="dialog" aria-modal="true" aria-label={postId ? 'Edit post' : 'New post'}>
      <div className="mx-auto min-h-full max-w-4xl bg-white px-4 pb-16 pt-5 shadow-2xl sm:my-6 sm:min-h-0 sm:rounded-[28px] sm:px-8 sm:pt-7">
        <Suspense fallback={<div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-slate-400" /></div>}>
          <BlogPostEditor authHeaders={opsHeaders} adminUid={me?.uid} postId={postId} onClose={onClose} onSaved={onSaved} />
        </Suspense>
      </div>
    </div>,
    document.body,
  )
}

function Comments({ post, onClose, onChanged }) {
  const { data, loading, reload } = useOpsData(`/api/blog-admin?action=list-comments&postId=${post.id}`)
  const [enabled, setEnabled] = useState(post.commentsEnabled)
  const [busy, setBusy] = useState('')
  const comments = data?.comments || []
  const flip = async () => {
    setBusy('flip')
    const { ok } = await opsJson('/api/blog-admin?action=toggle-comments', { method: 'POST', body: { postId: post.id, enabled: !enabled } })
    setBusy('')
    if (ok) { setEnabled(!enabled); onChanged() }
  }
  const del = async (c) => {
    setBusy(c.id)
    const { ok } = await opsJson('/api/blog-admin?action=delete-comment', { method: 'POST', body: { postId: post.id, commentId: c.id } })
    setBusy('')
    if (ok) { reload(); onChanged() }
  }
  return (
    <Drawer open onClose={onClose} title="Comments" sub={post.title}>
      <div className="mb-4 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
        <span className="text-[13px] font-semibold text-dash-ink">Readers can comment</span>
        <button type="button" role="switch" aria-checked={enabled} aria-label="Readers can comment" onClick={flip} disabled={busy === 'flip'} className={`relative inline-flex h-7 w-12 items-center rounded-full transition disabled:opacity-50 ${enabled ? 'bg-forest-600' : 'bg-slate-200'}`}><span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${enabled ? 'translate-x-6' : 'translate-x-1'}`} /></button>
      </div>
      {loading && !data ? <div className="h-40 animate-pulse rounded-2xl bg-slate-50" /> : comments.length === 0 ? <Empty icon={<MessageSquare size={22} />} title="No comments yet" className="border-none" /> : (
        <ul className="space-y-2.5">
          {comments.map((c) => (
            <li key={c.id} className="rounded-2xl border border-dash-line p-3.5">
              <div className="flex items-center gap-2"><span className="text-[13px] font-semibold text-dash-ink">{c.isAnonymous ? 'Anonymous' : c.authorName || 'Reader'}</span><span className="text-[11.5px] text-slate-400">{timeAgo(c.createdAt)}</span>
                <button type="button" onClick={() => del(c)} disabled={busy === c.id} className="ml-auto rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-40" aria-label="Delete comment">{busy === c.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}</button></div>
              <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-700">{c.body}</p>
            </li>
          ))}
        </ul>
      )}
    </Drawer>
  )
}

function Categories() {
  const [nonce, setNonce] = useState(0)
  const { data } = useOpsData(`/api/blog-admin?action=list-categories&n=${nonce}`)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [confirmUi, confirm] = useConfirm()
  const add = async () => {
    setBusy('add'); setErr('')
    const { ok, data: d } = await opsJson('/api/blog-admin?action=create-category', { method: 'POST', body: { name } })
    setBusy('')
    if (!ok) { setErr(d.message || d.error || 'Could not add it.'); return }
    setName(''); setNonce((n) => n + 1)
  }
  const del = async (c) => {
    const { ok } = await confirm({ title: `Delete "${c.name}"?`, tone: 'danger', icon: <Trash2 size={20} />, confirmLabel: 'Delete', body: 'Posts already in it keep it as text; it just stops being offered.' })
    if (!ok) return
    setBusy(c.id)
    await opsJson('/api/blog-admin?action=delete-category', { method: 'POST', body: { id: c.id } })
    setBusy(''); setNonce((n) => n + 1)
  }
  return (
    <section className="rounded-3xl border border-dash-line bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <p className="flex items-center gap-2 text-[14px] font-bold text-dash-ink"><Tag size={16} className="text-forest-600" /> Categories</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {(data?.categories || []).map((c) => (
          <span key={c.id} className="group inline-flex items-center gap-1 rounded-full bg-forest-50 py-1 pl-3 pr-1.5 text-[12.5px] font-semibold text-forest-700">
            {c.name}
            <button type="button" onClick={() => del(c)} disabled={busy === c.id} className="rounded-full p-0.5 text-forest-600/50 hover:bg-white hover:text-red-600" aria-label={`Delete ${c.name}`}><X size={13} /></button>
          </span>
        ))}
        {data && !data.categories?.length && <span className="text-[12.5px] text-slate-400">None yet.</span>}
      </div>
      <div className="mt-3 flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && name.trim() && add()} placeholder="New category" className="h-10 min-w-0 flex-1 rounded-xl border border-dash-line px-3 text-[13px] outline-none focus:border-forest-600" />
        <Btn size="md" icon={<Plus size={15} />} busy={busy === 'add'} disabled={!name.trim()} onClick={add}>Add</Btn>
      </div>
      <Notice tone="error" className="mt-2">{err}</Notice>
      {confirmUi}
    </section>
  )
}

function PostCard({ p, big, onEdit, onComments, onDelete }) {
  const [label, tone] = STATUS[p.status] || STATUS.draft
  return (
    <article className={`group flex flex-col overflow-hidden rounded-3xl border border-dash-line bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:shadow-lg ${big ? 'md:col-span-2 md:flex-row' : ''}`}>
      <div className={`relative overflow-hidden bg-gradient-to-br from-forest-50 to-emerald-100 ${big ? 'h-52 md:h-auto md:w-1/2' : 'h-40'}`}>
        {p.featuredImageUrl ? <img src={p.featuredImageUrl} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <span className="absolute inset-0 flex items-center justify-center text-forest-600/30"><ImageIcon size={40} /></span>}
        <span className="absolute left-3 top-3"><Pill tone={tone} dot className="bg-white/90 backdrop-blur">{label}</Pill></span>
      </div>
      <div className={`flex flex-1 flex-col p-5 ${big ? 'md:justify-center' : ''}`}>
        {p.category && <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-forest-600">{p.category}</p>}
        <h3 className={`mt-1 font-display font-extrabold leading-snug text-dash-ink ${big ? 'text-[24px]' : 'text-[16px]'}`}>{p.title || 'Untitled'}</h3>
        <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-slate-500"><CalendarClock size={13} />{p.status === 'published' && p.publishedAt ? `Published ${fmtDate(p.publishedAt)}` : p.status === 'scheduled' && p.publishedAt ? `Goes out ${fmtDate(p.publishedAt)}` : `Edited ${timeAgo(p.updatedAt)}`}</p>
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-4">
          <Btn size="sm" tone="dark" icon={<Pencil size={13} />} onClick={() => onEdit(p)}>Edit</Btn>
          <Btn size="sm" tone="soft" icon={<MessageSquare size={13} />} onClick={() => onComments(p)}>{p.commentCount || 0}{p.commentsEnabled ? '' : ' (off)'}</Btn>
          {p.status === 'published' && <a href={postUrl(p.slug)} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-xl px-3 text-[12px] font-semibold text-slate-600 hover:bg-slate-100"><ExternalLink size={13} /> View</a>}
          <button type="button" onClick={() => onDelete(p)} className="ml-auto rounded-xl p-2 text-slate-300 hover:bg-red-50 hover:text-red-600" aria-label="Delete post"><Trash2 size={15} /></button>
        </div>
      </div>
    </article>
  )
}

export default function BlogDesk({ me, notify }) {
  const [status, setStatus] = useState('all')
  const [nonce, setNonce] = useState(0)
  const [editing, setEditing] = useState(null)
  const [comments, setComments] = useState(null)
  const [err, setErr] = useState('')
  const [confirmUi, confirm] = useConfirm()
  const { data, loading, error } = useOpsData(`/api/blog-admin?action=list-posts&status=${status}&n=${nonce}`)
  const posts = useMemo(() => data?.posts || [], [data])
  const pg = useClientPages(posts, 9)
  const st = data?.stats

  const remove = async (p) => {
    const { ok } = await confirm({ title: `Delete "${p.title}"?`, tone: 'danger', icon: <Trash2 size={20} />, confirmLabel: 'Delete for good', body: 'The post and its comments are removed. It cannot be undone.' })
    if (!ok) return
    const res = await opsJson('/api/blog-admin?action=delete-post', { method: 'POST', body: { id: p.id } })
    if (!res.ok) { setErr(res.data.message || res.data.error || 'Could not delete it.'); return }
    notify?.('Post deleted.')
    setNonce((n) => n + 1)
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Chips value={status} onChange={setStatus} options={[{ id: 'all', label: 'All', count: st?.total }, { id: 'published', label: 'Published', count: st?.published, dot: 'bg-emerald-500' }, { id: 'scheduled', label: 'Scheduled', count: st?.scheduled, dot: 'bg-sky-500' }, { id: 'draft', label: 'Drafts', count: st?.draft }]} />
          <Btn icon={<Plus size={15} />} onClick={() => setEditing({ id: null })}>New post</Btn>
        </div>
        <Notice tone="error" onClose={() => setErr('')}>{err || error}</Notice>
        {loading && !data ? <div className="grid gap-4 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <div key={i} className={`animate-pulse rounded-3xl bg-white ring-1 ring-dash-line ${i === 0 ? 'h-72 md:col-span-2' : 'h-72'}`} />)}</div>
          : posts.length === 0 ? <Empty icon={<BookOpen size={22} />} title="No posts here" sub="Write the first one." action={<Btn icon={<Plus size={15} />} onClick={() => setEditing({ id: null })}>New post</Btn>} />
            : (
              <>
                <div className="grid gap-4 md:grid-cols-2">{pg.rows.map((p, i) => <PostCard key={p.id} p={p} big={i === 0 && pg.page === 1} onEdit={(x) => setEditing({ id: x.id })} onComments={setComments} onDelete={remove} />)}</div>
                <Pager page={pg.page} pages={pg.pages} total={pg.total} perPage={9} onPage={pg.setPage} />
              </>
            )}
      </div>
      <div className="space-y-4 xl:sticky xl:top-24 xl:self-start">
        <section className="rounded-3xl bg-gradient-to-br from-forest to-forest-600 p-5 text-white">
          <p className="text-[12.5px] text-green-100/80">On the blog</p>
          <p className="mt-1 font-display text-[40px] font-extrabold leading-none">{st?.published ?? '-'}</p>
          <p className="text-[12.5px] text-green-100/80">published post{st?.published === 1 ? '' : 's'}</p>
          <a href="https://sellapage.com.ng/blog" target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-white hover:underline"><ExternalLink size={13} /> Open the blog</a>
        </section>
        <Categories />
      </div>
      {editing && <EditorSheet me={me} postId={editing.id} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); notify?.('Post saved.'); setNonce((n) => n + 1) }} />}
      {comments && <Comments post={comments} onClose={() => setComments(null)} onChanged={() => setNonce((n) => n + 1)} />}
      {confirmUi}
    </div>
  )
}
