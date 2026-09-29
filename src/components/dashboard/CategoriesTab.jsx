// src/components/dashboard/CategoriesTab.jsx/
//
// Categories, rebuilt on 2026-09-29 to the Categories design: a summary card
// for products and one for services (groups, assigned, unassigned), search,
// a type filter and sorting, and paged lists of groups with a photo, a count
// and the first few listings in each.
//
// A category is still just the `category` field on each listing, set in the
// product or service form. What is new is that it can be managed here too:
//   - give listings with no category a home, one at a time or all at once
//   - rename a group, which moves every listing in it (renaming onto an
//     existing name merges the two)
// Both go through onSetCategory in Dashboard.jsx, which writes only the
// category field, so photos and prices are never touched.
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  Tag, ArrowRight, AlertCircle, CheckCircle2, ChevronRight, ChevronLeft, Search, Lightbulb, Package,
  CalendarDays, SlidersHorizontal, ChevronDown, Pencil, Loader2, X, Check, PartyPopper, Sparkles, Plus,
} from 'lucide-react'
import useConfetti from './ui/useConfetti'
import { NIGERIAN_MARKET_CATEGORIES } from '../../utils/categories'

const PER_PAGE = 6
const card = 'rounded-2xl border border-dash-line bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]'

function group(items) {
  const map = new Map()
  const loose = []
  for (const it of items) {
    const key = String(it.category || '').trim()
    if (!key) { loose.push(it); continue }
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(it)
  }
  return { groups: [...map.entries()].map(([name, list]) => ({ name, list })), loose }
}

function CategoryInput({ value, onChange, options, placeholder = 'Type or pick a category', autoFocus }) {
  const id = `cat-${useId().replace(/:/g, '')}`
  return (
    <>
      <input
        list={id}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={60}
        className="h-9 w-full min-w-0 rounded-lg border border-dash-line bg-white px-3 text-[13px] outline-none focus:border-forest-200 focus:ring-4 focus:ring-forest-50"
      />
      <datalist id={id}>{options.map((o) => <option key={o} value={o} />)}</datalist>
    </>
  )
}

