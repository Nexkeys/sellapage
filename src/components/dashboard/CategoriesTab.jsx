// src/components/dashboard/CategoriesTab.jsx/
import { useState } from 'react'
import {
  Tag,
  ArrowRight,
  Info,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

const CATEGORIES_PER_PAGE = 3

export default function CategoriesTab({ isGrowthOrPro, navigateTo, products = [], services = [], vendorType = 'products' }) {
  const [expandedCategory, setExpandedCategory] = useState('')
  const [sectionPages, setSectionPages] = useState({})

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

  const getSectionPage = (sectionKey, totalPages) => {
    const page = sectionPages[sectionKey] || 1
    return Math.min(page, totalPages)
  }

  const setSectionPage = (sectionKey, page) => {
    setSectionPages(prev => ({ ...prev, [sectionKey]: page }))
  }

  const CategorySection = ({ title, data, itemType, manageTab, sectionKey }) => {
    const totalPages = Math.max(1, Math.ceil(data.categoryList.length / CATEGORIES_PER_PAGE))
    const currentPage = getSectionPage(sectionKey, totalPages)
    const visibleCategories = data.categoryList.slice(
      (currentPage - 1) * CATEGORIES_PER_PAGE,
      currentPage * CATEGORIES_PER_PAGE
    )

    return (
      <section className="space-y-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-green-600">
                Categories
              </p>
              <h2 className="mt-1 text-lg font-bold tracking-tight text-gray-900">{title}</h2>
              <p className="mt-1 text-xs leading-relaxed text-gray-400">
                Group your {itemType.toLowerCase()}s so customers can find them faster.
              </p>
            </div>
            <button
              onClick={() => navigateTo(manageTab)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-green-600 sm:w-auto"
            >
              Manage {manageTab === 'products' ? 'Products' : 'Services'}
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-bold text-gray-500">Groups</span>
                <Tag size={15} className="text-gray-400" />
              </div>
              <p className="mt-2 text-2xl font-black text-gray-900">{data.categoryList.length}</p>
            </div>
            <div className="rounded-xl border border-green-100 bg-green-50/50 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-bold text-green-700">Assigned</span>
                <CheckCircle2 size={15} className="text-green-600" />
              </div>
              <p className="mt-2 text-2xl font-black text-green-700">{data.categorised.length}</p>
            </div>
            <div className={`rounded-xl border p-3 ${data.uncategorised.length > 0 ? 'border-amber-200 bg-amber-50/60' : 'border-gray-100 bg-gray-50/60'}`}>
              <div className="flex items-center justify-between gap-3">
                <span className={`text-[11px] font-bold ${data.uncategorised.length > 0 ? 'text-amber-700' : 'text-gray-500'}`}>
                  Unassigned
                </span>
                <AlertCircle size={15} className={data.uncategorised.length > 0 ? 'text-amber-600' : 'text-gray-400'} />
              </div>
              <p className={`mt-2 text-2xl font-black ${data.uncategorised.length > 0 ? 'text-amber-700' : 'text-gray-900'}`}>
                {data.uncategorised.length}
              </p>
            </div>
          </div>
        </div>

        {data.categoryList.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50">
              <Tag size={20} className="text-green-500" />
            </div>
            <p className="text-sm font-bold text-gray-800">No categories yet</p>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-gray-400">
              Add a category while editing a {itemType.toLowerCase()} and it will appear here.
            </p>
            <button
              onClick={() => navigateTo(manageTab)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700 transition-all hover:bg-gray-50"
            >
              Go to {manageTab === 'products' ? 'Products' : 'Services'}
              <ArrowRight size={13} />
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {visibleCategories.map(category => {
                const categoryKey = `${sectionKey}:${category.name}`
                const isExpanded = expandedCategory === categoryKey
                const previewItems = category.items.slice(0, 3)
                const remaining = category.items.length - previewItems.length
                const shownItems = isExpanded ? category.items : previewItems

                return (
                  <article
                    key={category.name}
                    className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:border-green-100"
                  >
                    <div className="p-4">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <span className="rounded-full border border-green-100 bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                          {category.count} {itemType.toLowerCase()}{category.count !== 1 ? 's' : ''}
                        </span>
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-50 text-gray-400">
                          <Tag size={14} />
                        </div>
                      </div>
                      <h3 className="break-words text-base font-bold leading-snug text-gray-900">
                        {category.name}
                      </h3>
                    </div>

                    <div className="border-t border-gray-100 bg-gray-50/70 p-3">
                      <div className="flex flex-wrap gap-1.5">
                        {shownItems.map(item => (
                          <span
                            key={item.id}
                            className="max-w-full truncate rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-600"
                            title={item.name}
                          >
                            {item.name}
                          </span>
                        ))}
                      </div>

                      {remaining > 0 && (
                        <button
                          type="button"
                          onClick={() => setExpandedCategory(isExpanded ? '' : categoryKey)}
                          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-gray-600 transition-all hover:bg-gray-50"
                        >
                          {isExpanded ? 'Show less' : `+${remaining} more`}
                          <ChevronDown size={12} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>

            {data.categoryList.length > CATEGORIES_PER_PAGE && (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => setSectionPage(sectionKey, Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600 transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={13} />
                  Previous
                </button>
                <span className="text-xs font-bold text-gray-500">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setSectionPage(sectionKey, Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600 transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight size={13} />
                </button>
              </div>
            )}
          </div>
        )}

        {data.uncategorised.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <AlertCircle size={17} />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    {data.uncategorised.length} {itemType.toLowerCase()}{data.uncategorised.length !== 1 ? 's' : ''} without a category
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-gray-500">
                    Add categories so customers can browse this section more easily.
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigateTo(manageTab)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-amber-600 sm:w-auto"
              >
                Fix in {manageTab === 'products' ? 'Products' : 'Services'}
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        )}
      </section>
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-5 lg:p-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">Category Manager</h1>
        <p className="mt-1 text-xs leading-relaxed text-gray-400 sm:text-sm">
          Review how your listings are grouped across your storefront.
        </p>
      </div>

      {vendorType === 'products' && (
        <CategorySection
          title="Product Categories"
          data={productData}
          itemType="Product"
          manageTab="products"
          sectionKey="products"
        />
      )}

      {vendorType === 'services' && (
        <CategorySection
          title="Service Categories"
          data={serviceData}
          itemType="Service"
          manageTab="services"
          sectionKey="services"
        />
      )}

      {vendorType === 'both' && (
        <div className="space-y-8">
          <CategorySection
            title="Product Categories"
            data={productData}
            itemType="Product"
            manageTab="products"
            sectionKey="products"
          />
          <CategorySection
            title="Service Categories"
            data={serviceData}
            itemType="Service"
            manageTab="services"
            sectionKey="services"
          />
        </div>
      )}

      <div className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-4">
        <Info size={16} className="mt-0.5 flex-shrink-0 text-gray-400" />
        <p className="text-xs leading-relaxed text-gray-500">
          Categories are set from each product or service edit form. Update a listing to move it into a different group.
        </p>
      </div>
    </div>
  )
}
