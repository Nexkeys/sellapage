//src/components/dashboard/CategoriesTab.jsx/
import { Tag, Layers, ArrowRight, Info, Lock } from 'lucide-react'


export default function CategoriesTab({ isGrowthOrPro, navigateTo }) {

  // ── Plan gate ──
  if (!isGrowthOrPro) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Categories</h1>
          <p className="text-gray-400 text-sm mt-1">Organise your products for easier browsing.</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-16 px-6 gap-5 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center">
            <Lock size={22} className="text-gray-400" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-base mb-1">Categories — Growth+ Feature</h2>
            <p className="text-gray-400 text-sm max-w-xs mx-auto leading-relaxed">
              Organise your products into categories so customers can browse your store more easily. Available on Growth and Pro plans.
            </p>
          </div>
          <button
            onClick={() => navigateTo('billing')}
            className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
          >
            Upgrade to unlock Categories
          </button>
        </div>
      </div>
    )
  }

  // ── Growth/Pro: coming soon ──
  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Categories</h1>
        <p className="text-gray-400 text-sm mt-1">Organise your products for easier browsing.</p>
      </div>

      {/* Coming soon card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-16 px-6 gap-5 text-center">
        <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center">
          <Tag size={24} className="text-green-500" />
        </div>
        <div className="max-w-sm">
          <h2 className="font-extrabold text-gray-900 text-lg mb-2">Product Categories — Coming Soon</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            We're building a full category management system so your customers can browse your store by product type.
          </p>
        </div>

        <div className="w-full max-w-sm bg-gray-50 rounded-2xl border border-gray-100 p-5 text-left space-y-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">What's coming</p>
          <ul className="space-y-2.5">
            {[
              'Create and name custom product categories',
              'Assign products to one or more categories',
              'Category filter bar on your store page',
              'Reorder categories by drag and drop',
            ].map(item => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-gray-600">
                <ArrowRight size={14} className="text-green-500 flex-shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-4">
        <Info size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-blue-700 text-sm leading-relaxed">
          <span className="font-semibold">In the meantime,</span> you can organise products manually by including the category in the product name or description — customers will still see everything on your store page.
        </p>
      </div>
    </div>
  )
}