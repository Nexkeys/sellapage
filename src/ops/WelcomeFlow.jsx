// src/ops/WelcomeFlow.jsx
//
// The first time someone opens Sellapage Ops, they are welcomed in the style a
// super admin picked when inviting them (utils/opsAccess.js WELCOME_STYLES):
//   ceo         a ship sailing on still water at dusk and the CEO message,
//               then a 10-second scene: a door opens, someone walks in, party
//   leadership  a sunrise over a summit with a flag, and a grand welcome
//   team        Sella waving, a warm welcome
// Every style then hands over to Sella's tour of their tabs. Later sign-ins
// get WelcomeBack instead (below). All drawn in SVG and CSS: no emoji, no
// images, and "reduce motion" gets still scenes with the same words.
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRight, X, Clock } from 'lucide-react'
import useConfetti from '../components/dashboard/ui/useConfetti'
import SellaBot from './SellaBot'
import { opsTab } from '../utils/opsAccess'

const GOLD = ['#facc15', '#fde68a', '#ffffff', '#22c55e', '#86efac', '#f97316', '#ec4899', '#60a5fa']
// Focus the main button without scrolling it into view (that would slide the
// message over the scene on phones).
const focusQuietly = (el) => el?.focus({ preventScroll: true })
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const CSS = `
@keyframes wf-sail { from { transform: translateX(-260px) } to { transform: translateX(1460px) } }
/* The ship drifts across the open water beside the message (below it on
   phones), fading in and out at the ends so it never sails behind the card. */
@keyframes wf-cruise { 0% { transform: translateX(580px); opacity: 0 } 7%,93% { opacity: 1 } 100% { transform: translateX(920px); opacity: 0 } }
@keyframes wf-cruise-sm { 0% { transform: translateX(300px); opacity: 0 } 7%,93% { opacity: 1 } 100% { transform: translateX(720px); opacity: 0 } }
.wf-ship { animation: wf-cruise 46s linear -4s infinite }
@media (max-width: 639px) { .wf-ship { animation: wf-cruise-sm 40s linear -4s infinite } }
@keyframes wf-bob { 0%,100% { transform: translateY(0) rotate(-1.2deg) } 50% { transform: translateY(5px) rotate(1.2deg) } }
@keyframes wf-ripple { from { transform: translateX(0) } to { transform: translateX(-160px) } }
@keyframes wf-flag { 0%,100% { transform: skewY(0deg) } 50% { transform: skewY(-8deg) } }
@keyframes wf-shimmer { 0%,100% { opacity: .35 } 50% { opacity: .8 } }
@keyframes wf-birds { from { transform: translateX(-80px) } to { transform: translateX(1300px) } }
@keyframes wf-rise { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: translateY(0) } }
@keyframes wf-door { 0%,8% { transform: rotateY(0deg) } 26%,100% { transform: rotateY(-104deg) } }
@keyframes wf-light { 0%,10% { opacity: 0 } 30%,100% { opacity: 1 } }
@keyframes wf-walk { 0%,24% { transform: translate(-50%, 0) scale(.38); opacity: 0 } 30% { opacity: 1 } 52%,100% { transform: translate(-50%, 8%) scale(1); opacity: 1 } }
@keyframes wf-step { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-4px) } }
@keyframes wf-balloon { from { transform: translateY(0) } to { transform: translateY(-120vh) } }
@keyframes wf-pop { 0%,48% { opacity: 0; transform: scale(.6) } 56% { opacity: 1; transform: scale(1.08) } 62%,100% { opacity: 1; transform: scale(1) } }
@keyframes wf-bar { from { transform: scaleX(0) } to { transform: scaleX(1) } }
@keyframes wf-sun { from { transform: translateY(70px) } to { transform: translateY(0) } }
.wf-rise { opacity: 0; animation: wf-rise .9s ease-out forwards }
@media (prefers-reduced-motion: reduce) {
  .wf-anim, .wf-anim * { animation: none !important }
  .wf-rise { opacity: 1; animation: none }
}
`

function Confetti({ on }) {
  const ref = useRef(null)
  useConfetti(ref, on && !reduced(), GOLD)
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-[3]" aria-hidden="true" />
}

