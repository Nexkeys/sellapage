// src/components/receipts/ReceiptForm.jsx
import { Plus, Trash2, Lock } from 'lucide-react'
import { recalcTotals } from '../../utils/receiptTemplates'

const INPUT_CLASS = 'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-all duration-200 placeholder:text-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/20'
const LABEL_CLASS = 'mb-1.5 block text-xs font-bold text-gray-700'

const PAYMENT_METHODS = ['Cash', 'Transfer', 'Card', 'POS']
const STATUS_OPTIONS = ['Paid', 'Pending', 'Partial']

export default function ReceiptForm({ draft, onChange, plan = 'starter' }) {
  const canCustomFields = plan !== 'starter'
  const customFieldLimit = plan === 'growth' ? 5 : Infinity
  const items = draft.items || []
  const customFields = draft.customFields || []

  const patch = (fields) => onChange((prev) => recalcTotals({ ...prev, ...fields }))

  const updateItem = (idx, key, value) => {
    const nextItems = items.map((item, i) => (i === idx ? { ...item, [key]: value } : item))
    patch({ items: nextItems })
  }
  const addItem = () => patch({ items: [...items, { label: '', qty: 1, unitPrice: '' }] })
  const removeItem = (idx) => {
    if (items.length <= 1) return
    patch({ items: items.filter((_, i) => i !== idx) })
  }

  const updateCustomField = (idx, key, value) => {
    const next = customFields.map((f, i) => (i === idx ? { ...f, [key]: value } : f))
    onChange((prev) => ({ ...prev, customFields: next }))
  }
  const addCustomField = () => {
    if (customFields.length >= customFieldLimit) return
    onChange((prev) => ({ ...prev, customFields: [...customFields, { label: '', value: '' }] }))
  }
  const removeCustomField = (idx) => {
    onChange((prev) => ({ ...prev, customFields: customFields.filter((_, i) => i !== idx) }))
  }

  return (
    <div className="space-y-5">
      {/* Vendor + customer */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <p className="mb-3 text-[10px] font-extrabold uppercase tracking-widest text-gray-400">From (your business)</p>
          <p className="text-sm font-bold text-gray-900">{draft.vendorName || 'Your business name'}</p>
          <p className="mt-0.5 text-xs text-gray-400">{draft.vendorPhone || 'No WhatsApp number set'}</p>
          <div className="mt-3">
            <label className={LABEL_CLASS}>Business Address</label>
            <input
              type="text"
              value={draft.vendorAddress || ''}
              onChange={(e) => patch({ vendorAddress: e.target.value })}
              placeholder="e.g. 12 Admiralty Way, Lekki"
              className={INPUT_CLASS}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <p className="mb-3 text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Bill To (your customer)</p>
          <div className="space-y-3">
            <div>
              <label className={LABEL_CLASS}>Customer Name <span className="text-red-500">*</span></label>
              <input type="text" value={draft.customerName || ''} onChange={(e) => patch({ customerName: e.target.value })} placeholder="e.g. Ada Okonkwo" className={INPUT_CLASS} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={LABEL_CLASS}>Phone</label>
                <input type="text" value={draft.customerPhone || ''} onChange={(e) => patch({ customerPhone: e.target.value })} placeholder="080..." className={INPUT_CLASS} />
              </div>
              <div>
                <label className={LABEL_CLASS}>Email <span className="text-gray-400 font-normal">(optional)</span></label>
                <input type="email" value={draft.customerEmail || ''} onChange={(e) => patch({ customerEmail: e.target.value })} placeholder="customer@email.com" className={INPUT_CLASS} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4">
        <p className="mb-3 text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Line Items</p>
        <div className="space-y-2.5">
          {items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 items-center gap-2 rounded-xl border border-gray-100 bg-gray-50/50 p-2.5">
              <input
                type="text"
                value={item.label}
                onChange={(e) => updateItem(idx, 'label', e.target.value)}
                placeholder="Item or service name"
                className="col-span-12 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs outline-none focus:border-green-500 sm:col-span-6"
              />
              <input
                type="number"
                min="0"
                value={item.qty}
                onChange={(e) => updateItem(idx, 'qty', e.target.value)}
                placeholder="Qty"
                className="col-span-4 rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs outline-none focus:border-green-500 sm:col-span-2"
              />
              <input
                type="number"
                min="0"
                value={item.unitPrice}
                onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                placeholder="Unit price"
                className="col-span-6 rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs outline-none focus:border-green-500 sm:col-span-3"
              />
              <button
                type="button"
                onClick={() => removeItem(idx)}
                disabled={items.length <= 1}
                className="col-span-2 flex items-center justify-center rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 sm:col-span-1"
                aria-label="Remove item"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addItem}
          className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-dashed border-gray-300 px-3 py-2 text-xs font-bold text-gray-500 hover:border-green-400 hover:text-green-600 transition-all"
        >
          <Plus size={13} /> Add a line item
        </button>
      </div>

      {/* Totals inputs */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4">
        <p className="mb-3 text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Payment</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div>
            <label className={LABEL_CLASS}>Discount (NGN)</label>
            <input type="number" min="0" value={draft.discount || ''} onChange={(e) => patch({ discount: e.target.value })} placeholder="0" className={INPUT_CLASS} />
          </div>
          <div>
            <label className={LABEL_CLASS}>Tax (NGN)</label>
            <input type="number" min="0" value={draft.tax || ''} onChange={(e) => patch({ tax: e.target.value })} placeholder="0" className={INPUT_CLASS} />
          </div>
          <div>
            <label className={LABEL_CLASS}>Amount Paid</label>
            <input type="number" min="0" value={draft.amountPaid || ''} onChange={(e) => patch({ amountPaid: e.target.value })} placeholder="0" className={INPUT_CLASS} />
          </div>
          <div>
            <label className={LABEL_CLASS}>Date</label>
            <input type="date" value={draft.date || ''} onChange={(e) => patch({ date: e.target.value })} className={INPUT_CLASS} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL_CLASS}>Payment Method</label>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => patch({ paymentMethod: m })}
                  className={`rounded-xl border px-3 py-2 text-xs font-bold transition-all ${draft.paymentMethod === m ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={LABEL_CLASS}>Status</label>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => patch({ status: st })}
                  className={`rounded-xl border px-3 py-2 text-xs font-bold transition-all ${draft.status === st ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live totals readout */}
        <div className="mt-4 space-y-1 rounded-xl bg-gray-50/70 p-3 text-xs">
          <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>NGN {Number(draft.subtotal || 0).toLocaleString('en-NG')}</span></div>
          <div className="flex justify-between font-black text-gray-900"><span>Total</span><span>NGN {Number(draft.total || 0).toLocaleString('en-NG')}</span></div>
          {Number(draft.balanceDue) > 0 && (
            <div className="flex justify-between font-bold text-red-500"><span>Balance Due</span><span>NGN {Number(draft.balanceDue).toLocaleString('en-NG')}</span></div>
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4">
        <label className={LABEL_CLASS}>Notes</label>
        <textarea
          value={draft.notes || ''}
          onChange={(e) => patch({ notes: e.target.value })}
          placeholder="Thank you for your patronage!"
          rows={3}
          className={`${INPUT_CLASS} resize-none`}
        />
      </div>

      {/* Custom fields */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Custom Fields</p>
          {!canCustomFields && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
              <Lock size={10} /> Growth+
            </span>
          )}
        </div>

        {!canCustomFields ? (
          <p className="text-xs text-gray-400">Add whatever your business needs — "Warranty Period", "Sales Rep", "Order ID" — on Growth and above.</p>
        ) : (
          <>
            <div className="space-y-2">
              {customFields.map((f, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={f.label}
                    onChange={(e) => updateCustomField(idx, 'label', e.target.value)}
                    placeholder="Field name (e.g. Warranty)"
                    className="flex-1 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs outline-none focus:border-green-500"
                  />
                  <input
                    type="text"
                    value={f.value}
                    onChange={(e) => updateCustomField(idx, 'value', e.target.value)}
                    placeholder="Value (e.g. 6 months)"
                    className="flex-1 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs outline-none focus:border-green-500"
                  />
                  <button type="button" onClick={() => removeCustomField(idx)} className="flex-shrink-0 rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addCustomField}
              disabled={customFields.length >= customFieldLimit}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-dashed border-gray-300 px-3 py-2 text-xs font-bold text-gray-500 hover:border-green-400 hover:text-green-600 transition-all disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus size={13} /> Add custom field {customFieldLimit !== Infinity ? `(${customFields.length}/${customFieldLimit})` : ''}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
