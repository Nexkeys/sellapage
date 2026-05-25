import { useRef, useState, useMemo } from 'react'
import {
  AlertCircle,
  Calendar,
  Check,
  ChevronDown,
  CreditCard,
  FileText,
  Info,
  Loader2,
  Lock,
  MessageCircle,
  Pencil,
  Plus,
  ShoppingBag,
  Trash2,
  User,
  Wallet,
  X,
  Search,
  Filter,
  ArrowDownUp
} from 'lucide-react'

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'dispatched', label: 'Dispatched', color: 'bg-violet-50 text-violet-700 border-violet-200' },
  { value: 'delivered', label: 'Delivered', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-50 text-red-700 border-red-200' },
]

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

const EMPTY_FORM = {
  customerName: '',
  customerPhone: '',
  items: '',
  total: '',
  notes: '',
  status: 'pending',
  paymentStatus: 'unpaid',
  paymentMethod: 'bank_transfer',
}

const INPUT_CLASS =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-all duration-200 placeholder:text-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-500/20'

const SELECT_CLASS =
  'w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 pr-10 text-sm font-semibold text-gray-800 outline-none transition-all duration-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20'

function getOption(options, value, fallback) {
  return options.find(option => option.value === value) || options.find(option => option.value === fallback)
}

function normalizeStatus(status) {
  return getOption(STATUS_OPTIONS, status, 'pending').value
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

function FieldLabel({ icon: Icon, children, required = false }) {
  return (
    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-gray-700">
      {Icon && <Icon size={13} className="text-gray-400" />}
      {children}
      {required && <span className="text-red-500">*</span>}
    </label>
  )
}

function SelectField({ value, onChange, children, ariaLabel }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        aria-label={ariaLabel}
        className={SELECT_CLASS}
      >
        {children}
      </select>
      <ChevronDown
        size={15}
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
      />
    </div>
  )
}

