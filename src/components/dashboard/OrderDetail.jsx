// src/components/dashboard/OrderDetail.jsx
//
// The full record of one order or one booking: what was bought, what it cost,
// who bought it, where it goes, and everything that has happened to it since.
//
// Built because the orders table could only ever show a one line summary
// ("Pencil x2"), while the itemised breakdown was sitting unused on the
// document in `cartItems`. This reads that, and falls back to the old summary
// string for orders placed before it existed.
//
// READ ONLY BY DESIGN. Status changes, shipment booking and receipts stay in
// OrdersTab where they already work. This screen shows; it does not mutate.
//
// MONEY IS IN NAIRA. `total`, `price` and the fee fields are stored in naira and
// rendered raw, exactly as the orders table does. Dividing by 100 here would
// under-report every order by a factor of a hundred.
import {
  ArrowLeft, Package, User, Phone, Mail, MapPin, CreditCard, Truck,
  Clock, FileText, ExternalLink, CalendarClock, Copy, Check,
} from 'lucide-react'
import { useState } from 'react'

const naira = (v) => {
  const n = Number(v)
  if (v == null || v === '' || Number.isNaN(n)) return '-'
  return `₦${n.toLocaleString('en-NG')}`
}

const when = (v) => {
  if (!v) return null
  const d = v?.toDate ? v.toDate() : new Date(v)
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })
}

const STATUS_TONE = {
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  confirmed: 'bg-blue-50 text-blue-700 ring-blue-200',
  dispatched: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  delivered: 'bg-green-50 text-green-700 ring-green-200',
  completed: 'bg-green-50 text-green-700 ring-green-200',
  cancelled: 'bg-red-50 text-red-700 ring-red-200',
}

function Badge({ status }) {
  const key = String(status || 'pending').toLowerCase()
  return (
    <span className={`inline-flex flex-shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ring-1 ${STATUS_TONE[key] || 'bg-gray-100 text-gray-600 ring-gray-200'}`}>
      {key}
    </span>
  )
}

function Card({ icon: Icon, title, children, aside }) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex min-w-0 items-center gap-2 text-[11px] font-black uppercase tracking-widest text-gray-400">
          <Icon size={13} className="flex-shrink-0" />
          <span className="truncate">{title}</span>
        </h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

/** A labelled value that becomes a real link when there is something to open. */
function Row({ label, value, href, mono }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="flex-shrink-0 text-[11px] font-semibold text-gray-500">{label}</span>
      {href ? (
        <a
          href={href}
          target={href.startsWith('http') ? '_blank' : undefined}
          rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
          className={`min-w-0 break-words text-right text-xs font-bold text-green-700 hover:underline ${mono ? 'font-mono' : ''}`}
        >
          {value}
        </a>
      ) : (
        <span className={`min-w-0 break-words text-right text-xs font-semibold text-gray-800 ${mono ? 'font-mono' : ''}`}>
          {value}
        </span>
      )}
    </div>
  )
}

function CopyButton({ text }) {
  const [done, setDone] = useState(false)
  if (!text) return null
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(String(text))
          setDone(true)
          setTimeout(() => setDone(false), 1600)
        } catch {
          // Clipboard blocked (insecure context or denied permission). The id is
          // on screen and selectable, so there is nothing to recover from.
        }
      }}
      className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-[10px] font-bold text-gray-600 transition-colors hover:bg-gray-200"
    >
      {done ? <><Check size={10} className="text-green-600" /> Copied</> : <><Copy size={10} /> Copy</>}
    </button>
  )
}

