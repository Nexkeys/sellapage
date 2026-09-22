// Messages sent against link taps, per day.
//
// Two series with the same unit (messages), so one axis is correct here. Sent
// is the light bar, taps the dark one, and the summary underneath states the
// tap rate in words, because that is the number worth watching: sending is
// easy, getting a vendor to come back is the point.
import { useMemo } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'

// Validated pair (scripts/validate_palette.js): passes the lightness band,
// chroma floor and colour-blind separation. The contrast warning on the lighter
// green is covered by the legend and the summary line under the chart.
const SENT = '#22c55e'
const TAPS = '#166534'
const GRID = '#f1f5f9'
const AXIS = '#e5e7eb'
const TICK = '#9ca3af'
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const label = (key) => {
  const [y, m, d] = String(key).split('-').map(Number)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  const rate = row.sent > 0 ? Math.round((row.clicks / row.sent) * 1000) / 10 : 0
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 shadow-lg">
      <p className="text-sm font-black leading-none text-gray-900">{row.clicks.toLocaleString()}</p>
      <p className="mt-1 text-[10px] font-semibold text-gray-500">
        taps of {row.sent.toLocaleString()} sent · {rate}% · {row.full}
      </p>
    </div>
  )
}

export default function SmsChart({ series = [] }) {
  const data = useMemo(
    () => series.slice(-30).map((d) => ({
      ...d,
      tick: String(Number(String(d.date).slice(8, 10))),
      full: label(d.date),
    })),
    [series],
  )

  const sent = data.reduce((n, d) => n + (d.sent || 0), 0)
  const clicks = data.reduce((n, d) => n + (d.clicks || 0), 0)
  const rate = sent > 0 ? Math.round((clicks / sent) * 1000) / 10 : 0

  if (!data.length) return null

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-xs">
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-900">Sent and tapped</h3>
      <p className="mt-0.5 text-[10px] font-medium text-gray-400">Last {data.length} day{data.length === 1 ? '' : 's'} with activity</p>

      <div
        className="mt-3 h-56 w-full"
        role="img"
        aria-label={`${sent.toLocaleString()} messages sent and ${clicks.toLocaleString()} link taps, ${rate} percent.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -14 }} barCategoryGap="22%">
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="tick" interval={0} tickLine={false} axisLine={{ stroke: AXIS }} tick={{ fontSize: 10, fill: TICK }} />
            <YAxis allowDecimals={false} width={40} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: TICK }} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f8fafc' }} />
            <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} iconType="circle" iconSize={7} />
            <Bar name="Sent" dataKey="sent" fill={SENT} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
            <Bar name="Link taps" dataKey="clicks" fill={TAPS} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-2 text-[10px] font-medium text-gray-500">
        {sent.toLocaleString()} sent · {clicks.toLocaleString()} taps · {rate}% tapped the link
      </p>
    </div>
  )
}
