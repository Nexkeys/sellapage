import { Grid, Plus, Edit2, Trash2, Package } from 'lucide-react'

const CATS = [
  { name: 'Tops',        count: 14, bg: 'bg-blue-50',   em: '👚' },
  { name: 'Bottoms',     count: 9,  bg: 'bg-purple-50', em: '👖' },
  { name: 'Dresses',     count: 7,  bg: 'bg-pink-50',   em: '👗' },
  { name: 'Footwear',    count: 11, bg: 'bg-amber-50',  em: '👟' },
  { name: 'Accessories', count: 5,  bg: 'bg-green-50',  em: '👜' },
  { name: 'Outerwear',   count: 4,  bg: 'bg-red-50',    em: '🧥' },
]

export default function CategoriesTab() {
  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Categories</h1>
          <p className="text-gray-400 text-sm mt-1">Organise your products for easier browsing.</p>
        </div>
        <button className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all whitespace-nowrap">
          <Plus size={14} /> Add Category
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {CATS.map(c => (
          <div key={c.name} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3 group hover:border-green-200 hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <div className={`w-12 h-12 ${c.bg} rounded-2xl flex items-center justify-center text-2xl`}>{c.em}</div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="w-7 h-7 bg-gray-50 border border-gray-200 text-gray-400 hover:text-blue-500 rounded-lg flex items-center justify-center"><Edit2 size={11} /></button>
                <button className="w-7 h-7 bg-gray-50 border border-gray-200 text-gray-400 hover:text-red-500 rounded-lg flex items-center justify-center"><Trash2 size={11} /></button>
              </div>
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">{c.name}</p>
              <div className="flex items-center gap-1 mt-0.5"><Package size={10} className="text-gray-400" /><p className="text-gray-400 text-xs">{c.count} products</p></div>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-400 rounded-full" style={{ width: `${(c.count/14)*100}%` }} />
            </div>
          </div>
        ))}
        <button className="bg-white rounded-2xl border-2 border-dashed border-gray-200 hover:border-green-400 hover:bg-green-50/30 p-5 flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-green-600 transition-all min-h-[148px]">
          <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center"><Plus size={22} /></div>
          <span className="text-sm font-semibold">New Category</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center"><Grid size={16} className="text-green-600" /></div>
          <div>
            <p className="font-bold text-gray-900 text-sm">Category Overview</p>
            <p className="text-gray-400 text-xs">{CATS.length} categories &middot; {CATS.reduce((a,c)=>a+c.count,0)} products</p>
          </div>
        </div>
        <div className="space-y-2.5">
          {CATS.map(c => (
            <div key={c.name} className="flex items-center gap-3">
              <p className="text-xs text-gray-500 w-24 flex-shrink-0 font-medium">{c.name}</p>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-400 rounded-full" style={{ width: `${(c.count/14)*100}%` }} />
              </div>
              <p className="text-xs text-gray-400 w-5 text-right flex-shrink-0">{c.count}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
