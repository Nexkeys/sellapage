// Signups over time for the admin Analytics tab.
//
// Replaces a set of CSS divs whose height was a percentage of a parent with no
// height, so every bar rendered at its 2px minimum and the chart read as flat
// no matter what the numbers were. Recharts is already a dependency (the vendor
// Analytics tab uses it) and this file is lazy loaded, so the admin bundle only
// pays for it when the tab is opened.
//
// Two views off one fetch: by day (last 30 or 90) and by month (last 12).
import { useMemo, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList,
} from 'recharts'
import { BarChart2, Table2 } from 'lucide-react'

// Same validated pair as the vendor chart: the busiest period is the dark step,
// every other bar the light one.
const BAR = '#22c55e'
const BEST = '#166534'
const GRID = '#f1f5f9'
const AXIS = '#e5e7eb'
const TICK = '#9ca3af'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function dayLabel(key) {
  const [y, m, d] = String(key).split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getUTCDay()]
  return `${weekday}, ${d} ${MONTH_NAMES[m - 1]} ${y}`
}

function monthLabel(key) {
  const [y, m] = String(key).split('-').map(Number)
  return `${MONTH_NAMES[m - 1]} ${y}`
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 shadow-lg">
      <p className="text-sm font-black leading-none text-gray-900">{row.value.toLocaleString()}</p>
      <p className="mt-1 text-[10px] font-semibold text-gray-500">
        {row.value === 1 ? 'signup' : 'signups'} · {row.full}
      </p>
    </div>
  )
}

// One direct label, on the busiest bar only. A number over every bar is noise.
function BestLabel(props) {
  const { x, y, width, value } = props
  if (!value) return null
  return (
    <text x={x + width / 2} y={y - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill="#111827">
      {Number(value).toLocaleString()}
    </text>
  )
}

const VIEWS = [
  { key: '30d', label: '30 days' },
  { key: '90d', label: '90 days' },
  { key: '12m', label: '12 months' },
]

export default function SignupsChart({ days = [], months = [], totals = null }) {
  const [view, setView] = useState('30d')
  const [showTable, setShowTable] = useState(false)

  const data = useMemo(() => {
    if (view === '12m') {
      return months.map((m) => ({ key: m.month, tick: monthLabel(m.month).slice(0, 3), full: monthLabel(m.month), value: Number(m.count) || 0 }))
    }
    const span = view === '90d' ? 90 : 30
    return days.slice(-span).map((d) => ({ key: d.date, tick: String(Number(d.date.slice(8, 10))), full: dayLabel(d.date), value: Number(d.count) || 0 }))
  }, [view, days, months])

  const total = data.reduce((n, d) => n + d.value, 0)
  const max = Math.max(...data.map((d) => d.value), 0)
  const bestIndex = max > 0 ? data.findIndex((d) => d.value === max) : -1
  const chartData = data.map((d, i) => (i === bestIndex ? { ...d, best: d.value } : d))
  const periodWord = view === '12m' ? 'month' : 'day'

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-xs">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-900">Signups</h3>
          {totals && (
            <p className="mt-0.5 text-[10px] font-medium text-gray-400">
              {Number(totals.allTime || 0).toLocaleString()} stores all time
              {totals.undated ? ` · ${Number(totals.undated).toLocaleString()} with no signup date` : ''}
            </p>
          )}
        </div>
        <div className="flex gap-1 rounded-lg bg-gray-100 p-0.5" role="tablist" aria-label="Signup range">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              type="button"
              role="tab"
              aria-selected={view === v.key}
              onClick={() => setView(v.key)}
              className={`whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors ${
                view === v.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {total === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 px-4 py-10 text-center">
          <BarChart2 size={18} className="mx-auto mb-2 text-gray-300" />
          <p className="text-xs font-bold text-gray-900">No signups in this range</p>
          <p className="mt-0.5 text-[10px] text-gray-400">Try a longer range.</p>
        </div>
      ) : (
        <>
          <div
            className="h-56 w-full"
            role="img"
            aria-label={`Signups per ${periodWord}: ${total.toLocaleString()} in this range, busiest ${periodWord} ${max.toLocaleString()}.`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 8, bottom: 0, left: -14 }} barCategoryGap="22%">
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis
                  dataKey="tick"
                  interval={view === '30d' || view === '12m' ? 0 : 6}
                  tickLine={false}
                  axisLine={{ stroke: AXIS }}
                  tick={{ fontSize: 10, fill: TICK }}
                />
                <YAxis
                  allowDecimals={false}
                  width={40}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: TICK }}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false}>
                  {chartData.map((d, i) => <Cell key={d.key} fill={i === bestIndex ? BEST : BAR} />)}
                  <LabelList dataKey="best" content={<BestLabel />} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-medium text-gray-500">
              {total.toLocaleString()} {total === 1 ? 'signup' : 'signups'} over {data.length} {periodWord}
              {data.length === 1 ? '' : 's'}
              {bestIndex >= 0 ? ` · busiest ${periodWord} ${max.toLocaleString()} on ${data[bestIndex].full}` : ''}
            </p>
            <button
              type="button"
              onClick={() => setShowTable((v) => !v)}
              className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500 hover:text-gray-800"
            >
              <Table2 size={11} /> {showTable ? 'Hide numbers' : 'Show numbers'}
            </button>
          </div>

          {showTable && (
            <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-gray-100">
              <table className="w-full text-left text-[11px]">
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="text-[9px] font-black uppercase tracking-wider text-gray-400">
                    <th className="px-3 py-1.5">{view === '12m' ? 'Month' : 'Day'}</th>
                    <th className="px-3 py-1.5 text-right">Signups</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[...data].reverse().map((d) => (
                    <tr key={d.key}>
                      <td className="px-3 py-1.5 text-gray-600">{d.full}</td>
                      <td className="px-3 py-1.5 text-right font-bold text-gray-900">{d.value.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
