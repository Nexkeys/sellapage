// src/components/dashboard/MarketplaceListButton.jsx
// "List on Dropship Marketplace", on each product card in the Products tab
// (plan G1: a supplier can list from the Products tab or from Supplier Hub).
//
// Renders nothing unless the store is an approved supplier that can sell, is
// not a staff session, and has the marketplace unlocked (the lock, Part G8).
// Self-contained on purpose: the Products tab only has to place it.
import { useEffect, useState } from 'react'
import { Boxes } from 'lucide-react'
import { supplierCanSell } from '../../utils/marketplace'
import { isMarketplaceUnlocked } from '../../utils/marketplaceStage'
import ListingDialog from './ListingDialog'

export default function MarketplaceListButton({ product, store }) {
  const [unlocked, setUnlocked] = useState(false)
  const [open, setOpen] = useState(false)
  // What the server said after a save, since the Products list itself is not
  // re-read: without it the pill would say "List" right after listing.
  const [saved, setSaved] = useState(null)

  const eligible = !!store && !store._isStaff && supplierCanSell(store) && !product?.dropshipped && product?.type !== 'digital'

  useEffect(() => {
    if (!eligible) return undefined
    let cancelled = false
    isMarketplaceUnlocked(store).then((v) => { if (!cancelled) setUnlocked(v) })
    return () => { cancelled = true }
  }, [eligible, store])

  if (!eligible || !unlocked) return null

  const listed = saved ? saved.listed : product?.marketplaceListed === true
  const row = saved || {
    id: product.id,
    name: product.name,
    price: product.price,
    stock: product.stock ?? null,
    listed,
    wholesalePrice: product.wholesalePrice ?? null,
    minSellingPrice: product.minSellingPrice ?? null,
    marketplaceCategory: product.marketplaceCategory || '',
    marketplaceSubcategory: product.marketplaceSubcategory || '',
    nafdacNumber: product.nafdacNumber || '',
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold transition-colors ${
          listed ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-700'
        }`}
        title={listed ? 'On the Dropship Marketplace. Tap to edit.' : 'List on the Dropship Marketplace'}
      >
        <Boxes size={14} />
        {listed ? 'Listed' : 'List'}
      </button>
      {open && (
        <ListingDialog
          product={row}
          onClose={() => setOpen(false)}
          onSaved={(next) => { setSaved(next); setOpen(false) }}
        />
      )}
    </>
  )
}
