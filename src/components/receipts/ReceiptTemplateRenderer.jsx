// src/components/receipts/ReceiptTemplateRenderer.jsx
import { forwardRef } from 'react'
import { formatNGN } from '../../utils/receiptTemplates'

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STAMP_POSITION_CLASS = {
  'top-left': 'top-4 left-4 sm:top-6 sm:left-6',
  'top-right': 'top-4 right-4 sm:top-6 sm:right-6',
  'bottom-left': 'bottom-4 left-4 sm:bottom-6 sm:left-6',
  'bottom-right': 'bottom-4 right-4 sm:bottom-6 sm:right-6',
  center: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
}

function Stamp({ stampType, stampUrl, stampLabel, stampColor, stampPosition }) {
  if (!stampType) return null
  const posClass = STAMP_POSITION_CLASS[stampPosition] || STAMP_POSITION_CLASS['bottom-right']

  if (stampType === 'uploaded' && stampUrl) {
    return (
      <img
        src={stampUrl}
        alt="Stamp"
        className={`pointer-events-none absolute z-10 w-20 h-20 object-contain opacity-80 -rotate-12 sm:w-28 sm:h-28 ${posClass}`}
      />
    )
  }

  if (stampType === 'platform') {
    return (
      <div
        className={`pointer-events-none absolute z-10 -rotate-12 ${posClass}`}
        style={{ color: stampColor || '#16a34a' }}
      >
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full border-[3px] text-center text-[9px] font-black uppercase tracking-widest opacity-70 sm:h-24 sm:w-24 sm:text-xs"
          style={{ borderColor: stampColor || '#16a34a' }}
        >
          {stampLabel || 'PAID'}
        </div>
      </div>
    )
  }

  return null
}

