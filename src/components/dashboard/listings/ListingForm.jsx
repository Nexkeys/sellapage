// src/components/dashboard/listings/ListingForm.jsx
//
// "Add a product" / "Add a service" (and Edit), built to the 2026-09-26
// design: a three step guide (Details, Pricing & options, Photos & publish),
// a live preview of the listing as customers will see it, a Listing quality
// score, and a Publish bar that stays at the bottom of the screen.
//
// Nothing about saving changed. The fields write into the same form state in
// Dashboard.jsx, and Publish calls the same handleSave / handleSaveService,
// which still validate name and price themselves. The checks here run first
// so a vendor gets a friendly, specific nudge beside the field instead of a
// red line at the top of the form.
//
// Required stays what the server requires: a name and a price. Category,
// description and photos are "recommended": they raise the quality score, and
// publishing without a photo asks once, because a listing with no picture is
// the one customers scroll past.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, ArrowRight, Sparkles, Lock, Loader2, UploadCloud, X, ImageIcon, Check, Smile,
  Lightbulb, Pencil, Star, MapPin, Video, Clock, AlertCircle, History, Trash2,
} from 'lucide-react'
import CategoryPicker from './CategoryPicker'
import OptionsEditor from './OptionsEditor'
import { naira, saveDraft, readDraft, clearDraft, timeAgo } from './listingUtils'

const NAME_MAX = 100
const DESC_SOFT_MAX = 1000
const DURATION_CHIPS = ['30 mins', '45 mins', '1 hour', '2 hours', 'Half day', 'Full day']

function FieldError({ children }) {
  if (!children) return null
  return (
    <p role="alert" className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-medium leading-snug text-amber-800 animate-in fade-in slide-in-from-top-1 duration-200">
      <Smile size={15} className="mt-px flex-shrink-0 text-amber-500" />
      <span>{children}</span>
    </p>
  )
}

function Label({ htmlFor, children, required, hint, right }) {
  return (
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <label htmlFor={htmlFor} className="text-[13px] font-semibold text-dash-ink">
        {children}
        {required && <span className="ml-0.5 text-red-500">*</span>}
        {hint && <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">{hint}</span>}
      </label>
      {right}
    </div>
  )
}

const inputCls = (bad) =>
  `w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-dash-ink outline-none transition placeholder:text-slate-400 focus:ring-4 ${
    bad ? 'border-red-300 focus:border-red-300 focus:ring-red-50' : 'border-dash-line focus:border-forest-200 focus:ring-forest-50'
  }`

function QualityRing({ done, total }) {
  const r = 22
  const c = 2 * Math.PI * r
  const pct = total ? done / total : 0
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" className="flex-shrink-0" role="img" aria-label={`${done} of ${total} essentials complete`}>
      <circle cx="28" cy="28" r={r} fill="none" stroke="#eef1f4" strokeWidth="5" />
      <circle
        cx="28" cy="28" r={r} fill="none" stroke="#16a34a" strokeWidth="5" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform="rotate(-90 28 28)"
        style={{ transition: 'stroke-dashoffset 500ms ease' }}
      />
      <text x="28" y="32" textAnchor="middle" fontSize="12" fontWeight="700" fill="#0f172a">{done}/{total}</text>
    </svg>
  )
}

