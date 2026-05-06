import { Tag, Plus, Copy, Trash2, CheckCircle } from 'lucide-react'
import { useState } from 'react'

const DISCOUNTS = [
  { code: 'WELCOME10', type: 'Percentage', value: '10%',  usage: 24, limit: 100, expires: 'Jun 30, 2025', status: 'Active' },
  { code: 'SUMMER20',  type: 'Percentage', value: '20%',  usage: 61, limit: 50,  expires: 'May 31, 2025', status: 'Expired' },
  { code: 'FLAT500',   type: 'Fixed',      value: '&#8358;500', usage: 8, limit: null, expires: 'Jul 15, 2025', status: 'Active' },
  { code: 'VIP30',     type: 'Percentage', value: '30%',  usage: 3,  limit: 10,  expires: 'Aug 1, 2025',  status: 'Active' },
]

export default function DiscountsTab() {
  const [copied, setCopied] = useState(null)
  const copy = code => {
    navigator.clipboard.writeText(code).catch(()=>{})
    setCopied(code); setTimeout(()=>setCopied(null),2000)
  }
  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Discounts</h1>
          <p className="text-gray-400 text-sm mt-1">Create and manage discount codes for your store.</p>
        </div>
        <button className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all whitespace-nowrap">
          <Plus size={14} /> Create Code
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[['Active Codes','3'],['Total Uses','96'],['Revenue Saved','&#8358;48k']].map(([l,v]) => (
          <div key={l} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4">
            <p className="text-xl sm:text-2xl font-extrabold text-gray-900" dangerouslySetInnerHTML={{__html:v}} />
            <p className="text-gray-400 text-xs mt-0.5 font-medium">{l}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {DISCOUNTS.map(d => (
          <div key={d.code} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Tag size={16} className="text-green-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-extrabold text-gray-900 text-base tracking-widest">{d.code}</p>
                    <button onClick={()=>copy(d.code)} className="text-gray-400 hover:text-green-600 transition-colors">
                      {copied===d.code ? <CheckCircle size={13} className="text-green-500" /> : <Copy size={12} />}
                    </button>
                  </div>
                  <p className="text-gray-400 text-xs">{d.type} &middot; {d.value} off &middot; Expires {d.expires}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 pl-[52px] sm:pl-0">
                <div>
                  <p className="text-xs text-gray-400 font-medium">Used</p>
                  <p className="text-sm font-bold text-gray-700">{d.usage}{d.limit ? `/${d.limit}` : ''}</p>
                  {d.limit && (
                    <div className="mt-1 w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-400 rounded-full" style={{ width: `${(d.usage/d.limit)*100}%` }} />
                    </div>
                  )}
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  d.status==='Active' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-400'
                }`}>{d.status}</span>
                <button className="w-8 h-8 border border-gray-200 text-gray-300 hover:text-red-500 hover:border-red-200 hover:bg-red-50 rounded-xl flex items-center justify-center transition-all">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 text-sm text-blue-700">
        <Tag size={14} className="flex-shrink-0" />
        <p>Automated discount code application on your store checkout is <span className="font-bold">coming soon</span>.</p>
      </div>
    </div>
  )
}
