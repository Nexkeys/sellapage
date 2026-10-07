// src/ops/tabs/AnnouncementStudio.jsx
//
// Announcements: a banner or a full-screen pop-up inside every vendor's
// dashboard (web and app). Written on the left, previewed on the right exactly
// as vendors will see it, and every past announcement can be switched off or
// deleted (/api/admin-announcements). The server refuses unsafe links.
import { useMemo, useState } from 'react'
import { Megaphone, ImageIcon, X, Loader2, Send, Trash2, PanelTop, Maximize2, Info, AlertTriangle, Gift } from 'lucide-react'
import { useOpsData } from '../opsKit'
import { opsJson } from '../opsSession'
import { uploadSingleImage } from '../../firebase/products'
import { Pager, Pill, Empty, Notice, Btn, Segmented, useClientPages, useConfirm, timeAgo } from './kit'

const EMPTY = { title: '', message: '', type: 'info', displayMode: 'banner', ctaLabel: '', ctaUrl: '', imageUrl: '' }
const TYPES = { info: { label: 'Info', icon: Info, cls: 'bg-sky-50 text-sky-800 border-sky-200', tone: 'blue' }, warning: { label: 'Warning', icon: AlertTriangle, cls: 'bg-amber-50 text-amber-900 border-amber-200', tone: 'amber' }, promo: { label: 'Promo', icon: Gift, cls: 'bg-violet-50 text-violet-800 border-violet-200', tone: 'violet' } }
const CTA = ['Join Now', 'Join Community', 'Join Channel', 'Follow Us', 'Follow On Instagram', 'Open WhatsApp', 'Learn More', 'Get Started', 'See Details']
const INPUT = 'w-full rounded-2xl border border-dash-line bg-white px-3.5 py-2.5 text-[13.5px] outline-none transition focus:border-forest-600 focus:ring-4 focus:ring-forest-50'

