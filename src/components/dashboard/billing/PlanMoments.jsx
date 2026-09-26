// src/components/dashboard/billing/PlanMoments.jsx
//
// The moments around paying for a plan, each with its own hand-drawn,
// animated illustration (SVG and CSS, no emoji, no stock pictures):
//
//   PaymentSuccessModal  the payment went through: a crown drawing itself in,
//                        confetti, and what the plan just unlocked.
//   PaymentProblemModal  it did not: a sad face with a falling tear for a
//                        failed or cancelled payment, an hourglass while the
//                        bank is still confirming. Always with a way forward.
//   RetentionModal       a day before a paid plan (or trial) ends, or in the
//                        days after a store drops back to Starter: an empty
//                        seat with its crown hovering, and one button to keep
//                        or take back the seat.
//
// The words are warm on purpose ("your majesty", "your highness"): vendors
// asked for Sellapage to feel like it is on their side, not like a bill.
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, Check, ArrowRight, RotateCcw, MessageCircle, Loader2, Receipt } from 'lucide-react'
import useConfetti from '../ui/useConfetti'
import useCountdown from './useCountdown'
import { PLAN_FEATURES, PLAN_PERIODS } from '../../../utils/billingPlans'

const SUPPORT_WHATSAPP = 'https://wa.me/2348120525256'
const GOLD_CONFETTI = ['#facc15', '#f59e0b', '#fde68a', '#16a34a', '#22c55e', '#034e22', '#ffffff']

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '')
const periodLabel = (id) => PLAN_PERIODS.find((p) => p.id === id)?.label || ''

const ANIM = `
@keyframes pm-draw { to { stroke-dashoffset: 0 } }
@keyframes pm-pop { 0% { transform: scale(0) } 70% { transform: scale(1.25) } 100% { transform: scale(1) } }
@keyframes pm-spin { to { transform: rotate(360deg) } }
@keyframes pm-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
@keyframes pm-tear { 0% { transform: translateY(0); opacity: 0 } 15% { opacity: 1 } 80% { opacity: 1 } 100% { transform: translateY(26px); opacity: 0 } }
@keyframes pm-blink { 0%,92%,100% { transform: scaleY(1) } 95% { transform: scaleY(.1) } }
@keyframes pm-wobble { 0%,100% { transform: rotate(0) } 25% { transform: rotate(-3deg) } 75% { transform: rotate(3deg) } }
@keyframes pm-sand { 0% { transform: scaleY(1) } 100% { transform: scaleY(0) } }
@keyframes pm-flip { 0%,80% { transform: rotate(0) } 100% { transform: rotate(180deg) } }
@keyframes pm-in { from { opacity: 0; transform: translateY(14px) scale(.97) } to { opacity: 1; transform: none } }
@keyframes pm-glow { 0%,100% { opacity: .35 } 50% { opacity: .7 } }
.pm-card { animation: pm-in .35s cubic-bezier(.2,.9,.3,1.2) }
.pm-draw { stroke-dasharray: 400; stroke-dashoffset: 400; animation: pm-draw 1.1s .15s ease-out forwards }
.pm-pop { transform-box: fill-box; transform-origin: center; transform: scale(0); animation: pm-pop .45s ease-out forwards }
.pm-rays { transform-origin: 80px 70px; animation: pm-spin 18s linear infinite }
.pm-float { animation: pm-float 3s ease-in-out infinite }
.pm-tear { animation: pm-tear 2.2s ease-in infinite }
.pm-blink { transform-box: fill-box; transform-origin: center; animation: pm-blink 4s infinite }
.pm-wobble { transform-origin: 80px 90px; animation: pm-wobble 3.2s ease-in-out infinite }
.pm-sand-top { transform-box: fill-box; transform-origin: bottom; animation: pm-sand 3s linear infinite }
.pm-flip { transform-origin: 80px 70px; animation: pm-flip 3s ease-in-out infinite }
.pm-glow { animation: pm-glow 2.4s ease-in-out infinite }
@media (prefers-reduced-motion: reduce) {
  .pm-card, .pm-rays, .pm-float, .pm-tear, .pm-blink, .pm-wobble, .pm-sand-top, .pm-flip, .pm-glow { animation: none }
  .pm-draw { stroke-dashoffset: 0; animation: none }
  .pm-pop { transform: none; animation: none }
}
`

// ── Illustrations ─────────────────────────────────────────────────────────

