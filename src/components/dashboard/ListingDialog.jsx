// src/components/dashboard/ListingDialog.jsx
// Putting one product on the Dropshipping Marketplace, or editing its listing.
// Opened from Supplier Hub and from the Products tab. The server
// (/api/marketplace-listing, action save) validates everything again with the
// same rules (cleanListing in utils/marketplace.js).
import { useMemo, useState } from 'react'
import { X, Loader2, AlertCircle, ShieldAlert, Info } from 'lucide-react'
import { MARKETPLACE_CATEGORIES, findSubcategory } from '../../utils/marketplaceCategories'
import { callMarketplace, naira } from '../../utils/marketplaceApi'
import { commissionFor } from '../../utils/marketplace'

const INPUT =
  'w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/20'
const border = (bad) => (bad ? 'border-red-300' : 'border-gray-200')

/**
 * @param {object}   props.product  a row from /api/marketplace-listing (mine),
 *                                  or any product with id, name, price, stock
 * @param {function} props.onClose
 * @param {function} props.onSaved  called with the updated row
 */
export default function ListingDialog({ product, onClose, onSaved }) {
  const editing = product?.listed === true
  const [form, setForm] = useState(() => ({
    wholesalePrice: product?.wholesalePrice ?? '',
    minSellingPrice: product?.minSellingPrice ?? '',
    marketplaceCategory: product?.marketplaceCategory || '',
    marketplaceSubcategory: product?.marketplaceSubcategory || '',
    nafdacNumber: product?.nafdacNumber || '',
  }))
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  // Editing a field clears its message: an error that outlives the fix reads
  // as if the new value were wrong too.
  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e))
  }

  const retail = Number(product?.price) || 0
  const wholesale = Number(String(form.wholesalePrice).replace(/[,\s₦]/g, '')) || 0
  const category = MARKETPLACE_CATEGORIES.find((c) => c.id === form.marketplaceCategory)
  const sub = findSubcategory(form.marketplaceCategory, form.marketplaceSubcategory)
  // The supplier gets the full wholesale price; Sellapage's cut comes out of
  // the dropshipper's side (Docs/Dropshipping-Marketplace-Legal.md, A1).
  const margin = retail > 0 && wholesale > 0 ? retail - wholesale - commissionFor(wholesale) : null
  const categories = useMemo(() => MARKETPLACE_CATEGORIES.filter((c) => !c.retired), [])

  const save = async () => {
    setSaving(true)
    setError('')
    setErrors({})
    try {
      const data = await callMarketplace('marketplace-listing', 'save', {
        method: 'POST',
        body: { productId: product.id, ...form },
      })
      onSaved?.(data.product)
    } catch (err) {
      setErrors(err.fields || {})
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-gray-900">{editing ? 'Edit marketplace listing' : 'List on Dropship Marketplace'}</h2>
            <p className="mt-0.5 truncate text-xs text-gray-500">
              {product?.name} · your price {naira(retail)}
              {product?.stock !== null && product?.stock !== undefined ? ` · ${product.stock} in stock` : ''}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {errors.product && (
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">
            <ShieldAlert size={14} className="mt-0.5 flex-shrink-0" /> {errors.product}
          </p>
        )}

        <div className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-bold text-gray-700">Wholesale price</span>
              <input
                inputMode="decimal"
                value={form.wholesalePrice}
                onChange={(e) => set('wholesalePrice', e.target.value)}
                placeholder="What dropshippers pay you"
                className={`${INPUT} ${border(errors.wholesalePrice)} mt-1.5`}
              />
              {errors.wholesalePrice && <p className="mt-1 text-[11px] font-semibold text-red-600">{errors.wholesalePrice}</p>}
            </label>
            <label className="block">
              <span className="text-xs font-bold text-gray-700">Lowest selling price (optional)</span>
              <input
                inputMode="decimal"
                value={form.minSellingPrice ?? ''}
                onChange={(e) => set('minSellingPrice', e.target.value)}
                placeholder="Dropshippers cannot sell below this"
                className={`${INPUT} ${border(errors.minSellingPrice)} mt-1.5`}
              />
              {errors.minSellingPrice && <p className="mt-1 text-[11px] font-semibold text-red-600">{errors.minSellingPrice}</p>}
            </label>
          </div>

          {margin !== null && margin > 0 && (
            <p className="flex items-start gap-1.5 rounded-xl bg-green-50 p-3 text-xs text-green-800">
              <Info size={13} className="mt-0.5 flex-shrink-0" />
              <span>
                You get the full {naira(wholesale)} on every sale, plus the delivery fee. A dropshipper selling at your
                price of {naira(retail)} keeps about {naira(margin)} after Sellapage&apos;s 5%, before card fees.
              </span>
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-bold text-gray-700">Category</span>
              <select
                value={form.marketplaceCategory}
                onChange={(e) => { set('marketplaceCategory', e.target.value); set('marketplaceSubcategory', '') }}
                className={`${INPUT} ${border(errors.marketplaceCategory)} mt-1.5`}
              >
                <option value="">Choose…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
              {errors.marketplaceCategory && <p className="mt-1 text-[11px] font-semibold text-red-600">{errors.marketplaceCategory}</p>}
            </label>
            <label className="block">
              <span className="text-xs font-bold text-gray-700">Subcategory</span>
              <select
                value={form.marketplaceSubcategory}
                onChange={(e) => set('marketplaceSubcategory', e.target.value)}
                disabled={!category}
                className={`${INPUT} ${border(errors.marketplaceSubcategory)} mt-1.5 disabled:bg-gray-50`}
              >
                <option value="">Choose…</option>
                {(category?.subs || []).filter((s) => !s.retired).map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
              {errors.marketplaceSubcategory && <p className="mt-1 text-[11px] font-semibold text-red-600">{errors.marketplaceSubcategory}</p>}
            </label>
          </div>

          {sub?.nafdac && (
            <label className="block">
              <span className="text-xs font-bold text-gray-700">NAFDAC registration number</span>
              <input
                value={form.nafdacNumber}
                onChange={(e) => set('nafdacNumber', e.target.value.slice(0, 20))}
                placeholder="e.g. A1-1234"
                className={`${INPUT} ${border(errors.nafdacNumber)} mt-1.5 uppercase`}
              />
              <p className="mt-1 text-[11px] text-gray-400">
                {sub.label} must be NAFDAC-registered to be sold in Nigeria. It is on the pack.
              </p>
              {errors.nafdacNumber && <p className="mt-1 text-[11px] font-semibold text-red-600">{errors.nafdacNumber}</p>}
            </label>
          )}
          {sub?.adult && (
            <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">This is an 18+ category. Only sell it to adults.</p>
          )}
        </div>

        {error && !errors.product && (
          <p className="mt-4 flex items-start gap-1.5 text-xs font-semibold text-red-600">
            <AlertCircle size={13} className="mt-0.5 flex-shrink-0" /> {error}
          </p>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {editing ? 'Save changes' : 'List it'}
          </button>
        </div>
      </div>
    </div>
  )
}