function Section({ kind, data, total, query, sort, onManage, onSetCategory, allNames, toast }) {
  const isService = kind === 'services'
  const noun = isService ? 'service' : 'product'
  // The page is remembered per search and sort, so changing either starts
  // from page 1 without an extra render.
  const [pageState, setPageState] = useState({ key: '', n: 1 })
  const pageKey = `${query}|${sort}`
  const page = pageState.key === pageKey ? pageState.n : 1
  const setPage = (n) => setPageState({ key: pageKey, n })
  const [open, setOpen] = useState(null)
  const [renaming, setRenaming] = useState(null) // { from, to }
  const [busy, setBusy] = useState(false)

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    const rows = data.groups.filter((g) => !q || g.name.toLowerCase().includes(q) || g.list.some((i) => String(i.name || '').toLowerCase().includes(q)))
    rows.sort((a, b) => (sort === 'az' ? a.name.localeCompare(b.name) : sort === 'fewest' ? a.list.length - b.list.length : b.list.length - a.list.length))
    return rows
  }, [data.groups, query, sort])

  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE))
  const safe = Math.min(page, pages)
  const rows = list.slice((safe - 1) * PER_PAGE, safe * PER_PAGE)
  const Icon = isService ? CalendarDays : Package

  const rename = async () => {
    const to = renaming.to.trim()
    if (!to || to === renaming.from) { setRenaming(null); return }
    const g = data.groups.find((x) => x.name === renaming.from)
    setBusy(true)
    try {
      await onSetCategory(kind, g.list.map((i) => i.id), to)
      const merged = data.groups.some((x) => x.name === to)
      toast(merged ? `Merged into "${to}". ${g.list.length} ${noun}${g.list.length === 1 ? '' : 's'} moved.` : `Renamed to "${to}".`)
      setRenaming(null)
      setOpen(to)
    } catch {
      toast('That did not save. Check your connection and try again.', true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={`${card} flex flex-col p-4 sm:p-5`}>
      <div className="flex items-start gap-3">
        <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${isService ? 'bg-violet-50 text-violet-600' : 'bg-forest-50 text-forest-600'}`}><Icon size={20} /></span>
        <div className="min-w-0">
          <h2 className="text-[16px] font-semibold text-dash-ink">{isService ? 'Service' : 'Product'} Categories</h2>
          <p className="text-xs text-dash-muted">{data.groups.length} group{data.groups.length === 1 ? '' : 's'} • {total - data.loose.length} assigned listing{total - data.loose.length === 1 ? '' : 's'}</p>
        </div>
      </div>

      {data.groups.length === 0 ? (
        <div className="mt-4 flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-dash-line px-4 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-50"><Tag size={20} className="text-forest-600" /></span>
          <p className="mt-3 text-sm font-semibold text-dash-ink">No {noun} categories yet</p>
          <p className="mt-1 max-w-xs text-xs leading-relaxed text-dash-muted">
            {total ? `Give your ${noun}s a category below and they'll group up here.` : `Add your first ${noun} and give it a category. Shoppers filter your store by these.`}
          </p>
          <button type="button" onClick={onManage} className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-dash-line px-3.5 py-2 text-xs font-semibold text-dash-ink transition hover:bg-gray-50">
            {total ? `Go to ${isService ? 'Services' : 'Products'}` : `Add a ${noun}`} <ArrowRight size={13} />
          </button>
        </div>
      ) : list.length === 0 ? (
        <p className="mt-4 rounded-xl bg-gray-50 px-4 py-8 text-center text-xs text-dash-muted">No {noun} category matches &quot;{query}&quot;.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {rows.map((g) => {
            const photo = g.list.find((i) => i.imageUrls?.[0] || i.imageUrl)
            const src = photo?.imageUrls?.[0] || photo?.imageUrl
            const expanded = open === g.name
            return (
              <li key={g.name} className={`overflow-hidden rounded-xl border transition ${expanded ? 'border-forest-100 bg-forest-50/30' : 'border-dash-line bg-white hover:border-forest-100'}`}>
                <button type="button" onClick={() => setOpen(expanded ? null : g.name)} aria-expanded={expanded} className="flex w-full items-center gap-3 p-2.5 text-left">
                  <span className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-50">
                    {src ? <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center text-slate-300"><Icon size={18} /></span>}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold text-dash-ink">{g.name}</span>
                    <span className="block text-xs text-dash-muted">{g.list.length} {noun}{g.list.length === 1 ? '' : 's'}</span>
                  </span>
                  <span className="hidden min-w-0 flex-[1.3] flex-wrap justify-end gap-1.5 md:flex">
                    {g.list.slice(0, 3).map((i) => (
                      <span key={i.id} className="max-w-[120px] truncate rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] text-slate-600">{i.name}</span>
                    ))}
                  </span>
                  <ChevronRight size={16} className={`flex-shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                </button>
                {expanded && (
                  <div className="border-t border-forest-100 px-3 pb-3 pt-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="flex flex-wrap gap-1.5">
                      {g.list.map((i) => (
                        <button key={i.id} type="button" onClick={onManage} className="max-w-full truncate rounded-full border border-dash-line bg-white px-2.5 py-1 text-[11px] text-slate-700 transition hover:border-forest-200 hover:text-forest">{i.name}</button>
                      ))}
                    </div>
                    {renaming?.from === g.name ? (
                      <div className="mt-3 flex items-center gap-2">
                        <CategoryInput value={renaming.to} onChange={(v) => setRenaming({ from: g.name, to: v })} options={allNames.filter((n) => n !== g.name)} placeholder="New name" autoFocus />
                        <button type="button" onClick={rename} disabled={busy} className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg bg-forest px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">
                          {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Save
                        </button>
                        <button type="button" onClick={() => setRenaming(null)} className="rounded-lg p-2 text-slate-400 hover:bg-gray-100" aria-label="Cancel"><X size={14} /></button>
                      </div>
                    ) : (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" onClick={() => setRenaming({ from: g.name, to: g.name })} className="inline-flex items-center gap-1.5 rounded-lg border border-dash-line bg-white px-3 py-1.5 text-xs font-semibold text-dash-ink hover:bg-gray-50">
                          <Pencil size={12} /> Rename or merge
                        </button>
                        <button type="button" onClick={onManage} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-forest-600 hover:bg-forest-50">
                          Open {isService ? 'Services' : 'Products'} <ArrowRight size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <button type="button" onClick={() => setPage(Math.max(1, safe - 1))} disabled={safe === 1} className="inline-flex items-center gap-1 rounded-lg border border-dash-line px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-gray-50 disabled:opacity-40"><ChevronLeft size={13} /> Previous</button>
          <span className="text-xs tabular-nums text-dash-muted">{safe} / {pages}</span>
          <button type="button" onClick={() => setPage(Math.min(pages, safe + 1))} disabled={safe === pages} className="inline-flex items-center gap-1 rounded-lg border border-dash-line px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-gray-50 disabled:opacity-40">Next <ChevronRight size={13} /></button>
        </div>
      )}
    </section>
  )
}

export default function CategoriesTab({ navigateTo, products = [], services = [], vendorType = 'products', onSetCategory, customCategories = [] }) {
  const showProducts = vendorType !== 'services'
  const showServices = vendorType !== 'products'
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('most')
  const [toastMsg, setToastMsg] = useState(null)
  const [assign, setAssign] = useState({}) // id -> category text
  const [bulk, setBulk] = useState('')
  const [saving, setSaving] = useState(null)
  const [party, setParty] = useState(false)
  const canvasRef = useRef(null)
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  useConfetti(canvasRef, party && !reduced)

  const p = useMemo(() => group(products), [products])
  const s = useMemo(() => group(services), [services])
  const loose = [...(showProducts ? p.loose.map((i) => ({ ...i, _kind: 'products' })) : []), ...(showServices ? s.loose.map((i) => ({ ...i, _kind: 'services' })) : [])]
  const hadLoose = useRef(loose.length)

  // Every listing just found a home: a little party.
  useEffect(() => {
    if (hadLoose.current > 0 && loose.length === 0) {
      setParty(true)
      setToastMsg({ text: 'All set! Every listing now has a category.' })
      const t = setTimeout(() => setParty(false), 4500)
      hadLoose.current = 0
      return () => clearTimeout(t)
    }
    hadLoose.current = loose.length
    return undefined
  }, [loose.length])

  useEffect(() => {
    if (!toastMsg) return undefined
    const t = setTimeout(() => setToastMsg(null), 3000)
    return () => clearTimeout(t)
  }, [toastMsg])
  const toast = (text, bad = false) => setToastMsg({ text, bad })

  const allNames = useMemo(() => [...new Set([
    ...p.groups.map((g) => g.name), ...s.groups.map((g) => g.name),
    ...customCategories.map((c) => c.name), ...NIGERIAN_MARKET_CATEGORIES.map((c) => c.label),
  ].filter(Boolean))].sort(), [p.groups, s.groups, customCategories])

  const setOne = async (item) => {
    const to = String(assign[item.id] || '').trim()
    if (!to) return
    setSaving(item.id)
    try {
      await onSetCategory(item._kind, [item.id], to)
      toast(`${item.name} is now in "${to}".`)
      setAssign((a) => { const n = { ...a }; delete n[item.id]; return n })
    } catch {
      toast('That did not save. Check your connection and try again.', true)
    } finally {
      setSaving(null)
    }
  }
  const setAll = async () => {
    const to = bulk.trim()
    if (!to) return
    setSaving('bulk')
    try {
      const byKind = loose.reduce((acc, i) => { (acc[i._kind] ||= []).push(i.id); return acc }, {})
      for (const [kind, ids] of Object.entries(byKind)) await onSetCategory(kind, ids, to)
      setBulk('')
    } catch {
      toast('Some did not save. Check your connection and try again.', true)
    } finally {
      setSaving(null)
    }
  }

  const summary = (kind) => {
    const isService = kind === 'services'
    const d = isService ? s : p
    const total = isService ? services.length : products.length
    return (
      <div className={`${card} p-4 sm:p-5`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ${isService ? 'bg-violet-50 text-violet-600' : 'bg-forest-50 text-forest-600'}`}>
              {isService ? <CalendarDays size={22} /> : <Package size={22} />}
            </span>
            <div>
              <p className="text-[18px] font-semibold text-dash-ink">{isService ? 'Services' : 'Products'}</p>
              <p className="text-xs text-dash-muted">{isService ? 'Organise your bookable services and appointments.' : 'Organise your physical and digital products.'}</p>
            </div>
          </div>
          <button type="button" onClick={() => navigateTo(isService ? 'services' : 'products')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-forest-700">
            Manage {isService ? 'services' : 'products'} <ArrowRight size={14} />
          </button>
        </div>
        <div className="mt-4 grid grid-cols-3 divide-x divide-dash-line">
          {[
            { n: d.groups.length, label: 'Groups', icon: <Tag size={15} className="text-slate-400" /> },
            { n: total - d.loose.length, label: 'Assigned listings', icon: <span className="h-2 w-2 rounded-full bg-green-500" /> },
            { n: d.loose.length, label: 'Unassigned listings', icon: <span className={`h-2 w-2 rounded-full ${d.loose.length ? 'bg-amber-500' : 'bg-slate-400'}`} /> },
          ].map((x) => (
            <div key={x.label} className="flex items-center gap-2.5 px-3 first:pl-0">
              <span className="hidden flex-shrink-0 sm:inline-flex">{x.icon}</span>
              <span className="min-w-0">
                <span className="block text-[20px] font-bold leading-tight text-dash-ink tabular-nums">{x.n}</span>
                <span className="block truncate text-[11px] text-dash-muted">{x.label.replace(' listings', '')}<span className="hidden sm:inline">{x.label.includes(' listings') ? ' listings' : ''}</span></span>
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[1320px] space-y-5 px-4 pb-10 pt-5 sm:px-6 lg:px-8 lg:pt-7">
      <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-[80]" aria-hidden="true" />

      {/* Header */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-forest-600">Categories</p>
          <h1 className="mt-1.5 font-body text-[30px] font-bold leading-tight tracking-tight text-dash-ink sm:text-[40px]">Categories</h1>
          <p className="mt-1.5 text-sm text-dash-muted sm:text-[15px]">Organise your products and services so customers find what they need faster.</p>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-forest-100 bg-forest-50/60 p-4">
          <Lightbulb size={22} className="mt-0.5 flex-shrink-0 text-forest-600" />
          <div>
            <p className="text-[13px] font-semibold text-forest">Why categories matter</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Categories help customers browse and filter your storefront, so they find the right thing quickly, and that means more chances of a sale.
            </p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className={`grid gap-4 ${showProducts && showServices ? 'lg:grid-cols-2' : ''}`}>
        {showProducts && summary('products')}
        {showServices && summary('services')}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <label className="relative block flex-1 sm:max-w-sm">
          <span className="sr-only">Search categories</span>
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search categories or listings..." className="h-10 w-full rounded-xl border border-dash-line bg-white pl-10 pr-3 text-[13px] outline-none focus:border-forest-200 focus:ring-4 focus:ring-forest-50" />
        </label>
        {showProducts && showServices && (
          <div className="flex gap-1.5">
            {[['all', 'All'], ['products', 'Products'], ['services', 'Services']].map(([id, label]) => (
              <button key={id} type="button" onClick={() => setFilter(id)} className={`h-10 rounded-xl px-4 text-[13px] font-medium transition ${filter === id ? 'bg-forest text-white' : 'border border-dash-line bg-white text-slate-600 hover:bg-gray-50'}`}>{label}</button>
            ))}
          </div>
        )}
        <label className="relative block sm:ml-auto">
          <span className="sr-only">Sort</span>
          <SlidersHorizontal size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-10 w-full appearance-none rounded-xl border border-dash-line bg-white pl-9 pr-9 text-[13px] text-slate-700 outline-none focus:border-forest-200 sm:w-52">
            <option value="most">Sort by: Most listings</option>
            <option value="fewest">Sort by: Fewest listings</option>
            <option value="az">Sort by: A to Z</option>
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </label>
      </div>

      {/* Lists */}
      <div className={`grid items-start gap-4 ${showProducts && showServices && filter === 'all' ? 'xl:grid-cols-2' : ''}`}>
        {showProducts && filter !== 'services' && (
          <Section kind="products" data={p} total={products.length} query={query} sort={sort} onManage={() => navigateTo('products')} onSetCategory={onSetCategory} allNames={allNames} toast={toast} />
        )}
        <div className="space-y-4">
          {showServices && filter !== 'products' && (
            <Section kind="services" data={s} total={services.length} query={query} sort={sort} onManage={() => navigateTo('services')} onSetCategory={onSetCategory} allNames={allNames} toast={toast} />
          )}

          {/* Unassigned, or all set */}
          {loose.length === 0 ? (
            (products.length + services.length > 0) && (
              <div className={`${card} flex items-center gap-4 border-forest-100 bg-gradient-to-r from-forest-50/80 to-white p-5 ${party ? 'animate-in zoom-in-95 fade-in duration-300' : ''}`}>
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-forest text-white"><Check size={20} strokeWidth={3} /></span>
                <div className="flex-1">
                  <p className="text-[15px] font-semibold text-dash-ink">All set!</p>
                  <p className="text-xs text-dash-muted">Your categories are well organised. No unassigned listings at the moment.</p>
                </div>
                <PartyPopper size={26} className="flex-shrink-0 text-forest-600" />
              </div>
            )
          ) : (
            <div className={`${card} border-amber-200 p-4 sm:p-5`}>
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><AlertCircle size={19} /></span>
                <div>
                  <p className="text-[15px] font-semibold text-dash-ink">{loose.length} listing{loose.length === 1 ? '' : 's'} still need{loose.length === 1 ? 's' : ''} a home</p>
                  <p className="text-xs text-dash-muted">Customers filtering your store won&apos;t find these. Pick a category right here, no need to open each one.</p>
                </div>
              </div>
              {loose.length > 1 && (
                <div className="mt-4 flex flex-col gap-2 rounded-xl bg-amber-50/60 p-3 sm:flex-row sm:items-center">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-800"><Sparkles size={14} /> Put them all in</span>
                  <div className="flex flex-1 gap-2">
                    <CategoryInput value={bulk} onChange={setBulk} options={allNames} />
                    <button type="button" onClick={setAll} disabled={!bulk.trim() || saving === 'bulk'} className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-forest px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-50">
                      {saving === 'bulk' ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Apply to {loose.length}
                    </button>
                  </div>
                </div>
              )}
              <ul className="mt-3 divide-y divide-dash-line">
                {loose.slice(0, 12).map((i) => (
                  <li key={i.id} className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center">
                    <span className="flex min-w-0 flex-1 items-center gap-2.5">
                      <span className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-lg bg-gray-50">
                        {i.imageUrls?.[0] ? <img src={i.imageUrls[0]} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center text-slate-300">{i._kind === 'services' ? <CalendarDays size={15} /> : <Package size={15} />}</span>}
                      </span>
                      <span className="truncate text-[13px] font-medium text-dash-ink">{i.name}</span>
                    </span>
                    <span className="flex gap-2 sm:w-[300px]">
                      <CategoryInput value={assign[i.id] || ''} onChange={(v) => setAssign((a) => ({ ...a, [i.id]: v }))} options={allNames} />
                      <button type="button" onClick={() => setOne(i)} disabled={!String(assign[i.id] || '').trim() || saving === i.id} className="inline-flex flex-shrink-0 items-center justify-center rounded-lg bg-forest px-3 text-white disabled:opacity-40" aria-label={`Save category for ${i.name}`}>
                        {saving === i.id ? <Loader2 size={14} className="animate-spin" /> : <Plus size={15} />}
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
              {loose.length > 12 && <p className="mt-2 text-xs text-dash-muted">And {loose.length - 12} more. Use &quot;Put them all in&quot; above, or fix them in {showProducts ? 'Products' : 'Services'}.</p>}
            </div>
          )}
        </div>
      </div>

      {toastMsg && (
        <div role="status" className={`fixed bottom-6 left-1/2 z-[70] flex w-[min(92vw,420px)] -translate-x-1/2 items-center gap-2.5 rounded-2xl px-4 py-3 text-sm text-white shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 ${toastMsg.bad ? 'bg-red-600' : 'bg-dash-ink'}`}>
          {toastMsg.bad ? <AlertCircle size={17} className="flex-shrink-0" /> : <CheckCircle2 size={17} className="flex-shrink-0 text-green-400" />}
          <span className="flex-1">{toastMsg.text}</span>
        </div>
      )}
    </div>
  )
}
