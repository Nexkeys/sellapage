// src/components/dashboard/ServicesTab.jsx
//
// The Services tab. Redesigned on 2026-09-26 on the same screens as Products
// (./listings), with service fields: duration, in person or online, and
// booking instructions. Saving and deleting still go through the Dashboard
// handlers they always did.
import { useCallback, useMemo, useState } from 'react'
import ListingsPage from './listings/ListingsPage'
import ListingForm from './listings/ListingForm'
import { listingLink } from './listings/listingUtils'

export default function ServicesTab({
  plan, serviceCount, maxServices, maxImagesPerProduct, isGrowthOrPro, isPremium, limitReached,
  showForm, setShowForm, editingService, form, setForm, formError, saving, loading,
  services, deleting,
  handleImageChange, handleRemoveExistingImage, handleRemoveNewImage,
  onGenerateDescription, generatingDesc, aiDescError,
  handleSave, resetForm, startEdit, handleDelete, handleDeleteMany,
  onToggleActive,
  storeId,
  storeUrl = '',
  navigateTo,
}) {
  const [flash, setFlash] = useState(null)
  const clearFlash = useCallback(() => setFlash(null), [])
  const categorySuggestions = useMemo(
    () => [...new Set(services.map((s) => String(s.category || '').trim()).filter(Boolean))].sort(),
    [services],
  )

  if (showForm) {
    const wasEditing = !!editingService
    return (
      <ListingForm
        kind="service"
        storeId={storeId}
        form={form}
        setForm={setForm}
        isEditing={wasEditing}
        saving={saving}
        formError={formError}
        maxImages={maxImagesPerProduct}
        onImageChange={handleImageChange}
        onRemoveExistingImage={handleRemoveExistingImage}
        onRemoveNewImage={handleRemoveNewImage}
        isGrowthOrPro={isGrowthOrPro}
        onGenerateDescription={onGenerateDescription}
        generatingDesc={generatingDesc}
        aiDescError={aiDescError}
        categorySuggestions={categorySuggestions}
        reviewCount={editingService?.reviewCount || 0}
        avgRating={editingService?.avgRating || 0}
        onCancel={resetForm}
        onSave={async () => {
          const name = String(form.name || '').trim()
          const saved = await handleSave()
          if (saved) {
            setFlash({
              success: true,
              text: wasEditing ? `Changes to ${name} saved.` : `${name} is live. Clients can book it now.`,
              link: listingLink(storeUrl, { id: 'services' }, 'service') || null,
            })
          }
          return !!saved
        }}
      />
    )
  }

  return (
    <ListingsPage
      kind="service"
      items={services}
      loading={loading}
      storeId={storeId}
      storeUrl={storeUrl}
      plan={plan}
      count={serviceCount}
      max={maxServices}
      limitReached={limitReached}
      isGrowthOrPro={isGrowthOrPro}
      isPremium={isPremium}
      onAdd={() => setShowForm(true)}
      onEdit={startEdit}
      onDelete={handleDelete}
      onDeleteMany={handleDeleteMany}
      onToggleActive={onToggleActive}
      navigateTo={navigateTo}
      deleting={deleting}
      flash={flash}
      onFlashDone={clearFlash}
    />
  )
}
