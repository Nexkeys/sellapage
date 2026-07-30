// src/components/dashboard/ReceiptsTab.jsx
import { useState, useEffect, useCallback } from 'react'
import { Plus, ArrowLeft, ArrowRight, AlertCircle, X } from 'lucide-react'
import ReceiptForm from '../receipts/ReceiptForm'
import TemplateSelector from '../receipts/TemplateSelector'
import ReceiptCustomizer from '../receipts/ReceiptCustomizer'
import ReceiptPreview from '../receipts/ReceiptPreview'
import ReceiptHistory from '../receipts/ReceiptHistory'
import { recalcTotals, getTemplateById } from '../../utils/receiptTemplates'

function buildEmptyDraft(store) {
  return recalcTotals({
    vendorName: store?.businessName || '',
    vendorPhone: store?.whatsappNumber || '',
    vendorAddress: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    items: [{ label: '', qty: 1, unitPrice: '' }],
    discount: 0,
    tax: 0,
    amountPaid: 0,
    paymentMethod: 'Cash',
    status: 'Paid',
    notes: '',
    date: new Date().toISOString().split('T')[0],
    templateId: 'template-1',
    primaryColor: '#22c55e',
    secondaryColor: '#0f172a',
    fontFamily: 'Helvetica',
    stampType: null,
    stampUrl: null,
    stampLabel: null,
    stampColor: null,
    stampPosition: 'bottom-right',
    qrCodeEnabled: false,
    qrCodeUrl: null,
    qrCodePosition: 'bottom-left',
    logoUrl: store?.logoUrl || null,
    logoPosition: 'top-center',
    customFields: [],
  })
}