function Preview({ a }) {
  const t = TYPES[a.type] || TYPES.info
  const I = t.icon
  const cta = a.ctaUrl.trim() ? (a.ctaLabel.trim() || 'Learn More') : ''
  return (
    <div className="relative overflow-hidden rounded-[26px] border-[6px] border-slate-900 bg-[#f6f8f7] shadow-xl">
      <div className="flex items-center gap-2 bg-white px-3 py-2"><span className="h-5 w-5 rounded-md bg-forest-600" /><span className="h-2 w-20 rounded-full bg-slate-200" /><span className="ml-auto h-5 w-5 rounded-full bg-slate-200" /></div>
      {a.displayMode === 'banner' && (
        <div className={`mx-2 mt-2 flex items-center gap-2 rounded-xl border px-3 py-2 ${t.cls}`}>
          {a.imageUrl ? <img src={a.imageUrl} alt="" className="h-8 w-8 flex-shrink-0 rounded-lg object-cover" /> : <I size={16} className="flex-shrink-0" />}
          <span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-bold">{a.title || 'Your title'}</span><span className="block truncate text-[11px] opacity-80">{a.message || 'Your message'}</span></span>
          {cta && <span className="flex-shrink-0 rounded-lg bg-forest-600 px-2 py-1 text-[10.5px] font-bold text-white">{cta}</span>}
        </div>
      )}
      <div className="space-y-2 p-3">
        <div className="grid grid-cols-2 gap-2"><div className="h-14 rounded-xl bg-white" /><div className="h-14 rounded-xl bg-white" /></div>
        <div className="h-24 rounded-xl bg-white" /><div className="h-10 rounded-xl bg-white" />
      </div>
      {a.displayMode === 'modal' && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95">
            {a.imageUrl ? <img src={a.imageUrl} alt="" className="aspect-[2/1] w-full object-cover" /> : <div className={`flex aspect-[2/1] items-center justify-center ${t.cls}`}><I size={30} /></div>}
            <div className="p-3.5">
              <p className="text-[14px] font-bold text-dash-ink">{a.title || 'Your title'}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-slate-600">{a.message || 'Your message'}</p>
              {cta && <span className="mt-3 block rounded-xl bg-forest-600 py-2 text-center text-[12px] font-bold text-white">{cta}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AnnouncementStudio({ notify }) {
  const [a, setA] = useState(EMPTY)
  const [uploading, setUploading] = useState(false)
  const [posting, setPosting] = useState(false)
  const [err, setErr] = useState('')
  const [nonce, setNonce] = useState(0)
  const [busy, setBusy] = useState('')
  const [confirmUi, confirm] = useConfirm()
  const { data, loading, error } = useOpsData(`/api/admin-announcements?action=list&n=${nonce}`)
  const list = useMemo(() => data?.announcements || [], [data])
  const pg = useClientPages(list, 6)
  const live = list.filter((x) => x.active).length
  const set = (k) => (e) => setA((p) => ({ ...p, [k]: e.target.value }))

  const upload = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) { setErr('That file is not an image.'); return }
    if (file.size > 5 * 1024 * 1024) { setErr('Images must be under 5MB.'); return }
    setUploading(true); setErr('')
    try { const url = await uploadSingleImage(file, 'sellapage/announcements'); setA((p) => ({ ...p, imageUrl: url })) } catch { setErr('The image did not upload. Try again.') } finally { setUploading(false) }
  }
  const post = async () => {
    if (!a.title.trim() || !a.message.trim()) { setErr('A title and a message are both needed.'); return }
    const { ok } = await confirm({ title: 'Post this to every vendor?', icon: <Megaphone size={20} />, confirmLabel: 'Post it', body: a.displayMode === 'modal' ? 'It covers each vendor’s dashboard when they next open it, until they close it.' : 'It shows as a bar on every tab of every vendor’s dashboard.' })
    if (!ok) return
    setPosting(true); setErr('')
    const res = await opsJson('/api/admin-announcements?action=create', { method: 'POST', body: a })
    setPosting(false)
    if (!res.ok) { setErr(res.data.message || res.data.error || 'Could not post the announcement.'); return }
    notify?.('Posted. Vendors see it now.')
    setA(EMPTY)
    setNonce((n) => n + 1)
  }
  const toggle = async (x) => {
    setBusy(x.id)
    const res = await opsJson('/api/admin-announcements?action=update', { method: 'POST', body: { announcementId: x.id, active: !x.active } })
    setBusy('')
    if (!res.ok) { setErr(res.data.message || res.data.error || 'Could not change it.'); return }
    notify?.(x.active ? 'Switched off.' : 'Switched on.')
    setNonce((n) => n + 1)
  }
  const remove = async (x) => {
    const { ok } = await confirm({ title: `Delete "${x.title}"?`, tone: 'danger', icon: <Trash2 size={20} />, confirmLabel: 'Delete', body: 'Switching it off keeps it for later. Deleting removes it for good.' })
    if (!ok) return
    setBusy(x.id)
    await opsJson('/api/admin-announcements?action=delete', { method: 'POST', body: { announcementId: x.id } })
    setBusy('')
    notify?.('Deleted.')
    setNonce((n) => n + 1)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-4 rounded-3xl border border-dash-line bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-[15px] font-bold text-dash-ink"><Megaphone size={17} className="text-forest-600" /> New announcement</p>
            <Segmented value={a.displayMode} onChange={(v) => setA((p) => ({ ...p, displayMode: v }))} options={[{ id: 'banner', label: 'Bar', icon: <PanelTop size={14} /> }, { id: 'modal', label: 'Pop-up', icon: <Maximize2 size={14} /> }]} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <input value={a.title} onChange={set('title')} maxLength={120} placeholder="Title" className={INPUT} />
            <div className="flex gap-1.5">{Object.entries(TYPES).map(([id, t]) => { const I = t.icon; return <button key={id} type="button" onClick={() => setA((p) => ({ ...p, type: id }))} className={`inline-flex items-center gap-1.5 rounded-2xl px-3 text-[12.5px] font-semibold ring-1 ${a.type === id ? 'bg-dash-ink text-white ring-dash-ink' : 'bg-white text-slate-600 ring-dash-line'}`}><I size={14} />{t.label}</button> })}</div>
          </div>
          <textarea value={a.message} onChange={set('message')} rows={3} maxLength={500} placeholder="Message" className={`${INPUT} resize-none`} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block"><span className="text-[12px] font-semibold text-slate-700">Button text</span>
              <input value={a.ctaLabel} onChange={set('ctaLabel')} list="ops-ann-cta" placeholder="Learn More" className={`${INPUT} mt-1`} />
              <datalist id="ops-ann-cta">{CTA.map((c) => <option key={c} value={c} />)}</datalist></label>
            <label className="block"><span className="text-[12px] font-semibold text-slate-700">Button link</span>
              <input value={a.ctaUrl} onChange={set('ctaUrl')} type="url" inputMode="url" placeholder="https://chat.whatsapp.com/..." className={`${INPUT} mt-1`} /></label>
          </div>
          <p className="-mt-1 text-[11.5px] text-slate-400">Vendors only see the button, never the raw link. Leave the link blank for no button.</p>
          {a.imageUrl ? (
            <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-2.5 ring-1 ring-slate-100">
              <img src={a.imageUrl} alt="" className="h-14 w-24 rounded-xl object-cover" />
              <p className="flex-1 text-[12.5px] text-slate-500">Shows instead of the icon.</p>
              <button type="button" onClick={() => setA((p) => ({ ...p, imageUrl: '' }))} className="rounded-xl p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Remove image"><X size={16} /></button>
            </div>
          ) : (
            <label className={`flex items-center gap-2.5 rounded-2xl border border-dashed border-slate-300 px-4 py-3.5 text-[12.5px] text-slate-500 ${uploading ? 'cursor-wait' : 'cursor-pointer hover:border-forest-600 hover:bg-forest-50/40'}`}>
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}{uploading ? 'Uploading...' : 'Add an image (optional, under 5MB, about 1200 by 600 for pop-ups)'}
              <input type="file" accept="image/*" className="hidden" onChange={upload} disabled={uploading} />
            </label>
          )}
          <Notice tone="error" onClose={() => setErr('')}>{err}</Notice>
          <Btn size="lg" icon={<Send size={16} />} busy={posting} disabled={uploading} onClick={post}>Post to every vendor</Btn>
        </section>
        <section className="xl:sticky xl:top-24 xl:self-start">
          <p className="mb-2 text-[12px] font-semibold text-dash-muted">What vendors see</p>
          <div className="mx-auto max-w-[320px]"><Preview a={a} /></div>
        </section>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between"><p className="text-[15px] font-bold text-dash-ink">Posted</p><Pill tone={live ? 'green' : 'slate'} dot>{live} switched on</Pill></div>
        <Notice tone="error">{error}</Notice>
        {loading && !data ? <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{[0, 1].map((i) => <div key={i} className="h-24 animate-pulse rounded-3xl bg-white ring-1 ring-dash-line" />)}</div>
          : list.length === 0 ? <Empty icon={<Megaphone size={22} />} title="Nothing posted yet" />
            : (
              <>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {pg.rows.map((x) => {
                    const t = TYPES[x.type] || TYPES.info
                    return (
                      <article key={x.id} className={`flex gap-3 rounded-3xl border bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition ${x.active ? 'border-forest-200' : 'border-dash-line opacity-75'}`}>
                        {x.imageUrl ? <img src={x.imageUrl} alt="" loading="lazy" className="h-14 w-20 flex-shrink-0 rounded-xl object-cover" /> : <span className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl border ${t.cls}`}><t.icon size={20} /></span>}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-bold text-dash-ink">{x.title}</p>
                          <p className="line-clamp-2 text-[12.5px] text-slate-600">{x.message}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5"><Pill tone={t.tone}>{t.label}</Pill>{x.displayMode === 'modal' && <Pill tone="dark">Pop-up</Pill>}{x.ctaUrl && <Pill tone="green">{x.ctaLabel || 'Learn More'}</Pill>}<span className="text-[11px] text-slate-400">{timeAgo(x.createdAt)}</span></div>
                        </div>
                        <div className="flex flex-col items-end justify-between gap-2">
                          <button type="button" role="switch" aria-checked={!!x.active} aria-label={x.active ? 'Switch off' : 'Switch on'} disabled={busy === x.id} onClick={() => toggle(x)} className={`relative inline-flex h-7 w-12 items-center rounded-full transition disabled:opacity-50 ${x.active ? 'bg-forest-600' : 'bg-slate-200'}`}><span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${x.active ? 'translate-x-6' : 'translate-x-1'}`} /></button>
                          <button type="button" onClick={() => remove(x)} className="rounded-xl p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-600" aria-label="Delete"><Trash2 size={15} /></button>
                        </div>
                      </article>
                    )
                  })}
                </div>
                <Pager page={pg.page} pages={pg.pages} total={pg.total} perPage={6} onPage={pg.setPage} />
              </>
            )}
      </section>
      {confirmUi}
    </div>
  )
}
