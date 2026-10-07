// src/ops/tabs/ReviewsWall.jsx
//
// Reviews of Sellapage itself, laid out as the wall they become on the public
// Success Stories page: approve what can be shown, hide what cannot, star the
// best to feature them. The prompt switch decides whether vendors are asked
// for a review at all (/api/platform-reviews-admin).
import { useEffect, useState } from 'react'
import { Star, Check, EyeOff, Sparkles, Trash2, Film, Heart, Quote } from 'lucide-react'
import { useOpsData } from '../opsKit'
import { opsJson } from '../opsSession'
import { initials, avatarTone } from '../opsUi'
import { Chips, Pager, Pill, Empty, Notice, Btn, Lightbox, useConfirm, timeAgo } from './kit'

const PER_PAGE = 12
const TONE = { pending: ['Waiting', 'amber'], approved: ['On the wall', 'green'], rejected: ['Hidden', 'slate'] }

function Stars({ n }) {
  return <span className="inline-flex gap-0.5" aria-label={`${n} of 5 stars`}>{[1, 2, 3, 4, 5].map((i) => <Star key={i} size={14} className={n >= i ? 'fill-amber-400 text-amber-400' : 'fill-slate-100 text-slate-200'} />)}</span>
}

function PromptSwitch() {
  const { data, loading } = useOpsData('/api/platform-reviews-admin?action=get-prompt-settings')
  const [on, setOn] = useState(null)
  const [busy, setBusy] = useState(false)
  const value = on ?? !!data?.enabled
  const flip = async () => {
    setBusy(true)
    const { ok } = await opsJson('/api/platform-reviews-admin?action=set-prompt-settings', { method: 'POST', body: { enabled: !value } })
    setBusy(false)
    if (ok) setOn(!value)
  }
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-dash-line">
      <Heart size={16} className="text-rose-500" />
      <div className="min-w-0"><p className="text-[13px] font-semibold text-dash-ink">Ask vendors for a review</p><p className="text-[11.5px] text-dash-muted">{value ? 'Vendors see the review prompt' : 'The prompt is off'}</p></div>
      <button type="button" role="switch" aria-checked={value} aria-label="Ask vendors for a review" onClick={flip} disabled={loading || busy}
        className={`relative ml-2 inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition disabled:opacity-50 ${value ? 'bg-forest-600' : 'bg-slate-200'}`}>
        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${value ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  )
}

