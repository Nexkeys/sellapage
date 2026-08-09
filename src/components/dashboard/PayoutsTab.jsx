// src/components/dashboard/PayoutsTab.jsx
import { useState, useMemo, useEffect } from 'react'
import {
  Wallet, Info, Check, Search, Calendar, User, Package, Loader2, Landmark,
  ShieldCheck, ArrowUpRight, ArrowDownRight, ShieldAlert, Minus, ChevronDown,
  ChevronLeft, ChevronRight, Download, X, AlertTriangle,
} from 'lucide-react'
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer'

const NIGERIAN_BANKS = [
  { name: 'GTBank', code: '057' },
  { name: 'Access Bank', code: '044' },
  { name: 'Zenith Bank', code: '058' },
  { name: 'UBA', code: '033' },
  { name: 'First Bank', code: '011' },
  { name: 'Fidelity Bank', code: '070' },
  { name: 'Stanbic IBTC', code: '221' },
  { name: 'Sterling Bank', code: '232' },
  { name: 'Polaris Bank', code: '076' },
  { name: 'Kuda Bank', code: '50211' },
  { name: 'Opay', code: '999992' },
  { name: 'Moniepoint', code: '50215' },
  { name: 'Wema Bank', code: '035' },
  { name: 'Union Bank', code: '032' },
  { name: 'Ecobank', code: '050' },
  { name: 'Unity Bank', code: '215' },
  { name: 'Keystone Bank', code: '082' },
  { name: 'Heritage Bank', code: '030' },
  { name: 'Providus Bank', code: '101' },
  { name: 'Titan Trust Bank', code: '102' },
]

const SELECT_INPUT_CLASS = "w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-900 outline-none transition-all duration-200 focus:border-green-600 focus:bg-white focus:ring-4 focus:ring-green-600/10 placeholder:text-gray-400 font-medium"

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const TRANSACTIONS_PER_PAGE = 10

// Statuses that mean the money is no longer real earnings — Paystack
// captured the payment, but the vendor cancelled/refunded outside the
// platform (manual, over WhatsApp — nothing here reverses paymentStatus).
const EXCLUDED_STATUSES = new Set(['cancelled', 'refunded'])

const STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
  dispatched: 'bg-blue-50 text-blue-700 border-blue-200',
  in_transit: 'bg-blue-50 text-blue-700 border-blue-200',
  delivered: 'bg-green-50 text-green-700 border-green-200',
  in_progress: 'bg-violet-50 text-violet-700 border-violet-200',
  rescheduled: 'bg-purple-50 text-purple-700 border-purple-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
  no_show: 'bg-orange-50 text-orange-700 border-orange-200',
  refunded: 'bg-slate-100 text-slate-700 border-slate-200',
}

function getStatusStyle(status) {
  return STATUS_STYLES[status] || 'bg-gray-50 text-gray-600 border-gray-200'
}

function getStatusLabel(status) {
  if (!status) return 'Pending'
  return status.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function toDateSafe(value) {
  if (!value) return new Date(0)
  const d = value?.toDate ? value.toDate() : new Date(value)
  return Number.isNaN(d.getTime()) ? new Date(0) : d
}

function formatNaira(amount) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(Number(amount) || 0)
}

function formatCurrencyPDF(amount) {
  return 'NGN ' + Number(amount || 0).toLocaleString('en-NG')
}