// ── CEO: the ship ───────────────────────────────────────────────────────────
function ShipScene() {
  return (
    // Phones: the scene fills the top of the screen and the message sits below
    // it, so the ship is never hidden behind the card.
    <div className="fixed inset-x-0 top-0 h-[44vh] sm:inset-0 sm:h-auto">
    <svg viewBox="0 0 1200 600" preserveAspectRatio="xMidYMax slice" className="wf-anim absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="wf-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#02170f" />
          <stop offset="0.45" stopColor="#0b4a33" />
          <stop offset="0.78" stopColor="#c98a3e" />
          <stop offset="1" stopColor="#f6c879" />
        </linearGradient>
        <linearGradient id="wf-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0d3f2d" />
          <stop offset="1" stopColor="#01140c" />
        </linearGradient>
        <radialGradient id="wf-sunglow">
          <stop offset="0" stopColor="#ffe9a8" stopOpacity="0.95" />
          <stop offset="0.5" stopColor="#f6c879" stopOpacity="0.35" />
          <stop offset="1" stopColor="#f6c879" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="wf-sail" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff7e6" />
          <stop offset="1" stopColor="#e9dcc0" />
        </linearGradient>
      </defs>
      <rect width="1200" height="380" fill="url(#wf-sky)" />
      {Array.from({ length: 26 }).map((_, i) => <circle key={i} cx={(i * 97) % 1200} cy={20 + ((i * 53) % 160)} r={i % 3 ? 1.1 : 1.7} fill="#fff" opacity={0.35 + (i % 4) * 0.12} />)}
      <circle cx="600" cy="372" r="210" fill="url(#wf-sunglow)" />
      <circle cx="600" cy="372" r="62" fill="#ffd98a" />
      <path d="M0 372 Q 150 330 300 360 T 620 352 T 900 362 T 1200 350 L1200 380 L0 380 Z" fill="#0a3324" opacity=".9" />
      <rect y="372" width="1200" height="228" fill="url(#wf-sea)" />
      {/* sun's path on the water */}
      {Array.from({ length: 9 }).map((_, i) => (
        <rect key={i} x={560 + ((i * 17) % 60)} y={385 + i * 22} width={80 - i * 6} height="3" rx="1.5" fill="#f6c879" style={{ animation: `wf-shimmer ${2 + (i % 3)}s ease-in-out ${i * 0.2}s infinite` }} />
      ))}
      {/* still-water ripples, drifting slowly */}
      <g style={{ animation: 'wf-ripple 9s linear infinite' }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <path key={i} d={`M-160 ${410 + i * 24} ${Array.from({ length: 16 }).map((__, k) => `q 40 ${k % 2 ? 4 : -4} 80 0`).join(' ')}`} fill="none" stroke="#7fd6aa" strokeOpacity={0.14 + (i % 3) * 0.05} strokeWidth="1.4" />
        ))}
      </g>
      {/* birds */}
      <g style={{ animation: 'wf-birds 40s linear infinite' }}>
        <path d="M100 150 q8 -8 16 0 q8 -8 16 0 M150 120 q6 -6 12 0 q6 -6 12 0" fill="none" stroke="#02170f" strokeWidth="2" strokeLinecap="round" />
      </g>
      {/* the ship, sailing slowly across */}
      <g className="wf-ship">
        <g style={{ animation: 'wf-bob 4s ease-in-out infinite', transformOrigin: '90px 372px' }}>
          <path d="M20 352 L160 352 L140 382 L40 382 Z" fill="#06291c" />
          <rect x="46" y="342" width="60" height="12" rx="3" fill="#0b4a33" />
          {[56, 72, 88].map((x) => <rect key={x} x={x} y="345" width="8" height="5" rx="1.5" fill="#ffd98a" />)}
          <line x1="88" y1="352" x2="88" y2="232" stroke="#06291c" strokeWidth="4" />
          <path d="M92 240 L92 340 L150 338 Z" fill="url(#wf-sail)" />
          <path d="M84 250 L84 340 L36 336 Z" fill="url(#wf-sail)" opacity=".92" />
          <g style={{ animation: 'wf-flag 1.6s ease-in-out infinite', transformOrigin: '90px 232px' }}>
            <path d="M90 232 L124 238 L90 246 Z" fill="#16a34a" />
          </g>
          <text x="104" y="243" fontSize="8" fontWeight="800" fill="#fff" fontFamily="system-ui">S</text>
        </g>
        {/* reflection */}
        <g opacity=".22" transform="translate(0 760) scale(1 -1)">
          <path d="M20 352 L160 352 L140 382 L40 382 Z" fill="#7fd6aa" />
          <path d="M92 240 L92 340 L150 338 Z" fill="#f6c879" />
          <path d="M84 250 L84 340 L36 336 Z" fill="#f6c879" />
        </g>
      </g>
    </svg>
    </div>
  )
}

