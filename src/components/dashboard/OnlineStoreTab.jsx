// src/components/dashboard/OnlineStoreTab.jsx
//
// The Business Page tab, rebuilt on 2026-09-26 to the Business Page design.
// Everything it did before still works the same way and saves through the
// same Dashboard handlers: store link and sharing, logo (every plan), Pro
// themes with footer text, banner and custom colours, Growth colour and
// layout, the WhatsApp community link, the QR code, and the live preview.
//
// New:
//   - sub-tabs (Store Setup, Theme & Design, Business Info, Social & Links,
//     More), so a vendor can go straight to one job
//   - the QR code is remembered: `qrCode: { url, createdAt }` on the store,
//     and redrawn from that link on the next visit (a QR code is fully
//     determined by its link, so no image is stored)
//   - a printable "Scan to shop" poster made from the QR code
//   - "now share your link" right after a logo goes up
//   - the live preview for every plan, with a phone / desktop switch
//   - theme cards drawn from each theme's own colours
import {
  Copy, Check, ExternalLink, Eye, Palette, Share2, MessageCircle, Lock, LayoutGrid, LayoutList, Rows3,
  Loader2, UploadCloud, Download, QrCode, Image as ImageIcon, Sparkles, X, Store, Link2, Info, MoreHorizontal,
  Smartphone, Monitor, ShieldCheck, Heart, ArrowRight, Globe, Wand2, BadgeCheck, Megaphone, Settings as SettingsIcon,
  Crown, RotateCcw, FileImage, Phone, Mail, MapPin, Building2, CheckCircle2, Users,
} from 'lucide-react'
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { themes } from '../../utils/themes'
import { resolveStoreThemeTokens } from '../../utils/resolveStoreTheme'
import { uploadSingleImage } from '../../firebase/products'
import ThemeLivePreview from './ThemeLivePreview'
import MediaSlot from '../../media/MediaSlot'
import { hasMedia } from '../../media/hasMedia'

const getInitialThemeId = (store) => store?.storeTheme || 'classic-default'
const card = 'rounded-2xl border border-dash-line bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]'
const FOOTER_MAX = 100

const COLOUR_SWATCHES = [
  { hex: '#16a34a', label: 'Green' },
  { hex: '#2563eb', label: 'Blue' },
  { hex: '#7c3aed', label: 'Purple' },
  { hex: '#e11d48', label: 'Rose' },
  { hex: '#ea580c', label: 'Orange' },
  { hex: '#0d9488', label: 'Teal' },
]

const LAYOUT_OPTIONS = [
  { id: 'grid', label: 'Grid', icon: LayoutGrid, description: 'Two-column cards. Best for fashion, food and accessories.' },
  { id: 'list', label: 'List', icon: LayoutList, description: 'Full-width rows with the photo on the left. Best for services.' },
  { id: 'compact', label: 'Compact', icon: Rows3, description: 'Dense rows with small photos. Best for big catalogues.' },
]

const SUBTABS = [
  { id: 'setup', label: 'Store Setup', icon: Store },
  { id: 'theme', label: 'Theme & Design', icon: Palette },
  { id: 'info', label: 'Business Info', icon: Info },
  { id: 'social', label: 'Social & Links', icon: Link2 },
  { id: 'more', label: 'More', icon: MoreHorizontal },
]

// A tiny drawing of a store in a theme's own colours, for the theme cards.
function ThemeSwatch({ theme }) {
  const c = theme.defaultColors
  return (
    <svg viewBox="0 0 120 72" className="h-full w-full" aria-hidden="true">
      <rect width="120" height="72" fill={c.background} />
      <rect width="120" height="12" fill={c.primary} />
      <rect x="6" y="4" width="22" height="4" rx="2" fill={c.background} opacity="0.85" />
      <rect x="8" y="18" width="48" height="6" rx="2" fill={c.text} opacity="0.85" />
      <rect x="8" y="27" width="30" height="3" rx="1.5" fill={c.text} opacity="0.4" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={8 + i * 36} y="36" width="32" height="30" rx="4" fill={c.card} stroke={c.text} strokeOpacity="0.08" />
          <rect x={11 + i * 36} y="39" width="26" height="14" rx="2" fill={c.accent || c.primary} opacity="0.35" />
          <rect x={11 + i * 36} y="57" width="16" height="3" rx="1.5" fill={c.text} opacity="0.6" />
          <rect x={11 + i * 36} y="61.5" width="10" height="2.5" rx="1.25" fill={c.primary} />
        </g>
      ))}
    </svg>
  )
}

function Toast({ text, onClose }) {
  useEffect(() => {
    if (!text) return undefined
    const t = setTimeout(onClose, 2800)
    return () => clearTimeout(t)
  }, [text, onClose])
  if (!text) return null
  return (
    <div role="status" className="fixed bottom-6 left-1/2 z-[70] flex w-[min(92vw,420px)] -translate-x-1/2 items-center gap-2.5 rounded-2xl bg-dash-ink px-4 py-3 text-sm text-white shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
      <CheckCircle2 size={17} className="flex-shrink-0 text-green-400" /> <span className="flex-1">{text}</span>
    </div>
  )
}

