import { useState, useEffect } from 'react'
import {
  X, ChevronLeft, ChevronRight, Plus, Minus,
  MessageCircle, Package, Star, ShoppingCart,
} from 'lucide-react'
import { buildOrderURL } from '../utils/whatsapp'

export default function ProductDetailOverlay({
  product,
  onClose,
  onAddToCart,
  onOrder,
  isCartEnabled,
  isProOrPremium,
  activeThemeObj,
  themePrimary,
  themeCard,
  themeText,
  bodyFont,
  headerFont,
  whatsappNumber,
  storeUrl,
}) {
  const [activeImg, setActiveImg] = useState(0)
  const [selectedVariations, setSelectedVariations] = useState({})
  const [quantity, setQuantity] = useState(1)
  const [addedFeedback, setAddedFeedback] = useState(false)

  useEffect(() => {
    if (!product) return
    setActiveImg(0)
    setSelectedVariations({})
    setQuantity(1)
    setAddedFeedback(false)
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [product?.id])

  if (!product) return null

  const images = product.imageUrls?.length ? product.imageUrls : []
  const hasMultiple = images.length > 1
  const variations = product.variations || []
  const hasVariations = variations.length > 0

  const isOutOfStock = typeof product.stock === 'number' && product.stock === 0
  const isLowStock = typeof product.stock === 'number' && product.stock > 0 && product.stock <= 5

  const btnBg = activeThemeObj?.defaultColors?.primary || themePrimary || '#16a34a'
  const btnClasses = activeThemeObj?.structuralStyle?.buttonClasses ||
    'bg-green-500 hover:bg-green-600 active:bg-green-700 active:scale-95 text-white rounded-xl'
  const cardBg = activeThemeObj?.defaultColors?.card || themeCard || '#ffffff'
  const textCol = activeThemeObj?.defaultColors?.text || themeText || '#111827'
  const fontFam = activeThemeObj?.typography?.bodyFontFamily || bodyFont
  const headerFam = activeThemeObj?.typography?.headerFontFamily || headerFont

  const variationLabel = hasVariations
    ? variations
        .filter(g => selectedVariations[g.groupName])
        .map(g => `${g.groupName}: ${selectedVariations[g.groupName]}`)
        .join(' | ')
    : ''

  const handleVariationSelect = (groupName, value) => {
    setSelectedVariations(prev => ({
      ...prev,
      [groupName]: prev[groupName] === value ? undefined : value,
    }))
  }

  const allVariationsSelected = hasVariations
    ? variations.every(g => g.displayType === 'text-field' || selectedVariations[g.groupName])
    : true

  const handleAddToCart = () => {
    if (!allVariationsSelected) return
    const cartItem = {
      ...product,
      quantity,
      selectedVariations: hasVariations ? selectedVariations : undefined,
      variationLabel: variationLabel || undefined,
    }
    for (let i = 0; i < quantity; i++) {
      onAddToCart(cartItem)
    }
    setAddedFeedback(true)
    setTimeout(() => setAddedFeedback(false), 1500)
  }

  const handleOrder = () => {
    const url = buildOrderURL(
      whatsappNumber,
      product.name,
      product.price,
      product.id,
      storeUrl,
      product.type || 'physical',
    )
    window.open(url, '_blank', 'noopener,noreferrer')
    if (onOrder) onOrder(product.id)
  }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[75] flex items-end md:items-stretch justify-center"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Mobile: slide-up sheet */}
      <div
        className="relative z-10 w-full md:hidden max-h-[92vh] flex flex-col rounded-t-3xl overflow-hidden shadow-2xl"
        style={{ backgroundColor: cardBg, color: textCol, fontFamily: fontFam }}
      >
        {/* Mobile header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/5 flex-shrink-0">
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/5 transition-colors">
            <ChevronLeft size={20} style={{ color: textCol }} />
          </button>
          <span className="text-xs font-semibold opacity-50">Product Details</span>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/5 transition-colors">
            <X size={18} style={{ color: textCol }} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <MobileContent
            product={product}
            images={images}
            hasMultiple={hasMultiple}
            activeImg={activeImg}
            setActiveImg={setActiveImg}
            variations={variations}
            hasVariations={hasVariations}
            selectedVariations={selectedVariations}
            handleVariationSelect={handleVariationSelect}
            quantity={quantity}
            setQuantity={setQuantity}
            isOutOfStock={isOutOfStock}
            isLowStock={isLowStock}
            textCol={textCol}
            headerFam={headerFam}
            btnBg={btnBg}
            btnClasses={btnClasses}
            isCartEnabled={isCartEnabled}
            isProOrPremium={isProOrPremium}
            allVariationsSelected={allVariationsSelected}
            handleAddToCart={handleAddToCart}
            handleOrder={handleOrder}
            addedFeedback={addedFeedback}
          />
        </div>
      </div>

      {/* Desktop: side-by-side split */}
      <div
        className="relative z-10 hidden md:flex w-full max-w-4xl h-[85vh] my-auto rounded-2xl overflow-hidden shadow-2xl"
        style={{ backgroundColor: cardBg, color: textCol, fontFamily: fontFam }}
      >
        {/* Desktop header */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5 py-3 bg-gradient-to-b from-black/10 to-transparent">
          <button onClick={onClose} className="p-2 rounded-xl bg-white/80 hover:bg-white backdrop-blur-sm transition-colors shadow-sm">
            <X size={18} style={{ color: textCol }} />
          </button>
        </div>

        {/* Left: Image gallery */}
        <div className="w-1/2 h-full flex flex-col bg-black/5">
          <div className="flex-1 relative flex items-center justify-center p-6">
            {images.length > 0 ? (
              <>
                <img
                  src={images[activeImg]}
                  alt={product.name}
                  className="max-w-full max-h-full object-contain rounded-xl"
                />
                {hasMultiple && (
                  <>
                    <button
                      onClick={() => setActiveImg(i => (i - 1 + images.length) % images.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => setActiveImg(i => (i + 1) % images.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-colors"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 opacity-30">
                <Package size={48} />
                <p className="text-sm">No image</p>
              </div>
            )}
          </div>
          {/* Thumbnails */}
          {hasMultiple && (
            <div className="flex items-center justify-center gap-2 px-4 pb-4">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                    i === activeImg ? 'border-green-500 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Details */}
        <div className="w-1/2 h-full overflow-y-auto flex flex-col p-6 pt-14">
          <DesktopDetails
            product={product}
            variations={variations}
            hasVariations={hasVariations}
            selectedVariations={selectedVariations}
            handleVariationSelect={handleVariationSelect}
            quantity={quantity}
            setQuantity={setQuantity}
            isOutOfStock={isOutOfStock}
            isLowStock={isLowStock}
            textCol={textCol}
            headerFam={headerFam}
            btnBg={btnBg}
            btnClasses={btnClasses}
            isCartEnabled={isCartEnabled}
            isProOrPremium={isProOrPremium}
            allVariationsSelected={allVariationsSelected}
            handleAddToCart={handleAddToCart}
            handleOrder={handleOrder}
            addedFeedback={addedFeedback}
          />
        </div>
      </div>
    </div>
  )
}


/* ── Mobile Content ── */
function MobileContent({
  product, images, hasMultiple, activeImg, setActiveImg,
  variations, hasVariations, selectedVariations, handleVariationSelect,
  quantity, setQuantity, isOutOfStock, isLowStock,
  textCol, headerFam, btnBg, btnClasses,
  isCartEnabled, isProOrPremium, allVariationsSelected,
  handleAddToCart, handleOrder, addedFeedback,
}) {
  return (
    <>
      {/* Image */}
      <div className="relative aspect-square w-full bg-stone-100">
        {images.length > 0 ? (
          <>
            <img src={images[activeImg]} alt={product.name} className="w-full h-full object-cover" />
            {hasMultiple && (
              <>
                <button
                  onClick={() => setActiveImg(i => (i - 1 + images.length) % images.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center backdrop-blur-sm"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setActiveImg(i => (i + 1) % images.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center backdrop-blur-sm"
                >
                  <ChevronRight size={16} />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImg(i)}
                      className={`w-2 h-2 rounded-full transition-all ${i === activeImg ? 'bg-white scale-125' : 'bg-white/50'}`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <Package size={36} className="text-stone-300" />
            <p className="text-stone-400 text-xs">No image</p>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-4 space-y-4">
        {/* Name + Price */}
        <div>
          <h2 className="text-lg font-bold leading-snug" style={{ fontFamily: headerFam }}>
            {product.name}
          </h2>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-xl font-extrabold" style={{ color: btnBg }}>
              ₦{Number(product.price).toLocaleString()}
            </span>
            {product.avgRating > 0 && (
              <span className="flex items-center gap-1 text-xs">
                <Star size={12} className="text-amber-400 fill-amber-400" />
                <span className="font-bold">{Number(product.avgRating).toFixed(1)}</span>
                <span className="opacity-50">({product.reviewCount || 0})</span>
              </span>
            )}
          </div>
        </div>

        {/* Stock badges */}
        {isOutOfStock && (
          <span className="inline-block text-xs font-bold px-3 py-1 rounded-lg bg-red-50 text-red-600">Out of Stock</span>
        )}
        {isLowStock && (
          <span className="inline-block text-xs font-bold px-3 py-1 rounded-lg bg-amber-50 text-amber-600">
            Only {product.stock} left
          </span>
        )}

        {/* Variation Selectors */}
        {hasVariations && (
          <div className="space-y-3">
            {variations.map(group => (
              <VariationGroup
                key={group.groupName}
                group={group}
                selected={selectedVariations[group.groupName]}
                onSelect={handleVariationSelect}
                btnBg={btnBg}
                textCol={textCol}
              />
            ))}
          </div>
        )}

        {/* Description */}
        {product.description && (
          <p className="text-sm leading-relaxed opacity-70">{product.description}</p>
        )}

        {/* Quantity */}
        {isCartEnabled && !isOutOfStock && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold">Qty</span>
            <div className="flex items-center border border-black/10 rounded-xl overflow-hidden">
              <button
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="w-9 h-9 flex items-center justify-center hover:bg-black/5 transition-colors"
              >
                <Minus size={14} />
              </button>
              <span className="w-10 text-center text-sm font-bold">{quantity}</span>
              <button
                onClick={() => setQuantity(q => q + 1)}
                className="w-9 h-9 flex items-center justify-center hover:bg-black/5 transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="sticky bottom-0 p-4 border-t border-black/5 flex gap-2" style={{ backgroundColor: cardBg }}>
        {isOutOfStock ? (
          <button disabled className="w-full py-3 rounded-xl text-sm font-bold bg-gray-100 text-gray-400 cursor-not-allowed">
            Out of Stock
          </button>
        ) : isCartEnabled ? (
          <>
            <button
              onClick={handleAddToCart}
              disabled={!allVariationsSelected}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-all border border-current disabled:opacity-40 disabled:cursor-not-allowed rounded-xl`}
              style={{ color: btnBg, borderColor: btnBg, backgroundColor: `${btnBg}10` }}
            >
              {addedFeedback ? (
                <>✓ Added</>
              ) : (
                <><ShoppingCart size={15} /> Add to Cart</>
              )}
            </button>
            {!isProOrPremium && (
              <button
                onClick={handleOrder}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-all ${btnClasses}`}
                style={!btnClasses.includes('bg-') ? { backgroundColor: btnBg } : undefined}
              >
                <MessageCircle size={15} /> Order
              </button>
            )}
          </>
        ) : (
          <button
            onClick={handleOrder}
            className={`w-full flex items-center justify-center gap-2 py-3 text-sm font-bold transition-all ${btnClasses}`}
            style={!btnClasses.includes('bg-') ? { backgroundColor: btnBg } : undefined}
          >
            <MessageCircle size={15} /> Order — ₦{Number(product.price).toLocaleString()}
          </button>
        )}
      </div>
    </>
  )
}


/* ── Desktop Details ── */
function DesktopDetails({
  product, variations, hasVariations, selectedVariations, handleVariationSelect,
  quantity, setQuantity, isOutOfStock, isLowStock,
  textCol, headerFam, btnBg, btnClasses,
  isCartEnabled, isProOrPremium, allVariationsSelected,
  handleAddToCart, handleOrder, addedFeedback,
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-4">
        {/* Name + Price */}
        <div>
          <h2 className="text-xl font-bold leading-snug" style={{ fontFamily: headerFam }}>
            {product.name}
          </h2>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-2xl font-extrabold" style={{ color: btnBg }}>
              ₦{Number(product.price).toLocaleString()}
            </span>
            {product.avgRating > 0 && (
              <span className="flex items-center gap-1 text-sm">
                <Star size={14} className="text-amber-400 fill-amber-400" />
                <span className="font-bold">{Number(product.avgRating).toFixed(1)}</span>
                <span className="opacity-50">({product.reviewCount || 0})</span>
              </span>
            )}
          </div>
        </div>

        {/* Stock badges */}
        {isOutOfStock && (
          <span className="inline-block text-xs font-bold px-3 py-1 rounded-lg bg-red-50 text-red-600">Out of Stock</span>
        )}
        {isLowStock && (
          <span className="inline-block text-xs font-bold px-3 py-1 rounded-lg bg-amber-50 text-amber-600">
            Only {product.stock} left
          </span>
        )}

        {/* Variation Selectors */}
        {hasVariations && (
          <div className="space-y-3">
            {variations.map(group => (
              <VariationGroup
                key={group.groupName}
                group={group}
                selected={selectedVariations[group.groupName]}
                onSelect={handleVariationSelect}
                btnBg={btnBg}
                textCol={textCol}
              />
            ))}
          </div>
        )}

        {/* Description */}
        {product.description && (
          <p className="text-sm leading-relaxed opacity-70">{product.description}</p>
        )}

        {/* Quantity */}
        {isCartEnabled && !isOutOfStock && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold">Quantity</span>
            <div className="flex items-center border border-black/10 rounded-xl overflow-hidden">
              <button
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="w-9 h-9 flex items-center justify-center hover:bg-black/5 transition-colors"
              >
                <Minus size={14} />
              </button>
              <span className="w-10 text-center text-sm font-bold">{quantity}</span>
              <button
                onClick={() => setQuantity(q => q + 1)}
                className="w-9 h-9 flex items-center justify-center hover:bg-black/5 transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="pt-4 border-t border-black/5 flex gap-3">
        {isOutOfStock ? (
          <button disabled className="flex-1 py-3 rounded-xl text-sm font-bold bg-gray-100 text-gray-400 cursor-not-allowed">
            Out of Stock
          </button>
        ) : isCartEnabled ? (
          <>
            <button
              onClick={handleAddToCart}
              disabled={!allVariationsSelected}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-all border border-current disabled:opacity-40 disabled:cursor-not-allowed rounded-xl`}
              style={{ color: btnBg, borderColor: btnBg, backgroundColor: `${btnBg}10` }}
            >
              {addedFeedback ? (
                <>✓ Added</>
              ) : (
                <><ShoppingCart size={15} /> Add to Cart</>
              )}
            </button>
            {!isProOrPremium && (
              <button
                onClick={handleOrder}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-all ${btnClasses}`}
                style={!btnClasses.includes('bg-') ? { backgroundColor: btnBg } : undefined}
              >
                <MessageCircle size={15} /> Order
              </button>
            )}
          </>
        ) : (
          <button
            onClick={handleOrder}
            className={`w-full flex items-center justify-center gap-2 py-3 text-sm font-bold transition-all ${btnClasses}`}
            style={!btnClasses.includes('bg-') ? { backgroundColor: btnBg } : undefined}
          >
            <MessageCircle size={15} /> Order — ₦{Number(product.price).toLocaleString()}
          </button>
        )}
      </div>
    </div>
  )
}


/* ── Variation Group Selector ── */
function VariationGroup({ group, selected, onSelect, btnBg, textCol }) {
  const { groupName, displayType, options } = group

  if (displayType === 'pill') {
    return (
      <div>
        <p className="text-xs font-semibold mb-1.5 opacity-70">{groupName}</p>
        <div className="flex flex-wrap gap-2">
          {options.map(opt => {
            const isSelected = selected === opt.label
            return (
              <button
                key={opt.label}
                onClick={() => onSelect(groupName, opt.label)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all ${
                  isSelected
                    ? 'text-white shadow-md'
                    : 'border-black/15 hover:border-black/30'
                }`}
                style={isSelected ? { backgroundColor: btnBg, borderColor: btnBg } : { color: textCol }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  if (displayType === 'color-swatch') {
    return (
      <div>
        <p className="text-xs font-semibold mb-1.5 opacity-70">{groupName}</p>
        <div className="flex flex-wrap gap-2.5">
          {options.map(opt => {
            const isSelected = selected === opt.label
            return (
              <button
                key={opt.label}
                onClick={() => onSelect(groupName, opt.label)}
                title={opt.label}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  isSelected ? 'ring-2 ring-offset-2 scale-110' : 'hover:scale-105'
                }`}
                style={{
                  backgroundColor: opt.value || opt.label,
                  borderColor: isSelected ? btnBg : 'rgba(0,0,0,0.1)',
                  ringColor: btnBg,
                }}
              />
            )
          })}
        </div>
        {selected && <p className="text-xs mt-1 opacity-50">{selected}</p>}
      </div>
    )
  }

  if (displayType === 'dropdown') {
    return (
      <div>
        <p className="text-xs font-semibold mb-1.5 opacity-70">{groupName}</p>
        <select
          value={selected || ''}
          onChange={e => onSelect(groupName, e.target.value || undefined)}
          className="w-full px-3 py-2.5 border border-black/15 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-green-400/20 transition-all"
          style={{ color: textCol }}
        >
          <option value="">Select {groupName}...</option>
          {options.map(opt => (
            <option key={opt.label} value={opt.label}>{opt.label}</option>
          ))}
        </select>
      </div>
    )
  }

  if (displayType === 'text-field') {
    return (
      <div>
        <p className="text-xs font-semibold mb-1.5 opacity-70">{groupName}</p>
        <input
          type="text"
          value={selected || ''}
          onChange={e => onSelect(groupName, e.target.value || undefined)}
          placeholder={`Enter ${groupName}...`}
          className="w-full px-3 py-2.5 border border-black/15 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-400/20 transition-all bg-white"
          style={{ color: textCol }}
        />
      </div>
    )
  }

  return null
}
