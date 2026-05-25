import { useState, useEffect } from 'react'
import StoreNavbar from '../StoreNavbar'
import ProductCard from '../ProductCard'

const PREVIEW_PLACEHOLDERS = [
  { id: 'preview-1', name: 'Sample Product', price: 4500, imageUrls: [], description: 'Your products appear here' },
  { id: 'preview-2', name: 'Featured Item', price: 12500, imageUrls: [], description: '' },
]

const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export default function ThemeLivePreview({
  store,
  previewTokens,
  storeLayout = 'grid',
  previewProducts = [],
  storeUrl = '',
}) {
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('home')

  const {
    previewThemeObj,
    activeThemeObj,
    themeBg,
    themeText,
    themePrimary,
    themeCard,
    headerFont,
    bodyFont,
    fontUrl,
    heroBannerUrl,
    footerText,
  } = previewTokens ?? {}

  useEffect(() => {
    if (!fontUrl) return undefined
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = fontUrl
    link.setAttribute('data-theme-preview-font', 'true')
    document.head.appendChild(link)
    return () => {
      document.querySelectorAll('link[data-theme-preview-font]').forEach((el) => el.remove())
    }
  }, [fontUrl])

  const displayProducts =
    previewProducts.length > 0 ? previewProducts.slice(0, 2) : PREVIEW_PLACEHOLDERS

  const listView = storeLayout === 'list'
  const gridClass =
    storeLayout === 'list'
      ? 'grid grid-cols-1 gap-2'
      : storeLayout === 'compact'
        ? 'grid grid-cols-3 gap-1.5'
        : 'grid grid-cols-2 gap-2'

  if (!store || !previewTokens) return null

  return (
    <div className="w-full flex flex-col items-center">
      {/* Phone chrome */}
      <div className="w-full max-w-[280px] mx-auto">
        <div className="rounded-[2rem] border-[3px] border-gray-800 bg-gray-800 p-2 shadow-xl shadow-gray-300/50">
          {/* Status bar notch */}
          <div className="flex justify-center pb-1.5">
            <div className="w-20 h-1 rounded-full bg-gray-600" aria-hidden />
          </div>

          <div
            className="relative rounded-[1.35rem] overflow-hidden bg-black isolate"
            style={{ aspectRatio: '9 / 19', maxHeight: '520px' }}
          >
            <div className="absolute inset-0 overflow-y-auto overflow-x-hidden scrollbar-thin">
              <div
                className={`pointer-events-none relative min-h-full w-full overflow-x-hidden pb-20 ${activeThemeObj?.structuralStyle?.containerClasses ?? ''}`}
                style={{ backgroundColor: themeBg, color: themeText, fontFamily: bodyFont }}
              >
                <StoreNavbar
                  store={store}
                  search={search}
                  setSearch={setSearch}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  cartCount={0}
                  onCartOpen={null}
                  activeThemeObj={previewThemeObj}
                  previewMode
                />

                {/* Mini hero */}
                <div
                  className="relative overflow-hidden shadow-inner"
                  style={{
                    backgroundColor: themePrimary,
                    backgroundImage: heroBannerUrl ? `url(${heroBannerUrl})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  <div className="absolute inset-0 pointer-events-none">
                    <div className={`absolute inset-0 ${heroBannerUrl ? 'bg-black/50' : 'bg-black/10'}`} />
                    {!heroBannerUrl && (
                      <>
                        <div className="absolute -top-6 -left-6 w-24 h-24 rounded-full bg-white/10" />
                        <div className="absolute -bottom-8 -right-4 w-28 h-28 rounded-full bg-black/10" />
                      </>
                    )}
                  </div>
                  <div className="relative px-3 py-5 text-center">
                    <div className="flex justify-center mb-2">
                      <div className="w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center shadow-lg bg-white/20 backdrop-blur-sm border border-white/30">
                        {store.logoUrl ? (
                          <img src={store.logoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white font-extrabold text-sm select-none">
                            {getInitials(store.businessName)}
                          </span>
                        )}
                      </div>
                    </div>
                    <h1
                      className="font-extrabold text-base leading-tight text-white tracking-tight drop-shadow-sm line-clamp-2"
                      style={{ fontFamily: headerFont }}
                    >
                      {store.businessName || 'Your Store'}
                    </h1>
                    {store.description && (
                      <p className="text-white/75 text-[9px] mt-1 line-clamp-2 leading-relaxed px-1">
                        {store.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Products */}
                <div className="px-2 py-3 pb-2">
                  <h2
                    className="font-bold text-[11px] mb-2 px-0.5"
                    style={{ fontFamily: headerFont, color: themeText }}
                  >
                    Our Collection
                  </h2>
                  <div className={`${gridClass} items-stretch`}>
                    {displayProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        whatsappNumber={store.whatsappNumber || ''}
                        storeUrl={storeUrl}
                        listView={listView}
                        onAddToCart={null}
                        themeCardStyle={{
                          backgroundColor: themeCard,
                          color: themeText,
                          fontFamily: bodyFont,
                        }}
                        buttonStyle={activeThemeObj?.structuralStyle?.buttonClasses}
                        structuralClasses={`${activeThemeObj?.structuralStyle?.cardBorderRadius} ${activeThemeObj?.structuralStyle?.cardBorder}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Compact footer — trust badges hidden in preview */}
                <div className="px-2 pb-3">
                  {footerText ? (
                    <p
                      className="text-center text-[8px] font-semibold tracking-wide uppercase opacity-80 whitespace-pre-line mb-2"
                      style={{ color: themeText }}
                    >
                      {footerText}
                    </p>
                  ) : null}
                  <p className="text-center text-[7px] opacity-40" style={{ color: themeText }}>
                    Powered by Sellapage
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
