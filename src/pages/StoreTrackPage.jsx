// src/pages/StoreTrackPage.jsx
//
// Public order tracking, at /<store>/track.
//
// A customer pastes the order id from their receipt and sees where their order
// is, in the vendor's own words, on the vendor's own colours and type.
//
// THE LOGIC IS NOT THE VENDOR'S TO EDIT. The vendor writes the wording for each
// status; which status an order is in comes from the orders dashboard and
// nowhere else. There is no way to make this page say "delivered" for an order
// that is not.
//
// THE LOOKUP IS SERVER SIDE (api/order-track). Orders stay owner-read-only in
// firestore.rules; this page never touches Firestore directly and only ever
// receives the tracking fields that handler chooses to return.
import { useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { Loader2, Search, Package, CheckCircle2, XCircle, AlertCircle, Truck, ExternalLink } from 'lucide-react'
import { getStoreBySlug } from '../firebase/products'
import SEO from '../components/SEO'
import NotFound from './NotFound'
import {
  isTrackingLive, trackingMessage, trackingLabel, trackingStep,
  ORDER_STEPS, BOOKING_STEPS, fontStack, fontHref, radiusValue, widthValue,
} from '../utils/storeDesign'

const naira = (v) => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? `₦${n.toLocaleString('en-NG')}` : null
}

