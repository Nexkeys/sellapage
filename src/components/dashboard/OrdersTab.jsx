import { ShoppingCart, MoreHorizontal, ArrowUpRight } from 'lucide-react'

const ORDERS = [
  { id: '#SP-0248', customer: 'Bola Ibrahim',   phone: '0813 456 7890', items: '2 items', amount: 24500,  date: 'May 24, 2025', time: '10:24 AM', status: 'Paid' },
  { id: '#SP-0247', customer: 'Tunde Adebayo',  phone: '0802 345 6789', items: '1 item',  amount: 15000,  date: 'May 24, 2025', time: '9:12 AM',  status: 'Paid' },
  { id: '#SP-0246', customer: 'Chioma Okafor',  phone: '0706 789 0123', items: '3 items', amount: 36900,  date: 'May 23, 2025', time: '8:45 PM',  status: 'Paid' },
  { id: '#SP-0245', customer: 'Emeka Nwosu',    phone: '0901 234 5678', items: '1 item',  amount: 18000,  date: 'May 23, 2025', time: '6:33 PM',  status: 'Paid' },
  { id: '#SP-0244', customer: 'Amaka Eze',      phone: '0811 234 5678', items: '2 items', amount: 9800,   date: 'May 22, 2025', time: '3:10 PM',  status: 'Pending' },
  { id: '#SP-0243', customer: 'Kola Adeyemi',   phone: '0703 456 7890', items: '1 item',  amount: 7500,   date: 'May 22, 2025', time: '11:50 AM', status: 'Paid' },
]

const badge = s => s === 'Paid'
  ? 'bg-green-50 text-green-700 border border-green-200'
  : s === 'Pending'
  ? 'bg-amber-50 text-amber-700 border border-amber-200'
  : 'bg-red-50 text-red-600 border border-red-200'

export default function OrdersTab() {
  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Orders</h1>
          <p className="text-gray-400 text-sm mt-1">Track and manage all customer orders.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all">
            Filter
          </button>
          <button className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all">
            Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[['Total Orders','248','text-gray-900'],['Paid','230','text-green-600'],['Pending','12','text-amber-600'],['Cancelled','6','text-red-500']].map(([l,v,c]) => (
          <div key={l} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4">
            <p className={`text-2xl font-extrabold ${c}`}>{v}</p>
            <p className="text-gray-400 text-xs mt-0.5 font-medium">{l}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="hidden sm:grid grid-cols-[1.2fr_2fr_1fr_1.2fr_1.5fr_1.2fr_1fr_32px] gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50/70">
          {['Order ID','Customer','Products','Amount','Payment','Date','Status',''].map(h => (
            <span key={h} className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</span>
          ))}
        </div>
        <div className="divide-y divide-gray-100">
          {ORDERS.map(o => (
            <div key={o.id}>
              <div className="hidden sm:grid grid-cols-[1.2fr_2fr_1fr_1.2fr_1.5fr_1.2fr_1fr_32px] gap-3 items-center px-5 py-4 hover:bg-gray-50/40 transition-colors">
                <p className="text-sm font-bold text-gray-600">{o.id}</p>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-green-700 font-bold text-xs">{o.customer[0]}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{o.customer}</p>
                    <p className="text-xs text-gray-400 truncate">{o.phone}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500">{o.items}</p>
                <p className="text-sm font-bold text-gray-900">&#8358;{o.amount.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Paid via WhatsApp</p>
                <div>
                  <p className="text-xs font-medium text-gray-700">{o.date}</p>
                  <p className="text-xs text-gray-400">{o.time}</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full w-fit ${badge(o.status)}`}>{o.status}</span>
                <button className="text-gray-300 hover:text-gray-600 transition-colors"><MoreHorizontal size={15} /></button>
              </div>
              <div className="sm:hidden flex items-center gap-3 px-4 py-4">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-green-700 font-bold text-sm">{o.customer[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900">{o.customer}</p>
                  <p className="text-xs text-gray-400">{o.id} &middot; {o.date}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-gray-900">&#8358;{o.amount.toLocaleString()}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge(o.status)}`}>{o.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 bg-gray-50/50">
          <p className="text-xs text-gray-400 font-medium">Showing 6 of 248 orders</p>
          <button className="text-green-600 text-xs font-bold hover:underline">View all orders &rarr;</button>
        </div>
      </div>
    </div>
  )
}