const CEO_LINES = [
  "It's finally glad to have you onboard to steer this ship to success.",
  "We've been waiting for a Captain, and you've decided to join us.",
  "On behalf of I, Sella, and the rest of the current team, we'll do our best to make sure that every good aim towards the growth of this company is achieved.",
  'Once again, thank you, Your Highness.',
  "If you ever need anything, just holla our Founder, or holla me from the Guide's tab.",
]

function CeoMessage({ me, onNext }) {
  return (
    <div className="relative z-[2] flex min-h-full items-end justify-center px-4 pb-8 pt-[36vh] sm:items-center sm:justify-start sm:py-16 sm:pl-[6vw]">
      <div className="w-full max-w-xl rounded-[30px] bg-black/45 p-6 text-white shadow-2xl ring-1 ring-white/10 backdrop-blur-md sm:p-9">
        <div className="flex items-center gap-3">
          <SellaBot size={46} />
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-amber-200/90">A word from Sella and the team</p>
        </div>
        <h1 className="wf-rise mt-5 font-display text-[30px] font-extrabold leading-[1.05] tracking-tight sm:text-[44px]" style={{ animationDelay: '0.3s' }}>
          Our Honourable CEO{me?.name ? <span className="block text-amber-200">{me.name}</span> : null}
        </h1>
        <div className="mt-5 space-y-3 text-[15px] leading-relaxed text-green-50/95 sm:text-[16.5px]">
          {CEO_LINES.map((l, i) => <p key={i} className="wf-rise" style={{ animationDelay: `${1 + i * 0.9}s` }}>{l}</p>)}
        </div>
        <p className="wf-rise mt-6 font-display text-[24px] font-extrabold italic text-amber-200 sm:text-[30px]" style={{ animationDelay: `${1.4 + CEO_LINES.length * 0.9}s` }}>
          Disfruta tu estancia, hermosa.
          <span className="mt-1 block font-body text-[12.5px] font-normal not-italic text-green-100/70">Enjoy your stay, beautiful.</span>
        </p>
        <div className="wf-rise mt-7 flex justify-end" style={{ animationDelay: `${1.8 + CEO_LINES.length * 0.9}s` }}>
          <button type="button" onClick={onNext} ref={focusQuietly} className="inline-flex h-12 items-center gap-2 rounded-full bg-amber-300 px-7 text-[15px] font-bold text-[#02170f] shadow-lg shadow-black/30 transition hover:bg-amber-200">
            Next <ArrowRight size={17} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── CEO, part two: through the door (10 seconds) ────────────────────────────
function DoorParty({ me, onDone }) {
  const [party, setParty] = useState(false)
  const [canSkip, setCanSkip] = useState(false)
  useEffect(() => {
    const p = setTimeout(() => setParty(true), 4600)
    const s = setTimeout(() => setCanSkip(true), 4000)
    const d = setTimeout(onDone, 10000)
    return () => { clearTimeout(p); clearTimeout(s); clearTimeout(d) }
  }, [onDone])
  const first = (me?.name || '').split(' ')[0]
  return (
    <div className="wf-anim fixed inset-0 overflow-hidden bg-[radial-gradient(ellipse_at_center,#14532d_0%,#052e1b_55%,#01140c_100%)]">
      <Confetti on={party} />
      {/* the doorway */}
      <div className="absolute left-1/2 top-[14%] h-[min(60vh,460px,92vw)] w-[min(38vh,290px,58vw)] -translate-x-1/2 sm:left-1/2" style={{ perspective: '1200px' }}>
        <div className="absolute -inset-3 rounded-t-[48%] border-[10px] border-[#3b2a1a] bg-[#2a1d12] shadow-2xl" />
        <div className="absolute inset-0 overflow-hidden rounded-t-[46%] bg-[radial-gradient(ellipse_at_50%_70%,#fff8e1_0%,#ffd98a_45%,#f59e0b_100%)]" style={{ animation: 'wf-light 10s ease-out forwards' }}>
          {/* someone walking in */}
          <svg viewBox="0 0 100 200" className="absolute bottom-0 left-1/2 h-[78%]" style={{ animation: 'wf-walk 10s ease-out forwards', transformOrigin: '50% 100%' }} aria-hidden="true">
            <g style={{ animation: 'wf-step .7s ease-in-out infinite' }}>
              <circle cx="50" cy="28" r="16" fill="#1f2937" />
              <path d="M30 60 Q50 46 70 60 L76 120 L24 120 Z" fill="#1f2937" />
              <path d="M34 120 L38 190 L48 190 L50 128 L52 190 L62 190 L66 120 Z" fill="#111827" />
              <path d="M30 64 L18 104 M70 64 L84 98" stroke="#1f2937" strokeWidth="9" strokeLinecap="round" />
            </g>
          </svg>
        </div>
        <div className="absolute inset-0 origin-left rounded-t-[46%] bg-[linear-gradient(135deg,#6b4423,#4a2f18)] shadow-[inset_0_0_0_6px_#3b2a1a]" style={{ animation: 'wf-door 10s ease-in-out forwards', transformStyle: 'preserve-3d' }}>
          <div className="absolute left-[12%] right-[12%] top-[12%] h-[30%] rounded-t-[40%] border-4 border-[#3b2a1a]/70" />
          <div className="absolute bottom-[14%] left-[12%] right-[12%] h-[32%] rounded-lg border-4 border-[#3b2a1a]/70" />
          <span className="absolute right-[10%] top-1/2 h-4 w-4 rounded-full bg-amber-300 shadow" />
        </div>
      </div>
      {/* balloons */}
      {party && Array.from({ length: 12 }).map((_, i) => (
        <svg key={i} viewBox="0 0 40 90" className="absolute bottom-[-110px] w-10" style={{ left: `${(i * 8.3 + 3) % 96}%`, animation: `wf-balloon ${6 + (i % 4)}s ease-in ${(i % 6) * 0.25}s forwards` }} aria-hidden="true">
          <ellipse cx="20" cy="22" rx="16" ry="20" fill={GOLD[i % GOLD.length]} />
          <path d="M20 42 q-4 14 2 26 q4 10 -2 20" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="1" />
        </svg>
      ))}
      <div className="absolute inset-x-0 bottom-[12%] z-[4] px-4 text-center text-white" style={{ animation: 'wf-pop 10s ease-out forwards' }}>
        <p className="font-display text-[34px] font-extrabold leading-tight tracking-tight sm:text-[52px]">Welcome aboard, Captain {first}</p>
        <p className="mt-2 text-[15px] text-green-100/90">The whole team is glad you are here.</p>
      </div>
      <div className="absolute inset-x-0 bottom-0 z-[4] h-1.5 bg-white/10"><div className="h-full origin-left bg-amber-300" style={{ animation: 'wf-bar 10s linear forwards' }} /></div>
      {canSkip && <button type="button" onClick={onDone} className="absolute right-4 top-4 z-[5] rounded-full bg-white/10 px-4 py-2 text-[12.5px] font-semibold text-white ring-1 ring-white/20 hover:bg-white/20">Skip</button>}
    </div>
  )
}

// ── Leadership: sunrise over a summit ───────────────────────────────────────
function LeadershipScene({ me, onNext }) {
  const first = (me?.name || '').split(' ')[0]
  return (
    <div className="wf-anim fixed inset-0 overflow-y-auto bg-[#0b2a1d]">
      <Confetti on />
      {/* The summit sits right of the message on wide screens and above it on phones. */}
      <div className="fixed inset-x-0 top-0 h-[44vh] bg-[#0b2a1d] sm:inset-0 sm:h-auto">
      <svg viewBox="0 0 1200 600" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id="wf-dawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0b2a1d" /><stop offset=".6" stopColor="#14532d" /><stop offset="1" stopColor="#f59e0b" /></linearGradient>
        </defs>
        <rect width="1200" height="600" fill="url(#wf-dawn)" />
        <g style={{ animation: 'wf-sun 3s ease-out forwards' }}><circle cx="900" cy="430" r="120" fill="#fde68a" opacity=".9" /></g>
        <path d="M0 600 L200 420 L420 500 L780 300 L940 440 L1080 380 L1200 470 L1200 600 Z" fill="#052e1b" />
        <path d="M680 600 L780 300 L900 600 Z" fill="#0a3d27" />
        <line x1="780" y1="300" x2="780" y2="226" stroke="#e5e7eb" strokeWidth="4" />
        <g style={{ animation: 'wf-flag 1.6s ease-in-out infinite', transformOrigin: '780px 226px' }}><path d="M782 228 L850 242 L782 258 Z" fill="#22c55e" /></g>
        <text x="800" y="248" fontSize="14" fontWeight="800" fill="#fff" fontFamily="system-ui">S</text>
      </svg>
      </div>
      <div className="relative z-[2] flex min-h-full items-end justify-center px-4 pb-10 pt-[36vh] sm:items-center sm:justify-start sm:py-16 sm:pl-[6vw]">
        <div className="max-w-xl rounded-[30px] bg-black/45 p-7 text-white ring-1 ring-white/10 backdrop-blur-md sm:p-9">
          <p className="wf-rise text-[11px] font-bold uppercase tracking-[0.24em] text-amber-200" style={{ animationDelay: '.3s' }}>{me?.title || 'Leadership'}</p>
          <h1 className="wf-rise mt-3 font-display text-[32px] font-extrabold leading-tight sm:text-[44px]" style={{ animationDelay: '.6s' }}>Welcome to the summit, {first}</h1>
          <p className="wf-rise mt-4 text-[15.5px] leading-relaxed text-green-50/90" style={{ animationDelay: '1.2s' }}>You&apos;re now one of the people steering Sellapage. The team is glad to have your eyes, your judgement and your energy on this climb.</p>
          <p className="wf-rise mt-3 text-[15.5px] leading-relaxed text-green-50/90" style={{ animationDelay: '1.8s' }}>I&apos;m Sella. I&apos;ll show you everything you can open, and I&apos;m one tap away whenever you need me.</p>
          <div className="wf-rise mt-7 flex justify-end" style={{ animationDelay: '2.4s' }}>
            <button type="button" onClick={onNext} ref={focusQuietly} className="inline-flex h-12 items-center gap-2 rounded-full bg-amber-300 px-7 text-[15px] font-bold text-[#052e1b] hover:bg-amber-200">Show me around <ArrowRight size={17} /></button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Team: Sella says hello ──────────────────────────────────────────────────
function TeamScene({ me, onNext }) {
  const first = (me?.name || '').split(' ')[0]
  return (
    <div className="wf-anim fixed inset-0 overflow-y-auto bg-[radial-gradient(ellipse_at_top,#e6f6ed_0%,#f6faf8_60%)]">
      <Confetti on />
      <div className="relative z-[2] flex min-h-full flex-col items-center justify-center px-5 py-12 text-center">
        <div className="wf-rise" style={{ animationDelay: '.2s' }}><SellaBot size={150} /></div>
        <h1 className="wf-rise mt-4 font-display text-[32px] font-extrabold leading-tight tracking-tight text-dash-ink sm:text-[44px]" style={{ animationDelay: '.6s' }}>Welcome to the team, {first}!</h1>
        <p className="wf-rise mt-3 max-w-lg text-[15.5px] leading-relaxed text-slate-600" style={{ animationDelay: '1s' }}>
          {me?.title ? <>You&apos;re joining as <strong className="text-dash-ink">{me.title}</strong>. </> : null}
          I&apos;m Sella. Let me show you the tabs you can open and what you can do in each. It takes a minute.
        </p>
        <button type="button" onClick={onNext} ref={focusQuietly} className="wf-rise mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-forest-600 px-7 text-[15px] font-semibold text-white shadow-lg shadow-forest/20 hover:bg-forest" style={{ animationDelay: '1.4s' }}>
          Show me around <ArrowRight size={17} />
        </button>
      </div>
    </div>
  )
}

export default function WelcomeFlow({ me, onDone }) {
  const style = me?.welcomeStyle || 'team'
  const [stage, setStage] = useState('one')
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])
  return createPortal(
    <div className="fixed inset-0 z-[150] font-body" role="dialog" aria-modal="true" aria-label="Welcome to Sellapage Ops">
      <style>{CSS}</style>
      {style === 'ceo' && stage === 'one' && (
        <div className="fixed inset-0 overflow-y-auto bg-[#02170f]">
          <ShipScene />
          <CeoMessage me={me} onNext={() => setStage('door')} />
        </div>
      )}
      {style === 'ceo' && stage === 'door' && <DoorParty me={me} onDone={onDone} />}
      {style === 'leadership' && <LeadershipScene me={me} onNext={onDone} />}
      {style !== 'ceo' && style !== 'leadership' && <TeamScene me={me} onNext={onDone} />}
    </div>,
    document.body,
  )
}

/** "Welcome back" on later sign-ins, with what happened while they were away. */
export function WelcomeBack({ me, away, onOpenTab, onClose }) {
  const first = (me?.name || '').split(' ')[0]
  const hour = new Date().getHours()
  const part = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  useEffect(() => { const t = setTimeout(onClose, 14000); return () => clearTimeout(t) }, [onClose])
  const total = away?.total || 0
  return createPortal(
    <div className="fixed left-1/2 top-4 z-[120] w-[min(560px,calc(100vw-24px))] -translate-x-1/2 animate-in fade-in slide-in-from-top-4 duration-500" role="status">
      <div className="overflow-hidden rounded-3xl bg-white shadow-[0_24px_60px_-20px_rgba(3,78,34,0.45)] ring-1 ring-forest-100">
        <div className="flex items-center gap-3 bg-gradient-to-r from-[#034e22] to-[#0b6b35] px-5 py-3.5 text-white">
          <SellaBot size={40} />
          <div className="min-w-0 flex-1">
            <p className="font-display text-[17px] font-extrabold">Welcome back, {first}</p>
            <p className="text-[12px] text-green-100/85">{part}. {total ? `${total} thing${total === 1 ? '' : 's'} happened while you were away.` : 'All quiet while you were away.'}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-green-100 hover:bg-white/10" aria-label="Dismiss"><X size={16} /></button>
        </div>
        {total > 0 && (
          <div className="px-4 py-3">
            <div className="flex flex-wrap gap-1.5">
              {away.items.map((it) => (
                <button key={`${it.tab}-${it.label}`} type="button" disabled={!it.tab} onClick={() => { if (it.tab) { onOpenTab(it.tab); onClose() } }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-forest-50 px-3 py-1.5 text-[12.5px] font-semibold text-forest-700 ring-1 ring-forest-100 transition hover:bg-forest-100 disabled:cursor-default">
                  {it.label}{it.tab ? <ArrowRight size={12} /> : null}
                </button>
              ))}
            </div>
            {away.team?.length > 0 && (
              <ul className="mt-3 space-y-1.5 border-t border-dash-line pt-3">
                {away.team.slice(0, 3).map((t) => (
                  <li key={`${t.at}${t.summary}`} className="flex items-start gap-2 text-[12px] text-slate-600">
                    <Clock size={12} className="mt-0.5 flex-shrink-0 text-slate-400" />
                    <span className="min-w-0"><span className="font-semibold text-dash-ink">{t.name}</span> {t.summary}{t.tab && opsTab(t.tab) ? <span className="text-slate-400"> in {opsTab(t.tab).label}</span> : null}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
