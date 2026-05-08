import {
  Plus, Edit2, Trash2, UploadCloud, X, Loader2,
  AlertCircle, ImageIcon, Package, ToggleLeft, ToggleRight, Lock,
} from 'lucide-react'


export default function ProductsTab({
  plan, productCount, maxProducts, maxImagesPerProduct, isGrowthOrPro, limitReached,
  showForm, setShowForm, editingProduct, form, formError, saving, loading,
  products, deleting,
  handleImageChange, handleRemoveExistingImage, handleRemoveNewImage,
  handleFormName, handleFormPrice, handleFormDesc,
  handleSave, resetForm, startEdit, handleDelete,
  onToggleActive,
}) {
  const maxLabel = maxProducts >= 999999 ? 'Unlimited' : maxProducts
  const pct      = maxProducts >= 999999 ? 0 : Math.min(100, Math.round((productCount / maxProducts) * 100))


  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Products</h1>
          <p className="text-gray-400 text-sm mt-1">Manage your store products and inventory.</p>
        </div>
        {!limitReached && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex-shrink-0 shadow-sm"
          >
            <Plus size={15} /> Add Product
          </button>
        )}
      </div>


      {/* Product count bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-sm font-semibold text-gray-700">
            {productCount} of {maxLabel} products used
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
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-4">
          <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-800 font-semibold text-sm">{plan === 'starter' ? 'Free plan' : 'Plan'} limit reached — {maxProducts}/{maxProducts} products</p>
            <p className="text-amber-700 text-xs mt-0.5">You've used all {maxProducts} product slots. Upgrade your plan to add more.</p>
          </div>
        </div>
      )}


      {/* Add / Edit Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900 text-base">{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
            <button onClick={resetForm} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
              <X size={17} />
            </button>
          </div>
          <div className="p-5 space-y-4">
            {formError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
                <AlertCircle size={14} /> {formError}
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Product Name *</label>
                <input value={form.name} onChange={handleFormName} placeholder="e.g. Blue Ankara Blouse" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Price (₦) *</label>
                <input value={form.price} onChange={handleFormPrice} type="number" min="0" placeholder="e.g. 5000" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Description</label>
              <textarea value={form.description} onChange={handleFormDesc} rows={3} placeholder="Describe your product..." className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 resize-none transition-all" />
            </div>


            {/* Images */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Images
                <span className="ml-1.5 text-gray-400 font-normal">PNG or JPG, max 5MB each. Up to {maxImagesPerProduct} images.</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {/* Existing URLs */}
                {form.imageUrls.map((url, i) => (
                  <div key={`ex-${i}`} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 group">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => handleRemoveExistingImage(url)} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <X size={16} className="text-white" />
                    </button>
                  </div>
                ))}
                {/* New previews */}
                {form.imagePreviews.map((src, i) => (
                  <div key={`new-${i}`} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 group">
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => handleRemoveNewImage(i)} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <X size={16} className="text-white" />
                    </button>
                  </div>
                ))}
                {/* Upload slot */}
                {(form.imageUrls.length + form.imagePreviews.length) < maxImagesPerProduct && (
                  <label className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-green-400 hover:bg-green-50/30 transition-all group">
                    <UploadCloud size={16} className="text-gray-300 group-hover:text-green-400 transition-colors mb-0.5" />
                    <span className="text-[10px] text-gray-300 group-hover:text-green-400 font-medium">Upload</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />
                  </label>
                )}
              </div>
            </div>


            <div className="flex gap-3 pt-1">
              <button onClick={resetForm} className="flex-1 sm:flex-none px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
              >
                {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : editingProduct ? 'Update Product' : 'Add Product'}
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
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center">
            <Package size={24} className="text-green-400" />
          </div>
          <div className="text-center">
            <p className="font-bold text-gray-800">No products yet</p>
            <p className="text-gray-400 text-sm mt-1 max-w-xs">Add your first product to start getting orders.</p>
          </div>
          {!limitReached && (
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all">
              <Plus size={14} /> Add Product
            </button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(product => {
            const isInactive = product.isActive === false
            return (
              <div
                key={product.id}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                  isInactive ? 'border-gray-100 opacity-70' : 'border-gray-100 hover:shadow-md'
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
                </div>


                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">{product.name}</p>
                  </div>
                  <p className="text-green-600 font-extrabold text-base">₦{Number(product.price).toLocaleString()}</p>
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

