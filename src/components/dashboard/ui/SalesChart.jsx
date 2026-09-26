// src/components/dashboard/ui/SalesChart.jsx
//
// The big green area chart on the dashboard home (Total Sales, or Store Views
// on plans without checkout). LAZY LOADED by Overview.jsx, so Recharts is only
// downloaded once the home screen has drawn everything else.
//
// The latest day carries a pinned label, as in the design, so the most recent
// figure is readable without hovering, which a phone cannot do.
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceDot,
} from 'recharts'

const LINE = '#16a34a'
const GRID = '#eef1f4'
const TICK = '#7c8a99'

const shortDay = (key) => {
  const [y, m, d] = String(key).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

const compact = (n) => {
  const v = Number(n) || 0
  if (v >= 1_000_000) return `${+(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${+(v / 1_000).toFixed(v >= 10_000 ? 0 : 1)}K`
  return String(v)
}

function Tip({ active, payload, format }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded-xl border border-dash-line bg-white px-3 py-2 text-center shadow-lg">
      <p className="text-sm font-bold tabular-nums text-dash-ink">{format(p.value)}</p>
      <p className="text-[10px] text-dash-muted">{shortDay(p.date)}</p>
    </div>
  )
}

// Four even steps of a round size (1, 2, 2.5 or 5 times a power of ten), with
// headroom above the busiest day for the pinned label: 0, 50K ... 200K.
function niceTicks(max) {
  const raw = Math.max(1, (max * 1.3) / 4)
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)
  return [0, 1, 2, 3, 4].map((i) => i * step)
}

export default function SalesChart({ data = [], format = (v) => String(v), height = 230 }) {
  const last = data[data.length - 1]
  const ticks = niceTicks(Math.max(0, ...data.map((d) => d.value)))
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 12, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={LINE} stopOpacity={0.2} />
              <stop offset="100%" stopColor={LINE} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis
            dataKey="date"
            tickFormatter={shortDay}
            // Drops labels that would overlap, so a phone shows fewer dates
            // instead of a smudge; the first and last always stay.
            interval="preserveStartEnd"
            minTickGap={14}
            padding={{ left: 6, right: 18 }}
            tick={{ fill: TICK, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            dy={8}
          />
          <YAxis
            tickFormatter={compact}
            tick={{ fill: TICK, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={44}
            allowDecimals={false}
            domain={[0, ticks[4]]}
            ticks={ticks}
          />
          <Tooltip content={<Tip format={format} />} cursor={{ stroke: '#bbf7d0', strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={LINE}
            strokeWidth={2.2}
            fill="url(#salesFill)"
            dot={false}
            activeDot={{ r: 5, fill: LINE, stroke: '#fff', strokeWidth: 2 }}
            isAnimationActive={false}
          />
          {last && (
            <ReferenceDot
              x={last.date}
              y={last.value}
              r={4.5}
              fill={LINE}
              stroke="#fff"
              strokeWidth={2}
              label={({ viewBox }) => {
                if (!viewBox) return null
                const text = format(last.value)
                const w = Math.max(64, text.length * 7.4 + 18)
                // The dot sits at the right edge, so the box hangs to its left
                // instead of centring and running off the chart.
                const cx = viewBox.x + (viewBox.width || 0) / 2
                const cy = viewBox.y + (viewBox.height || 0) / 2
                const x = cx - w + 16
                return (
                  <g>
                    <rect x={x} y={cy - 48} width={w} height={36} rx={8} fill="#fff" stroke={GRID} />
                    <text x={x + w / 2} y={cy - 32} textAnchor="middle" fontSize="12" fontWeight="700" fill="#0f172a">{text}</text>
                    <text x={x + w / 2} y={cy - 19} textAnchor="middle" fontSize="9.5" fill={TICK}>{shortDay(last.date)}</text>
                  </g>
                )
              }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
