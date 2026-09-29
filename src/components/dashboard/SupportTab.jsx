//src/components/dashboard/SupportTab.jsx/
//
// The Support Center, rebuilt on 2026-09-29 to the Support design:
//   - "Describe your issue" searches the built-in guide as you type, and can
//     send the question to the team or to Sella AI (Premium) in one tap
//   - Quick Resolution topics and a detailed guide (./support/guides.js)
//   - Your conversations: the store's own support messages and their status,
//     read straight from supportMessages (one small query per visit)
//   - Sella AI card: hands the question to Sella on Premium
// Messages still go through Dashboard's handleSupportSubmit, unchanged.
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Search, Sparkles, ArrowRight, MessageCircle, Mail, ShieldCheck, ShoppingCart, Store, Truck, Package,
  CreditCard, ChevronRight, X, Send, Loader2, CheckCircle2, AlertCircle, BookOpen, Zap, Lock,
  MessagesSquare, Compass, Clock, ChevronDown,
} from 'lucide-react'
import { collection, query, where, limit } from 'firebase/firestore'
import { getDocs } from '../../firebase/metered'
import { db } from '../../firebase/config'
import MediaSlot from '../../media/MediaSlot'
import { hasMedia } from '../../media/hasMedia'
import { Skeleton } from '../Skeleton'
import { QUICK_TOPICS, GUIDES, GUIDE_LIST, SEARCH_INDEX } from './support/guides'

const SUPPORT_WHATSAPP = 'https://wa.me/2348120525256'
const SUPPORT_EMAIL = 'sellapage.ng@gmail.com'
const card = 'rounded-2xl border border-dash-line bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]'

const CATEGORIES = [
  { value: 'general', label: 'General Question' },
  { value: 'products', label: 'Products and Store' },
  { value: 'billing', label: 'Billing and Plans' },
  { value: 'technical', label: 'Technical Issue' },
  { value: 'feature', label: 'Feature Request' },
]
const TOPIC_ICON = { shield: ShieldCheck, cart: ShoppingCart, store: Store, truck: Truck, box: Package, card: CreditCard }
const TOPIC_TONE = ['bg-forest-50 text-forest-600', 'bg-blue-50 text-blue-600', 'bg-forest-50 text-forest-600', 'bg-sky-50 text-sky-600', 'bg-violet-50 text-violet-600', 'bg-teal-50 text-teal-600']
const SUGGESTIONS = ['My customer paid but I can’t see the order', 'How do I set up Paystack?', 'Where is my payout?', 'How does delivery work?']
const STATUS = {
  open: { label: 'Waiting on us', cls: 'bg-amber-50 text-amber-700' },
  in_progress: { label: 'In progress', cls: 'bg-blue-50 text-blue-700' },
  resolved: { label: 'Resolved', cls: 'bg-forest-50 text-forest-600' },
}
const ticketCache = new Map()

