// src/components/auth/WelcomeCelebration.jsx
//
// The moment a code is right. Full-screen confetti, and a drawn champagne
// bottle that shakes, pops its cork and sprays into two flutes that clink.
// Everything is SVG, CSS and one small canvas: no emoji, no images, nothing
// to download. People who ask their device for less motion get the still
// picture and the message.
//
// variant "new": a store was just created (the welcome Nex wrote).
// variant "back": an emailed sign-in code was just confirmed.
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRight, Crown, Check } from 'lucide-react'
import useConfetti from '../dashboard/ui/useConfetti'

const GOLD = ['#facc15', '#fde68a', '#fef3c7', '#ffffff', '#fbbf24']
const CONFETTI = ['#22c55e', '#86efac', '#facc15', '#fde68a', '#ffffff', '#f97316', '#ec4899', '#60a5fa']

const CSS = `
@keyframes sp-bottle { 0% { transform: rotate(0deg) } 8% { transform: rotate(-5deg) } 16% { transform: rotate(5deg) } 24% { transform: rotate(-5deg) } 32% { transform: rotate(4deg) } 40%, 100% { transform: rotate(0deg) } }
@keyframes sp-cork { 0%, 38% { transform: translate(0, 0) rotate(0deg); opacity: 1 } 100% { transform: translate(0, -260px) rotate(620deg); opacity: 0 } }
@keyframes sp-pop { 0%, 40% { transform: scale(0); opacity: 0 } 48% { opacity: 1 } 70% { transform: scale(1.25); opacity: 0 } 100% { transform: scale(1.25); opacity: 0 } }
@keyframes sp-flute-l { 0%, 45% { transform: rotate(-10deg) } 62% { transform: rotate(15deg) } 70% { transform: rotate(9deg) } 100% { transform: rotate(6deg) } }
@keyframes sp-flute-r { 0%, 45% { transform: rotate(10deg) } 62% { transform: rotate(-15deg) } 70% { transform: rotate(-9deg) } 100% { transform: rotate(-6deg) } }
@keyframes sp-fill { 0%, 35% { transform: translateY(62px) } 100% { transform: translateY(14px) } }
@keyframes sp-clink { 0%, 58% { transform: scale(0) rotate(0deg); opacity: 0 } 64% { transform: scale(1.1) rotate(20deg); opacity: 1 } 100% { transform: scale(0.2) rotate(60deg); opacity: 0 } }
@keyframes sp-bubble { 0% { transform: translateY(0); opacity: 0 } 20% { opacity: 0.9 } 100% { transform: translateY(-46px); opacity: 0 } }
@keyframes sp-rise { 0% { transform: translateY(18px); opacity: 0 } 100% { transform: translateY(0); opacity: 1 } }
@keyframes sp-glow { 0%, 100% { opacity: 0.55 } 50% { opacity: 0.9 } }
.sp-bottle { transform-origin: 80px 205px; animation: sp-bottle 1.3s ease-in-out both }
.sp-cork { transform-box: fill-box; transform-origin: center; animation: sp-cork 1.5s cubic-bezier(.2,.7,.3,1) both }
.sp-pop { transform-box: fill-box; transform-origin: center; animation: sp-pop 1.4s ease-out both }
.sp-flute-l { transform-box: fill-box; transform-origin: 50% 100%; animation: sp-flute-l 2.6s ease-in-out both }
.sp-flute-r { transform-box: fill-box; transform-origin: 50% 100%; animation: sp-flute-r 2.6s ease-in-out both }
.sp-fill { animation: sp-fill 2.2s ease-out both }
.sp-clink { transform-box: fill-box; transform-origin: center; animation: sp-clink 2.6s ease-out both }
.sp-bubble { animation: sp-bubble 1.8s ease-in infinite }
.sp-rise { animation: sp-rise 0.7s ease-out both }
.sp-glow { animation: sp-glow 3s ease-in-out infinite }
@media (prefers-reduced-motion: reduce) {
  .sp-bottle, .sp-flute-l, .sp-flute-r, .sp-bubble, .sp-rise, .sp-glow, .sp-clink, .sp-pop { animation: none }
  .sp-cork { animation: none; opacity: 0 }
  .sp-fill { animation: none; transform: translateY(14px) }
}
`