function CrownArt() {
  return (
    <svg viewBox="0 0 160 130" className="h-32 w-40" aria-hidden="true">
      <defs>
        <linearGradient id="pm-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <g className="pm-rays" opacity="0.5">
        {Array.from({ length: 12 }).map((_, i) => (
          <rect key={i} x="78" y="4" width="4" height="18" rx="2" fill="#fde68a" transform={`rotate(${i * 30} 80 70)`} />
        ))}
      </g>
      <circle cx="80" cy="70" r="40" fill="#ffffff" opacity="0.9" />
      <g className="pm-float">
        <path d="M48 88 L42 50 L62 66 L80 40 L98 66 L118 50 L112 88 Z" fill="url(#pm-gold)" />
        <path className="pm-draw" d="M48 88 L42 50 L62 66 L80 40 L98 66 L118 50 L112 88 Z" fill="none" stroke="#b45309" strokeWidth="3" strokeLinejoin="round" />
        <rect x="46" y="88" width="68" height="10" rx="3" fill="#f59e0b" />
        <circle className="pm-pop" style={{ animationDelay: '.9s' }} cx="80" cy="40" r="5" fill="#16a34a" />
        <circle className="pm-pop" style={{ animationDelay: '1s' }} cx="42" cy="50" r="4" fill="#22c55e" />
        <circle className="pm-pop" style={{ animationDelay: '1.1s' }} cx="118" cy="50" r="4" fill="#22c55e" />
        <circle className="pm-pop" style={{ animationDelay: '1.2s' }} cx="80" cy="76" r="5" fill="#034e22" />
      </g>
    </svg>
  )
}

function SadFaceArt() {
  return (
    <svg viewBox="0 0 160 130" className="h-32 w-40" aria-hidden="true">
      <circle className="pm-glow" cx="80" cy="68" r="52" fill="#fde68a" />
      <g className="pm-wobble">
        <circle cx="80" cy="68" r="40" fill="#fef3c7" stroke="#f59e0b" strokeWidth="3" />
        {/* eyebrows raised in the middle: worried, not cross */}
        <path d="M57 55 Q63 50 70 49" fill="none" stroke="#92400e" strokeWidth="3" strokeLinecap="round" />
        <path d="M103 55 Q97 50 90 49" fill="none" stroke="#92400e" strokeWidth="3" strokeLinecap="round" />
        <ellipse className="pm-blink" cx="66" cy="64" rx="4" ry="5" fill="#78350f" />
        <ellipse className="pm-blink" cx="94" cy="64" rx="4" ry="5" fill="#78350f" />
        {/* frown */}
        <path d="M64 90 Q80 78 96 90" fill="none" stroke="#92400e" strokeWidth="3.5" strokeLinecap="round" />
        {/* tear */}
        <path className="pm-tear" d="M96 72 q4 6 0 9 q-4 -3 0 -9z" fill="#60a5fa" />
      </g>
    </svg>
  )
}

function HourglassArt() {
  return (
    <svg viewBox="0 0 160 130" className="h-32 w-40" aria-hidden="true">
      <circle className="pm-glow" cx="80" cy="68" r="50" fill="#d5f1e1" />
      <g className="pm-flip">
        <rect x="56" y="30" width="48" height="6" rx="3" fill="#034e22" />
        <rect x="56" y="102" width="48" height="6" rx="3" fill="#034e22" />
        <path d="M62 36 H98 L82 69 L98 102 H62 L78 69 Z" fill="#ffffff" stroke="#16a34a" strokeWidth="3" strokeLinejoin="round" />
        <path className="pm-sand-top" d="M67 40 H93 L81 64 L79 64 Z" fill="#facc15" />
        <path d="M70 100 H90 L80 86 Z" fill="#facc15" />
      </g>
    </svg>
  )
}

function SeatArt() {
  return (
    <svg viewBox="0 0 160 130" className="h-32 w-40" aria-hidden="true">
      <ellipse cx="80" cy="116" rx="46" ry="6" fill="#034e22" opacity="0.12" />
      {/* the chair */}
      <path d="M50 58 Q50 40 80 40 Q110 40 110 58 V86 H50 Z" fill="#16a34a" />
      <path d="M44 74 Q44 66 52 66 H108 Q116 66 116 74 V96 Q116 102 110 102 H50 Q44 102 44 96 Z" fill="#034e22" />
      <rect x="56" y="80" width="48" height="12" rx="6" fill="#22c55e" />
      <rect x="52" y="102" width="6" height="12" rx="2" fill="#023a19" />
      <rect x="102" y="102" width="6" height="12" rx="2" fill="#023a19" />
      {/* the crown, waiting */}
      <g className="pm-float">
        <path d="M66 30 L62 12 L73 20 L80 6 L87 20 L98 12 L94 30 Z" fill="#facc15" stroke="#b45309" strokeWidth="2" strokeLinejoin="round" />
      </g>
    </svg>
  )
}

// ── Shell ─────────────────────────────────────────────────────────────────

