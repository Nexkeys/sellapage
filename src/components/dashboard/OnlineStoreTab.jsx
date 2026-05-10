//src/components/dashboard/OnlineStoreTab.jsx/
import {
  Copy, Check, ExternalLink, Eye, Palette, Share2, MessageCircle,
  Lock, LayoutGrid, LayoutList, Rows3, Loader2, UploadCloud, Download, QrCode,
} from 'lucide-react'
import { useState } from 'react'



const COLOUR_SWATCHES = [
  { hex: '#16a34a', label: 'Green' },
  { hex: '#2563eb', label: 'Blue' },
  { hex: '#7c3aed', label: 'Purple' },
  { hex: '#e11d48', label: 'Rose' },
  { hex: '#ea580c', label: 'Orange' },
  { hex: '#0d9488', label: 'Teal' },
]



const LAYOUT_OPTIONS = [
  {
    id: 'grid',
    label: 'Grid',
    icon: LayoutGrid,
    description: 'Products shown in a 2-column card grid — best for visual products like fashion, food, and accessories.',
  },
  {
    id: 'list',
    label: 'List',
    icon: LayoutList,
    description: 'Products shown in a single full-width row with image on the left — best for services or detailed listings.',
  },
  {
    id: 'compact',
    label: 'Compact',
    icon: Rows3,
    description: 'Dense rows with small thumbnails — best for stores with many products.',
  },
]



