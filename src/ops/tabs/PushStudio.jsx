// src/ops/tabs/PushStudio.jsx
//
// Push Broadcast: one notification to vendors' phones. Previewed on a lock
// screen while it is written, the audience counted live as filters change
// (devices, not stores), and sending asks for the authenticator code because a
// push cannot be recalled (/api/admin-push list, audience, send).
import { useEffect, useMemo, useState } from 'react'
import { Bell, Send, Smartphone, ImageIcon, X, Loader2, Users, CheckCircle2, XCircle } from 'lucide-react'
import { useOpsData } from '../opsKit'
import { opsJson } from '../opsSession'
import { uploadSingleImage } from '../../firebase/products'
import { Pager, Pill, Empty, Notice, Btn, Meter, useClientPages, useConfirm, useDebounced, timeAgo, fmtDateTime, title } from './kit'

const TITLE_MAX = 65
const BODY_MAX = 240
const ROUTES = [
  ['', 'Just open the app'], ['/dashboard', 'Dashboard home'], ['/dashboard/orders', 'Orders'], ['/dashboard/bookings', 'Bookings'],
  ['/dashboard/payouts', 'Payouts'], ['/dashboard/delivery', 'Delivery'], ['/dashboard/marketing', 'Marketing'], ['/dashboard/more', 'More'],
]
const PLANS = ['starter', 'growth', 'pro', 'premium']
const INPUT = 'w-full rounded-2xl border border-dash-line bg-white px-3.5 py-2.5 text-[13.5px] outline-none transition focus:border-forest-600 focus:ring-4 focus:ring-forest-50'

function LockScreen({ t, b, img }) {
  const now = new Date()
  return (
    <div className="relative mx-auto aspect-[9/17] w-full max-w-[280px] overflow-hidden rounded-[38px] border-[7px] border-slate-900 bg-gradient-to-b from-[#0b4a33] via-[#0b6b35] to-[#1f2937] shadow-2xl">
      <div className="absolute left-1/2 top-2 h-5 w-24 -translate-x-1/2 rounded-full bg-slate-900" />
      <div className="mt-14 text-center text-white">
        <p className="font-display text-[46px] font-bold leading-none">{now.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: false })}</p>
        <p className="mt-1 text-[12px] text-white/80">{now.toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>
      <div className="mx-3 mt-8 rounded-2xl bg-white/85 p-3 shadow-lg backdrop-blur animate-in slide-in-from-top-2 duration-500">
        <div className="flex items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-md bg-forest-600 text-[9px] font-black text-white">S</span><span className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">Sellapage</span><span className="ml-auto text-[10px] text-slate-400">now</span></div>
        <div className="mt-1.5 flex gap-2">
          <div className="min-w-0 flex-1"><p className="line-clamp-1 text-[12.5px] font-bold text-slate-900">{t || 'Your title'}</p><p className="line-clamp-3 text-[11.5px] leading-snug text-slate-700">{b || 'Your message shows here.'}</p></div>
          {img && <img src={img} alt="" className="h-11 w-11 flex-shrink-0 rounded-lg object-cover" />}
        </div>
      </div>
    </div>
  )
}