export default function ReviewsWall({ notify }) {
  const [status, setStatus] = useState('pending')
  const [page, setPage] = useState(1)
  const [nonce, setNonce] = useState(0)
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [img, setImg] = useState('')
  const [confirmUi, confirm] = useConfirm()
  useEffect(() => { setPage(1) }, [status])
  const { data, loading, error } = useOpsData(`/api/platform-reviews-admin?action=list&status=${status}&page=${page}&limit=${PER_PAGE}&n=${nonce}`)
  const rows = data?.reviews || []
  const counts = data?.counts || {}
  const pages = Math.max(1, Math.ceil((data?.total || 0) / PER_PAGE))

  const call = async (r, action, body, msg) => {
    setBusy(`${r.id}:${action}`); setErr('')
    const res = await opsJson(`/api/platform-reviews-admin?action=${action}`, { method: 'POST', body: { reviewId: r.id, ...body } })
    setBusy('')
    if (!res.ok) { setErr(res.data.message || res.data.error || 'Could not save.'); return }
    notify?.(msg)
    setNonce((n) => n + 1)
  }
  const remove = async (r) => {
    const { ok } = await confirm({ title: 'Delete this review for good?', tone: 'danger', icon: <Trash2 size={20} />, confirmLabel: 'Delete', body: `${r.authorName || 'Their'} review is removed and cannot be brought back. Hiding it keeps it out of sight instead.` })
    if (ok) call(r, 'delete', {}, 'Review deleted.')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Chips value={status} onChange={setStatus} options={[
          { id: 'pending', label: 'Waiting', count: counts.pending, dot: 'bg-amber-500' },
          { id: 'approved', label: 'On the wall', count: counts.approved, dot: 'bg-emerald-500' },
          { id: 'rejected', label: 'Hidden', count: counts.rejected },
          { id: 'all', label: 'All', count: counts.all },
        ]} />
        <PromptSwitch />
      </div>
      <Notice tone="error" onClose={() => setErr('')}>{err || error}</Notice>

      {loading && !data ? <div className="columns-1 gap-4 sm:columns-2 xl:columns-3">{[180, 240, 200, 260, 190, 220].map((h, i) => <div key={i} className="mb-4 animate-pulse break-inside-avoid rounded-3xl bg-white ring-1 ring-dash-line" style={{ height: h }} />)}</div>
        : rows.length === 0 ? <Empty icon={<Quote size={22} />} title={status === 'pending' ? 'No reviews waiting' : 'Nothing here'} sub="When vendors review Sellapage from their dashboard, the reviews wait here first." />
          : (
            <>
              <div className="columns-1 gap-4 sm:columns-2 xl:columns-3">
                {rows.map((r) => {
                  const [label, tone] = TONE[r.status] || TONE.pending
                  return (
                    <article key={r.id} className={`relative mb-4 break-inside-avoid rounded-3xl border bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${r.featured ? 'border-amber-200 ring-2 ring-amber-100' : 'border-dash-line'}`}>
                      {r.featured && <span className="absolute -top-2.5 right-5 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-0.5 text-[10.5px] font-bold text-amber-950 shadow-sm"><Sparkles size={11} /> Featured</span>}
                      <Quote size={22} className="text-forest-100" />
                      <p className="mt-1 whitespace-pre-wrap text-[14px] leading-relaxed text-dash-ink">{r.reviewText || r.message || ''}</p>
                      {(r.images?.length > 0 || r.videos?.length > 0) && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {(r.images || []).map((u) => <button key={u} type="button" onClick={() => setImg(u)} className="h-16 w-16 overflow-hidden rounded-xl ring-1 ring-dash-line"><img src={u} alt="" loading="lazy" className="h-full w-full object-cover" /></button>)}
                          {(r.videos || []).map((u) => <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="flex h-16 w-16 items-center justify-center rounded-xl bg-slate-900 text-white" aria-label="Play video"><Film size={18} /></a>)}
                        </div>
                      )}
                      <div className="mt-4 flex items-center gap-3">
                        <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${avatarTone(r.id)}`}>{initials(r.authorName || r.storeName)}</span>
                        <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold text-dash-ink">{r.authorName || 'Anonymous'}</p><p className="truncate text-[11.5px] text-slate-500">{r.storeName}</p></div>
                        <Stars n={Number(r.rating) || 0} />
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-dash-line pt-3">
                        <Pill tone={tone} dot>{label}</Pill>
                        <span className="text-[11px] text-slate-400">{timeAgo(r.createdAt)}</span>
                        <span className="flex-1" />
                        {r.status !== 'approved' && <Btn size="sm" icon={<Check size={13} />} busy={busy === `${r.id}:moderate`} onClick={() => call(r, 'moderate', { status: 'approved' }, 'Approved. It is on the wall.')}>Approve</Btn>}
                        {r.status !== 'rejected' && <Btn size="sm" tone="soft" icon={<EyeOff size={13} />} busy={busy === `${r.id}:moderate`} onClick={() => call(r, 'moderate', { status: 'rejected' }, 'Hidden.')}>Hide</Btn>}
                        {r.status === 'approved' && <Btn size="sm" tone="soft" icon={<Sparkles size={13} className={r.featured ? 'fill-amber-400 text-amber-500' : ''} />} busy={busy === `${r.id}:toggle-featured`} onClick={() => call(r, 'toggle-featured', { featured: !r.featured }, r.featured ? 'No longer featured.' : 'Featured.')}>{r.featured ? 'Unfeature' : 'Feature'}</Btn>}
                        <button type="button" onClick={() => remove(r)} className="rounded-xl p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Delete review"><Trash2 size={15} /></button>
                      </div>
                    </article>
                  )
                })}
              </div>
              <Pager page={page} pages={pages} total={data?.total} perPage={PER_PAGE} onPage={setPage} />
            </>
          )}
      <Lightbox src={img} onClose={() => setImg('')} />
      {confirmUi}
    </div>
  )
}
