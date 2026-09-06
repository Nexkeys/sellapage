// src/components/dashboard/ShipmentDetail.jsx
//
// The full tracking view for ONE shipment. An order is booked with exactly one
// courier, so this renders whatever that courier returns rather than trying to
// reconcile two different shapes into one.
//
// NO MAP, ON PURPOSE
// Neither carrier reports where the parcel actually is. Sendbox's lat/lng appear
// only inside the origin and destination address objects supplied at booking
// time, and Topship returns `itemLocation` and `transshipmentPoint` as plain
// strings like "Lagos hub". A moving dot on a map would therefore be invented,
// so the journey is shown as the real text the carrier sends.
//
// The two carriers genuinely differ and the UI says so rather than padding:
// Sendbox returns a real multi-event history, Topship returns only the current
// status and a message.
import {
  ArrowLeft, RefreshCw, Loader2, Package, MapPin, Truck, Clock, ExternalLink,
  FileText, AlertCircle, CheckCircle2, Circle,
} from 'lucide-react'

/** Carrier event shapes differ, so read the common key names defensively. */
function normaliseEvent(e) {
  if (!e || typeof e !== 'object') return null
  const label = e.status || e.name || e.code || e.title || ''
  const description = e.description || e.message || e.note || e.detail || ''
  const time = e.time || e.date || e.timestamp || e.created_at || e.datetime || ''
  if (!label && !description) return null
  return { label, description, time }
}