export default function OrderDetail({ record, kind = 'order', store, onBack }) {
  if (!record) return null

  const isBooking = kind === 'booking'
  const addr = record.deliveryAddress
  const addrText =
    typeof addr === 'string'
      ? addr
      : addr
      ? [addr.street || addr.streetAddress, addr.address, addr.lga, addr.city, addr.state]
          .filter(Boolean)
          .join(', ')
      : ''

  // cartItems is the itemised truth written at checkout from server side
  // prices. `items` is the older one line summary, kept as a fallback so orders
  // placed before cartItems existed still show something useful.
  const lines = Array.isArray(record.cartItems) ? record.cartItems : []
  const summary = typeof record.items === 'string' ? record.items : ''

  const lineTotal = (it) => Number(it.price || 0) * Number(it.quantity || 1)
  const itemsSubtotal = lines.reduce((sum, it) => sum + lineTotal(it), 0)

  const phone = String(record.customerPhone || '').replace(/\s/g, '')
  const tracking =
    record.courierTrackingUrl ||
    record.sendboxWaybillUrl ||
    record.SendboxWaybillUrl ||
    record.topshipTrackingUrl ||
    ''
  const trackingCode =
    record.courierTrackingCode ||
    record.sendboxTrackingId ||
    record.SendboxTrackingId ||
    record.topshipTrackingId ||
    ''

  const log = Array.isArray(record.statusLog) ? [...record.statusLog].reverse() : []

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 transition-colors hover:text-gray-900"
      >
        <ArrowLeft size={14} /> Back to {isBooking ? 'bookings' : 'orders'}
      </button>

      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">
            {isBooking ? 'Booking' : 'Order'}
          </p>
          <h1 className="font-display truncate text-lg font-extrabold text-gray-900">
            {isBooking ? record.serviceName || 'Booking' : record.customerName || 'Order'}
          </h1>
          {when(record.createdAt) ? (
            <p className="mt-0.5 text-xs text-gray-500">{when(record.createdAt)}</p>
          ) : null}
        </div>
        <Badge status={record.status} />
      </header>

      <div className="space-y-3">
        {/* What was bought */}
        <Card icon={isBooking ? CalendarClock : Package} title={isBooking ? 'Service booked' : 'Items'}>
          {isBooking ? (
            <div className="divide-y divide-gray-50">
              <Row label="Service" value={record.serviceName} />
              <Row label="Date" value={record.bookingDate} />
              <Row label="Time" value={record.bookingTime} />
              <Row label="Location" value={record.locationPref} />
            </div>
          ) : lines.length ? (
            <ul className="divide-y divide-gray-50">
              {lines.map((it, i) => (
                <li key={it.id || i} className="flex items-start gap-3 py-2.5 first:pt-0">
                  {it.imageUrl || it.image ? (
                    <img
                      src={it.imageUrl || it.image}
                      alt=""
                      className="h-11 w-11 flex-shrink-0 rounded-lg border border-gray-100 object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-300">
                      <Package size={15} />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-gray-900">{it.name || 'Item'}</p>
                    <p className="mt-0.5 text-[11px] text-gray-500">
                      {naira(it.price)} x {Number(it.quantity || 1)}
                    </p>
                    {it.selectedVariations && typeof it.selectedVariations === 'object' ? (
                      <p className="mt-0.5 truncate text-[10px] text-gray-400">
                        {Object.entries(it.selectedVariations)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(' · ')}
                      </p>
                    ) : null}
                  </div>
                  <span className="flex-shrink-0 text-xs font-black text-gray-900">
                    {naira(lineTotal(it))}
                  </span>
                </li>
              ))}
            </ul>
          ) : summary ? (
            // Older order: only the summary string was stored.
            <div>
              <p className="whitespace-pre-line text-xs leading-relaxed text-gray-700">{summary}</p>
              <p className="mt-2 text-[10px] text-gray-400">
                This order was placed before itemised records were kept, so only the summary is available.
              </p>
            </div>
          ) : (
            <p className="py-2 text-xs text-gray-400">No item details were recorded for this order.</p>
          )}
        </Card>

        {/* Money */}
        <Card icon={CreditCard} title="Payment">
          <div className="divide-y divide-gray-50">
            {!isBooking && itemsSubtotal > 0 ? <Row label="Items subtotal" value={naira(itemsSubtotal)} /> : null}
            {isBooking ? <Row label="Service price" value={naira(record.servicePrice)} /> : null}
            {Number(record.deliveryFee) > 0 ? <Row label="Delivery fee" value={naira(record.deliveryFee)} /> : null}
            {Number(record.processingFee) > 0 ? <Row label="Processing fee" value={naira(record.processingFee)} /> : null}
            {Number(record.discountAmount) > 0 ? <Row label="Discount" value={`- ${naira(record.discountAmount)}`} /> : null}
            <div className="flex items-center justify-between gap-3 pt-2.5">
              <span className="text-xs font-black uppercase tracking-wide text-gray-700">Total paid</span>
              <span className="text-base font-black text-green-600">
                {naira(record.grandTotal ?? record.total)}
              </span>
            </div>
          </div>
          <div className="mt-3 divide-y divide-gray-50 border-t border-gray-100 pt-2">
            <Row label="Method" value={record.paymentMethod} />
            <Row label="Status" value={record.paymentStatus} />
            <Row label="Reference" value={record.paystackReference} mono />
          </div>
        </Card>

        {/* Who */}
        <Card
          icon={User}
          title="Customer"
          aside={<CopyButton text={record.customerPhone} />}
        >
          <div className="divide-y divide-gray-50">
            <Row label="Name" value={record.customerName} />
            <Row label="Phone" value={record.customerPhone} href={phone ? `tel:${phone}` : undefined} />
            <Row label="Email" value={record.customerEmail} href={record.customerEmail ? `mailto:${record.customerEmail}` : undefined} />
            {record.customerPhone ? (
              <Row
                label="WhatsApp"
                value="Open chat"
                href={`https://wa.me/${phone.replace(/\D/g, '')}`}
              />
            ) : null}
          </div>
        </Card>

        {/* Where */}
        {addrText || record.notes ? (
          <Card icon={MapPin} title="Delivery">
            {addrText ? (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addrText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block break-words text-xs font-semibold leading-relaxed text-gray-800 hover:text-green-700 hover:underline"
              >
                {addrText}
              </a>
            ) : null}
            {record.notes ? (
              <div className="mt-3 rounded-xl bg-amber-50 p-3">
                <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-700">
                  <FileText size={11} /> Customer note
                </p>
                <p className="mt-1 whitespace-pre-line break-words text-xs leading-relaxed text-amber-900">
                  {record.notes}
                </p>
              </div>
            ) : null}
          </Card>
        ) : null}

        {/* Shipment, when one exists */}
        {trackingCode || tracking ? (
          <Card icon={Truck} title="Shipment" aside={<CopyButton text={trackingCode} />}>
            <div className="divide-y divide-gray-50">
              <Row label="Courier" value={record.courierName} />
              <Row label="Tracking code" value={trackingCode} mono />
              {tracking ? <Row label="Waybill" value="Open" href={tracking} /> : null}
            </div>
          </Card>
        ) : null}

        {/* History */}
        {log.length ? (
          <Card icon={Clock} title="History">
            <ol className="space-y-3">
              {log.map((entry, i) => (
                <li key={i} className="flex gap-3">
                  <span className="relative flex flex-col items-center">
                    <span className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${i === 0 ? 'bg-green-500' : 'bg-gray-300'}`} />
                    {i < log.length - 1 ? <span className="mt-1 w-px flex-1 bg-gray-100" /> : null}
                  </span>
                  <div className="min-w-0 flex-1 pb-1">
                    <p className="text-xs font-bold capitalize text-gray-900">
                      {entry.changedByLabel || entry.status || 'Updated'}
                    </p>
                    <p className="mt-0.5 text-[10px] text-gray-400">
                      {when(entry.changedAt) || ''}
                      {entry.changedBy ? ` · ${entry.changedBy}` : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        ) : null}

        <p className="px-1 pb-2 text-center text-[10px] text-gray-400">
          Order ID <span className="font-mono">{record.id}</span>
        </p>
      </div>
    </div>
  )
}
