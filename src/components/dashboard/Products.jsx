// src/components/dashboard/Products.jsx
//
// The Products tab. Redesigned on 2026-09-26: the list, empty state and the
// add/edit form now live in ./listings (shared with the Services tab), and
// this file only connects them to the state Dashboard.jsx already owns.
// Saving, deleting, images and AI descriptions all still go through the same
// Dashboard handlers as before.
import { useCallback, useState } from 'react'
import ListingsPage from './listings/ListingsPage'
import ListingForm from './listings/ListingForm'
import { listingLink } from './listings/listingUtils'

export default function ProductsTab({
  plan, productCount, maxProducts, maxImagesPerProduct, isGrowthOrPro, isPremium, limitReached,
  showForm, setShowForm, editingProduct, form, formError, saving, loading,
  products, deleting,
  handleImageChange, handleRemoveExistingImage, handleRemoveNewImage,
  onGenerateDescription, generatingDesc, aiDescError,
  handleSave, resetForm, startEdit, handleDelete, handleDeleteMany,
  onToggleActive,
  customCategories = [],
  onSaveCustomCategory,
  setForm,
  storeId,
  storeUrl = '',
  navigateTo,
  // The store document, for the Dropship Marketplace "List" button. Omitted
  // (or a staff session) means no button.
  marketplaceStore = null,
}) {
  const [flash, setFlash] = useState(null)
  const clearFlash = useCallback(() => setFlash(null), [])

  if (showForm) {
    const wasEditing = !!editingProduct
    return (
      <ListingForm
        kind="product"
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
        customCategories={customCategories}
        onSaveCustomCategory={onSaveCustomCategory}
        reviewCount={editingProduct?.reviewCount || 0}
        avgRating={editingProduct?.avgRating || 0}
        onCancel={resetForm}
        onSave={async () => {
          const name = String(form.name || '').trim()
          const saved = await handleSave()
          if (saved) {
            const item = typeof saved === 'object' ? saved : editingProduct
            setFlash({
              success: true,
              text: wasEditing ? `Changes to ${name} saved.` : `${name} is live on your store.`,
              link: listingLink(storeUrl, item, 'product') || null,
            })
          }
          return !!saved
        }}
      />
    )
  }

  return (
    <ListingsPage
      kind="product"
      items={products}
      loading={loading}
      storeId={storeId}
      storeUrl={storeUrl}
      plan={plan}
      count={productCount}
      max={maxProducts}
      limitReached={limitReached}
      isGrowthOrPro={isGrowthOrPro}
      isPremium={isPremium}
      onAdd={() => setShowForm(true)}
      onEdit={startEdit}
      onDelete={handleDelete}
      onDeleteMany={handleDeleteMany}
      onToggleActive={onToggleActive}
      navigateTo={navigateTo}
      marketplaceStore={marketplaceStore}
      deleting={deleting}
      flash={flash}
      onFlashDone={clearFlash}
    />
  )
}
