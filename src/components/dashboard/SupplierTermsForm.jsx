// src/components/dashboard/SupplierTermsForm.jsx
// A supplier's terms (plan decision J4): what every dropshipper must accept
// before selling their products. Used in the application and, once approved,
// in Supplier Hub. Validation and masking are shared with the server
// (utils/supplierTerms.js); the server is the one that decides.
import { useState } from 'react'
import { Loader2, Scale, AlertCircle, CheckCircle2, Lock } from 'lucide-react'
import { DEFAULT_TERMS, TERMS_LIMITS, FIXED_CLAUSE, termsSummary } from '../../utils/supplierTerms'
import { callMarketplace } from '../../utils/marketplaceApi'

const INPUT =
  'w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/20'
const border = (bad) => (bad ? 'border-red-300' : 'border-gray-200')

function DaysField({ label, hint, value, onChange, limits, error }) {
  const [min, max] = limits
  return (
    <label className="block">
      <span className="text-xs font-bold text-gray-700">{label}</span>
      <div className="mt-1.5 flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${INPUT} ${border(error)} w-24`}
        />
        <span className="text-xs text-gray-500">days</span>
      </div>
      {hint && !error && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
      {error && <p className="mt-1 text-[11px] font-semibold text-red-600">{error}</p>}
    </label>
  )
}

/**
 * @param {object}   props.initial   saved terms, or null for a first save
 * @param {function} props.onSaved   called with the server's response
 * @param {function} [props.onCancel] shows a Cancel button when given
 */
export default function SupplierTermsForm({ initial, onSaved, onCancel }) {
  const [form, setForm] = useState(() => ({
    ...DEFAULT_TERMS,
    ...(initial || {}),
    changeOfMindShippingPaidBy: initial?.changeOfMindShippingPaidBy || DEFAULT_TERMS.changeOfMindShippingPaidBy,
  }))
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))

  const returns = Number(form.returnWindowDays) > 0
  const firstSave = !(initial?.version > 0)

  const save = async () => {
    setSaving(true)
    setError('')
    setErrors({})
    try {
      onSaved?.(await callMarketplace('supplier-application', 'save-terms', { method: 'POST', body: form }))
    } catch (err) {
      setErrors(err.fields || {})
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <Scale size={18} className="mt-0.5 flex-shrink-0 text-gray-400" />
        <p className="text-xs leading-relaxed text-gray-500">
          Every dropshipper reads and accepts these before selling your products.
          {!firstSave && ' Saving a change makes it a new version, and dropshippers must accept it again before they can keep selling your products.'}
        </p>
      </div>

      <div className="rounded-xl border border-gray-100 bg-gray-50 p-3.5">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-500">
          <Lock size={11} /> Always included, by law
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-gray-600">{FIXED_CLAUSE}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <DaysField
          label="You ship within"
          hint="From the moment an order is paid."
          value={form.dispatchDays}
          onChange={set('dispatchDays')}
          limits={TERMS_LIMITS.dispatchDays}
          error={errors.dispatchDays}
        />
        <DaysField
          label="Damaged or wrong items must be reported within"
          hint="At least 3 days, so customers have a fair chance to check."
          value={form.defectReportDays}
          onChange={set('defectReportDays')}
          limits={TERMS_LIMITS.defectReportDays}
          error={errors.defectReportDays}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <DaysField
          label="Change-of-mind returns within"
          hint="0 means you do not take back items the customer simply changed their mind about."
          value={form.returnWindowDays}
          onChange={set('returnWindowDays')}
          limits={TERMS_LIMITS.returnWindowDays}
          error={errors.returnWindowDays}
        />
        {returns && (
          <label className="block">
            <span className="text-xs font-bold text-gray-700">For those, return delivery is paid by</span>
            <select
              value={form.changeOfMindShippingPaidBy || 'customer'}
              onChange={(e) => set('changeOfMindShippingPaidBy')(e.target.value)}
              className={`${INPUT} ${border(errors.changeOfMindShippingPaidBy)} mt-1.5`}
            >
              <option value="customer">The customer</option>
              <option value="supplier">Me, the supplier</option>
            </select>
            {errors.changeOfMindShippingPaidBy && (
              <p className="mt-1 text-[11px] font-semibold text-red-600">{errors.changeOfMindShippingPaidBy}</p>
            )}
          </label>
        )}
      </div>

      <label className="block">
        <span className="text-xs font-bold text-gray-700">Warranty (optional)</span>
        <input
          value={form.warranty}
          onChange={(e) => set('warranty')(e.target.value.slice(0, TERMS_LIMITS.warranty))}
          placeholder="e.g. 6 months on electronics, from the delivery date"
          className={`${INPUT} ${border(errors.warranty)} mt-1.5`}
        />
        {errors.warranty && <p className="mt-1 text-[11px] font-semibold text-red-600">{errors.warranty}</p>}
      </label>

      <label className="block">
        <span className="text-xs font-bold text-gray-700">Anything else dropshippers should agree to (optional)</span>
        <textarea
          value={form.extraTerms}
          onChange={(e) => set('extraTerms')(e.target.value.slice(0, TERMS_LIMITS.extraTerms))}
          rows={5}
          placeholder="e.g. Orders placed after 4pm ship the next working day. Items must be returned in their original packaging."
          className={`${INPUT} ${border(errors.extraTerms)} mt-1.5`}
        />
        <p className="mt-1 text-[11px] text-gray-400">
          Phone numbers, emails and links are hidden automatically. Talk to dropshippers through Sellapage.
        </p>
        {errors.extraTerms && <p className="mt-1 text-[11px] font-semibold text-red-600">{errors.extraTerms}</p>}
      </label>

      <div className="rounded-xl border border-green-100 bg-green-50/60 p-3.5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-green-700">What dropshippers will see</p>
        <ul className="mt-1.5 space-y-1">
          {termsSummary({
            ...form,
            dispatchDays: Number(form.dispatchDays) || 0,
            returnWindowDays: Number(form.returnWindowDays) || 0,
            defectReportDays: Number(form.defectReportDays) || 0,
          }).map((line) => (
            <li key={line} className="flex items-start gap-1.5 text-xs text-green-900">
              <CheckCircle2 size={12} className="mt-0.5 flex-shrink-0 text-green-600" /> {line}
            </li>
          ))}
        </ul>
      </div>

      {error && (
        <p className="flex items-start gap-1.5 text-xs font-semibold text-red-600">
          <AlertCircle size={13} className="mt-0.5 flex-shrink-0" /> {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-60"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {firstSave ? 'Save my terms' : 'Save as a new version'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