const when = (v) => {
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d.toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function StoreTrackPage() {
  const { storeName } = useParams()
  const [params, setParams] = useSearchParams()

  const [store, setStore] = useState(null)
  const [booting, setBooting] = useState(true)
  const [gone, setGone] = useState(false)

  const [id, setId] = useState(params.get('id') || '')
  const [state, setState] = useState('idle') // idle | loading | found | missing | error
  const [record, setRecord] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await getStoreBySlug(storeName)
        if (cancelled) return
        if (!data || !isTrackingLive(data)) {
          setGone(true)
          return
        }
        setStore(data)
      } catch {
        if (!cancelled) setGone(true)
      } finally {
        if (!cancelled) setBooting(false)
      }
    })()
    return () => { cancelled = true }
  }, [storeName])

  const lookup = useCallback(
    async (value) => {
      const clean = String(value || '').trim()
      if (!clean) return
      setState('loading')
      setRecord(null)
      try {
        const r = await fetch(
          `/api/order-track?slug=${encodeURIComponent(storeName)}&id=${encodeURIComponent(clean)}`,
        )
        const d = await r.json().catch(() => ({}))
        if (r.ok && d.success) {
          setRecord(d.record)
          setState('found')
        } else if (r.status === 404) {
          setState('missing')
        } else {
          setState('error')
        }
      } catch {
        // Network, not a bad id. Saying "not found" here would send someone
        // hunting for a receipt that is perfectly correct.
        setState('error')
      }
    },
    [storeName],
  )

  // A receipt can deep link straight to the answer.
  useEffect(() => {
    const q = params.get('id')
    if (q && store) lookup(q)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store])

  const theme = store?.storeDesign?.theme
  useEffect(() => {
    const href = fontHref(theme)
    if (!href || document.querySelector(`link[href="${href}"]`)) return
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    document.head.appendChild(link)
  }, [theme])

  if (gone) return <NotFound />

  if (booting || !store) {
    return (
      <div className="min-h-screen bg-white px-4 py-10">
        <div className="mx-auto max-w-lg space-y-4">
          <div className="h-8 w-2/3 animate-pulse rounded-xl bg-gray-100" />
          <div className="h-4 w-full animate-pulse rounded-lg bg-gray-100" />
          <div className="h-12 w-full animate-pulse rounded-xl bg-gray-100" />
          <div className="h-40 w-full animate-pulse rounded-2xl bg-gray-100" />
        </div>
      </div>
    )
  }

  const cfg = store.storeDesign?.tracking || {}
  const t = {
    heading: fontStack(theme?.fontHeading),
    body: fontStack(theme?.fontBody),
    text: theme?.textColor || '#0f172a',
    primary: theme?.primary || '#0f172a',
    onPrimary: theme?.onPrimary || '#ffffff',
    accent: theme?.accent || '#0f766e',
    border: theme?.border || '#e2e8f0',
    radius: radiusValue(theme?.radius),
    width: widthValue(theme?.width),
  }
  const name = store.businessName || store.storeName
  const base = `/${store.slug || store.storeName}`

  const submit = (e) => {
    e.preventDefault()
    const clean = id.trim()
    if (!clean) return
    setParams(clean ? { id: clean } : {}, { replace: true })
    lookup(clean)
  }

  const steps = record?.kind === 'booking' ? BOOKING_STEPS : ORDER_STEPS
  const stepIndex = record ? trackingStep(record.status, record.kind) : -1
  const stopped = record && stepIndex === -1

  return (
    <div style={{ background: theme?.pageBg || '#ffffff', color: t.text, fontFamily: t.body }} className="min-h-screen">
      <SEO
        title={`Track your order - ${name}`}
        description={`Check the status of your order from ${name}.`}
        url={`${base}/track`}
        noIndex
      />

      <header className="border-b px-4 py-3" style={{ borderColor: t.border }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <Link to={base} className="min-w-0 truncate text-sm font-extrabold" style={{ fontFamily: t.heading }}>
            {name}
          </Link>
          <Link to={base} className="flex-shrink-0 text-xs font-bold opacity-60 hover:opacity-100">
            Back to shop
          </Link>
        </div>
      </header>

      <main className="px-4 py-10">
        <div className="mx-auto w-full" style={{ maxWidth: '32rem' }}>
          <h1 className="text-2xl font-extrabold sm:text-3xl" style={{ fontFamily: t.heading }}>
            {cfg.title || 'Track your order'}
          </h1>
          {cfg.sub ? <p className="mt-2 text-sm leading-relaxed opacity-70">{cfg.sub}</p> : null}

          <form onSubmit={submit} className="mt-6">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder={cfg.placeholder || 'Paste your order ID'}
                aria-label="Order ID"
                autoComplete="off"
                spellCheck="false"
                style={{ borderColor: t.border, borderRadius: t.radius, color: t.text }}
                className="min-w-0 flex-1 border bg-transparent px-4 py-3 font-mono text-sm outline-none focus:ring-2 focus:ring-black/5"
              />
              <button
                type="submit"
                disabled={state === 'loading' || !id.trim()}
                style={{ background: t.primary, color: t.onPrimary, borderRadius: t.radius }}
                className="flex flex-shrink-0 items-center justify-center gap-2 px-6 py-3 text-sm font-bold transition-opacity disabled:opacity-40"
              >
                {state === 'loading' ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                {state === 'loading' ? 'Checking...' : cfg.buttonLabel || 'Track order'}
              </button>
            </div>
            {cfg.helpText ? <p className="mt-2 text-[11px] opacity-50">{cfg.helpText}</p> : null}
          </form>

          {/* Waiting */}
          {state === 'loading' ? (
            <div className="mt-8 space-y-3" aria-live="polite">
              <div className="h-24 animate-pulse" style={{ background: `${t.text}0d`, borderRadius: t.radius }} />
              <div className="h-16 animate-pulse" style={{ background: `${t.text}0d`, borderRadius: t.radius }} />
            </div>
          ) : null}

          {/* Not found: the vendor's own wording */}
          {state === 'missing' ? (
            <div
              className="mt-8 p-6 text-center"
              style={{ border: `1px dashed ${t.border}`, borderRadius: t.radius }}
              aria-live="polite"
            >
              <AlertCircle size={22} className="mx-auto opacity-40" />
              <p className="mt-3 text-sm font-bold">We could not find that order</p>
              <p className="mt-1 text-xs leading-relaxed opacity-70">
                {cfg.notFound || 'Check the ID and try again, or message us and we will look it up.'}
              </p>
              {store.whatsappNumber ? (
                <a
                  href={`https://wa.me/${String(store.whatsappNumber).replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ background: t.primary, color: t.onPrimary, borderRadius: t.radius }}
                  className="mt-4 inline-flex px-5 py-2.5 text-xs font-bold"
                >
                  Message us
                </a>
              ) : null}
            </div>
          ) : null}

          {/* Something broke on our side, which is not the customer's fault */}
          {state === 'error' ? (
            <div
              className="mt-8 flex items-start gap-3 p-4"
              style={{ border: `1px solid ${t.border}`, borderRadius: t.radius }}
              aria-live="polite"
            >
              <XCircle size={16} className="mt-0.5 flex-shrink-0 opacity-50" />
              <div className="min-w-0">
                <p className="text-sm font-bold">Sorry, we could not check that just now</p>
                <p className="mt-0.5 text-xs leading-relaxed opacity-70">
                  This one is on us, not your order ID. Check your connection and try again in a moment.
                </p>
                <button
                  type="button"
                  onClick={() => lookup(id)}
                  style={{ border: `1.5px solid ${t.primary}`, color: t.primary, borderRadius: t.radius }}
                  className="mt-3 px-4 py-2 text-xs font-bold"
                >
                  Try again
                </button>
              </div>
            </div>
          ) : null}

          {/* Found */}
          {state === 'found' && record ? (
            <div className="mt-8 space-y-4" aria-live="polite">
              <div className="p-5" style={{ border: `1px solid ${t.border}`, borderRadius: t.radius }}>
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
                    style={{ background: `${t.accent}1f`, color: t.accent }}
                  >
                    {stopped ? <XCircle size={18} /> : stepIndex >= steps.length - 1 ? <CheckCircle2 size={18} /> : <Package size={18} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-extrabold leading-tight" style={{ fontFamily: t.heading }}>
                      {trackingLabel(record.status)}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed opacity-75">
                      {trackingMessage(cfg, record.status)}
                    </p>
                    {record.firstName ? (
                      <p className="mt-2 text-[11px] opacity-50">
                        Order for {record.firstName}
                        {when(record.placedAt) ? ` · placed ${when(record.placedAt)}` : ''}
                      </p>
                    ) : null}
                  </div>
                </div>

                {/* Progress. Hidden for cancelled and refunded, where a bar
                    would imply the order is still on its way. */}
                {!stopped ? (
                  <div className="mt-5 flex gap-1.5">
                    {steps.map((sKey, i) => (
                      <div key={sKey} className="min-w-0 flex-1">
                        <div
                          className="h-1.5 rounded-full transition-colors"
                          style={{ background: i <= stepIndex ? t.accent : `${t.text}1a` }}
                        />
                        <p
                          className="mt-1.5 truncate text-[9px] font-bold uppercase tracking-wide"
                          style={{ opacity: i <= stepIndex ? 0.75 : 0.35 }}
                        >
                          {trackingLabel(sKey)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* What it was */}
              {record.kind === 'booking' && record.serviceName ? (
                <div className="p-5" style={{ border: `1px solid ${t.border}`, borderRadius: t.radius }}>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest opacity-50">Your booking</p>
                  <p className="mt-2 text-sm font-bold">{record.serviceName}</p>
                  {record.bookingDate ? (
                    <p className="mt-1 text-xs opacity-70">
                      {record.bookingDate}
                      {record.bookingTime ? ` at ${record.bookingTime}` : ''}
                    </p>
                  ) : null}
                  {naira(record.total) ? (
                    <p className="mt-3 text-sm font-extrabold" style={{ color: t.accent }}>{naira(record.total)}</p>
                  ) : null}
                </div>
              ) : null}

              {record.kind === 'order' && (record.items?.length || record.itemsSummary) ? (
                <div className="p-5" style={{ border: `1px solid ${t.border}`, borderRadius: t.radius }}>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest opacity-50">What you ordered</p>
                  {record.items?.length ? (
                    <ul className="mt-2 space-y-1.5">
                      {record.items.map((it, i) => (
                        <li key={i} className="flex items-start justify-between gap-3 text-xs">
                          <span className="min-w-0 font-semibold">{it.name}</span>
                          <span className="flex-shrink-0 opacity-50">x{it.quantity}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 whitespace-pre-line text-xs leading-relaxed opacity-75">{record.itemsSummary}</p>
                  )}
                  {naira(record.total) ? (
                    <p className="mt-3 border-t pt-3 text-sm font-extrabold" style={{ borderColor: t.border, color: t.accent }}>
                      {naira(record.total)}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {/* Courier, when the vendor has booked one */}
              {record.trackingCode || record.trackingUrl ? (
                <div className="p-5" style={{ border: `1px solid ${t.border}`, borderRadius: t.radius }}>
                  <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest opacity-50">
                    <Truck size={11} /> Courier
                  </p>
                  {record.courier ? <p className="mt-2 text-sm font-bold">{record.courier}</p> : null}
                  {record.trackingCode ? (
                    <p className="mt-1 font-mono text-xs opacity-70">{record.trackingCode}</p>
                  ) : null}
                  {record.trackingUrl ? (
                    <a
                      href={record.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-bold hover:underline"
                      style={{ color: t.accent }}
                    >
                      Track with the courier <ExternalLink size={11} />
                    </a>
                  ) : null}
                </div>
              ) : null}

              {/* History */}
              {record.history?.length > 1 ? (
                <div className="p-5" style={{ border: `1px solid ${t.border}`, borderRadius: t.radius }}>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest opacity-50">History</p>
                  <ol className="mt-3 space-y-2.5">
                    {[...record.history].reverse().map((h, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span
                          className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full"
                          style={{ background: i === 0 ? t.accent : `${t.text}33` }}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold">{trackingLabel(h.status)}</p>
                          {when(h.at) ? <p className="text-[10px] opacity-45">{when(h.at)}</p> : null}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}

              {store.whatsappNumber ? (
                <a
                  href={`https://wa.me/${String(store.whatsappNumber).replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ border: `1.5px solid ${t.primary}`, color: t.primary, borderRadius: t.radius }}
                  className="flex w-full items-center justify-center gap-2 px-5 py-3 text-xs font-bold"
                >
                  Something wrong? Message us
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  )
}