export default function PushStudio({ notify }) {
  const [t, setT] = useState('')
  const [b, setB] = useState('')
  const [target, setTarget] = useState('')
  const [img, setImg] = useState('')
  const [plans, setPlans] = useState([])
  const [vendorType, setVendorType] = useState('')
  const [activeOnly, setActiveOnly] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const [err, setErr] = useState('')
  const [audience, setAudience] = useState(null)
  const [nonce, setNonce] = useState(0)
  const [confirmUi, confirm] = useConfirm()
  const filters = useMemo(() => ({ ...(plans.length ? { plan: plans } : {}), ...(vendorType ? { vendorType } : {}), ...(activeOnly ? { isActive: true } : {}) }), [plans, vendorType, activeOnly])
  const key = useDebounced(JSON.stringify(filters), 400)
  const history = useOpsData(`/api/admin-push?action=list&n=${nonce}`)
  const sent = useMemo(() => history.data?.broadcasts || [], [history.data])
  const pg = useClientPages(sent, 6)

  useEffect(() => {
    let live = true
    setAudience(null)
    opsJson('/api/admin-push?action=audience', { method: 'POST', body: { filters: JSON.parse(key) } }).then(({ ok, data }) => { if (live) setAudience(ok ? data.devices : -1) })
    return () => { live = false }
  }, [key, nonce])

  const upload = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) { setErr('Pick an image under 5MB.'); return }
    setUploading(true); setErr('')
    try { setImg(await uploadSingleImage(file, 'sellapage/push')) } catch { setErr('The image did not upload.') } finally { setUploading(false) }
  }
  const send = async () => {
    const { ok } = await confirm({
      title: `Send to ${audience ?? 'every'} device${audience === 1 ? '' : 's'}?`, icon: <Bell size={20} />, tone: 'warn', confirmLabel: 'Send now',
      body: 'It arrives on vendors’ phones straight away and cannot be taken back.',
      checklist: ['I read the title and message once more.'],
    })
    if (!ok) return
    setSending(true); setErr('')
    const res = await opsJson('/api/admin-push?action=send', { method: 'POST', body: { title: t, body: b, target, imageUrl: img, filters } })
    setSending(false)
    if (!res.ok) { setErr(res.data.message || res.data.error || 'It did not send.'); return }
    notify?.(`Sent to ${res.data.sent} of ${res.data.audience} devices${res.data.failed ? `, ${res.data.failed} failed` : ''}.`)
    setT(''); setB(''); setImg(''); setTarget('')
    setNonce((n) => n + 1)
  }
  const togglePlan = (p) => setPlans((xs) => (xs.includes(p) ? xs.filter((x) => x !== p) : [...xs, p]))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="space-y-4 rounded-3xl border border-dash-line bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <p className="flex items-center gap-2 text-[15px] font-bold text-dash-ink"><Bell size={17} className="text-forest-600" /> New push notification</p>
          <label className="block"><span className="flex justify-between text-[12px] font-semibold text-slate-700"><span>Title</span><span className={t.length > TITLE_MAX - 10 ? 'text-amber-600' : 'text-slate-400'}>{t.length}/{TITLE_MAX}</span></span>
            <input value={t} onChange={(e) => setT(e.target.value.slice(0, TITLE_MAX))} placeholder="New: book delivery from your phone" className={`${INPUT} mt-1`} /></label>
          <label className="block"><span className="flex justify-between text-[12px] font-semibold text-slate-700"><span>Message</span><span className={b.length > BODY_MAX - 30 ? 'text-amber-600' : 'text-slate-400'}>{b.length}/{BODY_MAX}</span></span>
            <textarea value={b} onChange={(e) => setB(e.target.value.slice(0, BODY_MAX))} rows={3} placeholder="Tap to see what is new in your dashboard." className={`${INPUT} mt-1 resize-none`} /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block"><span className="text-[12px] font-semibold text-slate-700">A tap opens</span>
              <select value={target} onChange={(e) => setTarget(e.target.value)} className={`${INPUT} mt-1`}>{ROUTES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
            <div><span className="text-[12px] font-semibold text-slate-700">Image (optional)</span>
              {img ? <div className="mt-1 flex items-center gap-2 rounded-2xl bg-slate-50 p-2 ring-1 ring-slate-100"><img src={img} alt="" className="h-10 w-10 rounded-lg object-cover" /><span className="flex-1 text-[12px] text-slate-500">Added</span><button type="button" onClick={() => setImg('')} className="rounded-lg p-1.5 text-slate-400 hover:text-red-600" aria-label="Remove image"><X size={15} /></button></div>
                : <label className="mt-1 flex h-[46px] cursor-pointer items-center gap-2 rounded-2xl border border-dashed border-slate-300 px-3.5 text-[12.5px] text-slate-500 hover:border-forest-600">{uploading ? <Loader2 size={15} className="animate-spin" /> : <ImageIcon size={15} />}{uploading ? 'Uploading...' : 'Add an image'}<input type="file" accept="image/*" className="hidden" onChange={upload} disabled={uploading} /></label>}
            </div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
            <p className="text-[12px] font-semibold text-slate-700">Who gets it</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button type="button" onClick={() => setPlans([])} className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ring-1 ${!plans.length ? 'bg-dash-ink text-white ring-dash-ink' : 'bg-white text-slate-600 ring-dash-line'}`}>Every plan</button>
              {PLANS.map((p) => <button key={p} type="button" onClick={() => togglePlan(p)} className={`rounded-full px-3 py-1.5 text-[12px] font-semibold capitalize ring-1 ${plans.includes(p) ? 'bg-forest-600 text-white ring-forest-600' : 'bg-white text-slate-600 ring-dash-line'}`}>{p}</button>)}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {[['', 'Products and services'], ['products', 'Sells products'], ['services', 'Offers services']].map(([v, l]) => <button key={v} type="button" onClick={() => setVendorType(v)} className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ring-1 ${vendorType === v ? 'bg-dash-ink text-white ring-dash-ink' : 'bg-white text-slate-600 ring-dash-line'}`}>{l}</button>)}
              <label className="ml-1 inline-flex cursor-pointer items-center gap-1.5 text-[12px] text-slate-600"><input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} className="h-4 w-4 accent-[#0b6b35]" /> Live stores only</label>
            </div>
            <p className="mt-3 flex items-center gap-2 text-[13px] text-dash-ink"><Users size={15} className="text-forest-600" />{audience == null ? <Loader2 size={14} className="animate-spin text-slate-400" /> : audience < 0 ? 'Could not count devices.' : <><strong className="tabular-nums">{audience.toLocaleString()}</strong> phone{audience === 1 ? '' : 's'} will get this</>}</p>
          </div>
          <Notice tone="error" onClose={() => setErr('')}>{err}</Notice>
          <Btn size="lg" icon={<Send size={16} />} busy={sending} disabled={!t.trim() || !b.trim() || uploading || !audience || audience < 0} onClick={send}>Send push</Btn>
        </section>
        <section className="xl:sticky xl:top-24 xl:self-start"><p className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-dash-muted"><Smartphone size={14} /> On a vendor&apos;s phone</p><LockScreen t={t} b={b} img={img} /></section>
      </div>

      <section className="space-y-3">
        <p className="text-[15px] font-bold text-dash-ink">Sent before</p>
        <Notice tone="error">{history.error}</Notice>
        {history.loading && !history.data ? <div className="h-32 animate-pulse rounded-3xl bg-white ring-1 ring-dash-line" />
          : sent.length === 0 ? <Empty icon={<Bell size={22} />} title="Nothing sent yet" />
            : (
              <>
                <ol className="space-y-2.5">
                  {pg.rows.map((x) => (
                    <li key={x.id} className="grid gap-3 rounded-3xl border border-dash-line bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] md:grid-cols-[minmax(0,1fr)_240px] md:items-center">
                      <div className="flex min-w-0 gap-3">
                        {x.imageUrl ? <img src={x.imageUrl} alt="" loading="lazy" className="h-12 w-12 flex-shrink-0 rounded-xl object-cover" /> : <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-forest-50 text-forest-600"><Bell size={18} /></span>}
                        <div className="min-w-0"><p className="truncate text-[14px] font-bold text-dash-ink">{x.title}</p><p className="line-clamp-2 text-[12.5px] text-slate-600">{x.body}</p>
                          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400"><span title={fmtDateTime(x.sentAt)}>{timeAgo(x.sentAt)}</span>{x.filters?.plan?.length ? <Pill tone="slate">{x.filters.plan.map(title).join(', ')}</Pill> : <Pill tone="slate">Everyone</Pill>}{x.target && <Pill tone="blue">{ROUTES.find(([v]) => v === x.target)?.[1] || 'Link'}</Pill>}</p></div>
                      </div>
                      <div>
                        <div className="mb-1 flex justify-between text-[11.5px]"><span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 size={12} />{(x.sent || 0).toLocaleString()} delivered</span>{x.failed > 0 && <span className="inline-flex items-center gap-1 text-red-600"><XCircle size={12} />{x.failed}</span>}</div>
                        <Meter value={x.sent || 0} of={x.audience || 1} />
                        <p className="mt-1 text-right text-[11px] text-slate-400">of {(x.audience || 0).toLocaleString()} devices</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <Pager page={pg.page} pages={pg.pages} total={pg.total} perPage={6} onPage={pg.setPage} />
              </>
            )}
      </section>
      {confirmUi}
    </div>
  )
}