function formatDate(date) {
  if (!date) return ''
  return toDateSafe(date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ---------------------------------------------------------------- PDF export

const pdfStyles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica' },
  header: { marginBottom: 24 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { fontSize: 18, fontFamily: 'Helvetica-Bold' },
  subtitle: { fontSize: 10, color: '#6b7280' },
  dateRange: { fontSize: 9, color: '#2563eb', marginTop: 2 },
  summaryRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  summaryBox: { flex: 1, backgroundColor: '#f9fafb', borderRadius: 6, padding: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  summaryLabel: { fontSize: 8, color: '#6b7280', marginBottom: 2 },
  summaryValue: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#111827' },
  table: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 4 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  tableRowLast: { flexDirection: 'row' },
  th: { padding: '6 4', fontFamily: 'Helvetica-Bold', fontSize: 7, color: '#374151' },
  td: { padding: '6 4', fontSize: 8, color: '#374151' },
  colDate: { width: '13%' },
  colType: { width: '11%' },
  colCustomer: { width: '18%' },
  colItem: { width: '25%' },
  colAmount: { width: '15%' },
  colStatus: { width: '18%' },
  textRight: { textAlign: 'right' },
  statusPill: { fontSize: 6, padding: '2 3', borderRadius: 3, fontFamily: 'Helvetica-Bold' },
  footer: { marginTop: 16, fontSize: 8, color: '#9ca3af', textAlign: 'center' },
})

function PayoutsPDF({ transactions, storeName, dateRange }) {
  const totalAmount = transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0)
  const generatedDate = new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })

  const dateRangeText = (() => {
    if (!dateRange) return null
    const fromLabel = dateRange.from === 'earliest' ? null : new Date(dateRange.from).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
    const toLabel = dateRange.to === 'latest' ? null : new Date(dateRange.to).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
    if (fromLabel && toLabel) return `${fromLabel} – ${toLabel}`
    if (fromLabel) return `From ${fromLabel}`
    if (toLabel) return `Up to ${toLabel}`
    return null
  })()

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <View style={pdfStyles.titleRow}>
            <Text style={pdfStyles.title}>{storeName ? storeName + ' — Payouts' : 'Payouts Report'}</Text>
            <Text style={pdfStyles.subtitle}>Generated {generatedDate}</Text>
          </View>
          {dateRangeText && <Text style={pdfStyles.dateRange}>{dateRangeText}</Text>}
          <View style={pdfStyles.summaryRow}>
            <View style={pdfStyles.summaryBox}>
              <Text style={pdfStyles.summaryLabel}>TOTAL TRANSACTIONS</Text>
              <Text style={pdfStyles.summaryValue}>{transactions.length}</Text>
            </View>
            <View style={pdfStyles.summaryBox}>
              <Text style={pdfStyles.summaryLabel}>TOTAL AMOUNT</Text>
              <Text style={pdfStyles.summaryValue}>{formatCurrencyPDF(totalAmount)}</Text>
            </View>
          </View>
        </View>
        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableHeader}>
            <Text style={[pdfStyles.th, pdfStyles.colDate]}>Date</Text>
            <Text style={[pdfStyles.th, pdfStyles.colType]}>Type</Text>
            <Text style={[pdfStyles.th, pdfStyles.colCustomer]}>Customer</Text>
            <Text style={[pdfStyles.th, pdfStyles.colItem]}>Item / Service</Text>
            <Text style={[pdfStyles.th, pdfStyles.colAmount, pdfStyles.textRight]}>Amount</Text>
            <Text style={[pdfStyles.th, pdfStyles.colStatus]}>Status</Text>
          </View>
          {transactions.map((t, idx) => (
            <View key={t.id} style={idx === transactions.length - 1 ? pdfStyles.tableRowLast : pdfStyles.tableRow}>
              <Text style={[pdfStyles.td, pdfStyles.colDate]}>{formatDate(t.date)}</Text>
              <Text style={[pdfStyles.td, pdfStyles.colType]}>{t.kind === 'booking' ? 'Booking' : 'Product'}</Text>
              <Text style={[pdfStyles.td, pdfStyles.colCustomer]}>{t.customerName}</Text>
              <Text style={[pdfStyles.td, pdfStyles.colItem]}>{t.label}</Text>
              <Text style={[pdfStyles.td, pdfStyles.colAmount, pdfStyles.textRight]}>{formatCurrencyPDF(t.amount)}</Text>
              <Text style={[pdfStyles.td, pdfStyles.colStatus]}>{getStatusLabel(t.status)}</Text>
            </View>
          ))}
        </View>
        <Text style={pdfStyles.footer}>Generated via Sellapage</Text>
      </Page>
    </Document>
  )
}

function buildPdfFileName(startDate, endDate) {
  if (startDate && endDate) {
    const from = new Date(startDate)
    const to = new Date(endDate)
    const fromStr = from.toLocaleDateString('en-NG', { month: 'short' }).toLowerCase().replace('.', '') + '-' + from.getFullYear()
    const toStr = to.toLocaleDateString('en-NG', { month: 'short' }).toLowerCase().replace('.', '') + '-' + to.getFullYear()
    return `payouts_${fromStr}_${toStr}.pdf`
  }
  return `payouts_${new Date().toISOString().split('T')[0]}.pdf`
}

// ----------------------------------------------------------------------