function ShareNudge({ open, store, url, onClose }) {
  const [copied, setCopied] = useState(false)
  if (!open) return null
  const msg = `Shop from ${store?.businessName || 'my store'}: ${url}`
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2200) } catch { /* shown on screen */ }
  }
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="sn-title">
      <style>{'@keyframes sn-pop{0%{transform:scale(.6);opacity:0}70%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}@keyframes sn-ring{0%{transform:scale(.8);opacity:.7}100%{transform:scale(1.6);opacity:0}}.sn-pop{animation:sn-pop .5s cubic-bezier(.2,.9,.3,1.2) both}.sn-ring{animation:sn-ring 1.8s ease-out infinite}@media (prefers-reduced-motion: reduce){.sn-pop,.sn-ring{animation:none}}'}</style>
      <div className="absolute inset-0 bg-forest-900/50 backdrop-blur-[3px]" onClick={onClose} />
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white text-center shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <button type="button" onClick={onClose} className="absolute right-3 top-3 z-10 rounded-full p-2 text-dash-muted hover:bg-gray-100" aria-label="Close"><X size={17} /></button>
        <div className="relative flex justify-center bg-gradient-to-b from-forest-50 to-white pb-2 pt-8">
          <span className="sn-ring absolute top-8 h-24 w-24 rounded-3xl border-2 border-forest-200" />
          <span className="sn-pop relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border-4 border-white bg-white shadow-xl">
            {store?.logoUrl ? <img src={store.logoUrl} alt="" className="h-full w-full object-cover" /> : <Store size={32} className="text-forest" />}
          </span>
        </div>
        <div className="px-6 pb-6 pt-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-forest-600">Looking sharp</p>
          <h3 id="sn-title" className="mt-1 font-display text-xl font-extrabold leading-snug text-dash-ink text-balance">Now you&apos;ve added your logo, don&apos;t you think it&apos;s time to share your store link around?</h3>
          <p className="mt-2 text-sm text-dash-muted">Your store looks like a proper brand now. Put it where your customers already are.</p>
          <div className="mt-5 grid gap-2">
            <a href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-95">
              <MessageCircle size={16} /> Share on WhatsApp
            </a>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={copy} className={`inline-flex items-center justify-center gap-1.5 rounded-2xl border px-3 py-2.5 text-sm font-semibold transition ${copied ? 'border-forest bg-forest-50 text-forest' : 'border-dash-line text-dash-ink hover:bg-gray-50'}`}>
                {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Copy link'}
              </button>
              <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-dash-line px-3 py-2.5 text-sm font-semibold text-dash-ink transition hover:bg-gray-50">
                <Share2 size={15} /> Post on X
              </a>
            </div>
            <button type="button" onClick={onClose} className="mt-1 text-xs font-semibold text-dash-muted hover:text-dash-ink">I&apos;ll share it later</button>
          </div>
          <p className="mt-3 truncate text-[11px] text-dash-muted">{url}</p>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function UpgradeTeaser({ title, children, cta, onClick, peek }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-forest-100 bg-gradient-to-br from-forest-50 via-white to-amber-50/40 p-5">
      {peek && <div className="pointer-events-none absolute inset-x-0 -bottom-6 flex gap-2 px-4 opacity-40 blur-[1.5px]">{peek}</div>}
      <div className="relative">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm"><Crown size={19} className="fill-amber-400 text-amber-500" /></span>
        <p className="mt-3 text-[15px] font-bold text-dash-ink">{title}</p>
        <p className="mt-1 max-w-md text-[13px] leading-relaxed text-slate-600">{children}</p>
        <button type="button" onClick={onClick} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-forest/20 transition hover:bg-forest-700">
          {cta} <ArrowRight size={14} />
        </button>
        {peek && <div className="h-16" />}
      </div>
    </div>
  )
}

