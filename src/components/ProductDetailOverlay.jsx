import { useState, useEffect } from 'react'
import {
  X, ChevronLeft, ChevronRight, Plus, Minus,
  MessageCircle, Package, Star, ShoppingCart, Check,
} from 'lucide-react'
import { buildOrderURL } from '../utils/whatsapp'
import {
  normaliseGroups, splitGroups, priceSelection, selectionLabel, missingRequired, isSoldOut,
  qtyOf, maxQtyFor,
} from '../utils/productOptions'

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
  // { [groupName]: string } for a single pick, { [groupName]: string[] } for extras.
  const [selection, setSelection] = useState({})
  const [quantity, setQuantity] = useState(1)
  const [addedFeedback, setAddedFeedback] = useState(false)

  useEffect(() => {
    if (!product) return
    setActiveImg(0)
    setSelection({})
    setQuantity(1)
    setAddedFeedback(false)
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [product?.id])

  if (!product) return null

  const images = product.imageUrls?.length ? product.imageUrls : []
  const hasMultiple = images.length > 1
  const groups = normaliseGroups(product)
  const { single: singleGroups, extras: extrasGroups } = splitGroups(groups)
  const hasVariations = groups.length > 0

  const isOutOfStock = typeof product.stock === 'number' && product.stock === 0
  const isLowStock = typeof product.stock === 'number' && product.stock > 0 && product.stock <= 5

  const btnBg = activeThemeObj?.defaultColors?.primary || themePrimary || '#16a34a'
  const btnClasses = activeThemeObj?.structuralStyle?.buttonClasses ||
    'bg-green-500 hover:bg-green-600 active:bg-green-700 active:scale-95 text-white rounded-xl'
  const cardBg = activeThemeObj?.defaultColors?.card || themeCard || '#ffffff'
  const textCol = activeThemeObj?.defaultColors?.text || themeText || '#111827'
  const fontFam = activeThemeObj?.typography?.bodyFontFamily || bodyFont
  const headerFam = activeThemeObj?.typography?.headerFontFamily || headerFont

  // Priced with the same function the server uses at checkout, so the running
  // total here can never disagree with what is actually charged.
  const { chosen, extrasTotal } = priceSelection(groups, selection)
  const basePrice = Number(product.price) || 0
  const unitPrice = basePrice + extrasTotal
  const optionsLabel = selectionLabel(chosen)
  const stillNeeded = missingRequired(groups, selection)
  const canAddToCart = stillNeeded.length === 0

  const selectSingle = (groupName, value) => {
    setSelection(prev => {
      const next = { ...prev }
      if (!value || next[groupName] === value) delete next[groupName]
      else next[groupName] = value
      return next
    })
  }

  /**
   * Sets how many of one extra the customer wants.
   *
   * Extras are stored as { [groupName]: { [label]: qty } }. Setting 0 removes
   * the extra, and removing the last one removes the group, so an untouched
   * group never rides along in the cart or the order record.
   */
  const setExtraQty = (groupName, label, qty) => {
    setSelection(prev => {
      const current = { ...(prev[groupName] && !Array.isArray(prev[groupName]) ? prev[groupName] : {}) }
      // A selection made before quantities existed is a plain array of labels.
      if (Array.isArray(prev[groupName])) {
        for (const l of prev[groupName]) current[String(l)] = 1
      }

      const next = Math.max(0, Math.floor(Number(qty) || 0))
      if (next <= 0) delete current[label]
      else current[label] = next

      const out = { ...prev }
      if (Object.keys(current).length) out[groupName] = current
      else delete out[groupName]
      return out
    })
  }

  const toggleExtra = (groupName, label, option) => {
    const current = qtyOf(selection, groupName, label)
    // Tapping the row adds one, or clears it if it is already there.
    setExtraQty(groupName, label, current > 0 ? 0 : Math.min(1, maxQtyFor(option)))
  }

  const opts = {
    singleGroups,
    extrasGroups,
    selection,
    selectSingle,
    toggleExtra,
    setExtraQty,
    unitPrice,
    basePrice,
    extrasTotal,
    stillNeeded,
    quantity,
  }

  const handleAddToCart = () => {
    if (!canAddToCart) return
    onAddToCart({
      ...product,
      quantity,
      unitPrice,
      selectedOptions: chosen.length ? selection : undefined,
      optionsLabel: optionsLabel || undefined,
    })
    setAddedFeedback(true)
    setTimeout(() => setAddedFeedback(false), 1500)
  }

  const handleOrder = () => {
    const url = buildOrderURL(
      whatsappNumber,
      product.name,
      unitPrice,
      product.id,
      storeUrl,
      product.type || 'physical',
      optionsLabel,
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
            opts={opts}
            hasVariations={hasVariations}
            quantity={quantity}
            setQuantity={setQuantity}
            isOutOfStock={isOutOfStock}
            isLowStock={isLowStock}
            textCol={textCol}
            headerFam={headerFam}
            btnBg={btnBg}
            btnClasses={btnClasses}
            cardBg={cardBg}
            isCartEnabled={isCartEnabled}
            isProOrPremium={isProOrPremium}
            canAddToCart={canAddToCart}
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
            opts={opts}
            hasVariations={hasVariations}
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
            canAddToCart={canAddToCart}
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
  opts, hasVariations,
  quantity, setQuantity, isOutOfStock, isLowStock,
  textCol, headerFam, btnBg, btnClasses, cardBg,
  isCartEnabled, isProOrPremium, canAddToCart,
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

        {/* Options and extras */}
        {hasVariations && (
          <div className="space-y-4">
            {opts.singleGroups.map(group => (
              <VariationGroup
                key={group.groupName}
                group={group}
                selected={opts.selection[group.groupName]}
                onSelect={opts.selectSingle}
                btnBg={btnBg}
                textCol={textCol}
              />
            ))}
            {opts.extrasGroups.map(group => (
              <ExtrasGroup
                key={group.groupName}
                group={group}
                selection={opts.selection}
                onToggle={opts.toggleExtra}
                onSetQty={opts.setExtraQty}
                btnBg={btnBg}
              />
            ))}
            {opts.extrasTotal > 0 && (
              <div className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ backgroundColor: `${btnBg}0f` }}>
                <span className="text-xs font-semibold opacity-70">
                  ₦{opts.basePrice.toLocaleString()} + ₦{opts.extrasTotal.toLocaleString()} extras
                </span>
                <span className="text-sm font-extrabold" style={{ color: btnBg }}>
                  ₦{opts.unitPrice.toLocaleString()} each
                </span>
              </div>
            )}
            {opts.stillNeeded.length > 0 && (
              <p className="text-[11px] font-semibold text-amber-600">
                Please choose {opts.stillNeeded.join(' and ')} first.
              </p>
            )}
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
              disabled={!canAddToCart}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-all border border-current disabled:opacity-40 disabled:cursor-not-allowed rounded-xl`}
              style={{ color: btnBg, borderColor: btnBg, backgroundColor: `${btnBg}10` }}
            >
              {addedFeedback ? (
                <>✓ Added</>
              ) : (
                <><ShoppingCart size={15} /> Add · ₦{(opts.unitPrice * quantity).toLocaleString()}</>
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
            <MessageCircle size={15} /> Order: ₦{Number(product.price).toLocaleString()}
          </button>
        )}
      </div>
    </>
  )
}


/* ── Desktop Details ── */
function DesktopDetails({
  product, opts, hasVariations,
  quantity, setQuantity, isOutOfStock, isLowStock,
  textCol, headerFam, btnBg, btnClasses,
  isCartEnabled, isProOrPremium, canAddToCart,
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

        {/* Options and extras */}
        {hasVariations && (
          <div className="space-y-4">
            {opts.singleGroups.map(group => (
              <VariationGroup
                key={group.groupName}
                group={group}
                selected={opts.selection[group.groupName]}
                onSelect={opts.selectSingle}
                btnBg={btnBg}
                textCol={textCol}
              />
            ))}
            {opts.extrasGroups.map(group => (
              <ExtrasGroup
                key={group.groupName}
                group={group}
                selection={opts.selection}
                onToggle={opts.toggleExtra}
                onSetQty={opts.setExtraQty}
                btnBg={btnBg}
              />
            ))}
            {opts.extrasTotal > 0 && (
              <div className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ backgroundColor: `${btnBg}0f` }}>
                <span className="text-xs font-semibold opacity-70">
                  ₦{opts.basePrice.toLocaleString()} + ₦{opts.extrasTotal.toLocaleString()} extras
                </span>
                <span className="text-sm font-extrabold" style={{ color: btnBg }}>
                  ₦{opts.unitPrice.toLocaleString()} each
                </span>
              </div>
            )}
            {opts.stillNeeded.length > 0 && (
              <p className="text-[11px] font-semibold text-amber-600">
                Please choose {opts.stillNeeded.join(' and ')} first.
              </p>
            )}
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
              disabled={!canAddToCart}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-all border border-current disabled:opacity-40 disabled:cursor-not-allowed rounded-xl`}
              style={{ color: btnBg, borderColor: btnBg, backgroundColor: `${btnBg}10` }}
            >
              {addedFeedback ? (
                <>✓ Added</>
              ) : (
                <><ShoppingCart size={15} /> Add · ₦{(opts.unitPrice * quantity).toLocaleString()}</>
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
            <MessageCircle size={15} /> Order: ₦{Number(product.price).toLocaleString()}
          </button>
        )}
      </div>
    </div>
  )
}


