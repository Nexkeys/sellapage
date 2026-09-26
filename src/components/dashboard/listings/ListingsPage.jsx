// src/components/dashboard/listings/ListingsPage.jsx
//
// The Products and Services screens, built to the 2026-09-26 designs:
//   - with listings: a banner with live counts, All / In stock / Out of stock /
//     Hidden tabs, search and filters, grid or list view, bulk actions, and a
//     side rail (quick actions, tips that tick themselves off, marketing, help).
//   - with none: a welcoming banner, "No products added yet" with one big
//     button, the kinds of things you can add, and a side rail.
//
// Every action is the one the old screen had (add, edit, delete, show/hide on
// Growth and up, list on the Dropship Marketplace, export). Delete now asks
// in-page instead of a browser pop-up, and several can be deleted at once.
import { useEffect, useMemo, useState } from 'react'
import {
  Plus, Search, LayoutGrid, List as ListIcon, ChevronDown, MoreHorizontal, Trash2, Link2, Pencil,
  Eye, EyeOff, ExternalLink, Package, CheckCircle2, CircleSlash, Wallet, Sparkles, Upload, Tags,
  ArrowRight, Headphones, MessageSquare, Lightbulb, Check, Lock, AlertTriangle, Clock, MapPin, Video,
  Crown, Megaphone, TrendingUp, Store, BarChart3, ChevronLeft, ChevronRight, X, Loader2, SlidersHorizontal,
  CalendarDays, Star, Flame,
} from 'lucide-react'
import MediaSlot from '../../../media/MediaSlot'
import { hasMedia } from '../../../media/hasMedia'
import { Skeleton } from '../../Skeleton'
import ExportMenu from '../ExportMenu'
import MarketplaceListButton from '../MarketplaceListButton'
import {
  naira, nairaShort, stockInfo, optionCount, isHidden, listingLink, PRICE_BANDS, SORTS, sortListings,
} from './listingUtils'

const PER_PAGE = 12
const SUPPORT_WHATSAPP = 'https://wa.me/2348120525256'
const LS_VIEW = 'sellapage_listing_view'

const card = 'rounded-2xl border border-dash-line bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]'

// ── Small pieces ──────────────────────────────────────────────────────────

function Menu({ open, onClose, children, className = '' }) {
  if (!open) return null
  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} aria-hidden="true" />
      <div role="menu" className={`absolute z-40 w-52 overflow-hidden rounded-xl border border-dash-line bg-white py-1 shadow-xl shadow-gray-200/70 animate-in fade-in zoom-in-95 duration-100 ${className}`}>
        {children}
      </div>
    </>
  )
}