export default function OnlineStoreTab({ store, storeUrl, isGrowthOrPro, isPro, navigateTo, onLogoUpload, logoError, onColorSave, onLayoutSave, onThemeSave, onStoreSave, previewProducts = [] }) {
  const url = storeUrl || `https://sellapage.com/${store?.storeName || 'your-store'}`
  const [sub, setSub] = useState('setup')
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState('')
  const clearToast = useCallback(() => setToast(''), [])
  const [selectedLayout, setSelectedLayout] = useState(store?.storeLayout || 'grid')
  const [layoutSaving, setLayoutSaving] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const [nudge, setNudge] = useState(false)
  const awaitingLogo = useRef(null)
  const [coverUploading, setCoverUploading] = useState(false)
  const [coverError, setCoverError] = useState('')
  const [device, setDevice] = useState('mobile')
  const [showAllThemes, setShowAllThemes] = useState(false)

  const [qrDataUrl, setQrDataUrl] = useState(null)
  const [qrGenerating, setQrGenerating] = useState(false)
  const [qrError, setQrError] = useState('')
  const [posterBusy, setPosterBusy] = useState(false)

  const [communityLink, setCommunityLink] = useState(store?.whatsappCommunityLink ?? '')
  const [communityLinkSaving, setCommunityLinkSaving] = useState(false)
  const [communityLinkError, setCommunityLinkError] = useState('')

  // Pro theme draft
  const [previewThemeId, setPreviewThemeId] = useState(() => getInitialThemeId(store))
  const [selectedThemeId, setSelectedThemeId] = useState(() => getInitialThemeId(store))
  const [footerText, setFooterText] = useState(store?.themeMetadata?.footerText ?? '')
  const [heroBannerUrl, setHeroBannerUrl] = useState(store?.themeMetadata?.heroBannerUrl ?? '')
  const [customColors, setCustomColors] = useState(store?.themeMetadata?.customColors ?? {})
  const [themeSaving, setThemeSaving] = useState(false)

  useEffect(() => {
    if (!store) return
    const themeId = getInitialThemeId(store)
    setPreviewThemeId(themeId)
    setSelectedThemeId(themeId)
    setFooterText(store.themeMetadata?.footerText ?? '')
    setHeroBannerUrl(store.themeMetadata?.heroBannerUrl ?? '')
    setCustomColors(store.themeMetadata?.customColors ?? {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.id, store?.storeTheme, store?.themeMetadata?.footerText, store?.themeMetadata?.heroBannerUrl, store?.themeMetadata?.customColors])

  useEffect(() => { setCommunityLink(store?.whatsappCommunityLink ?? '') }, [store?.whatsappCommunityLink])

  // "Now share your link", right after a logo upload lands.
  useEffect(() => {
    if (awaitingLogo.current !== null && store?.logoUrl && store.logoUrl !== awaitingLogo.current) {
      awaitingLogo.current = null
      setNudge(true)
    }
  }, [store?.logoUrl])

  // The saved QR code comes back on every visit, redrawn from its link.
  const savedQr = store?.qrCode
  const qrStale = !!savedQr?.url && savedQr.url !== url
  useEffect(() => {
    if (!savedQr?.url || qrDataUrl) return
    let cancelled = false
    import('qrcode')
      .then((QRCode) => QRCode.toDataURL(savedQr.url, { width: 512, margin: 2, color: { dark: '#034e22', light: '#ffffff' } }))
      .then((d) => { if (!cancelled) setQrDataUrl(d) })
      .catch(() => {})
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedQr?.url])

  const previewDraft = useMemo(
    () => ({ themeId: previewThemeId, themeMetadata: { footerText, heroBannerUrl, customColors } }),
    [previewThemeId, footerText, heroBannerUrl, customColors],
  )
  const previewTokens = useMemo(() => resolveStoreThemeTokens(store, previewDraft, { bannerWidth: 400 }), [store, previewDraft])
  const activeThemeObj = themes.find((t) => t.id === selectedThemeId) ?? themes[0]
  const themeDirty = isPro && (
    selectedThemeId !== getInitialThemeId(store)
    || footerText !== (store?.themeMetadata?.footerText ?? '')
    || heroBannerUrl !== (store?.themeMetadata?.heroBannerUrl ?? '')
    || JSON.stringify(customColors) !== JSON.stringify(store?.themeMetadata?.customColors ?? {})
  )

  // ── Actions ─────────────────────────────────────────────────────────────
  const copy = async () => {
    try { await navigator.clipboard.writeText(url) } catch { /* the link is on screen */ }
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleLogoFileChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setLogoUploading(true)
    awaitingLogo.current = store?.logoUrl || ''
    try {
      await onLogoUpload(file)
    } finally {
      setLogoUploading(false)
    }
  }

  const handleCoverFileChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type?.startsWith('image/')) { setCoverError('That file is not an image. Please choose a JPG or PNG.'); return }
    if (file.size > 10 * 1024 * 1024) { setCoverError('That image is larger than 10MB. Please choose a smaller one.'); return }
    setCoverUploading(true)
    setCoverError('')
    try {
      const uploaded = await uploadSingleImage(file, 'sellapage/banners')
      if (!uploaded) throw new Error('no url')
      setHeroBannerUrl(uploaded)
      // Saved straight away, so a vendor who only came to change the cover
      // does not also have to find the theme Save button.
      await onStoreSave({ themeMetadata: { ...(store?.themeMetadata || {}), heroBannerUrl: uploaded } })
      setToast('Cover updated. Customers see it now.')
    } catch (err) {
      console.error('Cover upload failed', err)
      setCoverError('The cover did not upload. Check your connection and try again.')
    } finally {
      setCoverUploading(false)
    }
  }

  const removeCover = async () => {
    setHeroBannerUrl('')
    await onStoreSave({ themeMetadata: { ...(store?.themeMetadata || {}), heroBannerUrl: '' } })
    setToast('Cover removed.')
  }

  const saveTheme = async () => {
    setThemeSaving(true)
    try {
      await onThemeSave(selectedThemeId, { footerText, heroBannerUrl, customColors })
      setToast('Theme saved. Your store has its new look.')
    } finally {
      setThemeSaving(false)
    }
  }

  const saveLayout = async () => {
    setLayoutSaving(true)
    try {
      await onLayoutSave(selectedLayout)
      setToast('Layout saved.')
    } finally {
      setLayoutSaving(false)
    }
  }

  const handleCommunitySave = async () => {
    const trimmed = communityLink.trim()
    if (trimmed && !trimmed.startsWith('https://chat.whatsapp.com/')) {
      setCommunityLinkError('That doesn’t look like a WhatsApp community invite. It should start with https://chat.whatsapp.com/')
      return
    }
    setCommunityLinkError('')
    setCommunityLinkSaving(true)
    try {
      await onStoreSave({ whatsappCommunityLink: trimmed })
      setToast(trimmed ? 'Community link saved. A "Join Community" button is now on your store.' : 'Community link removed.')
    } catch {
      setCommunityLinkError('Failed to save. Please try again.')
    } finally {
      setCommunityLinkSaving(false)
    }
  }

  const generateQr = async () => {
    setQrGenerating(true)
    setQrError('')
    try {
      const QRCode = await import('qrcode')
      const dataUrl = await QRCode.toDataURL(url, { width: 512, margin: 2, color: { dark: '#034e22', light: '#ffffff' } })
      setQrDataUrl(dataUrl)
      await onStoreSave({ qrCode: { url, createdAt: new Date().toISOString() } })
      setToast('QR code saved. It will be right here when you come back.')
    } catch {
      setQrError('Could not generate the QR code. Please try again.')
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

  // A 1080 x 1350 "Scan to shop" poster: logo, name, the QR code and the
  // link, ready for a shop counter, a flyer or a WhatsApp status.
  const downloadPoster = async () => {
    if (!qrDataUrl) return
    setPosterBusy(true)
    try {
      const canvas = document.createElement('canvas')
      canvas.width = 1080
      canvas.height = 1350
      const ctx = canvas.getContext('2d')
      const load = (src) => new Promise((res) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = () => res(null); im.src = src })
      const g = ctx.createLinearGradient(0, 0, 0, 1350)
      g.addColorStop(0, '#ecf9f2'); g.addColorStop(1, '#ffffff')
      ctx.fillStyle = g; ctx.fillRect(0, 0, 1080, 1350)
      ctx.fillStyle = '#034e22'; ctx.fillRect(0, 0, 1080, 18)
      const logo = store?.logoUrl ? await load(store.logoUrl) : null
      let y = 120
      if (logo) {
        ctx.save(); ctx.beginPath(); ctx.arc(540, y + 70, 70, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(logo, 470, y, 140, 140); ctx.restore()
        y += 180
      }
      ctx.textAlign = 'center'
      ctx.fillStyle = '#0f172a'; ctx.font = 'bold 64px "DM Sans", Arial, sans-serif'
      ctx.fillText((store?.businessName || 'Our store').slice(0, 28), 540, y + 40)
      ctx.fillStyle = '#16a34a'; ctx.font = '600 38px "DM Sans", Arial, sans-serif'
      ctx.fillText('Scan to shop with us', 540, y + 100)
      const qr = await load(qrDataUrl)
      const size = 620
      const qy = y + 150
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#d5f1e1'; ctx.lineWidth = 6
      ctx.beginPath(); ctx.roundRect?.(540 - size / 2 - 30, qy - 30, size + 60, size + 60, 36); ctx.fill(); ctx.stroke()
      if (qr) ctx.drawImage(qr, 540 - size / 2, qy, size, size)
      ctx.fillStyle = '#475569'; ctx.font = '32px "DM Sans", Arial, sans-serif'
      ctx.fillText(url.replace(/^https?:\/\//, ''), 540, qy + size + 90)
      ctx.fillStyle = '#7c8a99'; ctx.font = '26px "DM Sans", Arial, sans-serif'
      ctx.fillText('Point your phone camera here', 540, qy + size + 140)
      const a = document.createElement('a')
      a.href = canvas.toDataURL('image/png')
      a.download = `${store?.storeName || 'store'}-scan-to-shop.png`
      a.click()
    } catch (err) {
      console.error('poster', err)
      setQrError('Could not make the poster. The plain QR download still works.')
    } finally {
      setPosterBusy(false)
    }
  }

  const show = (section) => {
    return {
      setup: ['link', 'logo', 'theme', 'community', 'qr'],
      theme: ['logo', 'theme'],
      social: ['link', 'community', 'qr'],
      info: ['info'],
      more: ['more'],
    }[sub]?.includes(section)
  }

  // ── Sections ────────────────────────────────────────────────────────────
  const linkCard = (
    <section className={`${card} p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-forest-50 text-forest-600"><Link2 size={18} /></span>
          <div>
            <p className="text-[15px] font-semibold text-dash-ink">Store Link</p>
            <p className="text-xs text-dash-muted">This is the link customers will use to visit your store.</p>
          </div>
        </div>
        <span className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full bg-forest-50 px-2.5 py-1 text-[11px] font-semibold text-forest-600">
          <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" /></span>
          Live
        </span>
      </div>
      <div className="mt-4 flex gap-2">
        <div className="flex min-w-0 flex-1 items-center rounded-xl border border-dash-line bg-gray-50/60 px-3.5 py-2.5">
          <p className="w-full select-all truncate text-[13px] text-slate-700">{url}</p>
        </div>
        <button type="button" onClick={copy} className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-xl px-4 text-xs font-semibold text-white transition active:scale-[0.98] ${copied ? 'bg-forest-600' : 'bg-forest hover:bg-forest-700'}`}>
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <a href={`https://wa.me/?text=${encodeURIComponent(`Shop from ${store?.businessName || 'my store'}: ${url}`)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-xs font-semibold text-white transition hover:brightness-95">
          <MessageCircle size={14} /> WhatsApp
        </a>
        <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out my store: ${url}`)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-sky-600">
          <Share2 size={14} /> Twitter / X
        </a>
        <a href={url} target="_blank" rel="noopener noreferrer" className="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl border border-dash-line px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-gray-50 sm:col-span-1">
          <Eye size={14} /> View Live Store
        </a>
      </div>
    </section>
  )

  const logoCard = (
    <section className={`${card} p-5`}>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-forest-50 text-forest-600"><FileImage size={18} /></span>
        <div>
          <p className="text-[15px] font-semibold text-dash-ink">Business Logo &amp; Cover</p>
          <p className="text-xs text-dash-muted">Your logo and cover image help build your brand identity.</p>
        </div>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="flex items-center gap-4 rounded-2xl border border-dash-line p-4">
          <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl border border-dash-line bg-gray-50">
            {store?.logoUrl
              ? <img src={store.logoUrl} alt="Your business logo" className="h-full w-full object-cover" />
              : <div className="flex h-full w-full items-center justify-center text-slate-300"><ImageIcon size={24} /></div>}
            {logoUploading && <div className="absolute inset-0 flex items-center justify-center bg-white/70"><Loader2 size={20} className="animate-spin text-forest" /></div>}
          </div>
          <div className="min-w-0">
            <label className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${logoUploading ? 'cursor-not-allowed border-dash-line text-slate-400' : 'border-dash-line text-dash-ink hover:border-forest-200 hover:bg-forest-50'}`}>
              {logoUploading ? <><Loader2 size={13} className="animate-spin" /> Uploading...</> : <><UploadCloud size={14} /> {store?.logoUrl ? 'Change Logo' : 'Upload Logo'}</>}
              <input type="file" accept="image/*" className="hidden" disabled={logoUploading} onChange={handleLogoFileChange} />
            </label>
            {logoError
              ? <p className="mt-2 text-[11px] font-medium text-red-600">{logoError}</p>
              : <p className="mt-2 text-[11px] leading-relaxed text-dash-muted">PNG or JPG, max 5MB. Square looks best. Free on every plan.</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-dash-line p-3">
          <div className="relative aspect-[3/1] overflow-hidden rounded-xl bg-gradient-to-r from-forest-50 to-[#e2f3e9]">
            {heroBannerUrl
              ? <img src={heroBannerUrl} alt="Your store cover" className="h-full w-full object-cover" />
              : <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-forest-600/60"><ImageIcon size={22} /><span className="text-[11px]">No cover yet</span></div>}
            {coverUploading && <div className="absolute inset-0 flex items-center justify-center gap-2 bg-white/70 text-xs font-semibold text-forest"><Loader2 size={16} className="animate-spin" /> Uploading cover...</div>}
            {isPro ? (
              <div className="absolute bottom-2 left-2 flex gap-1.5">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-dash-ink shadow-sm transition hover:bg-white">
                  <ImageIcon size={13} /> {heroBannerUrl ? 'Change Cover' : 'Add Cover'}
                  <input type="file" accept="image/*" className="hidden" disabled={coverUploading} onChange={handleCoverFileChange} />
                </label>
                {heroBannerUrl && (
                  <button type="button" onClick={removeCover} className="rounded-lg bg-white/95 px-2 py-1.5 text-slate-500 shadow-sm hover:text-red-600" aria-label="Remove cover"><X size={13} /></button>
                )}
              </div>
            ) : (
              <button type="button" onClick={() => navigateTo('billing')} className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-white/60 text-center backdrop-blur-[1px] transition hover:bg-white/50">
                <Lock size={16} className="text-forest" />
                <span className="px-3 text-[11px] font-semibold text-dash-ink">A cover photo is on Pro. Upgrade to add yours.</span>
              </button>
            )}
          </div>
          {coverError
            ? <p className="mt-2 text-[11px] font-medium text-red-600">{coverError}</p>
            : <p className="mt-2 text-[11px] text-dash-muted">JPG or PNG, max 10MB. Recommended size: 1200 x 400px.</p>}
        </div>
      </div>
    </section>
  )

  const visibleThemes = showAllThemes ? themes : themes.slice(0, 4).concat(themes.slice(4).filter((t) => t.id === selectedThemeId))
  const themeCard = isPro ? (
    <section className={`${card} p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-500"><Wand2 size={18} /></span>
          <div>
            <p className="text-[15px] font-semibold text-dash-ink">Pro Theme Settings</p>
            <p className="text-xs text-dash-muted">Pick a theme and customise the colours, footer and look of your store.</p>
          </div>
        </div>
        <button type="button" onClick={() => setShowAllThemes((v) => !v)} className="inline-flex flex-shrink-0 items-center gap-1 text-xs font-semibold text-slate-500 transition hover:text-forest">
          {showAllThemes ? 'Show fewer' : `View all ${themes.length} themes`} <ArrowRight size={13} />
        </button>
      </div>

      <p className="mt-5 text-[13px] font-semibold text-dash-ink">Theme</p>
      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {visibleThemes.map((theme) => {
          const on = previewThemeId === theme.id
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => { setPreviewThemeId(theme.id); setSelectedThemeId(theme.id); setCustomColors({}) }}
              aria-pressed={on}
              className={`group overflow-hidden rounded-xl border text-left transition ${on ? 'border-forest ring-4 ring-forest-50' : 'border-dash-line hover:-translate-y-0.5 hover:shadow-md'}`}
            >
              <div className="relative aspect-[5/3] overflow-hidden bg-gray-50">
                <ThemeSwatch theme={theme} />
                {on && <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-forest text-white shadow"><Check size={12} strokeWidth={3} /></span>}
              </div>
              <div className="px-3 py-2">
                <p className={`truncate text-[12px] font-semibold ${on ? 'text-forest' : 'text-dash-ink'}`}>{theme.name}</p>
                <p className="truncate text-[10px] text-dash-muted" style={{ fontFamily: theme.typography.headerFontFamily }}>
                  Aa {theme.typography.headerFontFamily.split(',')[0].replace(/'/g, '')}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      <div className="mt-5">
        <label htmlFor="bp-footer" className="text-[13px] font-semibold text-dash-ink">Footer Text <span className="font-normal text-dash-muted">(optional)</span></label>
        <div className="relative mt-1.5">
          <input
            id="bp-footer"
            value={footerText}
            maxLength={FOOTER_MAX}
            onChange={(e) => setFooterText(e.target.value)}
            placeholder={activeThemeObj.defaultThemeText.footer}
            className="w-full rounded-xl border border-dash-line bg-white px-4 py-2.5 pr-16 text-sm text-dash-ink outline-none transition focus:border-forest-200 focus:ring-4 focus:ring-forest-50"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] tabular-nums text-slate-400">{footerText.length}/{FOOTER_MAX}</span>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-semibold text-dash-ink">Custom Colours</p>
          <button type="button" onClick={() => setCustomColors({})} className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-forest"><RotateCcw size={12} /> Reset to theme</button>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {['background', 'card', 'text', 'primary'].map((key) => {
            const value = customColors[key] ?? activeThemeObj.defaultColors[key]
            return (
              <div key={key} className="rounded-xl border border-dash-line p-3">
                <p className="flex items-center gap-1.5 text-[11px] capitalize text-dash-muted"><span className="h-1.5 w-1.5 rounded-full bg-forest-600" />{key}</p>
                <div className="mt-2 flex items-center gap-2">
                  <label className="relative h-8 w-8 flex-shrink-0 cursor-pointer overflow-hidden rounded-full border border-dash-line shadow-sm" style={{ backgroundColor: value }}>
                    <input type="color" value={value} onChange={(e) => setCustomColors((p) => ({ ...p, [key]: e.target.value }))} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label={`${key} colour`} />
                  </label>
                  <span className="flex-1 font-mono text-[11px] uppercase text-slate-600">{value}</span>
                  <button type="button" onClick={() => { navigator.clipboard?.writeText(value).catch(() => {}); setToast(`${value.toUpperCase()} copied.`) }} className="rounded p-1 text-slate-400 hover:text-forest" aria-label={`Copy ${key} colour`}><Copy size={13} /></button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={saveTheme}
        disabled={themeSaving || !themeDirty}
        className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${themeDirty ? 'bg-forest-600 text-white shadow-lg shadow-forest/20 hover:bg-forest-700' : 'bg-gray-100 text-slate-500'}`}
      >
        {themeSaving ? <><Loader2 size={16} className="animate-spin" /> Saving your new look...</> : themeDirty ? <><Check size={16} /> Save Changes</> : <><CheckCircle2 size={16} /> All changes saved</>}
      </button>
      {themeDirty && <p className="mt-2 text-center text-[11px] text-amber-700">You have unsaved changes. The preview shows them; customers won&apos;t until you save.</p>}
    </section>
  ) : isGrowthOrPro ? (
    <section className={`${card} space-y-5 p-5`}>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-500"><Palette size={18} /></span>
        <div>
          <p className="text-[15px] font-semibold text-dash-ink">Customise Appearance</p>
          <p className="text-xs text-dash-muted">Pick your colour and how products are laid out.</p>
        </div>
      </div>
      <div>
        <p className="text-[13px] font-semibold text-dash-ink">Colour</p>
        <div className="mt-2 flex flex-wrap gap-2.5">
          {COLOUR_SWATCHES.map((s) => {
            const on = store?.themeColor === s.hex
            return (
              <button key={s.hex} type="button" title={s.label} aria-label={`Use ${s.label}`} onClick={async () => { await onColorSave(s.hex); setToast(`${s.label} is your store colour now.`) }}
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 shadow-sm transition ${on ? 'scale-110 border-dash-ink' : 'border-white hover:scale-105'}`} style={{ backgroundColor: s.hex }}>
                {on && <Check size={14} className="text-white" strokeWidth={3} />}
              </button>
            )
          })}
        </div>
      </div>
      <div>
        <p className="text-[13px] font-semibold text-dash-ink">Layout</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {LAYOUT_OPTIONS.map((o) => {
            const on = selectedLayout === o.id
            return (
              <button key={o.id} type="button" onClick={() => setSelectedLayout(o.id)} className={`rounded-xl border p-3 text-left transition ${on ? 'border-forest bg-forest-50/60 ring-4 ring-forest-50' : 'border-dash-line hover:border-forest-200'}`}>
                <o.icon size={17} className={on ? 'text-forest' : 'text-slate-400'} />
                <p className={`mt-1.5 text-[13px] font-semibold ${on ? 'text-forest' : 'text-dash-ink'}`}>{o.label}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-dash-muted">{o.description}</p>
              </button>
            )
          })}
        </div>
        <button type="button" onClick={saveLayout} disabled={layoutSaving || selectedLayout === (store?.storeLayout || 'grid')}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-forest-700 disabled:bg-gray-100 disabled:text-slate-500">
          {layoutSaving ? <><Loader2 size={15} className="animate-spin" /> Saving...</> : selectedLayout === (store?.storeLayout || 'grid') ? <><CheckCircle2 size={15} /> Layout saved</> : 'Save Layout'}
        </button>
      </div>
      <UpgradeTeaser title="Want a whole new look?" cta="See Pro themes" onClick={() => navigateTo('billing')}>
        Pro gives you {themes.length} ready-made store themes, your own colours for everything, a cover photo and custom footer text.
      </UpgradeTeaser>
    </section>
  ) : (
    <UpgradeTeaser
      title="Make your store unmistakably yours"
      cta="Upgrade and customise"
      onClick={() => navigateTo('billing')}
      peek={themes.slice(0, 4).map((t) => <div key={t.id} className="h-20 flex-1 overflow-hidden rounded-lg"><ThemeSwatch theme={t} /></div>)}
    >
      Just upgrade your plan to customise your store, and I promise you, you won&apos;t regret it. Your own colours and layout on Growth; {themes.length} themes, a cover photo and full colour control on Pro.
    </UpgradeTeaser>
  )

  const communityCard = (
    <section className={`${card} p-5`}>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-forest-50 text-forest-600"><Users size={18} /></span>
        <div>
          <p className="text-[15px] font-semibold text-dash-ink">WhatsApp Community</p>
          <p className="text-xs text-dash-muted">Add your WhatsApp community link. Customers can join straight from your storefront.</p>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="url"
          value={communityLink}
          onChange={(e) => { setCommunityLink(e.target.value); setCommunityLinkError('') }}
          placeholder="https://chat.whatsapp.com/..."
          aria-invalid={!!communityLinkError}
          className={`flex-1 rounded-xl border bg-white px-4 py-2.5 text-sm outline-none transition focus:ring-4 ${communityLinkError ? 'border-red-300 focus:ring-red-50' : 'border-dash-line focus:border-forest-200 focus:ring-forest-50'}`}
        />
        <button type="button" onClick={handleCommunitySave} disabled={communityLinkSaving || communityLink.trim() === (store?.whatsappCommunityLink ?? '')}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-dash-ink px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:bg-gray-100 disabled:text-slate-400">
          {communityLinkSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save Link
        </button>
      </div>
      {communityLinkError && <p className="mt-2 text-xs font-medium text-red-600">{communityLinkError}</p>}
      {store?.whatsappCommunityLink && (
        <a href={store.whatsappCommunityLink} target="_blank" rel="noopener noreferrer" className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-forest-600 hover:underline">
          <ExternalLink size={12} /> Preview community link
        </a>
      )}
    </section>
  )

  const qrCard = (
    <section className={`${card} p-5`}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className={`relative flex h-36 w-36 flex-shrink-0 items-center justify-center self-center overflow-hidden rounded-2xl ${qrDataUrl ? 'border border-dash-line bg-white p-2 shadow-sm' : 'border-2 border-dashed border-dash-line bg-gray-50/60'}`}>
          {qrDataUrl ? (
            <img src={qrDataUrl} alt={`QR code for ${url}`} className="h-full w-full animate-in fade-in zoom-in-95 duration-300" />
          ) : (
            <div className="flex flex-col items-center gap-1 text-slate-300"><QrCode size={34} strokeWidth={1.5} /><span className="text-[10px] font-medium text-slate-400">No QR yet</span></div>
          )}
          {qrGenerating && <div className="absolute inset-0 flex items-center justify-center bg-white/80"><Loader2 size={22} className="animate-spin text-forest" /></div>}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-dash-ink">QR Code</p>
          <p className="mt-0.5 text-xs leading-relaxed text-dash-muted">Print this on flyers, packaging or business cards so customers can scan and visit your store.</p>
          {savedQr?.createdAt && !qrStale && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-forest-50 px-2.5 py-1 text-[11px] font-medium text-forest-600">
              <CheckCircle2 size={12} /> Saved {new Date(savedQr.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          )}
          {qrStale && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
              Your store link has changed since this code was made, so it still points to the old one. Regenerate it before you print.
            </p>
          )}
          {qrError && <p className="mt-2 text-xs font-medium text-red-600">{qrError}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={generateQr} disabled={qrGenerating} className="inline-flex items-center gap-2 rounded-xl bg-dash-ink px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60">
              <QrCode size={14} /> {qrDataUrl ? (qrStale ? 'Update QR Code' : 'Regenerate') : 'Generate QR Code'}
            </button>
            {qrDataUrl && (
              <>
                <button type="button" onClick={downloadQr} className="inline-flex items-center gap-2 rounded-xl border border-dash-line px-4 py-2.5 text-xs font-semibold text-dash-ink transition hover:bg-gray-50">
                  <Download size={14} /> PNG
                </button>
                <button type="button" onClick={downloadPoster} disabled={posterBusy} className="inline-flex items-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-forest-700 disabled:opacity-60">
                  {posterBusy ? <Loader2 size={14} className="animate-spin" /> : <FileImage size={14} />} &quot;Scan to shop&quot; poster
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )

  const infoCard = (
    <section className={`${card} p-5`}>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-forest-50 text-forest-600"><Building2 size={18} /></span>
        <div>
          <p className="text-[15px] font-semibold text-dash-ink">Business Info</p>
          <p className="text-xs text-dash-muted">What customers see about you. Edit it in Settings.</p>
        </div>
      </div>
      <dl className="mt-4 divide-y divide-dash-line">
        {[
          { icon: Store, k: 'Business name', v: store?.businessName },
          { icon: Phone, k: 'WhatsApp', v: store?.whatsappNumber ? `+${String(store.whatsappNumber).replace(/^\+/, '')}` : '' },
          { icon: Mail, k: 'Email', v: store?.email },
          { icon: MapPin, k: 'Location', v: [store?.pickupAddress?.city, store?.pickupAddress?.state].filter(Boolean).join(', ') },
          { icon: BadgeCheck, k: 'CAC verified', v: store?.cacVerified ? 'Yes' : 'Not yet' },
        ].map((r) => (
          <div key={r.k} className="flex items-center justify-between gap-3 py-2.5">
            <dt className="flex items-center gap-2 text-[13px] text-slate-600"><r.icon size={15} className="text-slate-400" /> {r.k}</dt>
            <dd className={`truncate text-right text-[13px] font-medium ${r.v ? 'text-dash-ink' : 'text-slate-400'}`}>{r.v || 'Not added'}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => navigateTo('settings')} className="inline-flex items-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-forest-700"><SettingsIcon size={14} /> Edit in Settings</button>
        {!store?.cacVerified && <button type="button" onClick={() => navigateTo('cac-verification')} className="inline-flex items-center gap-2 rounded-xl border border-dash-line px-4 py-2.5 text-xs font-semibold text-dash-ink transition hover:bg-gray-50"><ShieldCheck size={14} /> Get the verified badge</button>}
      </div>
    </section>
  )

  const moreCard = (
    <section className="grid gap-3 sm:grid-cols-2">
      {[
        { id: 'store-design', icon: Wand2, t: 'Store Design', s: 'Build a fully custom homepage, section by section.', plan: 'Premium' },
        { id: 'custom-domain', icon: Globe, t: 'Custom Domain', s: 'Use yourbrand.com instead of a Sellapage link.', plan: 'Pro' },
        { id: 'cac-verification', icon: BadgeCheck, t: 'CAC Verification', s: 'Show customers a verified business badge.', plan: 'Pro' },
        { id: 'marketing', icon: Megaphone, t: 'Marketing', s: 'SEO, Google listings and ready-made social posts.' },
        { id: 'mobile-app', icon: Smartphone, t: 'Mobile App', s: 'Run your store from the Sellapage app.' },
        { id: 'settings', icon: SettingsIcon, t: 'Settings', s: 'Business details, delivery address and more.' },
      ].map((x) => (
        <button key={x.id} type="button" onClick={() => navigateTo(x.id)} className={`${card} group flex items-start gap-3 p-4 text-left transition hover:-translate-y-0.5 hover:border-forest-100 hover:shadow-md`}>
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-forest-50 text-forest-600"><x.icon size={18} /></span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 text-[14px] font-semibold text-dash-ink">{x.t}{x.plan && <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">{x.plan}</span>}</span>
            <span className="mt-0.5 block text-xs leading-relaxed text-dash-muted">{x.s}</span>
          </span>
          <ArrowRight size={15} className="mt-1 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-forest" />
        </button>
      ))}
    </section>
  )

  // What a great page has, ticked off from what this store already has.
  const readiness = [
    { t: 'Build customer trust with a professional look', done: !!store?.logoUrl },
    { t: 'Showcase your best products & services', done: previewProducts.length > 0 },
    { t: 'Make it easy for customers to reach and buy', done: !!store?.whatsappNumber },
    { t: 'Get more sales with a strong brand presence', done: !!(store?.logoUrl && (heroBannerUrl || store?.themeColor || store?.storeTheme)) },
  ]

  return (
    <div className="mx-auto w-full max-w-[1320px] space-y-5 px-4 pb-10 pt-5 sm:px-6 lg:px-8 lg:pt-7">
      {/* Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-white via-forest-50/60 to-[#e2f3e9]">
        <div className="relative z-[1] p-5 sm:p-7 lg:max-w-[64%]">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-forest-600"><Store size={13} /> Business Page</p>
          <h1 className="mt-2 flex items-center gap-2 font-body text-[28px] font-bold leading-tight tracking-tight text-dash-ink sm:text-[34px]">
            Your store, your brand <Sparkles size={24} className="fill-amber-300 text-amber-400" />
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-600 sm:text-[15px]">Customise your store, make it uniquely yours, and turn visitors into loyal customers.</p>
          <div className="mt-5 grid gap-2.5 sm:grid-cols-3">
            {[
              { icon: ShieldCheck, t: 'Build trust with a professional storefront' },
              { icon: Heart, t: 'Showcase your brand identity' },
              { icon: Store, t: 'Make it easy for customers to buy' },
            ].map((f) => (
              <div key={f.t} className="flex items-center gap-2.5 rounded-xl bg-white/80 px-3 py-2.5 shadow-sm">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-forest-50 text-forest-600"><f.icon size={15} /></span>
                <span className="text-[12px] leading-snug text-slate-700">{f.t}</span>
              </div>
            ))}
          </div>
        </div>
        {hasMedia('business-hero') && (
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[36%] lg:block">
            <MediaSlot name="business-hero" alt="" className="h-full w-full object-cover object-left [mask-image:linear-gradient(to_right,transparent,black_16%)]" />
          </div>
        )}
      </section>

      {/* Sub-tabs */}
      <div className="-mx-4 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:px-0">
        <div className={`${card} inline-flex min-w-full gap-1 p-1.5 sm:min-w-0`}>
          {SUBTABS.map((t) => (
            <button key={t.id} type="button" onClick={() => setSub(t.id)} aria-pressed={sub === t.id}
              className={`inline-flex flex-shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] transition ${sub === t.id ? 'bg-forest-50 font-semibold text-forest' : 'text-slate-600 hover:bg-gray-50'}`}>
              <t.icon size={15} /> {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          {show('link') && linkCard}
          {show('logo') && logoCard}
          {show('theme') && themeCard}
          {show('info') && infoCard}
          {show('community') && communityCard}
          {show('qr') && qrCard}
          {show('more') && moreCard}
        </div>

        {/* Rail */}
        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <section className={`${card} p-5`}>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-forest-50 text-forest-600"><Eye size={18} /></span>
              <div>
                <p className="text-[15px] font-semibold text-dash-ink">Live Preview</p>
                <p className="text-xs text-dash-muted">Here&apos;s how your store looks to customers.</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-1.5 rounded-xl bg-gray-50 p-1">
              {[['mobile', 'Mobile', Smartphone], ['desktop', 'Desktop', Monitor]].map(([id, label, Icon]) => (
                <button key={id} type="button" onClick={() => setDevice(id)} aria-pressed={device === id}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${device === id ? 'bg-forest text-white shadow' : 'text-slate-600 hover:text-dash-ink'}`}>
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>
            <div className="mt-4 flex justify-center">
              {device === 'mobile' ? (
                <div className="w-[250px] overflow-hidden rounded-[34px] border-[7px] border-dash-ink bg-dash-ink shadow-xl">
                  <div className="mx-auto mb-1 mt-0.5 h-1.5 w-16 rounded-full bg-slate-700" />
                  <div className="h-[430px] overflow-y-auto rounded-[26px] bg-white no-scrollbar">
                    <ThemeLivePreview store={store} previewTokens={previewTokens} storeLayout={selectedLayout} previewProducts={previewProducts} storeUrl={url} />
                  </div>
                </div>
              ) : (
                <div className="w-full overflow-hidden rounded-xl border border-dash-line shadow-lg">
                  <div className="flex items-center gap-1.5 border-b border-dash-line bg-gray-50 px-3 py-2">
                    <span className="h-2 w-2 rounded-full bg-red-300" /><span className="h-2 w-2 rounded-full bg-amber-300" /><span className="h-2 w-2 rounded-full bg-green-300" />
                    <span className="ml-2 min-w-0 flex-1 truncate rounded bg-white px-2 py-0.5 text-[10px] text-slate-500">{url.replace(/^https?:\/\//, '')}</span>
                  </div>
                  <div className="h-[380px] overflow-hidden bg-white">
                    <div className="origin-top-left scale-[0.62]" style={{ width: '161%' }}>
                      <ThemeLivePreview store={store} previewTokens={previewTokens} storeLayout={selectedLayout} previewProducts={previewProducts} storeUrl={url} />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <a href={url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dash-line py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-gray-50">
              <ExternalLink size={14} /> Open Store
            </a>
          </section>

          <section className={`${card} p-5`}>
            <p className="flex items-center gap-2 text-[15px] font-semibold text-dash-ink"><Sparkles size={17} className="text-forest-600" /> Why a Great Business Page?</p>
            <ul className="mt-3 space-y-2.5">
              {readiness.map((r) => (
                <li key={r.t} className="flex items-start gap-2.5 text-[12.5px] leading-snug">
                  {r.done
                    ? <Check size={16} className="mt-px flex-shrink-0 text-forest-600" strokeWidth={3} />
                    : <span className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 rounded-full border-2 border-forest-200" />}
                  <span className={r.done ? 'text-slate-600' : 'text-dash-ink'}>{r.t}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-forest-50 via-[#eef8f2] to-[#dff1e6] p-5 pr-16">
            {hasMedia('business-brand-script') ? (
              <div className="w-40"><MediaSlot name="business-brand-script" alt="Your brand matters." className="h-auto w-full mix-blend-multiply" /></div>
            ) : (
              <p className="text-2xl font-bold italic text-forest">Your brand matters.</p>
            )}
            <p className="mt-3 text-[13px] leading-relaxed text-slate-700">
              A beautiful store isn&apos;t just about looks, it&apos;s about <span className="font-semibold text-forest">trust</span>, customers and growth.
            </p>
            <button type="button" onClick={() => { setSub(isGrowthOrPro ? 'theme' : 'setup'); document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' }) }}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-forest px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-forest/20 transition hover:bg-forest-700">
              Let&apos;s build it together <ArrowRight size={14} />
            </button>
            {hasMedia('business-brand-leaves') && (
              <div className="pointer-events-none absolute inset-y-0 right-0 w-14">
                <MediaSlot name="business-brand-leaves" alt="" className="h-full w-full object-cover mix-blend-multiply" />
              </div>
            )}
          </section>
        </aside>
      </div>

      <ShareNudge open={nudge} store={store} url={url} onClose={() => setNudge(false)} />
      <Toast text={toast} onClose={clearToast} />
    </div>
  )
}
