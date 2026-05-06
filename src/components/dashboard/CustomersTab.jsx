import { Users, Search, TrendingUp, MoreHorizontal } from 'lucide-react'
import { useState } from 'react'

const CUSTOMERS = [
  { name: 'Bola Ibrahim',  phone: '0813 456 7890', orders: 4, spent: 68000,  joined: 'Jan 12, 2025', status: 'Active' },
  { name: 'Tunde Adebayo', phone: '0802 345 6789', orders: 2, spent: 32000,  joined: 'Feb 3, 2025',  status: 'Active' },
  { name: 'Chioma Okafor', phone: '0706 789 0123', orders: 7, spent: 121500, joined: 'Nov 5, 2024',  status: 'Active' },
  { name: 'Emeka Nwosu',   phone: '0901 234 5678', orders: 1, spent: 18000,  joined: 'Mar 20, 2025', status: 'Active' },
  { name: 'Amaka Eze',     phone: '0811 234 5678', orders: 3, spent: 44000,  joined: 'Apr 1, 2025',  status: 'Inactive' },
  { name: 'Kola Adeyemi',  phone: '0703 456 7890', orders: 5, spent: 87000,  joined: 'Dec 14, 2024', status: 'Active' },
]

export default function CustomersTab() {
  const [search, setSearch] = useState('')
  const filtered = search
    ? CUSTOMERS.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search))
    : CUSTOMERS

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Customers</h1>
        <p className="text-gray-400 text-sm mt-1">People who have ordered from your store.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Total Customers',   value: '142', Icon: Users,      color: 'bg-purple-50 text-purple-600' },
          { label: 'Active This Month', value: '38',  Icon: TrendingUp, color: 'bg-green-50 text-green-600' },
          { label: 'Avg. Orders',       value: '3.7', Icon: MoreHorizontal, color: 'bg-blue-50 text-blue-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.color}`}>
              <s.Icon size={17} strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-xl font-extrabold text-gray-900">{s.value}</p>
              <p className="text-gray-400 text-xs font-medium">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or phone..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all bg-white shadow-sm" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="hidden sm:grid grid-cols-[2fr_1.5fr_1fr_1.2fr_1fr_1fr] gap-4 px-5 py-3 border-b border-gray-100 bg-gray-50/70">
          {['Customer','Phone','Orders','Total Spent','Joined','Status'].map(h => (
            <span key={h} className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</span>
          ))}
        </div>
        <div className="divide-y divide-gray-100">
          {filtered.map(c => (
            <div key={c.name}>
              <div className="hidden sm:grid grid-cols-[2fr_1.5fr_1fr_1.2fr_1fr_1fr] gap-4 items-center px-5 py-4 hover:bg-gray-50/40 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-xs">{c.name[0]}</span>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm truncate">{c.name}</p>
                </div>
                <p className="text-sm text-gray-500">{c.phone}</p>
                <p className="text-sm font-bold text-gray-700">{c.orders}</p>
                <p className="text-sm font-bold text-green-600">&#8358;{c.spent.toLocaleString()}</p>
                <p className="text-xs text-gray-400">{c.joined}</p>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full w-fit ${
                  c.status === 'Active' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500'
                }`}>{c.status}</span>
              </div>
              <div className="sm:hidden flex items-center gap-3 px-4 py-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-sm">{c.name[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm">{c.name}</p>
                  <p className="text-gray-400 text-xs">{c.phone} &middot; {c.orders} orders</p>
                </div>
                <p className="text-sm font-bold text-green-600 flex-shrink-0">&#8358;{c.spent.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50/50">
          <p className="text-xs text-gray-400 font-medium">{filtered.length} customer{filtered.length !== 1 ? 's' : ''}</p>
        </div>
      </div>
    </div>
  )
}
