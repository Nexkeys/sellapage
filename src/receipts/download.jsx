// src/receipts/download.jsx
//
// Turns receipts (receiptModel.js) into a PDF. The PDF engine (about 476 kB
// gzipped) and the QR code maker load only when someone asks for a receipt.
export async function receiptBlob(receipts) {
  const list = Array.isArray(receipts) ? receipts : [receipts]
  const [{ pdf }, { ReceiptDocument }, QR] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./ReceiptPdf'),
    import('qrcode'),
  ])
  const qrs = await Promise.all(list.map((r) => (r.qr?.url
    ? QR.toDataURL(r.qr.url, { margin: 0, width: 240, color: { dark: '#034e22', light: '#ffffff' } }).catch(() => null)
    : null)))
  return pdf(<ReceiptDocument receipts={list} qrs={qrs} />).toBlob()
}

export async function receiptUrl(receipts) {
  return URL.createObjectURL(await receiptBlob(receipts))
}

/** Builds the PDF and saves it with the receipt's own file name. */
export async function downloadReceipt(receipts, filename) {
  const list = Array.isArray(receipts) ? receipts : [receipts]
  const url = await receiptUrl(list)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || list[0]?.filename || 'receipt.pdf'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30000)
}
