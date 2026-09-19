// src/components/dashboard/DailyChart.jsx
//
// The "Last 14 days" chart in the Analytics tab, drawn with Recharts.
//
// WHY A LIBRARY NOW
// The previous version drew bars as CSS boxes whose height was a percentage of
// a column with no fixed height, so every bar computed to zero pixels and only
// the numbers above them showed. A chart library gives correct geometry, axes,
// gridlines and a tooltip without hand-rolled maths.
//
// WHY THE DAYS ARE BUILT HERE
// The old chart took "the last 14 recorded days", which are only the days that
// had any activity. A quiet store's "last 14 days" could span a month with the
// empty days silently dropped, so the axis read 17, 9, 22, 24... This builds
// the real last 14 calendar days ending today in Lagos, with zero for a day
// that had no visits, so the title is true.
//
// LAZY LOADED. AnalyticsTab imports this with React.lazy, so Recharts is only
// downloaded when a vendor opens Analytics, not by everyone who loads the
// dashboard.
//
// COLOURS were checked with the dataviz palette validator, not chosen by eye:
// #22c55e for ordinary days and #166534 for the best day pass the lightness,
// chroma and colour-blind separation checks on white. #22c55e is below 3:1
// against white, which is allowed only because every value is also readable
// as text: the tooltip, the best-day label, the summary line, and the Day by
// day table under the chart.
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList,
} from 'recharts'
import { BarChart2 } from 'lucide-react'
import { dayLabel, storeDay, emptyDay, lastDays } from '../../utils/analytics'

// Only components are exported from this file, so React fast refresh keeps
// working on it. The date helper lives in utils/analytics.js with the others.
const CHART_DAYS = 14

const BAR = '#22c55e'
const BEST = '#166534'
const GRID = '#f1f5f9'
const AXIS = '#e5e7eb'
const TICK = '#9ca3af'

const fmt = (n) => Number(n || 0).toLocaleString()

/** Value leads, label follows: the reader already knows the measure. */
function ChartTooltip({ active, payload, metricLabel }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="rounded-lg border border-gray-100 bg-white px-3 py-2 shadow-lg">
      <p className="text-sm font-bold tabular-nums text-gray-900">{fmt(point.value)}</p>
      <p className="text-[11px] text-gray-500">
        {metricLabel} · {dayLabel(point.date)}
      </p>
    </div>
  )
}

/**
 * Only the best day carries a number on the chart. A value on every bar is noise.
 *
 * Reads a `best` field set on that one data point, rather than comparing an
 * index: Recharts 3 does not pass `index` to a Bar's label callback, which is
 * how the first version silently drew no label at all.
 */
function BestDayLabel(props) {
  const { x, y, width, value } = props
  if (!value) return null
  return (
    <text
      x={Number(x) + Number(width) / 2}
      y={Number(y) - 6}
      textAnchor="middle"
      fontSize={11}
      fontWeight={700}
      fill="#111827"
    >
      {fmt(value)}
    </text>
  )
}

export default function DailyChart({ days, options, metric, onMetric }) {
  const active = options.find((o) => o.key === metric) || options[0]
  const byDate = new Map((days || []).map((d) => [d.date, d]))

  const data = lastDays(storeDay(), CHART_DAYS).map((key) => ({
    date: key,
    // Day of the month is enough on the axis; the tooltip carries the full date.
    day: String(Number(key.slice(8, 10))),
    value: Number(active.get(byDate.get(key) || emptyDay(key))) || 0,
  }))

  const values = data.map((d) => d.value)
  const max = Math.max(...values, 0)
  const total = values.reduce((a, b) => a + b, 0)
  const bestIdx = values.indexOf(max)
  const metricLabel = active.label
  // Marks the single best day for its on-chart label. The first day wins a
  // tie, matching the summary line and the dark bar.
  if (max > 0) data[bestIdx].best = max

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="font-semibold text-gray-800 text-xs">Last {CHART_DAYS} days</p>
        <p className="text-gray-400 text-[11px] mt-0.5">Tap a measure to switch the chart</p>
        {options.length > 1 && (
          <div className="mt-2.5 -mx-1 overflow-x-auto px-1 pb-1">
            <div className="flex w-max gap-1.5" role="tablist" aria-label="Chart measure">
              {options.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  role="tab"
                  aria-selected={o.key === metric}
                  onClick={() => onMetric(o.key)}
                  className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-colors ${
                    o.key === metric ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {total === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 px-6 gap-2 text-center">
          <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
            <BarChart2 size={18} className="text-gray-300" />
          </div>
          <p className="text-gray-400 text-xs max-w-xs">
            No {metricLabel.toLowerCase()} in the last {CHART_DAYS} days yet.
          </p>
        </div>
      ) : (
        <div className="px-2 pb-4 pt-4 sm:px-4">
          <div
            className="h-56 w-full"
            role="img"
            aria-label={`${metricLabel} per day for the last ${CHART_DAYS} days. ${fmt(total)} in total, best day ${fmt(max)} on ${dayLabel(data[bestIdx].date)}.`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 20, right: 8, bottom: 0, left: -12 }} barCategoryGap="22%">
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis
                  dataKey="day"
                  interval={0}
                  tickLine={false}
                  axisLine={{ stroke: AXIS }}
                  tick={{ fontSize: 10, fill: TICK }}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                  tick={{ fontSize: 10, fill: TICK }}
                  tickFormatter={fmt}
                />
                <Tooltip
                  content={<ChartTooltip metricLabel={metricLabel} />}
                  cursor={{ fill: '#f8fafc' }}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="value"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={24}
                  isAnimationActive={false}
                >
                  {data.map((d, i) => (
                    <Cell key={d.date} fill={i === bestIdx ? BEST : BAR} />
                  ))}
                  <LabelList dataKey="best" content={<BestDayLabel />} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 border-t border-gray-100 px-2 pt-3 text-[11px] text-gray-500">
            <span className="font-bold text-gray-800">{fmt(total)}</span> {metricLabel.toLowerCase()} over{' '}
            {CHART_DAYS} days · best day <span className="font-bold text-gray-800">{fmt(max)}</span> on{' '}
            {dayLabel(data[bestIdx].date)}
          </p>
        </div>
      )}
    </div>
  )
}
