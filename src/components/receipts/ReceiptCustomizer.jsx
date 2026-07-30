// src/components/receipts/ReceiptCustomizer.jsx
import { useState } from 'react'
import QRCode from 'qrcode'
import { Loader2, UploadCloud, X, Lock } from 'lucide-react'
import { uploadSingleImage } from '../../firebase/products'
import { PDF_FONT_OPTIONS, STAMP_PRESETS, STAMP_POSITIONS } from '../../utils/receiptTemplates'

const COLOR_SWATCHES = ['#22c55e', '#0f172a', '#7c3aed', '#1e3a8a', '#f97316', '#dc2626', '#0891b2', '#111827']

export default function ReceiptCustomizer({ draft, onChange, locked, store, plan }) {
  const [logoUploading, setLogoUploading] = useState(false)
  const [stampUploading, setStampUploading] = useState(false)
  const [qrLoading, setQrLoading] = useState(false)

  const patch = (fields) => onChange((prev) => ({ ...prev, ...fields }))

  const handleLogoUpload = async (file) => {
    if (!file) return
    setLogoUploading(true)
    try {
      const url = await uploadSingleImage(file, 'sellapage/receipts/logos')
      patch({ logoUrl: url })
    } catch (err) {
      console.error('Logo upload failed', err)
    } finally {
      setLogoUploading(false)
    }
  }

  const handleStampUpload = async (file) => {
    if (!file) return
    setStampUploading(true)
    try {
      const url = await uploadSingleImage(file, 'sellapage/receipts/stamps')
      patch({ stampType: 'uploaded', stampUrl: url })
    } catch (err) {
      console.error('Stamp upload failed', err)
    } finally {
      setStampUploading(false)
    }
  }

  const toggleQrCode = async (enabled) => {
    if (!enabled) {
      patch({ qrCodeEnabled: false, qrCodeUrl: null })
      return
    }
    setQrLoading(true)
    try {
      const useCustomDomain = plan === 'premium' && store?.customDomain && store?.customDomainStatus === 'active'
      const link = useCustomDomain ? `https://${store.customDomain}` : `https://sellapage.com.ng/${store?.storeName || ''}`
      const dataUrl = await QRCode.toDataURL(link, { margin: 1, width: 240 })
      patch({ qrCodeEnabled: true, qrCodeUrl: dataUrl })
    } catch (err) {
      console.error('QR generation failed', err)
    } finally {
      setQrLoading(false)
    }
  }

  if (locked) {
    return (
      <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-6 text-center">
        <Lock size={20} className="mx-auto mb-2 text-amber-500" />
        <p className="text-sm font-bold text-amber-900">Branding customization is a Growth+ feature</p>
        <p className="mt-1 text-xs text-amber-700">Upgrade to add your logo, a stamp, colors, and a QR code to your receipts.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Colors */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4">
        <p className="mb-3 text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Accent Color</p>
        <div className="flex flex-wrap gap-2">
          {COLOR_SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => patch({ primaryColor: c })}
              className={`h-8 w-8 flex-shrink-0 rounded-full border-2 transition-all ${draft.primaryColor === c ? 'border-gray-900 scale-110' : 'border-white'}`}
              style={{ backgroundColor: c, boxShadow: '0 0 0 1px #e5e7eb' }}
              aria-label={c}
            />
          ))}
          <label className="flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-full border border-dashed border-gray-300 text-[9px] font-bold text-gray-400">
            +
            <input type="color" value={draft.primaryColor || '#22c55e'} onChange={(e) => patch({ primaryColor: e.target.value })} className="hidden" />
          </label>
        </div>
      </div>

      {/* Font */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4">
        <p className="mb-3 text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Font (PDF export)</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PDF_FONT_OPTIONS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => patch({ fontFamily: f.value })}
              className={`rounded-xl border px-3 py-2 text-xs font-bold transition-all ${draft.fontFamily === f.value ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Logo */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4">
        <p className="mb-3 text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Logo</p>
        <div className="flex items-center gap-3">
          {draft.logoUrl ? (
            <img src={draft.logoUrl} alt="Logo" className="h-14 w-14 rounded-xl border border-gray-100 object-contain p-1" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-gray-200 text-gray-300">
              <UploadCloud size={18} />
            </div>
          )}
          <div className="flex items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50">
              {logoUploading ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />}
              {logoUploading ? 'Uploading...' : draft.logoUrl ? 'Change Logo' : 'Upload Logo'}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && handleLogoUpload(e.target.files[0])} disabled={logoUploading} />
            </label>
            {draft.logoUrl && (
              <button type="button" onClick={() => patch({ logoUrl: null })} className="rounded-xl border border-gray-200 p-2 text-gray-400 hover:bg-red-50 hover:text-red-600">
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stamp */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4">
        <p className="mb-3 text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Stamp</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => patch({ stampType: null, stampUrl: null })}
            className={`rounded-xl border px-3 py-2 text-xs font-bold transition-all ${!draft.stampType ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
          >
            None
          </button>
          {STAMP_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => patch({ stampType: 'platform', stampUrl: null, stampLabel: preset.label, stampColor: preset.color })}
              className={`rounded-xl border px-3 py-2 text-xs font-bold transition-all ${draft.stampType === 'platform' && draft.stampLabel === preset.label ? 'border-green-500 bg-green-50' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
              style={draft.stampType === 'platform' && draft.stampLabel === preset.label ? { color: preset.color } : {}}
            >
              {preset.label}
            </button>
          ))}
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-dashed border-gray-300 px-3 py-2 text-xs font-bold text-gray-500 hover:border-green-400 hover:text-green-600">
            {stampUploading ? <Loader2 size={12} className="animate-spin" /> : <UploadCloud size={12} />}
            Custom
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && handleStampUpload(e.target.files[0])} disabled={stampUploading} />
          </label>
        </div>

        {draft.stampType && (
          <div className="mt-3">
            <p className="mb-1.5 text-[10px] font-bold text-gray-400">Position</p>
            <div className="flex flex-wrap gap-1.5">
              {STAMP_POSITIONS.map((pos) => (
                <button
                  key={pos}
                  type="button"
                  onClick={() => patch({ stampPosition: pos })}
                  className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-bold capitalize transition-all ${draft.stampPosition === pos ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-400 hover:bg-gray-50'}`}
                >
                  {pos.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* QR code */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">QR Code</p>
            <p className="mt-0.5 text-[11px] text-gray-400">Links to your Sellapage store</p>
          </div>
          <button
            type="button"
            onClick={() => toggleQrCode(!draft.qrCodeEnabled)}
            disabled={qrLoading}
            className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${draft.qrCodeEnabled ? 'bg-green-600' : 'bg-gray-200'}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${draft.qrCodeEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
        {qrLoading && <p className="mt-2 text-[11px] text-gray-400">Generating QR code…</p>}
        {draft.qrCodeEnabled && draft.qrCodeUrl && (
          <div className="mt-3 flex items-center gap-3">
            <img src={draft.qrCodeUrl} alt="QR preview" className="h-14 w-14 rounded-lg border border-gray-100" />
            <div className="flex flex-wrap gap-1.5">
              {['bottom-left', 'bottom-right', 'top-left', 'top-right'].map((pos) => (
                <button
                  key={pos}
                  type="button"
                  onClick={() => patch({ qrCodePosition: pos })}
                  className={`rounded-lg border px-2 py-1 text-[10px] font-bold capitalize transition-all ${draft.qrCodePosition === pos ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-400 hover:bg-gray-50'}`}
                >
                  {pos.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
