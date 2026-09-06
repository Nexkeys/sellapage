// src/components/GuaranteeBadge.jsx
//
// Renders a vendor's own promise to the buyer.
//
// WHY THIS EXISTS
// About a quarter of Nigerian social-commerce shoppers report having been
// scammed, and vendors report spending most of their effort convincing a
// stranger they are real before any sale happens. A new store has no reviews to
// lean on, so the only thing it can offer is a promise it is willing to be held
// to.
//
// WHY IT IS NOT LIKE THE OTHER BADGES
// StoreFooter already carries "100% Authentic", "Fast Delivery" and "Secure
// Shopping". Every store on every platform says those, which is exactly why
// they persuade nobody. This one is written by the vendor, specific, and
// bounded by a number of days, so it can actually be relied on.
//
// Deliberately renders NOTHING when the vendor has not written one. An empty or
// default guarantee would be worse than none: it would look like boilerplate.
import { ShieldCheck } from 'lucide-react'

/**
 * @param {object}  guarantee  { enabled, headline, details, days }
 * @param {'inline'|'panel'} variant
 *        inline = compact, sits directly above a pay or order button
 *        panel  = full width, used in the storefront footer
 */
export default function GuaranteeBadge({ guarantee, variant = 'inline', className = '' }) {
  if (!guarantee?.enabled || !guarantee?.headline) return null

  const days = Number(guarantee.days)
  const window = Number.isFinite(days) && days > 0 ? `${days}-day` : null

  if (variant === 'inline') {
    return (
      <div
        className={`flex items-start gap-2.5 rounded-xl border border-green-100 bg-green-50/70 p-3 ${className}`}
      >
        <ShieldCheck size={16} className="mt-0.5 flex-shrink-0 text-green-600" />
        <div className="min-w-0">
          <p className="text-xs font-bold text-green-900">
            {window ? `${window} promise` : 'Our promise'}
          </p>
          <p className="mt-0.5 break-words text-[11px] leading-relaxed text-green-800">
            {guarantee.headline}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`rounded-2xl border border-green-100 bg-white p-5 text-center shadow-sm ${className}`}
    >
      <div className="mx-auto mb-2.5 flex h-11 w-11 items-center justify-center rounded-xl bg-green-50">
        <ShieldCheck size={20} className="text-green-600" strokeWidth={1.8} />
      </div>
      <p className="text-sm font-bold text-gray-900">
        {window ? `${window} guarantee` : 'Our guarantee'}
      </p>
      <p className="mx-auto mt-1 max-w-md break-words text-xs leading-relaxed text-gray-600">
        {guarantee.headline}
      </p>
      {guarantee.details && (
        <p className="mx-auto mt-2 max-w-md break-words text-[11px] leading-relaxed text-gray-400">
          {guarantee.details}
        </p>
      )}
    </div>
  )
}
