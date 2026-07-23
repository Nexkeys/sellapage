import { useState, useEffect } from 'react'
import {
  Truck,
  Save,
  Check,
  AlertCircle,
  Globe,
  Lock,
  RefreshCw,
  ExternalLink,
  Download,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  Package,
  X,
} from 'lucide-react'
import { NIGERIAN_STATES } from '../../utils/nigeriaLocations'
import { updateStore } from '../../firebase/auth'

const DELIVERY_ZONES_PER_PAGE = 5
const SHIPMENTS_PER_PAGE = 5

const SHIPMENT_STAGES = ['Booked', 'Picked Up', 'In Transit', 'Delivered']

// Keyword-bucket classifier, not an exhaustive enum table — Topship's /track-shipment
// `status` field is documented only as a free-text string (unlike the enumerated
// `shipmentStatus` field from a different endpoint), and Sendbox has its own status
// vocabulary too. Matching on substrings lets one function serve both providers without
// guessing at every possible value either one might return.
function classifyShipmentStage(rawStatus) {
  const s = (rawStatus || '').toLowerCase()
  if (/cancel|fail/.test(s)) return 'failed'
  if (/deliver/.test(s)) return 3
  if (/transit|hub|processing|nigeria/.test(s)) return 2
  if (/pickup|pick-up|pick up|assigned|rider/.test(s)) return 1
  return 0
}