const ReceiptTemplateRenderer = forwardRef(function ReceiptTemplateRenderer(
  {
    receipt,
    template,
    primaryColor,
    secondaryColor,
    fontFamily,
    logoUrl,
    stampType,
    stampUrl,
    stampLabel,
    stampColor,
    stampPosition,
    qrCodeDataUrl,
    qrCodePosition,
    watermark,
    whiteLabel,
  },
  ref,
) {
  const layout = template?.layout || {}
  const primary = primaryColor || template?.defaultColors?.primary || '#22c55e'
  const secondary = secondaryColor || template?.defaultColors?.secondary || '#0f172a'
  const background = template?.defaultColors?.background || '#ffffff'
  const items = receipt?.items || []
  const isThermal = !!layout.thermal
  const fontClass = fontFamily?.includes('Times') ? 'font-serif' : fontFamily === 'Courier' ? 'font-mono' : 'font-sans'

  return (
    <div
      ref={ref}
      className={`relative mx-auto w-full overflow-hidden rounded-2xl border border-gray-100 shadow-sm ${fontClass} ${isThermal ? 'max-w-[320px]' : 'max-w-xl'}`}
      style={{ backgroundColor: background, color: secondary }}
    >
      {watermark && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <p className="rotate-[-25deg] text-3xl font-black uppercase tracking-widest text-gray-300/40 sm:text-5xl">Preview</p>
        </div>
      )}

      <Stamp stampType={stampType} stampUrl={stampUrl} stampLabel={stampLabel} stampColor={stampColor} stampPosition={qrCodePosition === stampPosition ? 'top-left' : stampPosition} />

      {qrCodeDataUrl && (
        <img
          src={qrCodeDataUrl}
          alt="QR code"
          className={`pointer-events-none absolute z-10 w-14 h-14 sm:w-20 sm:h-20 ${STAMP_POSITION_CLASS[qrCodePosition] || STAMP_POSITION_CLASS['bottom-left']}`}
        />
      )}

      {/* Header — visually distinct per template */}
      {layout.headerStyle === 'band' && (
        <div className="px-5 py-5 text-white sm:px-8 sm:py-6" style={{ backgroundColor: primary }}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-black sm:text-xl">{receipt?.vendorName || 'Your Business'}</h2>
              <p className="mt-0.5 text-[11px] opacity-90 sm:text-xs">{receipt?.vendorAddress}</p>
            </div>
            {logoUrl && <img src={logoUrl} alt="Logo" className="h-10 w-10 flex-shrink-0 rounded-lg object-contain bg-white/90 p-1 sm:h-14 sm:w-14" />}
          </div>
        </div>
      )}
      {layout.headerStyle === 'minimal' && (
        <div className="px-5 py-6 sm:px-8 sm:py-8">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold sm:text-lg">{receipt?.vendorName || 'Your Business'}</h2>
              <p className="mt-0.5 text-[11px] text-gray-400 sm:text-xs">{receipt?.vendorAddress}</p>
            </div>
            {logoUrl && <img src={logoUrl} alt="Logo" className="h-9 w-9 flex-shrink-0 object-contain sm:h-12 sm:w-12" />}
          </div>
          <div className="mt-3 h-px w-full" style={{ backgroundColor: primary }} />
        </div>
      )}
      {layout.headerStyle === 'banner' && (
        <div className="relative px-5 py-8 text-center text-white sm:px-8 sm:py-10" style={{ backgroundColor: primary }}>
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="mx-auto h-14 w-14 rounded-xl bg-white/90 object-contain p-1.5 sm:h-20 sm:w-20" />
          ) : (
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-white/20 text-xl font-black sm:h-20 sm:w-20 sm:text-2xl">
              {(receipt?.vendorName || 'S').charAt(0).toUpperCase()}
            </div>
          )}
          <h2 className="mt-3 text-xl font-black sm:text-2xl">{receipt?.vendorName || 'Your Business'}</h2>
          <p className="mt-0.5 text-xs opacity-90">{receipt?.vendorAddress}</p>
        </div>
      )}
      {layout.headerStyle === 'twoColumn' && (
        <div className="grid grid-cols-1 gap-3 border-b-2 px-5 py-5 sm:grid-cols-2 sm:px-8 sm:py-6" style={{ borderColor: primary }}>
          <div className="flex items-center gap-3">
            {logoUrl && <img src={logoUrl} alt="Logo" className="h-10 w-10 flex-shrink-0 object-contain" />}
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold sm:text-lg">{receipt?.vendorName || 'Your Business'}</h2>
              <p className="text-[11px] text-gray-400">{receipt?.vendorAddress}</p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Official Receipt</p>
            <p className="text-sm font-black" style={{ color: primary }}>{receipt?.receiptNumber || 'RCP-DRAFT'}</p>
          </div>
        </div>
      )}
      {layout.headerStyle === 'asymmetric' && (
        <div className="relative overflow-hidden px-5 py-6 sm:px-8 sm:py-8">
          <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-10 sm:h-32 sm:w-32" style={{ backgroundColor: primary }} />
          <div className="relative flex items-center gap-3">
            {logoUrl && <img src={logoUrl} alt="Logo" className="h-11 w-11 flex-shrink-0 rounded-2xl object-contain sm:h-14 sm:w-14" />}
            <div className="min-w-0">
              <h2 className="truncate text-lg font-black sm:text-xl" style={{ color: primary }}>{receipt?.vendorName || 'Your Business'}</h2>
              <p className="mt-0.5 text-[11px] text-gray-400">{receipt?.vendorAddress}</p>
            </div>
          </div>
        </div>
      )}
      {layout.headerStyle === 'stacked' && (
        <div className="border-b border-dashed border-gray-300 px-4 py-4 text-center">
          {logoUrl && <img src={logoUrl} alt="Logo" className="mx-auto mb-2 h-10 w-10 object-contain" />}
          <h2 className="text-sm font-black uppercase tracking-wide">{receipt?.vendorName || 'Your Business'}</h2>
          <p className="mt-0.5 text-[10px] text-gray-500">{receipt?.vendorAddress}</p>
          <p className="text-[10px] text-gray-500">{receipt?.vendorPhone}</p>
        </div>
      )}

      {/* Meta row */}
      <div className={`flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-[11px] text-gray-500 sm:px-8 ${isThermal ? 'text-[10px]' : ''}`}>
        {layout.headerStyle !== 'twoColumn' && <span className="font-bold" style={{ color: primary }}>{receipt?.receiptNumber || 'RCP-DRAFT'}</span>}
        <span>{formatDate(receipt?.date)}</span>
      </div>

      {/* Bill to */}
      <div className={`px-5 sm:px-8 ${isThermal ? 'text-[11px]' : 'text-xs'}`}>
        <p className="font-bold uppercase tracking-wider text-gray-400" style={{ fontSize: '10px' }}>Received From</p>
        <p className="mt-1 font-bold">{receipt?.customerName || 'Customer Name'}</p>
        {receipt?.customerPhone && <p className="text-gray-500">{receipt.customerPhone}</p>}
        {receipt?.customerEmail && <p className="text-gray-500">{receipt.customerEmail}</p>}
      </div>

      {/* Items */}
      <div className="px-5 py-4 sm:px-8">
        {layout.itemsStyle === 'cards' ? (
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold">{item.label}</p>
                  <p className="text-[10px] text-gray-400">Qty {item.qty} × {formatNGN(item.unitPrice)}</p>
                </div>
                <p className="flex-shrink-0 text-xs font-black">{formatNGN(item.qty * item.unitPrice)}</p>
              </div>
            ))}
          </div>
        ) : layout.itemsStyle === 'list' ? (
          <div className="space-y-1.5 border-y border-dashed border-gray-300 py-2 text-[11px]">
            {items.map((item, idx) => (
              <div key={idx} className="flex justify-between gap-2">
                <span className="min-w-0 flex-1 truncate">{item.label} x{item.qty}</span>
                <span className="flex-shrink-0 font-bold">{formatNGN(item.qty * item.unitPrice)}</span>
              </div>
            ))}
          </div>
        ) : (
          <table className={`w-full text-left ${isThermal ? 'text-[10px]' : 'text-xs'}`}>
            <thead>
              <tr className="border-b" style={{ borderColor: secondary + '20' }}>
                <th className="pb-2 font-bold text-gray-400">Item</th>
                <th className="pb-2 text-center font-bold text-gray-400">Qty</th>
                <th className="pb-2 text-right font-bold text-gray-400">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-50">
                  <td className="max-w-[140px] truncate py-2 font-medium">{item.label}</td>
                  <td className="py-2 text-center text-gray-500">{item.qty}</td>
                  <td className="py-2 text-right font-bold">{formatNGN(item.qty * item.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Totals */}
      <div className={`px-5 pb-4 sm:px-8 ${layout.totalsAlign === 'left' ? 'text-left' : 'text-right'}`}>
        <div className="ml-auto w-full space-y-1 text-xs sm:max-w-[220px]" style={layout.totalsAlign === 'left' ? { marginLeft: 0, marginRight: 'auto' } : {}}>
          <div className="flex justify-between text-gray-500">
            <span>Subtotal</span><span>{formatNGN(receipt?.subtotal)}</span>
          </div>
          {Number(receipt?.discount) > 0 && (
            <div className="flex justify-between text-gray-500">
              <span>Discount</span><span>-{formatNGN(receipt.discount)}</span>
            </div>
          )}
          {Number(receipt?.tax) > 0 && (
            <div className="flex justify-between text-gray-500">
              <span>Tax</span><span>{formatNGN(receipt.tax)}</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-1.5 text-sm font-black" style={{ borderColor: secondary + '20' }}>
            <span>Total</span><span style={{ color: primary }}>{formatNGN(receipt?.total)}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Amount Paid</span><span>{formatNGN(receipt?.amountPaid)}</span>
          </div>
          {Number(receipt?.balanceDue) > 0 && (
            <div className="flex justify-between font-bold text-red-500">
              <span>Balance Due</span><span>{formatNGN(receipt.balanceDue)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Payment method + status */}
      <div className="flex flex-wrap items-center gap-2 px-5 pb-4 sm:px-8">
        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold text-gray-600">
          {receipt?.paymentMethod || 'Cash'}
        </span>
        <span
          className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold text-white"
          style={{ backgroundColor: receipt?.status === 'Pending' ? '#f59e0b' : receipt?.status === 'Partial' ? '#ef4444' : primary }}
        >
          {receipt?.status || 'Paid'}
        </span>
      </div>

      {/* Custom fields */}
      {Array.isArray(receipt?.customFields) && receipt.customFields.length > 0 && (
        <div className="space-y-1 border-t border-dashed border-gray-200 px-5 py-3 text-[11px] sm:px-8">
          {receipt.customFields.map((f, idx) => (
            f.label ? (
              <div key={idx} className="flex justify-between text-gray-500">
                <span>{f.label}</span><span className="font-semibold text-gray-700">{f.value}</span>
              </div>
            ) : null
          ))}
        </div>
      )}

      {/* Notes */}
      {receipt?.notes && (
        <div className="px-5 pb-4 text-[11px] leading-relaxed text-gray-500 sm:px-8">{receipt.notes}</div>
      )}

      {layout.showSignatureLine && (
        <div className="px-5 pb-4 sm:px-8">
          <div className="mt-4 w-40 border-t border-gray-300 pt-1 text-[10px] text-gray-400">Authorized Signature</div>
        </div>
      )}

      <div className="border-t border-gray-100 px-5 py-3 text-center text-[10px] text-gray-400 sm:px-8">
        {whiteLabel ? 'Thank you for your business.' : 'Thank you for your business · Generated via Sellapage'}
      </div>
    </div>
  )
})

export default ReceiptTemplateRenderer
