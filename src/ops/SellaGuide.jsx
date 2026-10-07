// src/ops/SellaGuide.jsx
//
// Sella, the Ops console's guide. A waving robot in the corner of every page.
// Tap her for:
//   Your access   every tab this person has, what it is and what they can do
//   This page     tips for the tab they are on
//   Take the tour a step-by-step walk through their tabs (also shown, by
//                 itself, right after someone's first welcome)
// Everything comes from utils/opsAccess.js, so a tab added there is in the
// guide the moment it ships. No AI, no cost: it never sends anything anywhere.
//
// She can be dragged anywhere on the screen (so she never sits on top of
// something you need), and hidden with her X. The robot button in the top bar
// brings her back. Where she sits and whether she is on is remembered per
// person in this browser.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, ArrowRight, ArrowLeft, Check, Compass, ListChecks, Lightbulb, Mail } from 'lucide-react'
import SellaBot from './SellaBot'
import { TabIcon } from './opsKit'
import { OPS_GROUPS, OPS_FOUNDER, opsTab } from '../utils/opsAccess'

function Tour({ me, tabs, onOpenTab, onDone }) {
  const [i, setI] = useState(0)
  const steps = [{ id: '__hello' }, ...tabs, { id: '__end' }]
  const step = steps[i]
  const first = (me?.name || '').split(' ')[0]
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
    <div className="fixed inset-0 z-[140] flex items-end justify-center bg-slate-900/55 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Tour of your tabs">
      <div className="w-full max-w-lg overflow-hidden rounded-t-[28px] bg-white shadow-2xl animate-in slide-in-from-bottom-6 duration-300 sm:rounded-[28px]">
        <div className="relative bg-gradient-to-br from-[#034e22] via-[#0b6b35] to-[#0e8a52] px-6 pb-5 pt-6 text-white">
          <button type="button" onClick={onDone} className="absolute right-4 top-4 rounded-full p-1.5 text-green-100 hover:bg-white/10" aria-label="Close the tour"><X size={18} /></button>
          <div className="flex items-end gap-4">
            <SellaBot size={64} wave={i === 0 || i === steps.length - 1} />
            <div className="pb-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-green-200">Sella&apos;s tour {i > 0 && i < steps.length - 1 ? `· ${i} of ${tabs.length}` : ''}</p>
              <p className="mt-1 font-display text-xl font-extrabold leading-tight">
                {step.id === '__hello' ? `Hi ${first}, I'm Sella` : step.id === '__end' ? 'That’s everything' : step.label}
              </p>
            </div>
          </div>
          <div className="mt-4 flex gap-1">
            {steps.map((s, n) => <span key={s.id} className={`h-1 flex-1 rounded-full transition-colors ${n <= i ? 'bg-white' : 'bg-white/25'}`} />)}
          </div>
        </div>

        <div key={step.id} className="min-h-[190px] px-6 py-5 animate-in fade-in slide-in-from-right-3 duration-300">
          {step.id === '__hello' && (
            <>
              <p className="text-[14.5px] leading-relaxed text-slate-700">I&apos;ll walk you through the {tabs.length} tab{tabs.length === 1 ? '' : 's'} you can open, and what you can do in each. It takes a minute.</p>
              <p className="mt-3 text-[13px] text-slate-500">You can find me in the bottom corner of every page whenever you need me.</p>
            </>
          )}
          {step.id === '__end' && (
            <>
              <p className="text-[14.5px] leading-relaxed text-slate-700">You&apos;re all set, {first}. Tap me any time for this list, tips for the page you&apos;re on, or to take the tour again.</p>
              <p className="mt-3 flex items-center gap-2 text-[13px] text-slate-500"><Mail size={14} className="text-forest-600" /> Need a person? Holla {OPS_FOUNDER.name} at {OPS_FOUNDER.email}.</p>
            </>
          )}
          {step.about && (
            <>
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-forest-50 text-forest-600"><TabIcon name={step.icon} size={20} /></span>
                <p className="text-[14px] leading-relaxed text-slate-700">{step.about}</p>
              </div>
              <ul className="mt-4 space-y-2">
                {step.can.map((c) => <li key={c} className="flex items-start gap-2 text-[13.5px] text-slate-600"><Check size={15} className="mt-0.5 flex-shrink-0 text-forest-600" /> {c}</li>)}
              </ul>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-dash-line px-6 py-4">
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

const BOT = 66 // the floating button, in px (54px robot plus padding)
const MARGIN = 8
const clampPos = (pos) => {
  const w = window.innerWidth
  const h = window.innerHeight
  return {
    right: Math.min(Math.max(MARGIN, pos.right), Math.max(MARGIN, w - BOT - MARGIN)),
    bottom: Math.min(Math.max(MARGIN, pos.bottom), Math.max(MARGIN, h - BOT - MARGIN)),
  }
}

export default function SellaGuide({ me, tabs, activeTab, onOpenTab, tourOpen, onTourDone, visible = true, onHide }) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState('access')
  const [tour, setTour] = useState(false)
  const [hello, setHello] = useState(false)
  const posKey = `sp_ops_sella_pos_${me?.uid || 'x'}`
  const [pos, setPos] = useState(() => {
    try { const v = JSON.parse(localStorage.getItem(posKey) || 'null'); if (v && Number.isFinite(v.right) && Number.isFinite(v.bottom)) return clampPos(v) } catch { /* fine */ }
    return window.innerWidth < 640 ? { right: 12, bottom: 12 } : { right: 20, bottom: 20 }
  })
  const [dragging, setDragging] = useState(false)
  const drag = useRef(null)
  const first = (me?.name || '').split(' ')[0]
  const here = opsTab(activeTab)

  // Stay on screen when the window shrinks (a phone turned, a window resized).
  useEffect(() => {
    const fit = () => setPos((p) => clampPos(p))
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  // A press that moves more than a few pixels is a drag; anything else is a tap.
  const onPointerDown = (e) => {
    if (e.button != null && e.button !== 0) return
    drag.current = { x: e.clientX, y: e.clientY, right: pos.right, bottom: pos.bottom, moved: false, id: e.pointerId }
    try { e.currentTarget.setPointerCapture?.(e.pointerId) } catch { /* no live pointer (some browsers, tests) */ }
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

  // The panel opens on whichever side of her has room.
  const vw = window.innerWidth
  const vh = window.innerHeight
  const lowerHalf = pos.bottom < vh / 2
  const rightHalf = pos.right < vw / 2
  const phone = vw < 640
  const panelStyle = {
    ...(lowerHalf ? { bottom: pos.bottom + BOT + 10 } : { top: vh - pos.bottom + 10 }),
    ...(phone ? {} : rightHalf ? { right: Math.max(12, pos.right) } : { left: Math.max(12, vw - pos.right - BOT) }),
    maxHeight: lowerHalf ? `min(72vh, calc(100dvh - ${pos.bottom + BOT + 24}px))` : `min(72vh, calc(100dvh - ${vh - pos.bottom + 24}px))`,
  }

  // A hello bubble once per browser session.
  useEffect(() => {
    let seen = false
    try { seen = sessionStorage.getItem('sp_ops_sella_hello') === '1'; sessionStorage.setItem('sp_ops_sella_hello', '1') } catch { /* fine */ }
    if (seen) return
    const a = setTimeout(() => setHello(true), 1500)
    const b = setTimeout(() => setHello(false), 7500)
    return () => { clearTimeout(a); clearTimeout(b) }
  }, [])

  const grouped = useMemo(() => OPS_GROUPS.map((g) => ({ ...g, tabs: tabs.filter((t) => t.group === g.id) })).filter((g) => g.tabs.length), [tabs])
  const showTour = tour || tourOpen

  return (
    <>
      {visible && (
        <div className="fixed z-[95]" style={{ right: pos.right, bottom: pos.bottom }}>
          {hello && !open && !dragging && (
            <button type="button" onClick={() => { setOpen(true); setHello(false) }} className={`absolute bottom-full mb-2 w-[230px] rounded-2xl bg-white px-4 py-2.5 text-left text-[13px] text-slate-700 shadow-xl ring-1 ring-black/5 animate-in fade-in slide-in-from-bottom-2 duration-300 ${rightHalf ? 'right-0 rounded-br-md' : 'left-0 rounded-bl-md'}`}>
              Hi {first}! Need a hand? I know every tab you can open. Drag me anywhere.
            </button>
          )}
          <div className="group relative">
            <button type="button" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={(e) => finish(e)} onPointerCancel={(e) => finish(e, true)} onKeyDown={onKey}
              aria-expanded={open} aria-label={open ? 'Close Sella' : 'Ask Sella for help. Drag to move her.'}
              className={`touch-none select-none rounded-full bg-white/90 p-1.5 shadow-[0_12px_32px_-10px_rgba(3,78,34,0.55)] ring-1 ring-forest-100 backdrop-blur transition ${dragging ? 'scale-110 cursor-grabbing shadow-2xl' : 'cursor-grab hover:scale-105'}`}>
              <SellaBot size={54} wave={!dragging && (hello || !open)} />
            </button>
            <button type="button" onClick={() => { setOpen(false); setHello(false); onHide?.() }} aria-label="Hide Sella" title="Hide Sella. Bring her back with the robot button in the top bar."
              className="absolute -left-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white shadow-md ring-2 ring-white transition hover:bg-red-600 sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover:opacity-100">
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      {open && visible && (
        <div style={panelStyle} className="fixed inset-x-3 z-[96] flex flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200 sm:inset-x-auto sm:w-[380px]" role="dialog" aria-label="Sella, your guide">

          <div className="flex flex-shrink-0 items-center gap-3 bg-gradient-to-br from-[#034e22] to-[#0b6b35] px-5 py-4 text-white">
            <SellaBot size={40} wave={false} />
            <div className="min-w-0 flex-1">
              <p className="font-display text-[16px] font-extrabold">Hi {first}, I&apos;m Sella</p>
              <p className="text-[12px] text-green-100/85">Your guide to everything you can open here.</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-full p-1.5 text-green-100 hover:bg-white/10" aria-label="Close"><X size={17} /></button>
          </div>
          <div className="flex flex-shrink-0 gap-1 border-b border-dash-line px-3 pt-2">
            {[['access', 'Your access', ListChecks], ['page', 'This page', Lightbulb]].map(([id, label, Icon]) => (
              <button key={id} type="button" onClick={() => setView(id)} className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-[12.5px] font-semibold transition ${view === id ? 'border-forest-600 text-forest-600' : 'border-transparent text-slate-500 hover:text-dash-ink'}`}><Icon size={14} /> {label}</button>
            ))}
            <button type="button" onClick={() => { setTour(true); setOpen(false) }} className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 text-[12.5px] font-semibold text-slate-500 hover:text-forest-600"><Compass size={14} /> Tour</button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
            {view === 'access' ? (
              <div className="space-y-4">
                <p className="text-[12.5px] text-slate-500">You can open {tabs.length} tab{tabs.length === 1 ? '' : 's'}{me?.isSuper ? ', because you are a super admin' : ''}.</p>
                {grouped.map((g) => (
                  <div key={g.id}>
                    <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-400">{g.label}</p>
                    <ul className="space-y-1.5">
                      {g.tabs.map((t) => (
                        <li key={t.id}>
                          <button type="button" onClick={() => { onOpenTab(t.id); setOpen(false) }} className="flex w-full items-start gap-3 rounded-2xl p-2.5 text-left transition hover:bg-forest-50/60">
                            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-forest-50 text-forest-600"><TabIcon name={t.icon} size={16} /></span>
                            <span className="min-w-0">
                              <span className="block text-[13.5px] font-semibold text-dash-ink">{t.label}</span>
                              <span className="block text-[12px] leading-snug text-slate-500">{t.can.join(' · ')}</span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : here ? (
              <div>
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-forest-50 text-forest-600"><TabIcon name={here.icon} size={18} /></span>
                  <div><p className="text-[14px] font-bold text-dash-ink">{here.label}</p><p className="mt-0.5 text-[13px] leading-relaxed text-slate-600">{here.about}</p></div>
                </div>
                <p className="mb-2 mt-4 text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-400">What you can do here</p>
                <ul className="space-y-2">{here.can.map((c) => <li key={c} className="flex items-start gap-2 text-[13px] text-slate-600"><Check size={14} className="mt-0.5 flex-shrink-0 text-forest-600" /> {c}</li>)}</ul>
                {here.risky && <p className="mt-4 rounded-2xl bg-amber-50 px-3 py-2.5 text-[12.5px] text-amber-800 ring-1 ring-amber-100">Careful here: {here.risky.toLowerCase()} Risky actions ask for your authenticator code.</p>}
              </div>
            ) : <p className="text-[13px] text-slate-500">Open a tab and I&apos;ll show tips for it here.</p>}
          </div>
          <div className="flex-shrink-0 border-t border-dash-line px-5 py-3 text-[12px] text-slate-500">Need a person? Holla {OPS_FOUNDER.name}: <span className="font-semibold text-dash-ink">{OPS_FOUNDER.email}</span></div>
        </div>
      )}

      {showTour && <Tour me={me} tabs={tabs} onOpenTab={onOpenTab} onDone={() => { setTour(false); onTourDone?.() }} />}
    </>
  )
}
