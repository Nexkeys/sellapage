// src/components/receipts/ReceiptPreview.jsx
import { useRef, useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import { toPng } from 'html-to-image'
import { Download, Loader2, Save, MessageCircle, Lock, CheckCircle2 } from 'lucide-react'
import ReceiptTemplateRenderer from './ReceiptTemplateRenderer'
import ReceiptPDF from './ReceiptPDF'
import { getTemplateById } from '../../utils/receiptTemplates'
import { generateWhatsAppLink } from '../../utils/whatsapp'

export default function ReceiptPreview({ draft, savedReceipt, onSave, saving, canPng, whiteLabel, isEditing }) {
  const previewRef = useRef(null)
  const [pdfBusy, setPdfBusy] = useState(false)
  const [pngBusy, setPngBusy] = useState(false)

  const receiptForRender = savedReceipt || draft
  const template = getTemplateById(receiptForRender.templateId)
  // Editing an existing receipt already has a receiptNumber from the moment
  // you arrive here — download/share shouldn't wait for a fresh re-save.
  const hasNumber = !!receiptForRender.receiptNumber

  const pdfProps = {
    receipt: receiptForRender,
    template,
    primaryColor: receiptForRender.primaryColor,
    secondaryColor: receiptForRender.secondaryColor,
    fontFamily: receiptForRender.fontFamily,
    logoUrl: receiptForRender.logoUrl,
    stampType: receiptForRender.stampType,
    stampUrl: receiptForRender.stampUrl,
    stampLabel: receiptForRender.stampLabel,
    stampColor: receiptForRender.stampColor,
    stampPosition: receiptForRender.stampPosition,
    qrCodeDataUrl: receiptForRender.qrCodeEnabled ? receiptForRender.qrCodeUrl : null,
    qrCodePosition: receiptForRender.qrCodePosition,
    whiteLabel,
  }

  const handleDownloadPdf = async () => {
    setPdfBusy(true)
    try {
      const blob = await pdf(<ReceiptPDF {...pdfProps} />).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${receiptForRender.receiptNumber || 'receipt'}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('PDF export failed', err)
    } finally {
      setPdfBusy(false)
    }
  }

  const handleDownloadPng = async () => {
    if (!previewRef.current) return
    setPngBusy(true)
    try {
      const dataUrl = await toPng(previewRef.current, { backgroundColor: '#ffffff', pixelRatio: 2 })
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `${receiptForRender.receiptNumber || 'receipt'}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('PNG export failed', err)
    } finally {
      setPngBusy(false)
    }
  }

  const handleWhatsAppShare = () => {
    const phone = receiptForRender.customerPhone
    const message = `Hi ${receiptForRender.customerName || ''}, here's your receipt ${receiptForRender.receiptNumber} from ${receiptForRender.vendorName}. Total: NGN ${Number(receiptForRender.total || 0).toLocaleString('en-NG')}. Thank you!`
    const url = phone ? generateWhatsAppLink(phone, message) : `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-2xl bg-gray-50 p-4 sm:p-6">
        <ReceiptTemplateRenderer
          ref={previewRef}
          receipt={receiptForRender}
          template={template}
          primaryColor={receiptForRender.primaryColor}
          secondaryColor={receiptForRender.secondaryColor}
          fontFamily={receiptForRender.fontFamily}
          logoUrl={receiptForRender.logoUrl}
          stampType={receiptForRender.stampType}
          stampUrl={receiptForRender.stampUrl}
          stampLabel={receiptForRender.stampLabel}
          stampColor={receiptForRender.stampColor}
          stampPosition={receiptForRender.stampPosition}
          qrCodeDataUrl={receiptForRender.qrCodeEnabled ? receiptForRender.qrCodeUrl : null}
          qrCodePosition={receiptForRender.qrCodePosition}
          whiteLabel={whiteLabel}
        />
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-green-700 disabled:opacity-60 sm:flex-none"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : isEditing ? <CheckCircle2 size={16} /> : <Save size={16} />}
          {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Generate & Save Receipt'}
        </button>

        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={pdfBusy}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50 disabled:opacity-60 sm:flex-none"
        >
          {pdfBusy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} PDF
        </button>

        <button
          type="button"
          onClick={canPng ? handleDownloadPng : undefined}
          disabled={!canPng || pngBusy}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
        >
          {pngBusy ? <Loader2 size={16} className="animate-spin" /> : canPng ? <Download size={16} /> : <Lock size={14} />} PNG
        </button>

        {hasNumber && (
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50 sm:flex-none"
          >
            <MessageCircle size={16} /> Share
          </button>
        )}
      </div>
      {!hasNumber && (
        <p className="text-[11px] text-gray-400">Save the receipt to unlock WhatsApp sharing.</p>
      )}
      {!canPng && (
        <p className="text-[11px] text-gray-400">PNG export unlocks on Growth and above.</p>
      )}
    </div>
  )
}
