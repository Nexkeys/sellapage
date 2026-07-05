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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">{title}</h2>
          <div className="h-1 w-12 bg-emerald-500 rounded-full" />
        </div>
        <button
          onClick={() => navigateTo(manageTab)}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm shadow-emerald-600/10 group"
        >
          <span>+ Manage in {manageTab === 'products' ? 'Products' : 'Services'}</span>
          <ArrowRight size={14} className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
        </button>
      </div>

      {/* Analytics-Style Metrics Track */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Categories */}
        <div className="bg-gradient-to-br from-white to-slate-50/50 rounded-2xl border border-slate-200/60 p-5 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Groups</p>
            <p className="text-3xl font-black text-slate-900 tracking-tight">{data.categoryList.length}</p>
          </div>
          <div className="w-10 h-10 bg-slate-100/80 rounded-xl flex items-center justify-center text-slate-600">
            <Tag size={18} />
          </div>
        </div>
        
        {/* Categorized Count */}
        <div className="bg-gradient-to-br from-white to-emerald-50/10 rounded-2xl border border-slate-200/60 p-5 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Categorised {itemType}s</p>
            <p className="text-3xl font-black text-emerald-600 tracking-tight">{data.categorised.length}</p>
          </div>
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
            <CheckCircle2 size={18} />
          </div>
        </div>

        {/* Uncategorized Alert Tracker */}
        <div className={`bg-gradient-to-br from-white ${data.uncategorised.length > 0 ? 'to-amber-50/20 border-amber-200/70' : 'to-slate-50/50 border-slate-200/60'} rounded-2xl border p-5 flex items-center justify-between shadow-sm transition-colors`}>
          <div className="space-y-1">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Unassigned</p>
            <p className={`text-3xl font-black tracking-tight ${data.uncategorised.length > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
              {data.uncategorised.length}
            </p>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${data.uncategorised.length > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
            <AlertCircle size={18} />
          </div>
        </div>
      </div>

      {/* Main Grid Content Area */}
      {data.categoryList.length === 0 ? (
        /* Empty State */
        <div className="bg-slate-50/60 rounded-3xl border-2 border-dashed border-slate-200/80 flex flex-col items-center justify-center py-14 px-4 text-center max-w-xl mx-auto">
          <div className="w-16 h-16 bg-white border border-slate-100 rounded-2xl flex items-center justify-center shadow-md shadow-slate-200/50 mb-4 animate-pulse">
            <Tag size={26} className="text-emerald-600" />
          </div>
          <h3 className="font-bold text-slate-900 text-base mb-1">No structural categories yet</h3>
          <p className="text-slate-500 text-sm max-w-sm leading-relaxed mb-6">
            Assign a custom category identity to any {itemType.toLowerCase()} inside your inventory management tab to populate this dashboard dynamically.
          </p>
          <button
            onClick={() => navigateTo(manageTab)}
            className="flex items-center gap-2 bg-white border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] text-slate-700 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm"
          >
            Go to {manageTab === 'products' ? 'Products' : 'Services'}
            <ArrowRight size={14} className="text-slate-400" />
          </button>
        </div>
      ) : (
        /* Populated Category Directory Card Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.categoryList.map(category => {
            const previewItems = category.items.slice(0, 3)
            const remaining = category.items.length - previewItems.length

            return (
              <div
                key={category.name}
                className="bg-white rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between overflow-hidden min-w-0"
              >
                {/* Card Top Block */}
                <div className="p-5">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                      {category.count} {itemType.toLowerCase()}{category.count !== 1 ? 's' : ''}
                    </span>
                    <div className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
                      <Tag size={13} />
                    </div>
                  </div>
                  
                  <h3 className="font-bold text-slate-900 text-base tracking-tight truncate w-full" title={category.name}>
                    {category.name}
                  </h3>
                </div>

                {/* Sub-item Pill Container Section */}
                <div className="bg-slate-50/60 border-t border-slate-100 p-4 mt-auto">
                  <div className="flex flex-wrap gap-1.5">
                    {previewItems.map(item => (
                      <span
                        key={item.id}
                        className="max-w-[150px] truncate text-[11px] font-semibold text-slate-600 bg-white border border-slate-200/60 px-2.5 py-1 rounded-lg shadow-2xs"
                        title={item.name}
                      >
                        {item.name}
                      </span>
                    ))}
                    {remaining > 0 && (
                      <span className="text-[11px] font-bold text-slate-500 bg-slate-200/60 border border-slate-300/40 px-2 py-1 rounded-lg">
                        +{remaining}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Uncategorised Fix Warning Wrapper */}
      {data.uncategorised.length > 0 && (
        <div className="bg-white border-2 border-amber-200 rounded-2xl shadow-sm overflow-hidden mt-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 sm:p-5">
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl flex-shrink-0">
                <AlertCircle size={20} />
              </div>
              <div className="min-w-0 space-y-0.5">
                <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                  {data.uncategorised.length} {itemType.toLowerCase()}{data.uncategorised.length !== 1 ? 's' : ''} missing category tags
                </h4>
                <p className="text-slate-500 text-xs sm:text-sm leading-relaxed max-w-2xl">
                  These items currently operate without direct catalog assignment flags, preventing targeted collection searches on your storefront pages.
                </p>
              </div>
            </div>
            
            <button
              onClick={() => navigateTo(manageTab)}
              className="w-full lg:w-auto shrink-0 inline-flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm shadow-amber-600/10"
            >
              <span>Fix in {manageTab === 'products' ? 'Products' : 'Services'}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-8 w-full block">
      {/* Primary Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Storefront Directory</h1>
          <p className="text-slate-500 text-sm font-medium">Structure and manage structural classifications for smooth public catalog navigation.</p>
        </div>
      </div>

      {/* Segment Routing Framework */}
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
        <div className="space-y-12">
          <CategorySection
            title="Product Categories"
            data={productData}
            itemType="Product"
            manageTab="products"
          />
          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-slate-200/70" />
            </div>
          </div>
          <CategorySection
            title="Service Categories"
            data={serviceData}
            itemType="Service"
            manageTab="services"
          />
        </div>
      )}

      {/* Global Information Guide Module */}
      <div className="flex items-start gap-3 bg-slate-50 border border-slate-200/80 rounded-2xl p-4 transition-all hover:bg-slate-100/60 shadow-xs">
        <Info size={16} className="text-slate-500 flex-shrink-0 mt-0.5" />
        <p className="text-slate-600 text-xs sm:text-sm leading-relaxed font-medium">
          Category parameters are assigned inside standard product parameters. To create new category filters or update collection properties, select your inventory catalogs, edit your chosen listing, and submit new category flags.
        </p>
      </div>
    </div>
  )
}