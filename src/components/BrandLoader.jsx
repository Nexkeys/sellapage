// src/components/BrandLoader.jsx
//
// The full-screen "please wait" for Sellapage: a shopping bag that fills up
// with green while a short line underneath says what is happening, changing
// every couple of seconds so a slow connection feels like progress rather
// than a frozen screen. Replaced the three pulsing bars (RouteFallback) and
// the plain spinner (ProtectedRoute) on 2026-09-26.
//
// Pure SVG and CSS: no images to download before the loader itself can show,
// which is the whole point of a loader. With reduced motion switched on, the
// bag is shown full and still, and only the words change.
import { useEffect, useState } from 'react'

const DEFAULT_LINES = [
  'Opening your shop doors...',
  'Dusting the shelves...',
  'Counting today’s visitors...',
  'Warming up the till...',
  'Almost there...',
]

export default function BrandLoader({ lines = DEFAULT_LINES, title, fullScreen = true, className = '' }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (lines.length < 2) return undefined
    const t = setInterval(() => setI((n) => (n + 1) % lines.length), 2000)
    return () => clearInterval(t)
  }, [lines.length])

  return (
    <div
      role="status"
      aria-live="polite"
      className={`${fullScreen ? 'min-h-screen' : 'py-16'} flex w-full flex-col items-center justify-center bg-[#fcfcfd] px-6 ${className}`}
    >
      <style>{`
        @keyframes bl-fill { 0% { transform: translateY(46px) } 55% { transform: translateY(8px) } 100% { transform: translateY(46px) } }
        @keyframes bl-wave { from { transform: translateX(0) } to { transform: translateX(-40px) } }
        @keyframes bl-bob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-5px) } }
        @keyframes bl-spark { 0%,100% { opacity: 0; transform: scale(.4) } 50% { opacity: 1; transform: scale(1) } }
        @keyframes bl-line { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: translateY(0) } }
        .bl-bag { animation: bl-bob 2.4s ease-in-out infinite }
        .bl-fill { animation: bl-fill 3.2s ease-in-out infinite }
        .bl-wave { animation: bl-wave 1.2s linear infinite }
        .bl-spark { animation: bl-spark 1.8s ease-in-out infinite; transform-origin: center; transform-box: fill-box }
        .bl-line { animation: bl-line .35s ease-out }
        @keyframes bl-bar { 0% { transform: translateX(-110%) } 100% { transform: translateX(330%) } }
        .bl-bar { animation: bl-bar 1.4s ease-in-out infinite }
        @media (prefers-reduced-motion: reduce) {
          .bl-bag, .bl-wave, .bl-spark, .bl-bar { animation: none }
          .bl-fill { animation: none; transform: translateY(8px) }
        }
      `}</style>

      <svg width="120" height="130" viewBox="0 0 96 104" aria-hidden="true" className="bl-bag">
        <defs>
          <clipPath id="bl-clip">
            <path d="M18 34h60l-4 58a8 8 0 0 1-8 7H30a8 8 0 0 1-8-7z" />
          </clipPath>
          <linearGradient id="bl-green" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#22c55e" />
            <stop offset="1" stopColor="#034e22" />
          </linearGradient>
        </defs>
        {/* handles */}
        <path d="M34 36V26a14 14 0 0 1 28 0v10" fill="none" stroke="#034e22" strokeWidth="5" strokeLinecap="round" />
        {/* bag body */}
        <path d="M18 34h60l-4 58a8 8 0 0 1-8 7H30a8 8 0 0 1-8-7z" fill="#ecf9f2" />
        {/* rising green, with a moving wave on top */}
        <g clipPath="url(#bl-clip)">
          <g className="bl-fill">
            <g className="bl-wave">
              <path d="M0 40 q10 -6 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 V120 H0z" fill="url(#bl-green)" opacity="0.95" />
            </g>
          </g>
        </g>
        <path d="M18 34h60l-4 58a8 8 0 0 1-8 7H30a8 8 0 0 1-8-7z" fill="none" stroke="#034e22" strokeWidth="3" strokeLinejoin="round" />
        {/* the S */}
        <path d="M56 55c-2-3-5-4-8-4-4 0-7 2-7 5 0 7 16 4 16 12 0 4-4 6-8 6-4 0-7-1-9-4" fill="none" stroke="#034e22" strokeWidth="7" strokeLinecap="round" />
        <path d="M56 55c-2-3-5-4-8-4-4 0-7 2-7 5 0 7 16 4 16 12 0 4-4 6-8 6-4 0-7-1-9-4" fill="none" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
        {/* sparkles */}
        <path className="bl-spark" d="M84 18l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#22c55e" />
        <path className="bl-spark" style={{ animationDelay: '.6s' }} d="M10 22l1.5 3.5 3.5 1.5-3.5 1.5L10 32l-1.5-3.5L5 27l3.5-1.5z" fill="#86efac" />
        <path className="bl-spark" style={{ animationDelay: '1.2s' }} d="M88 70l1.2 2.8 2.8 1.2-2.8 1.2L88 78l-1.2-2.8-2.8-1.2 2.8-1.2z" fill="#facc15" />
      </svg>

      {title && <p className="mt-6 text-base font-semibold text-[#0f172a]">{title}</p>}
      <p key={i} className={`bl-line ${title ? 'mt-1.5' : 'mt-6'} text-sm font-medium text-[#475569]`}>{lines[i]}</p>
      <div className="mt-4 h-1.5 w-44 overflow-hidden rounded-full bg-[#d5f1e1]">
        <div className="bl-bar h-full w-1/3 rounded-full bg-[#16a34a]" />
      </div>
    </div>
  )
}
