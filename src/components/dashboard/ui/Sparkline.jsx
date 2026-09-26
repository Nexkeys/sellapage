// src/components/dashboard/ui/Sparkline.jsx
//
// The small trend line on the stat cards and product tiles. Plain SVG rather
// than the chart library: these render on the first screen of the dashboard,
// and a few dozen path points do not justify loading Recharts up front.
//
// The curve is a monotone cubic, so it never overshoots below zero or above
// the highest day, which would draw a dip that did not happen.
import { useId } from 'react'

function monotonePath(pts) {
  if (pts.length < 2) return ''
  const n = pts.length
  const dx = []
  const m = []
  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1][0] - pts[i][0])
    m.push((pts[i + 1][1] - pts[i][1]) / (dx[i] || 1))
  }
  const t = [m[0]]
  for (let i = 1; i < n - 1; i++) t.push(m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2)
  t.push(m[n - 2])
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3
    d += ` C${pts[i][0] + h},${pts[i][1] + t[i] * h} ${pts[i + 1][0] - h},${pts[i + 1][1] - t[i + 1] * h} ${pts[i + 1][0]},${pts[i + 1][1]}`
  }
  return d
}

export default function Sparkline({ data = [], color = '#16a34a', width = 110, height = 44, className = '', label }) {
  const id = useId().replace(/:/g, '')
  const values = data.length ? data : [0, 0]
  const max = Math.max(...values)
  const min = Math.min(...values, 0)
  const span = max - min || 1
  const pad = 3
  const pts = values.map((v, i) => [
    pad + (i / Math.max(values.length - 1, 1)) * (width - pad * 2),
    // A flat zero series sits on the baseline instead of the middle.
    height - pad - ((v - min) / span) * (height - pad * 2),
  ])
  const line = monotonePath(pts)
  const area = `${line} L${pts[pts.length - 1][0]},${height} L${pts[0][0]},${height} Z`
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={`sg${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
