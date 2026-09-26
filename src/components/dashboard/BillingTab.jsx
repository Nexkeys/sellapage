//src/components/dashboard/BillingTab.jsx/
//
// Billing & Plans, rebuilt on 2026-09-26 to the Billing design: a live
// countdown to the end of the plan, the current plan and its overview, a
// preview of past payments, every plan to compare, and a full Billing History
// with pages and printable receipts.
//
// What it does not change: paying still goes through Dashboard's
// handleUpgrade (billing-initialize.js, then Paystack, then the webhook), and
// renewing early still adds the new time on top of what is left
// (paystack-webhook.js). Payment history is the store's own `subscriptions`
// records, which only the webhook writes and only the owner can read.
import { useEffect, useRef, useState } from 'react'
import {
  CalendarClock, Crown, TrendingUp, Flame, Check, ArrowRight, CreditCard, CalendarDays, RefreshCw,
  Receipt, ShieldCheck, Lock, Cloud, MessageCircle, Mail, Timer, Smile, Users, ChevronLeft, ChevronRight,
  Loader2, X, Printer, AlertTriangle, Sparkles, TrendingDown, LayoutGrid, History,
} from 'lucide-react'
import { collection, getCountFromServer, limit, orderBy, query, startAfter } from 'firebase/firestore'
import { getDocs } from '../../firebase/metered'
import { db } from '../../firebase/config'
import MediaSlot from '../../media/MediaSlot'
import { hasMedia } from '../../media/hasMedia'
import { Skeleton } from '../Skeleton'
import useCountdown from './billing/useCountdown'
import {
  PLAN_PERIODS, PLAN_PRICES, PLAN_FEATURES, STARTER_FEATURES, PLAN_TAGLINES,
  formatPrice, getMonthlyEquivalent, getSavingsPercent,
} from '../../utils/billingPlans'

const SUPPORT_WHATSAPP = 'https://wa.me/2348120525256'
const HISTORY_PAGE = 10
const card = 'rounded-2xl border border-dash-line bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]'
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '')
const periodLabel = (id) => PLAN_PERIODS.find((p) => p.id === id)?.label || 'Monthly'
const toDate = (v) => (v?.toDate ? v.toDate() : v ? new Date(v) : null)
const fmtDate = (d, withTime = false) => (d
  ? d.toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}) })
  : '')
const PLAN_ORDER = ['growth', 'pro', 'premium']

// First page of history per store, kept for the session so switching tabs
// does not read it again. Cleared when a payment lands (the page reloads).
const historyCache = new Map()

// ── Countdown card ────────────────────────────────────────────────────────

function Cell({ v, label, urgent }) {
  return (
    <div className={`min-w-[62px] flex-1 rounded-xl border px-2 py-2 text-left sm:min-w-[72px] sm:px-3 ${urgent ? 'border-red-100 bg-white' : 'border-white/70 bg-white/80'}`}>
      <p className={`font-body text-[22px] font-bold leading-none tabular-nums sm:text-[26px] ${urgent ? 'text-red-600' : 'text-dash-ink'}`}>{v}</p>
      <p className="mt-1 text-[11px] text-dash-muted">{label}</p>
    </div>
  )
}

