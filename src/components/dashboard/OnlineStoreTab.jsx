// src/components/dashboard/OnlineStoreTab.jsx
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
  { hex: '#7c3aed', text: 'Purple' },
  { hex: '#e11d48', label: 'Rose' },
  { hex: '#ea580c', label: 'Orange' },
  { hex: '#0d9488', label: 'Teal' },
]

const LAYOUT_OPTIONS = [
  {
    id: 'grid',
    label: 'Grid Layout',
    icon: LayoutGrid,
    description: 'Products shown in a 2-column card grid — best for visual products like fashion, food, and accessories.',
  },
  {
    id: 'list',
    label: 'List Layout',
    icon: LayoutList,
    description: 'Products shown in a single full-width row with image on the left — best for services or detailed listings.',
  },
  {
    id: 'compact',
    label: 'Compact Layout',
    icon: Rows3,
    description: 'Dense rows with small thumbnails — best for stores with many products.',
  },
]

export default function OnlineStoreTab({ store, storeUrl, isGrowthOrPro, isPro, navigateTo, onLogoUpload, onColorSave, onLayoutSave, onThemeSave, onStoreSave, previewProducts = [] }) {
  const url = storeUrl || `https://sellapage.com/store/${store?.storeName || 'your-store'}`
  const [copied, setCopied]                 = useState(false)
  const [selectedLayout, setSelectedLayout] = useState(store?.storeLayout || 'grid')
  const [layoutSaved, setLayoutSaved]       = useState(false)
  const [logoUploading, setLogoUploading]   = useState(false)
  const [qrDataUrl, setQrDataUrl]           = useState(null)
  const [qrGenerating, setQrGenerating]     = useState(false)
  const [qrError, setQrError]               = useState('')
  const [communityLink, setCommunityLink] = useState(store?.whatsappCommunityLink ?? '')
  const [communityLinkSaved, setCommunityLinkSaved] = useState(false)
  const [communityLinkSaving, setCommunityLinkSaving] = useState(false)
  const [communityLinkError, setCommunityLinkError] = useState('')

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

  useEffect(() => {
    setCommunityLink(store?.whatsappCommunityLink ?? '')
  }, [store?.whatsappCommunityLink])

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

  const handleCommunitySave = async () => {
    const trimmed = communityLink.trim()
    if (trimmed && !trimmed.startsWith('https://chat.whatsapp.com/')) {
      setCommunityLinkError('Please enter a valid WhatsApp community invite link.')
      return
    }
    setCommunityLinkError('')
    setCommunityLinkSaving(true)
    try {
      await onStoreSave({ whatsappCommunityLink: trimmed })
      setCommunityLinkSaved(true)
      setTimeout(() => setCommunityLinkSaved(false), 2000)
    } catch {
      setCommunityLinkError('Failed to save. Please try again.')
    } finally {
      setCommunityLinkSaving(false)
    }
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
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      {/* Title Segment */}
      <div className="flex flex-col gap-1">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-green-600">Distribution Channels</p>
        <h1 className="text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">Online Store</h1>
        <p className="text-xs text-gray-400 sm:text-sm">Your live digital shop storefront — route traffic here to accept customer transactions.</p>
      </div>

      {/* ── SECTION 1: Store Link Controller ───────────────────────────────── */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm shadow-gray-100/40 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-green-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm shadow-green-100">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
          </div>
          <div className="min-w-0">
            <p className="font-black text-gray-900 text-sm tracking-tight">Live URL Vector</p>
            <p className="text-gray-400 text-[11px] font-medium truncate">Distribute this web path to collect incoming conversions.</p>
          </div>
        </div>

        {/* Copy String Matrix — Fluid Stack on Mobile */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 flex items-center bg-gray-50 border border-gray-200/80 rounded-xl px-3.5 py-3 min-w-0 shadow-inner">
            <p className="text-xs sm:text-sm text-gray-600 truncate font-semibold select-all w-full">{url}</p>
          </div>
          <button
            type="button"
            onClick={copy}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider text-white transition-all active:scale-[0.98] shadow-sm ${
              copied ? 'bg-green-600' : 'bg-gray-900 hover:bg-gray-800'
            }`}
          >
            {copied ? <Check size={14} strokeWidth={2.5} /> : <Copy size={14} strokeWidth={2.5} />}
            <span>{copied ? 'Copied!' : 'Copy Link'}</span>
          </button>
        </div>

        {/* Distribution Share Triggers — Responsive Button Grid Block */}
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:flex sm:flex-wrap gap-2 pt-1">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Shop from ${store?.businessName || 'my store'} 🛍️ ${url}`)}`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-3 sm:py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-[0.98]"
          >
            <MessageCircle size={14} fill="currentColor" /> WhatsApp
          </a>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out my store 🛍️ ${url}`)}`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-4 py-3 sm:py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-[0.98]"
          >
            <Share2 size={14} /> Twitter
          </a>
          <a
            href={url} target="_blank" rel="noopener noreferrer"
            className="col-span-1 xs:col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 px-4 py-3 sm:py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
          >
            <ExternalLink size={14} /> View Live Store
          </a>
        </div>
      </div>

      {/* ── SECTION 2: Dynamic Styling Split Grid ─────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Block Component Left Hand Side Column Controls */}
        {isPro ? (
          // ── PRO ENGINE INTERFACE PANEL ──
          <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm shadow-gray-100/40 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-purple-100/40">
                <Sparkles size={16} className="text-purple-600" />
              </div>
              <div>
                <p className="font-black text-gray-900 text-sm tracking-tight">Pro Theme Settings</p>
                <p className="text-gray-400 text-[11px] font-medium">Select and fine-tune premium skins.</p>
              </div>
            </div>

            {/* Custom Theme Options Grid Track */}
            <div className="space-y-2">
              <p className="font-extrabold text-gray-400 text-[10px] uppercase tracking-wider">Catalog Archetype</p>
              <div className="grid grid-cols-2 gap-2 max-h-[190px] overflow-y-auto p-0.5 scrollbar-thin">
                {themes.map((theme) => {
                  const isPreviewing = previewThemeId === theme.id
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => handleThemeChange(theme.id)}
                      className={`flex flex-col text-left rounded-xl border p-2.5 transition-all outline-none ${
                        isPreviewing 
                          ? 'border-purple-600 bg-purple-50/20 ring-2 ring-purple-600/20 shadow-sm' 
                          : 'border-gray-100 bg-white hover:border-purple-300'
                      }`}
                    >
                      <div className="flex gap-1 mb-2">
                        <div className="w-3.5 h-3.5 rounded-full border shadow-sm" style={{ backgroundColor: theme.defaultColors.background }} />
                        <div className="w-3.5 h-3.5 rounded-full border shadow-sm" style={{ backgroundColor: theme.defaultColors.primary }} />
                        <div className="w-3.5 h-3.5 rounded-full border shadow-sm" style={{ backgroundColor: theme.defaultColors.accent }} />
                      </div>
                      <p className={`text-xs font-black truncate w-full ${isPreviewing ? 'text-purple-700' : 'text-gray-800'}`}>
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

            {/* Custom Bottom Footer Box Input */}
            <div className="space-y-1.5 pt-4 border-t border-gray-100">
              <p className="font-extrabold text-gray-400 text-[10px] uppercase tracking-wider">Custom Footer Inscription</p>
              <div className="relative">
                <Type size={14} className="absolute left-3 top-3 text-gray-400 pointer-events-none" />
                <textarea
                  rows={2}
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  placeholder={activeThemeObj.defaultThemeText.footer}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 font-medium focus:outline-none focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-600/5 transition-all resize-none"
                />
              </div>
            </div>

            {/* Core Hero Banner Module Row */}
            <div className="space-y-1.5 pt-4 border-t border-gray-100">
              <p className="font-extrabold text-gray-400 text-[10px] uppercase tracking-wider">Hero Billboard Cover</p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                {heroBannerUrl && (
                  <div className="relative w-full sm:w-20 h-12 rounded-xl border border-gray-200/60 shadow-sm overflow-hidden flex-shrink-0 bg-gray-50">
                    <img src={heroBannerUrl} alt="Banner Preview" className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => setHeroBannerUrl('')}
                      className="absolute top-1 right-1 bg-black/60 hover:bg-black text-white rounded-lg p-1 transition-colors"
                    >
                      <X size={10} strokeWidth={2.5} />
                    </button>
                  </div>
                )}
                <label className={`flex items-center justify-center gap-2 px-4 py-3 w-full rounded-xl text-xs font-bold transition-all cursor-pointer border border-dashed select-none ${
                  bannerUploading
                    ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-purple-400 text-gray-600'
                }`}>
                  {bannerUploading ? (
                    <><Loader2 size={13} className="animate-spin text-purple-600" /> Uploading assets...</>
                  ) : (
                    <><ImageIcon size={14} className="text-gray-400" /> Choose Cover Image</>
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

            {/* Custom Theme Color Matrix Picker */}
            <div className="space-y-2 pt-4 border-t border-gray-100">
              <p className="font-extrabold text-gray-400 text-[10px] uppercase tracking-wider">Hex Accent Mapping</p>
              <div className="grid grid-cols-2 gap-2">
                {['background', 'card', 'text', 'primary'].map(colorKey => (
                  <div key={colorKey} className="flex items-center justify-between bg-gray-50 border border-gray-200/60 p-2 rounded-xl">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-wide pl-1">{colorKey}</span>
                    <div className="relative flex items-center">
                      <input
                        type="color"
                        value={customColors[colorKey] ?? activeThemeObj.defaultColors[colorKey]}
                        onChange={(e) => handleColorOverride(colorKey, e.target.value)}
                        className="w-7 h-7 rounded-lg cursor-pointer border border-gray-200 bg-white p-0.5 shadow-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-left pt-0.5">
                 <button type="button" onClick={() => setCustomColors({})} className="text-[10px] text-purple-600 hover:text-purple-700 font-extrabold underline bg-transparent border-none p-0 cursor-pointer">Reset Color Configuration</button>
              </div>
            </div>

            {/* Execute Configuration Save Action */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleThemeSaveClick}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm active:scale-[0.99] ${
                  themeSaved
                    ? 'bg-green-600 text-white shadow-green-100'
                    : 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-100'
                }`}
              >
                {themeSaved && <Check size={14} strokeWidth={2.5} />}
                {themeSaved ? 'Branding Matrix Saved!' : 'Apply Theme Architecture'}
              </button>
            </div>
          </div>
        ) : isGrowthOrPro ? (
          // ── GROWTH PLAN DEFAULT MANAGEMENT RENDER ──
          <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm shadow-gray-100/40 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-purple-100/40">
                <Palette size={16} className="text-purple-600" />
              </div>
              <div>
                <p className="font-black text-gray-900 text-sm tracking-tight">Customise Appearance</p>
                <p className="text-gray-400 text-[11px] font-medium">Configure basic profile assets & styling.</p>
              </div>
            </div>

            {/* Logo Controller Slot */}
            <div className="space-y-2">
              <p className="font-extrabold text-gray-400 text-[10px] uppercase tracking-wider">Brand Stamp Logo</p>
              <div className="flex items-center gap-3 bg-gray-50/50 border border-gray-100 p-2.5 rounded-xl">
                {store?.logoUrl && (
                  <img
                    src={store.logoUrl}
                    alt="Store Badge Logo"
                    className="w-10 h-10 rounded-xl object-cover border border-gray-200 shadow-sm flex-shrink-0 bg-white"
                  />
                )}
                <label className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer w-full select-none ${
                  logoUploading
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-900 hover:bg-gray-800 text-white'
                }`}>
                  {logoUploading ? (
                    <><Loader2 size={13} className="animate-spin text-white" /> Registering file...</>
                  ) : (
                    <><UploadCloud size={13} /> Upload Brand Logo</>
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

            {/* Base Swatch Color Node Row */}
            <div className="space-y-2 pt-4 border-t border-gray-100">
              <p className="font-extrabold text-gray-400 text-[10px] uppercase tracking-wider">Primary Base Hue</p>
              <div className="flex flex-wrap items-center gap-2 bg-gray-50/50 border border-gray-100 p-2.5 rounded-xl">
                {COLOUR_SWATCHES.map((swatch) => {
                  const isSelected = store?.themeColor === swatch.hex
                  return (
                    <button
                      key={swatch.hex}
                      type="button"
                      title={swatch.label || swatch.text}
                      onClick={() => onColorSave(swatch.hex)}
                      className={`w-8 h-8 rounded-full border-2 shadow-sm transition-all flex items-center justify-center focus:outline-none ${
                        isSelected
                          ? 'border-gray-900 scale-110 ring-2 ring-gray-900/10'
                          : 'border-white hover:scale-105 hover:border-gray-200'
                      }`}
                      style={{ backgroundColor: swatch.hex }}
                      aria-label={`Select ${swatch.label || swatch.text}`}
                    >
                      {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Core Product Arrangement Selector Stack */}
            <div className="space-y-2 pt-4 border-t border-gray-100">
              <p className="font-extrabold text-gray-400 text-[10px] uppercase tracking-wider">Layout Display Schema</p>
              <div className="space-y-2">
                {LAYOUT_OPTIONS.map((option) => {
                  const Icon = option.icon
                  const isSelected = selectedLayout === option.id
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSelectedLayout(option.id)}
                      className={`w-full flex items-start gap-3 px-3.5 py-3 rounded-xl border text-left transition-all outline-none ${
                        isSelected
                          ? 'border-green-600 bg-green-50/30 ring-2 ring-green-600/5'
                          : 'border-gray-100 bg-white hover:border-gray-200'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isSelected ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-400'
                      }`}>
                        <Icon size={14} strokeWidth={2.5} />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-black tracking-tight ${isSelected ? 'text-green-700' : 'text-gray-800'}`}>
                          {option.label}
                        </p>
                        <p className="text-gray-400 text-[10px] font-medium leading-relaxed mt-0.5">{option.description}</p>
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleLayoutSaveClick}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm active:scale-[0.99] ${
                    layoutSaved
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-900 hover:bg-gray-800 text-white'
                  }`}
                >
                  {layoutSaved && <Check size={14} strokeWidth={2.5} />}
                  {layoutSaved ? 'Layout Saved!' : 'Commit Layout State'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          // ── PAYWALL CAPTURE CONTAINER FRAME ──
          <div className="rounded-2xl border border-gray-100 bg-white p-5 text-center shadow-sm shadow-gray-100/40 flex flex-col justify-center items-center space-y-3 min-h-[260px]">
            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 border border-purple-100/40 shadow-sm">
              <Palette size={18} />
            </div>
            <div className="space-y-1">
              <p className="text-[9px] font-extrabold uppercase tracking-widest text-purple-600">Premium Component Block</p>
              <h3 className="font-black text-gray-900 text-sm tracking-tight">Themes & Bespoke Branding</h3>
              <p className="text-gray-400 text-xs max-w-[240px] mx-auto leading-relaxed font-medium">
                Unlock 20 premium layout layers, advanced hex toggles, logos, and custom structural page banners.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigateTo('billing')}
              className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-[0.98]"
            >
              <Lock size={12} /> Unlock Pro Branding
            </button>
          </div>
        )}

        {/* Right Hand Side Live Visual Component Column */}
        {isPro ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm shadow-gray-100/40 space-y-4 flex flex-col">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-blue-100/40">
                <Eye size={16} className="text-blue-600" />
              </div>
              <div>
                <p className="font-black text-gray-900 text-sm tracking-tight">Real-Time Mobile Render</p>
                <p className="text-gray-400 text-[11px] font-medium">Live wireframe view of your customer checkout experience.</p>
              </div>
            </div>
            
            {/* Live Sandbox Workspace Wrapper */}
            <div className="flex-1 min-h-[300px] flex flex-col justify-between border border-gray-100 rounded-xl p-1 bg-gray-50/50">
              <ThemeLivePreview
                store={store}
                previewTokens={previewTokens}
                storeLayout={selectedLayout}
                previewProducts={previewProducts}
                storeUrl={url}
              />
            </div>

            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 py-3 rounded-xl text-xs font-bold transition-all active:scale-[0.99]"
            >
              <ExternalLink size={13} /> External Window View
            </a>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm shadow-gray-100/40 space-y-4 flex flex-col justify-center items-center text-center min-h-[260px]">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 border border-blue-100/40 shadow-sm">
              <Eye size={16} strokeWidth={2.5} />
            </div>
            <div className="space-y-1">
              <h3 className="font-black text-gray-900 text-sm tracking-tight">Evaluate Layout Setup</h3>
              <p className="text-gray-400 text-xs max-w-xs leading-relaxed font-medium">Verify exactly how custom products organize and stack across small device displays.</p>
            </div>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm active:scale-[0.99]"
            >
              <Eye size={13} /> Launch Preview
            </a>
          </div>
        )}
      </div>

      {/* ── SECTION 3: WhatsApp Community Hub ─────────────────────────── */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-green-50 border border-green-100">
            <MessageCircle size={16} className="text-green-600" fill="currentColor" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm tracking-tight">WhatsApp Community</p>
            <p className="text-gray-400 text-[11px] mt-0.5">Add your WhatsApp community link — customers can join directly from your storefront.</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-700">Community Invite Link</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="url"
              value={communityLink}
              onChange={(e) => { setCommunityLink(e.target.value); setCommunityLinkError('') }}
              placeholder="https://chat.whatsapp.com/your-invite-link"
              className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-xs text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 focus:bg-white"
            />
            <button
              type="button"
              onClick={handleCommunitySave}
              disabled={communityLinkSaving}
              className={`flex-shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                communityLinkSaved
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-900 hover:bg-gray-800 text-white disabled:opacity-50'
              }`}
            >
              {communityLinkSaving ? (
                <Loader2 size={13} className="animate-spin" />
              ) : communityLinkSaved ? (
                <><Check size={13} /> Saved!</>
              ) : (
                'Save Link'
              )}
            </button>
          </div>
          {communityLinkError && (
            <p className="text-xs text-red-500 font-semibold">{communityLinkError}</p>
          )}
          <p className="text-[11px] text-gray-400 leading-relaxed">
            When saved, a &quot;Join Community&quot; button appears on your storefront so customers can connect with your WhatsApp group.
          </p>
          {store?.whatsappCommunityLink && (
            <a
              href={store.whatsappCommunityLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] text-green-600 font-semibold hover:underline"
            >
              <ExternalLink size={11} /> Preview community link
            </a>
          )}
        </div>
      </div>

      {/* ── SECTION 3: QR Code Vector Block ────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm shadow-gray-100/40 flex flex-col sm:flex-row items-center gap-5">
        
        {/* Dynamic Image Canvas Box Frame */}
        <div className="w-28 h-28 rounded-xl flex items-center justify-center flex-shrink-0 border-2 border-dashed border-gray-200 bg-gray-50 overflow-hidden shadow-inner relative">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Storefront QR Code String" className="w-full h-full object-cover p-1.5 bg-white rounded-xl" />
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-300 select-none">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="3" height="3"/>
              </svg>
              <span className="text-[9px] mt-1.5 font-bold uppercase tracking-wider">Matrix Empty</span>
            </div>
          )}
        </div>

        {/* Text Actions Control Grid */}
        <div className="flex-1 text-center sm:text-left space-y-2 w-full">
          <div>
            <h4 className="font-black text-gray-900 text-sm tracking-tight">Printable Store QR Vector</h4>
            <p className="text-gray-400 text-[11px] font-medium leading-relaxed max-w-sm mt-0.5 mx-auto sm:mx-0">
              Generate static physical scannable matrices. Embed on invoices, delivery tags, package boxes, or physical marketing collateral.
            </p>
          </div>

          {qrError && (
            <p className="text-red-500 text-xs font-semibold">{qrError}</p>
          )}

          <div className="flex flex-col xs:flex-row items-stretch sm:items-center gap-2 pt-1">
            <button
              type="button"
              onClick={generateQr}
              disabled={qrGenerating}
              className="inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-200 text-white px-4 py-3 sm:py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-[0.98]"
            >
              {qrGenerating ? (
                <><Loader2 size={13} className="animate-spin text-white" /> Rendering matrix...</>
              ) : (
                <><QrCode size={13} /> {qrDataUrl ? 'Regenerate QR' : 'Compile QR Code'}</>
              )}
            </button>

            {qrDataUrl && (
              <button
                type="button"
                onClick={downloadQr}
                className="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-3 sm:py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-[0.98]"
              >
                <Download size={13} /> Save Image (PNG)
              </button>
            )}
          </div>

          {qrDataUrl && (
            <p className="text-gray-400 text-[10px] font-medium" style={{ fontVariantNumeric: 'tabular-nums' }}>
              ℹ️ Standard resolution asset compiled. Ready for cross-platform distribution.
            </p>
          )}
        </div>
      </div>

    </div>
  )
}