// src/components/dashboard/SupplierListings.jsx
// Supplier Hub once a store is approved (or suspended, read-only): its terms,
// its marketplace listings with the availability switch, and a picker to list
// more of its products. Plan: Docs/Dropshipping-Marketplace-Plan.md, Part G1.
//
// What can sell is decided on the server from the product AND the account
// (listingAvailability). This screen shows the reason next to anything that
// cannot, so "why is nobody selling this" always has an answer on screen.
import { useCallback, useEffect, useState } from 'react'
import {
  Loader2, Plus, Pencil, Trash2, AlertTriangle, Scale, PackagePlus, ImageIcon, RefreshCw, ArrowRight,
} from 'lucide-react'
import { callMarketplace, naira } from '../../utils/marketplaceApi'
import { AVAILABILITY_LABELS } from '../../utils/marketplace'
import { categoryLabel } from '../../utils/marketplaceCategories'
import { termsSummary } from '../../utils/supplierTerms'
import ListingDialog from './ListingDialog'
import SupplierTermsForm from './SupplierTermsForm'

const fmtDate = (v) => (v ? new Date(v).toLocaleDateString('en-NG', { dateStyle: 'medium' }) : '')

function Switch({ on, disabled, busy, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled || busy}
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${on ? 'bg-green-600' : 'bg-gray-300'}`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'}`} />
      {busy && <Loader2 size={12} className="absolute left-1/2 -translate-x-1/2 animate-spin text-white" />}
    </button>
  )
}

/**
 * @param {object}   props.state       /api/supplier-application status payload
 * @param {function} props.onReload    re-reads that payload (after terms change)
 * @param {function} props.navigateTo
 */
