//src/components/dashboard/LedgerTab.jsx/
import { useState, useMemo, useEffect } from 'react'
import { Trash2, Plus, Download, FileText, BookOpen, Search, X, Pencil, Check, ChevronLeft, ChevronRight, Calendar, TrendingUp, ArrowUpRight, ArrowDownRight, Minus, ChevronDown, Loader2 } from 'lucide-react'
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer'

// Firebase Cloud Sync Imports
import { db } from '../../firebase/config'
import { useAuth } from '../../hooks/useAuth'
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'

const INPUT_CLASS = 'w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-all duration-200 placeholder:text-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/20'

const ENTRIES_PER_PAGE = 10

const STATUS_OPTIONS = ['Paid', 'Pending', 'Partial']

const STATUS_STYLES = {
  Paid: 'bg-green-50 text-green-700 border-green-200',
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  Partial: 'bg-red-50 text-red-700 border-red-200',
}

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]

function formatNaira(amount) {
  return '\u20A6' + Number(amount || 0).toLocaleString('en-NG')
}

function formatCurrencyPDF(amount) {
  return 'NGN ' + Number(amount || 0).toLocaleString('en-NG')
}

function formatDateDisplay(dateStr) {
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

function buildPdfFileName(startDate, endDate) {
  if (startDate && endDate) {
    const from = new Date(startDate)
    const to = new Date(endDate)
    const fromStr = from.toLocaleDateString('en-NG', { month: 'short' }).toLowerCase().replace('.', '') + '-' + from.getFullYear()
    const toStr = to.toLocaleDateString('en-NG', { month: 'short' }).toLowerCase().replace('.', '') + '-' + to.getFullYear()
    return `ledger_${fromStr}_${toStr}.pdf`
  }
  if (startDate) {
    const from = new Date(startDate)
    const fromStr = from.toLocaleDateString('en-NG', { month: 'short' }).toLowerCase().replace('.', '') + '-' + from.getFullYear()
    return `ledger_${fromStr}_onwards.pdf`
  }
  if (endDate) {
    const to = new Date(endDate)
    const toStr = to.toLocaleDateString('en-NG', { month: 'short' }).toLowerCase().replace('.', '') + '-' + to.getFullYear()
    return `ledger_up-to_${toStr}.pdf`
  }
  return `ledger_${new Date().toISOString().split('T')[0]}.pdf`
}

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
  colDate: { width: '11%' },
  colCustomer: { width: '16%' },
  colItem: { width: '20%' },
  colAmount: { width: '12%' },
  colStatus: { width: '9%' },
  colBalance: { width: '12%' },
  colNotes: { width: '12%' },
  textRight: { textAlign: 'right' },
  statusPill: { fontSize: 6, padding: '2 3', borderRadius: 3, fontFamily: 'Helvetica-Bold' },
  statusPaid: { backgroundColor: '#dcfce7', color: '#166534' },
  statusPending: { backgroundColor: '#fef3c7', color: '#92400e' },
  statusPartial: { backgroundColor: '#fee2e2', color: '#991b1b' },
  footer: { marginTop: 16, fontSize: 8, color: '#9ca3af', textAlign: 'center' },
})