// Golden spray from the bottle's mouth, drawn on a canvas laid exactly over
// the SVG, so the droplets arc and fall like the real thing.
function useSpray(canvasRef, run) {
  useEffect(() => {
    if (!run) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const rect = canvas.getBoundingClientRect()
    const w = rect.width
    const h = rect.height
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const k = w / 300 // viewBox is 300 x 230
    const mouth = { x: 161 * k, y: 53 * k }
    const axis = (-90 + 28) * (Math.PI / 180) // the bottle leans 28 degrees
    const parts = []
    const start = performance.now()
    let raf = 0
    const tick = (now) => {
      const age = now - start
      // The cork leaves at about 0.55s; the spray runs for a second after.
      if (age > 560 && age < 1700) {
        for (let i = 0; i < 5; i++) {
          const a = axis + (Math.random() - 0.5) * 0.55
          const v = (3.2 + Math.random() * 3.2) * k
          parts.push({ x: mouth.x, y: mouth.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: (1.2 + Math.random() * 2.6) * k, c: GOLD[(Math.random() * GOLD.length) | 0], life: 0 })
        }
      }
      ctx.clearRect(0, 0, w, h)
      for (const p of parts) {
        p.vy += 0.12 * k
        p.x += p.vx
        p.y += p.vy
        p.life++
        const alpha = Math.max(0, 1 - p.life / 75)
        if (!alpha) continue
        ctx.globalAlpha = alpha
        ctx.fillStyle = p.c
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      if (age < 3200) raf = requestAnimationFrame(tick)
      else ctx.clearRect(0, 0, w, h)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [canvasRef, run])
}

function Flute({ x, side }) {
  const id = `sp-flute-clip-${side}`
  return (
    <g transform={`translate(${x} 214)`}>
      <g className={side === 'l' ? 'sp-flute-l' : 'sp-flute-r'}>
        <defs>
          <clipPath id={id}><path d="M -3 -44 C -13 -58 -14 -88 -13 -106 L 13 -106 C 14 -88 13 -58 3 -44 Z" /></clipPath>
        </defs>
        <ellipse cx="0" cy="0" rx="15" ry="3.5" fill="#ffffff" opacity="0.55" />
        <rect x="-1.6" y="-45" width="3.2" height="45" rx="1.6" fill="#ffffff" opacity="0.7" />
        <g clipPath={`url(#${id})`}>
          <rect x="-16" y="-106" width="32" height="64" fill="#ffffff" opacity="0.12" />
          <g className="sp-fill">
            <rect x="-16" y="-106" width="32" height="70" fill="url(#sp-champ)" />
            <circle className="sp-bubble" cx="-4" cy="-60" r="1.4" fill="#fff" style={{ animationDelay: '1.4s' }} />
            <circle className="sp-bubble" cx="3" cy="-56" r="1.1" fill="#fff" style={{ animationDelay: '1.9s' }} />
            <circle className="sp-bubble" cx="0" cy="-64" r="1.2" fill="#fff" style={{ animationDelay: '2.3s' }} />
          </g>
        </g>
        <path d="M -3 -44 C -13 -58 -14 -88 -13 -106 L 13 -106 C 14 -88 13 -58 3 -44 Z" fill="none" stroke="#ffffff" strokeWidth="1.8" opacity="0.85" />
        <path d="M -9 -98 C -10 -84 -9 -66 -5 -56" fill="none" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" opacity="0.5" />
      </g>
    </g>
  )
}

function Champagne() {
  const sprayRef = useRef(null)
  useSpray(sprayRef, true)
  return (
    <div className="relative mx-auto aspect-[300/230] w-[260px] sm:w-[320px]" aria-hidden="true">
      <svg viewBox="0 0 300 230" className="absolute inset-0 h-full w-full overflow-visible">
        <defs>
          <linearGradient id="sp-glass" x1="0" x2="1">
            <stop offset="0" stopColor="#0a3a1d" />
            <stop offset="0.35" stopColor="#15803d" />
            <stop offset="0.6" stopColor="#0d5a2c" />
            <stop offset="1" stopColor="#052814" />
          </linearGradient>
          <linearGradient id="sp-foil" x1="0" x2="1">
            <stop offset="0" stopColor="#b8860b" />
            <stop offset="0.45" stopColor="#fde68a" />
            <stop offset="1" stopColor="#c99a1a" />
          </linearGradient>
          <linearGradient id="sp-champ" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fef3c7" />
            <stop offset="0.25" stopColor="#fcd34d" />
            <stop offset="1" stopColor="#f59e0b" />
          </linearGradient>
          <radialGradient id="sp-halo">
            <stop offset="0" stopColor="#fde68a" stopOpacity="0.55" />
            <stop offset="1" stopColor="#fde68a" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle className="sp-glow" cx="170" cy="120" r="120" fill="url(#sp-halo)" />

        {/* The bottle, leaning right, so its mouth is at about (161, 53). */}
        <g className="sp-bottle">
          <g transform="translate(80 205) rotate(28)">
            <path d="M -23 0 Q -23 4 -19 4 L 19 4 Q 23 4 23 0 L 23 -86 C 23 -104 9 -112 8 -126 L 8 -166 L -8 -166 L -8 -126 C -9 -112 -23 -104 -23 -86 Z" fill="url(#sp-glass)" />
            <rect x="-15" y="-100" width="5" height="96" rx="2.5" fill="#ffffff" opacity="0.16" />
            <path d="M -9 -128 L 9 -128 L 9 -168 L -9 -168 Z" fill="url(#sp-foil)" />
            <path d="M -16 -106 C -10 -114 10 -114 16 -106 L 12 -100 C 6 -106 -6 -106 -12 -100 Z" fill="url(#sp-foil)" opacity="0.9" />
            <rect x="-18" y="-72" width="36" height="40" rx="5" fill="#fff8e6" />
            <rect x="-18" y="-72" width="36" height="7" rx="3" fill="#fde68a" />
            <text x="0" y="-42" textAnchor="middle" fontFamily="'Bricolage Grotesque', system-ui, sans-serif" fontWeight="800" fontSize="19" fill="#034e22">S</text>
            <g className="sp-cork">
              <rect x="-7" y="-182" width="14" height="16" rx="3" fill="#c98f4f" />
              <rect x="-8" y="-184" width="16" height="5" rx="2" fill="#e0b27a" />
            </g>
          </g>
        </g>

        {/* The pop. */}
        <g transform="translate(161 53)">
          <g className="sp-pop">
            {Array.from({ length: 10 }).map((_, i) => {
              const a = (i / 10) * Math.PI * 2
              return <line key={i} x1={Math.cos(a) * 10} y1={Math.sin(a) * 10} x2={Math.cos(a) * 24} y2={Math.sin(a) * 24} stroke="#fde68a" strokeWidth="3" strokeLinecap="round" />
            })}
          </g>
        </g>

        <Flute x={216} side="l" />
        <Flute x={268} side="r" />

        {/* The clink. */}
        <g transform="translate(242 104)">
          <path className="sp-clink" d="M0 -14 L3.5 -3.5 L14 0 L3.5 3.5 L0 14 L-3.5 3.5 L-14 0 L-3.5 -3.5 Z" fill="#fef3c7" />
        </g>
      </svg>
      <canvas ref={sprayRef} className="pointer-events-none absolute inset-0 h-full w-full" />
    </div>
  )
}

export default function WelcomeCelebration({ variant = 'new', storeName = '', storeLink = '', onContinue }) {
  const confettiRef = useRef(null)
  const btnRef = useRef(null)
  useConfetti(confettiRef, true, CONFETTI)
  useEffect(() => {
    const t = setTimeout(() => btnRef.current?.focus(), 900)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { clearTimeout(t); document.body.style.overflow = prev }
  }, [])
  const isNew = variant === 'new'

  return createPortal(
    <div role="dialog" aria-modal="true" aria-labelledby="sp-welcome-title" className="fixed inset-0 z-[120] overflow-y-auto bg-[radial-gradient(ellipse_at_top,#0b6b33_0%,#034e22_45%,#01240f_100%)] font-body text-white">
      <style>{CSS}</style>
      <canvas ref={confettiRef} className="pointer-events-none fixed inset-0 z-[2]" aria-hidden="true" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(rgba(255,255,255,0.35)_1px,transparent_1px)] [background-size:26px_26px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />

      <div className="relative z-[1] mx-auto flex min-h-full max-w-2xl flex-col items-center justify-center px-5 py-10 text-center">
        <Champagne />

        <span className="sp-rise mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-[12px] font-semibold text-green-100 ring-1 ring-white/20" style={{ animationDelay: '0.5s' }}>
          {isNew ? <><Check size={13} strokeWidth={3} /> {storeName ? `${storeName} is live` : 'Your store is live'}</> : <><Check size={13} strokeWidth={3} /> Signed in safely</>}
        </span>

        <h1 id="sp-welcome-title" className="sp-rise mt-5 font-display text-[34px] font-extrabold leading-[1.05] tracking-tight sm:text-[52px]" style={{ animationDelay: '0.7s' }}>
          <span className="inline-flex items-center gap-2.5"><Crown className="h-8 w-8 text-amber-300 sm:h-11 sm:w-11" strokeWidth={1.8} /> Your Highness,</span>
        </h1>

        {isNew ? (
          <>
            <p className="sp-rise mt-4 max-w-xl font-display text-[20px] font-bold leading-snug text-green-50 sm:text-[26px]" style={{ animationDelay: '0.9s' }}>
              You&apos;re welcome to the best ever Business Growth &amp; Managing Software.
            </p>
            <p className="sp-rise mt-4 max-w-lg text-[15px] leading-relaxed text-green-100/90 sm:text-[16px]" style={{ animationDelay: '1.1s' }}>
              We hope to satisfy all the needs you may ever have, and for the ones we can&apos;t, please reach out to us through the Support tab and we&apos;d always be at your service.
            </p>
            {storeLink && (
              <p className="sp-rise mt-5 max-w-full truncate rounded-full bg-black/20 px-4 py-2 text-[13px] text-green-100 ring-1 ring-white/10" style={{ animationDelay: '1.25s' }}>
                Your store: <span className="font-semibold text-white">{storeLink}</span>
              </p>
            )}
          </>
        ) : (
          <>
            <p className="sp-rise mt-4 max-w-xl font-display text-[20px] font-bold leading-snug text-green-50 sm:text-[26px]" style={{ animationDelay: '0.9s' }}>
              Welcome back to the best ever Business Growth &amp; Managing Software.
            </p>
            <p className="sp-rise mt-4 max-w-lg text-[15px] leading-relaxed text-green-100/90 sm:text-[16px]" style={{ animationDelay: '1.1s' }}>
              Thank you for confirming it&apos;s you. Your store is right where you left it, and if you need anything, the Support tab is always open.
            </p>
          </>
        )}

        <button ref={btnRef} type="button" onClick={onContinue}
          className="sp-rise group mt-8 inline-flex h-14 items-center gap-2 rounded-full bg-white px-8 text-[16px] font-semibold text-forest shadow-2xl shadow-black/30 transition hover:bg-green-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/60"
          style={{ animationDelay: '1.35s' }}>
          Go To Dashboard <ArrowRight size={18} className="transition group-hover:translate-x-1" />
        </button>
      </div>
    </div>,
    document.body,
  )
}