export default function ListingForm({
  kind = 'product',
  storeId,
  form, setForm,
  isEditing = false,
  saving = false,
  formError = '',
  onSave, onCancel,
  maxImages = 3,
  onImageChange, onRemoveExistingImage, onRemoveNewImage,
  isGrowthOrPro = false,
  onGenerateDescription, generatingDesc = false, aiDescError = '',
  customCategories = [], onSaveCustomCategory,
  categorySuggestions = [],
  reviewCount = 0, avgRating = 0,
}) {
  const isService = kind === 'service'
  const noun = isService ? 'service' : 'product'
  const Noun = isService ? 'Service' : 'Product'

  const [touched, setTouched] = useState({})
  const [attempted, setAttempted] = useState(false)
  const [shake, setShake] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [photoNudge, setPhotoNudge] = useState(false)
  const [leaveAsk, setLeaveAsk] = useState(false)
  const [notice, setNotice] = useState('')
  const [draft, setDraft] = useState(() => (isEditing ? null : readDraft(storeId, kind)))
  const [trackStock, setTrackStock] = useState(() => !isService && form.stock !== '' && form.stock !== null && form.stock !== undefined)
  const fileRef = useRef(null)
  const topRef = useRef(null)

  // Opening the form starts at the top, not wherever the list was scrolled to.
  useEffect(() => {
    document.querySelector('main')?.scrollTo({ top: 0 })
  }, [])

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(''), 3200)
    return () => clearTimeout(t)
  }, [notice])

  const set = (field) => (e) => {
    const value = e?.target ? e.target.value : e
    setForm((p) => ({ ...p, [field]: value }))
  }
  const touch = (field) => () => setTouched((t) => ({ ...t, [field]: true }))

  // ── Checks ──────────────────────────────────────────────────────────────
  const imageTotal = (form.imageUrls?.length || 0) + (form.imagePreviews?.length || 0)
  const priceNum = Number(form.price)
  const errors = useMemo(() => {
    const e = {}
    if (!String(form.name || '').trim()) {
      e.name = isService
        ? 'Your service needs a name. Something clear like "Bridal Makeup (Home Service)" works best.'
        : 'Your product needs a name. Something clear like "Black Ankara Midi Dress" works best.'
    }
    if (form.price === '' || form.price === null || form.price === undefined) {
      e.price = `You do know your ${noun} needs a price, right? Add one so customers know what to pay.`
    } else if (Number.isNaN(priceNum) || priceNum <= 0) {
      e.price = 'That price does not look right. Use numbers only and more than zero, like 5000.'
    }
    if (!isService && trackStock && form.stock !== '' && Number(form.stock) < 0) {
      e.stock = 'Stock cannot go below zero. Use 0 to show it as sold out.'
    }
    return e
  }, [form.name, form.price, form.stock, priceNum, isService, noun, trackStock])
  const show = (field) => (attempted || touched[field]) && errors[field]
  const errorCount = Object.keys(errors).length

  const essentials = [
    { id: 'name', label: `${Noun} name`, done: !errors.name },
    { id: 'price', label: 'Price', done: !errors.price },
    { id: 'category', label: 'Category', done: !!String(form.category || '').trim() },
    { id: 'description', label: 'Description', done: String(form.description || '').trim().length >= 20 },
    { id: 'images', label: 'Images', done: imageTotal > 0 },
  ]
  const doneCount = essentials.filter((e) => e.done).length

  const steps = [
    { n: 1, label: 'Details', done: !errors.name, target: 'lf-name' },
    { n: 2, label: isService ? 'Pricing & booking' : 'Pricing & options', done: !errors.price, target: 'lf-price' },
    { n: 3, label: 'Photos & publish', done: imageTotal > 0, target: 'lf-photos' },
  ]
  const currentStep = steps.find((s) => !s.done)?.n || 3

  const goTo = (id) => {
    const el = document.getElementById(id)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => el.focus?.({ preventScroll: true }), 350)
  }

  // ── Publish ─────────────────────────────────────────────────────────────
  const publish = async (skipPhotoCheck = false) => {
    setAttempted(true)
    if (errorCount) {
      setShake(true)
      setTimeout(() => setShake(false), 500)
      const first = ['name', 'price', 'stock'].find((f) => errors[f])
      goTo(first === 'stock' ? 'lf-stock' : `lf-${first}`)
      return
    }
    if (!skipPhotoCheck && imageTotal === 0) {
      setPhotoNudge(true)
      return
    }
    setPhotoNudge(false)
    const ok = await onSave?.()
    if (ok && !isEditing) clearDraft(storeId, kind)
  }

  const dirty = !isEditing && (
    ['name', 'price', 'description', 'category'].some((f) => String(form[f] || '').trim())
    || imageTotal > 0 || form.variations?.length > 0
  )

  const doSaveDraft = () => {
    const ok = saveDraft(storeId, kind, form)
    setNotice(ok
      ? (imageTotal ? 'Draft saved on this device. Photos are not kept in drafts, so add them again when you come back.' : 'Draft saved on this device.')
      : 'Could not save a draft in this browser.')
    return ok
  }

  const leave = () => {
    if (dirty && !isEditing) setLeaveAsk(true)
    else onCancel?.()
  }

  const restoreDraft = () => {
    if (!draft?.data) return
    setForm((p) => ({ ...p, ...draft.data, variations: Array.isArray(draft.data.variations) ? draft.data.variations : p.variations }))
    if (!isService) setTrackStock(draft.data.stock !== '' && draft.data.stock !== null && draft.data.stock !== undefined)
    setDraft(null)
    setNotice('Draft restored. Pick up where you left off.')
  }
  const discardDraft = () => {
    clearDraft(storeId, kind)
    setDraft(null)
  }

  // ── Photos ──────────────────────────────────────────────────────────────
  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const files = Array.from(e.dataTransfer?.files || []).filter((f) => f.type.startsWith('image/'))
    if (files.length) onImageChange?.({ target: { files } })
  }
  const previewImage = form.imagePreviews?.[0] || form.imageUrls?.[0] || ''
  const thumbs = [
    ...(form.imageUrls || []).map((src) => ({ src, remove: () => onRemoveExistingImage?.(src) })),
    ...(form.imagePreviews || []).map((src, i) => ({ src, remove: () => onRemoveNewImage?.(i) })),
  ]
  const emptySlots = Math.max(0, Math.min(maxImages, Math.max(3, thumbs.length + 1)) - thumbs.length)
  const canAddMore = thumbs.length < maxImages

  const nameLen = String(form.name || '').length
  const descLen = String(form.description || '').length

  return (
    <div ref={topRef} className="mx-auto w-full max-w-[1320px] px-4 pb-4 pt-5 sm:px-6 lg:px-8 lg:pt-7">
      {/* Header */}
      <button type="button" onClick={leave} className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-600 transition hover:text-forest">
        <ArrowLeft size={16} /> Back to {isService ? 'services' : 'products'}
      </button>
      <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="font-body text-[28px] font-bold leading-tight tracking-tight text-dash-ink sm:text-[32px]">
            {isEditing ? `Edit ${noun}` : `Add a ${noun}`}
          </h1>
          <p className="mt-1 text-sm text-dash-muted">
            {isEditing ? 'Change anything you like. Customers see the update straight away.' : 'Create your listing once. We’ll help you make it ready to sell.'}
          </p>
        </div>
        <div className="flex max-w-md items-start gap-3 rounded-2xl bg-forest-50 px-4 py-3">
          <Sparkles size={20} className="mt-0.5 flex-shrink-0 text-forest-600" />
          <div>
            <p className="text-[13px] font-semibold text-forest">AI helps you sell</p>
            <p className="mt-0.5 text-xs leading-relaxed text-forest-600/80">
              {isGrowthOrPro
                ? `Type the ${noun} name, then tap Help me write for a description that sells.`
                : 'Help me write drafts your description for you. Available on Growth, Pro and Premium plans.'}
            </p>
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div className="mt-5">
        <ol className="flex items-center gap-2 sm:gap-3">
          {steps.map((s, i) => {
            const active = s.n === currentStep
            return (
              <li key={s.n} className={`flex items-center gap-2 sm:gap-3 ${i < steps.length - 1 ? 'flex-1' : ''}`}>
                <button type="button" onClick={() => goTo(s.target)} className="group flex items-center gap-2">
                  <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold transition ${
                    s.done ? 'bg-forest text-white' : active ? 'bg-forest text-white ring-4 ring-forest-50' : 'border border-dash-line bg-white text-slate-500'
                  }`}>
                    {s.done ? <Check size={15} strokeWidth={3} /> : s.n}
                  </span>
                  <span className={`hidden text-sm sm:inline ${active ? 'font-semibold text-dash-ink' : 'text-slate-500 group-hover:text-dash-ink'}`}>{s.label}</span>
                </button>
                {i < steps.length - 1 && (
                  <span className="h-0.5 flex-1 overflow-hidden rounded-full bg-dash-line">
                    <span className="block h-full rounded-full bg-forest-600 transition-all duration-500" style={{ width: s.done ? '100%' : '0%' }} />
                  </span>
                )}
              </li>
            )
          })}
        </ol>
        <p className="mt-2 text-xs text-dash-muted sm:hidden">Step {currentStep} of 3: {steps[currentStep - 1].label}</p>
      </div>

      {/* Draft found */}
      {draft && (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-forest-100 bg-forest-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-sm text-dash-ink">
            <History size={16} className="flex-shrink-0 text-forest-600" />
            You have a saved draft from {timeAgo(draft.at)}{draft.data?.name ? <>: <span className="font-semibold">{draft.data.name}</span></> : null}.
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={restoreDraft} className="rounded-xl bg-forest px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-forest-700">Continue draft</button>
            <button type="button" onClick={discardDraft} className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-white hover:text-dash-ink">Discard</button>
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* ── The form ─────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <section className="rounded-2xl border border-dash-line bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-6">
            <h2 className="text-[15px] font-semibold text-dash-ink">{Noun} details</h2>

            {(formError || (attempted && errorCount > 0)) && (
              <div role="alert" className={`mt-4 flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm ${formError && !errorCount ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>
                {formError && !errorCount ? <AlertCircle size={17} className="mt-px flex-shrink-0" /> : <Smile size={17} className="mt-px flex-shrink-0 text-amber-500" />}
                <span>
                  {errorCount
                    ? `Almost there! Just ${errorCount === 1 ? 'one thing needs' : `${errorCount} things need`} a quick look below.`
                    : formError}
                </span>
              </div>
            )}

            <div className="mt-5 space-y-5">
              {/* Name */}
              <div>
                <Label htmlFor="lf-name" required right={<span className={`text-[11px] tabular-nums ${nameLen >= NAME_MAX ? 'text-amber-600' : 'text-slate-400'}`}>{nameLen}/{NAME_MAX}</span>}>
                  {Noun} name
                </Label>
                <input
                  id="lf-name"
                  value={form.name}
                  onChange={set('name')}
                  onBlur={touch('name')}
                  maxLength={NAME_MAX}
                  placeholder={isService ? 'e.g. Knotless Braids (Mid-back)' : 'e.g. Oversized T-shirt (Black)'}
                  aria-invalid={!!show('name')}
                  className={inputCls(show('name'))}
                />
                <FieldError>{show('name')}</FieldError>
              </div>

              {/* Price + category */}
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="lf-price" required>Price (₦)</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">₦</span>
                    <input
                      id="lf-price"
                      value={form.price}
                      onChange={set('price')}
                      onBlur={touch('price')}
                      type="number"
                      min="0"
                      inputMode="numeric"
                      placeholder="e.g. 5000"
                      aria-invalid={!!show('price')}
                      className={`${inputCls(show('price'))} pl-8`}
                    />
                  </div>
                  {show('price') ? <FieldError>{show('price')}</FieldError> : (
                    <p className="mt-1.5 text-xs text-dash-muted">
                      {priceNum > 0 ? <>Customers will see <span className="font-semibold text-forest-600">{naira(priceNum)}</span></> : 'Enter the price in Nigerian Naira (₦).'}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="lf-category" hint="Recommended">Category</Label>
                  {isService ? (
                    <>
                      <input
                        id="lf-category"
                        value={form.category}
                        onChange={set('category')}
                        list="lf-category-list"
                        placeholder="e.g. Hair, Consultations, Spa"
                        className={inputCls(false)}
                      />
                      <datalist id="lf-category-list">
                        {categorySuggestions.map((c) => <option key={c} value={c} />)}
                      </datalist>
                    </>
                  ) : (
                    <CategoryPicker
                      id="lf-category"
                      value={form.category}
                      onChange={(v) => setForm((p) => ({ ...p, category: v }))}
                      customCategories={customCategories}
                      onSaveCustomCategory={onSaveCustomCategory}
                    />
                  )}
                  <p className="mt-1.5 text-xs text-dash-muted">Customers can filter your page by category.</p>
                </div>
              </div>

              {/* Service: duration + location */}
              {isService && (
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="lf-duration">Duration</Label>
                    <div className="relative">
                      <Clock size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input id="lf-duration" value={form.duration} onChange={set('duration')} placeholder="e.g. 1 hour" className={`${inputCls(false)} pl-10`} />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {DURATION_CHIPS.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setForm((p) => ({ ...p, duration: d }))}
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${form.duration === d ? 'border-forest bg-forest text-white' : 'border-dash-line text-slate-600 hover:border-forest-200 hover:bg-forest-50'}`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Where it happens</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: 'physical', label: 'In person', sub: 'Your place or theirs', icon: MapPin },
                        { value: 'virtual', label: 'Online', sub: 'Call or video', icon: Video },
                      ].map((opt) => {
                        const on = form.locationType === opt.value
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setForm((p) => ({ ...p, locationType: opt.value }))}
                            aria-pressed={on}
                            className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition ${on ? 'border-forest bg-forest-50 ring-4 ring-forest-50' : 'border-dash-line hover:border-forest-200'}`}
                          >
                            <opt.icon size={17} className={on ? 'text-forest' : 'text-slate-400'} />
                            <span>
                              <span className={`block text-[13px] font-semibold ${on ? 'text-forest' : 'text-dash-ink'}`}>{opt.label}</span>
                              <span className="block text-[11px] text-dash-muted">{opt.sub}</span>
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <label htmlFor="lf-desc" className="text-[13px] font-semibold text-dash-ink">
                    Description
                    <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">Recommended</span>
                  </label>
                  {isGrowthOrPro ? (
                    <button
                      type="button"
                      onClick={onGenerateDescription}
                      disabled={generatingDesc || !String(form.name || '').trim()}
                      title={!String(form.name || '').trim() ? `Type the ${noun} name first` : undefined}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-forest-50 px-3 py-1.5 text-xs font-semibold text-forest transition hover:bg-forest-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {generatingDesc ? <><Loader2 size={13} className="animate-spin" /> Writing...</> : <><Sparkles size={13} /> Help me write</>}
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-gray-50 px-2 py-1 text-[11px] font-semibold text-slate-400">
                      <Lock size={11} /> Help me write: Growth and up
                    </span>
                  )}
                </div>
                <div className="relative">
                  <textarea
                    id="lf-desc"
                    value={form.description}
                    onChange={set('description')}
                    rows={5}
                    placeholder={isService ? 'What is included, how long it takes, what the client should bring...' : `Tell customers about your ${noun}: size, material, what makes it special...`}
                    className={`${inputCls(false)} resize-y pb-7`}
                  />
                  <span className={`pointer-events-none absolute bottom-2.5 right-3 text-[11px] tabular-nums ${descLen > DESC_SOFT_MAX ? 'text-amber-600' : 'text-slate-400'}`}>
                    {descLen}/{DESC_SOFT_MAX}
                  </span>
                </div>
                {generatingDesc && <p className="mt-1.5 text-xs text-forest-600">Please hold on, writing a description from your {noun} name...</p>}
                {aiDescError && <p className="mt-1.5 text-xs font-medium text-red-500">{aiDescError}</p>}
              </div>

              {/* Photos */}
              <div id="lf-photos" tabIndex={-1} className="outline-none">
                <Label hint="Recommended">Images</Label>
                <p className="-mt-1 mb-2.5 text-xs text-dash-muted">Upload PNG or JPG. Max 5MB each. Up to {maxImages} images. The first one is the cover.</p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  {canAddMore && (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={onDrop}
                      className={`flex min-h-[132px] flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-5 text-center transition sm:max-w-[270px] ${
                        dragging ? 'border-forest bg-forest-50' : 'border-forest-200 bg-forest-50/30 hover:bg-forest-50/60'
                      }`}
                    >
                      <UploadCloud size={24} className="text-forest-600" />
                      <p className="mt-1.5 text-xs text-slate-600">{dragging ? 'Drop to upload' : 'Drag & drop images here'}</p>
                      <p className="text-[11px] text-slate-400">or</p>
                      <button type="button" onClick={() => fileRef.current?.click()} className="mt-1.5 rounded-lg bg-forest px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-forest-700">
                        Add photos
                      </button>
                      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { onImageChange?.(e); e.target.value = '' }} />
                    </div>
                  )}
                  <div className="grid flex-1 grid-cols-3 gap-2.5 sm:grid-cols-[repeat(auto-fill,minmax(104px,1fr))]">
                    {thumbs.map((t, i) => (
                      <div key={`${t.src.slice(-24)}-${i}`} className="group relative aspect-square overflow-hidden rounded-xl border border-dash-line bg-gray-50">
                        <img src={t.src} alt="" className="h-full w-full object-cover" />
                        {i === 0 && <span className="absolute left-1.5 top-1.5 rounded-md bg-white/95 px-1.5 py-0.5 text-[10px] font-bold text-forest shadow-sm">Cover</span>}
                        <button
                          type="button"
                          onClick={t.remove}
                          className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100"
                          aria-label="Remove photo"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                    {Array.from({ length: emptySlots }).map((_, i) => (
                      <button
                        key={`empty-${i}`}
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dash-line bg-gray-50/60 text-slate-300 transition hover:border-forest-200 hover:text-forest-600"
                        aria-label="Add a photo"
                      >
                        <ImageIcon size={20} />
                        <span className="text-[10px] tabular-nums text-slate-400">{thumbs.length + i + 1} / {maxImages}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Stock (products) */}
              {!isService && (
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="lf-stock">Stock count</Label>
                    <input
                      id="lf-stock"
                      value={trackStock ? (form.stock ?? '') : ''}
                      onChange={set('stock')}
                      onBlur={touch('stock')}
                      disabled={!trackStock}
                      type="number"
                      min="0"
                      inputMode="numeric"
                      placeholder={trackStock ? 'e.g. 10' : 'Not tracking stock'}
                      className={`${inputCls(show('stock'))} disabled:bg-gray-50 disabled:text-slate-400`}
                    />
                    {show('stock') ? <FieldError>{show('stock')}</FieldError> : (
                      <p className="mt-1.5 text-xs text-dash-muted">{trackStock ? 'Set to 0 to show it as sold out.' : 'Leave off if you don’t track stock.'}</p>
                    )}
                  </div>
                  <div className="flex items-start gap-3 sm:pt-7">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={trackStock}
                      onClick={() => {
                        const next = !trackStock
                        setTrackStock(next)
                        if (!next) setForm((p) => ({ ...p, stock: '' }))
                        else setTimeout(() => document.getElementById('lf-stock')?.focus(), 50)
                      }}
                      className={`relative mt-0.5 h-6 w-11 flex-shrink-0 rounded-full transition ${trackStock ? 'bg-forest-600' : 'bg-gray-200'}`}
                    >
                      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${trackStock ? 'left-[22px]' : 'left-0.5'}`} />
                    </button>
                    <span>
                      <span className="block text-[13px] font-semibold text-dash-ink">Track inventory</span>
                      <span className="block text-xs text-dash-muted">Stock counts down with each paid order, and you get low stock alerts.</span>
                    </span>
                  </div>
                </div>
              )}

              {/* Service: booking note */}
              {isService && (
                <div>
                  <Label htmlFor="lf-note" hint="Optional">Booking instructions</Label>
                  <textarea
                    id="lf-note"
                    value={form.bookingNote}
                    onChange={set('bookingNote')}
                    rows={2}
                    placeholder="e.g. I will reach out on WhatsApp within 2 hours to confirm your preferred time."
                    className={`${inputCls(false)} resize-y`}
                  />
                  <p className="mt-1.5 text-xs text-dash-muted">Shown to clients when they book.</p>
                </div>
              )}
            </div>
          </section>

          {!isService && <OptionsEditor form={form} setForm={setForm} />}
        </div>

        {/* ── Preview + quality ───────────────────────────────────────── */}
        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <section className="rounded-2xl border border-dash-line bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
            <h2 className="text-[15px] font-semibold text-dash-ink">Listing preview</h2>
            <p className="mt-0.5 text-xs text-dash-muted">This is how your {noun} will appear on your store.</p>
            <div className="mt-4 overflow-hidden rounded-2xl border border-dash-line">
              <div className="relative aspect-[4/3] bg-gray-50">
                {previewImage ? (
                  <img src={previewImage} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-slate-300">
                    <ImageIcon size={34} strokeWidth={1.5} />
                    <span className="text-[11px] text-slate-400">Your cover photo shows here</span>
                  </div>
                )}
                <span className="absolute right-2.5 top-2.5 rounded-full bg-forest-50 px-2.5 py-0.5 text-[11px] font-semibold text-forest">{Noun}</span>
                {thumbs.length > 1 && (
                  <span className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
                    {thumbs.slice(0, 6).map((_, i) => <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === 0 ? 'bg-white' : 'bg-white/50'}`} />)}
                  </span>
                )}
              </div>
              <div className="p-4">
                <p className={`line-clamp-2 text-[15px] font-semibold ${form.name ? 'text-dash-ink' : 'text-slate-400'}`}>{form.name || `${Noun} name`}</p>
                <p className="mt-1 text-lg font-bold text-forest-600 tabular-nums">{priceNum > 0 ? naira(priceNum) : naira(0)}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {(form.category || !isService) && (
                    <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] text-slate-600">{form.category || 'Category'}</span>
                  )}
                  {isService && form.duration && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-[11px] text-slate-600"><Clock size={11} /> {form.duration}</span>
                  )}
                  {isService && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-[11px] text-slate-600">
                      {form.locationType === 'virtual' ? <><Video size={11} /> Online</> : <><MapPin size={11} /> In person</>}
                    </span>
                  )}
                </div>
                <p className="mt-2 flex items-center gap-1 text-xs text-dash-muted">
                  <Star size={13} className={reviewCount ? 'fill-amber-400 text-amber-400' : 'text-slate-400'} />
                  {reviewCount ? `${Number(avgRating || 0).toFixed(1)} (${reviewCount} review${reviewCount === 1 ? '' : 's'})` : '(0 reviews)'}
                </p>
                {form.description && <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-500">{form.description}</p>}
                <span className="mt-3 block w-full rounded-xl bg-forest py-2.5 text-center text-sm font-semibold text-white">
                  {isService ? 'Book now' : 'Add to cart'}
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-dash-line bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
            <h2 className="text-[15px] font-semibold text-dash-ink">Listing quality</h2>
            <div className="mt-3 flex items-center gap-3">
              <QualityRing done={doneCount} total={essentials.length} />
              <p className="text-[13px] font-semibold text-dash-ink">
                {doneCount === essentials.length ? 'Ready to sell!' : `${doneCount} of ${essentials.length} essentials complete`}
              </p>
            </div>
            <ul className="mt-3 space-y-1">
              {essentials.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => goTo(e.id === 'images' ? 'lf-photos' : e.id === 'description' ? 'lf-desc' : `lf-${e.id}`)}
                    className="flex w-full items-center gap-3 rounded-lg px-1 py-1.5 text-left text-[13px] transition hover:bg-gray-50"
                  >
                    {e.done ? (
                      <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-forest-600 text-white"><Check size={11} strokeWidth={3.5} /></span>
                    ) : (
                      <span className="h-[18px] w-[18px] rounded-full border-2 border-forest-200" />
                    )}
                    <span className={e.done ? 'text-dash-ink' : 'text-slate-500'}>{e.label}</span>
                    {e.id === 'description' && !e.done && String(form.description || '').trim() && (
                      <span className="ml-auto text-[10px] text-slate-400">20+ characters</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-forest-50/70 px-3 py-2.5">
              <Lightbulb size={17} className="mt-0.5 flex-shrink-0 text-forest-600" />
              <p className="text-xs leading-relaxed text-forest-600">
                {imageTotal === 0
                  ? 'Clear photos and a specific title help customers decide faster.'
                  : !essentials[3].done
                    ? 'A few lines on size, material or what is included answers questions before customers ask them.'
                    : 'Share the link on your WhatsApp status once it is live.'}
              </p>
            </div>
          </section>
        </aside>
      </div>

      {/* ── Publish bar ─────────────────────────────────────────────────── */}
      <div className={`sticky bottom-0 z-20 -mx-4 mt-5 border-t border-dash-line bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:mx-0 lg:rounded-2xl lg:border lg:px-5 ${shake ? 'animate-[lf-shake_0.45s_ease]' : ''}`}>
        <style>{'@keyframes lf-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}'}</style>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-100 sm:w-32">
                <span className="block h-full rounded-full bg-forest-600 transition-all duration-500" style={{ width: `${(doneCount / essentials.length) * 100}%` }} />
              </span>
              <span className="text-[11px] font-semibold tabular-nums text-slate-500">{Math.round((doneCount / essentials.length) * 100)}% ready</span>
            </div>
            <p className="mt-1 hidden items-center gap-1.5 text-xs text-dash-muted sm:flex">
              <Pencil size={12} />
              {saving
                ? (imageTotal ? 'Please hold on, uploading your photos...' : 'Please hold on, saving...')
                : `You can edit this ${noun} anytime after publishing.`}
            </p>
          </div>
          <div className="flex gap-2.5">
            {!isEditing ? (
              <button type="button" onClick={doSaveDraft} disabled={saving} className="flex-1 rounded-xl border border-dash-line bg-white px-5 py-2.5 text-sm font-semibold text-dash-ink transition hover:border-forest-200 hover:bg-forest-50 disabled:opacity-50 sm:flex-none">
                Save draft
              </button>
            ) : (
              <button type="button" onClick={onCancel} disabled={saving} className="flex-1 rounded-xl border border-dash-line bg-white px-5 py-2.5 text-sm font-semibold text-dash-ink transition hover:bg-gray-50 disabled:opacity-50 sm:flex-none">
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={() => publish(false)}
              disabled={saving}
              className="inline-flex flex-[2] items-center justify-center gap-2 rounded-xl bg-forest px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-forest/20 transition hover:bg-forest-700 disabled:opacity-70 sm:flex-none sm:min-w-[190px]"
            >
              {saving
                ? <><Loader2 size={16} className="animate-spin" /> {isEditing ? 'Saving...' : 'Publishing...'}</>
                : <>{isEditing ? 'Save changes' : `Publish ${noun}`} <ArrowRight size={16} /></>}
            </button>
          </div>
        </div>
        {saving && <p className="mt-2 text-center text-xs text-dash-muted sm:hidden">{imageTotal ? 'Please hold on, uploading your photos...' : 'Please hold on, saving...'}</p>}
      </div>

      {/* Toast */}
      {notice && (
        <div role="status" className="fixed bottom-24 left-1/2 z-[70] w-[min(92vw,420px)] -translate-x-1/2 rounded-2xl bg-dash-ink px-4 py-3 text-center text-sm text-white shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          {notice}
        </div>
      )}

      {/* Publish without a photo? */}
      {photoNudge && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="lf-photo-title">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setPhotoNudge(false)} />
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50"><ImageIcon size={26} className="text-amber-500" /></span>
            <h3 id="lf-photo-title" className="mt-4 text-lg font-bold text-dash-ink">Publish without a photo?</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-dash-muted">
              Customers scroll past listings with no picture. Even a clear phone photo makes a big difference.
            </p>
            <div className="mt-5 grid gap-2">
              <button type="button" onClick={() => { setPhotoNudge(false); fileRef.current ? fileRef.current.click() : goTo('lf-photos') }} className="rounded-2xl bg-forest px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-forest-700">
                Add a photo
              </button>
              <button type="button" onClick={() => publish(true)} className="rounded-2xl border border-dash-line px-4 py-2.5 text-sm font-semibold text-dash-ink transition hover:bg-gray-50">
                Publish anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leaving with unsaved work */}
      {leaveAsk && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="lf-leave-title">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setLeaveAsk(false)} />
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 id="lf-leave-title" className="text-lg font-bold text-dash-ink">Leave this {noun}?</h3>
            <p className="mt-1.5 text-sm text-dash-muted">You have typed some details. Save them as a draft so you can finish later?</p>
            <div className="mt-5 grid gap-2">
              <button type="button" onClick={() => { doSaveDraft(); setLeaveAsk(false); onCancel?.() }} className="rounded-2xl bg-forest px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-forest-700">
                Save draft and leave
              </button>
              <button type="button" onClick={() => { setLeaveAsk(false); onCancel?.() }} className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-dash-line px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50">
                <Trash2 size={14} /> Discard
              </button>
              <button type="button" onClick={() => setLeaveAsk(false)} className="px-4 py-2 text-sm font-semibold text-dash-muted hover:text-dash-ink">Keep editing</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