const timeAgo = (v) => {
  const d = v?.toDate ? v.toDate() : v ? new Date(v) : null
  if (!d || Number.isNaN(d.getTime())) return ''
  const s = (Date.now() - d.getTime()) / 1000
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function GuideDrawer({ id, onClose, navigateTo }) {
  useEffect(() => {
    if (!id) return undefined
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [id, onClose])
  if (!id || !GUIDES[id]) return null
  const g = GUIDES[id]
  return createPortal(
    <div className="fixed inset-0 z-[90] flex justify-end" role="dialog" aria-modal="true" aria-labelledby="guide-title">
      <div className="absolute inset-0 bg-black/35 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between border-b border-dash-line px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest-50 text-forest-600"><BookOpen size={17} /></span>
            <h2 id="guide-title" className="text-[16px] font-semibold text-dash-ink">{g.title}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-dash-muted hover:bg-gray-100" aria-label="Close guide"><X size={17} /></button>
        </div>
        <ol className="flex-1 space-y-3 overflow-y-auto p-5">
          {g.steps.map((s, i) => (
            <li key={s.t} className="flex gap-3 rounded-2xl border border-dash-line p-4 animate-in fade-in slide-in-from-right-2 duration-300" style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'both' }}>
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-forest text-xs font-bold text-white">{i + 1}</span>
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-dash-ink">{s.t}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{s.d}</p>
                {s.tab && (
                  <button type="button" onClick={() => { onClose(); navigateTo?.(s.tab) }} className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-forest-600 hover:underline">
                    {s.cta || 'Take me there'} <ArrowRight size={12} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ol>
        <div className="border-t border-dash-line p-5">
          <p className="text-xs text-dash-muted">Still stuck? A real person on our team will help.</p>
          <a href={SUPPORT_WHATSAPP} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-sm font-semibold text-white hover:bg-forest-700">
            <MessageCircle size={16} /> Chat on WhatsApp
          </a>
        </div>
      </aside>
    </div>,
    document.body,
  )
}

export default function SupportTab({
  store, plan, isGrowthOrPro,
  onSubmit, submitting, submitError, submitSuccess,
  navigateTo,
}) {
  const isPremium = store?.hasPremiumFeatures ?? plan === 'premium'
  const isOwner = !store?._isStaff
  const [ask, setAsk] = useState('')
  const [guide, setGuide] = useState(null)
  const [compose, setCompose] = useState(null) // { category, message }
  const [sent, setSent] = useState(false)
  const [tickets, setTickets] = useState(() => ticketCache.get(store?.id) || null)
  const [ticketsState, setTicketsState] = useState(ticketCache.get(store?.id) ? 'ready' : 'loading')
  const [allTickets, setAllTickets] = useState(false)
  const [sellaAsk, setSellaAsk] = useState('')
  const [guideSearch, setGuideSearch] = useState('')
  const pendingSubmit = useRef(null)

  // The store's own messages. Owners only: the rule is uid == storeId.
  useEffect(() => {
    if (!store?.id || !isOwner || ticketCache.get(store.id)) { if (!isOwner) setTicketsState('ready'); return }
    let cancelled = false
    getDocs(query(collection(db, 'supportMessages'), where('storeId', '==', store.id), limit(30)))
      .then((snap) => {
        if (cancelled) return
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
        ticketCache.set(store.id, list)
        setTickets(list)
        setTicketsState('ready')
      })
      .catch(() => { if (!cancelled) setTicketsState('error') })
    return () => { cancelled = true }
  }, [store?.id, isOwner])

  // A message that went through: celebrate it and show it in the list.
  useEffect(() => {
    if (!submitSuccess || !pendingSubmit.current) return
    const t = { id: `local-${Date.now()}`, ...pendingSubmit.current, status: 'open', createdAt: new Date() }
    pendingSubmit.current = null
    setTickets((l) => { const next = [t, ...(l || [])]; if (store?.id) ticketCache.set(store.id, next); return next })
    setCompose(null)
    setSent(true)
  }, [submitSuccess, store?.id])

  const results = useMemo(() => {
    const q = ask.trim().toLowerCase()
    if (q.length < 3) return []
    const words = q.split(/\s+/).filter((w) => w.length > 2)
    return SEARCH_INDEX
      .map((e) => ({ e, score: words.reduce((n, w) => n + (e.hay.includes(w) ? 1 : 0), 0) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((r) => r.e)
  }, [ask])

  const guideMatches = useMemo(() => {
    const q = guideSearch.trim().toLowerCase()
    if (!q) return GUIDE_LIST
    return GUIDE_LIST.filter((g) => `${g.title} ${g.sub} ${GUIDES[g.id]?.steps.map((s) => `${s.t} ${s.d}`).join(' ')}`.toLowerCase().includes(q))
  }, [guideSearch])

  const openSella = (prompt) => window.dispatchEvent(new CustomEvent('sella:open', { detail: { prompt } }))
  const send = () => {
    if (!compose?.message?.trim()) return
    pendingSubmit.current = { category: compose.category, message: compose.message.trim() }
    onSubmit({ category: compose.category, message: compose.message })
  }
  const shownTickets = (tickets || []).slice(0, allTickets ? 30 : 5)

  return (
    <div className="mx-auto w-full max-w-[1320px] space-y-5 px-4 pb-10 pt-5 sm:px-6 lg:px-8 lg:pt-7">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          {/* Banner with the question box */}
          <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-forest-50/80 via-[#eef8f2] to-[#e2f3e9]">
            <div className="relative z-[1] p-5 sm:p-7 lg:max-w-[70%]">
              <span className="inline-flex rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-forest-600 ring-1 ring-forest-100">Support Center</span>
              <h1 className="mt-3 font-body text-[28px] font-bold leading-tight tracking-tight text-dash-ink sm:text-[36px]">We&apos;re here when you need us.</h1>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-600">Get quick answers, solve issues, or chat with our team. We&apos;re just a message away.</p>
              <div className="relative mt-5">
                <div className="flex items-center gap-2 rounded-2xl bg-white p-2 pl-4 shadow-lg shadow-forest/5 ring-1 ring-dash-line focus-within:ring-forest-200">
                  <Sparkles size={18} className="flex-shrink-0 text-forest-600" />
                  <input
                    value={ask}
                    onChange={(e) => setAsk(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && ask.trim()) { e.preventDefault(); if (results[0]) setGuide(results[0].guide); else setCompose({ category: 'general', message: ask.trim() }) } }}
                    placeholder="Describe your issue or question..."
                    aria-label="Describe your issue or question"
                    className="h-10 min-w-0 flex-1 bg-transparent text-[14px] text-dash-ink outline-none placeholder:text-slate-400"
                  />
                  <button type="button" onClick={() => { if (!ask.trim()) return; if (results[0]) setGuide(results[0].guide); else setCompose({ category: 'general', message: ask.trim() }) }} className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-forest text-white transition hover:bg-forest-700" aria-label="Find answers">
                    <ArrowRight size={17} />
                  </button>
                </div>
                {ask.trim().length >= 3 && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-dash-line bg-white shadow-xl animate-in fade-in slide-in-from-top-1 duration-150">
                    {results.length > 0 ? results.map((r) => (
                      <button key={r.id} type="button" onClick={() => setGuide(r.guide)} className="flex w-full items-start gap-3 border-b border-dash-line px-4 py-3 text-left last:border-0 hover:bg-forest-50/50">
                        <BookOpen size={16} className="mt-0.5 flex-shrink-0 text-forest-600" />
                        <span className="min-w-0">
                          <span className="block text-[13px] font-semibold text-dash-ink">{r.t}</span>
                          <span className="block truncate text-xs text-dash-muted">{r.guideTitle} • {r.d}</span>
                        </span>
                      </button>
                    )) : (
                      <p className="px-4 py-3 text-xs text-dash-muted">No guide matches that yet. Our team can answer it.</p>
                    )}
                    <div className="flex flex-wrap gap-2 bg-gray-50 px-4 py-3">
                      <button type="button" onClick={() => setCompose({ category: 'general', message: ask.trim() })} className="inline-flex items-center gap-1.5 rounded-lg bg-forest px-3 py-1.5 text-xs font-semibold text-white"><Send size={12} /> Send this to our team</button>
                      {isPremium && <button type="button" onClick={() => openSella(ask.trim())} className="inline-flex items-center gap-1.5 rounded-lg border border-dash-line bg-white px-3 py-1.5 text-xs font-semibold text-dash-ink"><Sparkles size={12} className="text-forest-600" /> Ask Sella AI</button>}
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {SUGGESTIONS.map((sug) => (
                  <button key={sug} type="button" onClick={() => setAsk(sug)} className="rounded-full bg-white/80 px-3 py-1.5 text-[11px] text-slate-600 ring-1 ring-dash-line transition hover:bg-white hover:text-forest">{sug}</button>
                ))}
              </div>
            </div>
            {hasMedia('support-hero') && (
              <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[30%] lg:block">
                <MediaSlot name="support-hero" alt="" className="h-full w-full object-cover object-left mix-blend-multiply [mask-image:linear-gradient(to_right,transparent_22%,black_48%)]" />
              </div>
            )}
          </section>

          {/* Quick resolution */}
          <section className={`${card} p-4 sm:p-5`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-dash-ink text-white"><Zap size={17} /></span>
                <div>
                  <p className="text-[15px] font-semibold text-dash-ink">Quick Resolution</p>
                  <p className="text-xs text-dash-muted">Find the right help for your issue in seconds.</p>
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
              {QUICK_TOPICS.map((t, i) => {
                const Icon = TOPIC_ICON[t.icon]
                return (
                  <button key={t.id} type="button" onClick={() => setGuide(t.id)} className="group relative flex flex-col rounded-2xl border border-dash-line p-4 text-left transition hover:-translate-y-0.5 hover:border-forest-100 hover:shadow-md">
                    <ArrowRight size={14} className="absolute right-3 top-3 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-forest" />
                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${TOPIC_TONE[i]}`}><Icon size={18} /></span>
                    <span className="mt-4 text-[13px] font-semibold leading-snug text-dash-ink">{t.title}</span>
                    <span className="mt-1 text-[11px] leading-snug text-dash-muted">{t.sub}</span>
                  </button>
                )
              })}
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
            {/* Conversations */}
            <section className={`${card} p-4 sm:p-5`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gray-50 text-slate-600"><MessagesSquare size={18} /></span>
                  <div>
                    <p className="text-[15px] font-semibold text-dash-ink">Your conversations</p>
                    <p className="text-xs text-dash-muted">Track your support requests and their status.</p>
                  </div>
                </div>
                {(tickets?.length || 0) > 5 && (
                  <button type="button" onClick={() => setAllTickets((v) => !v)} className="inline-flex flex-shrink-0 items-center gap-1 text-xs font-semibold text-forest-600 hover:underline">
                    {allTickets ? 'Show less' : 'View all'} <ArrowRight size={12} />
                  </button>
                )}
              </div>
              <div className="mt-4">
                {!isOwner ? (
                  <p className="rounded-xl bg-gray-50 px-4 py-6 text-center text-xs text-dash-muted">The store owner sees the conversation history. You can still send us a message.</p>
                ) : ticketsState === 'loading' ? (
                  <div className="space-y-2" role="status" aria-label="Loading your conversations">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
                ) : ticketsState === 'error' ? (
                  <p className="rounded-xl bg-red-50 px-4 py-4 text-center text-xs text-red-700">We couldn&apos;t load your conversations. Refresh to try again.</p>
                ) : shownTickets.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-dash-line px-4 py-8 text-center">
                    <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-forest-50 text-forest-600"><MessagesSquare size={19} /></span>
                    <p className="mt-3 text-sm font-semibold text-dash-ink">No conversations yet</p>
                    <p className="mx-auto mt-1 max-w-xs text-xs text-dash-muted">When you message us, you&apos;ll see it here with its status, so you always know where things stand.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-dash-line">
                    {shownTickets.map((t) => {
                      const st = STATUS[t.status] || STATUS.open
                      return (
                        <li key={t.id} className="flex items-center gap-3 py-3">
                          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gray-50 text-slate-500"><MessageCircle size={16} /></span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-semibold text-dash-ink">{CATEGORIES.find((c) => c.value === t.category)?.label || 'Question'}</span>
                            <span className="block truncate text-xs text-dash-muted">{t.message}</span>
                          </span>
                          <span className={`hidden flex-shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold sm:inline ${st.cls}`}>{st.label}</span>
                          <span className="flex-shrink-0 text-[11px] text-dash-muted">{timeAgo(t.createdAt)}</span>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </section>

            {/* Sella */}
            <section className={`${card} flex flex-col p-4 sm:p-5`}>
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-forest-50 text-forest-600"><Sparkles size={18} /></span>
                <div>
                  <p className="flex items-center gap-2 text-[15px] font-semibold text-dash-ink">AI Business Partner {!isPremium && <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">Premium</span>}</p>
                  <p className="text-xs text-dash-muted">Instant answers and step-by-step help from Sella, any time of day.</p>
                </div>
              </div>
              <div className="mt-4 flex items-start gap-2.5">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-forest text-white"><Sparkles size={14} /></span>
                <div className="rounded-2xl rounded-tl-md bg-forest-50/70 px-3.5 py-2.5 text-[13px] leading-relaxed text-dash-ink ring-1 ring-forest-100">
                  Hi there! I&apos;m Sella, your business partner. What do you need help with today?
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {['Fix payment issues', 'Set up my store', 'Track my order', 'Learn about plans'].map((q) => (
                  <button key={q} type="button" disabled={!isPremium} onClick={() => openSella(q)} className="rounded-full border border-dash-line px-3 py-1 text-[11px] text-slate-600 transition hover:border-forest-200 hover:text-forest disabled:opacity-60">{q}</button>
                ))}
              </div>
              {isPremium ? (
                <form onSubmit={(e) => { e.preventDefault(); if (sellaAsk.trim()) { openSella(sellaAsk.trim()); setSellaAsk('') } }} className="mt-auto flex items-center gap-2 pt-4">
                  <input value={sellaAsk} onChange={(e) => setSellaAsk(e.target.value)} placeholder="Type your question..." className="h-10 min-w-0 flex-1 rounded-xl border border-dash-line px-3.5 text-[13px] outline-none focus:border-forest-200" />
                  <button type="submit" className="flex h-10 w-10 items-center justify-center rounded-full bg-forest text-white" aria-label="Ask Sella"><Send size={15} /></button>
                </form>
              ) : (
                <button type="button" onClick={() => navigateTo?.('billing')} className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-forest-700">
                  <Lock size={13} /> Unlock Sella on Premium
                </button>
              )}
            </section>
          </div>

          {/* Still need help */}
          <section className="flex flex-col items-start gap-4 rounded-2xl bg-gradient-to-r from-forest-50 via-[#eef8f2] to-white p-5 sm:flex-row sm:items-center">
            <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-forest text-white shadow-lg shadow-forest/25"><Compass size={22} /></span>
            <div className="flex-1">
              <p className="text-[16px] font-semibold text-dash-ink">Still need help?</p>
              <p className="text-xs text-slate-600">Reach out and we&apos;ll get back to you as soon as we can.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={SUPPORT_WHATSAPP} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-xs font-semibold text-white hover:bg-forest-700"><MessageCircle size={14} /> Chat on WhatsApp</a>
              <button type="button" onClick={() => setCompose({ category: 'general', message: '' })} className="inline-flex items-center gap-2 rounded-xl border border-forest-200 bg-white px-4 py-2.5 text-xs font-semibold text-forest hover:bg-forest-50"><Mail size={14} /> Send a Message</button>
            </div>
          </section>
        </div>

        {/* Rail */}
        <aside className="space-y-4">
          <section className={`${card} p-5`}>
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-semibold text-dash-ink">Your Support Team</p>
              {isGrowthOrPro && <span className="inline-flex items-center gap-1 rounded-full bg-forest-50 px-2 py-0.5 text-[10px] font-semibold text-forest-600"><Zap size={10} /> Priority</span>}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-dash-muted">Real people who help with your store, orders, billing and anything technical. We read every message.</p>
            <div className="mt-4 flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-forest text-sm font-bold text-white">S</span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-dash-ink">Sellapage Support</span>
                <span className="block truncate text-[11px] text-dash-muted">{SUPPORT_EMAIL}</span>
              </span>
            </div>
            <div className="mt-4 grid gap-2">
              <a href={SUPPORT_WHATSAPP} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-sm font-semibold text-white hover:bg-forest-700"><MessageCircle size={16} /> Chat on WhatsApp</a>
              <button type="button" onClick={() => setCompose({ category: 'general', message: '' })} className="inline-flex items-center justify-center gap-2 rounded-xl border border-forest-200 px-4 py-2.5 text-sm font-semibold text-forest hover:bg-forest-50"><Mail size={16} /> Send a Message</button>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-dash-muted"><Clock size={12} /> {isGrowthOrPro ? 'Paid plans are answered first.' : 'Messages are answered in the order they arrive.'}</p>
          </section>

          <section className={`${card} p-5`}>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gray-50 text-slate-600"><Compass size={18} /></span>
              <div>
                <p className="text-[15px] font-semibold text-dash-ink">Need a detailed guide?</p>
                <p className="text-xs text-dash-muted">Step-by-step help for every part of your store.</p>
              </div>
            </div>
            <label className="relative mt-4 block">
              <span className="sr-only">Search the guide</span>
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={guideSearch} onChange={(e) => setGuideSearch(e.target.value)} placeholder="Search the guide..." className="h-10 w-full rounded-xl border border-dash-line pl-9 pr-3 text-[13px] outline-none focus:border-forest-200" />
            </label>
            <ul className="mt-3 space-y-1">
              {guideMatches.map((g) => (
                <li key={g.id}>
                  <button type="button" onClick={() => setGuide(g.id)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-gray-50">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-forest-50 text-forest-600"><BookOpen size={15} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium text-dash-ink">{g.title}</span>
                      <span className="block truncate text-[11px] text-dash-muted">{g.sub}</span>
                    </span>
                    <ChevronRight size={15} className="text-slate-400" />
                  </button>
                </li>
              ))}
              {guideMatches.length === 0 && <li className="px-2 py-3 text-xs text-dash-muted">Nothing matches. Try another word, or message us.</li>}
            </ul>
          </section>

          {hasMedia('support-script') && (
            <div className="mx-auto w-44"><MediaSlot name="support-script" alt="Your success matters to us" className="h-auto w-full mix-blend-multiply [mask-image:radial-gradient(ellipse_at_center,black_60%,transparent_88%)]" /></div>
          )}
        </aside>
      </div>

      <GuideDrawer id={guide} onClose={() => setGuide(null)} navigateTo={navigateTo} />

      {/* Compose */}
      {compose && createPortal(
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="sup-compose-title">
          <div className="w-full rounded-t-3xl bg-white p-5 shadow-2xl animate-in slide-in-from-bottom-4 duration-200 sm:max-w-lg sm:rounded-3xl sm:p-6">
            <div className="flex items-center justify-between">
              <h3 id="sup-compose-title" className="flex items-center gap-2 text-lg font-bold text-dash-ink"><Mail size={18} className="text-forest-600" /> Message our team</h3>
              <button type="button" onClick={() => setCompose(null)} className="rounded-full p-2 text-dash-muted hover:bg-gray-100" aria-label="Close"><X size={17} /></button>
            </div>
            <p className="mt-1 text-xs text-dash-muted">Your store details are attached automatically, so no need to explain who you are.</p>
            <div className="mt-4 space-y-3">
              <div className="relative">
                <label htmlFor="sup-cat" className="mb-1.5 block text-[13px] font-semibold text-dash-ink">What is it about?</label>
                <select id="sup-cat" value={compose.category} onChange={(e) => setCompose((c) => ({ ...c, category: e.target.value }))} className="h-11 w-full appearance-none rounded-xl border border-dash-line bg-white px-3.5 text-sm outline-none focus:border-forest-200">
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <ChevronDown size={15} className="pointer-events-none absolute bottom-3.5 right-3.5 text-slate-400" />
              </div>
              <div>
                <label htmlFor="sup-msg" className="mb-1.5 block text-[13px] font-semibold text-dash-ink">Your message</label>
                <textarea id="sup-msg" rows={6} value={compose.message} onChange={(e) => setCompose((c) => ({ ...c, message: e.target.value }))} autoFocus placeholder="Tell us what happened. An order number or Paystack reference helps us sort it faster." className="w-full resize-none rounded-xl border border-dash-line px-3.5 py-3 text-sm outline-none focus:border-forest-200 focus:ring-4 focus:ring-forest-50" />
                <p className={`mt-1 text-[11px] ${compose.message.trim().length && compose.message.trim().length < 15 ? 'text-amber-700' : 'text-dash-muted'}`}>
                  {compose.message.trim().length && compose.message.trim().length < 15 ? 'A little more detail helps us help you faster.' : `${compose.message.length} characters`}
                </p>
              </div>
              {submitError && <p role="alert" className="flex items-center gap-2 rounded-xl bg-red-50 px-3.5 py-2.5 text-xs text-red-700"><AlertCircle size={14} /> {submitError}</p>}
              <button type="button" onClick={send} disabled={submitting || !compose.message.trim()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-forest py-3 text-sm font-semibold text-white transition hover:bg-forest-700 disabled:opacity-50">
                {submitting ? <><Loader2 size={15} className="animate-spin" /> Sending...</> : <><Send size={15} /> Send message</>}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Sent */}
      {sent && createPortal(
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="sup-sent-title">
          <div className="absolute inset-0 bg-forest-900/45 backdrop-blur-[2px]" onClick={() => setSent(false)} />
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-forest-50"><CheckCircle2 size={30} className="text-forest-600" /></span>
            <h3 id="sup-sent-title" className="mt-4 font-display text-xl font-extrabold text-dash-ink">Message received, boss</h3>
            <p className="mt-2 text-sm leading-relaxed text-dash-muted">A real person on our team will look into it and get back to you. You can follow it under Your conversations.</p>
            <button type="button" onClick={() => setSent(false)} className="mt-5 w-full rounded-2xl bg-forest px-4 py-3 text-sm font-semibold text-white hover:bg-forest-700">Thank you</button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