/** "+₦15,000" next to an option that costs more. Nothing for a free one. */
const priceSuffix = (opt) => (Number(opt?.price) > 0 ? ` +₦${Number(opt.price).toLocaleString()}` : '')

/* ── Variation Group Selector (choose one) ── */
function VariationGroup({ group, selected, onSelect, btnBg, textCol }) {
  const { groupName, displayType, options } = group

  if (displayType === 'pill') {
    return (
      <div>
        <p className="text-xs font-semibold mb-1.5 opacity-70">{groupName}</p>
        <div className="flex flex-wrap gap-2">
          {options.map(opt => {
            const isSelected = selected === opt.label
            const soldOut = isSoldOut(opt)
            return (
              <button
                key={opt.label}
                onClick={() => !soldOut && onSelect(groupName, opt.label)}
                disabled={soldOut}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all ${
                  isSelected
                    ? 'text-white shadow-md'
                    : 'border-black/15 hover:border-black/30'
                } ${soldOut ? 'opacity-40 line-through cursor-not-allowed' : ''}`}
                style={isSelected ? { backgroundColor: btnBg, borderColor: btnBg } : { color: textCol }}
              >
                {opt.label}{priceSuffix(opt)}
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
            <option key={opt.label} value={opt.label} disabled={isSoldOut(opt)}>
              {opt.label}{priceSuffix(opt)}{isSoldOut(opt) ? ' (sold out)' : ''}
            </option>
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


/* ── Extras (take as many as you like, and as many of each) ──
   Tapping the row adds one. Once it is in, a stepper appears so a customer
   wanting two portions of chicken says so here rather than ordering the soup
   twice. The plus stops at the stock the vendor set, and at a flat ceiling when
   they are not counting. */
function ExtrasGroup({ group, selection, onToggle, onSetQty, btnBg }) {
  const { groupName, options } = group

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <p className="text-xs font-semibold opacity-70">{groupName}</p>
        <span className="text-[10px] font-semibold opacity-40">Optional</span>
      </div>
      <div className="space-y-1.5">
        {options.map(opt => {
          const qty = qtyOf(selection, groupName, opt.label)
          const isPicked = qty > 0
          const soldOut = isSoldOut(opt)
          const ceiling = maxQtyFor(opt)
          const atCeiling = qty >= ceiling
          const low = !soldOut && opt.stock !== null && opt.stock <= 5

          return (
            <div
              key={opt.label}
              className={`w-full flex items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-all ${
                isPicked ? 'shadow-sm' : 'border-black/10'
              } ${soldOut ? 'opacity-45' : ''}`}
              style={isPicked ? { borderColor: btnBg, backgroundColor: `${btnBg}0f` } : undefined}
            >
              {/* The label side toggles; the stepper on the right adjusts. */}
              <button
                type="button"
                onClick={() => !soldOut && onToggle(groupName, opt.label, opt)}
                disabled={soldOut}
                aria-pressed={isPicked}
                className={`flex min-w-0 flex-1 items-center gap-2.5 text-left ${soldOut ? 'cursor-not-allowed' : ''}`}
              >
                <span
                  className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border"
                  style={isPicked ? { backgroundColor: btnBg, borderColor: btnBg } : { borderColor: 'rgba(0,0,0,0.25)' }}
                >
                  {isPicked && <Check size={11} className="text-white" strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-xs font-bold ${soldOut ? 'line-through' : ''}`}>{opt.label}</span>
                  {soldOut ? (
                    <span className="text-[10px] font-semibold text-red-500">Sold out</span>
                  ) : low ? (
                    <span className="text-[10px] font-semibold text-amber-600">Only {opt.stock} left</span>
                  ) : null}
                </span>
              </button>

              <span className="flex-shrink-0 text-xs font-extrabold" style={{ color: btnBg }}>
                {Number(opt.price) > 0 ? `+₦${Number(opt.price).toLocaleString()}` : 'Free'}
              </span>

              {isPicked && !soldOut && (
                <span className="flex flex-shrink-0 items-center gap-1 rounded-lg border border-black/10 bg-white/70">
                  <button
                    type="button"
                    onClick={() => onSetQty(groupName, opt.label, qty - 1)}
                    aria-label={`One less ${opt.label}`}
                    className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-black/5"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-5 text-center text-xs font-bold tabular-nums" aria-live="polite">{qty}</span>
                  <button
                    type="button"
                    onClick={() => onSetQty(groupName, opt.label, qty + 1)}
                    disabled={atCeiling}
                    aria-label={`One more ${opt.label}`}
                    title={atCeiling && opt.stock !== null ? `Only ${opt.stock} left` : undefined}
                    className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Plus size={12} />
                  </button>
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