function MenuItem({ icon: Icon, children, onClick, href, danger, disabled, hint }) {
  const cls = `flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] transition ${
    disabled ? 'cursor-not-allowed text-slate-300' : danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-700 hover:bg-gray-50'
  }`
  const inner = (
    <>
      <Icon size={15} className={danger ? '' : disabled ? '' : 'text-slate-500'} />
      <span className="flex-1">{children}</span>
      {hint && <span className="text-[10px] font-semibold text-slate-400">{hint}</span>}
    </>
  )
  if (href && !disabled) return <a role="menuitem" href={href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>
  return <button role="menuitem" type="button" onClick={disabled ? undefined : onClick} className={cls} aria-disabled={disabled}>{inner}</button>
}

function Select({ value, onChange, options, label, className = '' }) {
  return (
    <label className={`relative block ${className}`}>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full appearance-none rounded-xl border border-dash-line bg-white pl-3.5 pr-9 text-[13px] text-slate-700 outline-none transition hover:border-forest-200 focus:border-forest-200 focus:ring-4 focus:ring-forest-50"
      >
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
      <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
    </label>
  )
}

function ConfirmDialog({ open, title, body, confirmLabel, busy, onConfirm, onClose }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="lp-confirm-title">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={busy ? undefined : onClose} />
      <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50"><Trash2 size={24} className="text-red-500" /></span>
        <h3 id="lp-confirm-title" className="mt-4 text-lg font-bold text-dash-ink">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-dash-muted">{body}</p>
        <div className="mt-5 grid gap-2">
          <button type="button" onClick={onConfirm} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-70">
            {busy ? <><Loader2 size={15} className="animate-spin" /> Please wait...</> : confirmLabel}
          </button>
          <button type="button" onClick={onClose} disabled={busy} className="rounded-2xl border border-dash-line px-4 py-2.5 text-sm font-semibold text-dash-ink transition hover:bg-gray-50 disabled:opacity-50">
            Keep it
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Card and row ──────────────────────────────────────────────────────────

function Thumb({ item, kind, className }) {
  const src = item.imageUrls?.[0] || item.imageUrl
  if (src) return <img src={src} alt={item.name || ''} loading="lazy" decoding="async" className={`h-full w-full object-cover ${className || ''}`} />
  const Icon = kind === 'service' ? CalendarDays : Package
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-gray-50 to-forest-50/40 text-slate-300">
      <Icon size={26} strokeWidth={1.5} />
      <span className="text-[10px] font-medium text-slate-400">No photo yet</span>
    </div>
  )
}

function badgeFor(item, kind, topId) {
  if (isHidden(item)) return { label: 'Hidden', cls: 'bg-slate-800/85 text-white', icon: EyeOff }
  if (kind === 'product') {
    const st = stockInfo(item)
    if (st.state === 'out') return { label: 'Out of Stock', cls: 'bg-red-500 text-white', icon: CircleSlash }
    if (st.state === 'low') return { label: 'Low Stock', cls: 'bg-orange-500 text-white', icon: Flame }
  }
  if (topId && item.id === topId) return { label: 'Most clicked', cls: 'bg-forest text-white', icon: Star }
  return null
}

function MetaLine({ item, kind }) {
  if (kind === 'service') {
    return (
      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-dash-muted">
        {item.duration && <span className="inline-flex items-center gap-1"><Clock size={12} /> {item.duration}</span>}
        <span className="inline-flex items-center gap-1">
          {item.locationType === 'virtual' ? <><Video size={12} /> Online</> : <><MapPin size={12} /> In person</>}
        </span>
      </p>
    )
  }
  const st = stockInfo(item)
  const opts = optionCount(item)
  return (
    <p className="mt-1 text-[12px]">
      <span className={st.state === 'out' ? 'font-medium text-red-500' : st.state === 'low' ? 'font-medium text-orange-500' : 'text-forest-600'}>
        {st.state === 'in' ? 'In stock' : st.label}
      </span>
      {opts > 0 && <span className="text-dash-muted"> • {opts} option{opts === 1 ? '' : 's'}</span>}
    </p>
  )
}

function ListingCard({ item, kind, selected, onSelect, onEdit, onDelete, onToggle, onCopy, link, canToggle, topId, marketplaceStore, deleting, view }) {
  const [menu, setMenu] = useState(null)
  const badge = badgeFor(item, kind, topId)
  const hidden = isHidden(item)
  const menuItems = (
    <>
      <MenuItem icon={Pencil} onClick={() => { setMenu(null); onEdit(item) }}>Edit</MenuItem>
      {link && <MenuItem icon={ExternalLink} href={link}>View on store</MenuItem>}
      {link && <MenuItem icon={Link2} onClick={() => { setMenu(null); onCopy(link) }}>Copy link</MenuItem>}
      <MenuItem
        icon={hidden ? Eye : EyeOff}
        disabled={!canToggle}
        hint={!canToggle ? 'Growth+' : null}
        onClick={() => { setMenu(null); onToggle(item) }}
      >
        {hidden ? 'Show on store' : 'Hide from store'}
      </MenuItem>
      <div className="my-1 border-t border-dash-line" />
      <MenuItem icon={Trash2} danger onClick={() => { setMenu(null); onDelete(item) }}>Delete</MenuItem>
    </>
  )

  if (view === 'list') {
    return (
      <div className={`${card} flex items-center gap-3 p-2.5 pr-3 transition ${selected ? 'ring-2 ring-forest-200' : 'hover:border-forest-100'} ${hidden ? 'opacity-75' : ''}`}>
        <input type="checkbox" checked={selected} onChange={() => onSelect(item.id)} aria-label={`Select ${item.name}`} className="ml-1 h-4 w-4 flex-shrink-0 rounded border-gray-300 accent-[#034e22]" />
        <button type="button" onClick={() => onEdit(item)} className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-gray-50">
          <Thumb item={item} kind={kind} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[14px] font-semibold text-dash-ink">{item.name}</p>
            {badge && <span className={`hidden flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold sm:inline ${badge.cls}`}>{badge.label}</span>}
          </div>
          <p className="text-[12px] text-dash-muted">{item.category || 'No category'}</p>
          <MetaLine item={item} kind={kind} />
        </div>
        <p className="hidden flex-shrink-0 text-[15px] font-bold text-forest-600 tabular-nums sm:block">{naira(item.price)}</p>
        <div className="relative flex flex-shrink-0 items-center gap-1">
          <button type="button" onClick={() => onEdit(item)} className="hidden rounded-lg border border-dash-line px-3 py-1.5 text-xs font-semibold text-forest-600 transition hover:bg-forest-50 sm:block">Edit</button>
          <button type="button" onClick={() => setMenu(menu ? null : 'row')} className="rounded-lg p-2 text-slate-500 transition hover:bg-gray-100" aria-label="More actions">
            {deleting ? <Loader2 size={16} className="animate-spin" /> : <MoreHorizontal size={16} />}
          </button>
          <Menu open={menu === 'row'} onClose={() => setMenu(null)} className="right-0 top-full mt-1">{menuItems}</Menu>
        </div>
      </div>
    )
  }

  return (
    <div className={`${card} group flex flex-col p-2.5 transition duration-200 ${selected ? 'ring-2 ring-forest-200' : 'hover:-translate-y-0.5 hover:border-forest-100 hover:shadow-lg hover:shadow-gray-200/70'} ${hidden ? 'opacity-80' : ''}`}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-gray-50">
        <button type="button" onClick={() => onEdit(item)} className="block h-full w-full" aria-label={`Edit ${item.name}`}>
          <Thumb item={item} kind={kind} className="transition duration-300 group-hover:scale-[1.03]" />
        </button>
        <label className={`absolute left-2 top-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-md bg-white/95 shadow-sm transition ${selected ? 'opacity-100' : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100'}`}>
          <input type="checkbox" checked={selected} onChange={() => onSelect(item.id)} aria-label={`Select ${item.name}`} className="h-3.5 w-3.5 accent-[#034e22]" />
        </label>
        {badge && (
          <span className={`absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm transition sm:bottom-auto sm:top-2 ${badge.cls} ${selected ? 'sm:translate-x-8' : 'sm:group-hover:translate-x-8'}`}>
            <badge.icon size={11} /> {badge.label}
          </span>
        )}
        <div className="absolute right-2 top-2">
          <button type="button" onClick={() => setMenu(menu ? null : 'top')} className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-sm transition hover:bg-white" aria-label="More actions">
            <MoreHorizontal size={15} />
          </button>
          <Menu open={menu === 'top'} onClose={() => setMenu(null)} className="right-0 top-full mt-1">{menuItems}</Menu>
        </div>
        {(item.imageUrls?.length || 0) > 1 && (
          <span className="absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white">+{item.imageUrls.length - 1}</span>
        )}
      </div>

      <div className="flex flex-1 flex-col px-1 pb-0.5 pt-2.5 sm:px-1.5 sm:pb-1 sm:pt-3">
        <p className="line-clamp-1 text-[13px] font-semibold text-dash-ink sm:text-[14px]" title={item.name}>{item.name}</p>
        <p className="mt-1 text-[14px] font-bold text-forest-600 tabular-nums sm:text-[15px]">{naira(item.price)}</p>
        <p className="mt-1 truncate text-[12px] text-dash-muted">{item.category || 'No category'}</p>
        <MetaLine item={item} kind={kind} />

        <div className="relative mt-auto flex items-center gap-1 pt-3">
          <button type="button" onClick={() => onDelete(item)} disabled={deleting} className="rounded-lg p-1.5 text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50" title="Delete" aria-label="Delete">
            {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
          </button>
          {link && (
            <button type="button" onClick={() => onCopy(link)} className="hidden rounded-lg p-1.5 text-slate-500 transition hover:bg-forest-50 hover:text-forest sm:block" title="Copy link" aria-label="Copy link">
              <Link2 size={16} />
            </button>
          )}
          {kind === 'product' && <MarketplaceListButton product={item} store={marketplaceStore} />}
          <div className="ml-auto flex overflow-hidden rounded-lg border border-dash-line">
            <button type="button" onClick={() => onEdit(item)} className="px-2.5 py-1.5 text-xs font-semibold text-forest-600 transition hover:bg-forest-50 sm:px-3.5">Edit</button>
            <button type="button" onClick={() => setMenu(menu ? null : 'edit')} className="border-l border-dash-line px-1.5 text-slate-500 transition hover:bg-gray-50" aria-label="More actions">
              <ChevronDown size={14} />
            </button>
          </div>
          <Menu open={menu === 'edit'} onClose={() => setMenu(null)} className="bottom-full right-0 mb-1">{menuItems}</Menu>
        </div>
      </div>
    </div>
  )
}

// ── Side rail ─────────────────────────────────────────────────────────────

function HelpCard({ navigateTo }) {
  return (
    <section className={`${card} p-5`}>
      <div className="flex items-start gap-3">
        <Headphones size={26} className="flex-shrink-0 text-dash-ink" strokeWidth={1.6} />
        <div>
          <p className="text-[14px] font-semibold text-dash-ink">Need help?</p>
          <p className="mt-0.5 text-xs leading-relaxed text-dash-muted">Our support team is always here to help.</p>
        </div>
      </div>
      <div className="mt-4 grid gap-2">
        <a href={SUPPORT_WHATSAPP} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-full bg-forest px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-forest-700">
          <MessageSquare size={14} /> Chat on WhatsApp
        </a>
        <button type="button" onClick={() => navigateTo?.('support')} className="flex items-center justify-center gap-2 rounded-full border border-forest-200 px-4 py-2.5 text-xs font-semibold text-forest transition hover:bg-forest-50">
          <MessageSquare size={14} /> Send a Message
        </button>
      </div>
    </section>
  )
}

function UpgradeCard({ plan, navigateTo }) {
  if (plan === 'pro' || plan === 'premium') return null
  const next = plan === 'growth' ? 'Pro' : 'Growth'
  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-forest-50 to-[#dcf3e5] p-5">
      <div className="relative z-[1] max-w-[70%]">
        <div className="flex items-center gap-2">
          <Crown size={20} className="fill-amber-400 text-amber-500" />
          <span className="rounded-full bg-forest px-2 py-0.5 text-[10px] font-bold text-white">Most Popular</span>
        </div>
        <p className="mt-2.5 text-[16px] font-bold text-dash-ink">Get more with {next}</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">
          {next === 'Growth' ? 'More listings, more photos, analytics and AI descriptions.' : 'Unlimited listings, in-app checkout, payouts and customers.'}
        </p>
        <button type="button" onClick={() => navigateTo?.('billing')} className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl bg-forest px-4 py-2 text-xs font-semibold text-white transition hover:bg-forest-700">
          Upgrade to {next} <ArrowRight size={13} />
        </button>
      </div>
      {hasMedia('products-growth-chart') && (
        <div className="pointer-events-none absolute bottom-0 right-0 w-[38%] max-w-[130px]">
          <MediaSlot name="products-growth-chart" alt="" className="h-auto w-full mix-blend-multiply [mask-image:radial-gradient(ellipse_at_70%_60%,black_55%,transparent_80%)]" />
        </div>
      )}
    </section>
  )
}

// ── The page ──────────────────────────────────────────────────────────────

export default function ListingsPage({
  kind = 'product',
  items = [],
  loading = false,
  storeId,
  storeUrl = '',
  plan = 'starter',
  count = 0,
  max = 999999,
  limitReached = false,
  isGrowthOrPro = false,
  isPremium = false,
  onAdd, onEdit, onDelete, onDeleteMany, onToggleActive,
  navigateTo,
  marketplaceStore = null,
  deleting = null,
  flash = null,
  onFlashDone,
}) {
  const isService = kind === 'service'
  const noun = isService ? 'service' : 'product'
  const nouns = isService ? 'services' : 'products'
  const Nouns = isService ? 'Services' : 'Products'

  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const [price, setPrice] = useState('all')
  const [sort, setSort] = useState('newest')
  const [view, setView] = useState(() => { try { return localStorage.getItem(LS_VIEW) === 'list' ? 'list' : 'grid' } catch { return 'grid' } })
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(() => new Set())
  const [confirm, setConfirm] = useState(null) // { ids, name }
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState(null)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => { try { localStorage.setItem(LS_VIEW, view) } catch { /* not remembered */ } }, [view])
  useEffect(() => {
    if (!flash) return
    setToast(flash)
    onFlashDone?.()
  }, [flash, onFlashDone])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), toast.link ? 5200 : 2800)
    return () => clearTimeout(t)
  }, [toast])

  // ── Counts ──────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let inStock = 0; let out = 0; let low = 0; let hidden = 0; let value = 0; let tracked = 0; let physical = 0; let virtual = 0; let requests = 0
    for (const it of items) {
      if (isHidden(it)) hidden++
      if (isService) {
        if (it.locationType === 'virtual') virtual++
        else physical++
        requests += Number(it.bookingRequests) || 0
      } else {
        const st = stockInfo(it)
        if (st.state === 'out') out++
        else inStock++
        if (st.state === 'low') low++
        if (st.tracked) { tracked++; value += (Number(it.price) || 0) * st.n }
      }
    }
    return { inStock, out, low, hidden, value, tracked, physical, virtual, requests }
  }, [items, isService])

  const topId = useMemo(() => {
    const pop = (x) => Number(isService ? x.bookingRequests : x.clicks) || 0
    const best = [...items].sort((a, b) => pop(b) - pop(a))[0]
    return best && pop(best) > 0 ? best.id : null
  }, [items, isService])

  const categories = useMemo(() => {
    const set = new Set(items.map((i) => String(i.category || '').trim()).filter(Boolean))
    return [{ id: 'all', label: 'All Categories' }, ...[...set].sort().map((c) => ({ id: c, label: c }))]
  }, [items])

  const tabs = isService
    ? [
        { id: 'all', label: `All ${Nouns}`, n: items.length },
        { id: 'physical', label: 'In person', n: stats.physical },
        { id: 'virtual', label: 'Online', n: stats.virtual },
        ...(stats.hidden || isGrowthOrPro ? [{ id: 'hidden', label: 'Hidden', n: stats.hidden }] : []),
      ]
    : [
        { id: 'all', label: `All ${Nouns}`, n: items.length },
        { id: 'in', label: 'In Stock', n: stats.inStock },
        { id: 'out', label: 'Out of Stock', n: stats.out },
        ...(stats.hidden || isGrowthOrPro ? [{ id: 'hidden', label: 'Hidden', n: stats.hidden }] : []),
      ]

  // ── Filtering ───────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const band = PRICE_BANDS.find((b) => b.id === price) || PRICE_BANDS[0]
    const list = items.filter((it) => {
      if (tab === 'hidden' && !isHidden(it)) return false
      if (tab === 'in' && stockInfo(it).state === 'out') return false
      if (tab === 'out' && stockInfo(it).state !== 'out') return false
      if (tab === 'physical' && it.locationType === 'virtual') return false
      if (tab === 'virtual' && it.locationType !== 'virtual') return false
      if (status === 'visible' && isHidden(it)) return false
      if (status === 'hidden' && !isHidden(it)) return false
      if (status === 'low' && stockInfo(it).state !== 'low') return false
      if (category !== 'all' && String(it.category || '').trim() !== category) return false
      if (!band.test(Number(it.price) || 0)) return false
      if (q) {
        const hay = `${it.name || ''} ${it.category || ''} ${it.description || ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    return sortListings(list, sort, kind)
  }, [items, tab, query, category, status, price, sort, kind])

  const filtersOn = query || category !== 'all' || status !== 'all' || price !== 'all' || tab !== 'all'
  const clearFilters = () => { setQuery(''); setCategory('all'); setStatus('all'); setPrice('all'); setTab('all'); setPage(1) }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE)

  // ── Actions ─────────────────────────────────────────────────────────────
  const copy = async (link) => {
    try {
      await navigator.clipboard.writeText(link)
      setToast({ text: 'Link copied. Paste it in a chat or on your status.' })
    } catch {
      setToast({ text: link })
    }
  }
  const toggleSelect = (id) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const allOnPage = pageItems.length > 0 && pageItems.every((i) => selected.has(i.id))
  const selectPage = () => setSelected((s) => {
    const n = new Set(s)
    if (allOnPage) pageItems.forEach((i) => n.delete(i.id))
    else pageItems.forEach((i) => n.add(i.id))
    return n
  })

  const toggle = (item) => {
    if (!isGrowthOrPro) {
      setToast({ text: `Hiding ${nouns} from your store is on Growth and up.`, link: null, action: 'billing' })
      return
    }
    onToggleActive?.(item)
    setToast({ text: isHidden(item) ? `${item.name} is back on your store.` : `${item.name} is hidden from your store.` })
  }

  const bulkToggle = (hide) => {
    if (!isGrowthOrPro) { setToast({ text: `Hiding ${nouns} is on Growth and up.`, action: 'billing' }); return }
    const targets = items.filter((i) => selected.has(i.id) && isHidden(i) !== hide)
    targets.forEach((i) => onToggleActive?.(i))
    setToast({ text: `${targets.length} ${targets.length === 1 ? noun : nouns} ${hide ? 'hidden' : 'back on your store'}.` })
    setSelected(new Set())
  }

  const runDelete = async () => {
    if (!confirm) return
    setBusy(true)
    try {
      if (confirm.ids.length === 1) await onDelete?.(confirm.ids[0], { skipConfirm: true })
      else await onDeleteMany?.(confirm.ids)
      setToast({ text: confirm.ids.length === 1 ? `${confirm.name || Nouns.slice(0, -1)} deleted.` : `${confirm.ids.length} ${nouns} deleted.` })
      setSelected((s) => { const n = new Set(s); confirm.ids.forEach((id) => n.delete(id)); return n })
    } catch {
      setToast({ text: 'That did not go through. Check your connection and try again.' })
    } finally {
      setBusy(false)
      setConfirm(null)
    }
  }

  const importWithSella = () => {
    if (!isPremium) { navigateTo?.('billing'); return }
    window.dispatchEvent(new CustomEvent('sella:open', {
      detail: { prompt: `I want to import ${nouns} from a spreadsheet. Here is my file.` },
    }))
  }

  // ── Tips that tick themselves off ───────────────────────────────────────
  const tips = useMemo(() => {
    const n = items.length || 1
    const share = (fn) => items.filter(fn).length / n
    const base = [
      { label: 'Use high-quality images', sub: 'Clear, well-lit, 1 to 3MB each', done: share((i) => (i.imageUrls?.length || 0) > 0) >= 0.9 },
      { label: 'Write clear, simple descriptions', done: share((i) => String(i.description || '').trim().length >= 20) >= 0.9 },
      { label: 'Set the right price', done: items.every((i) => Number(i.price) > 0) },
      { label: 'Add relevant categories', done: share((i) => String(i.category || '').trim()) >= 0.9 },
    ]
    if (isService) base.push({ label: 'Say how long each session takes', done: share((i) => String(i.duration || '').trim()) >= 0.9 })
    else base.push({ label: 'Keep your stock updated', done: stats.tracked > 0 && stats.out === 0 })
    return base
  }, [items, isService, stats.tracked, stats.out])

  const addButton = (label = `Add ${isService ? 'Service' : 'Product'}`, big = false) => (
    limitReached ? (
      <button type="button" onClick={() => navigateTo?.('billing')} className={`inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 font-semibold text-white transition hover:bg-amber-600 ${big ? 'px-7 py-3.5 text-[15px]' : 'w-full px-4 py-2.5 text-sm'}`}>
        <Lock size={big ? 17 : 15} /> Limit reached: upgrade to add more
      </button>
    ) : (
      <button type="button" onClick={onAdd} className={`inline-flex items-center justify-center gap-2 rounded-xl bg-forest font-semibold text-white shadow-lg shadow-forest/20 transition hover:bg-forest-700 active:scale-[0.99] ${big ? 'px-7 py-3.5 text-[15px]' : 'w-full px-4 py-2.5 text-sm'}`}>
        <Plus size={big ? 18 : 16} /> {label} {big && <ArrowRight size={17} />}
      </button>
    )
  )

  const usage = max < 999999 && (
    <div className="mt-4 rounded-xl bg-white/70 px-3 py-2.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-semibold text-dash-ink">{count} of {max} listings used</span>
        <span className="capitalize text-dash-muted">{plan === 'starter' ? 'Free' : plan} plan</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full ${count / max >= 0.9 ? 'bg-amber-400' : 'bg-forest-600'}`} style={{ width: `${Math.min(100, (count / max) * 100)}%` }} />
      </div>
    </div>
  )

  const toastEl = toast && (
    <div role="status" className="fixed bottom-6 left-1/2 z-[70] flex w-[min(92vw,440px)] -translate-x-1/2 items-center gap-3 rounded-2xl bg-dash-ink px-4 py-3 text-sm text-white shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
      {toast.success ? <CheckCircle2 size={18} className="flex-shrink-0 text-green-400" /> : null}
      <span className="min-w-0 flex-1 break-words">{toast.text}</span>
      {toast.link && <a href={toast.link} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 font-semibold text-green-300 hover:underline">View</a>}
      {toast.action === 'billing' && <button type="button" onClick={() => navigateTo?.('billing')} className="flex-shrink-0 font-semibold text-green-300 hover:underline">See plans</button>}
      <button type="button" onClick={() => setToast(null)} className="flex-shrink-0 text-white/60 hover:text-white" aria-label="Dismiss"><X size={15} /></button>
    </div>
  )

  // ── Loading ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1320px] px-4 pb-10 pt-5 sm:px-6 lg:px-8 lg:pt-7" role="status" aria-label={`Loading your ${nouns}`}>
        <div className={`${card} flex items-center gap-3 px-5 py-4`}>
          <Loader2 size={18} className="animate-spin text-forest-600" />
          <p className="text-sm text-slate-600">Please hold on, loading your {nouns}...</p>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={`${card} p-2.5`}>
              <Skeleton className="aspect-[4/3] w-full rounded-xl" />
              <Skeleton className="mt-3 h-3.5 w-3/4" />
              <Skeleton className="mt-2 h-4 w-1/3" />
              <Skeleton className="mt-2 h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Empty ───────────────────────────────────────────────────────────────
  if (items.length === 0) {
    const kinds = [
      { icon: Package, title: 'Physical Products', body: 'Sell tangible items like fashion, electronics, home essentials and more.', cta: 'Add Product', tone: 'bg-white', iconCls: 'bg-forest-50 text-forest-600', ctaCls: 'text-forest-600', go: isService ? () => navigateTo?.('products') : onAdd },
      { icon: Sparkles, title: 'Services', body: 'Offer your skills and expertise, from hair and makeup to consulting.', cta: 'Add Service', tone: 'bg-indigo-50/50', iconCls: 'bg-indigo-100 text-indigo-600', ctaCls: 'text-indigo-600', go: isService ? onAdd : () => navigateTo?.('services') },
      { icon: SlidersHorizontal, title: 'Options & Extras', body: 'Sizes, colours and paid add-ons like extra protein, priced for you at checkout.', cta: 'Add Product', tone: 'bg-white', iconCls: 'bg-forest-50 text-forest-600', ctaCls: 'text-forest-600', go: isService ? () => navigateTo?.('products') : onAdd },
      { icon: Tags, title: 'Set Up Categories', body: 'Organise your listings into categories for easier browsing and better sales.', cta: 'Manage Categories', tone: 'bg-orange-50/50', iconCls: 'bg-orange-100 text-orange-600', ctaCls: 'text-orange-600', go: () => navigateTo?.('categories') },
    ]
    const why = [
      { icon: TrendingUp, t: 'Start receiving orders', s: 'and grow your revenue' },
      { icon: Store, t: 'Build your brand', s: 'and reach more customers' },
      { icon: Megaphone, t: 'Access marketing tools', s: 'to boost your visibility' },
      { icon: BarChart3, t: isService ? 'Track bookings and requests' : 'Track your sales and inventory', s: 'in real time' },
    ]
    return (
      <div className="mx-auto w-full max-w-[1320px] px-4 pb-10 pt-5 sm:px-6 lg:px-8 lg:pt-7">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            {/* Banner */}
            <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-forest-50 via-[#eef8f2] to-[#e2f3e9]">
              <div className="relative z-[1] p-5 sm:p-7 md:max-w-[58%]">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-forest-600">{Nouns}</p>
                <h1 className="mt-2 font-body text-[26px] font-bold leading-[1.15] tracking-tight text-dash-ink sm:text-[32px]">
                  {isService ? 'Your skills create opportunities.' : 'Your products create opportunities.'} Let&apos;s get started!
                </h1>
                <p className="mt-2.5 max-w-lg text-sm leading-relaxed text-slate-600">
                  {isService
                    ? 'Add your services, set your prices, and start taking bookings from clients across Nigeria and beyond.'
                    : 'Add your products, set your prices, and start selling to customers across Nigeria and beyond.'}
                </p>
                <div className="mt-5 grid grid-cols-2 gap-3 2xl:grid-cols-4">
                  {[
                    { icon: Package, t: 'Reach more customers' },
                    { icon: isService ? CalendarDays : CheckCircle2, t: isService ? 'Take bookings online' : 'Manage stock in real time' },
                    { icon: BarChart3, t: 'Track performance with analytics' },
                    { icon: Wallet, t: 'Convert visitors to buyers' },
                  ].map((f) => (
                    <div key={f.t} className="flex items-center gap-2">
                      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/80 text-forest-600"><f.icon size={17} /></span>
                      <span className="text-[12px] leading-snug text-slate-700">{f.t}</span>
                    </div>
                  ))}
                </div>
              </div>
              {hasMedia('products-empty-hero') && (
                <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[44%] md:block">
                  <MediaSlot name="products-empty-hero" alt="" className="h-full w-full object-cover object-right [mask-image:linear-gradient(to_right,transparent,black_18%)]" />
                </div>
              )}
            </section>

            {/* The big empty state */}
            <section className={`${card} p-5 sm:p-8`}>
              <span className="inline-flex rounded-full bg-forest-50 px-3 py-1 text-xs font-semibold text-forest">0 {Nouns}</span>
              <div className="mx-auto flex max-w-lg flex-col items-center text-center">
                {hasMedia('products-empty-art') && (
                  <div className="w-[260px] max-w-full">
                    <MediaSlot name="products-empty-art" alt="" className="h-auto w-full mix-blend-multiply" />
                  </div>
                )}
                <h2 className="mt-3 text-xl font-bold text-dash-ink sm:text-[22px]">No {nouns} added yet</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-dash-muted">
                  {isService
                    ? 'Add your first service to start taking bookings and turn your skills into income.'
                    : 'Add your first product or service to start selling and turn your ideas into income.'}
                </p>
                <div className="mt-5">{addButton(`Add Your First ${isService ? 'Service' : 'Product'}`, true)}</div>
                <p className="mt-2.5 text-xs text-dash-muted">It only takes a few minutes</p>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {kinds.map((k) => (
                  <button key={k.title} type="button" onClick={k.go} className={`group flex flex-col rounded-2xl border border-dash-line p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${k.tone}`}>
                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${k.iconCls}`}><k.icon size={19} /></span>
                    <span className="mt-4 text-[14px] font-semibold text-dash-ink">{k.title}</span>
                    <span className="mt-1 text-xs leading-relaxed text-dash-muted">{k.body}</span>
                    <span className={`mt-4 inline-flex items-center gap-1 text-xs font-semibold ${k.ctaCls}`}>{k.cta} <ArrowRight size={13} className="transition group-hover:translate-x-0.5" /></span>
                  </button>
                ))}
              </div>

              <div className="mt-5 flex flex-col gap-2 rounded-2xl border border-dash-line bg-gray-50/60 px-4 py-3 sm:flex-row sm:items-center">
                <Lightbulb size={20} className="flex-shrink-0 text-amber-500" />
                <p className="flex-1 text-xs leading-relaxed text-slate-600">
                  <span className="block font-semibold text-dash-ink">Pro tip</span>
                  High-quality images and clear descriptions help you sell more. Take great photos and tell your story!
                </p>
              </div>
            </section>
          </div>

          {/* Rail */}
          <aside className="space-y-4">
            <section className={`${card} bg-gradient-to-br from-white to-forest-50/60 p-5`}>
              <div className="flex items-start gap-3">
                {hasMedia('products-first-popper') && (
                  <span className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl">
                    <MediaSlot name="products-first-popper" alt="" className="h-full w-full object-cover" />
                  </span>
                )}
                <div>
                  <p className="text-[16px] font-bold leading-snug text-dash-ink">Good things start with your first {noun}!</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-dash-muted">You&apos;re just one step away from reaching new customers and growing your business.</p>
                </div>
              </div>
            </section>
            <section className={`${card} p-5`}>
              <p className="flex items-center gap-2 text-[14px] font-semibold text-dash-ink"><TrendingUp size={17} className="text-forest-600" /> Why add {nouns} now?</p>
              <ul className="mt-3 space-y-3.5">
                {why.map((w) => (
                  <li key={w.t} className="flex items-start gap-3">
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-forest-50 text-forest-600"><w.icon size={15} /></span>
                    <span>
                      <span className="block text-[13px] text-dash-ink">{w.t}</span>
                      <span className="block text-xs text-dash-muted">{w.s}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
            <UpgradeCard plan={plan} navigateTo={navigateTo} />
            <HelpCard navigateTo={navigateTo} />
          </aside>
        </div>
        {toastEl}
      </div>
    )
  }

  // ── With listings ───────────────────────────────────────────────────────
  const chips = isService
    ? [
        { icon: CalendarDays, n: items.length, label: `Total ${nouns}`, cls: 'bg-forest-50 text-forest-600', go: () => { setTab('all'); setStatus('all') } },
        { dot: 'bg-green-500', n: items.length - stats.hidden, label: 'On your store', go: () => { setTab('all'); setStatus('visible') } },
        { dot: 'bg-slate-400', n: stats.hidden, label: 'Hidden', go: () => setTab('hidden') },
        { icon: CheckCircle2, n: stats.requests.toLocaleString(), label: 'Bookings asked', cls: 'bg-forest-50 text-forest-600' },
      ]
    : [
        { icon: Package, n: items.length, label: `Total ${nouns}`, cls: 'bg-forest-50 text-forest-600', go: () => { setTab('all'); setStatus('all') } },
        { dot: 'bg-green-500', n: stats.inStock, label: 'In stock', go: () => setTab('in') },
        { dot: 'bg-orange-500', n: stats.out, label: 'Out of stock', go: () => setTab('out') },
        stats.tracked
          ? { icon: Wallet, n: nairaShort(stats.value), label: 'Stock value', cls: 'bg-forest-50 text-forest-600', title: `Price times stock, across the ${stats.tracked} ${stats.tracked === 1 ? noun : nouns} you track stock for` }
          : { icon: AlertTriangle, n: stats.low, label: 'Low stock', cls: 'bg-orange-50 text-orange-500', go: () => { setTab('all'); setStatus('low') } },
      ]

  return (
    <div className="mx-auto w-full max-w-[1320px] px-4 pb-10 pt-5 sm:px-6 lg:px-8 lg:pt-7">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-5">
          {/* Banner */}
          <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-forest-50/80 via-[#f1faf5] to-[#e4f4ea]">
            <div className="relative z-[1] p-5 sm:p-7 lg:max-w-[74%]">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-forest-600">
                <span className="h-2 w-2 rounded-sm bg-forest-600" /> {Nouns}
              </p>
              <h1 className="mt-2 font-body text-[26px] font-bold leading-tight tracking-tight text-dash-ink sm:text-[32px]">
                {isService ? 'Your services, your clients.' : 'Your products, your customers.'}
              </h1>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-600">
                {isService
                  ? 'Manage your services, update prices and durations, and keep your bookings flowing.'
                  : 'Manage your inventory, update details, track performance and keep your store looking fresh.'}
              </p>
              <div className="mt-5 grid grid-cols-2 gap-2.5 md:grid-cols-4">
                {chips.map((c) => {
                  const Tag = c.go ? 'button' : 'div'
                  return (
                    <Tag key={c.label} type={c.go ? 'button' : undefined} onClick={c.go} title={c.title} className={`flex min-w-0 items-center gap-2.5 rounded-xl bg-white px-3 py-2.5 text-left shadow-sm transition ${c.go ? 'hover:shadow-md' : ''}`}>
                      {c.icon ? (
                        <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${c.cls}`}><c.icon size={17} /></span>
                      ) : (
                        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gray-50"><span className={`h-3.5 w-3.5 rounded-full ${c.dot}`} /></span>
                      )}
                      <span className="min-w-0">
                        <span className="block truncate text-[17px] font-bold leading-tight text-dash-ink tabular-nums">{c.n}</span>
                        <span className="block truncate text-[11px] text-dash-muted">{c.label}</span>
                      </span>
                    </Tag>
                  )
                })}
              </div>
            </div>
            {hasMedia('products-hero') && (
              <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[26%] lg:block">
                <MediaSlot name="products-hero" alt="" className="h-full w-full object-cover object-left [mask-image:linear-gradient(to_right,transparent,black_14%)]" />
              </div>
            )}
          </section>

          {limitReached && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-amber-600" />
              <p className="text-xs leading-relaxed text-amber-800">
                <span className="font-semibold">You&apos;ve used all {max} listing slots on your plan.</span>{' '}
                <button type="button" onClick={() => navigateTo?.('billing')} className="font-semibold underline hover:no-underline">Upgrade to add more</button>
              </p>
            </div>
          )}

          {/* Tabs + view + sort */}
          <div className="flex flex-col gap-3 border-b border-dash-line md:flex-row md:items-end md:justify-between">
            <div className="-mb-px flex gap-1 overflow-x-auto no-scrollbar">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { setTab(t.id); setPage(1) }}
                  className={`flex flex-shrink-0 items-center gap-2 border-b-2 px-3 pb-3 pt-1 text-[13px] transition ${tab === t.id ? 'border-forest font-semibold text-forest' : 'border-transparent text-slate-500 hover:text-dash-ink'}`}
                >
                  {t.label}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${tab === t.id ? 'bg-forest-50 text-forest' : 'bg-gray-100 text-slate-500'}`}>{t.n}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 pb-3">
              <div className="flex rounded-xl border border-dash-line bg-white p-0.5">
                {[['grid', LayoutGrid], ['list', ListIcon]].map(([v, Icon]) => (
                  <button key={v} type="button" onClick={() => setView(v)} aria-pressed={view === v} aria-label={`${v} view`} className={`rounded-lg p-2 transition ${view === v ? 'bg-forest-50 text-forest' : 'text-slate-400 hover:text-dash-ink'}`}>
                    <Icon size={16} />
                  </button>
                ))}
              </div>
              <Select value={sort} onChange={(v) => { setSort(v); setPage(1) }} options={SORTS} label="Sort" className="w-44" />
              <ExportMenu storeId={storeId} tab={isService ? 'services' : 'products'} />
            </div>
          </div>

          {/* Search + filters */}
          <div className="flex flex-col gap-2.5 lg:flex-row">
            <div className="flex gap-2 lg:flex-1">
              <label className="relative block flex-1">
                <span className="sr-only">Search {nouns}</span>
                <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setPage(1) }}
                  placeholder={`Search by ${noun} name, category or description...`}
                  className="h-10 w-full rounded-xl border border-dash-line bg-white pl-10 pr-9 text-[13px] text-dash-ink outline-none transition placeholder:text-slate-400 focus:border-forest-200 focus:ring-4 focus:ring-forest-50"
                />
                {query && <button type="button" onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-dash-ink" aria-label="Clear search"><X size={14} /></button>}
              </label>
              <button type="button" onClick={() => setShowFilters((s) => !s)} className={`flex h-10 items-center gap-1.5 rounded-xl border px-3 text-[13px] lg:hidden ${showFilters ? 'border-forest-200 bg-forest-50 text-forest' : 'border-dash-line bg-white text-slate-600'}`}>
                <SlidersHorizontal size={15} /> Filters
              </button>
            </div>
            <div className={`${showFilters ? 'grid' : 'hidden'} grid-cols-1 gap-2 min-[420px]:grid-cols-3 lg:grid lg:w-auto lg:grid-cols-[170px_140px_170px]`}>
              <Select value={category} onChange={(v) => { setCategory(v); setPage(1) }} options={categories} label="Category" />
              <Select
                value={status}
                onChange={(v) => { setStatus(v); setPage(1) }}
                options={[
                  { id: 'all', label: 'All Status' },
                  { id: 'visible', label: 'On store' },
                  { id: 'hidden', label: 'Hidden' },
                  ...(isService ? [] : [{ id: 'low', label: 'Low stock' }]),
                ]}
                label="Status"
              />
              <Select value={price} onChange={(v) => { setPrice(v); setPage(1) }} options={PRICE_BANDS} label="Price range" />
            </div>
          </div>

          {/* Bulk bar */}
          {selected.size > 0 && (
            <div className="sticky top-2 z-20 flex flex-wrap items-center gap-2 rounded-2xl bg-dash-ink px-4 py-2.5 text-white shadow-xl animate-in fade-in slide-in-from-top-1 duration-150">
              <span className="text-[13px] font-semibold">{selected.size} selected</span>
              <button type="button" onClick={selectPage} className="text-xs text-white/70 underline-offset-2 hover:underline">{allOnPage ? 'Unselect page' : 'Select page'}</button>
              <div className="ml-auto flex flex-wrap gap-1.5">
                <button type="button" onClick={() => bulkToggle(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/20"><EyeOff size={13} /> Hide</button>
                <button type="button" onClick={() => bulkToggle(false)} className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/20"><Eye size={13} /> Show</button>
                <button type="button" onClick={() => setConfirm({ ids: [...selected] })} className="inline-flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold transition hover:bg-red-600"><Trash2 size={13} /> Delete</button>
                <button type="button" onClick={() => setSelected(new Set())} className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Clear selection"><X size={15} /></button>
              </div>
            </div>
          )}

          {/* Results */}
          {filtered.length === 0 ? (
            <div className={`${card} flex flex-col items-center px-4 py-14 text-center`}>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-50"><Search size={20} className="text-forest-600" /></span>
              <p className="mt-4 text-sm font-semibold text-dash-ink">No {nouns} match that</p>
              <p className="mt-1 max-w-xs text-xs text-dash-muted">Try another word, or clear the filters to see everything.</p>
              {filtersOn && <button type="button" onClick={clearFilters} className="mt-4 rounded-xl border border-dash-line px-4 py-2 text-xs font-semibold text-dash-ink transition hover:bg-gray-50">Clear filters</button>}
            </div>
          ) : (
            <div className={view === 'grid' ? 'grid grid-cols-1 gap-2.5 min-[340px]:grid-cols-2 sm:gap-4 md:grid-cols-3 2xl:grid-cols-4' : 'space-y-2.5'}>
              {pageItems.map((item) => (
                <ListingCard
                  key={item.id}
                  item={item}
                  kind={kind}
                  view={view}
                  selected={selected.has(item.id)}
                  onSelect={toggleSelect}
                  onEdit={onEdit}
                  onDelete={(it) => setConfirm({ ids: [it.id], name: it.name })}
                  onToggle={toggle}
                  onCopy={copy}
                  link={listingLink(storeUrl, item, kind)}
                  canToggle={isGrowthOrPro}
                  topId={topId}
                  marketplaceStore={marketplaceStore}
                  deleting={deleting === item.id}
                />
              ))}
            </div>
          )}

          {filtered.length > PER_PAGE && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-dash-muted">
                Showing {(safePage - 1) * PER_PAGE + 1} to {Math.min(safePage * PER_PAGE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} className="rounded-lg border border-dash-line bg-white p-2 text-slate-600 transition hover:bg-gray-50 disabled:opacity-40" aria-label="Previous page"><ChevronLeft size={15} /></button>
                <span className="px-2 text-xs font-semibold tabular-nums text-slate-600">{safePage} / {totalPages}</span>
                <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className="rounded-lg border border-dash-line bg-white p-2 text-slate-600 transition hover:bg-gray-50 disabled:opacity-40" aria-label="Next page"><ChevronRight size={15} /></button>
              </div>
            </div>
          )}
        </div>

        {/* Rail */}
        <aside className="space-y-4">
          <section className="rounded-2xl border border-forest-100 bg-gradient-to-b from-forest-50/80 to-white p-5">
            <div className="flex items-start gap-3">
              <Sparkles size={24} className="flex-shrink-0 text-forest-600" />
              <div>
                <p className="text-[15px] font-semibold text-dash-ink">Still growing?</p>
                <p className="mt-0.5 text-xs leading-relaxed text-dash-muted">Add more {nouns} and reach more customers.</p>
              </div>
            </div>
            <div className="mt-4 grid gap-2">
              {addButton()}
              <button type="button" onClick={importWithSella} className="inline-flex items-center justify-center gap-2 rounded-xl border border-forest-200 bg-white px-4 py-2.5 text-sm font-semibold text-forest transition hover:bg-forest-50">
                <Upload size={15} /> Import {Nouns}
                {!isPremium && <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">Premium</span>}
              </button>
              <button type="button" onClick={() => navigateTo?.('categories')} className="inline-flex items-center justify-center gap-2 rounded-xl border border-forest-200 bg-white px-4 py-2.5 text-sm font-semibold text-forest transition hover:bg-forest-50">
                <Tags size={15} /> Manage Categories
              </button>
            </div>
            {usage}
          </section>

          <section className={`${card} p-5`}>
            <div className="flex items-start gap-3">
              <Lightbulb size={22} className="flex-shrink-0 text-forest-600" />
              <div>
                <p className="text-[15px] font-semibold text-dash-ink">{isService ? 'Service' : 'Product'} Tips</p>
                <p className="mt-0.5 text-xs text-dash-muted">Help your {nouns} get noticed.</p>
              </div>
            </div>
            <ul className="mt-4 space-y-3">
              {tips.map((t) => (
                <li key={t.label} className="flex items-start gap-3">
                  {t.done ? (
                    <span className="mt-px flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-forest-600 text-white"><Check size={12} strokeWidth={3.5} /></span>
                  ) : (
                    <span className="mt-px h-5 w-5 flex-shrink-0 rounded-full border-2 border-forest-200" />
                  )}
                  <span>
                    <span className={`block text-[13px] ${t.done ? 'text-slate-500' : 'text-dash-ink'}`}>{t.label}</span>
                    {t.sub && <span className="block text-[11px] text-dash-muted">{t.sub}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-forest-50 to-[#dcf3e5] p-5">
            <div className="relative z-[1] max-w-[64%]">
              <p className="text-[16px] font-bold leading-snug text-dash-ink">Turn browsing into buying.</p>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600">Great {nouns} + smart marketing = more sales.</p>
              <button type="button" onClick={() => navigateTo?.('marketing')} className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl bg-forest px-4 py-2 text-xs font-semibold text-white transition hover:bg-forest-700">
                Go to Marketing <ArrowRight size={13} />
              </button>
            </div>
            {hasMedia('products-marketing-phone') && (
              <div className="pointer-events-none absolute -bottom-1 right-2 w-[34%] max-w-[110px]">
                <MediaSlot name="products-marketing-phone" alt="" className="h-auto w-full mix-blend-multiply [mask-image:radial-gradient(ellipse_at_center,black_55%,transparent_78%)]" />
              </div>
            )}
          </section>

          <UpgradeCard plan={plan} navigateTo={navigateTo} />
          <HelpCard navigateTo={navigateTo} />
        </aside>
      </div>

      <ConfirmDialog
        open={!!confirm}
        busy={busy}
        title={confirm?.ids.length > 1 ? `Delete ${confirm.ids.length} ${nouns}?` : `Delete this ${noun}?`}
        body={confirm?.ids.length > 1
          ? `They come off your store straight away. This cannot be undone.`
          : <>{confirm?.name ? <span className="font-semibold text-dash-ink">{confirm.name}</span> : `This ${noun}`} comes off your store straight away. This cannot be undone.</>}
        confirmLabel={confirm?.ids.length > 1 ? `Delete ${confirm.ids.length}` : 'Delete'}
        onConfirm={runDelete}
        onClose={() => setConfirm(null)}
      />
      {toastEl}
    </div>
  )
}
