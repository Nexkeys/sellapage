//src/components/dashboard/LedgerTab.jsx/
import { useState, useMemo, useEffect } from 'react'
import { Trash2, Plus, Download, FileText, BookOpen } from 'lucide-react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFDownloadLink,
} from '@react-pdf/renderer'

const INPUT_CLASS =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-all duration-200 placeholder:text-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-500/20'

function FieldLabel({ icon: Icon, children, required = false }) {
  return (
    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-gray-700">
      {Icon && <Icon size={13} className="text-gray-400" />}
      {children}
      {required && <span className="text-red-500">*</span>}
    </label>
  )
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(amount)
}

function formatDateDisplay(dateStr) {
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const pdfStyles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 12,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 30,
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#22c55e',
  },
  table: {
    display: 'flex',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableHeader: {
    backgroundColor: '#f3f4f6',
    fontWeight: 'bold',
  },
  tableCol: {
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  colDate: { width: '15%' },
  colCustomer: { width: '25%' },
  colItem: { width: '25%' },
  colAmount: { width: '15%', textAlign: 'right' },
  colNotes: { width: '20%', borderRightWidth: 0 },
})

function LedgerPDF({ entries }) {
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.title}>Ledger Report</Text>
          <Text>Total Orders: {entries.length}</Text>
          <Text>
            Total Amount:{' '}
            {formatCurrency(
              entries.reduce((sum, e) => sum + Number(e.amount || 0), 0)
            )}
          </Text>
        </View>
        <View style={pdfStyles.table}>
          <View style={[pdfStyles.tableRow, pdfStyles.tableHeader]}>
            <View style={[pdfStyles.tableCol, pdfStyles.colDate]}>
              <Text>Date</Text>
            </View>
            <View style={[pdfStyles.tableCol, pdfStyles.colCustomer]}>
              <Text>Customer</Text>
            </View>
            <View style={[pdfStyles.tableCol, pdfStyles.colItem]}>
              <Text>Item</Text>
            </View>
            <View style={[pdfStyles.tableCol, pdfStyles.colAmount]}>
              <Text>Amount</Text>
            </View>
            <View style={[pdfStyles.tableCol, pdfStyles.colNotes]}>
              <Text>Notes</Text>
            </View>
          </View>
          {entries.map((entry) => (
            <View key={entry.id} style={pdfStyles.tableRow}>
              <View style={[pdfStyles.tableCol, pdfStyles.colDate]}>
                <Text>{formatDateDisplay(entry.date)}</Text>
              </View>
              <View style={[pdfStyles.tableCol, pdfStyles.colCustomer]}>
                <Text>{entry.customerName}</Text>
              </View>
              <View style={[pdfStyles.tableCol, pdfStyles.colItem]}>
                <Text>{entry.itemName}</Text>
              </View>
              <View style={[pdfStyles.tableCol, pdfStyles.colAmount]}>
                <Text>{formatCurrency(entry.amount)}</Text>
              </View>
              <View style={[pdfStyles.tableCol, pdfStyles.colNotes]}>
                <Text>{entry.notes || '-'}</Text>
              </View>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  )
}

export default function LedgerTab() {
  const [entries, setEntries] = useState(() => {
    const saved = localStorage.getItem('sellapage_ledger_entries')
    return saved ? JSON.parse(saved) : []
  })
  const [form, setForm] = useState({
    customerName: '',
    itemName: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  })

  useEffect(() => {
    localStorage.setItem('sellapage_ledger_entries', JSON.stringify(entries))
  }, [entries])

  const monthlySummary = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const thisMonthEntries = entries.filter((entry) => {
      const entryDate = new Date(entry.date)
      return (
        entryDate.getMonth() === currentMonth &&
        entryDate.getFullYear() === currentYear
      )
    })

    const totalOrders = thisMonthEntries.length
    const totalAmount = thisMonthEntries.reduce(
      (sum, entry) => sum + Number(entry.amount || 0),
      0
    )

    return { totalOrders, totalAmount }
  }, [entries])

  const sortedEntries = useMemo(() => {
    return [...entries].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    )
  }, [entries])

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!form.customerName.trim()) return
    if (!form.itemName.trim()) return
    if (!form.amount || Number(form.amount) < 0) return

    const newEntry = {
      id: Date.now().toString(),
      customerName: form.customerName.trim(),
      itemName: form.itemName.trim(),
      amount: Number(form.amount),
      date: form.date,
      notes: form.notes.trim(),
      createdAt: new Date().toISOString(),
    }

    setEntries((prev) => [...prev, newEntry])
    setForm({
      customerName: '',
      itemName: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
    })
  }

  const handleDelete = (id) => {
    setEntries((prev) => prev.filter((entry) => entry.id !== id))
  }

  const handleDownloadCSV = () => {
    const headers = ['Date', 'Customer', 'Item', 'Amount', 'Notes']
    const rows = sortedEntries.map((entry) => [
      entry.date,
      entry.customerName,
      entry.itemName,
      entry.amount,
      entry.notes || '',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
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

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
      <div>
        <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.2em] text-green-600">
          Manual Orders
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-950 sm:text-[1.7rem]">
          Ledger
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-gray-500">
          Track offline or WhatsApp orders manually. Available for all plans.
        </p>
      </div>

      {/* Monthly Summary Card */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4 rounded-xl bg-green-50 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-600 text-white">
            <BookOpen size={24} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-green-600">
              This Month - Orders
            </p>
            <p className="text-2xl font-extrabold text-gray-950">
              {monthlySummary.totalOrders}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl bg-gray-50 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-200 text-gray-700">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-600">
              This Month - Amount
            </p>
            <p className="text-2xl font-extrabold text-gray-950">
              {formatCurrency(monthlySummary.totalAmount)}
            </p>
          </div>
        </div>
      </section>

      {/* Log Order Form */}
      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-base font-extrabold text-gray-950 flex items-center gap-2">
          <Plus size={18} className="text-green-600" />
          Log New Order
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel required>Customer Name</FieldLabel>
              <input
                type="text"
                value={form.customerName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, customerName: e.target.value }))
                }
                placeholder="e.g. Ada Okonkwo"
                className={INPUT_CLASS}
                required
              />
            </div>
            <div>
              <FieldLabel required>Item/Service Name</FieldLabel>
              <input
                type="text"
                value={form.itemName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, itemName: e.target.value }))
                }
                placeholder="e.g. Ankara Dress"
                className={INPUT_CLASS}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel required>Amount (NGN)</FieldLabel>
              <input
                type="number"
                min="0"
                step="1"
                value={form.amount}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, amount: e.target.value }))
                }
                placeholder="e.g. 20500"
                className={INPUT_CLASS}
                required
              />
            </div>
            <div>
              <FieldLabel required>Date</FieldLabel>
              <input
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, date: e.target.value }))
                }
                className={INPUT_CLASS}
                required
              />
            </div>
          </div>

          <div>
            <FieldLabel>Notes (optional)</FieldLabel>
            <textarea
              value={form.notes}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Delivery address, special requests..."
              rows={3}
              className={`${INPUT_CLASS} resize-none`}
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-green-600 px-6 py-3 text-sm font-extrabold text-white shadow-sm transition-all hover:bg-green-700"
          >
            Log Order
          </button>
        </form>
      </section>

      {/* Export Buttons */}
      {sortedEntries.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleDownloadCSV}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-3 text-sm font-extrabold text-gray-700 hover:bg-gray-50 transition-all"
          >
            <Download size={16} />
            Download CSV
          </button>
          <PDFDownloadLink
            document={<LedgerPDF entries={sortedEntries} />}
            fileName={`ledger_${new Date().toISOString().split('T')[0]}.pdf`}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-5 py-3 text-sm font-extrabold text-gray-700 hover:bg-gray-200 transition-all"
          >
            {({ loading }) =>
              loading ? (
                <>
                  <span className="animate-pulse">Generating PDF...</span>
                </>
              ) : (
                <>
                  <Download size={16} />
                  Download PDF
                </>
              )
            }
          </PDFDownloadLink>
        </div>
      )}

      {/* Entries List or Empty State */}
      {sortedEntries.length === 0 ? (
        <section className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white px-6 py-16 text-center shadow-sm">
          <div className="mb-6 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl bg-green-50 ring-[6px] ring-green-50/80">
            <BookOpen size={30} className="text-green-600" strokeWidth={1.75} />
          </div>
          <h2 className="mb-2 text-xl font-extrabold tracking-tight text-gray-950">
            No orders logged yet
          </h2>
          <p className="mb-6 max-w-md text-sm leading-relaxed text-gray-500">
            Add your first manual order entry above. You can log any offline or WhatsApp sale here.
          </p>
        </section>
      ) : (
        <section className="space-y-4">
          {sortedEntries.map((entry) => (
            <div
              key={entry.id}
              className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-extrabold text-gray-950 truncate">
                    {entry.customerName} · {entry.itemName}
                  </p>
                  <p className="text-sm font-extrabold text-green-600">
                    {formatCurrency(entry.amount)}
                  </p>
                </div>
                <p className="text-xs font-medium text-gray-500">
                  {formatDateDisplay(entry.date)}
                </p>
                {entry.notes && (
                  <p className="text-xs text-gray-500 break-words">{entry.notes}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleDelete(entry.id)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all"
                aria-label="Delete entry"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
