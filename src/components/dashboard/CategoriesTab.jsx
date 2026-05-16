//src/components/dashboard/CategoriesTab.jsx/
import { Tag, ArrowRight, Info, Lock, AlertCircle, CheckCircle2 } from 'lucide-react'


export default function CategoriesTab({ isGrowthOrPro, navigateTo, products = [] }) {
  const categorised = products.filter(p => p.category && p.category.trim() !== '')
  const uncategorised = products.filter(p => !p.category || p.category.trim() === '')
  const categoryMap = categorised.reduce((acc, p) => {
    const key = p.category.trim()
    if (!acc[key]) acc[key] = []
    acc[key].push(p)
    return acc
  }, {})
  const categoryList = Object.entries(categoryMap)
    .map(([name, items]) => ({ name, count: items.length, products: items }))
    .sort((a, b) => b.count - a.count)

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

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Categories</h1>
          <p className="text-gray-400 text-sm mt-1">Organise your products for easier browsing.</p>
        </div>
        <button
          onClick={() => navigateTo('products')}
          className="inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm"
        >
          + Manage in Products
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-2xl font-extrabold text-gray-900 leading-none">{categoryList.length}</p>
          <p className="text-gray-400 text-xs mt-1.5">Total Categories</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2">
            <p className="text-2xl font-extrabold text-green-600 leading-none">{categorised.length}</p>
            <CheckCircle2 size={16} className="text-green-500" />
          </div>
          <p className="text-gray-400 text-xs mt-1.5">Categorised Products</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className={`text-2xl font-extrabold leading-none ${uncategorised.length > 0 ? 'text-amber-500' : 'text-green-600'}`}>
            {uncategorised.length}
          </p>
          <p className="text-gray-400 text-xs mt-1.5">Uncategorised</p>
        </div>
      </div>

      {/* Category cards */}
      {categoryList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-16 px-6 gap-5 text-center">
          <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center">
            <Tag size={24} className="text-green-500" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-base mb-1">No categories yet</h2>
            <p className="text-gray-400 text-sm max-w-xs mx-auto leading-relaxed">
              Add a category to any product from the Products tab to see it organised here.
            </p>
          </div>
          <button
            onClick={() => navigateTo('products')}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm"
          >
            Go to Products
            <ArrowRight size={14} />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categoryList.map(category => {
            const previewProducts = category.products.slice(0, 3)
            const remaining = category.products.length - previewProducts.length

            return (
              <div
                key={category.name}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-green-200 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 bg-green-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Tag size={18} className="text-green-500" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-bold text-gray-900 text-base leading-snug truncate">{category.name}</h2>
                    <p className="text-gray-400 text-xs mt-1">
                      {category.count} product{category.count !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="h-px bg-gray-100 my-4" />

                <div className="flex flex-wrap gap-2">
                  {previewProducts.map(product => (
                    <span
                      key={product.id}
                      className="max-w-full truncate text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-full"
                    >
                      {product.name}
                    </span>
                  ))}
                  {remaining > 0 && (
                    <span className="text-xs font-semibold text-gray-400 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-full">
                      +{remaining} more
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Uncategorised products */}
      {uncategorised.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 border-l-4 border-l-amber-400 shadow-sm px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="font-bold text-gray-900 text-sm">
                  {uncategorised.length} product{uncategorised.length !== 1 ? 's' : ''} without a category
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                  Customers can't filter these by category. Edit each product to assign one.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigateTo('products')}
              className="inline-flex items-center justify-center gap-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
            >
              Fix in Products
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-4">
        <Info size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-blue-700 text-sm leading-relaxed">
          Categories are set per product. To add or change a category, go to the Products tab and edit any product.
        </p>
      </div>
    </div>
  )
}
