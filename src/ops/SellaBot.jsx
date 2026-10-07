// src/ops/SellaBot.jsx
//
// Sella as a little robot for the Ops console: drawn in SVG in her logo's
// colours (deep green, mint, the headset from public/sella), floating, blinking
// and waving. `wave` makes the right arm wave; `size` is the width in px.
// Respects "reduce motion": she stays still and still smiles.
import { useId } from 'react'

const CSS = `
@keyframes sb-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
@keyframes sb-shadow { 0%,100% { transform: scaleX(1); opacity: .28 } 50% { transform: scaleX(.82); opacity: .16 } }
@keyframes sb-wave { 0%,100% { transform: rotate(0deg) } 15% { transform: rotate(-28deg) } 30% { transform: rotate(6deg) } 45% { transform: rotate(-24deg) } 60% { transform: rotate(4deg) } 75% { transform: rotate(-12deg) } }
@keyframes sb-blink { 0%,92%,100% { transform: scaleY(1) } 95% { transform: scaleY(.1) } }
@keyframes sb-glow { 0%,100% { opacity: .55 } 50% { opacity: 1 } }
.sb-float { animation: sb-float 3.2s ease-in-out infinite }
.sb-shadow { transform-box: fill-box; transform-origin: center; animation: sb-shadow 3.2s ease-in-out infinite }
.sb-wave { transform-box: view-box; transform-origin: 92px 78px; animation: sb-wave 1.8s ease-in-out infinite }
.sb-blink { transform-box: fill-box; transform-origin: center; animation: sb-blink 4.5s ease-in-out infinite }
.sb-glow { animation: sb-glow 1.6s ease-in-out infinite }
@media (prefers-reduced-motion: reduce) { .sb-float, .sb-shadow, .sb-wave, .sb-blink, .sb-glow { animation: none } }
`

export default function SellaBot({ size = 72, wave = true, className = '' }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 120 140" width={size} height={(size * 140) / 120} className={className} aria-hidden="true">
      <style>{CSS}</style>
      <defs>
        <linearGradient id={`b${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#17956a" />
          <stop offset="1" stopColor="#0b5e43" />
        </linearGradient>
        <linearGradient id={`v${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#063626" />
          <stop offset="1" stopColor="#0a4a35" />
        </linearGradient>
        <radialGradient id={`g${id}`}>
          <stop offset="0" stopColor="#b9f7d6" />
          <stop offset="1" stopColor="#5ee5a0" />
        </radialGradient>
      </defs>

      <ellipse className="sb-shadow" cx="60" cy="133" rx="26" ry="4.5" fill="#0b5e43" />

      <g className="sb-float">
        {/* antenna */}
        <line x1="60" y1="20" x2="60" y2="9" stroke="#0b5e43" strokeWidth="3" strokeLinecap="round" />
        <circle className="sb-glow" cx="60" cy="7" r="5" fill={`url(#g${id})`} />

        {/* left arm (resting) */}
        <path d="M30 80 C 20 88, 18 98, 22 106" fill="none" stroke="#0b5e43" strokeWidth="7" strokeLinecap="round" />
        <circle cx="22" cy="107" r="5.5" fill="#5ee5a0" />

        {/* right arm (waving) */}
        <g className={wave ? 'sb-wave' : ''}>
          <path d="M90 80 C 100 72, 104 62, 102 52" fill="none" stroke="#0b5e43" strokeWidth="7" strokeLinecap="round" />
          <circle cx="102" cy="49" r="6" fill="#5ee5a0" />
          <path d="M98 45 l-2 -5 M102 43 l0 -6 M106 45 l2 -5" stroke="#5ee5a0" strokeWidth="2.4" strokeLinecap="round" />
        </g>

        {/* body */}
        <rect x="32" y="70" width="56" height="50" rx="20" fill={`url(#b${id})`} />
        <rect x="46" y="84" width="28" height="20" rx="8" fill="#0a4a35" />
        <text x="60" y="99" textAnchor="middle" fontFamily="'Bricolage Grotesque', system-ui, sans-serif" fontWeight="800" fontSize="14" fill="#5ee5a0">S</text>

        {/* head */}
        <rect x="24" y="20" width="72" height="56" rx="24" fill={`url(#b${id})`} />
        <rect x="32" y="30" width="56" height="36" rx="16" fill={`url(#v${id})`} />
        {/* smiling eyes (blink) and smile, like the logo */}
        <g className="sb-blink">
          <path d="M44 47 q5 -6 10 0" fill="none" stroke="#5ee5a0" strokeWidth="3.4" strokeLinecap="round" />
          <path d="M66 47 q5 -6 10 0" fill="none" stroke="#5ee5a0" strokeWidth="3.4" strokeLinecap="round" />
        </g>
        <path d="M52 56 q8 6 16 0" fill="none" stroke="#5ee5a0" strokeWidth="2.6" strokeLinecap="round" />
        {/* headset */}
        <path d="M26 44 C 26 18, 94 18, 94 44" fill="none" stroke="#0a4a35" strokeWidth="4" strokeLinecap="round" />
        <rect x="16" y="38" width="12" height="20" rx="6" fill="#5ee5a0" />
        <rect x="92" y="38" width="12" height="20" rx="6" fill="#0a4a35" />
        <path d="M22 56 C 22 66, 30 70, 40 68" fill="none" stroke="#0a4a35" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="41" cy="68" r="3" fill="#5ee5a0" />
      </g>
    </svg>
  )
}