function formatWhen(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString('en-NG', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

function StatusPill({ status }) {
  const s = String(status || '').toLowerCase()
  const done = /deliver|complet|success/.test(s)
  const bad = /fail|cancel|reject|return/.test(s)
  const tone = done
    ? 'bg-green-50 text-green-700 border-green-200'
    : bad
      ? 'bg-red-50 text-red-700 border-red-200'
      : 'bg-amber-50 text-amber-700 border-amber-200'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${tone}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${done ? 'bg-green-500' : bad ? 'bg-red-500' : 'bg-amber-500'}`} />
      {status || 'Awaiting update'}
    </span>
  )
}

/** One labelled fact. Values wrap rather than overflow on a narrow screen. */
function Fact({ label, value, mono }) {
  if (!value && value !== 0) return null
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
      <p className={`mt-0.5 break-words text-xs text-gray-700 ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  )
}

export default function ShipmentDetail({ order, tracking, loading, error, onRefresh, onBack }) {
  const isTopship =
    !!order.topshipTrackingId &&
    !(order.sendboxTrackingId || order.SendboxTrackingId || order.sendboxOrderCode)

  const carrier = isTopship ? 'Topship' : 'Sendbox'
  const trackingCode = isTopship
    ? order.topshipTrackingId
    : order.sendboxTrackingId || order.SendboxTrackingId || order.sendboxOrderCode

  const pickup = isTopship
    ? order.topshipSenderAddress
    : order.sendboxSenderAddress || order.senderAddress
  const dropoff = isTopship
    ? order.topshipReceiverAddress
    : order.sendboxReceiverAddress || order.receiverAddress

  const pickupText = [pickup?.address, pickup?.city, pickup?.state].filter(Boolean).join(', ')
  const dropoffText = [dropoff?.address, dropoff?.city, dropoff?.state].filter(Boolean).join(', ')

  const events = Array.isArray(tracking?.timeline)
    ? tracking.timeline.map(normaliseEvent).filter(Boolean)
    : []

  const currentLocation = tracking?.itemLocation || ''
  const status = tracking?.statusName || tracking?.status || order.topshipStatus || ''
  const carrierUrl = isTopship ? order.topshipTrackingUrl : tracking?.trackingUrl

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-50"
      >
        <ArrowLeft size={14} /> Back to Delivery
      </button>

      {/* Header */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-base font-bold text-gray-900">
                {order.customerName || 'Customer'}
              </p>
              <span
                className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${
                  isTopship
                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                    : 'border-green-200 bg-green-50 text-green-700'
                }`}
              >
                {carrier}
              </span>
            </div>
            <p className="mt-1 break-words text-xs text-gray-500">{order.items || 'Order'}</p>
            <p className="mt-1 break-all font-mono text-[11px] text-gray-400">{trackingCode}</p>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => onRefresh(order)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-3 py-2 text-[11px] font-bold text-white transition-colors hover:bg-gray-800 disabled:bg-gray-300"
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              {loading ? 'Checking' : 'Refresh'}
            </button>
          </div>
        </div>

        <div className="mt-3">
          <StatusPill status={status} />
        </div>
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 p-3">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0 text-red-500" />
          <p className="text-xs font-semibold text-red-700">{error}</p>
        </div>
      )}

      {/* Journey. Text, not a map, because that is what the carriers actually
          report. Stacks vertically on a phone. */}
      <div className="mt-3 rounded-2xl border border-gray-100 bg-white p-4">
        <p className="mb-3 text-sm font-bold text-gray-900">Journey</p>
        <ol className="space-y-3">
          {[
            { icon: MapPin, label: 'Picked up from', value: pickupText, tone: 'text-gray-400' },
            currentLocation
              ? { icon: Truck, label: 'Currently at', value: currentLocation, tone: 'text-amber-500' }
              : null,
            tracking?.transshipmentPoint
              ? { icon: Package, label: 'Passing through', value: tracking.transshipmentPoint, tone: 'text-gray-400' }
              : null,
            { icon: MapPin, label: 'Delivering to', value: dropoffText, tone: 'text-green-500' },
          ]
            .filter(Boolean)
            .map((row, i, arr) => {
              const Icon = row.icon
              return (
                <li key={row.label} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <Icon size={15} className={`flex-shrink-0 ${row.tone}`} />
                    {i < arr.length - 1 && <span className="mt-1 h-full w-px flex-1 bg-gray-200" />}
                  </div>
                  <div className="min-w-0 flex-1 pb-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{row.label}</p>
                    <p className="mt-0.5 break-words text-xs text-gray-700">{row.value || 'Not provided'}</p>
                  </div>
                </li>
              )
            })}
        </ol>
      </div>

      {/* Timeline */}
      <div className="mt-3 rounded-2xl border border-gray-100 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-gray-900">Status history</p>
          {events.length > 0 && (
            <span className="text-[10px] text-gray-400">{events.length} update{events.length === 1 ? '' : 's'}</span>
          )}
        </div>

        {loading && events.length === 0 ? (
          <div className="space-y-2.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-gray-100/70" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-xl bg-gray-50 p-4 text-center">
            <Clock size={18} className="mx-auto text-gray-300" />
            <p className="mt-2 text-xs font-bold text-gray-700">No updates yet</p>
            <p className="mt-0.5 text-[11px] text-gray-500">
              Tap Refresh to pull the latest status from {carrier}.
            </p>
          </div>
        ) : (
          <ol className="space-y-3">
            {events.map((e, i) => (
              <li key={`${e.label}-${i}`} className="flex gap-3">
                <div className="flex flex-col items-center">
                  {i === 0 ? (
                    <CheckCircle2 size={15} className="flex-shrink-0 text-green-500" />
                  ) : (
                    <Circle size={15} className="flex-shrink-0 text-gray-300" />
                  )}
                  {i < events.length - 1 && <span className="mt-1 h-full w-px flex-1 bg-gray-200" />}
                </div>
                <div className="min-w-0 flex-1 pb-1">
                  <p className="break-words text-xs font-bold text-gray-900">{e.label || 'Update'}</p>
                  {e.description && (
                    <p className="mt-0.5 break-words text-[11px] leading-relaxed text-gray-500">{e.description}</p>
                  )}
                  {e.time && <p className="mt-0.5 text-[10px] text-gray-400">{formatWhen(e.time)}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}

        {/* Said plainly instead of padding Topship out to look like Sendbox. */}
        {isTopship && events.length > 0 && (
          <p className="mt-3 border-t border-gray-100 pt-2.5 text-[10px] leading-relaxed text-gray-400">
            Topship reports the current status only, not a full history. Refresh to see it change as
            the parcel moves.
          </p>
        )}
      </div>

      {/* Everything else the carrier sent */}
      <div className="mt-3 rounded-2xl border border-gray-100 bg-white p-4">
        <p className="mb-3 text-sm font-bold text-gray-900">Shipment details</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Fact label="Carrier" value={carrier} />
          <Fact label="Tracking ID" value={trackingCode} mono />
          <Fact label="Courier" value={tracking?.courierName} />
          <Fact label="Status message" value={tracking?.message} />
          <Fact label="Estimated delivery" value={formatWhen(tracking?.estimatedDelivery)} />
          <Fact label="Delivered on" value={formatWhen(tracking?.deliveryDate)} />
          <Fact label="Weight" value={tracking?.weight ? `${tracking.weight} kg` : ''} />
          <Fact label="Last checked" value={formatWhen(tracking?.updatedAt || tracking?.lastUpdated)} />
          <Fact label="Recipient phone" value={dropoff?.phone || tracking?.receiver?.phone} />
          <Fact label="Order total" value={order.total ? `₦${Number(order.total).toLocaleString('en-NG')}` : ''} />
        </div>

        {Array.isArray(tracking?.items) && tracking.items.length > 0 && (
          <div className="mt-3 border-t border-gray-100 pt-3">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">Items</p>
            <ul className="space-y-1">
              {tracking.items.map((it, i) => (
                <li key={i} className="break-words text-xs text-gray-600">
                  {it.description || it.category}
                  {it.quantity ? ` x${it.quantity}` : ''}
                  {it.weight ? ` (${it.weight}kg)` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}

        {(carrierUrl || tracking?.waybillUrl) && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
            {/^https?:\/\//i.test(carrierUrl || '') && (
              <a
                href={carrierUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-[11px] font-bold text-blue-600 hover:bg-blue-50"
              >
                <ExternalLink size={12} /> Track on {carrier}
              </a>
            )}
            {/^https?:\/\//i.test(tracking?.waybillUrl || '') && (
              <a
                href={tracking.waybillUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-[11px] font-bold text-gray-600 hover:bg-gray-50"
              >
                <FileText size={12} /> Waybill
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
