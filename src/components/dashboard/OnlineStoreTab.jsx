//src/components/dashboard/OnlineStoreTab.jsx/
import {
  Copy, Check, ExternalLink, Eye, Palette, Share2, MessageCircle,
  Lock, LayoutGrid, LayoutList, Rows3, Loader2, UploadCloud, Download, QrCode,
  Image as ImageIcon, Type, Sparkles, X
} from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { themes } from '../../utils/themes'
import { resolveStoreThemeTokens } from '../../utils/resolveStoreTheme'
import { uploadSingleImage } from '../../firebase/products'
import ThemeLivePreview from './ThemeLivePreview'

const getInitialThemeId = (store) => store?.storeTheme || 'classic-default'



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



export default function OnlineStoreTab({ store, storeUrl, isGrowthOrPro, isPro, navigateTo, onLogoUpload, onColorSave, onLayoutSave, onThemeSave, previewProducts = [] }) {
  const url = storeUrl || `https://sellapage.com/store/${store?.storeName || 'your-store'}`
  const [copied, setCopied]                 = useState(false)
  const [selectedLayout, setSelectedLayout] = useState(store?.storeLayout || 'grid')
  const [layoutSaved, setLayoutSaved]       = useState(false)
  const [logoUploading, setLogoUploading]   = useState(false)
  const [qrDataUrl, setQrDataUrl]           = useState(null)
  const [qrGenerating, setQrGenerating]     = useState(false)
  const [qrError, setQrError]               = useState('')

  // Pro Theme States
  const [previewThemeId, setPreviewThemeId]   = useState(() => getInitialThemeId(store))
  const [selectedThemeId, setSelectedThemeId] = useState(() => getInitialThemeId(store))
  const [footerText, setFooterText]           = useState(store?.themeMetadata?.footerText ?? '')
  const [heroBannerUrl, setHeroBannerUrl]     = useState(store?.themeMetadata?.heroBannerUrl ?? '')
  const [customColors, setCustomColors]       = useState(store?.themeMetadata?.customColors ?? {})
  const [themeSaved, setThemeSaved]           = useState(false)
  const [bannerUploading, setBannerUploading] = useState(false)

  useEffect(() => {
    if (!store) return
    const themeId = getInitialThemeId(store)
    setPreviewThemeId(themeId)
    setSelectedThemeId(themeId)
    setFooterText(store.themeMetadata?.footerText ?? '')
    setHeroBannerUrl(store.themeMetadata?.heroBannerUrl ?? '')
    setCustomColors(store.themeMetadata?.customColors ?? {})
  }, [
    store?.id,
    store?.storeTheme,
    store?.themeMetadata?.footerText,
    store?.themeMetadata?.heroBannerUrl,
    store?.themeMetadata?.customColors,
  ])

  const previewDraft = useMemo(
    () => ({
      themeId: previewThemeId,
      themeMetadata: { footerText, heroBannerUrl, customColors },
    }),
    [previewThemeId, footerText, heroBannerUrl, customColors]
  )

  const previewTokens = useMemo(
    () => resolveStoreThemeTokens(store, previewDraft, { bannerWidth: 400 }),
    [store, previewDraft]
  )

  const activeThemeObj = themes.find(t => t.id === selectedThemeId) ?? themes[0]



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

  const handleBannerFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBannerUploading(true)
    try {
      const url = await uploadSingleImage(file, 'sellapage/banners')
      if (url) setHeroBannerUrl(url)
    } catch (err) {
      console.error('Banner upload failed', err)
    } finally {
      setBannerUploading(false)
    }
  }

  const handleThemeSaveClick = async () => {
    await onThemeSave(selectedThemeId, {
      footerText,
      heroBannerUrl,
      customColors
    })
    setThemeSaved(true)
    setTimeout(() => setThemeSaved(false), 2000)
  }

  const handleThemeChange = (id) => {
    setPreviewThemeId(id)
    setSelectedThemeId(id)
    setCustomColors({}) // reset color overrides when theme changes
  }

  const handleColorOverride = (key, val) => {
    setCustomColors(prev => ({ ...prev, [key]: val }))
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
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Online Store</h1>
        <p className="text-gray-400 text-sm mt-1">Your live store link — share it everywhere to get orders.</p>
      </div>


      {/* ── Store Link ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-gray-100/80 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-green-100">
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
          <div className="flex-1 flex items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 min-w-0 shadow-inner shadow-gray-100">
            <p className="text-sm text-gray-600 truncate font-medium">{url}</p>
          </div>
          <button
            onClick={copy}
            className={`flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm font-bold text-white flex-shrink-0 transition-all shadow-sm hover:shadow-md ${
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
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm hover:shadow-md"
          >
            <MessageCircle size={14} /> WhatsApp
          </a>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out my store 🛍️ ${url}`)}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm hover:shadow-md"
          >
            <Share2 size={14} /> Twitter
          </a>
          <a
            href={url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
          >
            <ExternalLink size={14} /> View Store
          </a>
        </div>
      </div>


      {/* ── Customise Appearance + Preview Store ────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Customise Appearance */}
        {isPro ? (
          // ── Pro Plan: Full Theme Engine ──
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-gray-100/80 p-5 space-y-0 col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Sparkles size={17} className="text-purple-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">Pro Store Themes</p>
                <p className="text-gray-400 text-xs mt-0.5">Select a premium theme for your store.</p>
              </div>
            </div>

            {/* Theme Selector Grid */}
            <div className="pt-4">
              <p className="font-bold text-gray-800 text-xs uppercase tracking-wide mb-3">Select Theme</p>
              <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1 scrollbar-thin">
                {themes.map((theme) => {
                  const isPreviewing = previewThemeId === theme.id
                  return (
                    <button
                      key={theme.id}
                      onClick={() => handleThemeChange(theme.id)}
                      className={`flex flex-col text-left rounded-xl border p-2 transition-all ${
                        isPreviewing ? 'border-purple-500 shadow-md ring-2 ring-purple-500' : 'border-gray-200 hover:border-purple-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex gap-1 mb-2">
                        <div className="w-4 h-4 rounded-full border shadow-sm" style={{ backgroundColor: theme.defaultColors.background }} />
                        <div className="w-4 h-4 rounded-full border shadow-sm" style={{ backgroundColor: theme.defaultColors.primary }} />
                        <div className="w-4 h-4 rounded-full border shadow-sm" style={{ backgroundColor: theme.defaultColors.accent }} />
                      </div>
                      <p className={`text-xs font-bold truncate ${isPreviewing ? 'text-purple-700' : 'text-gray-800'}`}>
                        {theme.name}
                      </p>
                      <p className="text-[9px] text-gray-400 truncate mt-0.5" style={{ fontFamily: theme.typography.headerFontFamily }}>
                        Aa - {theme.typography.headerFontFamily.split(',')[0].replace(/'/g, '')}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Custom Footer Text */}
            <div className="pt-5 mt-5 border-t border-gray-100">
              <p className="font-bold text-gray-800 text-xs uppercase tracking-wide mb-1">Custom Footer Text</p>
              <p className="text-gray-400 text-[11px] mb-2">Override the default theme footer text.</p>
              <div className="relative">
                <Type size={14} className="absolute left-3 top-3 text-gray-400" />
                <textarea
                  rows={3}
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  placeholder={activeThemeObj.defaultThemeText.footer}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all resize-none"
                />
              </div>
            </div>

            {/* Hero Banner Upload */}
            <div className="pt-5 mt-5 border-t border-gray-100">
              <p className="font-bold text-gray-800 text-xs uppercase tracking-wide mb-1">Hero Banner Image</p>
              <p className="text-gray-400 text-[11px] mb-3">Upload a custom hero banner (replaces standard hero block).</p>
              
              <div className="flex items-center gap-3">
                {heroBannerUrl && (
                  <div className="relative w-16 h-10 rounded-lg border shadow-sm overflow-hidden flex-shrink-0">
                    <img src={heroBannerUrl} alt="Banner" className="w-full h-full object-cover" />
                    <button 
                      onClick={() => setHeroBannerUrl('')}
                      className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5 hover:bg-black/80"
                    >
                      <X size={10} />
                    </button>
                  </div>
                )}
                <label className={`flex items-center justify-center gap-2 px-4 py-2 w-full rounded-xl text-xs font-bold transition-all cursor-pointer border border-dashed ${
                  bannerUploading
                    ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-50 border-gray-300 hover:bg-gray-100 hover:border-purple-300 text-gray-600'
                }`}>
                  {bannerUploading ? (
                    <><Loader2 size={13} className="animate-spin" /> Uploading...</>
                  ) : (
                    <><ImageIcon size={14} /> Upload Banner</>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={bannerUploading}
                    onChange={handleBannerFileChange}
                  />
                </label>
              </div>
            </div>

            {/* Advanced Hex Overrides */}
            <div className="pt-5 mt-5 border-t border-gray-100">
              <p className="font-bold text-gray-800 text-xs uppercase tracking-wide mb-3">Advanced Color Tuning</p>
              <div className="grid grid-cols-2 gap-3">
                {['background', 'card', 'text', 'primary'].map(colorKey => (
                  <div key={colorKey} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-100">
                    <span className="text-[10px] font-semibold text-gray-500 uppercase">{colorKey}</span>
                    <input
                      type="color"
                      value={customColors[colorKey] ?? activeThemeObj.defaultColors[colorKey]}
                      onChange={(e) => handleColorOverride(colorKey, e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                    />
                  </div>
                ))}
              </div>
              <div className="mt-3 text-right">
                 <button onClick={() => setCustomColors({})} className="text-[10px] text-purple-500 hover:text-purple-700 font-semibold underline">Reset Overrides</button>
              </div>
            </div>

            {/* Save Theme Button */}
            <div className="pt-5 mt-4 border-t border-gray-100">
              <button
                onClick={handleThemeSaveClick}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all shadow-md ${
                  themeSaved
                    ? 'bg-green-500 text-white'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
              >
                {themeSaved && <Check size={16} />}
                {themeSaved ? 'Theme Saved!' : 'Save Theme Settings'}
              </button>
            </div>

          </div>
        ) : isGrowthOrPro ? (
          // ── Growth Plan: Standard Customisation ──
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-gray-100/80 p-5 space-y-0 col-span-1">
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
                          ? 'border-green-500 bg-green-50 shadow-sm shadow-green-100/70'
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
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
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
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-gray-100/80 p-5 space-y-3 col-span-1">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
              <Palette size={17} className="text-purple-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Pro Store Themes & Branding</p>
              <p className="text-gray-400 text-xs mt-1">
                Unlock 20 premium themes, custom colors, logos, and banners to match your brand.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-gray-100 text-gray-400 px-4 py-2.5 rounded-xl w-fit">
              <Lock size={13} />
              <span className="text-xs font-semibold">Available on Pro</span>
            </div>
            <p className="text-gray-400 text-[11px]">Upgrade your plan to unlock branding.</p>
          </div>
        )}

        {/* Live theme preview (Pro) or static link */}
        {isPro ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-gray-100/80 p-5 space-y-4 col-span-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Eye size={17} className="text-blue-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">Live Theme Preview</p>
                <p className="text-gray-400 text-xs mt-0.5">
                  Tap a theme to preview on mobile — save when you are happy.
                </p>
              </div>
            </div>
            <ThemeLivePreview
              store={store}
              previewTokens={previewTokens}
              storeLayout={selectedLayout}
              previewProducts={previewProducts}
              storeUrl={url}
            />
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-blue-300 py-2.5 rounded-xl text-xs font-bold transition-all"
            >
              <ExternalLink size={13} /> Open full store in new tab
            </a>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-gray-100/80 p-5 space-y-3 col-span-1">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Eye size={17} className="text-blue-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Preview Store</p>
              <p className="text-gray-400 text-xs mt-1">See exactly how customers view your store on their devices.</p>
            </div>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm hover:shadow-md"
            >
              <Eye size={13} /> Preview Store
            </a>
          </div>
        )}
      </div>


      {/* ── QR Code ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-gray-100/80 p-5 flex flex-col sm:flex-row items-center gap-5">

        {/* QR display box */}
        <div className="w-28 h-28 rounded-2xl flex items-center justify-center flex-shrink-0 border-2 border-dashed border-gray-200 bg-gray-50 overflow-hidden shadow-inner shadow-gray-100">
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
              className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 disabled:bg-gray-300 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-md"
            >
              {qrGenerating
                ? <><Loader2 size={13} className="animate-spin" /> Generating...</>
                : <><QrCode size={13} /> {qrDataUrl ? 'Regenerate' : 'Generate QR Code'}</>
              }
            </button>

            {qrDataUrl && (
              <button
                onClick={downloadQr}
                className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-md"
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