function ShipmentStatusBar({ rawStatus }) {
  const stage = classifyShipmentStage(rawStatus)

  if (stage === 'failed') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2">
        <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
        <span className="text-[11px] font-bold text-red-600">{rawStatus || 'Cancelled / Failed'}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center">
      {SHIPMENT_STAGES.map((label, idx) => {
        const reached = idx <= stage
        const isLast = idx === SHIPMENT_STAGES.length - 1
        return (
          <div key={label} className={`flex items-center ${isLast ? '' : 'flex-1'}`}>
            <div className="flex flex-col items-center gap-1">
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-white ${
                  reached ? 'bg-green-500' : 'bg-gray-200'
                }`}
              >
                {reached && <Check size={9} className="text-white" strokeWidth={3} />}
              </span>
              <span className={`text-[9px] font-bold whitespace-nowrap ${reached ? 'text-gray-700' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
            {!isLast && (
              <div className={`h-0.5 flex-1 mx-1 mb-3.5 rounded-full ${idx < stage ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function DeliveryTab({
  store,
  user,
  onSave,
  saveLoading,
  saveError,
  saveSuccess,
  isPro,
  onDeliveryZonesUpdate,
  orders,
}) {
  const [formData, setFormData] = useState({
    streetAddress: '',
    city: '',
    state: '',
  })

  const [zones, setZones] = useState(store?.deliveryZones ?? [])
  const [zoneForm, setZoneForm] = useState({ name: '', state: '', lga: '', price: '' })
  const [zonesSaving, setZonesSaving] = useState(false)
  const [zonesError, setZonesError] = useState('')
  const [zonesPage, setZonesPage] = useState(1)
  const [shipmentsPage, setShipmentsPage] = useState(1)

  const [trackingData, setTrackingData] = useState({})
  const [trackingLoading, setTrackingLoading] = useState({})
  const [trackingError, setTrackingError] = useState({})

  useEffect(() => {
    if (store?.pickupAddress) {
      setFormData({
        streetAddress: store.pickupAddress.streetAddress || '',
        city: store.pickupAddress.city || '',
        state: store.pickupAddress.state || '',
      })
    }
  }, [store])

  useEffect(() => {
    setZones(store?.deliveryZones ?? [])
  }, [store])

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleZoneChange = (e) => {
    const { name, value } = e.target
    setZoneForm((prev) => ({ ...prev, [name]: value }))
  }

  const addZone = async () => {
    setZonesError('')
    if (!zoneForm.name.trim() || !zoneForm.state || !zoneForm.price) {
      setZonesError('Please provide name, state and price for the zone.')
      return
    }
    const newZone = {
      id: crypto.randomUUID(),
      name: zoneForm.name.trim(),
      state: zoneForm.state,
      lga: zoneForm.lga?.trim() || '',
      price: Number(zoneForm.price),
    }
    const updated = [newZone, ...(zones || [])]
    setZonesSaving(true)
    try {
      await updateStore(store.id, { deliveryZones: updated })
      setZones(updated)
      setZonesPage(1)
      setZoneForm({ name: '', state: '', lga: '', price: '' })
      if (onDeliveryZonesUpdate) onDeliveryZonesUpdate(updated)
    } catch (err) {
      console.error('Failed to save delivery zones', err)
      setZonesError('Failed to save delivery zone. Please try again.')
    } finally {
      setZonesSaving(false)
    }
  }

  const deleteZone = async (id) => {
    if (!window.confirm('Delete this delivery zone?')) return
    const updated = (zones || []).filter((z) => z.id !== id)
    setZonesSaving(true)
    try {
      await updateStore(store.id, { deliveryZones: updated })
      setZones(updated)
      setZonesPage((page) => Math.min(page, Math.max(1, Math.ceil(updated.length / DELIVERY_ZONES_PER_PAGE))))
      if (onDeliveryZonesUpdate) onDeliveryZonesUpdate(updated)
    } catch (err) {
      console.error('Failed to delete delivery zone', err)
      setZonesError('Failed to delete delivery zone. Please try again.')
    } finally {
      setZonesSaving(false)
    }
  }

  const refreshTracking = async (order) => {
    const isTopship = !!order.topshipTrackingId && !(order.sendboxTrackingId || order.SendboxTrackingId || order.sendboxOrderCode)
    const trackingCode = isTopship
      ? order.topshipTrackingId
      : (order.sendboxTrackingId || order.sendboxOrderCode || order.SendboxTrackingId)
    if (!trackingCode) return
    setTrackingLoading((prev) => ({ ...prev, [order.id]: true }))
    setTrackingError((prev) => ({ ...prev, [order.id]: '' }))
    try {
      const token = await user?.getIdToken()
      const res = await fetch(isTopship ? '/api/topship-tracking' : '/api/sendbox-tracking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          storeId: store.id,
          trackingCode,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setTrackingData((prev) => ({ ...prev, [order.id]: data }))
      } else {
        setTrackingError((prev) => ({
          ...prev,
          [order.id]: data.error || 'Failed to fetch tracking status.',
        }))
      }
    } catch {
      setTrackingError((prev) => ({
        ...prev,
        [order.id]: 'Could not connect. Check your internet connection.',
      }))
    } finally {
      setTrackingLoading((prev) => ({ ...prev, [order.id]: false }))
    }
  }

  const hasPickupAddress =
    store?.pickupAddress?.streetAddress && store?.pickupAddress?.state

  const activeShipments = (orders || []).filter((o) => o.sendboxTrackingId || o.sendboxOrderCode || o.SendboxTrackingId || o.SendboxOrderId || o.topshipTrackingId)
  const zonesTotalPages = Math.max(1, Math.ceil((zones || []).length / DELIVERY_ZONES_PER_PAGE))
  const safeZonesPage = Math.min(zonesPage, zonesTotalPages)
  const paginatedZones = (zones || []).slice(
    (safeZonesPage - 1) * DELIVERY_ZONES_PER_PAGE,
    safeZonesPage * DELIVERY_ZONES_PER_PAGE
  )
  const shipmentsTotalPages = Math.max(1, Math.ceil(activeShipments.length / SHIPMENTS_PER_PAGE))
  const safeShipmentsPage = Math.min(shipmentsPage, shipmentsTotalPages)
  const paginatedShipments = activeShipments.slice(
    (safeShipmentsPage - 1) * SHIPMENTS_PER_PAGE,
    safeShipmentsPage * SHIPMENTS_PER_PAGE
  )

  const INPUT_CLASS =
    'w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all'

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-5">

      {/* Header */}
      <div>
        <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-green-600">
          Logistics
        </p>
        <h1 className="text-xl font-bold tracking-tight text-gray-900">Delivery</h1>
        <p className="mt-0.5 text-xs text-gray-400">
          Manage your pickup address, delivery zones, and Sellapage courier settings.
        </p>
      </div>

      {/* Missing pickup address warning */}
      {!hasPickupAddress && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5">
          <AlertCircle size={15} className="mt-0.5 flex-shrink-0 text-amber-600" />
          <div>
            <p className="text-xs font-bold text-amber-800">Pickup address not set</p>
            <p className="mt-0.5 text-xs text-amber-700 leading-relaxed">
              You need to save a pickup address before you can use Sendbox courier delivery or book shipments from the Orders tab.
            </p>
          </div>
        </div>
      )}

      {/* Pickup Address */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <MapPin size={16} className="text-green-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-sm">Pickup Address</h2>
            <p className="text-gray-400 text-[11px] mt-0.5">
              Where your orders will be shipped from via Sendbox/TopShip.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-bold text-gray-700 mb-1.5 block">Street Address *</label>
            <input
              type="text"
              name="streetAddress"
              value={formData.streetAddress}
              onChange={handleChange}
              placeholder="e.g. 123 Main Street, Olodi Apapa"
              className={INPUT_CLASS}
              required
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-bold text-gray-700 mb-1.5 block">City</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="e.g. Lagos"
                className={INPUT_CLASS}
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 mb-1.5 block">State *</label>
              <div className="relative">
                <select
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className={`${INPUT_CLASS} appearance-none pr-9`}
                  required
                >
                  <option value="">Select a state</option>
                  {NIGERIAN_STATES.map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
          </div>

          {saveError && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2.5 rounded-xl text-xs font-semibold border border-red-100">
              <AlertCircle size={13} />
              {saveError}
            </div>
          )}
          {saveSuccess && (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-2.5 rounded-xl text-xs font-semibold border border-green-100">
              <Check size={13} />
              Address saved successfully!
            </div>
          )}

          <button
            type="submit"
            disabled={saveLoading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-xs font-bold transition-all disabled:opacity-50"
          >
            {saveLoading ? (
              <><Loader2 size={13} className="animate-spin" /> Saving...</>
            ) : (
              <><Save size={13} /> Save Address</>
            )}
          </button>
        </form>
      </div>

      {/* Delivery Zones */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 relative overflow-hidden">
        <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Globe size={16} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-sm">Delivery Zones</h2>
              <p className="text-gray-400 text-[11px] mt-0.5">
                Add fixed-price zones for your own local deliveries.
              </p>
            </div>
          </div>
          {zones.length > 0 && (
            <span className="w-fit rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[11px] font-bold text-indigo-700">
              {zones.length} zone{zones.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {!isPro && (
          <div className="absolute inset-0 bg-white/85 backdrop-blur-[2px] flex items-center justify-center rounded-2xl z-10">
            <div className="text-center px-6">
              <div className="mx-auto w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
                <Lock size={18} className="text-gray-500" />
              </div>
              <p className="text-sm font-bold text-gray-800 mb-1">Pro & Premium Feature</p>
              <p className="text-xs text-gray-500">Upgrade to Pro to manage delivery zones.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-3">
          <div>
            <label className="text-xs font-bold text-gray-700 mb-1.5 block">Zone Name *</label>
            <input
              name="name"
              value={zoneForm.name}
              onChange={handleZoneChange}
              className={INPUT_CLASS}
              placeholder="e.g. Lagos Island"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-700 mb-1.5 block">State *</label>
            <div className="relative">
              <select
                name="state"
                value={zoneForm.state}
                onChange={handleZoneChange}
                className={`${INPUT_CLASS} appearance-none pr-9`}
              >
                <option value="">Select a state</option>
                {NIGERIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-700 mb-1.5 block">LGA <span className="font-normal text-gray-400">(optional)</span></label>
            <input
              name="lga"
              value={zoneForm.lga}
              onChange={handleZoneChange}
              className={INPUT_CLASS}
              placeholder="e.g. Eti-Osa"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end mb-4">
          <div className="flex-1">
            <label className="text-xs font-bold text-gray-700 mb-1.5 block">Price (NGN) *</label>
            <input
              name="price"
              value={zoneForm.price}
              onChange={handleZoneChange}
              className={INPUT_CLASS}
              placeholder="e.g. 500"
              type="number"
              min="0"
            />
          </div>
          <button
            disabled={!isPro || zonesSaving}
            onClick={addZone}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all disabled:opacity-50 flex-shrink-0"
          >
            {zonesSaving ? <Loader2 size={13} className="animate-spin" /> : null}
            Add Zone
          </button>
        </div>

        {zonesError && (
          <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2 mb-3">
            {zonesError}
          </p>
        )}

        {zones.length > 0 && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-2">
            {paginatedZones.map((z) => (
              <div
                key={z.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-gray-100 p-3 bg-gray-50/50"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-xs">{z.name}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {z.state}{z.lga ? ` - ${z.lga}` : ''}
                  </p>
                  <p className="text-xs font-bold text-indigo-600 mt-1">NGN {Number(z.price).toLocaleString()}</p>
                </div>
                <button
                  onClick={() => deleteZone(z.id)}
                  disabled={!isPro || zonesSaving}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                  aria-label="Delete zone"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
            {zones.length > DELIVERY_ZONES_PER_PAGE && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white px-3 py-2">
                <button
                  type="button"
                  onClick={() => setZonesPage(page => Math.max(1, page - 1))}
                  disabled={safeZonesPage === 1}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-bold text-gray-600 transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={12} />
                  Previous
                </button>
                <span className="text-[11px] font-bold text-gray-500">
                  {safeZonesPage} / {zonesTotalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setZonesPage(page => Math.min(zonesTotalPages, page + 1))}
                  disabled={safeZonesPage === zonesTotalPages}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-bold text-gray-600 transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight size={12} />
                </button>
              </div>
            )}
          </div>
        )}

        {zones.length === 0 && isPro && (
          <div className="text-center py-8 text-gray-400 text-xs">
            No delivery zones yet. Add your first zone above.
          </div>
        )}
      </div>

      {/* Active Shipments */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Package size={16} className="text-amber-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-sm">Active Shipments</h2>
              <p className="text-gray-400 text-[11px] mt-0.5">
                Track orders shipped via Sendbox/TopShip. Click Refresh to get live status.
              </p>
            </div>
          </div>
          {activeShipments.length > 0 && (
            <span className="w-fit rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-700">
              {activeShipments.length} active
            </span>
          )}
        </div>

        {activeShipments.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Truck size={28} className="mx-auto mb-3 text-gray-200" strokeWidth={1.5} />
            <p className="text-xs">No shipments booked yet. Book a shipment from the Orders tab.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {paginatedShipments.map((order) => {
              const tracking = trackingData[order.id]
              const isLoading = trackingLoading[order.id]
              const error = trackingError[order.id]
              const isTopship = !!order.topshipTrackingId && !(order.sendboxTrackingId || order.SendboxTrackingId || order.sendboxOrderCode)
              return (
                <div
                  key={order.id}
                  className="rounded-xl border border-gray-100 bg-gray-50/40 p-4"
                >
                  <div className="flex flex-col gap-3 mb-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-gray-900 text-sm truncate">
                          {order.customerName || 'Customer'}
                        </p>
                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full border flex-shrink-0 ${isTopship ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                          {isTopship ? 'Topship' : 'Sendbox'}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                        {order.items || 'Order'}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Tracking: {isTopship ? order.topshipTrackingId : (order.sendboxTrackingId || order.SendboxTrackingId || order.sendboxOrderCode)}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5 flex-shrink-0 min-[360px]:grid-cols-3 sm:flex sm:flex-col">
                      <button
                        type="button"
                        onClick={() => refreshTracking(order)}
                        disabled={isLoading}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-bold text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50"
                      >
                        {isLoading ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : (
                          <RefreshCw size={11} />
                        )}
                        Refresh
                      </button>
                      {isTopship && /^https?:\/\//i.test(order.topshipTrackingUrl || '') && (
                        <a
                          href={order.topshipTrackingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-bold text-blue-600 hover:bg-blue-50 transition-all"
                        >
                          <ExternalLink size={11} />
                          Track
                        </a>
                      )}
                      {!isTopship && (order.sendboxTrackingUrl || order.SendboxTrackingUrl) && (
                        <a
                          href={order.sendboxTrackingUrl || order.SendboxTrackingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-bold text-indigo-600 hover:bg-indigo-50 transition-all"
                        >
                          <ExternalLink size={11} />
                          Track
                        </a>
                      )}
                      {!isTopship && (order.sendboxWaybillUrl || order.SendboxWaybillUrl) && (
                        <a
                          href={order.sendboxWaybillUrl || order.SendboxWaybillUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-bold text-green-600 hover:bg-green-50 transition-all"
                        >
                          <Download size={11} />
                          Waybill
                        </a>
                      )}
                    </div>
                  </div>

                  {error && (
                    <p className="text-[11px] text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-2">
                      {error}
                    </p>
                  )}

                  {tracking && (
                    <div className="space-y-3">
                      <ShipmentStatusBar rawStatus={tracking.status} />
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-100">
                          {tracking.status}
                        </span>
                        {tracking.courierName && (
                          <span className="text-[11px] text-gray-500">via {tracking.courierName}</span>
                        )}
                        {tracking.estimatedDelivery && (
                          <span className="text-[11px] text-gray-400">- ETA: {tracking.estimatedDelivery}</span>
                        )}
                      </div>
                      {Array.isArray(tracking.timeline) && tracking.timeline.length > 0 && (
                        <div className="mt-2 space-y-1.5 border-l-2 border-green-100 pl-3">
                          {tracking.timeline.slice(0, 4).map((event, idx) => (
                            <div key={idx}>
                              <p className="text-[11px] font-semibold text-gray-700">{event.status || event.description}</p>
                              <p className="text-[10px] text-gray-400">{event.time || event.timestamp || ''}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {!tracking && !error && (
                    <div className="space-y-3">
                      <ShipmentStatusBar rawStatus={isTopship ? (order.topshipStatus || 'Confirmed') : (order.SendboxStatus || 'created')} />
                      <p className="text-[11px] text-gray-400">
                        Status: {isTopship ? (order.topshipStatus || 'Confirmed') : (order.SendboxStatus || 'created')} - Click Refresh for live update
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
            {activeShipments.length > SHIPMENTS_PER_PAGE && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white px-3 py-2">
                <button
                  type="button"
                  onClick={() => setShipmentsPage(page => Math.max(1, page - 1))}
                  disabled={safeShipmentsPage === 1}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-bold text-gray-600 transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={12} />
                  Previous
                </button>
                <span className="text-[11px] font-bold text-gray-500">
                  {safeShipmentsPage} / {shipmentsTotalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setShipmentsPage(page => Math.min(shipmentsTotalPages, page + 1))}
                  disabled={safeShipmentsPage === shipmentsTotalPages}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-bold text-gray-600 transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight size={12} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
