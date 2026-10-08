// src/components/dashboard/guide/DashboardGuide.jsx
//
// Sella the guide, for vendors (2026-10-08). The same idea as the Ops guide
// (src/ops/SellaGuide.jsx): a waving robot in the corner that knows every tab.
// Tap her for:
//   Your tools    every tool on the dashboard, grouped; open ones open, locked
//                 ones show the plan that unlocks them
//   Unlock more   what the next plan adds, with its price and an upgrade button
//                 (owners only; staff cannot change the plan, so they never see it)
//   This page     what the current tab is for and what to do there
//   Tour          a step-by-step walk through the tools this store has
// Everything comes from guideData.js. No AI and no network calls: Sella AI,
// the paid assistant, is a separate thing opened from the sidebar.
//
// The sidebar used to carry floating buttons that covered content, so this
// one can be dragged anywhere, hidden with its X, and brought back from the
// robot button in the top bar. Position and visibility are remembered per
// store in this browser.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, ArrowRight, ArrowLeft, Check, Compass, ListChecks, Lightbulb, Lock, Sparkles, Crown, CreditCard } from 'lucide-react'
import SellaBot from '../../../ops/SellaBot'
import { PLAN_PRICES, formatPrice } from '../../../utils/billingPlans'
import { GUIDE_GROUPS, GUIDE_TABS, PLAN_LABEL, PLAN_ORDER, guideTab } from './guideData'

const BOT = 66
const MARGIN = 8
const clampPos = (pos) => {
  const w = window.innerWidth
  const h = window.innerHeight
  return {
    right: Math.min(Math.max(MARGIN, pos.right), Math.max(MARGIN, w - BOT - MARGIN)),
    bottom: Math.min(Math.max(MARGIN, pos.bottom), Math.max(MARGIN, h - BOT - MARGIN)),
  }
}

const rank = (plan) => PLAN_ORDER.indexOf(plan)

function PlanChip({ plan }) {
  const tone = plan === 'premium' ? 'bg-amber-100 text-amber-800' : plan === 'pro' ? 'bg-forest text-white' : 'bg-forest-100 text-forest-800'
  return <span className={`inline-flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-extrabold ${tone}`}>{plan === 'premium' ? <Crown size={10} /> : <Lock size={10} />}{PLAN_LABEL[plan]}</span>
}

