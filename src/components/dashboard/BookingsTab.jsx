//src/components/dashboard/BookingsTab.jsx/
import { useState, useMemo, useEffect, Fragment } from 'react'
import {
  AlertCircle,
  Calendar,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Download,
  Filter,
  Info,
  List,
  Loader2,
  MapPin,
  Search,
  Trash2,
  User,
  X,
} from 'lucide-react'
import { generateBookingReceipt } from '../../utils/generateReceipt'
import BookingsCalendar from './BookingsCalendar'

const BOOKING_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-500' },
  { value: 'rescheduled', label: 'Rescheduled', color: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  { value: 'completed', label: 'Completed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
  { value: 'no_show', label: 'No Show', color: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  { value: 'refunded', label: 'Refunded', color: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' },
]

const BOOKINGS_PER_PAGE = 10

function getOption(options, value, fallback) {
  return options.find(option => option.value === value) || options.find(option => option.value === fallback)
}

function normalizeStatus(status) {
  return getOption(BOOKING_STATUS_OPTIONS, status, 'pending').value
}

function getStatusConfig(status) {
  return getOption(BOOKING_STATUS_OPTIONS, normalizeStatus(status), 'pending')
}

function formatLogDate(value) {
  if (!value) return '-'
  const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })
}

function formatScheduled(booking) {
  if (!booking.bookingDate) return '-'
  const d = new Date(`${booking.bookingDate}T${booking.bookingTime || '00:00'}`)
  if (Number.isNaN(d.getTime())) return `${booking.bookingDate} ${booking.bookingTime || ''}`.trim()
  return `${d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}${booking.bookingTime ? ` · ${booking.bookingTime}` : ''}`
}

function formatTotal(total) {
  if (total == null || total === '') return '-'
  const amount = Number(total)
  if (Number.isNaN(amount)) return '-'
  return `NGN ${amount.toLocaleString('en-NG')}`
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function BookingStatusPicker({ status, onChange, disabled = false }) {
  const key = normalizeStatus(status)
  const config = getStatusConfig(status)

  return (
    <div className={`relative inline-flex min-w-[9rem] items-center rounded-xl border transition-opacity ${config.color} ${disabled ? 'opacity-60' : ''}`}>
      <select
        value={key}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        aria-label="Booking status"
        className="w-full appearance-none rounded-xl bg-transparent py-1.5 pl-3 pr-8 text-xs font-extrabold uppercase tracking-wide outline-none transition-all cursor-pointer focus:ring-2 focus:ring-green-500/25 disabled:cursor-not-allowed"
      >
        {BOOKING_STATUS_OPTIONS.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {disabled ? (
        <Loader2 size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin opacity-60" />
      ) : (
        <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 opacity-60" />
      )}
    </div>
  )
}

function BookingStatusTimeline({ booking }) {
  const rawLog = Array.isArray(booking.statusLog) && booking.statusLog.length > 0
    ? booking.statusLog
    : [{ status: booking.status || 'pending', changedAt: booking.createdAt, changedBy: 'system', changedByLabel: 'Booking Created' }]

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
            <p className="text-[11px] font-bold text-gray-700">
              {config.label}
              {entry.status === 'rescheduled' && entry.newDate ? ` — ${entry.newDate} ${entry.newTime || ''}`.trim() : ''}
            </p>
            <p className="text-[10px] text-gray-400">
              {formatLogDate(entry.changedAt)} · {entry.changedByLabel || 'System'}
            </p>
          </div>
        )
      })}
    </div>
  )
}