function StatusPicker({ status, onChange }) {
  const key = normalizeStatus(status)
  const config = getOption(STATUS_OPTIONS, key, 'pending')

  return (
    <div className={`relative inline-flex min-w-[9.75rem] items-center rounded-xl border ${config.color}`}>
      <select
        value={key}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Fulfillment status"
        className="w-full appearance-none rounded-xl bg-transparent py-2 pl-3 pr-8 text-xs font-extrabold uppercase tracking-wide outline-none transition-all cursor-pointer focus:ring-2 focus:ring-green-500/25"
      >
        {STATUS_OPTIONS.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 opacity-60"
      />
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

export default function OrdersTab({
  store: _store,
  whatsappNumber: _whatsappNumber,
  orders = [],
  ordersLoading = false,
  onAddOrder,
  onUpdateOrder,
  onDeleteOrder,
  isGrowthOrPro = true,
  navigateTo,
}) {
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [ledgerError, setLedgerError] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingOrder, setEditingOrder] = useState(null)
  const [confirmingDelete, setConfirmingDelete] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  
  // Filtering States
  const [filterSearch, setFilterSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPayment, setFilterPayment] = useState('all')
  const [filterSort, setFilterSort] = useState('newest')

  const formRef = useRef(null)
  const firstFieldRef = useRef(null)

  const focusForm = () => {
    window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      firstFieldRef.current?.focus({ preventScroll: true })
    })
  }

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setFormError('')
    setEditingOrder(null)
    setShowForm(false)
  }

  const openNewOrderForm = () => {
    setForm(EMPTY_FORM)
    setFormError('')
    setEditingOrder(null)
    setShowForm(true)
    focusForm()
  }

  const startEdit = (order) => {
    setEditingOrder(order)
    setFormError('')
    setLedgerError('')
    setForm({
      customerName: order.customerName || '',
      customerPhone: order.customerPhone || '',
      items: order.items || '',
      total: order.total == null ? '' : String(order.total),
      notes: order.notes || '',
      status: normalizeStatus(order.status),
      paymentStatus: normalizePaymentStatus(order.paymentStatus),
      paymentMethod: normalizePaymentMethod(order.paymentMethod),
    })
    setShowForm(true)
    focusForm()
  }

  const handleInlineUpdate = async (order, updates) => {
    setLedgerError('')
    try {
      await onUpdateOrder?.(order.id, updates)
    } catch {
      setLedgerError('Could not update this order. Your ledger has been restored.')
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const customerName = form.customerName.trim()
    const items = form.items.trim()

    if (!customerName) {
      setFormError('Customer name is required.')
      return
    }

    if (!items) {
      setFormError('Items ordered is required.')
      return
    }

    let total = null
    if (form.total !== '') {
      const parsedTotal = Number(form.total)
      if (Number.isNaN(parsedTotal) || parsedTotal < 0) {
        setFormError('Order total must be a valid amount.')
        return
      }
      total = parsedTotal
    }

    const payload = {
      customerName,
      customerPhone: form.customerPhone.trim(),
      items,
      total,
      notes: form.notes.trim(),
      status: normalizeStatus(form.status),
      paymentStatus: normalizePaymentStatus(form.paymentStatus),
      paymentMethod: normalizePaymentMethod(form.paymentMethod),
    }

    setSaving(true)
    setFormError('')
    setLedgerError('')

    try {
      if (editingOrder) {
        await onUpdateOrder?.(editingOrder.id, payload)
      } else {
        await onAddOrder?.(payload)
      }
      resetForm()
    } catch {
      setFormError('Could not save this order. Please try again.')
    } finally {
      setSaving(false)
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
    } catch {
      setDeleteError('Could not delete this order. The record has been restored.')
    } finally {
      setDeleteLoading(false)
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
      // 4. Date Sorting
      const dateA = typeof a.createdAt?.toDate === 'function' ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime()
      const dateB = typeof b.createdAt?.toDate === 'function' ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime()
      return filterSort === 'oldest' ? dateA - dateB : dateB - dateA
    })
  }, [orders, filterSearch, filterStatus, filterPayment, filterSort])


  if (!isGrowthOrPro) {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm shadow-gray-100/80">
          <div className="relative px-6 py-14 text-center sm:px-10 sm:py-16">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-green-100 bg-gradient-to-br from-green-50 to-emerald-50 shadow-sm">
              <Lock size={34} className="text-green-600" strokeWidth={1.8} />
            </div>
            <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.22em] text-green-600">
              Growth and Pro
            </p>
            <h1 className="mb-3 text-2xl font-extrabold tracking-tight text-gray-950 sm:text-3xl">
              Unlock the Order Ledger
            </h1>
            <p className="mx-auto mb-8 max-w-lg text-sm leading-relaxed text-gray-500 sm:text-base">
              Track manual WhatsApp orders, payment progress, fulfillment status, and customer notes in a clean bookkeeping workspace.
            </p>
            <button
              type="button"
              onClick={() => navigateTo?.('billing')}
              className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-6 py-3 text-sm font-extrabold text-white shadow-md shadow-green-200/70 transition-all duration-200 hover:bg-green-700 hover:shadow-lg"
            >
              <CreditCard size={16} />
              Upgrade in Billing
            </button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.2em] text-green-600">
            Manual bookkeeping
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-950 sm:text-[1.7rem]">
            Order Ledger
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-gray-500">
            Log WhatsApp checkout orders, track payments, and move fulfillment statuses as work happens.
          </p>
        </div>
        <button
          type="button"
          onClick={openNewOrderForm}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-sm shadow-green-200/60 transition-all duration-200 hover:bg-green-700 hover:shadow-md"
        >
          <Plus size={16} strokeWidth={2.25} />
          Log Order
        </button>
      </div>

      {/* Operational Filter Strip */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search name, ID, or address..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 py-2.5 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 focus:bg-white"
          />
        </div>
        <div className="relative">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 pr-10 text-sm font-semibold text-gray-700 outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20 focus:bg-white"
          >
            <option value="all">All Statuses</option>
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown size={15} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
        <div className="relative">
          <select
            value={filterPayment}
            onChange={(e) => setFilterPayment(e.target.value)}
            className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 pr-10 text-sm font-semibold text-gray-700 outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20 focus:bg-white"
          >
            <option value="all">All Payments</option>
            {PAYMENT_STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown size={15} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <ArrowDownUp size={16} className="text-gray-400" />
          </div>
          <select
            value={filterSort}
            onChange={(e) => setFilterSort(e.target.value)}
            className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-10 py-2.5 text-sm font-semibold text-gray-700 outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20 focus:bg-white"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
          <ChevronDown size={15} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      {ledgerError && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          {ledgerError}
        </div>
      )}

      {showForm && (
        <section
          ref={formRef}
          className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm shadow-gray-100/80"
        >
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-gray-50/50 px-5 py-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-green-100 bg-green-50">
                <FileText size={18} className="text-green-600" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-extrabold text-gray-950">
                  {editingOrder ? 'Edit Order Record' : 'Log New Order'}
                </h2>
                <p className="mt-0.5 truncate text-xs font-medium text-gray-400">
                  {editingOrder ? 'Update customer, payment, and fulfillment details.' : 'Capture a fresh manual order record.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl p-2 text-gray-400 transition-all duration-200 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close form"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6">
            {editingOrder && (
              <div className="inline-flex items-center gap-2 rounded-full border border-green-100 bg-green-50 px-3 py-1.5 text-xs font-extrabold text-green-700">
                <Calendar size={13} />
                Logged {formatOrderDate(editingOrder.createdAt)}
              </div>
            )}

            {formError && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="lg:col-span-2">
                <FieldLabel icon={User} required>Customer Name</FieldLabel>
                <input
                  ref={firstFieldRef}
                  value={form.customerName}
                  onChange={(event) => setForm(prev => ({ ...prev, customerName: event.target.value }))}
                  placeholder="e.g. Ada Okonkwo"
                  className={INPUT_CLASS}
                  required
                />
              </div>
              <div>
                <FieldLabel icon={MessageCircle}>WhatsApp Number</FieldLabel>
                <input
                  value={form.customerPhone}
                  onChange={(event) => setForm(prev => ({ ...prev, customerPhone: event.target.value }))}
                  placeholder="+234 801 234 5678"
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <FieldLabel icon={Wallet}>Order Total</FieldLabel>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.total}
                  onChange={(event) => setForm(prev => ({ ...prev, total: event.target.value }))}
                  placeholder="20500"
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            <div>
              <FieldLabel icon={ShoppingBag} required>Items Ordered</FieldLabel>
              <textarea
                value={form.items}
                onChange={(event) => setForm(prev => ({ ...prev, items: event.target.value }))}
                rows={4}
                placeholder={'2 x Ankara Dress - NGN 8,500\n1 x Leather Bag - NGN 12,000'}
                className={`${INPUT_CLASS} resize-none leading-relaxed`}
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <FieldLabel icon={Check}>Fulfillment Status</FieldLabel>
                <SelectField
                  value={form.status}
                  onChange={(event) => setForm(prev => ({ ...prev, status: event.target.value }))}
                  ariaLabel="Fulfillment status"
                >
                  {STATUS_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </SelectField>
              </div>
              <div>
                <FieldLabel icon={CreditCard}>Payment Status</FieldLabel>
                <SelectField
                  value={form.paymentStatus}
                  onChange={(event) => setForm(prev => ({ ...prev, paymentStatus: event.target.value }))}
                  ariaLabel="Payment status"
                >
                  {PAYMENT_STATUS_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </SelectField>
              </div>
              <div>
                <FieldLabel icon={Wallet}>Payment Method</FieldLabel>
                <SelectField
                  value={form.paymentMethod}
                  onChange={(event) => setForm(prev => ({ ...prev, paymentMethod: event.target.value }))}
                  ariaLabel="Payment method"
                >
                  {PAYMENT_METHOD_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </SelectField>
              </div>
              <div>
                <FieldLabel icon={FileText}>Internal Notes</FieldLabel>
                <input
                  value={form.notes}
                  onChange={(event) => setForm(prev => ({ ...prev, notes: event.target.value }))}
                  placeholder="Delivery address, reminders..."
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-gray-50 pt-1">
              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-extrabold text-gray-600 transition-all duration-200 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-6 py-2.5 text-sm font-extrabold text-white shadow-sm transition-all duration-200 hover:bg-green-700 disabled:bg-green-400"
              >
                {saving ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check size={15} />
                    {editingOrder ? 'Save Changes' : 'Save Order'}
                  </>
                )}
              </button>
            </div>
          </form>
        </section>
      )}

      {ordersLoading && (
        <div className="flex items-center justify-center rounded-2xl border border-gray-100 bg-white py-24 shadow-sm">
          <Loader2 size={36} className="animate-spin text-green-600" />
        </div>
      )}

      {!ordersLoading && orders.length === 0 && (
        <section className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white px-6 py-16 text-center shadow-sm transition-all duration-200 sm:py-20">
          <div className="mb-6 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl bg-green-50 ring-[6px] ring-green-50/80">
            <ShoppingBag size={30} className="text-green-600" strokeWidth={1.75} />
          </div>
          <h2 className="mb-2 text-xl font-extrabold tracking-tight text-gray-950">
            No orders logged yet
          </h2>
          <p className="mb-6 max-w-md text-sm leading-relaxed text-gray-500">
            When a customer completes a WhatsApp checkout, capture the order here and track its payment and fulfillment state.
          </p>
          <button
            type="button"
            onClick={openNewOrderForm}
            className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-sm transition-all duration-200 hover:bg-green-700"
          >
            <Plus size={16} />
            Log First Order
          </button>
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
          <section className="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm shadow-gray-100/80 md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80">
                    {['Log Date', 'Customer', 'Items', 'Total', 'Payment', 'Method', 'Fulfillment', 'Notes', 'Actions'].map(label => (
                      <th
                        key={label}
                        className="border-r border-gray-200 px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-gray-500 last:border-r-0"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map(order => (
                    <tr key={order.id} className="group border-b border-gray-100 transition-all duration-200 hover:bg-gray-50/70 last:border-b-0">
                      <td className="border-r border-gray-100 px-4 py-4 align-top">
                        <div className="flex items-start gap-2 text-xs font-semibold leading-snug text-gray-500">
                          <Calendar size={13} className="mt-0.5 flex-shrink-0 text-gray-300" />
                          {formatOrderDate(order.createdAt)}
                        </div>
                      </td>
                      <td className="border-r border-gray-100 px-4 py-4 align-top">
                        <p className="text-sm font-extrabold leading-tight text-gray-950">
                          {order.customerName || '-'}
                        </p>
                        <p className="mt-1 text-xs font-medium text-gray-400">
                          {order.customerPhone || 'No phone'}
                        </p>
                      </td>
                      <td className="border-r border-gray-100 px-4 py-4 align-top">
                        <p className="max-w-[260px] whitespace-pre-line text-sm leading-relaxed text-gray-700">
                          {order.items || '-'}
                        </p>
                      </td>
                      <td className="border-r border-gray-100 px-4 py-4 align-top">
                        <span className="whitespace-nowrap text-sm font-extrabold text-green-700">
                          {formatTotal(order.total)}
                        </span>
                      </td>
                      <td className="border-r border-gray-100 px-4 py-4 align-top">
                        <PaymentBadge status={order.paymentStatus} />
                      </td>
                      <td className="border-r border-gray-100 px-4 py-4 align-top">
                        <span className="text-xs font-bold text-gray-600">
                          <PaymentMethodLabel method={order.paymentMethod} />
                        </span>
                      </td>
                      <td className="border-r border-gray-100 px-4 py-4 align-top">
                        <StatusPicker
                          status={order.status}
                          onChange={(value) => handleInlineUpdate(order, { status: value })}
                        />
                      </td>
                      <td className="border-r border-gray-100 px-4 py-4 align-top">
                        <p className="max-w-[180px] text-xs italic leading-relaxed text-gray-400">
                          {order.notes || '-'}
                        </p>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(order)}
                            className="inline-flex items-center justify-center rounded-xl p-2 text-gray-300 opacity-0 transition-all duration-200 hover:bg-blue-50 hover:text-blue-600 group-hover:opacity-100 focus:opacity-100"
                            aria-label="Edit order"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteDialog(order)}
                            className="inline-flex items-center justify-center rounded-xl p-2 text-gray-300 opacity-0 transition-all duration-200 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 focus:opacity-100"
                            aria-label="Delete order"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3 md:hidden">
            {filteredOrders.map(order => (
              <article key={order.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-extrabold leading-tight text-gray-950">
                      {order.customerName || 'Unknown customer'}
                    </p>
                    <p className="mt-0.5 truncate text-xs font-medium text-gray-400">
                      {order.customerPhone || 'No phone'}
                    </p>
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-gray-400">
                      <Calendar size={12} className="flex-shrink-0" />
                      {formatOrderDate(order.createdAt)}
                    </div>
                  </div>
                  <StatusPicker
                    status={order.status}
                    onChange={(value) => handleInlineUpdate(order, { status: value })}
                  />
                </div>

                <div className="mb-3 rounded-xl border border-gray-100/80 bg-gray-50/50 p-3">
                  <p className="mb-1.5 flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                    <FileText size={11} />
                    Items
                  </p>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">
                    {order.items || '-'}
                  </p>
                </div>

                <div className="mb-3 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-gray-100/80 bg-gray-50/50 p-3">
                    <p className="mb-1 text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                      Total
                    </p>
                    <p className="text-sm font-extrabold text-green-700">
                      {formatTotal(order.total)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-100/80 bg-gray-50/50 p-3">
                    <p className="mb-1 text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                      Payment
                    </p>
                    <PaymentBadge status={order.paymentStatus} />
                  </div>
                  <div className="col-span-2 rounded-xl border border-gray-100/80 bg-gray-50/50 p-3">
                    <p className="mb-1 text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                      Payment Method
                    </p>
                    <p className="text-sm font-bold text-gray-700">
                      <PaymentMethodLabel method={order.paymentMethod} />
                    </p>
                  </div>
                </div>

                {order.notes && (
                  <p className="mb-3 rounded-xl border border-gray-100/80 bg-gray-50/50 p-3 text-xs italic leading-relaxed text-gray-500">
                    {order.notes}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 border-t border-gray-50 pt-3">
                  <button
                    type="button"
                    onClick={() => startEdit(order)}
                    className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold text-blue-600 transition-all duration-200 hover:bg-blue-50"
                  >
                    <Pencil size={14} />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => openDeleteDialog(order)}
                    className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold text-red-600 transition-all duration-200 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </section>
        </>
      )}

      <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4">
        <Info size={15} className="mt-0.5 flex-shrink-0 text-blue-500" />
        <p className="text-sm leading-relaxed text-blue-700">
          Orders are logged manually. When a checkout reaches your WhatsApp, record the order here and keep payment and fulfillment tracking up to date.
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
    </div>
  )
}