export default function ReceiptsTab({ store, user, isGrowthOrPro, isPro, isPremium }) {
  const plan = isPremium ? 'premium' : isPro ? 'pro' : isGrowthOrPro ? 'growth' : 'starter'
  const canBrand = plan !== 'starter'
  const canPng = plan !== 'starter'
  const whiteLabel = plan === 'premium'

  const steps = canBrand ? ['form', 'template', 'customize', 'preview'] : ['form', 'preview']
  const stepLabels = { form: 'Details', template: 'Template', customize: 'Customize', preview: 'Preview' }

  const [view, setView] = useState('history') // 'history' | 'create'
  const [step, setStep] = useState('form')
  const [draft, setDraft] = useState(() => buildEmptyDraft(store))
  const [editingId, setEditingId] = useState(null)
  const [savedReceipt, setSavedReceipt] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [receipts, setReceipts] = useState([])
  const [receiptsLoading, setReceiptsLoading] = useState(true)

  const fetchReceipts = useCallback(async () => {
    if (!store?.id || !user) return
    setReceiptsLoading(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch(`/api/receipt-list?storeId=${store.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok) setReceipts(data.receipts || [])
    } catch (err) {
      console.error('[ReceiptsTab] fetchReceipts failed', err)
    } finally {
      setReceiptsLoading(false)
    }
  }, [store?.id, user])

  useEffect(() => {
    fetchReceipts()
  }, [fetchReceipts])

  const startCreate = () => {
    setDraft(buildEmptyDraft(store))
    setEditingId(null)
    setSavedReceipt(null)
    setSaveError('')
    setStep('form')
    setView('create')
  }

  const startEdit = (receipt) => {
    setDraft(recalcTotals({ ...receipt, vendorName: store?.businessName || '', vendorPhone: store?.whatsappNumber || '' }))
    setEditingId(receipt.id)
    setSavedReceipt(receipt)
    setSaveError('')
    setStep('form')
    setView('create')
  }

  const backToHistory = () => {
    setView('history')
    setStep('form')
  }

  const goNext = () => {
    const idx = steps.indexOf(step)
    if (idx < steps.length - 1) setStep(steps[idx + 1])
  }
  const goBack = () => {
    const idx = steps.indexOf(step)
    if (idx > 0) setStep(steps[idx - 1])
  }

  const handleSave = async () => {
    if (!draft.customerName?.trim()) {
      setSaveError('Customer name is required.')
      setStep('form')
      return
    }
    if (!draft.items?.length || draft.items.some((i) => !i.label?.trim())) {
      setSaveError('Every line item needs a name.')
      setStep('form')
      return
    }

    setSaving(true)
    setSaveError('')
    try {
      const token = await user.getIdToken()
      const endpoint = editingId ? '/api/receipt-update' : '/api/receipt-create'
      const body = editingId
        ? { storeId: store.id, receiptId: editingId, updates: draft }
        : { storeId: store.id, receipt: draft }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setSaveError(data.error || 'Could not save this receipt. Please try again.')
        return
      }

      setSavedReceipt(data)
      setEditingId(data.id)
      setReceipts((prev) => {
        const exists = prev.some((r) => r.id === data.id)
        return exists ? prev.map((r) => (r.id === data.id ? data : r)) : [data, ...prev]
      })
    } catch (err) {
      console.error('[ReceiptsTab] save failed', err)
      setSaveError('Could not save this receipt. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (receiptId) => {
    const token = await user.getIdToken()
    const res = await fetch('/api/receipt-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ storeId: store.id, receiptId }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Could not delete this receipt.')
    }
    setReceipts((prev) => prev.filter((r) => r.id !== receiptId))
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-green-600">Free For Every Plan</p>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Receipts</h1>
          <p className="mt-0.5 text-xs text-gray-400">Build a fully custom receipt — log whatever your business needs, however you want to print it.</p>
        </div>
        {view === 'history' ? (
          <button
            type="button"
            onClick={startCreate}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-green-700"
          >
            <Plus size={14} /> Create Receipt
          </button>
        ) : (
          <button
            type="button"
            onClick={backToHistory}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-600 transition-all hover:bg-gray-50"
          >
            <X size={14} /> Close
          </button>
        )}
      </div>

      {view === 'history' && (
        <ReceiptHistory
          receipts={receipts}
          loading={receiptsLoading}
          onEdit={startEdit}
          onDelete={handleDelete}
          canPng={canPng}
          whiteLabel={whiteLabel}
        />
      )}

      {view === 'create' && (
        <div className="space-y-5">
          {/* Step breadcrumb */}
          <div className="flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-gray-100 bg-white p-1.5">
            {steps.map((s, idx) => (
              <button
                key={s}
                type="button"
                onClick={() => setStep(s)}
                className={`flex-shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition-all sm:px-4 ${step === s ? 'bg-green-600 text-white' : 'text-gray-400 hover:bg-gray-50'}`}
              >
                {idx + 1}. {stepLabels[s]}
              </button>
            ))}
          </div>

          {saveError && (
            <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">
              <AlertCircle size={13} className="flex-shrink-0" /> {saveError}
            </div>
          )}

          {step === 'form' && <ReceiptForm draft={draft} onChange={setDraft} plan={plan} />}
          {step === 'template' && canBrand && (
            <TemplateSelector
              selectedId={draft.templateId}
              onSelect={(id) => {
                // Picking a template applies its signature palette/font too —
                // otherwise the layout changes but the color stays whatever
                // was left over from the previous template, which looks broken.
                const t = getTemplateById(id)
                setDraft((prev) => ({
                  ...prev,
                  templateId: id,
                  primaryColor: t.defaultColors.primary,
                  secondaryColor: t.defaultColors.secondary,
                  fontFamily: t.defaultFont,
                }))
              }}
              locked={false}
            />
          )}
          {step === 'customize' && canBrand && (
            <ReceiptCustomizer draft={draft} onChange={setDraft} locked={false} store={store} plan={plan} />
          )}
          {step === 'preview' && (
            <ReceiptPreview
              draft={{ ...draft, templateId: canBrand ? draft.templateId : null }}
              savedReceipt={savedReceipt}
              onSave={handleSave}
              saving={saving}
              canPng={canPng}
              whiteLabel={whiteLabel}
              isEditing={!!editingId}
            />
          )}

          {/* Step navigation */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={goBack}
              disabled={steps.indexOf(step) === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-600 transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowLeft size={13} /> Back
            </button>
            {step !== 'preview' ? (
              <button
                type="button"
                onClick={goNext}
                className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-green-700"
              >
                Continue <ArrowRight size={13} />
              </button>
            ) : (
              <button
                type="button"
                onClick={backToHistory}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-600 transition-all hover:bg-gray-50"
              >
                Back to History
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