export default function OnlineStoreTab({ store, storeUrl, isGrowthOrPro, navigateTo, onLogoUpload, onColorSave, onLayoutSave }) {
  const url = storeUrl || `https://sellapage.com/store/${store?.storeName || 'your-store'}`
  const [copied, setCopied]                 = useState(false)
  const [selectedLayout, setSelectedLayout] = useState(store?.storeLayout || 'grid')
  const [layoutSaved, setLayoutSaved]       = useState(false)
  const [logoUploading, setLogoUploading]   = useState(false)
  const [qrDataUrl, setQrDataUrl]           = useState(null)
  const [qrGenerating, setQrGenerating]     = useState(false)
  const [qrError, setQrError]               = useState('')



  const copy = () => {
    navigator.clipboard.writeText(url).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }



  const handleLogoFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoUploading(true)
    try {
      await onLogoUpload(file)
    } finally {
      setLogoUploading(false)
    }
  }



  const handleLayoutSaveClick = async () => {
    await onLayoutSave(selectedLayout)
    setLayoutSaved(true)
    setTimeout(() => setLayoutSaved(false), 2000)
  }



  const generateQr = async () => {
    setQrGenerating(true)
    setQrError('')
    try {
      const QRCode = await import('qrcode')
      const dataUrl = await QRCode.toDataURL(url, {
        width: 256,
        margin: 2,
        color: { dark: '#111827', light: '#ffffff' },
      })
      setQrDataUrl(dataUrl)
    } catch {
      setQrError('Could not generate QR code. Please try again.')
    } finally {
      setQrGenerating(false)
    }
  }



  const downloadQr = () => {
    const a = document.createElement('a')
    a.href = qrDataUrl
    a.download = `${store?.storeName || 'store'}-qr-code.png`
    a.click()
  }



  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Online Store</h1>
        <p className="text-gray-400 text-sm mt-1">Your live store link — share it everywhere to get orders.</p>
      </div>


      {/* ── Store Link ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">Your Store Link</p>
            <p className="text-gray-400 text-xs">Share this to start getting orders on WhatsApp.</p>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 flex items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 min-w-0">
            <p className="text-sm text-gray-600 truncate font-medium">{url}</p>
          </div>
          <button
            onClick={copy}
            className={`flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm font-bold text-white flex-shrink-0 transition-all ${
              copied ? 'bg-green-500' : 'bg-gray-900 hover:bg-gray-700'
            }`}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Shop from ${store?.businessName || 'my store'} 🛍️ ${url}`)}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
          >
            <MessageCircle size={14} /> WhatsApp
          </a>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out my store 🛍️ ${url}`)}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
          >
            <Share2 size={14} /> Twitter
          </a>
          <a
            href={url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
          >
            <ExternalLink size={14} /> View Store
          </a>
        </div>
      </div>


      {/* ── Customise Appearance + Preview Store ────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Customise Appearance */}
        {isGrowthOrPro ? (
          // ── Unlocked: full customisation card ──
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-0 col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Palette size={17} className="text-purple-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">Customise Appearance</p>
                <p className="text-gray-400 text-xs mt-0.5">Logo, colours, and layout for your store.</p>
              </div>
            </div>

            {/* Sub-section 1 — Store Logo */}
            <div className="pt-4">
              <p className="font-bold text-gray-800 text-xs uppercase tracking-wide mb-1">Store Logo</p>
              <p className="text-gray-400 text-xs leading-relaxed mb-3">
                Upload your brand logo — shown on your store's hero section.
              </p>
              <div className="flex items-center gap-3">
                {store?.logoUrl && (
                  <img
                    src={store.logoUrl}
                    alt="Store logo"
                    className="w-10 h-10 rounded-xl object-cover border border-gray-100 shadow-sm flex-shrink-0"
                  />
                )}
                <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  logoUploading
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-900 hover:bg-gray-700 text-white'
                }`}>
                  {logoUploading ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <UploadCloud size={13} />
                      Upload Logo
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={logoUploading}
                    onChange={handleLogoFileChange}
                  />
                </label>
              </div>
            </div>

            {/* Sub-section 2 — Store Colour */}
            <div className="pt-4 mt-4 border-t border-gray-100">
              <p className="font-bold text-gray-800 text-xs uppercase tracking-wide mb-1">Store Colour</p>
              <p className="text-gray-400 text-xs leading-relaxed mb-3">
                Set your store's primary colour — applied to your hero background and buttons.
              </p>
              <div className="flex items-center gap-2.5 mb-2">
                {COLOUR_SWATCHES.map((swatch) => {
                  const isSelected = store?.themeColor === swatch.hex
                  return (
                    <button
                      key={swatch.hex}
                      title={swatch.label}
                      onClick={() => onColorSave(swatch.hex)}
                      className={`w-7 h-7 rounded-full border-2 shadow-md transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                        isSelected
                          ? 'border-gray-900 scale-110'
                          : 'border-white hover:scale-110 hover:ring-2 hover:ring-gray-300 ring-offset-1'
                      }`}
                      style={{ backgroundColor: swatch.hex }}
                      aria-label={`Select ${swatch.label}`}
                    >
                      {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
                    </button>
                  )
                })}
              </div>
              <p className="text-gray-400 text-[11px]">Colour applied to your store hero and buttons.</p>
            </div>

            {/* Sub-section 3 — Store Layout */}
            <div className="pt-4 mt-4 border-t border-gray-100">
              <p className="font-bold text-gray-800 text-xs uppercase tracking-wide mb-1">Store Layout</p>
              <p className="text-gray-400 text-xs leading-relaxed mb-3">
                Choose how your products are arranged and displayed for customers who visit your store page.
              </p>
              <div className="space-y-2 mb-3">
                {LAYOUT_OPTIONS.map((option) => {
                  const Icon = option.icon
                  const isSelected = selectedLayout === option.id
                  return (
                    <button
                      key={option.id}
                      onClick={() => setSelectedLayout(option.id)}
                      className={`w-full flex items-start gap-3 px-3 py-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isSelected ? 'bg-green-500' : 'bg-gray-100'
                      }`}>
                        <Icon size={14} className={isSelected ? 'text-white' : 'text-gray-500'} />
                      </div>
                      <div>
                        <p className={`text-xs font-bold leading-tight ${isSelected ? 'text-green-700' : 'text-gray-800'}`}>
                          {option.label}
                        </p>
                        <p className="text-gray-400 text-[11px] leading-relaxed mt-0.5">{option.description}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
              <button
                onClick={handleLayoutSaveClick}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  layoutSaved
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-900 hover:bg-gray-700 text-white'
                }`}
              >
                {layoutSaved && <Check size={13} />}
                {layoutSaved ? 'Saved!' : 'Save Layout'}
              </button>
              <p className="text-gray-400 text-[11px] mt-2">
                Your customers will see this layout on your store page.
              </p>
            </div>
          </div>
        ) : (
          // ── Locked: upgrade prompt ──
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3 col-span-1">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
              <Palette size={17} className="text-purple-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Customise Appearance</p>
              <p className="text-gray-400 text-xs mt-1">
                Change your store's colours, logo, and layout to match your brand.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-gray-100 text-gray-400 px-4 py-2.5 rounded-xl w-fit">
              <Lock size={13} />
              <span className="text-xs font-semibold">Available on Growth+</span>
            </div>
            <p className="text-gray-400 text-[11px]">Upgrade your plan to unlock store branding.</p>
          </div>
        )}

        {/* Preview Store — always visible, unchanged */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3 col-span-1">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <Eye size={17} className="text-blue-600" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">Preview Store</p>
            <p className="text-gray-400 text-xs mt-1">See exactly how customers view your store on their devices.</p>
          </div>
          <a
            href={url} target="_blank" rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-2.5 rounded-xl text-sm font-bold transition-all"
          >
            <Eye size={13} /> Preview Store
          </a>
        </div>
      </div>


      {/* ── QR Code ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row items-center gap-5">

        {/* QR display box */}
        <div className="w-28 h-28 rounded-2xl flex items-center justify-center flex-shrink-0 border-2 border-dashed border-gray-200 bg-gray-50 overflow-hidden">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Store QR Code" className="w-full h-full object-cover rounded-xl" />
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-300">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="3" height="3"/>
              </svg>
              <span className="text-[10px] mt-1.5 font-medium">QR Code</span>
            </div>
          )}
        </div>

        {/* Text + actions */}
        <div className="flex-1">
          <p className="font-bold text-gray-900 text-sm">Store QR Code</p>
          <p className="text-gray-400 text-xs mt-1 leading-relaxed max-w-xs">
            Generate a QR code and add it to your flyers, business cards, or shop front so customers can scan and order directly.
          </p>

          {qrError && (
            <p className="text-red-500 text-xs mt-2">{qrError}</p>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <button
              onClick={generateQr}
              disabled={qrGenerating}
              className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 disabled:bg-gray-300 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
            >
              {qrGenerating
                ? <><Loader2 size={13} className="animate-spin" /> Generating...</>
                : <><QrCode size={13} /> {qrDataUrl ? 'Regenerate' : 'Generate QR Code'}</>
              }
            </button>

            {qrDataUrl && (
              <button
                onClick={downloadQr}
                className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
              >
                <Download size={13} /> Download PNG
              </button>
            )}
          </div>

          {qrDataUrl && (
            <p className="text-gray-400 text-[11px] mt-2">
              Scan with any camera app to open your store instantly.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}