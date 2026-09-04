//src/components/dashboard/ServicesTab.jsx/
import { useState } from 'react'
import {
  Plus, Edit2, Trash2, UploadCloud, X, Loader2,
  AlertCircle, ImageIcon, Calendar, ToggleLeft, ToggleRight, Lock, Sparkles, Clock, MapPin, Video,
  Search, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { SkeletonCardGrid } from '../Skeleton'

const SERVICES_PER_PAGE = 10

export default function ServicesTab({
  plan, serviceCount, maxServices, maxImagesPerProduct, isGrowthOrPro, limitReached,
  showForm, setShowForm, editingService, form, formError, saving, loading,
  services, deleting,
  handleImageChange, handleRemoveExistingImage, handleRemoveNewImage,
  handleFormName, handleFormPrice, handleFormDesc, handleFormCategory,
  handleFormDuration, handleFormLocationType, handleFormBookingNote,
  onGenerateDescription, generatingDesc, aiDescError,
  handleSave, resetForm, startEdit, handleDelete,
  onToggleActive,
}) {
  const maxLabel = maxServices >= 999999 ? 'Unlimited' : maxServices
  const pct      = maxServices >= 999999 ? 0 : Math.min(100, Math.round((serviceCount / maxServices) * 100))
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const filteredServices = services.filter(service =>
    (service.name || '').toLowerCase().includes(searchTerm.trim().toLowerCase())
  )
  const totalPages = Math.max(1, Math.ceil(filteredServices.length / SERVICES_PER_PAGE))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const paginatedServices = filteredServices.slice(
    (safeCurrentPage - 1) * SERVICES_PER_PAGE,
    safeCurrentPage * SERVICES_PER_PAGE
  )

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value)
    setCurrentPage(1)
  }

  return (
    <div className="p-4 sm:p-5 max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Services</h1>
          <p className="text-gray-400 text-xs mt-0.5">Manage bookable services, session durations, location types, and booking instructions.</p>
        </div>
        {!limitReached && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0"
          >
            <Plus size={14} /> Add Service
          </button>
        )}
      </div>

      {/* Service count bar */}
      <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3.5">
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-xs font-semibold text-gray-700">
            {serviceCount} of {maxLabel} listings used
          </p>
          <span className="text-xs font-bold text-gray-400 capitalize">{plan} plan</span>
        </div>
        {maxServices < 999999 && (
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
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          <AlertCircle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-800 font-semibold text-xs">{plan === 'starter' ? 'Starter' : 'Plan'} limit reached - {maxServices}/{maxServices} listings</p>
            <p className="text-amber-700 text-xs mt-0.5">You've used all {maxServices} listing slots. Upgrade your plan to add more.</p>
          </div>
        </div>
      )}

      {/* Add / Edit Form */}
      {showForm && !editingService && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="font-bold text-gray-900 text-sm">{editingService ? 'Edit Service' : 'Add New Service'}</h2>
            <button onClick={resetForm} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
              <X size={15} />
            </button>
          </div>
          <div className="p-4 space-y-4">
            {formError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
                <AlertCircle size={14} /> {formError}
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 font-bold">Service Name *</label>
                <input value={form.name} onChange={handleFormName} placeholder="e.g. 1-on-1 Makeup Session" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none bg-white focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 font-bold">Price (₦) *</label>
                <input value={form.price} onChange={handleFormPrice} type="number" min="0" placeholder="e.g. 15000" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none bg-white focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all" />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 font-bold">Duration (e.g. 1 hour, 45 mins)</label>
                <input value={form.duration} onChange={handleFormDuration} placeholder="e.g. 1 hour" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none bg-white focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 font-bold font-bold">Location Type</label>
                <div className="flex gap-2">
                  {[
                    { value: 'physical', label: 'Physical' },
                    { value: 'virtual', label: 'Virtual' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleFormLocationType(opt.value)}
                      className={`flex-1 py-2.5 rounded-xl border text-xs font-bold text-center transition-all ${
                        form.locationType === opt.value
                          ? 'bg-green-50 border-green-400 text-green-700 ring-2 ring-green-100'
                          : 'border-gray-200 hover:border-green-300 text-gray-600 bg-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-700 font-bold">Description</label>
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
                    <Lock size={10} /> AI - Growth+
                  </span>
                )}
              </div>
              <textarea value={form.description} onChange={handleFormDesc} rows={3} placeholder="Describe what this service booking covers..." className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none bg-white focus:border-green-400 focus:ring-2 focus:ring-green-400/20 resize-none transition-all" />
              {aiDescError && (
                <p className="text-red-500 text-xs font-medium mt-1.5">{aiDescError}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 font-bold">Service Category</label>
              <input
                value={form.category}
                onChange={handleFormCategory}
                placeholder="e.g. Consultations, Hair, Spa"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none bg-white focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all"
              />
              <p className="text-gray-400 text-xs mt-1.5">Helps organize your page filters.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 font-bold">Booking Note / Booking Instructions (Optional)</label>
              <textarea value={form.bookingNote} onChange={handleFormBookingNote} rows={2} placeholder="e.g. I will reach out to you via WhatsApp Or Text Message within 2 hours to confirm your preferred session time slot." className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none bg-white focus:border-green-400 focus:ring-2 focus:ring-green-400/20 resize-none transition-all" />
              <p className="text-gray-400 text-xs mt-1">Shown to clients during their booking submission form flow.</p>
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
              <button onClick={resetForm} className="flex-1 sm:flex-none px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 sm:flex-none px-5 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : editingService ? 'Update Service' : 'Add Service'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Service list */}
      {loading ? (
        <SkeletonCardGrid count={6} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" />
      ) : services.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 flex flex-col items-center justify-center py-14 gap-3">
          <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center">
            <Calendar size={20} className="text-green-400" />
          </div>
          <div className="text-center">
            <p className="font-bold text-gray-800 text-sm">No services yet</p>
            <p className="text-gray-400 text-xs mt-0.5 max-w-xs">Add your first bookable service to start receiving appointments.</p>
          </div>
          {!limitReached && (
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all">
              <Plus size={14} /> Add Service
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl border border-gray-100 p-3 sm:p-4">
            <label className="sr-only" htmlFor="service-search">Search services</label>
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                id="service-search"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search by service name"
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-green-400 focus:ring-2 focus:ring-green-400/20"
              />
            </div>
            <div className="mt-2 flex flex-col gap-1 text-xs text-gray-400 sm:flex-row sm:items-center sm:justify-between">
              <span>{filteredServices.length} of {services.length} services shown</span>
              {filteredServices.length > SERVICES_PER_PAGE && (
                <span>Page {safeCurrentPage} of {totalPages}</span>
              )}
            </div>
          </div>

          {filteredServices.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 px-4 py-10 text-center">
              <p className="font-bold text-gray-800 text-sm">No services found</p>
              <p className="text-gray-400 text-xs mt-1">Try searching with a different service name.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {paginatedServices.map(service => {
            const isInactive = service.isActive === false
            if (editingService?.id === service.id) {
              return (
                <div key={service.id} className="bg-white rounded-2xl border border-green-200 shadow-lg shadow-green-100/70 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <h2 className="font-bold text-gray-900 text-sm">Edit Service</h2>
                    <button onClick={resetForm} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                      <X size={15} />
                    </button>
                  </div>
                  <div className="p-4 space-y-4">
                    {formError && (
                      <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
                        <AlertCircle size={14} /> {formError}
                      </div>
                    )}
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5 font-bold">Service Name *</label>
                        <input value={form.name} onChange={handleFormName} placeholder="e.g. 1-on-1 Makeup Session" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none bg-white focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5 font-bold">Price (₦) *</label>
                        <input value={form.price} onChange={handleFormPrice} type="number" min="0" placeholder="e.g. 15000" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none bg-white focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all" />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5 font-bold">Duration (e.g. 1 hour, 45 mins)</label>
                        <input value={form.duration} onChange={handleFormDuration} placeholder="e.g. 1 hour" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none bg-white focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5 font-bold">Location Type</label>
                        <div className="flex gap-2">
                          {[
                            { value: 'physical', label: 'Physical' },
                            { value: 'virtual', label: 'Virtual' },
                          ].map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => handleFormLocationType(opt.value)}
                              className={`flex-1 py-2.5 rounded-xl border text-xs font-bold text-center transition-all ${
                                form.locationType === opt.value
                                  ? 'bg-green-50 border-green-400 text-green-700 ring-2 ring-green-100'
                                  : 'border-gray-200 hover:border-green-300 text-gray-600 bg-white'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-gray-700 font-bold">Description</label>
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
                            <Lock size={10} /> AI - Growth+
                          </span>
                        )}
                      </div>
                      <textarea value={form.description} onChange={handleFormDesc} rows={3} placeholder="Describe what this service booking covers..." className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none bg-white focus:border-green-400 focus:ring-2 focus:ring-green-400/20 resize-none transition-all" />
                      {aiDescError && (
                        <p className="text-red-500 text-xs font-medium mt-1.5">{aiDescError}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5 font-bold">Service Category</label>
                      <input
                        value={form.category}
                        onChange={handleFormCategory}
                        placeholder="e.g. Consultations, Hair, Spa"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none bg-white focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5 font-bold">Booking Note / Booking Instructions (Optional)</label>
                      <textarea value={form.bookingNote} onChange={handleFormBookingNote} rows={2} placeholder="e.g. I will reach out to you via WhatsApp within 2 hours to confirm your preferred session time slot." className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none bg-white focus:border-green-400 focus:ring-2 focus:ring-green-400/20 resize-none transition-all" />
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
                      <button onClick={resetForm} className="flex-1 sm:flex-none px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 sm:flex-none px-5 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                      >
                        {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : 'Update Service'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            }
            return (
              <div
                key={service.id}
                className={`bg-white rounded-2xl border overflow-hidden transition-all ${
                  isInactive ? 'border-gray-100 opacity-70' : 'border-gray-100 hover:border-green-100 hover:shadow-lg hover:shadow-gray-200/80 hover:-translate-y-0.5'
                }`}
              >
                {/* Service image */}
                <div className="aspect-video bg-gray-100 overflow-hidden relative">
                  {service.imageUrls?.length > 0 ? (
                    <img src={service.imageUrls[0]} alt={service.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                      <ImageIcon size={20} className="text-gray-300" />
                      <p className="text-xs text-gray-300">No image</p>
                    </div>
                  )}
                  {isInactive && (
                    <div className="absolute top-2 left-2 flex gap-1 z-10">
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-800/80 text-white rounded-full">Hidden</span>
                    </div>
                  )}
                  {service.imageUrls?.length > 1 && (
                    <div className="absolute top-2 right-2 flex gap-1 z-10">
                      <span className="text-[10px] font-semibold px-2 py-0.5 bg-black/50 text-white rounded-full">+{service.imageUrls.length - 1}</span>
                    </div>
                  )}
                </div>

                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">{service.name}</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-600 border border-teal-100">Service</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-green-600 font-bold text-sm">₦{Number(service.price).toLocaleString()}</p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {service.duration && (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                        <Clock size={10} /> {service.duration}
                      </span>
                    )}
                    <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      service.locationType === 'virtual'
                        ? 'bg-purple-50 text-purple-600 border-purple-100'
                        : 'bg-amber-50 text-amber-600 border-amber-100'
                    }`}>
                      {service.locationType === 'virtual' ? <Video size={10} /> : <MapPin size={10} />}
                      {service.locationType === 'virtual' ? 'Virtual' : 'Physical'}
                    </span>
                  </div>

                  {service.description && (
                    <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed">{service.description}</p>
                  )}

                  {/* Actions row */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => startEdit(service)}
                        className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(service.id)}
                        disabled={deleting === service.id}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        {deleting === service.id
                          ? <Loader2 size={14} className="animate-spin" />
                          : <Trash2 size={14} />
                        }
                      </button>
                    </div>

                    {/* Service on/off toggle */}
                    <div className="flex items-center gap-1.5">
                      {isGrowthOrPro ? (
                        <button
                          onClick={() => onToggleActive(service)}
                          className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors ${
                            isInactive
                              ? 'text-gray-400 bg-gray-100 hover:bg-gray-200'
                              : 'text-green-600 bg-green-50 hover:bg-green-100'
                          }`}
                          title={isInactive ? 'Make visible' : 'Hide service'}
                        >
                          {isInactive
                            ? <ToggleLeft size={14} />
                            : <ToggleRight size={14} />
                          }
                          {isInactive ? 'Off' : 'On'}
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 text-[10px] text-gray-300 px-2 py-1 rounded-lg" title="Service toggle available on Growth+">
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

          {filteredServices.length > SERVICES_PER_PAGE && (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white px-3 py-2.5">
              <button
                type="button"
                onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                disabled={safeCurrentPage === 1}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600 transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={13} />
                Previous
              </button>
              <span className="text-xs font-bold text-gray-500">
                {safeCurrentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                disabled={safeCurrentPage === totalPages}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600 transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight size={13} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
