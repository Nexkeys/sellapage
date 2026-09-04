//src/components/dashboard/OrdersTab.jsx/
import { useState, useMemo, useEffect } from 'react'
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  FileText,
  Info,
  Loader2,
  Lock,
  MessageCircle,
  Package,
  ShoppingBag,
  Trash2,
  User,
  Wallet,
  X,
  Search,
  Filter,
  ArrowDownUp,
  Truck,
  Download
} from 'lucide-react'
import { generateOrderReceipt } from '../../utils/generateReceipt'
import { SkeletonRows } from '../Skeleton'

// The 5 statuses a vendor can manually pick from the dropdown.
const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  { value: 'dispatched', label: 'Dispatched', color: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-500' },
  { value: 'delivered', label: 'Delivered', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
]

// 'in_transit' is courier-driven only (set by the Sendbox webhook) - vendors never pick it manually,
// but it must still render a correct badge/timeline entry instead of being coerced to "Pending".
const COURIER_ONLY_STATUS = { value: 'in_transit', label: 'In Transit', color: 'bg-sky-50 text-sky-700 border-sky-200', dot: 'bg-sky-500' }
const ALL_STATUSES = [...STATUS_OPTIONS, COURIER_ONLY_STATUS]

const PAYMENT_STATUS_OPTIONS = [
  { value: 'unpaid', label: 'Unpaid', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  { value: 'partially_paid', label: 'Partially Paid', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { value: 'paid', label: 'Paid', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
]

const PAYMENT_METHOD_OPTIONS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash_on_delivery', label: 'Cash on Delivery' },
  { value: 'pos', label: 'POS' },
  { value: 'other', label: 'Other' },
]

const ORDERS_PER_PAGE = 10

const INPUT_CLASS =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-all duration-200 placeholder:text-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-500/20'

function getOption(options, value, fallback) {
  return options.find(option => option.value === value) || options.find(option => option.value === fallback)
}

function normalizeStatus(status) {
  return getOption(ALL_STATUSES, status, 'pending').value
}

function getStatusConfig(status) {
  return getOption(ALL_STATUSES, normalizeStatus(status), 'pending')
}

function normalizePaymentStatus(status) {
  return getOption(PAYMENT_STATUS_OPTIONS, status, 'unpaid').value
}

function normalizePaymentMethod(method) {
  return getOption(PAYMENT_METHOD_OPTIONS, method, 'bank_transfer').value
}

function formatOrderDate(value) {
  if (!value) return '-'
  const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })
}

function formatTotal(total) {
  if (total == null || total === '') return '-'
  const amount = Number(total)
  if (Number.isNaN(amount)) return '-'
  return `NGN ${amount.toLocaleString('en-NG')}`
}

function StatusPicker({ status, onChange, disabled = false }) {
  const key = normalizeStatus(status)
  const config = getStatusConfig(status)
  const isCourierOnly = key === 'in_transit'

  return (
    <div className={`relative inline-flex min-w-[8rem] items-center rounded-xl border transition-opacity ${config.color} ${disabled ? 'opacity-60' : ''}`}>
      <select
        value={key}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        aria-label="Fulfillment status"
        className="w-full appearance-none rounded-xl bg-transparent py-1.5 pl-3 pr-8 text-xs font-extrabold uppercase tracking-wide outline-none transition-all cursor-pointer focus:ring-2 focus:ring-green-500/25 disabled:cursor-not-allowed"
      >
        {isCourierOnly && (
          <option value="in_transit" disabled>{config.label} (Courier)</option>
        )}
        {STATUS_OPTIONS.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {disabled ? (
        <Lock size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 opacity-60" />
      ) : (
        <ChevronDown
          size={14}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 opacity-60"
        />
      )}
    </div>
  )
}

function OrderStatusTimeline({ order }) {
  const rawLog = Array.isArray(order.statusLog) && order.statusLog.length > 0
    ? order.statusLog
    : [{ status: order.status || 'pending', changedAt: order.createdAt, changedBy: 'system', changedByLabel: 'Order Placed' }]

  const toMs = (value) => {
    if (typeof value?.toDate === 'function') return value.toDate().getTime()
    const t = new Date(value || 0).getTime()
    return Number.isNaN(t) ? 0 : t
  }
  const sorted = [...rawLog].sort((a, b) => toMs(a.changedAt) - toMs(b.changedAt))

  return (
    <div className="space-y-2.5 border-l-2 border-gray-100 pl-3.5">
      {sorted.map((entry, idx) => {
        const config = getStatusConfig(entry.status)
        return (
          <div key={idx} className="relative">
            <span className={`absolute -left-[18px] top-1 h-2 w-2 rounded-full ring-2 ring-white ${config.dot || 'bg-gray-400'}`} />
            <p className="text-[11px] font-bold text-gray-700">{config.label}</p>
            <p className="text-[10px] text-gray-400">
              {formatOrderDate(entry.changedAt)} · {entry.changedByLabel || 'System'}
            </p>
          </div>
        )
      })}
    </div>
  )
}

function PaymentBadge({ status }) {
  const key = normalizePaymentStatus(status)
  const config = getOption(PAYMENT_STATUS_OPTIONS, key, 'unpaid')

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${config.color}`}>
      {config.label}
    </span>
  )
}

function PaymentMethodLabel({ method }) {
  return getOption(PAYMENT_METHOD_OPTIONS, normalizePaymentMethod(method), 'bank_transfer').label
}

// Searchable country picker for Topship international shipments - the plain <select> this
// replaces had no search and rendered countries in whatever order Topship's /get-countries
// returns them in (not alphabetical), which made finding one painful with 150+ countries.
function CountrySelect({ value, onChange, countries }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const selected = countries.find(c => c.code === value)
  const filtered = query
    ? countries.filter(c => c.name.toLowerCase().includes(query.toLowerCase()))
    : countries

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setQuery('') }}
        className={`${INPUT_CLASS} flex items-center justify-between text-left`}
      >
        <span className="truncate">{selected?.name || 'Select country'}</span>
        <ChevronDown size={14} className="shrink-0 text-gray-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg">
            <div className="flex items-center gap-1.5 border-b border-gray-100 px-3 py-2">
              <Search size={13} className="shrink-0 text-gray-400" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search country..."
                className="w-full text-sm outline-none placeholder:text-gray-300"
              />
            </div>
            <div className="max-h-48 overflow-y-auto py-1">
              {filtered.length === 0 && (
                <p className="px-3 py-2 text-xs text-gray-400">No countries match.</p>
              )}
              {filtered.map(c => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => { onChange(c.code); setOpen(false); setQuery('') }}
                  className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-green-50 ${c.code === value ? 'bg-green-50 font-semibold text-green-700' : 'text-gray-700'}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function OrdersTab({
  store,
  user,
  whatsappNumber: _whatsappNumber,
  orders = [],
  ordersLoading = false,
  onUpdateOrder,
  onDeleteOrder,
  isGrowthOrPro = true,
  isPro = false,
  navigateTo,
}) {
  const [ledgerError, setLedgerError] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [statusError, setStatusError] = useState('')

  // Shipment Booking States (shared by Sendbox and Topship)
  const [bookingShipmentOrder, setBookingShipmentOrder] = useState(null)
  const [showProviderModal, setShowProviderModal] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState('sendbox')
  const [itemCategory, setItemCategory] = useState('Fashion')
  const [insuranceType, setInsuranceType] = useState('None')
  const [topshipCountries, setTopshipCountries] = useState([])
  const [senderCountryCode, setSenderCountryCode] = useState('NG')
  const [receiverCountryCode, setReceiverCountryCode] = useState('NG')
  const [senderPostalCode, setSenderPostalCode] = useState('')
  const [receiverPostalCode, setReceiverPostalCode] = useState('')
  const [topshipBookingDirect, setTopshipBookingDirect] = useState(false)
  const [SendboxRates, setSendboxRates] = useState([])
  const [loadingRates, setLoadingRates] = useState(false)
  const [hasSearchedRates, setHasSearchedRates] = useState(false)
  const [bookingSubmitting, setBookingSubmitting] = useState(false)
  const [bookingError, setBookingError] = useState('')
  const [bookingSuccess, setBookingSuccess] = useState('')
  const [selectedCourierId, setSelectedCourierId] = useState('')
  const [selectedServiceCode, setSelectedServiceCode] = useState('')
  const [packageType, setPackageType] = useState('general')
  const [packageWeight, setPackageWeight] = useState(1)
  const [pickupDate, setPickupDate] = useState(new Date().toISOString().split('T')[0])
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentInitializing, setPaymentInitializing] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const [shipmentPaymentResult, setShipmentPaymentResult] = useState(null)
  const [markingDelivered, setMarkingDelivered] = useState(null)
  const [markDeliveredError, setMarkDeliveredError] = useState('')

  // Address Details states for editing in the modal
  const [senderName, setSenderName] = useState('')
  const [senderPhone, setSenderPhone] = useState('')
  const [senderEmail, setSenderEmail] = useState('')
  const [senderStreet, setSenderStreet] = useState('')
  const [senderCity, setSenderCity] = useState('')
  const [senderState, setSenderState] = useState('')

  const [receiverName, setReceiverName] = useState('')
  const [receiverPhone, setReceiverPhone] = useState('')
  const [receiverEmail, setReceiverEmail] = useState('')
  const [receiverStreet, setReceiverStreet] = useState('')
  const [receiverCity, setReceiverCity] = useState('')
  const [receiverState, setReceiverState] = useState('')
  const [receiverLga, setReceiverLga] = useState('')
  
  // Filtering States
  const [filterSearch, setFilterSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPayment, setFilterPayment] = useState('all')
  const [filterSort, setFilterSort] = useState('newest')

  // Pagination + inline status-timeline expand state
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedOrderId, setExpandedOrderId] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const shipmentStatus = params.get('shipment')
    const reference = params.get('reference')
    if (shipmentStatus !== 'pending' || !reference) return

    const saved = sessionStorage.getItem(`sellapage_shipment_${reference}`)
    if (!saved) return

    let parsed
    try { parsed = JSON.parse(saved) } catch { return }

    const verifyAndBook = async () => {
      try {
        const token = await user?.getIdToken()

        if (parsed.provider === 'topship') {
          // Topship redirect flow: a single call does verify + book, no dependency
          // on a separate verify endpoint (see topship-create-shipment.js).
          const bookRes = await fetch('/api/topship-create-shipment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              storeId: parsed.storeId,
              orderId: parsed.orderId,
              reference,
              pricingTier: parsed.pricingTier,
              senderDetails: parsed.senderDetails,
              receiverDetails: parsed.receiverDetails,
              weight: parsed.weight,
              itemCategory: parsed.itemCategory || 'Others',
              insuranceType: parsed.insuranceType || 'None',
            }),
          })
          const bookData = await bookRes.json()
          if (bookRes.ok && bookData.success) {
            sessionStorage.removeItem(`sellapage_shipment_${reference}`)
            const newUrl = window.location.pathname
            window.history.replaceState({}, '', newUrl)
            await onUpdateOrder?.(parsed.orderId, {
              topshipTrackingId: bookData.trackingId || '',
              topshipTrackingUrl: bookData.trackingUrl || '',
              topshipShipmentId: bookData.shipmentId || '',
              provider: 'topship',
              status: 'dispatched',
            })
            setShipmentPaymentResult({ success: true, trackingId: bookData.trackingId || '' })
          } else {
            setShipmentPaymentResult({ success: false, error: bookData.error || 'Shipment booking failed after payment.' })
          }
          return
        }

        // The separate /api/sendbox-payment-verify call was removed: that handler
        // never existed, so this step always 404'd and the shipment was never
        // booked despite the customer being charged. sendbox-create-shipment now
        // verifies the Paystack reference itself (same as the Topship path above)
        // and reads courierId from the verified transaction metadata.
        const bookRes = await fetch('/api/sendbox-create-shipment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            storeId: parsed.storeId,
            orderId: parsed.orderId,
            reference,
            senderDetails: parsed.senderDetails,
            receiverDetails: parsed.receiverDetails,
            weight: parsed.weight,
            pickupDate: parsed.pickupDate,
            packageType: parsed.packageType || 'general',
          }),
        })
        const bookData = await bookRes.json()
        if (bookRes.ok && bookData.success) {
          sessionStorage.removeItem(`sellapage_shipment_${reference}`)
          const newUrl = window.location.pathname
          window.history.replaceState({}, '', newUrl)
          await onUpdateOrder?.(parsed.orderId, {
            SendboxTrackingId: bookData.trackingId || '',
            sendboxTrackingId: bookData.trackingId || '',
            SendboxOrderId: bookData.orderId || '',
            sendboxOrderId: bookData.orderId || '',
            SendboxStatus: 'created',
            sendboxStatus: 'created',
            SendboxTrackingUrl: bookData.trackingUrl || '',
            sendboxTrackingUrl: bookData.trackingUrl || '',
            SendboxWaybillUrl: bookData.waybillUrl || '',
            sendboxWaybillUrl: bookData.waybillUrl || '',
            status: 'dispatched',
          })
          setShipmentPaymentResult({ success: true, trackingId: bookData.trackingId || '' })
        } else {
          setShipmentPaymentResult({ success: false, error: bookData.error || 'Shipment booking failed after payment.' })
        }
      } catch {
        setShipmentPaymentResult({ success: false, error: 'Something went wrong. Contact support.' })
      }
    }
    verifyAndBook()
  }, [user, store?.id])

  const handleInlineUpdate = async (order, updates) => {
    setLedgerError('')
    try {
      await onUpdateOrder?.(order.id, updates)
    } catch {
      setLedgerError('Could not update this order. Your ledger has been restored.')
    }
  }

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const currentOrder = orders.find(o => o.id === orderId)
      if (currentOrder?.status === 'delivered') {
        setBookingError('This order has already been delivered and cannot be changed.')
        setTimeout(() => setBookingError(''), 4000)
        return
      }

      const token = await user?.getIdToken()
      const res = await fetch('/api/update-order-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          storeId: store.id,
          orderId,
          newStatus,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        await onUpdateOrder?.(orderId, { status: newStatus })
      } else {
        console.error('[StatusChange] Failed:', data.error)
      }
    } catch (err) {
      console.error('[StatusChange] Error:', err)
    }
  }

  const openDeleteDialog = (order) => {
    setConfirmingDelete(order)
    setDeleteError('')
  }

  const closeDeleteDialog = () => {
    if (deleteLoading) return
    setConfirmingDelete(null)
    setDeleteError('')
  }

  const confirmDeleteOrder = async () => {
    if (!confirmingDelete) return
    setDeleteLoading(true)
    setDeleteError('')
    setLedgerError('')

    try {
      await onDeleteOrder?.(confirmingDelete.id)
      if (editingOrder?.id === confirmingDelete.id) resetForm()
      setConfirmingDelete(null)
    } catch (err) {
      setDeleteError(err?.message || 'Could not delete this order. The record has been restored.')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleDownloadReceipt = async (order) => {
    try {
      const blobUrl = await generateOrderReceipt(order, store)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `receipt_${order.paystackReference || order.id || 'order'}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('Failed to generate receipt:', err)
      alert('Failed to generate receipt. Please try again.')
    }
  }

  const handleMarkDelivered = async (order) => {
    setMarkingDelivered(order.id)
    setMarkDeliveredError('')

    const token = await user?.getIdToken()
    if (!token) {
      setMarkDeliveredError('Authentication expired. Please log in again.')
      setMarkingDelivered(null)
      return
    }

    try {
      const res = await fetch('/api/update-order-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ storeId: store.id, orderId: order.id, newStatus: 'delivered' }),
      })

      const data = await res.json()

      if (res.ok) {
        onUpdateOrder?.(order.id, {
          status: 'delivered',
          reviewToken: data.reviewToken,
          reviewTokenUsed: false,
          reviewSubmitted: false,
        })
      } else {
        setMarkDeliveredError(data.error || 'Failed to mark as delivered. Please try again.')
      }
    } catch (error) {
      console.error('Failed to mark as delivered:', error)
      setMarkDeliveredError('Failed to mark as delivered. Please try again.')
    } finally {
      setMarkingDelivered(null)
    }
  }

  const openProviderModal = (order) => {
    setBookingShipmentOrder(order)
    setShowProviderModal(true)
    setBookingError('')
  }

  const selectProvider = (provider) => {
    setSelectedProvider(provider)
    setShowProviderModal(false)
    setItemCategory('Fashion')
    setInsuranceType('None')
    setSenderCountryCode('NG')
    setReceiverCountryCode('NG')
    setSenderPostalCode('')
    setReceiverPostalCode('')
    if (provider === 'topship' && topshipCountries.length === 0) {
      fetch('/api/topship-countries')
        .then(res => res.json())
        .then(data => setTopshipCountries(Array.isArray(data.countries) ? data.countries : []))
        .catch(() => setTopshipCountries([]))
    }
    if (bookingShipmentOrder) initShipmentForm(bookingShipmentOrder, provider)
  }

  const initShipmentForm = (order, provider) => {
    setBookingShipmentOrder(order)
    setBookingError('')
    setBookingSuccess('')
    setSendboxRates([])
    setHasSearchedRates(false)
    setSelectedCourierId('')
    setSelectedServiceCode('')
    setPackageType('general')
    setPackageWeight(1)
    setPickupDate(new Date().toISOString().split('T')[0])

    // Pre-fill sender details
    setSenderName(store?.businessName || '')
    setSenderPhone(store?.whatsappNumber || '')
    setSenderEmail(store?.email || '')
    setSenderStreet(store?.pickupAddress?.streetAddress || '')
    setSenderCity(store?.pickupAddress?.city || '')
    setSenderState(store?.pickupAddress?.state || '')

    // Pre-fill receiver details
    setReceiverName(order.customerName || '')
    setReceiverPhone(order.customerPhone || '')
    setReceiverEmail(order.customerEmail || '')
    setReceiverStreet(order.deliveryAddress?.address || order.deliveryAddress?.streetAddress || '')
    setReceiverCity(order.deliveryAddress?.city || order.deliveryAddress?.lga || '')
    setReceiverState(order.deliveryAddress?.state || '')
    setReceiverLga(order.deliveryAddress?.lga || '')

    // If pickup address exists, fetch rates immediately for default weight 1kg
    if (store?.pickupAddress?.streetAddress && store?.pickupAddress?.state) {
      triggerFetchRates(1, {
        senderStreet: store.pickupAddress.streetAddress,
        senderCity: store.pickupAddress.city,
        senderState: store.pickupAddress.state,
        receiverStreet: order.deliveryAddress?.address || order.deliveryAddress?.streetAddress || '',
        receiverCity: order.deliveryAddress?.city || order.deliveryAddress?.lga || '',
        receiverState: order.deliveryAddress?.state || '',
        receiverLga: order.deliveryAddress?.lga || '',
      }, provider)
    } else {
      setBookingError('Please configure your pickup address in the Delivery tab first.')
    }
  }

  const triggerFetchRates = async (weightVal, detailsObj = {}, providerOverride) => {
    const provider = providerOverride || selectedProvider
    const sStreet = detailsObj.senderStreet ?? senderStreet
    const sCity = detailsObj.senderCity ?? senderCity
    const sState = detailsObj.senderState ?? senderState
    const rStreet = detailsObj.receiverStreet ?? receiverStreet
    const rCity = detailsObj.receiverCity ?? receiverCity
    const rState = detailsObj.receiverState ?? receiverState

    const isTopship = provider === 'topship'

    if (!store?.id) return
    if (isTopship) {
      if (!sCity || !rCity) {
        setBookingError('Sender and receiver city are required to calculate rates.')
        return
      }
    } else {
      if (!sStreet || !sState) {
        setBookingError('Vendor pickup address (street and state) is required to calculate rates.')
        return
      }
      if (!rStreet || !rState) {
        setBookingError('Receiver delivery address (street and state) is required to calculate rates.')
        return
      }
    }

    setLoadingRates(true)
    setBookingError('')
    setSendboxRates([])
    try {
      const endpoint = isTopship ? '/api/topship-rates' : '/api/sendbox-rates'
      const body = isTopship
        ? {
            storeId: store.id,
            senderDetails: { city: sCity, countryCode: senderCountryCode || 'NG' },
            receiverDetails: { city: rCity, countryCode: receiverCountryCode || 'NG' },
            weight: Number(weightVal) || 1,
          }
        : {
            storeId: store.id,
            senderDetails: {
              name: senderName || store?.businessName || '',
              phone: senderPhone || store?.whatsappNumber || '',
              email: senderEmail || store?.email || '',
              address: sStreet,
              city: sCity,
              state: sState,
            },
            receiverDetails: {
              name: receiverName || '',
              phone: receiverPhone || '',
              email: receiverEmail || '',
              address: rStreet,
              city: rCity,
              state: rState,
            },
            weight: Number(weightVal) || 1,
            packageAmount: Number(bookingShipmentOrder?.grandTotal || bookingShipmentOrder?.total || 5000),
            packageType: packageType,
          }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok && Array.isArray(data.rates)) {
        setSendboxRates(data.rates)
        if (data.rates.length > 0) {
          setSelectedCourierId(data.rates[0].courier_id || '')
          setSelectedServiceCode(data.rates[0].service_code || '')
        }
      } else {
        setBookingError(data.error || `Failed to fetch rates from ${isTopship ? 'Topship' : 'Sendbox'}.`)
      }
    } catch (err) {
      console.error(err)
      setBookingError('Failed to fetch shipping rates. Please check your connection.')
    } finally {
      setLoadingRates(false)
      setHasSearchedRates(true)
    }
  }

  // TEMPORARY (2026-08-12, logged in Changelog-README.md "Topship: FLIPPED TO
  // PRODUCTION"): books a Topship shipment directly, skipping Paystack entirely.
  // Payment-first is currently off even in production (Nex's explicit instruction, to
  // validate the live booking flow before wiring real payment collection) - see
  // topship-create-shipment.js header for the exact one-line revert.
  const bookTopshipDirect = async () => {
    if (!bookingShipmentOrder || !store?.id) return
    const selectedRate = SendboxRates.find(r => r.courier_id === selectedCourierId)
    if (!selectedRate) {
      setBookingError('Selected rate not found. Please recalculate rates.')
      return
    }
    setTopshipBookingDirect(true)
    setBookingError('')
    try {
      const token = await user?.getIdToken()
      const senderDetails = {
        name: senderName || store?.businessName || '',
        phone: senderPhone || store?.whatsappNumber || '',
        email: senderEmail || store?.email || '',
        address: senderStreet,
        city: senderCity,
        state: senderState,
        country: senderCountryCode === 'NG' ? 'Nigeria' : (topshipCountries.find(c => c.code === senderCountryCode)?.name || senderCountryCode),
        countryCode: senderCountryCode,
        postalCode: senderPostalCode,
      }
      const receiverDetails = {
        name: receiverName || '',
        phone: receiverPhone || '',
        email: receiverEmail || '',
        address: receiverStreet,
        city: receiverCity,
        state: receiverState,
        lga: receiverLga || '',
        country: receiverCountryCode === 'NG' ? 'Nigeria' : (topshipCountries.find(c => c.code === receiverCountryCode)?.name || receiverCountryCode),
        countryCode: receiverCountryCode,
        postalCode: receiverPostalCode,
      }
      const res = await fetch('/api/topship-create-shipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          storeId: store.id,
          orderId: bookingShipmentOrder.id,
          pricingTier: selectedRate.pricing_tier,
          shippingFee: Number(selectedRate.total_shipping_fee),
          senderDetails,
          receiverDetails,
          weight: Number(packageWeight) || 1,
          itemCategory,
          insuranceType,
          pickupDate,
        }),
      })
      let data
      try {
        data = await res.json()
      } catch {
        // A hard platform timeout (Vercel 504) returns a plain-text/HTML body, not
        // JSON - res.json() throws in that case. Distinguish that from a genuine
        // network failure so the error message actually reflects what happened.
        if (res.status === 504) {
          setBookingError('The booking took too long to complete - this usually means Topship\'s server is slow or the courier is temporarily unavailable right now. Please try again.')
        } else {
          setBookingError('Could not connect to book the shipment. Please check your connection.')
        }
        return
      }
      if (res.ok && data.success) {
        await onUpdateOrder?.(bookingShipmentOrder.id, {
          topshipTrackingId: data.trackingId || '',
          topshipTrackingUrl: data.trackingUrl || '',
          topshipShipmentId: data.shipmentId || '',
          provider: 'topship',
          status: 'dispatched',
        })
        setBookingShipmentOrder(null)
        setShipmentPaymentResult({ success: true, trackingId: data.trackingId || '' })
      } else {
        setBookingError(data.error || 'Failed to book Topship shipment.')
      }
    } catch (err) {
      console.error(err)
      setBookingError('Could not connect to book the shipment. Please check your connection.')
    } finally {
      setTopshipBookingDirect(false)
    }
  }

  const initializeShipmentPayment = async () => {
    if (!bookingShipmentOrder || !store?.id) return
    if (!selectedCourierId) {
      setBookingError('Please select a courier rate first.')
      return
    }
    const selectedRate = SendboxRates.find(r => r.courier_id === selectedCourierId)
    if (!selectedRate) {
      setBookingError('Selected rate not found. Please recalculate rates.')
      return
    }
    if (selectedProvider === 'topship') {
      // TEMPORARY (2026-08-12): payment-first is off for Topship even in production, so
      // Nex can validate the live booking flow before wiring real payment collection -
      // see bookTopshipDirect above and topship-create-shipment.js header.
      await bookTopshipDirect()
      return
    }
    setShowPaymentModal(true)
    setPaymentError('')
  }

  const proceedToPaystack = async () => {
    if (!bookingShipmentOrder || !store?.id) return
    const selectedRate = SendboxRates.find(r => r.courier_id === selectedCourierId)
    if (!selectedRate) return
    setPaymentInitializing(true)
    setPaymentError('')
    const isTopship = selectedProvider === 'topship'
    try {
      const token = await user?.getIdToken()
      const senderDetails = isTopship
        ? {
            name: senderName || store?.businessName || '',
            phone: senderPhone || store?.whatsappNumber || '',
            email: senderEmail || store?.email || '',
            address: senderStreet,
            city: senderCity,
            state: senderState,
            country: senderCountryCode === 'NG' ? 'Nigeria' : (topshipCountries.find(c => c.code === senderCountryCode)?.name || senderCountryCode),
            countryCode: senderCountryCode,
            postalCode: senderPostalCode,
          }
        : {
            name: senderName || store?.businessName || '',
            phone: senderPhone || store?.whatsappNumber || '',
            email: senderEmail || store?.email || '',
            address: senderStreet,
            city: senderCity,
            state: senderState,
          }
      const receiverDetails = isTopship
        ? {
            name: receiverName || '',
            phone: receiverPhone || '',
            email: receiverEmail || '',
            address: receiverStreet,
            city: receiverCity,
            state: receiverState,
            lga: receiverLga || '',
            country: receiverCountryCode === 'NG' ? 'Nigeria' : (topshipCountries.find(c => c.code === receiverCountryCode)?.name || receiverCountryCode),
            countryCode: receiverCountryCode,
            postalCode: receiverPostalCode,
          }
        : {
            name: receiverName || '',
            phone: receiverPhone || '',
            email: receiverEmail || '',
            address: receiverStreet,
            city: receiverCity,
            state: receiverState,
            lga: receiverLga || '',
          }

      const initEndpoint = isTopship ? '/api/topship-payment-initialize' : '/api/sendbox-payment-initialize'
      const initBody = isTopship
        ? {
            storeId: store.id,
            orderId: bookingShipmentOrder.id,
            courierName: selectedRate.courier_name,
            shippingFee: Number(selectedRate.total_shipping_fee),
            courierId: selectedCourierId,
            pricingTier: selectedRate.pricing_tier,
            senderDetails,
            receiverDetails,
            weight: Number(packageWeight) || 1,
            pickupDate: pickupDate,
            itemCategory,
            insuranceType,
          }
        : {
            storeId: store.id,
            orderId: bookingShipmentOrder.id,
            courierName: selectedRate.courier_name,
            shippingFee: Number(selectedRate.total_shipping_fee),
            courierId: selectedCourierId,
            senderDetails,
            receiverDetails,
            weight: Number(packageWeight) || 1,
            pickupDate: pickupDate,
            packageType: packageType,
          }

      const res = await fetch(initEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(initBody),
      })
      const data = await res.json()
      if (res.ok && data.authorization_url) {
        const sessionPayload = isTopship
          ? {
              provider: 'topship',
              storeId: store.id,
              orderId: bookingShipmentOrder.id,
              courierId: selectedCourierId,
              pricingTier: selectedRate.pricing_tier,
              senderDetails,
              receiverDetails,
              weight: Number(packageWeight) || 1,
              pickupDate: pickupDate,
              itemCategory,
              insuranceType,
            }
          : {
              storeId: store.id,
              orderId: bookingShipmentOrder.id,
              senderDetails,
              receiverDetails,
              weight: Number(packageWeight) || 1,
              pickupDate: pickupDate,
              packageType: packageType,
            }
        sessionStorage.setItem(`sellapage_shipment_${data.reference}`, JSON.stringify(sessionPayload))
        window.location.href = data.authorization_url
      } else {
        setPaymentError(data.error || 'Failed to initialize payment. Please try again.')
      }
    } catch {
      setPaymentError('Could not connect to payment service. Check your connection.')
    } finally {
      setPaymentInitializing(false)
    }
  }

  // --- Filtering Engine ---
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // 1. Text Field Search (name, id, address/notes)
      if (filterSearch) {
        const query = filterSearch.toLowerCase()
        const matchName = (order.customerName || '').toLowerCase().includes(query)
        const matchId = (order.id || '').toLowerCase().includes(query)
        const matchNotes = (order.notes || '').toLowerCase().includes(query)
        if (!matchName && !matchId && !matchNotes) return false
      }
      // 2. Order Status
      if (filterStatus !== 'all' && normalizeStatus(order.status) !== filterStatus) {
        return false
      }
      // 3. Payment Status
      if (filterPayment !== 'all' && normalizePaymentStatus(order.paymentStatus) !== filterPayment) {
        return false
      }
      return true
    }).sort((a, b) => {
      // 5. Date Sorting
      const dateA = typeof a.createdAt?.toDate === 'function' ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime()
      const dateB = typeof b.createdAt?.toDate === 'function' ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime()
      return filterSort === 'oldest' ? dateA - dateB : dateB - dateA
    })
  }, [orders, filterSearch, filterStatus, filterPayment, filterSort])

  useEffect(() => {
    setCurrentPage(1)
  }, [filterSearch, filterStatus, filterPayment, filterSort])

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ORDERS_PER_PAGE))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const paginatedOrders = filteredOrders.slice(
    (safeCurrentPage - 1) * ORDERS_PER_PAGE,
    safeCurrentPage * ORDERS_PER_PAGE
  )

  if (!isPro) {
    return (
      <div className="mx-auto max-w-4xl p-4 sm:p-5">
        <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
          <div className="px-6 py-14 text-center sm:py-16">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 border border-green-100">
              <Lock size={22} className="text-green-600" strokeWidth={1.8} />
            </div>
            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-green-600">
              Pro & Premium Only
            </p>
            <h1 className="mb-2 text-lg font-bold tracking-tight text-gray-900">
              Automated Orders
            </h1>
            <p className="mx-auto mb-5 max-w-sm text-xs leading-relaxed text-gray-500">
              Orders appear here automatically when customers complete checkout via Paystack. Upgrade to Pro to activate in-app checkout and automatic order tracking.
            </p>
            <button
              type="button"
              onClick={() => navigateTo?.('billing')}
              className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-green-700"
            >
              <CreditCard size={13} />
              Upgrade to Pro
            </button>
            <p className="mt-4 text-xs text-gray-400">
              Manual order logging is available in the Ledger tab - free for all plans.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (isGrowthOrPro && !isPro) {
    return (
      <div className="mx-auto max-w-4xl p-4 sm:p-5">
        <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
          <div className="px-6 py-14 text-center sm:py-16">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 border border-blue-100">
              <Lock size={22} className="text-blue-500" strokeWidth={1.8} />
            </div>
            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-blue-500">
              Pro & Premium Only
            </p>
            <h1 className="mb-2 text-lg font-bold tracking-tight text-gray-900">
              Automated Orders
            </h1>
            <p className="mx-auto mb-5 max-w-sm text-xs leading-relaxed text-gray-500">
              You're on Growth. Orders are automatically created when customers pay via Paystack in-app checkout - a Pro feature. Log offline sales in your Ledger tab instead.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => navigateTo?.('billing')}
                className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-green-700"
              >
                <CreditCard size={13} />
                Upgrade to Pro
              </button>
              <button
                type="button"
                onClick={() => navigateTo?.('ledger')}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-bold text-gray-600 transition-all hover:bg-gray-50"
              >
                Go to Ledger
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-green-600">
            Product Orders
          </p>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">
            Order Ledger
          </h1>
          <p className="mt-0.5 text-xs text-gray-400">
            Track product orders here. Service bookings live in the Bookings tab. WhatsApp orders can be logged manually in the ledger tab.
          </p>
        </div>
      </div>

      {/* Operational Filter Strip */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4 bg-white p-3.5 rounded-2xl border border-gray-100">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={14} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search name, ID, or address..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-4 py-2 text-xs text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 focus:bg-white"
          />
        </div>
        <div className="relative">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 pr-10 text-xs font-semibold text-gray-700 outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20 focus:bg-white"
          >
            <option value="all">All Statuses</option>
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown size={13} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
        <div className="relative">
          <select
            value={filterPayment}
            onChange={(e) => setFilterPayment(e.target.value)}
            className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 pr-10 text-xs font-semibold text-gray-700 outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20 focus:bg-white"
          >
            <option value="all">All Payments</option>
            {PAYMENT_STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown size={13} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <ArrowDownUp size={14} className="text-gray-400" />
          </div>
          <select
            value={filterSort}
            onChange={(e) => setFilterSort(e.target.value)}
            className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-10 py-2 text-xs font-semibold text-gray-700 outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20 focus:bg-white"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
          <ChevronDown size={13} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      {(bookingError || statusError) && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs font-semibold text-amber-700">
          <AlertCircle size={13} className="flex-shrink-0" />
          {bookingError || statusError}
        </div>
      )}

      {ledgerError && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          {ledgerError}
        </div>
      )}

      {markDeliveredError && (
        <div className="flex items-start justify-between gap-2.5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          <div className="flex items-start gap-2.5">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            {markDeliveredError}
          </div>
          <button
            type="button"
            onClick={() => setMarkDeliveredError('')}
            className="text-red-700 hover:text-red-900"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {ordersLoading && (
        <SkeletonRows count={5} />
      )}

      {!ordersLoading && orders.length === 0 && (
        <section className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white px-6 py-14 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50">
            <ShoppingBag size={24} className="text-green-600" strokeWidth={1.75} />
          </div>
          <h2 className="mb-1.5 text-base font-bold tracking-tight text-gray-900">
            No orders yet
          </h2>
          <p className="max-w-sm text-xs leading-relaxed text-gray-500">
            Orders appear here automatically when customers complete checkout on your store. Share your store link to start getting orders.
          </p>
        </section>
      )}

      {!ordersLoading && orders.length > 0 && filteredOrders.length === 0 && (
        <section className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white px-6 py-12 text-center shadow-sm">
          <Filter size={30} className="text-gray-300 mb-4" strokeWidth={1.75} />
          <p className="text-sm font-semibold text-gray-600">
            No orders match your active filter criteria.
          </p>
          <button 
            onClick={() => {
              setFilterSearch('');
              setFilterStatus('all');
              setFilterPayment('all');
              setFilterSort('newest');
            }} 
            className="mt-4 text-xs font-bold text-green-600 hover:text-green-700 underline underline-offset-2"
          >
            Clear all filters
          </button>
        </section>
      )}

      {!ordersLoading && filteredOrders.length > 0 && (
        <>
          <section className="hidden overflow-hidden rounded-2xl border border-gray-100 bg-white md:block animate-in fade-in duration-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    {['Log Date', 'Customer', 'Items', 'Total', 'Payment', 'Method', 'Fulfillment', 'Notes', 'Actions'].map(label => (
                      <th
                        key={label}
                        className="border-r border-gray-100 px-3 py-2.5 text-[10px] font-extrabold uppercase tracking-widest text-gray-500 last:border-r-0"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedOrders.map(order => {
                    const isLocked = normalizeStatus(order.status) === 'delivered'
                    const isExpanded = expandedOrderId === order.id
                    return (
                    <>
                    <tr key={order.id} className="group border-b border-gray-100 transition-colors hover:bg-gray-50/40 last:border-b-0">
                      <td className="border-r border-gray-100 px-3 py-3.5 align-top">
                        <div className="flex items-start gap-2 text-[11px] font-medium text-gray-500">
                          <Calendar size={12} className="mt-0.5 flex-shrink-0 text-gray-300" />
                          {formatOrderDate(order.createdAt)}
                        </div>
                      </td>
                      <td className="border-r border-gray-100 px-3 py-3.5 align-top">
                        <div className="flex flex-col gap-1">
                          <p className="text-xs font-bold leading-tight text-gray-900">
                            {order.customerName || '-'}
                          </p>
                          {order.orderType && (
                            <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-extrabold bg-green-50 text-green-700 border-green-200">
                              Order
                            </span>
                          )}
                          <p className="text-[11px] text-gray-400">
                            {order.customerPhone || 'No phone'}
                          </p>
                          {(order.SendboxTrackingId || order.sendboxTrackingId) && (
                            <div className="mt-1.5 flex flex-col gap-0.5">
                              <span className="inline-flex items-center rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-semibold text-indigo-700 border border-indigo-100 w-fit">
                                Tracking: {order.SendboxTrackingId || order.sendboxTrackingId}
                              </span>
                              <span className="text-[9px] text-indigo-500 italic">
                                Status: {order.SendboxStatus || order.sendboxStatus || 'created'}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="border-r border-gray-100 px-3 py-3.5 align-top">
                        <div className="flex flex-col gap-1">
                          <p className="max-w-[200px] whitespace-pre-line text-xs leading-relaxed text-gray-700">
                            {order.items || '-'}
                          </p>
                        </div>
                      </td>
                      <td className="border-r border-gray-100 px-3 py-3.5 align-top">
                        <span className="whitespace-nowrap text-xs font-bold text-green-700">
                          {formatTotal(order.total)}
                        </span>
                      </td>
                      <td className="border-r border-gray-100 px-3 py-3.5 align-top">
                        <PaymentBadge status={order.paymentStatus} />
                      </td>
                      <td className="border-r border-gray-100 px-3 py-3.5 align-top">
                        <span className="text-[11px] font-semibold text-gray-600">
                          <PaymentMethodLabel method={order.paymentMethod} />
                        </span>
                      </td>
                      <td className="border-r border-gray-100 px-3 py-3.5 align-top">
                        <StatusPicker
                          status={order.status}
                          onChange={(value) => handleStatusChange(order.id, value)}
                          disabled={isLocked}
                        />
                      </td>
                      <td className="border-r border-gray-100 px-3 py-3.5 align-top">
                        <p className="max-w-[140px] text-[11px] italic leading-relaxed text-gray-400">
                          {order.notes || '-'}
                        </p>
                      </td>
                      <td className="px-3 py-3.5 align-top">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                            className={`inline-flex items-center justify-center rounded-xl p-2 transition-all duration-200 hover:bg-gray-100 hover:text-gray-700 ${isExpanded ? 'text-gray-600 bg-gray-100' : 'text-gray-300 opacity-0 group-hover:opacity-100 focus:opacity-100'}`}
                            title="View status timeline"
                            aria-label="View status timeline"
                          >
                            <Clock size={15} />
                          </button>
                          {order.orderType === 'checkout' && normalizeStatus(order.status) !== 'delivered' && normalizeStatus(order.status) !== 'cancelled' && (
                            <button
                              type="button"
                              onClick={() => handleMarkDelivered(order)}
                              disabled={markingDelivered === order.id}
                              className="inline-flex items-center justify-center rounded-xl p-2 text-gray-300 opacity-0 transition-all duration-200 hover:bg-emerald-50 hover:text-emerald-600 group-hover:opacity-100 focus:opacity-100"
                              title="Mark as Delivered"
                              aria-label="Mark as Delivered"
                            >
                              {markingDelivered === order.id ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                            </button>
                          )}
                          {order.orderType === 'checkout' && !(order.SendboxTrackingId || order.sendboxTrackingId || order.topshipTrackingId) && (
                            <button
                              type="button"
                              onClick={() => openProviderModal(order)}
                              className="inline-flex items-center justify-center rounded-xl p-2 text-gray-300 opacity-0 transition-all duration-200 hover:bg-green-50 hover:text-green-600 group-hover:opacity-100 focus:opacity-100"
                              title="Book Shipment"
                              aria-label="Book Shipment"
                            >
                              <Truck size={15} />
                            </button>
                          )}
                          {order.orderType === 'checkout' && (
                            <button
                              type="button"
                              onClick={() => handleDownloadReceipt(order)}
                              className="inline-flex items-center justify-center rounded-xl p-2 text-gray-300 opacity-0 transition-all duration-200 hover:bg-amber-50 hover:text-amber-600 group-hover:opacity-100 focus:opacity-100"
                              title="Download Receipt"
                              aria-label="Download Receipt"
                            >
                              <Download size={15} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => !isLocked && openDeleteDialog(order)}
                            disabled={isLocked}
                            className={`inline-flex items-center justify-center rounded-xl p-2 transition-all duration-200 ${isLocked ? 'text-gray-200 cursor-not-allowed opacity-0 group-hover:opacity-100' : 'text-gray-300 opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 focus:opacity-100'}`}
                            title={isLocked ? 'Delivered orders are locked and cannot be deleted' : 'Delete order'}
                            aria-label="Delete order"
                          >
                            {isLocked ? <Lock size={13} /> : <Trash2 size={15} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-b border-gray-100 bg-gray-50/40 last:border-b-0 animate-in fade-in duration-150">
                        <td colSpan={9} className="px-5 py-4">
                          <p className="mb-2.5 text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Status Timeline</p>
                          <OrderStatusTimeline order={order} />
                        </td>
                      </tr>
                    )}
                    </>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-2.5 md:hidden animate-in fade-in duration-200">
            {paginatedOrders.map(order => {
              const isLocked = normalizeStatus(order.status) === 'delivered'
              const isExpanded = expandedOrderId === order.id
              return (
              <article key={order.id} className="rounded-2xl border border-gray-100 bg-white p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-bold leading-tight text-gray-900">
                        {order.customerName || 'Unknown customer'}
                      </p>
                      {order.orderType && (
                        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-extrabold bg-green-50 text-green-700 border-green-200">
                          Order
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-gray-400">
                      {order.customerPhone || 'No phone'}
                    </p>
                    {(order.SendboxTrackingId || order.sendboxTrackingId) && (
                      <div className="mt-1.5 flex flex-col gap-0.5">
                        <span className="inline-flex items-center rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 border border-indigo-100 w-fit">
                          Tracking: {order.SendboxTrackingId || order.sendboxTrackingId}
                        </span>
                        <span className="text-[10px] text-indigo-500 italic">
                          Status: {order.SendboxStatus || order.sendboxStatus || 'created'}
                        </span>
                      </div>
                    )}
                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-gray-400">
                      <Calendar size={12} className="flex-shrink-0" />
                      {formatOrderDate(order.createdAt)}
                    </div>
                  </div>
                  <StatusPicker
                    status={order.status}
                    onChange={(value) => handleStatusChange(order.id, value)}
                    disabled={isLocked}
                  />
                </div>

                <div className="mb-3 rounded-xl bg-gray-50 p-3">
                  <p className="mb-1.5 flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                    <FileText size={11} />
                    Items
                  </p>
                  <p className="whitespace-pre-line text-xs leading-relaxed text-gray-700">
                    {order.items || '-'}
                  </p>
                </div>

                <div className="mb-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-gray-50 p-3">
                    <p className="mb-1 text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                      Total
                    </p>
                    <p className="text-xs font-bold text-green-700">
                      {formatTotal(order.total)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3">
                    <p className="mb-1 text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                      Payment
                    </p>
                    <PaymentBadge status={order.paymentStatus} />
                  </div>
                  <div className="col-span-2 rounded-xl bg-gray-50 p-3">
                    <p className="mb-1 text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                      Payment Method
                    </p>
                    <p className="text-xs font-semibold text-gray-700">
                      <PaymentMethodLabel method={order.paymentMethod} />
                    </p>
                  </div>
                </div>

                {order.notes && (
                  <p className="mb-3 rounded-xl bg-gray-50 p-3 text-xs italic leading-relaxed text-gray-500">
                    {order.notes}
                  </p>
                )}

                {isExpanded && (
                  <div className="mb-3 rounded-xl bg-gray-50 p-3.5 animate-in fade-in duration-150">
                    <p className="mb-2.5 text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Status Timeline</p>
                    <OrderStatusTimeline order={order} />
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-end gap-1.5 border-t border-gray-100 pt-3">
                  <button
                    type="button"
                    onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                    className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-bold transition-all ${isExpanded ? 'bg-gray-100 text-gray-700' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    <Clock size={13} />
                    Timeline
                  </button>
                  {order.orderType === 'checkout' && normalizeStatus(order.status) !== 'delivered' && normalizeStatus(order.status) !== 'cancelled' && (
                    <button
                      type="button"
                      onClick={() => handleMarkDelivered(order)}
                      disabled={markingDelivered === order.id}
                      className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-emerald-600 transition-all hover:bg-emerald-50"
                    >
                      {markingDelivered === order.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                      Delivered
                    </button>
                  )}
                  {order.orderType === 'checkout' && !(order.SendboxTrackingId || order.sendboxTrackingId || order.topshipTrackingId) && (
                    <button
                      type="button"
                      onClick={() => openProviderModal(order)}
                      className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-green-600 transition-all hover:bg-green-50"
                    >
                      <Truck size={13} />
                      Shipment
                    </button>
                  )}
                  {order.orderType === 'checkout' && (
                    <button
                      type="button"
                      onClick={() => handleDownloadReceipt(order)}
                      className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-amber-600 transition-all hover:bg-amber-50"
                    >
                      <Download size={13} />
                      Receipt
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => !isLocked && openDeleteDialog(order)}
                    disabled={isLocked}
                    className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-bold transition-all ${isLocked ? 'text-gray-300 cursor-not-allowed' : 'text-red-600 hover:bg-red-50'}`}
                  >
                    {isLocked ? <Lock size={13} /> : <Trash2 size={13} />}
                    {isLocked ? 'Locked' : 'Delete'}
                  </button>
                </div>
              </article>
              )
            })}
          </section>

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white px-3 py-2.5">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safeCurrentPage === 1}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600 transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={13} /> Previous
              </button>
              <span className="text-xs font-bold text-gray-500">{safeCurrentPage} / {totalPages}</span>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage === totalPages}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600 transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next <ChevronRight size={13} />
              </button>
            </div>
          )}
        </>
      )}

      <div className="flex items-start gap-2.5 rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
        <Info size={13} className="flex-shrink-0 text-gray-400 mt-0.5" />
        <p className="text-[11px] text-gray-400 leading-relaxed">
          <span className="font-semibold text-gray-600">Order status guide:</span> Only update the status when it reflects the actual state of the order. Once an order is marked as <span className="font-semibold">Delivered</span>, its status is locked and the order can no longer be deleted.
        </p>
      </div>

      {confirmingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-gray-100 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-extrabold text-gray-950">Delete order record?</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    This removes the ledger entry for {confirmingDelete.customerName || 'this customer'}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeDeleteDialog}
                  className="rounded-xl p-2 text-gray-400 transition-all duration-200 hover:bg-gray-100 hover:text-gray-700"
                  aria-label="Close delete confirmation"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="space-y-4 px-5 py-5">
              {deleteError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                  {deleteError}
                </div>
              )}

              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
                <p className="text-sm font-extrabold text-gray-950">
                  {confirmingDelete.customerName || 'Unknown customer'}
                </p>
                <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-gray-500">
                  {confirmingDelete.items || 'No items recorded'}
                </p>
              </div>

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={closeDeleteDialog}
                  disabled={deleteLoading}
                  className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-extrabold text-gray-600 transition-all duration-200 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteOrder}
                  disabled={deleteLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 text-sm font-extrabold text-white shadow-sm transition-all duration-200 hover:bg-red-700 disabled:bg-red-400"
                >
                  {deleteLoading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={15} />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {shipmentPaymentResult && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
          <div className="relative w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-5 py-8 text-center space-y-4">
              {shipmentPaymentResult.success ? (
                <>
                  <div className="mx-auto w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center border border-green-100">
                    <CheckCircle size={28} className="text-green-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-base">Shipment Booked!</p>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      {shipmentPaymentResult.trackingId
                        ? `Tracking ID: ${shipmentPaymentResult.trackingId}`
                        : 'Your shipment has been booked successfully.'}
                    </p>
                  </div>
                  <p className="text-[11px] text-gray-400">View tracking details in the Delivery tab.</p>
                </>
              ) : (
                <>
                  <div className="mx-auto w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center border border-red-100">
                    <AlertCircle size={28} className="text-red-500" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-base">Payment Failed</p>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{shipmentPaymentResult.error}</p>
                  </div>
                </>
              )}
              <div className="flex gap-3 pt-2">
                {!shipmentPaymentResult.success && (
                  <button
                    type="button"
                    onClick={() => { setShipmentPaymentResult(null); setShowPaymentModal(true) }}
                    className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 py-2.5 text-xs font-bold text-white transition-all"
                  >
                    Try Again
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShipmentPaymentResult(null)}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all"
                >
                  {shipmentPaymentResult.success ? 'Done' : 'Go Back'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && (() => {
        const selectedRate = SendboxRates.find(r => r.courier_id === selectedCourierId)
        const shippingFee = Number(selectedRate?.total_shipping_fee || 0)
        const serviceCharge = 250
        const total = shippingFee + serviceCharge
        return (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
            <div className="relative w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div>
                  <p className="font-bold text-gray-900 text-sm">Confirm & Pay for Shipment</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Review payment before proceeding</p>
                </div>
                <button type="button" onClick={() => setShowPaymentModal(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                  <X size={16} />
                </button>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Courier</span>
                    <span className="text-xs font-bold text-gray-900">{selectedRate?.courier_name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Shipping fee</span>
                    <span className="text-xs font-semibold text-gray-700">₦{shippingFee.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Sellapage service charge</span>
                    <span className="text-xs font-semibold text-gray-700">₦{serviceCharge.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2.5 flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-900">Total</span>
                    <span className="text-sm font-black text-green-600">₦{total.toLocaleString()}</span>
                  </div>
                </div>
                {paymentError && (
                  <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{paymentError}</p>
                )}
                <p className="text-[11px] text-gray-400 text-center">You will be redirected to Paystack to complete payment. After payment, the shipment is booked automatically.</p>
              </div>
              <div className="px-5 pb-5 flex gap-3">
                <button type="button" onClick={() => setShowPaymentModal(false)} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all">
                  Cancel
                </button>
                <button type="button" onClick={proceedToPaystack} disabled={paymentInitializing} className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 py-2.5 text-xs font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {paymentInitializing ? <><Loader2 size={13} className="animate-spin" />Processing...</> : <><CreditCard size={13} />Pay Now</>}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {showProviderModal && bookingShipmentOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
          <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
            <div className="border-b border-gray-100 px-5 py-3.5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-950 flex items-center gap-2">
                  <Truck className="text-green-600" size={20} />
                  Choose a Delivery Provider
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Rates and courier options depend on which provider you pick.</p>
              </div>
              <button
                type="button"
                onClick={() => { setShowProviderModal(false); setBookingShipmentOrder(null) }}
                className="rounded-xl p-2 text-gray-400 transition-all duration-200 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close provider selection"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <button
                type="button"
                onClick={() => selectProvider('sendbox')}
                className="w-full text-left rounded-2xl border-2 border-gray-100 hover:border-green-400 hover:bg-green-50/40 transition-all p-4 flex items-start gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                  <Truck size={18} className="text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Sendbox</p>
                  <p className="text-xs text-gray-400 mt-0.5">Local delivery across Nigeria.</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => selectProvider('topship')}
                className="w-full text-left rounded-2xl border-2 border-gray-100 hover:border-blue-400 hover:bg-blue-50/40 transition-all p-4 flex items-start gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Truck size={18} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Topship</p>
                  <p className="text-xs text-gray-400 mt-0.5">Local + international shipping, 150+ countries.</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {bookingShipmentOrder && !showProviderModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
          <div className="relative w-full sm:max-w-xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh]">

            {/* Modal Header */}
            <div className="border-b border-gray-100 px-5 py-3.5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-950 flex items-center gap-2">
                  <Truck className="text-green-600" size={20} />
                  Book Shipment
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Prepare shipment details and calculate rates with {selectedProvider === 'topship' ? 'Topship' : 'Sendbox'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBookingShipmentOrder(null)}
                className="rounded-xl p-2 text-gray-400 transition-all duration-200 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close booking modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4 text-sm text-stone-750">
              {bookingError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
                  <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                  {bookingError}
                </div>
              )}

              {bookingSuccess && (
                <div className="flex items-start gap-2.5 rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-xs font-semibold text-green-700">
                  <Check size={15} className="mt-0.5 flex-shrink-0" />
                  <div>
                    {bookingSuccess}
                    {SendboxRates.length === 0 && bookingSuccess && (
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          const order = orders.find(o => o.id === bookingShipmentOrder?.id)
                          if (order?.SendboxWaybillUrl || order?.sendboxWaybillUrl) {
                            window.open(order.SendboxWaybillUrl || order.sendboxWaybillUrl, '_blank')
                          }
                        }}
                        className="ml-2 text-xs font-bold text-green-700 underline underline-offset-2 hover:text-green-800"
                      >
                        Download Waybill
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Sender Details */}
              <div className="space-y-3">
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-gray-400 flex items-center gap-1.5 border-b border-gray-100 pb-1.5">
                  <User size={13} />
                  Sender Details (Pickup Address)
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Name</label>
                    <input
                      type="text"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
                    <input
                      type="text"
                      value={senderPhone}
                      onChange={(e) => setSenderPhone(e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Street Address</label>
                    <input
                      type="text"
                      value={senderStreet}
                      onChange={(e) => setSenderStreet(e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">City</label>
                    <input
                      type="text"
                      value={senderCity}
                      onChange={(e) => setSenderCity(e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">State</label>
                    <input
                      type="text"
                      value={senderState}
                      onChange={(e) => setSenderState(e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>
                  {selectedProvider === 'topship' && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Country</label>
                        <CountrySelect
                          value={senderCountryCode}
                          onChange={setSenderCountryCode}
                          countries={topshipCountries.length > 0 ? topshipCountries : [{ code: 'NG', name: 'Nigeria' }]}
                        />
                      </div>
                      {senderCountryCode !== 'NG' && (
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Postal Code</label>
                          <input
                            type="text"
                            value={senderPostalCode}
                            onChange={(e) => setSenderPostalCode(e.target.value)}
                            className={INPUT_CLASS}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Receiver Details */}
              <div className="space-y-3">
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-gray-400 flex items-center gap-1.5 border-b border-gray-100 pb-1.5">
                  <ShoppingBag size={13} />
                  Receiver Details (Delivery Address)
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Name</label>
                    <input
                      type="text"
                      value={receiverName}
                      onChange={(e) => setReceiverName(e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
                    <input
                      type="text"
                      value={receiverPhone}
                      onChange={(e) => setReceiverPhone(e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Street Address</label>
                    <input
                      type="text"
                      value={receiverStreet}
                      onChange={(e) => setReceiverStreet(e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">City / LGA</label>
                    <input
                      type="text"
                      value={receiverCity}
                      onChange={(e) => {
                        setReceiverCity(e.target.value)
                        setReceiverLga(e.target.value)
                      }}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">State</label>
                    <input
                      type="text"
                      value={receiverState}
                      onChange={(e) => setReceiverState(e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>
                  {selectedProvider === 'topship' && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Country</label>
                        <CountrySelect
                          value={receiverCountryCode}
                          onChange={setReceiverCountryCode}
                          countries={topshipCountries.length > 0 ? topshipCountries : [{ code: 'NG', name: 'Nigeria' }]}
                        />
                      </div>
                      {receiverCountryCode !== 'NG' && (
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Postal Code</label>
                          <input
                            type="text"
                            value={receiverPostalCode}
                            onChange={(e) => setReceiverPostalCode(e.target.value)}
                            className={INPUT_CLASS}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
                {selectedProvider === 'topship' && (senderCountryCode !== 'NG' || receiverCountryCode !== 'NG') && (
                  <p className="text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                    International shipment ({senderCountryCode} → {receiverCountryCode}). Rates and booking route to Topship's Export/Import handling.
                  </p>
                )}
              </div>

              {/* Package Details & Courier List */}
              <div className="space-y-3">
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-gray-400 flex items-center gap-1.5 border-b border-gray-100 pb-1.5">
                  <Package size={13} />
                  Package & Courier Rates
                </h3>
                <div className="mb-3">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Pickup Date
                    <span className="ml-1 text-gray-400 font-normal">(when should courier collect?)</span>
                  </label>
                  <input
                    type="date"
                    value={pickupDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setPickupDate(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  />
                </div>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                  {selectedProvider === 'topship' ? (
                    <>
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Item Category</label>
                        <select
                          value={itemCategory}
                          onChange={(e) => setItemCategory(e.target.value)}
                          className={INPUT_CLASS}
                        >
                          {['Fashion', 'FoodItems', 'LaptopsAndTablets', 'Phones', 'Document', 'HomeDecor', 'BeautyProducts', 'Others'].map(cat => (
                            <option key={cat} value={cat}>{cat.replace(/([A-Z])/g, ' $1').trim()}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Insurance</label>
                        <select
                          value={insuranceType}
                          onChange={(e) => setInsuranceType(e.target.value)}
                          className={INPUT_CLASS}
                        >
                          <option value="None">None</option>
                          <option value="Premium">Premium</option>
                          <option value="Extended">Extended</option>
                        </select>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Package Type</label>
                      <select
                        value={packageType}
                        onChange={(e) => {
                          setPackageType(e.target.value)
                          if (packageWeight > 0) {
                            triggerFetchRates(packageWeight)
                          }
                        }}
                        className={INPUT_CLASS}
                      >
                        <option value="general">General items</option>
                        <option value="food">Food items</option>
                      </select>
                      {packageType === 'food' && (
                        <p className="text-xs text-amber-600 mt-1">Food items can only be dropped off - pickup is not available.</p>
                      )}
                    </div>
                  )}
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Package Weight (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={packageWeight}
                      onChange={(e) => {
                        const val = Number(e.target.value)
                        setPackageWeight(e.target.value)
                        if (val > 0) {
                          triggerFetchRates(val)
                        }
                      }}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => triggerFetchRates(packageWeight)}
                    disabled={loadingRates}
                    className="rounded-xl border border-green-500 text-green-600 px-5 py-2.5 text-xs font-extrabold transition-all hover:bg-green-50 disabled:opacity-50 flex items-center gap-1"
                  >
                    {loadingRates && <Loader2 size={13} className="animate-spin" />}
                    Recalculate Rates
                  </button>
                </div>

                {/* Rates List */}
                <div className="space-y-2 mt-3">
                  <label className="block text-xs font-semibold text-gray-600">Select Courier Rate</label>
                  
                  {loadingRates ? (
                    <div className="flex flex-col items-center justify-center py-8 border border-gray-150 rounded-xl bg-gray-50/50">
                      <Loader2 size={24} className="animate-spin text-green-600" />
                      <p className="text-xs text-gray-400 mt-2 font-medium">Fetching courier rates...</p>
                    </div>
                  ) : SendboxRates.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl text-xs text-gray-400 font-medium bg-gray-50/20">
                      {hasSearchedRates
                        ? `No couriers are currently available for this route${selectedProvider === 'topship' ? ' via Topship' : ''}. Try a different weight, address, or courier.`
                        : 'Enter valid sender/receiver details and click Recalculate Rates.'}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                      {SendboxRates.map((rate) => (
                        <label
                          key={rate.courier_id}
                          className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-all ${
                            selectedCourierId === rate.courier_id
                              ? 'border-green-500 bg-green-50/30 shadow-sm'
                              : 'border-gray-200 hover:border-green-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="courier_choice"
                              value={rate.courier_id}
                              checked={selectedCourierId === rate.courier_id}
                              onChange={() => {
                                setSelectedCourierId(rate.courier_id)
                                setSelectedServiceCode(rate.service_code || '')
                              }}
                              className="text-green-600 focus:ring-green-500 h-4 w-4 border-gray-300"
                            />
                            <div>
                              <p className="font-extrabold text-gray-900 text-xs sm:text-sm">
                                {rate.courier_name}
                              </p>
                              <p className="text-[10px] text-gray-400 font-medium">
                                Estimated Delivery: {rate.delivery_eta || '-'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-black text-green-700">
                              ₦{Number(rate.total_shipping_fee || 0).toLocaleString()}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-100 bg-gray-50/80 px-4 sm:px-6 py-3.5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setBookingShipmentOrder(null)}
                disabled={bookingSubmitting}
                className="rounded-xl border border-gray-200 px-5 py-2.5 text-xs font-extrabold text-gray-600 transition-all hover:bg-white disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={initializeShipmentPayment}
                disabled={bookingSubmitting || topshipBookingDirect || !selectedCourierId || loadingRates}
                className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-xs font-bold text-white transition-all hover:bg-green-700 disabled:bg-green-400 active:scale-95"
              >
                {bookingSubmitting || topshipBookingDirect ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Booking Shipment...
                  </>
                ) : (
                  <>
                    <Check size={13} />
                    {selectedProvider === 'topship' ? 'Book Shipment (No Payment)' : 'Confirm & Book Shipment'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