export default function SupplierListings({ state, onReload, navigateTo }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [dialog, setDialog] = useState(null)
  const [picking, setPicking] = useState(false)
  const [editingTerms, setEditingTerms] = useState(false)

  const suspended = state?.status === 'suspended'
  const paused = state?.sellBlockedBy === 'plan'
  const readOnly = suspended || paused
  const hasTerms = (state?.termsVersion || 0) > 0

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await callMarketplace('marketplace-listing', 'mine')
      setProducts(data.products || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Deferred a tick so the first load does not set state during the effect.
  useEffect(() => {
    const t = setTimeout(() => { load() }, 0)
    return () => clearTimeout(t)
  }, [load])

  const replace = (row) => setProducts((list) => list.map((p) => (p.id === row.id ? row : p)))

  const act = async (id, action, body = {}) => {
    setBusyId(id)
    setError('')
    try {
      const data = await callMarketplace('marketplace-listing', action, { method: 'POST', body: { productId: id, ...body } })
      replace(data.product)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const listed = products.filter((p) => p.listed)
  const listable = products.filter((p) => !p.listed && !p.dropshipped && p.type !== 'digital')

  return (
    <div className="space-y-4">
      {paused && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 sm:p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="mt-0.5 flex-shrink-0 text-amber-600" />
            <div className="min-w-0">
              <h2 className="text-sm font-bold">Upgrade to regain access</h2>
              <p className="mt-1 text-xs leading-relaxed">
                Supplying is part of Pro and Premium. Your listings are paused, not deleted: upgrade and they come back exactly as they were.
              </p>
              <button
                type="button"
                onClick={() => navigateTo?.('billing')}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-amber-700"
              >
                Upgrade <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terms */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <Scale size={15} className="text-gray-400" /> Your supplier terms
            </h2>
            {hasTerms && state.terms && (
              <p className="mt-0.5 text-xs text-gray-400">
                Version {state.terms.version}
                {state.terms.updatedAt ? ` · updated ${fmtDate(state.terms.updatedAt)}` : ''}
              </p>
            )}
          </div>
          {hasTerms && !editingTerms && !suspended && (
            <button
              type="button"
              onClick={() => setEditingTerms(true)}
              className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] font-bold text-gray-600 hover:bg-gray-50"
            >
              <Pencil size={11} /> Edit
            </button>
          )}
        </div>

        {!hasTerms || editingTerms ? (
          <div className="mt-4">
            {!hasTerms && (
              <p className="mb-3 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                Set your terms before listing anything. Dropshippers accept them before they can sell your products.
              </p>
            )}
            <SupplierTermsForm
              initial={state?.terms}
              onCancel={hasTerms ? () => setEditingTerms(false) : undefined}
              onSaved={() => { setEditingTerms(false); onReload?.() }}
            />
          </div>
        ) : (
          <ul className="mt-3 space-y-1">
            {termsSummary(state.terms).map((line) => (
              <li key={line} className="text-xs leading-relaxed text-gray-600">· {line}</li>
            ))}
            {state.terms?.extraTerms && (
              <li className="mt-2 whitespace-pre-line rounded-lg bg-gray-50 p-2.5 text-xs text-gray-600">{state.terms.extraTerms}</li>
            )}
          </ul>
        )}
      </div>

      {/* Listings */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-gray-900">On the marketplace ({listed.length})</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11px] font-bold text-gray-600 hover:bg-gray-50"
              aria-label="Refresh"
            >
              <RefreshCw size={11} />
            </button>
            {!readOnly && hasTerms && (
              <button
                type="button"
                onClick={() => setPicking((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700"
              >
                <Plus size={13} /> List a product
              </button>
            )}
          </div>
        </div>

        {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600">{error}</p>}

        {picking && !readOnly && (
          <div className="mt-3 rounded-xl border border-gray-200 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold text-gray-700">Choose one of your products</p>
              <button
                type="button"
                onClick={() => navigateTo?.('products')}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700 hover:underline"
              >
                <PackagePlus size={12} /> Add a new product first
              </button>
            </div>
            {listable.length === 0 ? (
              <p className="mt-2 text-xs text-gray-400">Every product you have is already listed, or there are none yet.</p>
            ) : (
              <ul className="mt-2 max-h-72 divide-y divide-gray-50 overflow-y-auto">
                {listable.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 py-2">
                    <Thumb src={p.imageUrl} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-800">{p.name}</p>
                      <p className="text-[11px] text-gray-400">
                        {naira(p.price)} · {p.stock === null ? 'stock not tracked' : `${p.stock} in stock`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDialog(p)}
                      className="rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] font-bold text-gray-700 hover:bg-gray-50"
                    >
                      List
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center p-8"><Loader2 size={18} className="animate-spin text-gray-400" /></div>
        ) : listed.length === 0 ? (
          <p className="mt-3 text-xs text-gray-400">
            {hasTerms ? 'Nothing listed yet. Tap "List a product" to put one of your products in front of dropshippers.' : 'Save your terms above, then list your products here.'}
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-gray-50">
            {listed.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 py-3">
                <Thumb src={p.imageUrl} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{p.name}</p>
                  <p className="text-[11px] text-gray-500">
                    Wholesale {naira(p.wholesalePrice)} · your price {naira(p.price)}
                    {p.minSellingPrice ? ` · lowest ${naira(p.minSellingPrice)}` : ''}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {categoryLabel(p.marketplaceCategory, p.marketplaceSubcategory)}
                    {p.stock !== null ? ` · ${p.stock} in stock` : ''}
                  </p>
                  <span
                    className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      p.available ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {p.available ? 'Live' : AVAILABILITY_LABELS[p.reason] || 'Unavailable'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Switch
                    on={p.status === 'live'}
                    busy={busyId === p.id}
                    disabled={readOnly}
                    label={`Available to dropshippers: ${p.name}`}
                    onChange={(on) => act(p.id, 'set-status', { on })}
                  />
                  {!readOnly && (
                    <>
                      <button
                        type="button"
                        onClick={() => setDialog(p)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                        aria-label={`Edit listing: ${p.name}`}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => act(p.id, 'unlist')}
                        className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        aria-label={`Remove from marketplace: ${p.name}`}
                        title="Remove from the marketplace (the product stays in your store)"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {dialog && (
        <ListingDialog
          product={dialog}
          onClose={() => setDialog(null)}
          onSaved={(row) => { replace(row); setDialog(null); setPicking(false) }}
        />
      )}
    </div>
  )
}

function Thumb({ src }) {
  return src ? (
    <img src={src} alt="" className="h-11 w-11 flex-shrink-0 rounded-lg bg-gray-100 object-cover" />
  ) : (
    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
      <ImageIcon size={15} className="text-gray-300" />
    </div>
  )
}