function LedgerPDF({ entries, storeName, dateRange }) {
  let running = 0
  const totalAmount = entries.reduce((sum, e) => sum + Number(e.amount || 0), 0)
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

  const getStatusStyle = (status) => {
    if (status === 'Pending') return pdfStyles.statusPending
    if (status === 'Partial') return pdfStyles.statusPartial
    return pdfStyles.statusPaid
  }

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <View style={pdfStyles.titleRow}>
            <Text style={pdfStyles.title}>{storeName ? storeName + ' — Ledger' : 'Ledger Report'}</Text>
            <Text style={pdfStyles.subtitle}>Generated {generatedDate}</Text>
          </View>
          {dateRangeText && (
            <Text style={pdfStyles.dateRange}>{dateRangeText}</Text>
          )}
          <View style={pdfStyles.summaryRow}>
            <View style={pdfStyles.summaryBox}>
              <Text style={pdfStyles.summaryLabel}>TOTAL ENTRIES</Text>
              <Text style={pdfStyles.summaryValue}>{entries.length}</Text>
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
            <Text style={[pdfStyles.th, pdfStyles.colCustomer]}>Customer</Text>
            <Text style={[pdfStyles.th, pdfStyles.colItem]}>Item / Service</Text>
            <Text style={[pdfStyles.th, pdfStyles.colAmount, pdfStyles.textRight]}>Amount</Text>
            <Text style={[pdfStyles.th, pdfStyles.colStatus]}>Status</Text>
            <Text style={[pdfStyles.th, pdfStyles.colBalance, pdfStyles.textRight]}>Balance</Text>
            <Text style={[pdfStyles.th, pdfStyles.colNotes]}>Notes</Text>
          </View>
          {entries.map((entry, idx) => {
            running += Number(entry.amount || 0)
            const statusKey = entry.status || 'Paid'
            return (
              <View key={entry.id} style={idx === entries.length - 1 ? pdfStyles.tableRowLast : pdfStyles.tableRow}>
                <Text style={[pdfStyles.td, pdfStyles.colDate]}>{formatDateDisplay(entry.date)}</Text>
                <Text style={[pdfStyles.td, pdfStyles.colCustomer]}>{entry.customerName}</Text>
                <Text style={[pdfStyles.td, pdfStyles.colItem]}>{entry.itemName}</Text>
                <Text style={[pdfStyles.td, pdfStyles.colAmount, pdfStyles.textRight]}>{formatCurrencyPDF(entry.amount)}</Text>
                <Text style={[pdfStyles.statusPill, getStatusStyle(statusKey), pdfStyles.colStatus]}>{statusKey}</Text>
                <Text style={[pdfStyles.td, pdfStyles.colBalance, pdfStyles.textRight]}>{formatCurrencyPDF(running)}</Text>
                <Text style={[pdfStyles.td, pdfStyles.colNotes]}>{entry.notes || '-'}</Text>
              </View>
            )
          })}
        </View>
        <Text style={pdfStyles.footer}>My Store Ledger</Text>
      </Page>
    </Document>
  )
}

const EMPTY_FORM = {
  customerName: '',
  itemName: '',
  amount: '',
  date: new Date().toISOString().split('T')[0],
  notes: '',
  status: 'Paid',
}