export default function PayoutsTab({ store, orders, ordersLoading, bookings, bookingsLoading, user, onSubaccountCreated }) {
  const [bankForm, setBankForm] = useState({
    bankCode: '',
    accountNumber: '',
    businessName: store?.businessName || '',
  })
  const [bankSubmitting, setBankSubmitting] = useState(false)
  const [bankError, setBankError] = useState('')
  const [bankSuccess, setBankSuccess] = useState(false)
  const [localAccountNumber, setLocalAccountNumber] = useState('')
  const [localBankName, setLocalBankName] = useState('')
  const [resolvedAccountName, setResolvedAccountName] = useState('')
  const [resolveLoading, setResolveLoading] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [filterMonth, setFilterMonth] = useState('all')
  const [filterYear, setFilterYear] = useState('all')
  const [viewMode, setViewMode] = useState('all') // 'all' | 'earnings' | 'excluded'
  const [currentPage, setCurrentPage] = useState(1)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [pdfStartDate, setPdfStartDate] = useState('')
  const [pdfEndDate, setPdfEndDate] = useState('')

  const tryResolveAccount = async (accountNumber, bankCode) => {
    setResolvedAccountName('')
    if (!accountNumber || accountNumber.length !== 10 || !bankCode) return
    setResolveLoading(true)
    try {
      // resolve-account is authenticated and rate-limited now — it used to be
      // an open proxy to Paystack's bank-name lookup, callable by anyone.
      const idToken = await user?.getIdToken()
      const res = await fetch('/api/resolve-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ accountNumber, bankCode }),
      })
      const data = await res.json()
      if (res.ok && data.accountName) {
        setResolvedAccountName(data.accountName)
      } else {
        setResolvedAccountName('')
      }
    } catch {
      setResolvedAccountName('')
    } finally {
      setResolveLoading(false)
    }
  }

  const handleBankSubmit = async (e) => {
    e.preventDefault()
    setBankSubmitting(true)
    setBankError('')

    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/create-subaccount', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          storeId: store.id,
          bankCode: bankForm.bankCode,
          accountNumber: bankForm.accountNumber,
          businessName: bankForm.businessName,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect bank account')
      }

      setBankSuccess(true)
      setLocalAccountNumber(bankForm.accountNumber)
      const selectedBank = NIGERIAN_BANKS.find(b => b.code === bankForm.bankCode)?.name || ''
      setLocalBankName(selectedBank)

      if (onSubaccountCreated && data.subaccountCode) {
        onSubaccountCreated({
          subaccountCode: data.subaccountCode,
          payoutBankName: data.payoutBankName || selectedBank,
          payoutAccountNumberMasked: data.payoutAccountNumberMasked || maskAccountNumber(bankForm.accountNumber),
        })
      }
    } catch (err) {
      setBankError(err.message)
    } finally {
      setBankSubmitting(false)
    }
  }

  const handleAccountNumberChange = (raw) => {
    const value = raw.replace(/\D/g, '').slice(0, 10)
    setBankForm({ ...bankForm, accountNumber: value })
    setResolvedAccountName('')
    if (value.length === 10 && bankForm.bankCode) {
      tryResolveAccount(value, bankForm.bankCode)
    }
  }

  const handleBankCodeChange = (code) => {
    setBankForm({ ...bankForm, bankCode: code })
    setResolvedAccountName('')
    if (bankForm.accountNumber.length === 10 && code) {
      tryResolveAccount(bankForm.accountNumber, code)
    }
  }

  const maskAccountNumber = (number) => {
    if (!number || number.length < 4) return number
    return '*'.repeat(number.length - 4) + number.slice(-4)
  }

  // ---------------------------------------------------------- transactions

  const transactions = useMemo(() => {
    const productTx = (orders || [])
      .filter((o) => o.orderType === 'checkout' && o.paymentStatus === 'paid')
      .map((o) => ({
        id: o.id,
        kind: 'product',
        date: o.createdAt,
        customerName: o.customerName || '',
        label: o.items || '',
        amount: Number(o.grandTotal || 0),
        status: o.status || 'pending',
        reference: o.paystackReference || o.id,
      }))
    const bookingTx = (bookings || [])
      .filter((b) => b.paymentStatus === 'paid')
      .map((b) => ({
        id: b.id,
        kind: 'booking',
        date: b.createdAt,
        customerName: b.customerName || '',
        label: b.serviceName || '',
        amount: Number(b.grandTotal || 0),
        status: b.status || 'pending',
        reference: b.paystackReference || b.id,
      }))
    return [...productTx, ...bookingTx].sort((a, b) => toDateSafe(b.date) - toDateSafe(a.date))
  }, [orders, bookings])

  const earningsTransactions = useMemo(
    () => transactions.filter((t) => !EXCLUDED_STATUSES.has(t.status)),
    [transactions],
  )
  const excludedTransactions = useMemo(
    () => transactions.filter((t) => EXCLUDED_STATUSES.has(t.status)),
    [transactions],
  )

  const totalEarnings = useMemo(
    () => earningsTransactions.reduce((sum, t) => sum + t.amount, 0),
    [earningsTransactions],
  )
  const excludedTotal = useMemo(
    () => excludedTransactions.reduce((sum, t) => sum + t.amount, 0),
    [excludedTransactions],
  )

  const pendingSettlement = useMemo(() => {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    return earningsTransactions
      .filter((t) => toDateSafe(t.date) >= twentyFourHoursAgo)
      .reduce((sum, t) => sum + t.amount, 0)
  }, [earningsTransactions])

  const availableYears = useMemo(() => {
    const years = [...new Set(transactions.map((t) => toDateSafe(t.date).getFullYear()))]
    return years.sort((a, b) => b - a)
  }, [transactions])

  // Period summary — defaults to current month, responds to filterMonth/filterYear,
  // shows a trend vs the equivalent prior period. Mirrors LedgerTab's activePeriodSummary.
  const periodSummary = useMemo(() => {
    const now = new Date()
    const targetYear = filterYear !== 'all' ? Number(filterYear) : now.getFullYear()
    const targetMonth = filterMonth !== 'all' ? Number(filterMonth) : (filterYear !== 'all' ? null : now.getMonth())

    const inPeriod = (t) => {
      const d = toDateSafe(t.date)
      if (targetMonth !== null) return d.getMonth() === targetMonth && d.getFullYear() === targetYear
      return d.getFullYear() === targetYear
    }
    const periodTx = earningsTransactions.filter(inPeriod)
    const periodAmount = periodTx.reduce((sum, t) => sum + t.amount, 0)

    let prevMonth = targetMonth
    let prevYear = targetYear
    if (targetMonth !== null) {
      prevMonth = targetMonth - 1
      prevYear = targetYear
      if (prevMonth < 0) { prevMonth = 11; prevYear-- }
    } else {
      prevYear = targetYear - 1
    }
    const inPrevPeriod = (t) => {
      const d = toDateSafe(t.date)
      if (targetMonth !== null) return d.getMonth() === prevMonth && d.getFullYear() === prevYear
      return d.getFullYear() === prevYear
    }
    const prevAmount = earningsTransactions.filter(inPrevPeriod).reduce((sum, t) => sum + t.amount, 0)

    const trend = prevAmount === 0
      ? (periodAmount > 0 ? { pct: 100, up: true } : null)
      : { pct: Math.abs(Math.round(((periodAmount - prevAmount) / prevAmount) * 100)), up: periodAmount >= prevAmount }

    return {
      amount: periodAmount,
      count: periodTx.length,
      trend,
      label: targetMonth !== null ? `Revenue in ${MONTHS[targetMonth]} ${targetYear}` : `Revenue in ${targetYear}`,
    }
  }, [earningsTransactions, filterMonth, filterYear])

  const segmentedTransactions = useMemo(() => {
    if (viewMode === 'earnings') return earningsTransactions
    if (viewMode === 'excluded') return excludedTransactions
    return transactions
  }, [viewMode, transactions, earningsTransactions, excludedTransactions])

  const filteredTransactions = useMemo(() => {
    return segmentedTransactions.filter((t) => {
      if (filterMonth !== 'all' && toDateSafe(t.date).getMonth() !== Number(filterMonth)) return false
      if (filterYear !== 'all' && toDateSafe(t.date).getFullYear() !== Number(filterYear)) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const idMatch = (t.id || '').substring(0, 8).toLowerCase().includes(q)
        const nameMatch = (t.customerName || '').toLowerCase().includes(q)
        if (!idMatch && !nameMatch) return false
      }
      return true
    })
  }, [segmentedTransactions, filterMonth, filterYear, searchQuery])

  useEffect(() => {
    setCurrentPage(1)
  }, [viewMode, filterMonth, filterYear, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / TRANSACTIONS_PER_PAGE))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const paginatedTransactions = filteredTransactions.slice(
    (safeCurrentPage - 1) * TRANSACTIONS_PER_PAGE,
    safeCurrentPage * TRANSACTIONS_PER_PAGE,
  )

  const getFilterLabel = () => {
    const base = viewMode === 'earnings' ? 'Earnings' : viewMode === 'excluded' ? 'Cancelled & Refunded' : 'All'
    if (filterMonth === 'all' && filterYear === 'all') return `${base} Transactions`
    const parts = []
    if (filterMonth !== 'all') parts.push(MONTHS[Number(filterMonth)])
    if (filterYear !== 'all') parts.push(filterYear)
    return `${base} · ${parts.join(' ')}`
  }

  const handleDownloadCSV = () => {
    const headers = ['Date', 'Type', 'Reference', 'Customer', 'Item/Service', 'Amount (NGN)', 'Status']
    const rows = filteredTransactions.map((t) => [
      formatDate(t.date),
      t.kind === 'booking' ? 'Booking' : 'Product',
      t.reference,
      t.customerName,
      t.label,
      t.amount,
      getStatusLabel(t.status),
    ])
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `payouts_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const getFilteredPdfTransactions = () => {
    let result = [...transactions]
    if (pdfStartDate) result = result.filter((t) => toDateSafe(t.date) >= new Date(pdfStartDate))
    if (pdfEndDate) result = result.filter((t) => toDateSafe(t.date) <= new Date(`${pdfEndDate}T23:59:59`))
    return result
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">

      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-green-600">Finances & Settlements</p>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">Payouts</h1>
          <p className="mt-0.5 text-xs text-gray-400 sm:text-sm">Combined product order and service booking revenue, in one place.</p>
        </div>
      </div>

      {/* SECTION 1: Bank Account Identity Profile Setup */}
      {!store?.subaccountCode ? (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm shadow-gray-100/40">
          <div className="border-b border-gray-100 bg-gray-50/50 px-5 py-4">
            <h2 className="text-sm font-bold text-gray-900">Connect Your Settlement Vault</h2>
            <p className="text-[11px] text-gray-400">Link your verified Nigerian banking terminal to receive instant automated revenue payouts.</p>
          </div>

          <div className="p-5">
            {bankSuccess ? (
              <div className="flex items-center gap-4 rounded-xl border border-green-100 bg-green-50/50 p-4">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-600">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <p className="text-sm font-bold text-green-900">Settlement Destination Locked</p>
                  <p className="text-xs font-semibold text-green-600 mt-0.5">Account verified ending in {maskAccountNumber(bankForm.accountNumber)}</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleBankSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-600">Bank Operator</label>
                    <select
                      value={bankForm.bankCode}
                      onChange={(e) => handleBankCodeChange(e.target.value)}
                      className={SELECT_INPUT_CLASS}
                      required
                    >
                      <option value="">Select your institution</option>
                      {NIGERIAN_BANKS.map((bank) => (
                        <option key={bank.code} value={bank.code}>
                          {bank.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-600">NUBAN Account Number</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={bankForm.accountNumber}
                        onChange={(e) => handleAccountNumberChange(e.target.value)}
                        placeholder="10-digit account number"
                        className={SELECT_INPUT_CLASS}
                        required
                      />
                      {resolveLoading && (
                        <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1 text-[10px] font-bold text-gray-500">
                          <Loader2 size={11} className="animate-spin" /> Verifying
                        </div>
                      )}
                    </div>
                    {!resolveLoading && resolvedAccountName && (
                      <div className="mt-1.5 flex items-center gap-1 text-xs font-bold text-green-600">
                        <Check size={12} strokeWidth={3} /> {resolvedAccountName}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-600">KYC Legal Business Name</label>
                  <input
                    type="text"
                    value={bankForm.businessName}
                    onChange={(e) => setBankForm({ ...bankForm, businessName: e.target.value })}
                    className={SELECT_INPUT_CLASS}
                    required
                  />
                </div>

                {bankError && (
                  <div className="rounded-xl border border-red-100 bg-red-50/60 p-3.5 text-xs font-semibold text-red-600">
                    {bankError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={bankSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-green-700 active:scale-[0.99] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {bankSubmitting ? (
                    <><Loader2 size={16} className="animate-spin" /> Provisioning Secure Route...</>
                  ) : (
                    'Initialize Bank Integration'
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm shadow-gray-100/40">
          <div className="p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-green-100 bg-green-50 text-green-600 shadow-sm shadow-green-100/30">
                  <Wallet size={22} />
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-black tracking-tight text-gray-900">Settlement Vault Active</h2>
                    <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-[10px] font-bold text-green-700 border border-green-100">
                      Connected
                    </span>
                  </div>
                  <p className="text-xs font-bold text-gray-700 truncate" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {(localAccountNumber || store?.payoutAccountNumberMasked)
                      ? `Account ending in ${maskAccountNumber(localAccountNumber || store?.payoutAccountNumberMasked || '')}`
                      : 'Account connected'}
                  </p>
                  {(localBankName || store?.payoutBankName) && (
                    <p className="text-[11px] font-semibold text-gray-400 flex items-center gap-1">
                      <Landmark size={11} /> {localBankName || store?.payoutBankName}
                    </p>
                  )}

                  {store?.payoutsVerified ? (
                    <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-green-100 bg-green-50/50 px-3 py-1.5 text-xs font-bold text-green-800">
                      <ShieldCheck size={14} className="text-green-600" />
                      Live Channels Verified
                    </div>
                  ) : (
                    <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50/40 p-3">
                      <ShieldAlert size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] font-medium leading-relaxed text-amber-800">
                        Account provisioning takes 6 - 12 hours (often instant). Please safely perform a test store checkout after this timeframe.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => window.open('https://wa.me/2348120525256?text=Hello%20Sellapage%20Team%2C%20I%20need%20to%20update%20my%20payout%20bank%20details%20for%20my%20store.', '_blank', 'noopener,noreferrer')}
                className="w-full text-center sm:w-auto flex-shrink-0 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-50 active:bg-gray-100/50"
              >
                Modify Account Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: Metrics Cards */}
      {store?.subaccountCode && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-gradient-to-b from-white to-gray-50/30 p-4 shadow-sm shadow-gray-100/40 sm:p-5">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="text-[10px] font-bold tracking-wide uppercase text-gray-400 sm:text-xs">Total Net Earnings</span>
              <span className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-600">
                <ArrowUpRight size={14} />
              </span>
            </div>
            <p className="text-lg font-black text-gray-900 tracking-tight sm:text-2xl" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {(ordersLoading || bookingsLoading) ? '...' : formatNaira(totalEarnings)}
            </p>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-1.5 sm:text-[10px]">
              All-Time · Products + Bookings
            </p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-gradient-to-b from-white to-gray-50/30 p-4 shadow-sm shadow-gray-100/40 sm:p-5">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="text-[10px] font-bold tracking-wide uppercase text-gray-400 sm:text-xs">{periodSummary.label}</span>
              <span className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Calendar size={13} />
              </span>
            </div>
            <p className="text-lg font-black text-gray-900 tracking-tight sm:text-2xl" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {(ordersLoading || bookingsLoading) ? '...' : formatNaira(periodSummary.amount)}
            </p>
            {!ordersLoading && !bookingsLoading && periodSummary.trend ? (
              <div className={`mt-1.5 inline-flex items-center gap-0.5 text-[9px] font-bold sm:text-[10px] ${periodSummary.trend.up ? 'text-green-600' : 'text-red-500'}`}>
                {periodSummary.trend.up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                {periodSummary.trend.pct}% vs prior period
              </div>
            ) : (
              <div className="mt-1.5 inline-flex items-center gap-0.5 text-[9px] font-bold text-gray-400 sm:text-[10px]">
                <Minus size={10} /> No prior data
              </div>
            )}
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-gradient-to-b from-white to-gray-50/30 p-4 shadow-sm shadow-gray-100/40 sm:p-5">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="text-[10px] font-bold tracking-wide uppercase text-gray-400 sm:text-xs">Pending Settlement</span>
              <span className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Loader2 size={13} className="animate-spin" />
              </span>
            </div>
            <p className="text-lg font-black text-gray-900 tracking-tight sm:text-2xl" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {(ordersLoading || bookingsLoading) ? '...' : formatNaira(pendingSettlement)}
            </p>
            <p className="text-[9px] font-bold text-amber-600 uppercase tracking-wider mt-1.5 sm:text-[10px]">
              Processing Last 24 Hours
            </p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-red-100 bg-gradient-to-b from-red-50/40 to-white p-4 shadow-sm shadow-gray-100/40 sm:p-5">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="text-[10px] font-bold tracking-wide uppercase text-red-500 sm:text-xs">Excluded</span>
              <span className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
                <AlertTriangle size={13} />
              </span>
            </div>
            <p className="text-lg font-black text-gray-900 tracking-tight sm:text-2xl" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {(ordersLoading || bookingsLoading) ? '...' : formatNaira(excludedTotal)}
            </p>
            <p className="text-[9px] font-bold text-red-500 uppercase tracking-wider mt-1.5 sm:text-[10px]">
              {excludedTransactions.length} Cancelled / Refunded
            </p>
          </div>
        </div>
      )}

      {/* SECTION 3: Transaction History */}
      {store?.subaccountCode && (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm shadow-gray-100/40">
          <div className="border-b border-gray-100 px-5 py-4 space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900">{getFilterLabel()}</h2>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {(ordersLoading || bookingsLoading) ? 'Compiling ledger receipts...' : `${filteredTransactions.length} transaction${filteredTransactions.length !== 1 ? 's' : ''}`}
                </p>
              </div>

              {/* Segmented All / Earnings / Excluded toggle */}
              <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1 self-start sm:self-auto">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'earnings', label: 'Earnings' },
                  { id: 'excluded', label: 'Cancelled & Refunded' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setViewMode(opt.id)}
                    className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold whitespace-nowrap transition-all sm:text-xs ${viewMode === opt.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name or reference..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-9 pr-4 py-2 text-xs text-gray-900 outline-none transition-all focus:border-green-600 focus:bg-white focus:ring-4 focus:ring-green-600/10 placeholder:text-gray-400 font-medium"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <select
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                    className="appearance-none rounded-xl border border-gray-200 bg-gray-50 pl-3 pr-8 py-2 text-xs font-semibold text-gray-700 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all cursor-pointer"
                  >
                    <option value="all">All Months</option>
                    {MONTHS.map((m, i) => (
                      <option key={i} value={i}>{m}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                <div className="relative">
                  <select
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    className="appearance-none rounded-xl border border-gray-200 bg-gray-50 pl-3 pr-8 py-2 text-xs font-semibold text-gray-700 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all cursor-pointer"
                  >
                    <option value="all">All Years</option>
                    {availableYears.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                {(filterMonth !== 'all' || filterYear !== 'all') && (
                  <button
                    type="button"
                    onClick={() => { setFilterMonth('all'); setFilterYear('all') }}
                    className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 transition-all"
                  >
                    <X size={12} /> Clear
                  </button>
                )}
                {transactions.length > 0 && (
                  <>
                    <button type="button" onClick={handleDownloadCSV} className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all">
                      <Download size={13} /> CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPdfStartDate(''); setPdfEndDate(''); setShowPdfModal(true) }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all"
                    >
                      <Download size={13} /> PDF
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {(ordersLoading || bookingsLoading) ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
              <Loader2 className="w-6 h-6 text-green-600 animate-spin" />
              <p className="text-xs font-semibold text-gray-400">Compiling ledger receipts...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 border border-gray-100/60 text-gray-300">
                <Wallet size={20} strokeWidth={1.5} />
              </div>
              <p className="text-xs font-bold text-gray-700">No matching entries recorded</p>
              <p className="text-[11px] text-gray-400 mt-0.5 max-w-[240px]">Try a different search term, filter, or view.</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Date</th>
                      <th className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Type</th>
                      <th className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Customer</th>
                      <th className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Item / Service</th>
                      <th className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-gray-400 text-right">Amount</th>
                      <th className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-gray-400 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paginatedTransactions.map((t) => (
                      <tr key={`${t.kind}-${t.id}`} className="hover:bg-gray-50/40 transition-colors group">
                        <td className="px-5 py-3.5 text-xs font-medium text-gray-400 whitespace-nowrap">{formatDate(t.date)}</td>
                        <td className="px-5 py-3.5 text-xs font-semibold text-gray-600 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5">
                            {t.kind === 'booking' ? <Calendar size={11} className="text-purple-500" /> : <Package size={11} className="text-blue-500" />}
                            {t.kind === 'booking' ? 'Booking' : 'Product'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs font-bold text-gray-900 max-w-[140px] truncate">{t.customerName}</td>
                        <td className="px-5 py-3.5 text-xs text-gray-500 max-w-xs truncate font-medium">{t.label}</td>
                        <td className="px-5 py-3.5 text-xs font-black text-gray-900 text-right whitespace-nowrap" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatNaira(t.amount)}</td>
                        <td className="px-5 py-3.5 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border ${getStatusStyle(t.status)}`}>
                            {getStatusLabel(t.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden divide-y divide-gray-100">
                {paginatedTransactions.map((t) => (
                  <div key={`${t.kind}-${t.id}`} className="p-4 space-y-2.5 bg-white hover:bg-gray-50/30 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500">
                        {t.kind === 'booking' ? <Calendar size={11} className="text-purple-500" /> : <Package size={11} className="text-blue-500" />}
                        {t.kind === 'booking' ? 'Booking' : 'Product'}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-bold border ${getStatusStyle(t.status)}`}>
                        {getStatusLabel(t.status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
                      <User size={13} className="text-gray-400 flex-shrink-0" />
                      <span className="truncate">{t.customerName}</span>
                    </div>
                    <div className="flex items-start gap-1.5 text-xs text-gray-500 font-medium">
                      <span className="line-clamp-1 break-all">{t.label}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-50 mt-1">
                      <div className="flex items-center gap-1 text-[10px] text-gray-400 font-semibold">
                        <Calendar size={11} />
                        <span>{formatDate(t.date)}</span>
                      </div>
                      <span className="text-sm font-black text-gray-900 tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatNaira(t.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3.5 border-t border-gray-100 bg-gray-50/40">
                  <p className="text-[11px] text-gray-400">
                    {((safeCurrentPage - 1) * TRANSACTIONS_PER_PAGE) + 1}–{Math.min(safeCurrentPage * TRANSACTIONS_PER_PAGE, filteredTransactions.length)} of {filteredTransactions.length}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={safeCurrentPage === 1}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-bold text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronLeft size={13} /> Prev
                    </button>
                    <span className="text-xs font-bold text-gray-500 px-1">{safeCurrentPage} / {totalPages}</span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safeCurrentPage === totalPages}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-bold text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      Next <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* SECTION 4: Compliance Banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 shadow-sm shadow-blue-50/20">
        <Info size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="text-xs font-extrabold text-blue-900 uppercase tracking-wide">Automated Escrow Protocol</p>
          <p className="text-xs leading-relaxed text-blue-800 font-medium">
            Your revenue balances are securely processed and automatically pushed straight into your linked bank account every consecutive business day via Paystack architecture nodes. No secondary action required.
          </p>
        </div>
      </div>

      {/* PDF Date Range Modal */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowPdfModal(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white border border-gray-200 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Export PDF</h3>
                <p className="text-[11px] text-gray-400">Select a date range (optional)</p>
              </div>
              <button type="button" onClick={() => setShowPdfModal(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-gray-700">From</label>
                  <input type="date" value={pdfStartDate} onChange={(e) => setPdfStartDate(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-gray-700">To</label>
                  <input type="date" value={pdfEndDate} onChange={(e) => setPdfEndDate(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20" />
                </div>
              </div>
              <p className="text-[10px] text-gray-400">Leave empty to export all transactions (both earnings and excluded). Currently {getFilteredPdfTransactions().length} transactions.</p>
              <div className="flex items-center gap-3 pt-1">
                <button type="button" onClick={() => setShowPdfModal(false)} className="flex-1 rounded-xl border border-gray-200 px-5 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all">
                  Cancel
                </button>
                <PDFDownloadLink
                  document={
                    <PayoutsPDF
                      transactions={getFilteredPdfTransactions()}
                      storeName={store?.businessName || ''}
                      dateRange={(pdfStartDate || pdfEndDate) ? { from: pdfStartDate || 'earliest', to: pdfEndDate || 'latest' } : null}
                    />
                  }
                  fileName={buildPdfFileName(pdfStartDate, pdfEndDate)}
                  onClick={() => setTimeout(() => setShowPdfModal(false), 500)}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-green-700 transition-all"
                >
                  {({ loading }) => loading ? 'Generating...' : <><Download size={13} /> Generate PDF</>}
                </PDFDownloadLink>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