function CountdownCard({ mode, plan, endsAt, since, onRenew, onSeePlans }) {
  const c = useCountdown(endsAt)
  const urgent = mode !== 'free' && mode !== 'ended' && c.left > 0 && c.left < 24 * 3600 * 1000
  const warn = !urgent && c.left > 0 && c.left < 3 * 24 * 3600 * 1000
  const pad = (n) => String(n).padStart(2, '0')
  const title = {
    active: <>Your <span className="text-forest-600">{cap(plan)}</span> plan expires in</>,
    grace: <>Your grace period ends in</>,
    trial: <>Your free <span className="text-forest-600">{cap(plan)}</span> trial ends in</>,
    ended: <>Your plan has ended</>,
    free: <>You&apos;re on the free plan</>,
  }[mode]
  const note = {
    active: 'After this period, your store will revert to the free plan.',
    grace: `Your ${cap(plan)} features are on borrowed time. Renew now to keep them.`,
    trial: 'Pick a plan before then to keep these features. Nothing is charged automatically.',
    ended: `Your store has been on the free plan${since ? ` since ${fmtDate(since)}` : ''}. Everything you set up is saved for when you come back.`,
    free: 'Upgrade any time to unlock analytics, checkout, delivery and more. No lock-in.',
  }[mode]
  const cta = mode === 'active' || mode === 'grace'
    ? { label: mode === 'grace' ? 'Renew now to keep your features' : 'Upgrade to keep your progress', go: onRenew }
    : { label: mode === 'trial' ? 'Choose a plan' : mode === 'ended' ? 'Take your seat back' : 'See plans', go: onSeePlans }

  return (
    <section className={`relative overflow-hidden rounded-2xl p-5 sm:p-6 ${urgent || mode === 'grace' ? 'bg-gradient-to-r from-red-50 via-amber-50/70 to-[#eef8f2]' : 'bg-gradient-to-r from-forest-50 via-[#eef8f2] to-[#e2f3e9]'}`}>
      <div className="relative z-[1] sm:max-w-[68%]">
        <div className="flex items-center gap-3">
          <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-white ${urgent ? 'animate-pulse bg-red-500' : 'bg-forest'}`}>
            {mode === 'free' ? <Sparkles size={18} /> : mode === 'ended' ? <AlertTriangle size={18} /> : <CalendarClock size={18} />}
          </span>
          <p className="text-[15px] font-semibold text-dash-ink">{title}</p>
        </div>
        {(mode === 'active' || mode === 'grace' || mode === 'trial') && !c.done && (
          <div className="mt-4 flex gap-2 sm:gap-3" aria-live="off" aria-label={`${c.days} days, ${c.hours} hours, ${c.minutes} minutes left`}>
            <Cell v={c.days} label={c.days === 1 ? 'Day' : 'Days'} urgent={urgent} />
            <Cell v={pad(c.hours)} label="Hours" urgent={urgent} />
            <Cell v={pad(c.minutes)} label="Minutes" urgent={urgent} />
            <Cell v={pad(c.seconds)} label="Seconds" urgent={urgent} />
          </div>
        )}
        {(mode === 'active' || mode === 'grace' || mode === 'trial') && c.done && (
          <p className="mt-3 text-sm text-dash-muted">Time is up. Your plan status updates within the hour.</p>
        )}
        <p className={`mt-3 text-xs ${urgent ? 'font-semibold text-red-600' : warn ? 'font-medium text-amber-700' : 'text-dash-muted'}`}>{note}</p>
        <button type="button" onClick={cta.go} className="group mt-2.5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-forest transition hover:text-forest-600">
          {cta.label} <ArrowRight size={15} className="transition group-hover:translate-x-0.5" />
        </button>
      </div>
      {hasMedia('billing-countdown-art') && (
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[36%] sm:block">
          <MediaSlot name="billing-countdown-art" alt="" className="h-full w-full object-cover object-center mix-blend-multiply [mask-image:linear-gradient(to_right,transparent,black_30%)]" />
        </div>
      )}
    </section>
  )
}

// ── Receipt ───────────────────────────────────────────────────────────────

function ReceiptModal({ row, store, onClose }) {
  if (!row) return null
  const paid = toDate(row.paidAt)
  const lines = [
    ['Business', store?.businessName || ''],
    ['Email', store?.email || ''],
    ['Plan', `${cap(row.plan)} (${periodLabel(row.billingPeriod)})`],
    ['Amount', formatPrice(Math.round((row.amount || 0) / 100))],
    ['Paid on', fmtDate(paid, true)],
    ['Covers', `${fmtDate(toDate(row.planStartDate))} to ${fmtDate(toDate(row.planEndDate))}`],
    ['Paystack reference', row.paystackRef || ''],
    ['Status', 'Completed'],
  ]
  const print = () => {
    const w = window.open('', '_blank', 'width=520,height=720')
    if (!w) return
    const rows = lines.map(([k, v]) => `<tr><td style="color:#7c8a99;padding:8px 0">${k}</td><td style="text-align:right;padding:8px 0;font-weight:600">${String(v).replace(/</g, '&lt;')}</td></tr>`).join('')
    w.document.write(`<!doctype html><html><head><title>Sellapage receipt</title></head><body style="font-family:DM Sans,Arial,sans-serif;color:#0f172a;padding:32px;max-width:460px;margin:auto">
      <h2 style="margin:0;color:#034e22">Sellapage</h2><p style="color:#7c8a99;margin:4px 0 24px">Payment receipt</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>
      <p style="color:#7c8a99;font-size:12px;margin-top:28px">Thank you for growing with Sellapage.</p></body></html>`)
    w.document.close()
    w.focus()
    w.print()
  }
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="bt-receipt-title">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <button type="button" onClick={onClose} className="absolute right-3 top-3 rounded-full p-2 text-dash-muted hover:bg-gray-100" aria-label="Close"><X size={17} /></button>
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-50 text-forest-600"><Receipt size={22} /></span>
        <h3 id="bt-receipt-title" className="mt-3 text-lg font-bold text-dash-ink">Payment receipt</h3>
        <dl className="mt-3 divide-y divide-dash-line text-sm">
          {lines.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-2">
              <dt className="text-dash-muted">{k}</dt>
              <dd className="break-all text-right font-medium text-dash-ink">{v}</dd>
            </div>
          ))}
        </dl>
        <button type="button" onClick={print} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-forest px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-forest-700">
          <Printer size={15} /> Print or save as PDF
        </button>
      </div>
    </div>
  )
}

// ── History rows ──────────────────────────────────────────────────────────

function HistoryRow({ row, onOpen, compact }) {
  const paid = toDate(row.paidAt)
  return (
    <button type="button" onClick={() => onOpen(row)} className={`flex w-full items-center gap-3 rounded-xl border border-dash-line bg-white text-left transition hover:border-forest-200 hover:shadow-sm ${compact ? 'px-3 py-3' : 'px-4 py-3.5'}`}>
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gray-50 text-slate-600"><Receipt size={18} /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-dash-ink">{cap(row.plan)}{compact ? '' : ' Plan'} ({periodLabel(row.billingPeriod)})</span>
        <span className="block truncate text-[11px] text-dash-muted">{fmtDate(paid, true)}{!compact && row.paystackRef ? ` • Ref ${row.paystackRef.slice(-8)}` : ''}</span>
      </span>
      <span className="flex flex-shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
        <span className="text-[14px] font-bold tabular-nums text-dash-ink">{formatPrice(Math.round((row.amount || 0) / 100))}</span>
        <span className="rounded-md bg-forest-50 px-2 py-0.5 text-[10px] font-semibold text-forest-600">Completed</span>
      </span>
    </button>
  )
}

// ── The tab ───────────────────────────────────────────────────────────────

export default function BillingTab({
  store, plan, planStatus, isPro, isPremium,
  onUpgrade, upgradeLoading, upgradeError,
  navigateTo,
  initialView = 'plan',
}) {
  const [view, setView] = useState(initialView === 'history' ? 'history' : 'plan')
  const [selectedPeriod, setSelectedPeriod] = useState(store?.billingPeriod || 'monthly')
  const [confirm, setConfirm] = useState(null) // { planId, period }
  const [receipt, setReceipt] = useState(null)
  const plansRef = useRef(null)

  const isExpired = planStatus === 'expired'
  const isGrace = planStatus === 'grace'
  const isTrial = store?.trial?.status === 'active'
  const paidPlan = PLAN_ORDER.includes(plan) && !isExpired ? plan : null
  const billingPeriod = store?.billingPeriod || 'monthly'
  const planEndDate = toDate(store?.planEndDate)
  const graceUntil = toDate(store?.graceUntil)
  const everPaid = !!planEndDate

  const mode = isTrial ? 'trial'
    : paidPlan && isGrace ? 'grace'
      : paidPlan ? 'active'
        : isExpired && everPaid ? 'ended'
          : 'free'
  const endsAt = mode === 'grace' ? graceUntil?.getTime() : mode === 'active' || mode === 'trial' ? planEndDate?.getTime() : null

  // ── History ───────────────────────────────────────────────────────────
  const [pages, setPages] = useState(() => historyCache.get(store?.id)?.pages || [])
  const [total, setTotal] = useState(() => historyCache.get(store?.id)?.total ?? null)
  const [page, setPage] = useState(0)
  const [histState, setHistState] = useState(() => (historyCache.get(store?.id) ? 'ready' : 'loading'))
  const cursors = useRef(historyCache.get(store?.id)?.cursors || [])

  const loadPage = async (n) => {
    if (!store?.id || store?._isStaff) { setHistState('ready'); return }
    if (pages[n]) { setPage(n); return }
    setHistState('loading')
    try {
      const col = collection(db, 'stores', store.id, 'subscriptions')
      const q = n === 0
        ? query(col, orderBy('paidAt', 'desc'), limit(HISTORY_PAGE))
        : query(col, orderBy('paidAt', 'desc'), startAfter(cursors.current[n - 1]), limit(HISTORY_PAGE))
      const [snap, count] = await Promise.all([
        getDocs(q),
        total === null ? getCountFromServer(col).then((c) => c.data().count).catch(() => null) : Promise.resolve(total),
      ])
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      cursors.current[n] = snap.docs[snap.docs.length - 1]
      const nextPages = [...pages]
      nextPages[n] = rows
      setPages(nextPages)
      setTotal(count)
      setPage(n)
      setHistState('ready')
      historyCache.set(store.id, { pages: nextPages, total: count, cursors: cursors.current })
    } catch (err) {
      console.error('[billing] history', err)
      setHistState('error')
    }
  }
  useEffect(() => {
    if (!historyCache.get(store?.id)) loadPage(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.id])

  const rows = pages[page] || []
  const totalPages = total ? Math.max(1, Math.ceil(total / HISTORY_PAGE)) : (rows.length === HISTORY_PAGE ? page + 2 : page + 1)
  const lastPayment = pages[0]?.[0]

  // ── Actions ───────────────────────────────────────────────────────────
  const scrollToPlans = () => {
    setView('plan')
    setTimeout(() => plansRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }
  const pay = (planId, period) => {
    const renewing = planId === plan
    if (renewing) { setConfirm({ planId, period }); return }
    onUpgrade(planId, period)
  }
  const renewCurrent = () => {
    const target = paidPlan || (isTrial ? null : lastPayment?.plan)
    if (target) pay(target, billingPeriod)
    else scrollToPlans()
  }
  // Mirrors paystack-webhook.js: time left on the current plan is kept and the
  // new period starts where it ends.
  const projectedEnd = (period) => {
    const months = PLAN_PERIODS.find((p) => p.id === period)?.months || 1
    const base = new Date(planEndDate && planEndDate.getTime() > Date.now() ? planEndDate.getTime() : Date.now())
    base.setMonth(base.getMonth() + months)
    return fmtDate(base)
  }

  const shownPlan = paidPlan || (isTrial ? plan : 'starter')
  const features = shownPlan === 'starter' ? STARTER_FEATURES : PLAN_FEATURES[shownPlan] || []
  const price = shownPlan === 'starter' ? 0 : PLAN_PRICES[shownPlan]?.[billingPeriod] || 0
  const higher = PLAN_ORDER.filter((p) => PLAN_ORDER.indexOf(p) > PLAN_ORDER.indexOf(shownPlan === 'starter' ? '' : shownPlan))

  const overview = [
    { icon: LayoutGrid, k: 'Current Plan', v: `${cap(shownPlan)}${isTrial ? ' (trial)' : ''}` },
    { icon: CreditCard, k: `${periodLabel(billingPeriod)} Price`, v: shownPlan === 'starter' || isTrial ? 'Free' : formatPrice(price) },
    { icon: CalendarDays, k: mode === 'grace' ? 'Grace ends' : mode === 'free' || mode === 'ended' ? 'Next Billing Date' : 'Plan ends', v: mode === 'grace' ? fmtDate(graceUntil) : planEndDate && mode !== 'free' && mode !== 'ended' ? fmtDate(planEndDate) : 'None' },
    { icon: RefreshCw, k: 'Renewal', v: 'Manual', hint: 'You are never charged without choosing to pay.' },
  ]

  const tabs = [
    { id: 'plan', label: 'Your Plan', icon: Crown },
    { id: 'history', label: 'Billing History', icon: History, n: total },
  ]

  return (
    <div className="mx-auto w-full max-w-[1320px] space-y-5 px-4 pb-10 pt-5 sm:px-6 lg:px-8 lg:pt-7">
      {/* Header + countdown */}
      <div className="grid items-center gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-forest-600">
            <span className="h-1.5 w-3 rounded-full bg-forest-600" /> Billing &amp; Plans
          </p>
          <h1 className="mt-2 font-body text-[28px] font-bold leading-tight tracking-tight text-dash-ink sm:text-[36px]">Your store. Your plan.</h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-dash-muted sm:text-[15px]">
            Manage your subscription, view your billing history, and get the most out of Sellapage.
          </p>
        </div>
        <CountdownCard mode={mode} plan={shownPlan} endsAt={endsAt} since={graceUntil || planEndDate} onRenew={renewCurrent} onSeePlans={scrollToPlans} />
      </div>

      {/* Tabs */}
      <div className="inline-flex rounded-2xl border border-dash-line bg-white p-1 shadow-sm">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setView(t.id)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold transition ${view === t.id ? 'bg-forest text-white shadow' : 'text-slate-600 hover:bg-gray-50'}`}
          >
            <t.icon size={15} /> {t.label}
            {t.n ? <span className={`rounded-full px-1.5 text-[10px] ${view === t.id ? 'bg-white/20' : 'bg-gray-100'}`}>{t.n}</span> : null}
          </button>
        ))}
      </div>

      {upgradeError && (
        <div role="alert" className="flex items-start gap-2.5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" /> {upgradeError}
        </div>
      )}

      {view === 'plan' ? (
        <>
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
            <div className="space-y-4">
              <div className={`${card} grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]`}>
                {/* Current plan */}
                <section className="relative overflow-hidden rounded-2xl border border-forest-100 bg-gradient-to-br from-forest-50/80 via-white to-forest-50/40 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded-full bg-forest px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">{isTrial ? 'Free trial' : 'Current plan'}</span>
                    {shownPlan === 'growth' && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-dash-line bg-white px-2.5 py-1 text-[11px] font-semibold text-dash-ink"><Flame size={12} className="text-forest-600" /> Most Popular</span>
                    )}
                  </div>
                  <div className="mt-3 flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-body text-[26px] font-bold text-dash-ink">{cap(shownPlan)}</h2>
                      <p className="mt-1 max-w-[260px] text-xs leading-relaxed text-dash-muted">{PLAN_TAGLINES[shownPlan]}</p>
                    </div>
                    <span className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-forest-100/80 text-forest-600"><TrendingUp size={28} /></span>
                  </div>
                  <p className="mt-3 flex items-baseline gap-1.5">
                    <span className="font-body text-[30px] font-bold text-dash-ink tabular-nums">{shownPlan === 'starter' || isTrial ? 'Free' : formatPrice(price)}</span>
                    {shownPlan !== 'starter' && !isTrial && <span className="text-sm text-dash-muted">/{PLAN_PERIODS.find((p) => p.id === billingPeriod)?.shortLabel || 'mo'}</span>}
                  </p>
                  <ul className="mt-3 space-y-2">
                    {features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-[12px] leading-snug text-slate-600">
                        <span className="mt-px flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-forest-600 text-white"><Check size={10} strokeWidth={3.5} /></span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button type="button" onClick={scrollToPlans} className="mt-5 inline-flex items-center gap-2 rounded-full border border-forest-200 bg-forest-50 px-4 py-2 text-[13px] font-semibold text-forest transition hover:bg-forest-100">
                    <RefreshCw size={14} /> {shownPlan === 'starter' ? 'Upgrade plan' : 'Manage plan'}
                  </button>
                </section>

                {/* Overview + higher plan */}
                <section className="flex flex-col rounded-2xl border border-dash-line p-5">
                  <p className="flex items-center gap-2.5 text-[15px] font-semibold text-dash-ink">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50 text-slate-600"><LayoutGrid size={17} /></span>
                    Plan Overview
                  </p>
                  <dl className="mt-3 divide-y divide-dash-line">
                    {overview.map((o) => (
                      <div key={o.k} className="flex items-center justify-between gap-3 py-3" title={o.hint}>
                        <dt className="flex items-center gap-2.5 text-[13px] text-slate-600"><o.icon size={15} className="text-slate-400" /> {o.k}</dt>
                        <dd className="text-right text-[13px] font-semibold text-dash-ink">{o.v}</dd>
                      </div>
                    ))}
                  </dl>
                  {higher.length > 0 ? (
                    <div className="mt-auto rounded-2xl bg-forest-50/70 p-4">
                      <p className="flex items-center gap-2 text-[14px] font-semibold text-dash-ink">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white"><Crown size={16} className="fill-forest-600 text-forest-600" /></span>
                        Need a higher plan?
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-slate-600">
                        {cap(higher[0])}{higher[1] ? ` and ${cap(higher[1])}` : ''} give{higher[1] ? '' : 's'} you more powerful tools, higher limits and priority support.
                      </p>
                      <button type="button" onClick={scrollToPlans} className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-forest-200 bg-white px-4 py-1.5 text-xs font-semibold text-forest transition hover:bg-forest-50">
                        View Plans <ArrowRight size={13} />
                      </button>
                    </div>
                  ) : (
                    <div className="mt-auto rounded-2xl bg-amber-50/70 p-4">
                      <p className="flex items-center gap-2 text-[14px] font-semibold text-dash-ink"><Crown size={16} className="fill-amber-400 text-amber-500" /> You&apos;re on the top seat</p>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-600">Every Sellapage feature is yours. Renew early any time; the days you have left are kept.</p>
                    </div>
                  )}
                </section>
              </div>

              {/* Trust row */}
              <div className={`${card} grid gap-3 p-4 sm:grid-cols-3 sm:p-5`}>
                {[
                  { icon: Lock, t: 'Paystack Secured', s: 'Card details never touch Sellapage' },
                  { icon: Cloud, t: 'Encrypted on Google Cloud', s: 'Your data, always safe' },
                  { icon: ShieldCheck, t: 'No surprise charges', s: 'You renew only when you choose' },
                ].map((x) => (
                  <div key={x.t} className="flex items-center gap-3">
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-forest-50 text-forest-600"><x.icon size={18} /></span>
                    <span>
                      <span className="block text-[13px] font-semibold text-dash-ink">{x.t}</span>
                      <span className="block text-[11px] text-dash-muted">{x.s}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Rail */}
            <aside className="space-y-4">
              <section className={`${card} p-5`}>
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gray-50 text-slate-600"><Receipt size={18} /></span>
                  <div>
                    <p className="text-[15px] font-semibold text-dash-ink">Billing History</p>
                    <p className="text-xs text-dash-muted">Your recent payments and transactions.</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2.5">
                  {histState === 'loading' && !pages[0] ? (
                    [0, 1, 2].map((i) => <Skeleton key={i} className="h-[62px] w-full rounded-xl" />)
                  ) : histState === 'error' && !pages[0] ? (
                    <div className="rounded-xl bg-red-50 px-4 py-3 text-xs text-red-700">
                      We couldn&apos;t load your payments. <button type="button" onClick={() => loadPage(0)} className="font-semibold underline">Try again</button>
                    </div>
                  ) : (pages[0] || []).length === 0 ? (
                    <div className="rounded-xl border border-dashed border-dash-line px-4 py-6 text-center">
                      <p className="text-[13px] font-semibold text-dash-ink">No payments yet</p>
                      <p className="mt-1 text-xs text-dash-muted">When you upgrade, your receipts appear here.</p>
                    </div>
                  ) : (
                    (pages[0] || []).slice(0, 5).map((r) => <HistoryRow key={r.id} row={r} onOpen={setReceipt} compact />)
                  )}
                </div>
                {(pages[0] || []).length > 0 && (
                  <button type="button" onClick={() => setView('history')} className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-forest-200 px-4 py-2.5 text-xs font-semibold text-forest transition hover:bg-forest-50">
                    View All Billing History <ArrowRight size={13} />
                  </button>
                )}
              </section>

              <section className={`${card} p-5`}>
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-forest-50 text-forest-600"><MessageCircle size={18} /></span>
                  <div>
                    <p className="text-[15px] font-semibold text-dash-ink">Need help with your plan?</p>
                    <p className="text-xs text-dash-muted">Our support team is always available to help.</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <a href={SUPPORT_WHATSAPP} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-forest px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-forest-700">
                    <MessageCircle size={14} /> Chat on WhatsApp
                  </a>
                  <button type="button" onClick={() => navigateTo?.('support')} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-forest-200 px-3 py-2.5 text-xs font-semibold text-forest transition hover:bg-forest-50">
                    <Mail size={14} /> Send a Message
                  </button>
                </div>
                <div className="mt-4 flex flex-wrap justify-between gap-2 text-[11px] text-dash-muted">
                  <span className="inline-flex items-center gap-1"><Timer size={13} /> Quick response</span>
                  <span className="inline-flex items-center gap-1"><Smile size={13} /> Friendly support</span>
                  <span className="inline-flex items-center gap-1"><Users size={13} /> Real people</span>
                </div>
              </section>
            </aside>
          </div>

          {/* Compare plans */}
          <section ref={plansRef} className="scroll-mt-4 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-dash-ink">Choose your seat</h2>
                <p className="text-xs text-dash-muted">Longer periods cost less per month. Renewing early adds the time on top of what you have left.</p>
              </div>
              <div className="flex flex-wrap gap-1.5 rounded-2xl border border-dash-line bg-white p-1">
                {PLAN_PERIODS.map((p) => {
                  const save = getSavingsPercent('growth', p.id)
                  return (
                    <button key={p.id} type="button" onClick={() => setSelectedPeriod(p.id)} className={`relative rounded-xl px-3 py-1.5 text-xs font-semibold transition ${selectedPeriod === p.id ? 'bg-forest text-white' : 'text-slate-600 hover:bg-gray-50'}`}>
                      {p.label}
                      {save > 0 && <span className={`ml-1.5 inline-flex items-center gap-0.5 rounded-full px-1.5 text-[9px] ${selectedPeriod === p.id ? 'bg-white/20' : 'bg-forest-50 text-forest-600'}`}><TrendingDown size={9} />{save}%</span>}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {PLAN_ORDER.map((planId) => {
                const isCurrent = paidPlan === planId
                const isDowngrade = (planId === 'growth' && (isPro || isPremium)) || (planId === 'pro' && isPremium)
                const priceFor = PLAN_PRICES[planId][selectedPeriod]
                const busy = upgradeLoading === planId
                return (
                  <div key={planId} className={`${card} relative flex flex-col p-5 transition ${isCurrent ? 'ring-2 ring-forest' : 'hover:-translate-y-0.5 hover:shadow-lg'}`}>
                    {planId === 'growth' && <span className="absolute -top-2.5 left-5 rounded-full bg-forest px-2.5 py-0.5 text-[10px] font-bold text-white">Most Popular</span>}
                    <div className="flex items-center justify-between">
                      <p className="text-[17px] font-bold text-dash-ink">{cap(planId)}</p>
                      {isCurrent && <span className="rounded-full bg-forest-50 px-2 py-0.5 text-[10px] font-bold text-forest-600">Your plan</span>}
                    </div>
                    <p className="mt-1 text-xs text-dash-muted">{PLAN_TAGLINES[planId]}</p>
                    <p className="mt-3 flex items-baseline gap-1">
                      <span className="text-[26px] font-bold tabular-nums text-dash-ink">{formatPrice(priceFor)}</span>
                      <span className="text-xs text-dash-muted">/{PLAN_PERIODS.find((p) => p.id === selectedPeriod)?.shortLabel}</span>
                    </p>
                    {selectedPeriod !== 'monthly' && <p className="text-[11px] text-dash-muted">{formatPrice(getMonthlyEquivalent(planId, selectedPeriod))}/mo equivalent</p>}
                    <ul className="mt-4 flex-1 space-y-1.5">
                      {PLAN_FEATURES[planId].slice(0, 7).map((f) => (
                        <li key={f} className="flex items-start gap-2 text-[12px] leading-snug text-slate-600"><Check size={13} className="mt-0.5 flex-shrink-0 text-forest-600" />{f}</li>
                      ))}
                      {PLAN_FEATURES[planId].length > 7 && <li className="pl-5 text-[11px] text-dash-muted">+ {PLAN_FEATURES[planId].length - 7} more</li>}
                    </ul>
                    <button
                      type="button"
                      onClick={() => pay(planId, selectedPeriod)}
                      disabled={busy || isDowngrade || !!upgradeLoading}
                      title={isDowngrade ? 'Your current plan already includes everything here' : undefined}
                      className={`mt-5 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                        isDowngrade ? 'cursor-not-allowed bg-gray-100 text-slate-400' : isCurrent ? 'border border-forest bg-white text-forest hover:bg-forest-50' : 'bg-forest text-white shadow-lg shadow-forest/20 hover:bg-forest-700'
                      } disabled:opacity-70`}
                    >
                      {busy ? <><Loader2 size={15} className="animate-spin" /> Taking you to Paystack...</>
                        : isDowngrade ? 'Included in your plan'
                          : plan === planId ? <>Renew {cap(planId)} <ArrowRight size={15} /></>
                            : <>Upgrade to {cap(planId)} <ArrowRight size={15} /></>}
                    </button>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Banner */}
          <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-forest-50 via-[#f1faf5] to-white">
            <div className="flex flex-col items-center gap-4 p-5 text-center sm:flex-row sm:text-left">
              {hasMedia('billing-banner-bag') && (
                <div className="w-40 flex-shrink-0">
                  <MediaSlot name="billing-banner-bag" alt="" className="h-auto w-full mix-blend-multiply" />
                </div>
              )}
              <div className="flex-1">
                <p className="text-lg font-bold text-dash-ink">More tools. More growth.</p>
                <p className="mt-1 max-w-md text-xs leading-relaxed text-dash-muted">Upgrade to a higher plan and unlock more features, higher limits and dedicated support to take your business further.</p>
              </div>
              <button type="button" onClick={scrollToPlans} className="inline-flex flex-shrink-0 items-center gap-2 rounded-full bg-forest px-6 py-3 text-sm font-semibold text-white transition hover:bg-forest-700">
                View Plans <ArrowRight size={15} />
              </button>
              {hasMedia('billing-script') && (
                <div className="hidden w-36 flex-shrink-0 lg:block">
                  <MediaSlot name="billing-script" alt="Built for Nigerian businesses" className="h-auto w-full mix-blend-multiply" />
                </div>
              )}
            </div>
          </section>
        </>
      ) : (
        /* Full history */
        <section className={`${card} p-4 sm:p-6`}>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-dash-ink">Billing History</h2>
              <p className="text-xs text-dash-muted">Every plan payment, newest first. Tap one for its receipt.</p>
            </div>
            {total !== null && <p className="text-xs text-dash-muted">{total} payment{total === 1 ? '' : 's'} in total</p>}
          </div>
          <div className="mt-4 space-y-2.5">
            {histState === 'loading' ? (
              <div className="space-y-2.5" role="status" aria-label="Loading payments">
                <p className="flex items-center gap-2 text-xs text-dash-muted"><Loader2 size={14} className="animate-spin text-forest-600" /> Please hold on, fetching your payments...</p>
                {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[66px] w-full rounded-xl" />)}
              </div>
            ) : histState === 'error' ? (
              <div className="rounded-xl bg-red-50 px-4 py-6 text-center text-sm text-red-700">
                We couldn&apos;t load your payments. <button type="button" onClick={() => loadPage(page)} className="font-semibold underline">Try again</button>
              </div>
            ) : rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-dash-line px-4 py-12 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-50 text-forest-600"><Receipt size={20} /></span>
                <p className="mt-3 text-sm font-semibold text-dash-ink">No payments yet</p>
                <p className="mt-1 text-xs text-dash-muted">Your receipts will live here once you upgrade.</p>
                <button type="button" onClick={scrollToPlans} className="mt-4 rounded-xl bg-forest px-4 py-2 text-xs font-semibold text-white">See plans</button>
              </div>
            ) : (
              rows.map((r) => <HistoryRow key={r.id} row={r} onOpen={setReceipt} />)
            )}
          </div>
          {rows.length > 0 && totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs text-dash-muted">Page {page + 1} of {totalPages}</p>
              <div className="flex gap-1.5">
                <button type="button" onClick={() => loadPage(page - 1)} disabled={page === 0 || histState === 'loading'} className="rounded-lg border border-dash-line p-2 text-slate-600 hover:bg-gray-50 disabled:opacity-40" aria-label="Newer payments"><ChevronLeft size={15} /></button>
                <button type="button" onClick={() => loadPage(page + 1)} disabled={page + 1 >= totalPages || histState === 'loading'} className="rounded-lg border border-dash-line p-2 text-slate-600 hover:bg-gray-50 disabled:opacity-40" aria-label="Older payments"><ChevronRight size={15} /></button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Renew confirm */}
      {confirm && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="bt-renew-title">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setConfirm(null)} />
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-forest-50"><Crown size={26} className="fill-amber-400 text-amber-500" /></span>
            <h3 id="bt-renew-title" className="mt-4 text-lg font-bold text-dash-ink">Renew {cap(confirm.planId)}?</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-dash-muted">
              {formatPrice(PLAN_PRICES[confirm.planId][confirm.period])} for {periodLabel(confirm.period).toLowerCase()}. Your access will run until{' '}
              <span className="font-semibold text-dash-ink">{projectedEnd(confirm.period)}</span>. Days you have left are kept, not lost.
            </p>
            <div className="mt-5 grid gap-2">
              <button type="button" onClick={() => { const c = confirm; setConfirm(null); onUpgrade(c.planId, c.period) }} className="rounded-2xl bg-forest px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-forest-700">
                Continue to Paystack
              </button>
              <button type="button" onClick={() => setConfirm(null)} className="rounded-2xl border border-dash-line px-4 py-2.5 text-sm font-semibold text-dash-ink transition hover:bg-gray-50">Not now</button>
            </div>
          </div>
        </div>
      )}

      <ReceiptModal row={receipt} store={store} onClose={() => setReceipt(null)} />
    </div>
  )
}