export default function LedgerTab({ store }) {
  const { user } = useAuth()
  const [entries, setEntries] = useState([])
  const [loadingEntries, setLoadingEntries] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [formError, setFormError] = useState('')
  const [filterMonth, setFilterMonth] = useState('all')
  const [filterYear, setFilterYear] = useState('all')
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [pdfStartDate, setPdfStartDate] = useState('')
  const [pdfEndDate, setPdfEndDate] = useState('')

  // Firestore Real-time Sync
  useEffect(() => {
    if (!user?.uid) return

    const ledgerRef = collection(db, 'stores', user.uid, 'ledger')
    const unsubscribe = onSnapshot(ledgerRef, (snapshot) => {
      const liveData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setEntries(liveData)
      setLoadingEntries(false)
    }, (error) => {
      console.error("Firestore Ledger Sync Error: ", error)
      setLoadingEntries(false)
    })

    return () => unsubscribe()
  }, [user?.uid])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterMonth, filterYear])

  // DYNAMIC SUMMARY — responds to active filter, not hardcoded to today
  const activePeriodSummary = useMemo(() => {
    if (filterMonth !== 'all' || filterYear !== 'all') {
      const targetYear = filterYear !== 'all' ? Number(filterYear) : new Date().getFullYear()
      const targetMonth = filterMonth !== 'all' ? Number(filterMonth) : null
      
      const periodEntries = entries.filter((entry) => {
        const d = new Date(entry.date)
        if (targetMonth !== null) {
          return d.getMonth() === targetMonth && d.getFullYear() === targetYear
        }
        return d.getFullYear() === targetYear
      })
      
      // Previous period for trend comparison
      let prevEntries = []
      if (targetMonth !== null) {
        let prevMonth = targetMonth - 1
        let prevYear = targetYear
        if (prevMonth < 0) { prevMonth = 11; prevYear-- }
        prevEntries = entries.filter((entry) => {
          const d = new Date(entry.date)
          return d.getMonth() === prevMonth && d.getFullYear() === prevYear
        })
      } else {
        prevEntries = entries.filter((entry) => {
          const d = new Date(entry.date)
          return d.getFullYear() === targetYear - 1
        })
      }
      
      const totalOrders = periodEntries.length
      const totalAmount = periodEntries.reduce((sum, e) => sum + Number(e.amount || 0), 0)
      const prevOrders = prevEntries.length
      const prevAmount = prevEntries.reduce((sum, e) => sum + Number(e.amount || 0), 0)
      
      const orderTrend = prevOrders === 0 
        ? (totalOrders > 0 ? { pct: 100, up: true } : null)
        : { pct: Math.abs(Math.round(((totalOrders - prevOrders) / prevOrders) * 100)), up: totalOrders >= prevOrders }
      
      const revenueTrend = prevAmount === 0
        ? (totalAmount > 0 ? { pct: 100, up: true } : null)
        : { pct: Math.abs(Math.round(((totalAmount - prevAmount) / prevAmount) * 100)), up: totalAmount >= prevAmount }
      
      return {
        totalOrders,
        totalAmount,
        allTimeTotal: entries.reduce((sum, e) => sum + Number(e.amount || 0), 0),
        allTimeCount: entries.length,
        orderTrend,
        revenueTrend,
        labelOrders: targetMonth !== null ? `Orders in ${MONTHS[targetMonth]}` : `Orders in ${targetYear}`,
        labelRevenue: targetMonth !== null ? `Revenue in ${MONTHS[targetMonth]}` : `Revenue in ${targetYear}`,
      }
    }
    
    // Default: current month
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const thisMonthEntries = entries.filter((entry) => {
      const d = new Date(entry.date)
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear
    })
    
    let prevMonth = currentMonth - 1
    let prevYear = currentYear
    if (prevMonth < 0) { prevMonth = 11; prevYear-- }
    const prevEntries = entries.filter((entry) => {
      const d = new Date(entry.date)
      return d.getMonth() === prevMonth && d.getFullYear() === prevYear
    })
    
    const totalOrders = thisMonthEntries.length
    const totalAmount = thisMonthEntries.reduce((sum, e) => sum + Number(e.amount || 0), 0)
    const prevOrders = prevEntries.length
    const prevAmount = prevEntries.reduce((sum, e) => sum + Number(e.amount || 0), 0)
    
    const orderTrend = prevOrders === 0 
      ? (totalOrders > 0 ? { pct: 100, up: true } : null)
      : { pct: Math.abs(Math.round(((totalOrders - prevOrders) / prevOrders) * 100)), up: totalOrders >= prevOrders }
    
    const revenueTrend = prevAmount === 0
      ? (totalAmount > 0 ? { pct: 100, up: true } : null)
      : { pct: Math.abs(Math.round(((totalAmount - prevAmount) / prevAmount) * 100)), up: totalAmount >= prevAmount }
    
    return {
      totalOrders,
      totalAmount,
      allTimeTotal: entries.reduce((sum, e) => sum + Number(e.amount || 0), 0),
      allTimeCount: entries.length,
      orderTrend,
      revenueTrend,
      labelOrders: 'Orders this month',
      labelRevenue: 'Revenue this month',
    }
  }, [entries, filterMonth, filterYear])

  const availableYears = useMemo(() => {
    const years = [...new Set(entries.map(e => new Date(e.date).getFullYear()))]
    return years.sort((a, b) => b - a)
  }, [entries])

  // Sort by TRANSACTION DATE ascending (chronological) — proper ledger behavior
  const filteredEntries = useMemo(() => {
    let sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date))
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      sorted = sorted.filter(
        (e) =>
          e.customerName.toLowerCase().includes(q) ||
          e.itemName.toLowerCase().includes(q) ||
          (e.notes || '').toLowerCase().includes(q) ||
          (e.status || '').toLowerCase().includes(q)
      )
    }
    if (filterMonth !== 'all') {
      sorted = sorted.filter(e => new Date(e.date).getMonth() === Number(filterMonth))
    }
    if (filterYear !== 'all') {
      sorted = sorted.filter(e => new Date(e.date).getFullYear() === Number(filterYear))
    }
    return sorted
  }, [entries, searchQuery, filterMonth, filterYear])

  const entriesWithBalance = useMemo(() => {
    let running = 0
    return filteredEntries.map(entry => {
      running += Number(entry.amount || 0)
      return { ...entry, runningBalance: running }
    })
  }, [filteredEntries])

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / ENTRIES_PER_PAGE))
  const paginatedEntriesWithBalance = useMemo(() => {
    return entriesWithBalance.slice(
      (currentPage - 1) * ENTRIES_PER_PAGE,
      currentPage * ENTRIES_PER_PAGE
    )
  }, [entriesWithBalance, currentPage])

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setFormError('')
    setShowForm(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    if (!form.customerName.trim()) { setFormError('Customer name is required.'); return }
    if (!form.itemName.trim()) { setFormError('Item name is required.'); return }
    if (!form.amount || Number(form.amount) < 0) { setFormError('Enter a valid amount.'); return }
    if (!form.date) { setFormError('Date is required.'); return }
    if (!user?.uid) { setFormError('Authentication context missing.'); return }

    try {
      if (editingId) {
        const docRef = doc(db, 'stores', user.uid, 'ledger', editingId)
        await updateDoc(docRef, {
          customerName: form.customerName.trim(),
          itemName: form.itemName.trim(),
          amount: Number(form.amount),
          date: form.date,
          notes: form.notes.trim(),
          status: form.status
        })
      } {
        const newDocId = Date.now().toString()
        const docRef = doc(db, 'stores', user.uid, 'ledger', newDocId)
        await setDoc(docRef, {
          customerName: form.customerName.trim(),
          itemName: form.itemName.trim(),
          amount: Number(form.amount),
          date: form.date,
          notes: form.notes.trim(),
          status: form.status || 'Paid',
          createdAt: new Date().toISOString(),
        })
      }
      resetForm()
    } catch (err) {
      console.error("Error writing to cloud ledger: ", err)
      setFormError('Failed to sync data with cloud database. Try again.')
    }
  }

  const handleEdit = (entry) => {
    setForm({
      customerName: entry.customerName,
      itemName: entry.itemName,
      amount: String(entry.amount),
      date: entry.date,
      notes: entry.notes || '',
      status: entry.status || 'Paid',
    })
    setEditingId(entry.id)
    setFormError('')
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    if (!user?.uid) return
    try {
      const docRef = doc(db, 'stores', user.uid, 'ledger', id)
      await deleteDoc(docRef)
      if (editingId === id) resetForm()
    } catch (err) {
      console.error("Error deleting from cloud ledger: ", err)
    }
  }

  const handleDownloadCSV = () => {
    const headers = ['Date', 'Customer', 'Item', 'Amount (NGN)', 'Status', 'Notes']
    const rows = filteredEntries.map((entry) => [
      entry.date,
      entry.customerName,
      entry.itemName,
      entry.amount,
      entry.status || 'Paid',
      entry.notes || '',
    ])
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ledger_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const getFilterLabel = () => {
    if (filterMonth === 'all' && filterYear === 'all') return 'All Entries'
    const parts = []
    if (filterMonth !== 'all') parts.push(MONTHS[Number(filterMonth)])
    if (filterYear !== 'all') parts.push(filterYear)
    return parts.join(' ') + ' Entries'
  }

  // PDF queries the FULL dataset, not the filtered view
  const getFilteredPdfEntries = () => {
    let result = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date))
    if (pdfStartDate) result = result.filter(e => e.date >= pdfStartDate)
    if (pdfEndDate) result = result.filter(e => e.date <= pdfEndDate)
    return result
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-5 pb-24 sm:pb-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-green-600">Manual Orders</p>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Ledger</h1>
          <p className="mt-0.5 text-xs text-gray-400">Log and track offline or WhatsApp orders. Free for all plans.</p>
        </div>
        <button
          type="button"
          disabled={loadingEntries}
          onClick={() => { if (showForm && !editingId) { resetForm() } else { setEditingId(null); setForm(EMPTY_FORM); setFormError(''); setShowForm(true) } }}
          className={`flex-shrink-0 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all disabled:opacity-50 ${showForm && !editingId ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-green-600 text-white hover:bg-green-700'}`}
        >
          {showForm && !editingId ? <><X size={14} /> Cancel</> : <><Plus size={14} /> Log Order</>}
        </button>
      </div>

      {/* Summary Cards — now dynamic */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center">
              <Calendar size={13} className="text-green-600" />
            </div>
          </div>
          <p className="text-xl font-bold text-gray-900">{loadingEntries ? '...' : activePeriodSummary.totalOrders}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{activePeriodSummary.labelOrders}</p>
          {!loadingEntries && activePeriodSummary.orderTrend ? (
            <div className={`mt-1 inline-flex items-center gap-0.5 text-[10px] font-semibold ${activePeriodSummary.orderTrend.up ? 'text-green-600' : 'text-red-500'}`}>
              {activePeriodSummary.orderTrend.up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
              {activePeriodSummary.orderTrend.pct}% vs prior period
            </div>
          ) : (
            <div className="mt-1 inline-flex items-center gap-0.5 text-[10px] font-semibold text-gray-400">
              <Minus size={10} />
              No prior data
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
              <TrendingUp size={13} className="text-blue-600" />
            </div>
          </div>
          <p className="text-xl font-bold text-gray-900">{loadingEntries ? '...' : formatNaira(activePeriodSummary.totalAmount)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{activePeriodSummary.labelRevenue}</p>
          {!loadingEntries && activePeriodSummary.revenueTrend ? (
            <div className={`mt-1 inline-flex items-center gap-0.5 text-[10px] font-semibold ${activePeriodSummary.revenueTrend.up ? 'text-green-600' : 'text-red-500'}`}>
              {activePeriodSummary.revenueTrend.up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
              {activePeriodSummary.revenueTrend.pct}% vs prior period
            </div>
          ) : (
            <div className="mt-1 inline-flex items-center gap-0.5 text-[10px] font-semibold text-gray-400">
              <Minus size={10} />
              No prior data
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center">
              <BookOpen size={13} className="text-purple-600" />
            </div>
          </div>
          <p className="text-xl font-bold text-gray-900">{loadingEntries ? '...' : activePeriodSummary.allTimeCount}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">All time entries</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
              <FileText size={13} className="text-amber-600" />
            </div>
          </div>
          <p className="text-xl font-bold text-gray-900">{loadingEntries ? '...' : formatNaira(activePeriodSummary.allTimeTotal)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">All time revenue</p>
        </div>
      </div>

      {/* Log Order Form — collapsible */}
      {showForm && (
        <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center">
                <FileText size={15} className="text-green-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">{editingId ? 'Edit Entry' : 'Log New Order'}</h2>
                <p className="text-[11px] text-gray-400">{editingId ? 'Update the order details below.' : 'Fill in the order details below.'}</p>
              </div>
            </div>
            <button type="button" onClick={resetForm} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {formError && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-xs font-semibold text-red-600">
                <X size={13} className="flex-shrink-0" />
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-gray-700">Customer Name <span className="text-red-500">*</span></label>
                <input type="text" value={form.customerName} onChange={(e) => setForm((p) => ({ ...p, customerName: e.target.value }))} placeholder="e.g. Ada Okonkwo" className={INPUT_CLASS} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-gray-700">Item / Service <span className="text-red-500">*</span></label>
                <input type="text" value={form.itemName} onChange={(e) => setForm((p) => ({ ...p, itemName: e.target.value }))} placeholder="e.g. Ankara Dress" className={INPUT_CLASS} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-gray-700">Amount (NGN) <span className="text-red-500">*</span></label>
                <input type="number" min="0" step="1" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} placeholder="e.g. 20500" className={INPUT_CLASS} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-gray-700">Date <span className="text-red-500">*</span></label>
                <input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} className={INPUT_CLASS} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-gray-700">Status</label>
                <div className="flex gap-2">
                  {STATUS_OPTIONS.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, status: s }))}
                      className={`flex-1 rounded-xl border px-3 py-2.5 text-xs font-bold transition-all ${
                        form.status === s
                          ? `${STATUS_STYLES[s]} border-2 shadow-sm`
                          : 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-gray-700">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
              <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Delivery address, payment method, special requests..." rows={3} className={`${INPUT_CLASS} resize-none`} />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button type="button" onClick={resetForm} className="rounded-xl border border-gray-200 px-5 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all">
                Cancel
              </button>
              <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-green-700 transition-all">
                <Check size={13} />
                {editingId ? 'Save Changes' : 'Log Order'}
              </button>
            </div>
          </form>
        </div>
      )}

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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-gray-700">From</label>
                  <input type="date" value={pdfStartDate} onChange={(e) => setPdfStartDate(e.target.value)} className={INPUT_CLASS} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-gray-700">To</label>
                  <input type="date" value={pdfEndDate} onChange={(e) => setPdfEndDate(e.target.value)} className={INPUT_CLASS} />
                </div>
              </div>
              <p className="text-[10px] text-gray-400">Leave empty to export all entries. Currently showing {getFilteredPdfEntries().length} entries.</p>
              <div className="flex items-center gap-3 pt-1">
                <button type="button" onClick={() => setShowPdfModal(false)} className="flex-1 rounded-xl border border-gray-200 px-5 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all">
                  Cancel
                </button>
                <PDFDownloadLink
                  document={
                    <LedgerPDF
                      entries={getFilteredPdfEntries()}
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

      {/* Records Section */}
      <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
        {/* Toolbar */}
        <div className="px-4 py-4 border-b border-gray-100 space-y-3">
          {/* Row 1: Header + Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-gray-900">{getFilterLabel()}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {loadingEntries ? 'Loading server storage...' : `${filteredEntries.length} record${filteredEntries.length !== 1 ? 's' : ''} ${(searchQuery || filterMonth !== 'all' || filterYear !== 'all') ? ' found' : ' total'}`}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Month filter */}
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
              {/* Year filter */}
              <div className="relative">
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="appearance-none rounded-xl border border-gray-200 bg-gray-50 pl-3 pr-8 py-2 text-xs font-semibold text-gray-700 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all cursor-pointer"
                >
                  <option value="all">All Years</option>
                  {availableYears.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              {/* Clear filters */}
              {(filterMonth !== 'all' || filterYear !== 'all') && (
                <button
                  type="button"
                  onClick={() => { setFilterMonth('all'); setFilterYear('all') }}
                  className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 transition-all"
                >
                  <X size={12} /> Clear
                </button>
              )}
            </div>
          </div>
          {/* Row 2: Search + Export */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search entries..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-8 pr-8 py-2 text-xs text-gray-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 focus:bg-white transition-all"
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={12} />
                </button>
              )}
            </div>
            {entries.length > 0 && (
              <div className="flex items-center gap-2">
                <button type="button" onClick={handleDownloadCSV} className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all">
                  <Download size={13} /> CSV
                </button>
                <button type="button" onClick={() => {
                  if (filterMonth !== 'all' || filterYear !== 'all') {
                    const year = filterYear !== 'all' ? Number(filterYear) : new Date().getFullYear()
                    if (filterMonth !== 'all') {
                      const month = Number(filterMonth)
                      const lastDay = new Date(year, month + 1, 0).getDate()
                      setPdfStartDate(`${year}-${String(month + 1).padStart(2, '0')}-01`)
                      setPdfEndDate(`${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`)
                    } else {
                      setPdfStartDate(`${year}-01-01`)
                      setPdfEndDate(`${year}-12-31`)
                    }
                  } else {
                    setPdfStartDate('')
                    setPdfEndDate('')
                  }
                  setShowPdfModal(true)
                }} className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all">
                  <Download size={13} /> PDF
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sync Loader State */}
        {loadingEntries ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
            <p className="text-xs font-medium text-gray-500">Securing real-time cloud data stream...</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50">
              <BookOpen size={24} className="text-gray-300" strokeWidth={1.75} />
            </div>
            <p className="text-sm font-semibold text-gray-700 mb-1">
              {(searchQuery || filterMonth !== 'all' || filterYear !== 'all')
                ? 'No entries match the selected period'
                : 'No orders logged yet'}
            </p>
            <p className="text-xs text-gray-400 max-w-xs">
              {(searchQuery || filterMonth !== 'all' || filterYear !== 'all')
                ? 'Try adjusting your filters or search term.'
                : 'Tap "Log Order" above to record your first manual order.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Date</th>
                    <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Customer</th>
                    <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Item / Service</th>
                    <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-gray-500 text-right">Amount</th>
                    <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Status</th>
                    <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-gray-500 text-right">Balance</th>
                    <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Notes</th>
                    <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-gray-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginatedEntriesWithBalance.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3.5 text-xs text-gray-500 whitespace-nowrap">{formatDateDisplay(entry.date)}</td>
                      <td className="px-4 py-3.5 text-xs font-semibold text-gray-900 max-w-[120px] truncate">{entry.customerName}</td>
                      <td className="px-4 py-3.5 text-xs text-gray-700 max-w-[140px] truncate">{entry.itemName}</td>
                      <td className="px-4 py-3.5 text-xs font-bold text-green-600 whitespace-nowrap text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatNaira(entry.amount)}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLES[entry.status || 'Paid']}`}>
                          {entry.status || 'Paid'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs font-semibold text-gray-700 whitespace-nowrap text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatNaira(entry.runningBalance)}</td>
                      <td className="px-4 py-3.5 text-xs text-gray-400 max-w-[120px] truncate">{entry.notes || '—'}</td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button type="button" onClick={() => handleEdit(entry)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" aria-label="Edit entry">
                            <Pencil size={13} />
                          </button>
                          <button type="button" onClick={() => handleDelete(entry.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" aria-label="Delete entry">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-gray-100">
              {paginatedEntriesWithBalance.map((entry) => (
                <div key={entry.id} className="p-4 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-gray-900 truncate">{entry.customerName}</p>
                      <p className="text-xs font-bold text-green-600 flex-shrink-0" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatNaira(entry.amount)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-gray-500 truncate">{entry.itemName}</p>
                      <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-bold flex-shrink-0 ${STATUS_STYLES[entry.status || 'Paid']}`}>
                        {entry.status || 'Paid'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-gray-400">{formatDateDisplay(entry.date)}</p>
                      <p className="text-[10px] text-gray-400" style={{ fontVariantNumeric: 'tabular-nums' }}>Bal: {formatNaira(entry.runningBalance)}</p>
                    </div>
                    {entry.notes && <p className="text-[11px] text-gray-400 break-words">{entry.notes}</p>}
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <button type="button" onClick={() => handleEdit(entry)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" aria-label="Edit">
                      <Pencil size={13} />
                    </button>
                    <button type="button" onClick={() => handleDelete(entry.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" aria-label="Delete">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3.5 border-t border-gray-100 bg-gray-50/40">
                <p className="text-[11px] text-gray-400">
                  Showing {((currentPage - 1) * ENTRIES_PER_PAGE) + 1}–{Math.min(currentPage * ENTRIES_PER_PAGE, filteredEntries.length)} of {filteredEntries.length}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft size={13} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                    .reduce((acc, page, idx, arr) => {
                      if (idx > 0 && arr[idx - 1] !== page - 1) acc.push('...')
                      acc.push(page)
                      return acc
                    }, [])
                    .map((item, idx) =>
                      item === '...' ? (
                        <span key={`ellipsis-${idx}`} className="px-1 text-xs text-gray-400">...</span>
                      ) : (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setCurrentPage(item)}
                          className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${currentPage === item ? 'bg-green-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-white'}`}
                        >
                          {item}
                        </button>
                      )
                    )}
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Mobile FAB */}
      {!showForm && (
        <button
          type="button"
          disabled={loadingEntries}
          onClick={() => { setEditingId(null); setForm(EMPTY_FORM); setFormError(''); setShowForm(true) }}
          className="sm:hidden fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-green-600 text-white shadow-lg shadow-green-600/30 hover:bg-green-700 active:scale-95 transition-all disabled:opacity-50"
        >
          <Plus size={22} />
        </button>
      )}
    </div>
  )
}