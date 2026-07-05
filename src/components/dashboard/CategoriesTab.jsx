// src/components/dashboard/CategoriesTab.jsx/
import { Tag, ArrowRight, Info, Lock, AlertCircle, CheckCircle2 } from 'lucide-react'

export default function CategoriesTab({ isGrowthOrPro, navigateTo, products = [], services = [], vendorType = 'products' }) {
  // Helper function to process items (products or services) into category data
  const processItems = (items) => {
    const categorised = items.filter(item => item.category && item.category.trim() !== '')
    const uncategorised = items.filter(item => !item.category || item.category.trim() === '')
    const categoryMap = categorised.reduce((acc, item) => {
      const key = item.category.trim()
      if (!acc[key]) acc[key] = []
      acc[key].push(item)
      return acc
    }, {})
    const categoryList = Object.entries(categoryMap)
      .map(([name, items]) => ({ name, count: items.length, items }))
      .sort((a, b) => b.count - a.count)
    return { categorised, uncategorised, categoryList }
  }

  const productData = processItems(products)
  const serviceData = processItems(services)

  // Reusable component for category section
  const CategorySection = ({ title, data, itemType, manageTab }) => (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">{title}</h2>
        </div>
        <button
          onClick={() => navigateTo(manageTab)}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm shadow-emerald-600/10"
        >
          <span className="text-lg leading-none font-light">+</span> Manage in {manageTab === 'products' ? 'Products' : 'Services'}
        </button>
      </div>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4 sm:p-5 transition-all hover:border-slate-300/80">
          <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">{data.categoryList.length}</p>
          <p className="text-slate-500 text-xs font-medium mt-2 tracking-wide uppercase">Total Categories</p>
        </div>
        
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4 sm:p-5 transition-all hover:border-slate-300/80">
          <div className="flex items-center justify-between gap-2">
            <p className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight leading-none">{data.categorised.length}</p>
            <div className="p-1.5 bg-emerald-50 rounded-lg">
              <CheckCircle2 size={16} className="text-emerald-600" />
            </div>
          </div>
          <p className="text-slate-500 text-xs font-medium mt-2 tracking-wide uppercase">Categorised {itemType}s</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4 sm:p-5 transition-all hover:border-slate-300/80">
          <div className="flex items-center justify-between gap-2">
            <p className={`text-2xl sm:text-3xl font-black tracking-tight leading-none ${data.uncategorised.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {data.uncategorised.length}
            </p>
            {data.uncategorised.length > 0 && (
              <div className="p-1.5 bg-amber-50 rounded-lg">
                <AlertCircle size={16} className="text-amber-600" />
              </div>
            )}
          </div>
          <p className="text-slate-500 text-xs font-medium mt-2 tracking-wide uppercase">Uncategorised Items</p>
        </div>
      </div>

      {/* Category Cards / Empty State Grid Container */}
      {data.categoryList.length === 0 ? (
        <div className="bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center py-12 sm:py-16 px-4 sm:px-6 gap-4 text-center">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-emerald-50 rounded-2xl flex items-center justify-center shadow-inner shadow-emerald-600/5">
            <Tag size={22} className="text-emerald-600" />
          </div>
          <div className="space-y-1 max-w-sm">
            <h3 className="font-bold text-slate-900 text-base">No categories configured</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Assign a category marker to any {itemType.toLowerCase()} inside your {manageTab === 'products' ? 'Products' : 'Services'} tab to automatically generate directories here.
            </p>
          </div>
          <button
            onClick={() => navigateTo(manageTab)}
            className="mt-2 flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-slate-300 active:scale-[0.98] text-slate-700 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm"
          >
            Go to {manageTab === 'products' ? 'Products' : 'Services'}
            <ArrowRight size={14} className="text-slate-400" />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.categoryList.map(category => {
            const previewItems = category.items.slice(0, 3)
            const remaining = category.items.length - previewItems.length

            return (
              <div
                key={category.name}
                className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-5 hover:border-emerald-300 hover:shadow-md hover:shadow-emerald-600/[0.02] flex flex-col justify-between transition-all group min-w-0"
              >
                <div>
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 bg-emerald-50 group-hover:bg-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors">
                      <Tag size={16} className="text-emerald-600 group-hover:text-white transition-colors" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-slate-900 text-base leading-snug truncate group-hover:text-emerald-700 transition-colors" title={category.name}>
                        {category.name}
                      </h3>
                      <p className="text-slate-400 text-xs font-medium mt-0.5">
                        {category.count} {itemType.toLowerCase()}{category.count !== 1 ? 's' : ''} total
                      </p>
                    </div>
                  </div>
                  
                  {/* Decorative Subtle Line */}
                  <div className="h-px bg-slate-100 my-4" />
                </div>

                {/* Sub-item pill ecosystem */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {previewItems.map(item => (
                    <span
                      key={item.id}
                      className="max-w-full truncate text-xs font-medium text-slate-600 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg"
                      title={item.name}
                    >
                      {item.name}
                    </span>
                  ))}
                  {remaining > 0 && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50/60 border border-emerald-100/80 px-2.5 py-1 rounded-lg">
                      +{remaining} more
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Uncategorised Alerts Workspace */}
      {data.uncategorised.length > 0 && (
        <div className="bg-amber-50/40 rounded-2xl border border-amber-200/70 border-l-4 border-l-amber-500 shadow-sm p-4 mt-2">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <h4 className="font-bold text-slate-900 text-sm">
                  {data.uncategorised.length} unassigned {itemType.toLowerCase()}{data.uncategorised.length !== 1 ? 's' : ''} detected
                </h4>
                <p className="text-slate-500 text-xs sm:text-sm mt-0.5 leading-relaxed">
                  Storefront filters omit these completely. Access your inventory modules to attach proper grouping profiles.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigateTo(manageTab)}
              className="w-full lg:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-amber-50 text-amber-800 border border-amber-200/80 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm active:scale-[0.99]"
            >
              Fix in {manageTab === 'products' ? 'Products' : 'Services'}
              <ArrowRight size={14} className="text-amber-600" />
            </button>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-8 w-full block">
      {/* Primary Module Dashboard Header */}
      <div className="border-b border-slate-100 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Storefront Categories</h1>
            <p className="text-slate-400 text-sm font-medium">Segment catalogs smoothly to refine your user purchasing journeys.</p>
          </div>
        </div>
      </div>

      {/* Segment Distribution Routing System */}
      {vendorType === 'products' && (
        <CategorySection
          title="Product Categories"
          data={productData}
          itemType="Product"
          manageTab="products"
        />
      )}

      {vendorType === 'services' && (
        <CategorySection
          title="Service Categories"
          data={serviceData}
          itemType="Service"
          manageTab="services"
        />
      )}

      {vendorType === 'both' && (
        <div className="space-y-10">
          <CategorySection
            title="Product Categories"
            data={productData}
            itemType="Product"
            manageTab="products"
          />
          <div className="h-px bg-slate-200/60" />
          <CategorySection
            title="Service Categories"
            data={serviceData}
            itemType="Service"
            manageTab="services"
          />
        </div>
      )}

      {/* Global Context Notice Footer Banner */}
      <div className="flex items-start gap-3 bg-sky-50/50 border border-sky-100 rounded-2xl p-4 transition-all hover:bg-sky-50">
        <Info size={16} className="text-sky-600 flex-shrink-0 mt-0.5" />
        <p className="text-sky-800 text-xs sm:text-sm leading-relaxed font-medium">
          Category assignments live natively within separate item parameters. To create new category nodes or map existing items elsewhere, visit your designated Product or Service tabs to edit them directly.
        </p>
      </div>
    </div>
  )
}