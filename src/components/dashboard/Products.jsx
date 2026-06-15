import { useState } from 'react'
import {
  Plus, Edit2, Trash2, UploadCloud, X, Loader2,
  AlertCircle, ImageIcon, Package, ToggleLeft, ToggleRight, Lock, Sparkles,
  ChevronDown, GripVertical,
} from 'lucide-react'
import { NIGERIAN_MARKET_CATEGORIES, VARIATION_DISPLAY_TYPES } from '../../utils/categories'


export default function ProductsTab({
  plan, productCount, maxProducts, maxImagesPerProduct, isGrowthOrPro, limitReached,
  showForm, setShowForm, editingProduct, form, formError, saving, loading,
  products, deleting,
  handleImageChange, handleRemoveExistingImage, handleRemoveNewImage,
  handleFormName, handleFormPrice, handleFormDesc, handleFormCategory, handleFormStock,
  onGenerateDescription, generatingDesc, aiDescError,
  handleSave, resetForm, startEdit, handleDelete,
  onToggleActive,
  customCategories = [],
  onSaveCustomCategory,
  setForm,
}) {
  const maxLabel = maxProducts >= 999999 ? 'Unlimited' : maxProducts
  const pct      = maxProducts >= 999999 ? 0 : Math.min(100, Math.round((productCount / maxProducts) * 100))

  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [customCategoryInput, setCustomCategoryInput] = useState('')
  const [showCustomCategoryInput, setShowCustomCategoryInput] = useState(false)
  const [savingCategory, setSavingCategory] = useState(false)

  const [variationsOpen, setVariationsOpen] = useState(false)

  const allCategories = [
    ...NIGERIAN_MARKET_CATEGORIES,
    ...customCategories.map(c => ({ id: c.id, label: c.name })),
  ]

  const selectedCategoryLabel = (() => {
    const found = allCategories.find(c => c.label === form.category)
    if (found) return found.label
    if (form.category) return form.category
    return ''
  })()

  const handleCategorySelect = (label) => {
    setForm(p => ({ ...p, category: label }))
    setShowCategoryDropdown(false)
  }

  const handleCreateCustomCategory = async () => {
    const name = customCategoryInput.trim()
    if (!name) return
    setSavingCategory(true)
    try {
      await onSaveCustomCategory(name)
      setForm(p => ({ ...p, category: name }))
      setCustomCategoryInput('')
      setShowCustomCategoryInput(false)
      setShowCategoryDropdown(false)
    } finally {
      setSavingCategory(false)
    }
  }

  const handleAddVariationGroup = () => {
    const newGroup = { groupName: '', displayType: 'pill', options: [] }
    setForm(p => ({ ...p, variations: [...(p.variations || []), newGroup] }))
  }

  const handleRemoveVariationGroup = (index) => {
    setForm(p => ({
      ...p,
      variations: p.variations.filter((_, i) => i !== index),
    }))
  }

  const handleVariationGroupChange = (index, field, value) => {
    setForm(p => ({
      ...p,
      variations: p.variations.map((g, i) =>
        i === index ? { ...g, [field]: value } : g
      ),
    }))
  }

  const handleVariationOptionsChange = (index, rawInput) => {
    const options = rawInput.split(',').map(s => s.trim()).filter(Boolean).map(label => ({ label, value: label }))
    setForm(p => ({
      ...p,
      variations: p.variations.map((g, i) =>
        i === index ? { ...g, options } : g
      ),
    }))
  }

  const renderFormFields = () => (
    <>
      {formError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
          <AlertCircle size={14} /> {formError}
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Offer Name *</label>
          <input value={form.name} onChange={handleFormName} placeholder="e.g. Blue Ankara Blouse" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none bg-white focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Price (₦) *</label>
          <input value={form.price} onChange={handleFormPrice} type="number" min="0" placeholder="e.g. 5000" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none bg-white focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all" />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-semibold text-gray-700">Description</label>
          {isGrowthOrPro ? (
            <button
              type="button"
              onClick={onGenerateDescription}
              disabled={generatingDesc || !form.name.trim()}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all border border-green-200"
            >
              {generatingDesc
                ? <><Loader2 size={11} className="animate-spin" /> Generating...</>
                : <><Sparkles size={11} /> Generate with AI</>
              }
            </button>
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-gray-400 font-semibold px-2 py-1 rounded-lg bg-gray-50 border border-gray-200">
              <Lock size={10} /> AI — Growth+
            </span>
          )}
        </div>
        <textarea value={form.description} onChange={handleFormDesc} rows={3} placeholder="Describe this product or service..." className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none bg-white focus:border-green-400 focus:ring-2 focus:ring-green-400/20 resize-none transition-all" />
        {aiDescError && (
          <p className="text-red-500 text-xs font-medium mt-1.5">{aiDescError}</p>
        )}
      </div>

      {/* Category */}
      <div className="relative">
        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Category</label>
        <button
          type="button"
          onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-left bg-white hover:border-green-400 focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all flex items-center justify-between"
        >
          <span className={selectedCategoryLabel ? 'text-gray-900' : 'text-gray-400'}>
            {selectedCategoryLabel || 'Select a category...'}
          </span>
          <ChevronDown size={14} className={`text-gray-400 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
        </button>
        {showCategoryDropdown && (
          <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
            {allCategories.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategorySelect(cat.label)}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-green-50 transition-colors ${
                  form.category === cat.label ? 'bg-green-50 text-green-700 font-semibold' : 'text-gray-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
            <div className="border-t border-gray-100">
              {!showCustomCategoryInput ? (
                <button
                  type="button"
                  onClick={() => setShowCustomCategoryInput(true)}
                  className="w-full text-left px-4 py-2.5 text-sm text-green-600 font-semibold hover:bg-green-50 transition-colors flex items-center gap-2"
                >
                  <Plus size={14} /> Create Custom Category
                </button>
              ) : (
                <div className="p-3 flex gap-2">
                  <input
                    value={customCategoryInput}
                    onChange={e => setCustomCategoryInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreateCustomCategory()}
                    placeholder="Category name..."
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-green-400"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleCreateCustomCategory}
                    disabled={savingCategory || !customCategoryInput.trim()}
                    className="px-3 py-2 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
                  >
                    {savingCategory ? <Loader2 size={12} className="animate-spin" /> : 'Save'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        <p className="text-gray-400 text-xs mt-1.5">Customers can filter your page by category.</p>
      </div>

      {/* Stock */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Stock Count</label>
        <input
          value={form.stock}
          onChange={handleFormStock}
          type="number"
          min="0"
          placeholder="e.g. 10"
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none bg-white focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all"
        />
        <p className="text-gray-400 text-xs mt-1.5">Leave blank if you don't track stock. Set to 0 to mark as out of stock.</p>
      </div>

      {/* Variations */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setVariationsOpen(!variationsOpen)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <span className="flex items-center gap-2">
            <GripVertical size={14} className="text-gray-400" />
            Variations / Specification Options
            {(form.variations?.length > 0) && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-600">
                {form.variations.length}
              </span>
            )}
          </span>
          <ChevronDown size={14} className={`text-gray-400 transition-transform ${variationsOpen ? 'rotate-180' : ''}`} />
        </button>
        {variationsOpen && (
          <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
            {(form.variations || []).length === 0 && (
              <p className="text-xs text-gray-400 text-center py-2">
                No variations yet. Add options like Size, Color, or RAM.
              </p>
            )}
            {(form.variations || []).map((group, idx) => (
              <div key={idx} className="bg-gray-50 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    value={group.groupName}
                    onChange={e => handleVariationGroupChange(idx, 'groupName', e.target.value)}
                    placeholder="Option group name (e.g. Shoe Size)"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white focus:border-green-400"
                  />
                  <select
                    value={group.displayType}
                    onChange={e => handleVariationGroupChange(idx, 'displayType', e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white focus:border-green-400"
                  >
                    {VARIATION_DISPLAY_TYPES.map(dt => (
                      <option key={dt.id} value={dt.id}>{dt.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRemoveVariationGroup(idx)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
                <input
                  value={group.options.map(o => o.label).join(', ')}
                  onChange={e => handleVariationOptionsChange(idx, e.target.value)}
                  placeholder="Options (comma-separated: 40, 42, 44)"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white focus:border-green-400"
                />
                <p className="text-[10px] text-gray-400">
                  Display: <span className="font-semibold capitalize">{group.displayType.replace('-', ' ')}</span>
                  {group.options.length > 0 && <> · {group.options.length} options</>}
                </p>
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddVariationGroup}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-green-600 bg-green-50 hover:bg-green-100 rounded-xl transition-colors border border-dashed border-green-300"
            >
              <Plus size={14} /> Add Variation Group
            </button>
          </div>
        )}
      </div>

      {/* Images */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-2">
          Images
          <span className="ml-1.5 text-gray-400 font-normal">PNG or JPG, max 5MB each. Up to {maxImagesPerProduct} images.</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {form.imageUrls.map((url, i) => (
            <div key={`ex-${i}`} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 group">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button onClick={() => handleRemoveExistingImage(url)} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <X size={16} className="text-white" />
              </button>
            </div>
          ))}
          {form.imagePreviews.map((src, i) => (
            <div key={`new-${i}`} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 group">
              <img src={src} alt="" className="w-full h-full object-cover" />
              <button onClick={() => handleRemoveNewImage(i)} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <X size={16} className="text-white" />
              </button>
            </div>
          ))}
          {(form.imageUrls.length + form.imagePreviews.length) < maxImagesPerProduct && (
            <label className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-green-400 hover:bg-green-50/30 transition-all group">
              <UploadCloud size={16} className="text-gray-300 group-hover:text-green-400 transition-colors mb-0.5" />
              <span className="text-[10px] text-gray-300 group-hover:text-green-400 font-medium">Upload</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />
            </label>
          )}
        </div>
      </div>
    </>
  )



  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Offers</h1>
          <p className="text-gray-400 text-sm mt-1">Manage products, services, prices, stock, and visibility.</p>
        </div>
        {!limitReached && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex-shrink-0 shadow-sm hover:shadow-md"
          >
            <Plus size={15} /> Add Offer
          </button>
        )}
      </div>



      {/* Product count bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-gray-100/80 px-5 py-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-sm font-semibold text-gray-700">
            {productCount} of {maxLabel} listings used
          </p>
          <span className="text-xs font-bold text-gray-400 capitalize">{plan} plan</span>
        </div>
        {maxProducts < 999999 && (
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-amber-400' : 'bg-green-400'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>



      {/* Limit warning */}
      {limitReached && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-4 shadow-sm shadow-amber-100/70">
          <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-800 font-semibold text-sm">{plan === 'starter' ? 'Starter' : 'Plan'} limit reached - {maxProducts}/{maxProducts} listings</p>
            <p className="text-amber-700 text-xs mt-0.5">You've used all {maxProducts} listing slots. Upgrade your plan to add more.</p>
          </div>
        </div>
      )}



      {/* Add Form */}
      {showForm && !editingProduct && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-gray-100/80 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900 text-base">Add New Offer</h2>
            <button onClick={resetForm} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
              <X size={17} />
            </button>
          </div>
          <div className="p-5 space-y-4">
            {renderFormFields()}
            <div className="flex gap-3 pt-1">
              <button onClick={resetForm} className="flex-1 sm:flex-none px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
              >
                {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : 'Add Offer'}
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Product list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="text-green-500 animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-gray-100/80 flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center">
            <Package size={24} className="text-green-400" />
          </div>
          <div className="text-center">
            <p className="font-bold text-gray-800">No offers yet</p>
            <p className="text-gray-400 text-sm mt-1 max-w-xs">Add your first product or service to start receiving customer interest.</p>
          </div>
          {!limitReached && (
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm hover:shadow-md">
              <Plus size={14} /> Add Offer
            </button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(product => {
            const isInactive = product.isActive === false
            if (editingProduct?.id === product.id) {
              return (
                <div key={product.id} className="bg-white rounded-2xl border border-green-200 shadow-lg shadow-green-100/70 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h2 className="font-bold text-gray-900 text-base">Edit Product</h2>
                    <button onClick={resetForm} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                      <X size={17} />
                    </button>
                  </div>
                  <div className="p-5 space-y-4">
                    {renderFormFields()}
                    <div className="flex gap-3 pt-1">
                      <button onClick={resetForm} className="flex-1 sm:flex-none px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 sm:flex-none px-6 py-2.5 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                      >
                        {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : 'Update Offer'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            }
            return (
              <div
                key={product.id}
                className={`bg-white rounded-2xl border shadow-sm shadow-gray-100/70 overflow-hidden transition-all ${
                  isInactive ? 'border-gray-100 opacity-70' : 'border-gray-100 hover:border-green-100 hover:shadow-lg hover:shadow-gray-200/80 hover:-translate-y-0.5'
                }`}
              >
                {/* Product image */}
                <div className="aspect-video bg-gray-100 overflow-hidden relative">
                  {product.imageUrls?.length > 0 ? (
                    <img src={product.imageUrls[0]} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                      <ImageIcon size={20} className="text-gray-300" />
                      <p className="text-xs text-gray-300">No image</p>
                    </div>
                  )}
                  {isInactive && (
                    <div className="absolute top-2 left-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-800/80 text-white rounded-full">Hidden</span>
                    </div>
                  )}
                  {product.imageUrls?.length > 1 && (
                    <div className="absolute top-2 right-2">
                      <span className="text-[10px] font-semibold px-2 py-0.5 bg-black/50 text-white rounded-full">+{product.imageUrls.length - 1}</span>
                    </div>
                  )}
                  {product.variations?.length > 0 && (
                    <div className="absolute bottom-2 left-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-500/80 text-white rounded-full">{product.variations.length} variation{product.variations.length > 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>



                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">{product.name}</p>
                  </div>
                  <p className="text-green-600 font-extrabold text-base">₦{Number(product.price).toLocaleString()}</p>
                  {product.stock !== null && product.stock !== undefined && (
                    <div>
                      {product.stock === 0 ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-500 border border-red-200">Out of Stock</span>
                      ) : product.stock > 0 && product.stock <= 5 ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">{product.stock} left</span>
                      ) : product.stock > 5 ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-200">{product.stock} in stock</span>
                      ) : null}
                    </div>
                  )}
                  {product.description && (
                    <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed">{product.description}</p>
                  )}



                  {/* Actions row */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => startEdit(product)}
                        className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        disabled={deleting === product.id}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        {deleting === product.id
                          ? <Loader2 size={14} className="animate-spin" />
                          : <Trash2 size={14} />
                        }
                      </button>
                    </div>

                    {/* Product on/off toggle — Growth/Pro only */}
                    <div className="flex items-center gap-1.5">
                      {isGrowthOrPro ? (
                        <button
                          onClick={() => onToggleActive(product)}
                          disabled={!isGrowthOrPro}
                          className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors ${
                            isInactive
                              ? 'text-gray-400 bg-gray-100 hover:bg-gray-200'
                              : 'text-green-600 bg-green-50 hover:bg-green-100'
                          }`}
                          title={isInactive ? 'Make visible' : 'Hide product'}
                        >
                          {isInactive
                            ? <ToggleLeft size={14} />
                            : <ToggleRight size={14} />
                          }
                          {isInactive ? 'Off' : 'On'}
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 text-[10px] text-gray-300 px-2 py-1 rounded-lg" title="Product toggle available on Growth+">
                          <Lock size={10} /> Toggle
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
