import { BarChart2, TrendingUp, Eye, ShoppingCart, Users, ArrowUpRight } from 'lucide-react'

const BAR = [65,82,74,91,88,110,97]
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const MAX_BAR = Math.max(...BAR)

const STATS = [
  { label: 'Store Views',     value: '1,250', change: '+15.7%', Icon: Eye,          color: 'bg-amber-50 text-amber-600' },
  { label: 'Total Orders',    value: '248',   change: '+12.5%', Icon: ShoppingCart, color: 'bg-blue-50 text-blue-600' },
  { label: 'Customers',       value: '142',   change: '+8.6%',  Icon: Users,        color: 'bg-purple-50 text-purple-600' },
  { label: 'Conversion Rate', value: '19.8%', change: '+2.3%',  Icon: TrendingUp,   color: 'bg-green-50 text-green-600' },
]

const TOP = [
  { name: 'Black Crop Top',      sold: 43, revenue: 172000 },
  { name: 'High-waist Jeans',    sold: 31, revenue: 124000 },
  { name: 'Floral Maxi Dress',   sold: 28, revenue: 196000 },
  { name: 'Oversized Hoodie',    sold: 24, revenue: 96000 },
  { name: 'Ankara Print Blouse', sold: 19, revenue: 76000 },
]

export default function AnalyticsTab() {
  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Analytics</h1>
          <p className="text-gray-400 text-sm mt-1">Your store performance over the last 7 days.</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600 font-medium w-fit shadow-sm">
          Last 7 days
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STATS.map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.color}`}>
                <s.Icon size={15} strokeWidth={1.8} />
              </div>
              <span className="flex items-center gap-0.5 text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                <ArrowUpRight size={10} />{s.change}
              </span>
            </div>
            <p className="text-xl font-extrabold text-gray-900">{s.value}</p>
            <p className="text-gray-400 text-xs mt-0.5 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="font-bold text-gray-900 text-sm">Daily Store Views</p>
            <p className="text-gray-400 text-xs mt-0.5">Visitors to your store this week</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="w-3 h-3 rounded-sm bg-green-500 inline-block" /> Store views
          </div>
        </div>
        <div className="flex items-end justify-between gap-2 h-32 px-2">
          {BAR.map((v, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <div className="w-full bg-green-500 hover:bg-green-400 rounded-t-lg transition-colors relative group"
                style={{ height: `${(v/MAX_BAR)*100}%`, minHeight: 4 }}>
                <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {v}
                </span>
              </div>
              <span className="text-[10px] text-gray-400 font-medium">{DAYS[i]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="font-bold text-gray-900 text-sm">Top Selling Products</p>
          <p className="text-gray-400 text-xs mt-0.5">By units sold this week</p>
        </div>
        <div className="divide-y divide-gray-100">
          {TOP.map((p,i) => (
            <div key={p.name} className="flex items-center gap-4 px-5 py-3.5">
              <span className="text-gray-300 font-bold text-sm w-5 flex-shrink-0">#{i+1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[180px]">
                  <div className="h-full bg-green-400 rounded-full" style={{ width: `${(p.sold/43)*100}%` }} />
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-gray-900">{p.sold} sold</p>
                <p className="text-xs text-green-600 font-semibold">&#8358;{p.revenue.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