export default function BookingsTab({
  store,
  user,
  bookings = [],
  bookingsLoading = false,
  onUpdateBooking,
  onDeleteBooking,
  isGrowthOrPro = true,
  isPro = false,
  navigateTo,
}) {
  const [statusError, setStatusError] = useState('')
  const [statusUpdatingId, setStatusUpdatingId] = useState(null)
  const [expandedBookingId, setExpandedBookingId] = useState(null)

  const [confirmingDelete, setConfirmingDelete] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const [rescheduling, setRescheduling] = useState(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('')
  const [rescheduleError, setRescheduleError] = useState('')
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false)

  const [view, setView] = useState('list')
  const [calendarSelectedDate, setCalendarSelectedDate] = useState(null)

  const [filterSearch, setFilterSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterWhen, setFilterWhen] = useState('all')
  const [filterSort, setFilterSort] = useState('newest')

  const [currentPage, setCurrentPage] = useState(1)

  const callUpdateBookingStatus = async (booking, newStatus, extra = {}) => {
    setStatusError('')
    setStatusUpdatingId(booking.id)
    try {
      const token = await user?.getIdToken()
      const res = await fetch('/api/update-booking-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          storeId: store.id,
          bookingId: booking.id,
          newStatus,
          ...extra,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setStatusError(data.error || 'Could not update this booking.')
        return false
      }
      const updates = { status: newStatus, reviewToken: data.reviewToken ?? booking.reviewToken }
      if (newStatus === 'rescheduled') {
        updates.bookingDate = extra.newBookingDate
        updates.bookingTime = extra.newBookingTime
      }
      await onUpdateBooking?.(booking.id, updates)
      return true
    } catch (err) {
      console.error('[BookingsTab] status update failed', err)
      setStatusError('Could not update this booking. Please try again.')
      return false
    } finally {
      setStatusUpdatingId(null)
    }
  }

  const handleStatusChange = async (booking, newStatus) => {
    if (newStatus === 'rescheduled') {
      setRescheduling(booking)
      setRescheduleDate(booking.bookingDate || '')
      setRescheduleTime(booking.bookingTime || '')
      setRescheduleError('')
      return
    }
    await callUpdateBookingStatus(booking, newStatus)
  }

  const submitReschedule = async () => {
    if (!rescheduling) return
    if (!rescheduleDate || !rescheduleTime) {
      setRescheduleError('Please choose a new date and time.')
      return
    }
    setRescheduleSubmitting(true)
    setRescheduleError('')
    const ok = await callUpdateBookingStatus(rescheduling, 'rescheduled', {
      newBookingDate: rescheduleDate,
      newBookingTime: rescheduleTime,
    })
    setRescheduleSubmitting(false)
    if (ok) setRescheduling(null)
    else setRescheduleError(statusError || 'Could not reschedule this booking.')
  }

  const openDeleteDialog = (booking) => {
    setConfirmingDelete(booking)
    setDeleteError('')
  }

  const closeDeleteDialog = () => {
    if (deleteLoading) return
    setConfirmingDelete(null)
    setDeleteError('')
  }

  const confirmDeleteBooking = async () => {
    if (!confirmingDelete) return
    setDeleteLoading(true)
    setDeleteError('')
    try {
      await onDeleteBooking?.(confirmingDelete.id)
      setConfirmingDelete(null)
    } catch (err) {
      setDeleteError(err?.message || 'Could not delete this booking. The record has been restored.')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleDownloadReceipt = async (booking) => {
    try {
      const blobUrl = await generateBookingReceipt(booking, store)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `receipt_${booking.paystackReference || booking.id || 'booking'}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('Failed to generate receipt:', err)
      alert('Failed to generate receipt. Please try again.')
    }
  }

  // --- Filtering engine ---
  const filteredBookings = useMemo(() => {
    const today = todayISO()
    const weekAhead = new Date()
    weekAhead.setDate(weekAhead.getDate() + 7)
    const weekAheadISO = weekAhead.toISOString().split('T')[0]

    return bookings.filter(booking => {
      if (filterSearch) {
        const q = filterSearch.toLowerCase()
        const matchName = (booking.customerName || '').toLowerCase().includes(q)
        const matchService = (booking.serviceName || '').toLowerCase().includes(q)
        const matchId = (booking.id || '').toLowerCase().includes(q)
        if (!matchName && !matchService && !matchId) return false
      }
      if (filterStatus !== 'all' && normalizeStatus(booking.status) !== filterStatus) return false
      if (filterWhen === 'today' && booking.bookingDate !== today) return false
      if (filterWhen === 'week' && !(booking.bookingDate >= today && booking.bookingDate <= weekAheadISO)) return false
      if (filterWhen === 'upcoming' && !(booking.bookingDate >= today)) return false
      if (calendarSelectedDate && booking.bookingDate !== calendarSelectedDate) return false
      return true
    }).sort((a, b) => {
      const dateA = typeof a.createdAt?.toDate === 'function' ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime()
      const dateB = typeof b.createdAt?.toDate === 'function' ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime()
      return filterSort === 'oldest' ? dateA - dateB : dateB - dateA
    })
  }, [bookings, filterSearch, filterStatus, filterWhen, filterSort, calendarSelectedDate])

  useEffect(() => {
    setCurrentPage(1)
  }, [filterSearch, filterStatus, filterWhen, filterSort, calendarSelectedDate])

  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / BOOKINGS_PER_PAGE))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const paginatedBookings = filteredBookings.slice(
    (safeCurrentPage - 1) * BOOKINGS_PER_PAGE,
    safeCurrentPage * BOOKINGS_PER_PAGE
  )

  const revenueSummary = useMemo(() => {
    const now = new Date()
    const completed = bookings.filter(b => normalizeStatus(b.status) === 'completed')
    const total = completed.reduce((sum, b) => sum + Number(b.grandTotal || 0), 0)
    const thisMonth = completed.filter(b => {
      const d = typeof b.createdAt?.toDate === 'function' ? b.createdAt.toDate() : new Date(b.createdAt || 0)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).reduce((sum, b) => sum + Number(b.grandTotal || 0), 0)
    const today = todayISO()
    const upcoming = bookings.filter(b => b.bookingDate >= today && ['pending', 'confirmed', 'rescheduled'].includes(normalizeStatus(b.status))).length
    return { total, thisMonth, upcoming }
  }, [bookings])

  if (!isPro) {
    return (
      <div className="mx-auto max-w-4xl p-4 sm:p-5">
        <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
          <div className="px-6 py-14 text-center sm:py-16">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 border border-green-100">
              <CalendarClock size={22} className="text-green-600" strokeWidth={1.8} />
            </div>
            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-green-600">
              Pro & Premium Only
            </p>
            <h1 className="mb-2 text-lg font-bold tracking-tight text-gray-900">
              Automated Bookings
            </h1>
            <p className="mx-auto mb-5 max-w-sm text-xs leading-relaxed text-gray-500">
              Bookings appear here automatically when customers complete checkout via Paystack. Upgrade to Pro to activate in-app checkout and automatic booking tracking.
            </p>
            <button
              type="button"
              onClick={() => navigateTo?.('billing')}
              className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-green-700"
            >
              <CreditCard size={13} />
              Upgrade to Pro
            </button>
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
              <CalendarClock size={22} className="text-blue-500" strokeWidth={1.8} />
            </div>
            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-blue-500">
              Pro & Premium Only
            </p>
            <h1 className="mb-2 text-lg font-bold tracking-tight text-gray-900">
              Automated Bookings
            </h1>
            <p className="mx-auto mb-5 max-w-sm text-xs leading-relaxed text-gray-500">
              You're on Growth. Bookings are automatically created when customers pay via Paystack in-app checkout — a Pro feature.
            </p>
            <button
              type="button"
              onClick={() => navigateTo?.('billing')}
              className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-green-700"
            >
              <CreditCard size={13} />
              Upgrade to Pro
            </button>
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
            Service Bookings
          </p>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">
            Bookings
          </h1>
          <p className="mt-0.5 text-xs text-gray-400">
            Bookings created via Paystack checkout appear here automatically, separate from product orders.
          </p>
        </div>
        <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setView('list')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${view === 'list' ? 'bg-green-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <List size={13} /> List
          </button>
          <button
            type="button"
            onClick={() => setView('calendar')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${view === 'calendar' ? 'bg-green-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Calendar size={13} /> Calendar
          </button>
        </div>
      </div>

      {/* Revenue summary strip */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-3.5">
          <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-400">Total Booking Revenue</p>
          <p className="mt-1 text-base font-extrabold text-gray-900">{formatTotal(revenueSummary.total)}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-3.5">
          <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-400">This Month</p>
          <p className="mt-1 text-base font-extrabold text-gray-900">{formatTotal(revenueSummary.thisMonth)}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-3.5">
          <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-400">Upcoming Bookings</p>
          <p className="mt-1 text-base font-extrabold text-gray-900">{revenueSummary.upcoming}</p>
        </div>
      </div>

      {view === 'calendar' && (
        <BookingsCalendar
          bookings={bookings}
          selectedDate={calendarSelectedDate}
          onSelectDate={(dateKey) => {
            setCalendarSelectedDate(dateKey)
            setView('list')
          }}
        />
      )}

      {/* Filter strip */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4 bg-white p-3.5 rounded-2xl border border-gray-100">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={14} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search name, service, or ID..."
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
            {BOOKING_STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown size={13} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
        <div className="relative">
          <select
            value={filterWhen}
            onChange={(e) => setFilterWhen(e.target.value)}
            className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 pr-10 text-xs font-semibold text-gray-700 outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20 focus:bg-white"
          >
            <option value="all">Any Date</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="upcoming">Upcoming</option>
          </select>
          <ChevronDown size={13} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
        <div className="relative">
          <select
            value={filterSort}
            onChange={(e) => setFilterSort(e.target.value)}
            className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 pr-10 text-xs font-semibold text-gray-700 outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20 focus:bg-white"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
          <ChevronDown size={13} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      {calendarSelectedDate && (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-blue-50 border border-blue-200 px-4 py-2.5 text-xs font-semibold text-blue-700">
          Showing bookings for {calendarSelectedDate}
          <button type="button" onClick={() => setCalendarSelectedDate(null)} className="text-blue-700 hover:text-blue-900">
            <X size={14} />
          </button>
        </div>
      )}

      {statusError && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs font-semibold text-amber-700">
          <AlertCircle size={13} className="flex-shrink-0" />
          {statusError}
        </div>
      )}

      {bookingsLoading && (
        <div className="flex items-center justify-center rounded-2xl border border-gray-100 bg-white py-20">
          <Loader2 size={28} className="animate-spin text-green-600" />
        </div>
      )}

      {!bookingsLoading && bookings.length === 0 && (
        <section className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white px-6 py-14 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50">
            <CalendarClock size={24} className="text-green-600" strokeWidth={1.75} />
          </div>
          <h2 className="mb-1.5 text-base font-bold tracking-tight text-gray-900">
            No bookings yet
          </h2>
          <p className="max-w-sm text-xs leading-relaxed text-gray-500">
            Bookings appear here automatically when customers book and pay for a service on your store.
          </p>
        </section>
      )}

      {!bookingsLoading && bookings.length > 0 && filteredBookings.length === 0 && (
        <section className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white px-6 py-12 text-center shadow-sm">
          <Filter size={30} className="text-gray-300 mb-4" strokeWidth={1.75} />
          <p className="text-sm font-semibold text-gray-600">
            No bookings match your active filter criteria.
          </p>
          <button
            onClick={() => {
              setFilterSearch('')
              setFilterStatus('all')
              setFilterWhen('all')
              setFilterSort('newest')
              setCalendarSelectedDate(null)
            }}
            className="mt-4 text-xs font-bold text-green-600 hover:text-green-700 underline underline-offset-2"
          >
            Clear all filters
          </button>
        </section>
      )}

      {!bookingsLoading && filteredBookings.length > 0 && (
        <>
          {/* Desktop table */}
          <section className="hidden overflow-hidden rounded-2xl border border-gray-100 bg-white md:block animate-in fade-in duration-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    {['Scheduled', 'Customer', 'Service', 'Total', 'Status', 'Actions'].map(label => (
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
                  {paginatedBookings.map(booking => {
                    const isExpanded = expandedBookingId === booking.id
                    const isUpdating = statusUpdatingId === booking.id
                    return (
                      <Fragment key={booking.id}>
                        <tr className="group border-b border-gray-100 transition-colors hover:bg-gray-50/40 last:border-b-0">
                          <td className="border-r border-gray-100 px-3 py-3.5 align-top">
                            <div className="flex items-start gap-2 text-[11px] font-medium text-gray-700">
                              <Clock size={12} className="mt-0.5 flex-shrink-0 text-gray-300" />
                              {formatScheduled(booking)}
                            </div>
                            {booking.locationPref && (
                              <div className="mt-1 flex items-center gap-1 text-[10px] text-gray-400">
                                <MapPin size={10} /> {booking.locationPref}
                              </div>
                            )}
                          </td>
                          <td className="border-r border-gray-100 px-3 py-3.5 align-top">
                            <p className="text-xs font-bold leading-tight text-gray-900">{booking.customerName || '-'}</p>
                            <p className="mt-0.5 text-[10px] text-gray-400">{booking.customerPhone || '-'}</p>
                          </td>
                          <td className="border-r border-gray-100 px-3 py-3.5 align-top">
                            <p className="text-xs font-semibold text-gray-700">{booking.serviceName || '-'}</p>
                          </td>
                          <td className="border-r border-gray-100 px-3 py-3.5 align-top">
                            <p className="text-xs font-bold text-gray-900">{formatTotal(booking.grandTotal)}</p>
                          </td>
                          <td className="border-r border-gray-100 px-3 py-3.5 align-top">
                            <BookingStatusPicker
                              status={booking.status}
                              disabled={isUpdating}
                              onChange={(newStatus) => handleStatusChange(booking, newStatus)}
                            />
                          </td>
                          <td className="px-3 py-3.5 align-top">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {normalizeStatus(booking.status) === 'pending' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => callUpdateBookingStatus(booking, 'confirmed')}
                                    className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700 hover:bg-blue-100"
                                  >
                                    <Check size={11} /> Confirm
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => callUpdateBookingStatus(booking, 'cancelled')}
                                    className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700 hover:bg-red-100"
                                  >
                                    <X size={11} /> Decline
                                  </button>
                                </>
                              )}
                              <button
                                type="button"
                                onClick={() => setExpandedBookingId(isExpanded ? null : booking.id)}
                                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[10px] font-bold text-gray-600 hover:bg-gray-50"
                              >
                                <Clock size={11} /> Timeline
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadReceipt(booking)}
                                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[10px] font-bold text-gray-600 hover:bg-gray-50"
                              >
                                <Download size={11} /> Receipt
                              </button>
                              <button
                                type="button"
                                onClick={() => openDeleteDialog(booking)}
                                disabled={normalizeStatus(booking.status) === 'completed'}
                                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[10px] font-bold text-gray-600 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="border-b border-gray-100 bg-gray-50/40 last:border-b-0">
                            <td colSpan={6} className="px-5 py-4 animate-in fade-in duration-200">
                              <BookingStatusTimeline booking={booking} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Mobile cards */}
          <section className="space-y-3 md:hidden animate-in fade-in duration-200">
            {paginatedBookings.map(booking => {
              const isExpanded = expandedBookingId === booking.id
              const isUpdating = statusUpdatingId === booking.id
              return (
                <article key={booking.id} className="rounded-2xl border border-gray-100 bg-white p-3.5 space-y-3 sm:p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-start gap-2">
                      <User size={14} className="mt-0.5 flex-shrink-0 text-gray-300" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-gray-900">{booking.customerName || '-'}</p>
                        <p className="truncate text-[11px] text-gray-400">{booking.customerPhone || '-'}</p>
                      </div>
                    </div>
                    <BookingStatusPicker
                      status={booking.status}
                      disabled={isUpdating}
                      onChange={(newStatus) => handleStatusChange(booking, newStatus)}
                    />
                  </div>

                  <div className="rounded-xl bg-gray-50/70 p-3 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                      <Clock size={12} className="text-gray-400" /> {formatScheduled(booking)}
                    </div>
                    <p className="text-xs font-semibold text-gray-700">{booking.serviceName || '-'}</p>
                    {booking.locationPref && (
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                        <MapPin size={11} /> {booking.locationPref}
                      </div>
                    )}
                    <p className="text-sm font-extrabold text-gray-900">{formatTotal(booking.grandTotal)}</p>
                  </div>

                  {normalizeStatus(booking.status) === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => callUpdateBookingStatus(booking, 'confirmed')}
                        className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100"
                      >
                        <Check size={13} /> Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => callUpdateBookingStatus(booking, 'cancelled')}
                        className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
                      >
                        <X size={13} /> Decline
                      </button>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setExpandedBookingId(isExpanded ? null : booking.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11px] font-bold text-gray-600 hover:bg-gray-50"
                    >
                      <Clock size={12} /> Timeline
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadReceipt(booking)}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11px] font-bold text-gray-600 hover:bg-gray-50"
                    >
                      <Download size={12} /> Receipt
                    </button>
                    <button
                      type="button"
                      onClick={() => openDeleteDialog(booking)}
                      disabled={normalizeStatus(booking.status) === 'completed'}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11px] font-bold text-gray-600 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-gray-100 pt-3 animate-in fade-in duration-200">
                      <BookingStatusTimeline booking={booking} />
                    </div>
                  )}
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
          <span className="font-semibold text-gray-600">Booking status guide:</span> "Refunded" is a manual bookkeeping label only — it does not process a refund through Paystack. Cancelling a booking emails the customer a link to contact you directly on WhatsApp about a refund.
        </p>
      </div>

      {/* Reschedule modal */}
      {rescheduling && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-gray-100 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-extrabold text-gray-950">Reschedule booking</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Choose a new date and time for {rescheduling.customerName || 'this customer'}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => !rescheduleSubmitting && setRescheduling(null)}
                  className="rounded-xl p-2 text-gray-400 transition-all duration-200 hover:bg-gray-100 hover:text-gray-700"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="space-y-4 px-5 py-5">
              {rescheduleError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                  {rescheduleError}
                </div>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-600">New Date</label>
                  <input
                    type="date"
                    value={rescheduleDate}
                    min={todayISO()}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-600">New Time</label>
                  <input
                    type="time"
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  />
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRescheduling(null)}
                  disabled={rescheduleSubmitting}
                  className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-extrabold text-gray-600 transition-all duration-200 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitReschedule}
                  disabled={rescheduleSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-6 py-2.5 text-sm font-extrabold text-white shadow-sm transition-all duration-200 hover:bg-green-700 disabled:bg-green-400"
                >
                  {rescheduleSubmitting ? <Loader2 size={15} className="animate-spin" /> : <CalendarClock size={15} />}
                  Reschedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {confirmingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-gray-100 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-extrabold text-gray-950">Delete booking record?</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    This removes the booking for {confirmingDelete.customerName || 'this customer'}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeDeleteDialog}
                  className="rounded-xl p-2 text-gray-400 transition-all duration-200 hover:bg-gray-100 hover:text-gray-700"
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
                <p className="mt-1 text-xs leading-relaxed text-gray-500">
                  {confirmingDelete.serviceName || 'No service recorded'}
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
                  onClick={confirmDeleteBooking}
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
    </div>
  )
}