function Tour({ name, tools, labels, onOpenTab, onUpgrade, nextPlan, onDone }) {
  const [i, setI] = useState(0)
  const steps = [{ id: '__hello' }, ...tools, { id: '__end' }]
  const step = steps[i]
  useEffect(() => {
    const k = (e) => {
      if (e.key === 'ArrowRight') setI((n) => Math.min(n + 1, steps.length - 1))
      if (e.key === 'ArrowLeft') setI((n) => Math.max(n - 1, 0))
      if (e.key === 'Escape') onDone()
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [steps.length, onDone])

  return createPortal(
    <div className="fixed inset-0 z-[140] flex items-end justify-center bg-slate-900/55 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Tour of your dashboard">
      <div className="w-full max-w-lg overflow-hidden rounded-t-[28px] bg-white shadow-2xl animate-in slide-in-from-bottom-6 duration-300 sm:rounded-[28px]">
        <div className="relative bg-gradient-to-br from-[#034e22] via-[#0b6b35] to-[#0e8a52] px-6 pb-5 pt-6 text-white">
          <button type="button" onClick={onDone} className="absolute right-4 top-4 rounded-full p-1.5 text-green-100 hover:bg-white/10" aria-label="Close the tour"><X size={18} /></button>
          <div className="flex items-end gap-4">
            <SellaBot size={64} wave={i === 0 || i === steps.length - 1} />
            <div className="pb-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-green-200">Sella&apos;s tour {i > 0 && i < steps.length - 1 ? `· ${i} of ${tools.length}` : ''}</p>
              <p className="mt-1 font-display text-xl font-extrabold leading-tight">
                {step.id === '__hello' ? `Hi ${name}, I'm Sella` : step.id === '__end' ? 'That’s your dashboard' : labels[step.id]}
              </p>
            </div>
          </div>
          <div className="mt-4 flex gap-1">{steps.map((s, n) => <span key={s.id} className={`h-1 flex-1 rounded-full transition-colors ${n <= i ? 'bg-white' : 'bg-white/25'}`} />)}</div>
        </div>
        <div key={step.id} className="min-h-[190px] px-6 py-5 animate-in fade-in slide-in-from-right-3 duration-300">
          {step.id === '__hello' && (
            <>
              <p className="text-[14.5px] leading-relaxed text-slate-700">I&apos;ll show you the {tools.length} tools on your dashboard and what each one does for your business. It takes about a minute.</p>
              <p className="mt-3 text-[13px] text-slate-500">Find me in the corner of every page whenever you need me. You can drag me out of the way.</p>
            </>
          )}
          {step.id === '__end' && (
            <>
              <p className="text-[14.5px] leading-relaxed text-slate-700">You&apos;re all set, {name}. Tap me any time to find a tool or get tips for the page you&apos;re on.</p>
              {nextPlan && (
                <div className="mt-4 rounded-2xl bg-forest-50 p-4 ring-1 ring-forest-100">
                  <p className="flex items-center gap-1.5 text-[13.5px] font-extrabold text-forest-800"><Sparkles size={15} />{nextPlan.count} more tools on {PLAN_LABEL[nextPlan.plan]}</p>
                  <p className="mt-1 text-[12.5px] text-forest-900/80">{nextPlan.names.slice(0, 4).join(', ')}{nextPlan.count > 4 ? ' and more' : ''}, from {formatPrice(PLAN_PRICES[nextPlan.plan].monthly)} a month.</p>
                  <button type="button" onClick={() => { onUpgrade(); onDone() }} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-forest px-3.5 py-2 text-[13px] font-bold text-white">See {PLAN_LABEL[nextPlan.plan]} <ArrowRight size={14} /></button>
                </div>
              )}
            </>
          )}
          {step.about && (
            <>
              <p className="text-[14px] leading-relaxed text-slate-700">{step.about}</p>
              <ul className="mt-4 space-y-2">{step.can.map((c) => <li key={c} className="flex items-start gap-2 text-[13.5px] text-slate-600"><Check size={15} className="mt-0.5 flex-shrink-0 text-forest-600" />{c}</li>)}</ul>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 border-t border-dash-line px-6 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
          {i > 0 && <button type="button" onClick={() => setI(i - 1)} className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-[13px] font-semibold text-slate-500 hover:bg-slate-100"><ArrowLeft size={14} /> Back</button>}
          {step.about && <button type="button" onClick={() => { onOpenTab(step.id); onDone() }} className="rounded-xl px-3 py-2 text-[13px] font-semibold text-forest-600 hover:bg-forest-50">Open it now</button>}
          <button type="button" onClick={() => (i === steps.length - 1 ? onDone() : setI(i + 1))} className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-forest-600 px-4 py-2.5 text-[13.5px] font-semibold text-white hover:bg-forest">
            {i === 0 ? 'Start' : i === steps.length - 1 ? 'Let’s go' : 'Next'} <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

/**
 * Props
 *   store        the store (for its id, owner name and plan)
 *   plan         'starter' | 'growth' | 'pro' | 'premium', the plan in force
 *   vendorType   'products' | 'services' | 'both'
 *   labels       { tabId: label } from the sidebar, so names always match
 *   visibleIds   Set of tab ids this person can open now
 *   isStaff      staff never see upgrade prompts
 *   activeTab, onOpenTab(id), visible, onHide
 */
export default function DashboardGuide({ store, plan, vendorType = 'products', labels, visibleIds, isStaff = false, activeTab, onOpenTab, visible = true, onHide }) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState('tools')
  const [tour, setTour] = useState(false)
  const [hello, setHello] = useState(false)
  const posKey = `sp_guide_pos_${store?.id || 'x'}`
  const [pos, setPos] = useState(() => {
    try { const v = JSON.parse(localStorage.getItem(posKey) || 'null'); if (v && Number.isFinite(v.right) && Number.isFinite(v.bottom)) return clampPos(v) } catch { /* fine */ }
    // Phones: above the Ledger's add button and bottom save bars.
    return window.innerWidth < 640 ? { right: 12, bottom: 96 } : { right: 24, bottom: 24 }
  })
  const [dragging, setDragging] = useState(false)
  const drag = useRef(null)
  const name = (store?.ownerName || store?.businessName || '').trim().split(/\s+/)[0] || 'there'

  // Which tools apply to this store, and which are open or locked.
  const tools = useMemo(() => GUIDE_TABS.filter((t) => {
    if (!labels[t.id]) return false
    if (t.only === 'products' && vendorType === 'services') return false
    if (t.only === 'services' && vendorType === 'products') return false
    return true
  }).map((t) => ({ ...t, open: visibleIds.has(t.id) && rank(plan) >= rank(t.plan), locked: rank(plan) < rank(t.plan) })), [labels, vendorType, visibleIds, plan])
  // Staff see only what their role opens; owners also see what upgrading adds.
  const shown = useMemo(() => tools.filter((t) => t.open || (!isStaff && t.locked)), [tools, isStaff])
  const openTools = useMemo(() => shown.filter((t) => t.open), [shown])
  const nextPlan = useMemo(() => {
    if (isStaff) return null
    const next = PLAN_ORDER[rank(plan) + 1]
    if (!next) return null
    const adds = tools.filter((t) => t.plan === next)
    return { plan: next, count: adds.length, names: adds.map((t) => labels[t.id]), tools: adds }
  }, [tools, plan, isStaff, labels])
  const here = guideTab(activeTab)
  const hereLocked = here && rank(plan) < rank(here.plan)

  useEffect(() => {
    const fit = () => setPos((p) => clampPos(p))
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  const onPointerDown = (e) => {
    if (e.button != null && e.button !== 0) return
    drag.current = { x: e.clientX, y: e.clientY, right: pos.right, bottom: pos.bottom, moved: false, id: e.pointerId }
    try { e.currentTarget.setPointerCapture?.(e.pointerId) } catch { /* no live pointer */ }
  }
  const onPointerMove = (e) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (!d.moved && Math.hypot(dx, dy) < 6) return
    if (!d.moved) { d.moved = true; setDragging(true); setHello(false); setOpen(false) }
    setPos(clampPos({ right: d.right - dx, bottom: d.bottom - dy }))
  }
  const finish = useCallback((e, cancelled = false) => {
    const d = drag.current
    drag.current = null
    if (!d) return
    try { e.currentTarget.releasePointerCapture?.(d.id) } catch { /* already released */ }
    if (d.moved) {
      setDragging(false)
      setPos((p) => { try { localStorage.setItem(posKey, JSON.stringify(p)) } catch { /* fine */ } return p })
    } else if (!cancelled) {
      setOpen((v) => !v)
      setHello(false)
    }
  }, [posKey])
  const onKey = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((v) => !v); setHello(false) } }

  // A hello once per browser session, tailored to the plan.
  useEffect(() => {
    if (!visible) return undefined
    let seen = false
    try { seen = sessionStorage.getItem('sp_guide_hello') === '1'; sessionStorage.setItem('sp_guide_hello', '1') } catch { /* fine */ }
    if (seen) return undefined
    const a = setTimeout(() => setHello(true), 2500)
    const b = setTimeout(() => setHello(false), 9500)
    return () => { clearTimeout(a); clearTimeout(b) }
  }, [visible])

  const go = (id) => { onOpenTab(id); setOpen(false) }
  const upgrade = () => { onOpenTab('billing'); setOpen(false) }

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const lowerHalf = pos.bottom < vh / 2
  const rightHalf = pos.right < vw / 2
  const phone = vw < 640
  const panelStyle = {
    ...(lowerHalf ? { bottom: pos.bottom + BOT + 10 } : { top: vh - pos.bottom + 10 }),
    ...(phone ? {} : rightHalf ? { right: Math.max(12, pos.right) } : { left: Math.max(12, vw - pos.right - BOT) }),
    maxHeight: lowerHalf ? `min(74vh, calc(100dvh - ${pos.bottom + BOT + 24}px))` : `min(74vh, calc(100dvh - ${vh - pos.bottom + 24}px))`,
  }

  const helloText = isStaff
    ? `Hi ${name}! I can show you around the tools you have here.`
    : nextPlan
      ? `Hi ${name}! I can show you around, and the ${nextPlan.count} tools ${PLAN_LABEL[nextPlan.plan]} adds.`
      : `Hi ${name}! You have every tool. Want a quick tour?`

  const VIEWS = [['tools', 'Tools', ListChecks], ...(nextPlan ? [['unlock', 'Unlock', Sparkles]] : []), ['page', 'This page', Lightbulb]]

  return (
    <>
      {visible && createPortal(
        <div className="fixed z-[55]" style={{ right: pos.right, bottom: pos.bottom }}>
          {hello && !open && !dragging && (
            <button type="button" onClick={() => { setOpen(true); setHello(false) }} className={`absolute bottom-full mb-2 w-[240px] rounded-2xl bg-white px-4 py-2.5 text-left text-[13px] text-slate-700 shadow-xl ring-1 ring-black/5 animate-in fade-in slide-in-from-bottom-2 duration-300 ${rightHalf ? 'right-0 rounded-br-md' : 'left-0 rounded-bl-md'}`}>
              {helloText}
            </button>
          )}
          <div className="group relative">
            <button type="button" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={(e) => finish(e)} onPointerCancel={(e) => finish(e, true)} onKeyDown={onKey}
              aria-expanded={open} aria-label={open ? 'Close the guide' : 'Open the guide. Drag to move it.'}
              className={`touch-none select-none rounded-full bg-white/90 p-1.5 shadow-[0_12px_32px_-10px_rgba(3,78,34,0.55)] ring-1 ring-forest-100 backdrop-blur transition ${dragging ? 'scale-110 cursor-grabbing shadow-2xl' : 'cursor-grab hover:scale-105'}`}>
              <SellaBot size={54} wave={!dragging && (hello || !open)} />
            </button>
            {nextPlan && !open && <span className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-extrabold text-amber-950 ring-2 ring-white">{nextPlan.count}</span>}
            <button type="button" onClick={() => { setOpen(false); setHello(false); onHide?.() }} aria-label="Hide the guide" title="Hide the guide. Bring it back with the robot button in the top bar."
              className="absolute -left-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white shadow-md ring-2 ring-white transition hover:bg-red-600 sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover:opacity-100">
              <X size={13} />
            </button>
          </div>
        </div>,
        document.body,
      )}

      {open && visible && createPortal(
        <div style={panelStyle} className="fixed inset-x-3 z-[56] flex flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200 sm:inset-x-auto sm:w-[390px]" role="dialog" aria-label="Sella, your guide">
          <div className="flex flex-shrink-0 items-center gap-3 bg-gradient-to-br from-[#034e22] to-[#0b6b35] px-5 py-4 text-white">
            <SellaBot size={40} wave={false} />
            <div className="min-w-0 flex-1">
              <p className="font-display text-[16px] font-extrabold">Hi {name}, I&apos;m Sella</p>
              <p className="text-[12px] text-green-100/85">{isStaff ? 'Your guide to the tools you can open.' : `You're on ${PLAN_LABEL[plan]}. Here's everything you can do.`}</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-full p-1.5 text-green-100 hover:bg-white/10" aria-label="Close"><X size={17} /></button>
          </div>
          <div className="flex flex-shrink-0 gap-1 overflow-x-auto border-b border-dash-line px-3 pt-2 [scrollbar-width:none]">
            {VIEWS.map(([id, label, Icon]) => (
              <button key={id} type="button" onClick={() => setView(id)} className={`inline-flex flex-shrink-0 items-center gap-1.5 border-b-2 px-2.5 py-2 text-[12.5px] font-semibold transition ${view === id ? 'border-forest-600 text-forest-600' : 'border-transparent text-slate-500 hover:text-dash-ink'}`}><Icon size={14} />{label}</button>
            ))}
            <button type="button" onClick={() => { setTour(true); setOpen(false) }} className="ml-auto inline-flex flex-shrink-0 items-center gap-1.5 px-2.5 py-2 text-[12.5px] font-semibold text-slate-500 hover:text-forest-600"><Compass size={14} />Tour</button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
            {view === 'tools' && (
              <div className="space-y-4">
                <p className="text-[12.5px] text-slate-500">{openTools.length} tools open{!isStaff && shown.length > openTools.length ? `, ${shown.length - openTools.length} more on higher plans` : ''}.</p>
                {GUIDE_GROUPS.map((g) => {
                  const list = shown.filter((t) => t.group === g.id)
                  if (!list.length) return null
                  return (
                    <div key={g.id}>
                      <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-400">{g.label}</p>
                      <ul className="space-y-1">
                        {list.map((t) => (
                          <li key={t.id}>
                            <button type="button" onClick={() => (t.open ? go(t.id) : upgrade())} className={`flex w-full items-start gap-3 rounded-2xl p-2.5 text-left transition ${t.open ? 'hover:bg-forest-50/60' : 'hover:bg-amber-50/60'} ${activeTab === t.id ? 'bg-forest-50/70' : ''}`}>
                              <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-2"><span className={`text-[13.5px] font-semibold ${t.open ? 'text-dash-ink' : 'text-slate-500'}`}>{labels[t.id]}</span>{t.locked && <PlanChip plan={t.plan} />}</span>
                                <span className="block text-[12px] leading-snug text-slate-500">{t.locked && t.pitch ? t.pitch : t.about}</span>
                              </span>
                              <ArrowRight size={14} className={`mt-1 flex-shrink-0 ${t.open ? 'text-slate-300' : 'text-amber-500'}`} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
            )}

            {view === 'unlock' && nextPlan && (
              <div>
                <div className="rounded-3xl bg-gradient-to-br from-forest to-forest-600 p-5 text-white">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-forest-100">Next step for your business</p>
                  <p className="mt-1 font-display text-[22px] font-extrabold">{PLAN_LABEL[nextPlan.plan]}</p>
                  <p className="text-[13px] text-white/80">{formatPrice(PLAN_PRICES[nextPlan.plan].monthly)} a month, or save 20% yearly</p>
                  <button type="button" onClick={upgrade} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-[14px] font-bold text-forest transition hover:bg-forest-50"><CreditCard size={16} />Upgrade to {PLAN_LABEL[nextPlan.plan]}</button>
                </div>
                <p className="mb-2 mt-4 text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-400">What you unlock</p>
                <ul className="space-y-2">
                  {nextPlan.tools.map((t) => (
                    <li key={t.id} className="flex items-start gap-2.5 rounded-2xl bg-forest-50/50 p-3">
                      <Check size={15} className="mt-0.5 flex-shrink-0 text-forest-600" />
                      <span><span className="block text-[13.5px] font-bold text-dash-ink">{labels[t.id]}</span><span className="block text-[12px] leading-snug text-slate-600">{t.pitch || t.about}</span></span>
                    </li>
                  ))}
                </ul>
                <button type="button" onClick={upgrade} className="mt-4 w-full rounded-xl py-2.5 text-[13px] font-semibold text-forest-700 hover:bg-forest-50">Compare every plan</button>
              </div>
            )}

            {view === 'page' && (here ? (
              <div>
                <div className="flex items-start gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-[14.5px] font-bold text-dash-ink">{labels[here.id] || here.id}{hereLocked && <PlanChip plan={here.plan} />}</p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-slate-600">{here.about}</p>
                  </div>
                </div>
                <p className="mb-2 mt-4 text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-400">What you can do here</p>
                <ul className="space-y-2">{here.can.map((c) => <li key={c} className="flex items-start gap-2 text-[13px] text-slate-600"><Check size={14} className="mt-0.5 flex-shrink-0 text-forest-600" />{c}</li>)}</ul>
                {hereLocked && !isStaff && (
                  <div className="mt-4 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100">
                    <p className="text-[13px] font-bold text-amber-900">{here.pitch}</p>
                    <button type="button" onClick={upgrade} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-amber-950 px-3.5 py-2 text-[13px] font-bold text-white">Unlock with {PLAN_LABEL[here.plan]}, from {formatPrice(PLAN_PRICES[here.plan].monthly)} a month <ArrowRight size={14} /></button>
                  </div>
                )}
              </div>
            ) : <p className="text-[13px] text-slate-500">Open a tab and I&apos;ll show tips for it here.</p>)}
          </div>
          <div className="flex-shrink-0 border-t border-dash-line px-5 py-3 text-[12px] text-slate-500">Need a person? Open <button type="button" onClick={() => go('support')} className="font-semibold text-forest-700 hover:underline">Support</button> and we&apos;ll reply.</div>
        </div>,
        document.body,
      )}

      {tour && <Tour name={name} tools={openTools} labels={labels} onOpenTab={onOpenTab} onUpgrade={upgrade} nextPlan={nextPlan} onDone={() => setTour(false)} />}
    </>
  )
}
