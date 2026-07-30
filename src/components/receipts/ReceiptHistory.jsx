// src/components/receipts/ReceiptHistory.jsx
import { useState, useMemo, useRef } from 'react'
import { pdf } from '@react-pdf/renderer'
import { toPng } from 'html-to-image'
import {
  Search, Download, Pencil, Trash2, MessageCircle, Loader2, Receipt as ReceiptIcon,
  ChevronLeft, ChevronRight, X, AlertCircle, Lock,
} from 'lucide-react'
import ReceiptPDF from './ReceiptPDF'
import ReceiptTemplateRenderer from './ReceiptTemplateRenderer'
import { getTemplateById, formatNGN } from '../../utils/receiptTemplates'
import { generateWhatsAppLink } from '../../utils/whatsapp'

const RECEIPTS_PER_PAGE = 9

const STATUS_STYLES = {
  Paid: 'bg-green-50 text-green-700 border-green-200',
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  Partial: 'bg-red-50 text-red-700 border-red-200',
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ReceiptHistory({ receipts, loading, onEdit, onDelete, canPng, whiteLabel }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [confirmingDelete, setConfirmingDelete] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [pdfBusyId, setPdfBusyId] = useState(null)
  const [pngBusyId, setPngBusyId] = useState(null)
  const [pngTarget, setPngTarget] = useState(null)
  const hiddenRef = useRef(null)

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return receipts
    const q = searchQuery.toLowerCase()
    return receipts.filter(
      (r) =>
        (r.customerName || '').toLowerCase().includes(q) ||
        (r.receiptNumber || '').toLowerCase().includes(q),
    )
  }, [receipts, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filtered.length / RECEIPTS_PER_PAGE))
  const safePage = Math.min(currentPage, totalPages)
  const paginated = filtered.slice((safePage - 1) * RECEIPTS_PER_PAGE, safePage * RECEIPTS_PER_PAGE)

  const handleDownloadPdf = async (receipt) => {
    setPdfBusyId(receipt.id)
    try {
      const template = getTemplateById(receipt.templateId)
      const blob = await pdf(
        <ReceiptPDF
          receipt={receipt}
          template={template}
          primaryColor={receipt.primaryColor}
          secondaryColor={receipt.secondaryColor}
          fontFamily={receipt.fontFamily}
          logoUrl={receipt.logoUrl}
          stampType={receipt.stampType}
          stampUrl={receipt.stampUrl}
          stampLabel={receipt.stampLabel}
          stampColor={receipt.stampColor}
          stampPosition={receipt.stampPosition}
          qrCodeDataUrl={receipt.qrCodeEnabled ? receipt.qrCodeUrl : null}
          qrCodePosition={receipt.qrCodePosition}
          whiteLabel={whiteLabel}
        />,
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${receipt.receiptNumber || 'receipt'}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('PDF export failed', err)
    } finally {
      setPdfBusyId(null)
    }
  }

  const handleDownloadPng = (receipt) => {
    if (!canPng) return
    setPngBusyId(receipt.id)
    setPngTarget(receipt)
    requestAnimationFrame(() => {
      setTimeout(async () => {
        try {
          if (hiddenRef.current) {
            const dataUrl = await toPng(hiddenRef.current, { backgroundColor: '#ffffff', pixelRatio: 2 })
            const link = document.createElement('a')
            link.href = dataUrl
            link.download = `${receipt.receiptNumber || 'receipt'}.png`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
          }
        } catch (err) {
          console.error('PNG export failed', err)
        } finally {
          setPngBusyId(null)
          setPngTarget(null)
        }
      }, 80)
    })
  }

  const handleWhatsAppShare = (receipt) => {
    const message = `Hi ${receipt.customerName || ''}, here's your receipt ${receipt.receiptNumber} from ${receipt.vendorName}. Total: ${formatNGN(receipt.total)}. Thank you!`
    const url = receipt.customerPhone ? generateWhatsAppLink(receipt.customerPhone, message) : `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const confirmDelete = async () => {
    if (!confirmingDelete) return
    setDeleteLoading(true)
    setDeleteError('')
    try {
      await onDelete(confirmingDelete.id)
      setConfirmingDelete(null)
    } catch (err) {
      setDeleteError(err?.message || 'Could not delete this receipt. Please try again.')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
          placeholder="Search by customer or receipt number..."
          className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-9 pr-4 text-sm text-gray-900 outline-none transition-all focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-500/20"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-gray-100 bg-white py-16">
          <Loader2 size={26} className="animate-spin text-green-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white px-6 py-14 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 text-gray-300">
            <ReceiptIcon size={20} strokeWidth={1.5} />
          </div>
          <p className="text-sm font-bold text-gray-700">{receipts.length === 0 ? 'No receipts yet' : 'No receipts match your search'}</p>
          <p className="mt-1 max-w-xs text-xs text-gray-400">{receipts.length === 0 ? 'Generate your first receipt to see it here.' : 'Try a different search term.'}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {paginated.map((receipt) => (
              <div key={receipt.id} className="flex flex-col rounded-2xl border border-gray-100 bg-white p-4 shadow-sm shadow-gray-100/40">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black text-gray-900">{receipt.receiptNumber}</p>
                    <p className="mt-0.5 text-[11px] text-gray-400">{formatDate(receipt.date)}</p>
                  </div>
                  <span className={`inline-flex flex-shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLES[receipt.status] || STATUS_STYLES.Paid}`}>
                    {receipt.status || 'Paid'}
                  </span>
                </div>

                <p className="truncate text-sm font-bold text-gray-900">{receipt.customerName}</p>
                <p className="mt-0.5 text-xs text-gray-400">{(receipt.items || []).length} item{(receipt.items || []).length !== 1 ? 's' : ''}</p>
                <p className="mt-2 text-lg font-black text-gray-900" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatNGN(receipt.total)}</p>

                <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-gray-50 pt-3">
                  <button
                    type="button"
                    onClick={() => handleDownloadPdf(receipt)}
                    disabled={pdfBusyId === receipt.id}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1.5 text-[10px] font-bold text-gray-600 hover:bg-gray-50"
                    title="Download PDF"
                  >
                    {pdfBusyId === receipt.id ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />} PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadPng(receipt)}
                    disabled={!canPng || pngBusyId === receipt.id}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1.5 text-[10px] font-bold text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                    title={canPng ? 'Download PNG' : 'PNG export is Growth+'}
                  >
                    {pngBusyId === receipt.id ? <Loader2 size={11} className="animate-spin" /> : canPng ? <Download size={11} /> : <Lock size={10} />} PNG
                  </button>
                  <button
                    type="button"
                    onClick={() => handleWhatsAppShare(receipt)}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1.5 text-[10px] font-bold text-gray-600 hover:bg-gray-50"
                    title="Share via WhatsApp"
                  >
                    <MessageCircle size={11} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onEdit(receipt)}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1.5 text-[10px] font-bold text-gray-600 hover:bg-gray-50"
                    title="Edit"
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setConfirmingDelete(receipt); setDeleteError('') }}
                    className="ml-auto inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1.5 text-[10px] font-bold text-gray-600 hover:bg-red-50 hover:text-red-600"
                    title="Delete"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-4 py-3">
              <p className="text-[11px] text-gray-400">
                {((safePage - 1) * RECEIPTS_PER_PAGE) + 1}–{Math.min(safePage * RECEIPTS_PER_PAGE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                >
                  <ChevronLeft size={13} /> Prev
                </button>
                <span className="px-1 text-xs font-bold text-gray-500">{safePage} / {totalPages}</span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                >
                  Next <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Off-screen render target used only to capture a PNG via html-to-image */}
      {pngTarget && (
        <div style={{ position: 'fixed', left: -9999, top: 0, pointerEvents: 'none' }} aria-hidden="true">
          <ReceiptTemplateRenderer
            ref={hiddenRef}
            receipt={pngTarget}
            template={getTemplateById(pngTarget.templateId)}
            primaryColor={pngTarget.primaryColor}
            secondaryColor={pngTarget.secondaryColor}
            fontFamily={pngTarget.fontFamily}
            logoUrl={pngTarget.logoUrl}
            stampType={pngTarget.stampType}
            stampUrl={pngTarget.stampUrl}
            stampLabel={pngTarget.stampLabel}
            stampColor={pngTarget.stampColor}
            stampPosition={pngTarget.stampPosition}
            qrCodeDataUrl={pngTarget.qrCodeEnabled ? pngTarget.qrCodeUrl : null}
            qrCodePosition={pngTarget.qrCodePosition}
            whiteLabel={whiteLabel}
          />
        </div>
      )}

      {/* Delete confirm modal */}
      {confirmingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-gray-100 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-extrabold text-gray-950">Delete receipt?</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {confirmingDelete.receiptNumber} for {confirmingDelete.customerName || 'this customer'} will be permanently removed.
                  </p>
                </div>
                <button type="button" onClick={() => !deleteLoading && setConfirmingDelete(null)} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="space-y-4 px-5 py-5">
              {deleteError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  <AlertCircle size={15} className="mt-0.5 flex-shrink-0" /> {deleteError}
                </div>
              )}
              <div className="flex flex-wrap justify-end gap-3">
                <button type="button" onClick={() => setConfirmingDelete(null)} disabled={deleteLoading} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-extrabold text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                  Cancel
                </button>
                <button type="button" onClick={confirmDelete} disabled={deleteLoading} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 text-sm font-extrabold text-white hover:bg-red-700 disabled:bg-red-400">
                  {deleteLoading ? <><Loader2 size={15} className="animate-spin" /> Deleting...</> : <><Trash2 size={15} /> Delete</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