function Shell({ open, onClose, art, tone = 'green', children, labelledBy, canvasRef }) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  const band = {
    green: 'from-forest-50 via-[#e9f7ef] to-white',
    gold: 'from-amber-50 via-[#fff7e0] to-white',
    amber: 'from-amber-50 via-orange-50/60 to-white',
  }[tone]
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
      <style>{ANIM}</style>
      <div className="absolute inset-0 bg-forest-900/50 backdrop-blur-[3px] animate-in fade-in duration-300" onClick={onClose} />
      {canvasRef && <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-[101]" aria-hidden="true" />}
      <div className="pm-card relative z-[102] max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <button type="button" onClick={onClose} className="absolute right-3 top-3 z-10 rounded-full p-2 text-dash-muted transition hover:bg-gray-100 hover:text-dash-ink" aria-label="Close">
          <X size={18} />
        </button>
        <div className={`flex justify-center bg-gradient-to-b ${band} pb-1 pt-7`}>{art}</div>
        <div className="px-6 pb-6 pt-2">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

// ── Payment went through ──────────────────────────────────────────────────

export function PaymentSuccessModal({ open, plan, period, onClose, onViewHistory }) {
  const canvasRef = useRef(null)
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  useConfetti(canvasRef, open && !reduced, GOLD_CONFETTI)
  const features = (PLAN_FEATURES[plan] || []).filter((f) => !f.startsWith('Everything in')).slice(0, 5)
  return (
    <Shell open={open} onClose={onClose} art={<CrownArt />} tone="gold" labelledBy="pm-success-title" canvasRef={canvasRef}>
      <p className="text-center text-[11px] font-bold uppercase tracking-[0.18em] text-amber-600">Payment received</p>
      <h2 id="pm-success-title" className="mt-1.5 text-center font-display text-2xl font-extrabold leading-tight text-dash-ink text-balance">
        Welcome to the {cap(plan)} seat, your majesty
      </h2>
      <p className="mt-2 text-center text-sm leading-relaxed text-dash-muted">
        Your {cap(plan)} plan{period ? ` (${periodLabel(period).toLowerCase()})` : ''} is switched on. We promise to serve you better on this journey
        you&apos;ve decided to take with us. Here is what just opened up for you:
      </p>
      {features.length > 0 && (
        <ul className="mt-4 space-y-2 rounded-2xl bg-forest-50/60 p-4">
          {features.map((f, i) => (
            <li key={f} className="flex items-start gap-2.5 text-[13px] text-dash-ink animate-in fade-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${300 + i * 90}ms`, animationFillMode: 'both' }}>
              <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-forest-600 text-white"><Check size={10} strokeWidth={3.5} /></span>
              {f}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-5 grid gap-2">
        <button type="button" onClick={onClose} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-forest px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-forest/20 transition hover:bg-forest-700">
          Start exploring <ArrowRight size={16} />
        </button>
        {onViewHistory && (
          <button type="button" onClick={onViewHistory} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-dash-line px-4 py-2.5 text-sm font-semibold text-dash-ink transition hover:bg-gray-50">
            <Receipt size={15} /> See my receipt
          </button>
        )}
      </div>
      <p className="mt-3 text-center text-[11px] text-dash-muted">It can take a minute for every feature to appear. A quick refresh helps.</p>
    </Shell>
  )
}

// ── Payment did not go through ────────────────────────────────────────────

export function PaymentProblemModal({ open, kind = 'failed', plan, reason, onRetry, retrying, onMessage, onClose }) {
  const planName = plan ? cap(plan) : 'your new'
  if (kind === 'pending') {
    return (
      <Shell open={open} onClose={onClose} art={<HourglassArt />} labelledBy="pm-problem-title">
        <h2 id="pm-problem-title" className="text-center font-display text-2xl font-extrabold leading-tight text-dash-ink">Your payment is on its way</h2>
        <p className="mt-2 text-center text-sm leading-relaxed text-dash-muted">
          Paystack is still confirming it with your bank. Your {planName} plan switches on by itself the moment it lands, usually within a few minutes.
          No need to pay twice.
        </p>
        <button type="button" onClick={onClose} className="mt-5 w-full rounded-2xl bg-forest px-4 py-3 text-sm font-semibold text-white transition hover:bg-forest-700">Okay, I&apos;ll wait</button>
      </Shell>
    )
  }
  const cancelled = kind === 'cancelled'
  return (
    <Shell open={open} onClose={onClose} art={<SadFaceArt />} tone="amber" labelledBy="pm-problem-title">
      <h2 id="pm-problem-title" className="text-center font-display text-2xl font-extrabold leading-tight text-dash-ink text-balance">
        {cancelled ? 'Your highness, you left so soon!' : 'Your highness, what happened?'}
      </h2>
      <p className="mt-2 text-center text-sm leading-relaxed text-dash-muted">
        {cancelled
          ? <>You were one step away from the {planName} seat and the best value for your money. The payment page closed before anything was charged.</>
          : <>You were one step away from getting the best value for your money, but the payment didn&apos;t go through and nothing was charged.</>}
      </p>
      {!cancelled && reason && (
        <p className="mx-auto mt-3 w-fit rounded-full bg-amber-50 px-3 py-1 text-center text-xs font-medium text-amber-800">Paystack said: {reason}</p>
      )}
      <p className="mt-3 text-center text-sm leading-relaxed text-dash-muted">
        Can you please try again? If something went wrong on our side, send our team a message and we&apos;ll sort it out with you.
      </p>
      <div className="mt-5 grid gap-2">
        {onRetry && plan && (
          <button type="button" onClick={onRetry} disabled={retrying} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-forest px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-forest/20 transition hover:bg-forest-700 disabled:opacity-70">
            {retrying ? <><Loader2 size={16} className="animate-spin" /> Taking you to Paystack...</> : <><RotateCcw size={16} /> Try again</>}
          </button>
        )}
        <a href={SUPPORT_WHATSAPP} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-dash-line px-4 py-2.5 text-sm font-semibold text-dash-ink transition hover:bg-gray-50">
          <MessageCircle size={15} /> Chat with our team on WhatsApp
        </a>
        {onMessage && (
          <button type="button" onClick={onMessage} className="px-4 py-1.5 text-xs font-semibold text-dash-muted transition hover:text-dash-ink">Send a message instead</button>
        )}
      </div>
    </Shell>
  )
}

// ── We'd hate to see you leave ────────────────────────────────────────────

function Clock({ endsAt }) {
  const c = useCountdown(endsAt)
  const pad = (n) => String(n).padStart(2, '0')
  if (c.done) return null
  const cells = [
    ...(c.days ? [[c.days, c.days === 1 ? 'Day' : 'Days']] : []),
    [pad(c.hours), 'Hours'], [pad(c.minutes), 'Minutes'], [pad(c.seconds), 'Seconds'],
  ]
  return (
    <div className="mt-4 flex justify-center gap-2">
      {cells.map(([v, l]) => (
        <div key={l} className="w-16 rounded-xl border border-dash-line bg-white py-2 text-center shadow-sm">
          <p className="font-body text-xl font-bold tabular-nums text-dash-ink">{v}</p>
          <p className="text-[10px] text-dash-muted">{l}</p>
        </div>
      ))}
    </div>
  )
}

export function RetentionModal({ open, mode = 'expiring', plan, endsAt, since, onRenew, renewing, onClose }) {
  const name = cap(plan)
  const title = mode === 'downgraded'
    ? `Your ${name} seat is still warm, your highness`
    : mode === 'trial'
      ? `Your ${name} trial ends soon, your highness`
      : `We'd hate to see you leave the ${name} seat, your highness`
  return (
    <Shell open={open} onClose={onClose} art={<SeatArt />} labelledBy="pm-retain-title">
      <h2 id="pm-retain-title" className="text-center font-display text-2xl font-extrabold leading-tight text-dash-ink text-balance">{title}</h2>
      <p className="mt-2 text-center text-sm leading-relaxed text-dash-muted">
        {mode === 'downgraded'
          ? <>Your store went back to the free plan{since ? ` on ${since.toLocaleDateString('en-NG', { day: 'numeric', month: 'long' })}` : ''}. Please do come back so we can serve you better. Everything you set up is saved, and taking your seat back switches it all on again.</>
          : mode === 'trial'
            ? <>Your free {name} trial is almost over. Pick a plan and everything you&apos;ve set up keeps working, with nothing to redo.</>
            : <>Your {name} plan ends soon. Please do stay so we can keep serving you. Renew now and nothing changes: your listings, analytics and settings stay exactly as they are, and the new time is added on top.</>}
      </p>
      {mode !== 'downgraded' && endsAt && <Clock endsAt={endsAt} />}
      <div className="mt-5 grid gap-2">
        <button type="button" onClick={onRenew} disabled={renewing} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-forest px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-forest/20 transition hover:bg-forest-700 disabled:opacity-70">
          {renewing
            ? <><Loader2 size={16} className="animate-spin" /> Taking you to Paystack...</>
            : mode === 'downgraded' ? <>Take my {name} seat back <ArrowRight size={16} /></>
              : mode === 'trial' ? <>Choose my plan <ArrowRight size={16} /></>
                : <>Keep my {name} seat <ArrowRight size={16} /></>}
        </button>
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-dash-muted transition hover:text-dash-ink">
          {mode === 'downgraded' ? 'Maybe later' : 'Remind me tomorrow'}
        </button>
      </div>
    </Shell>
  )
}
