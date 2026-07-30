// src/components/receipts/ReceiptPDF.jsx
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { formatNGN } from '../../utils/receiptTemplates'

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 10, color: '#111827' },
  thermalPage: { padding: 14, fontSize: 8, color: '#111827' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  muted: { color: '#6b7280' },
  bold: { fontFamily: 'Helvetica-Bold' },
  band: { padding: 20, marginHorizontal: -36, marginTop: -36, marginBottom: 16 },
  bandText: { color: '#ffffff' },
  logo: { width: 44, height: 44, objectFit: 'contain', borderRadius: 6 },
  rule: { borderBottomWidth: 1, borderBottomColor: '#e5e7eb', marginVertical: 10 },
  dashedRule: { borderBottomWidth: 1, borderBottomColor: '#d1d5db', borderStyle: 'dashed', marginVertical: 8 },
  th: { fontFamily: 'Helvetica-Bold', fontSize: 8, color: '#6b7280' },
  td: { fontSize: 9 },
  totalsBox: { width: 200, marginLeft: 'auto', marginTop: 8 },
  badge: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#ffffff', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 10, alignSelf: 'flex-start' },
  stamp: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    transform: 'rotate(-14deg)',
    opacity: 0.75,
  },
  qr: { position: 'absolute', width: 60, height: 60 },
  footer: { marginTop: 20, textAlign: 'center', fontSize: 8, color: '#9ca3af' },
})

const POSITION_STYLE = {
  'top-left': { top: 20, left: 36 },
  'top-right': { top: 20, right: 36 },
  'bottom-left': { bottom: 20, left: 36 },
  'bottom-right': { bottom: 20, right: 36 },
  center: { top: '45%', left: '40%' },
}

function StatusColor(status) {
  if (status === 'Pending') return '#f59e0b'
  if (status === 'Partial') return '#ef4444'
  return null // caller supplies primary
}

export default function ReceiptPDF({
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
  whiteLabel,
}) {
  const layout = template?.layout || {}
  const primary = primaryColor || template?.defaultColors?.primary || '#22c55e'
  const secondary = secondaryColor || template?.defaultColors?.secondary || '#0f172a'
  const font = fontFamily || template?.defaultFont || 'Helvetica'
  const items = receipt?.items || []
  const isThermal = !!layout.thermal
  const size = isThermal ? { width: 227, height: 'auto' } : 'A4' // 227pt ≈ 80mm

  return (
    <Document>
      <Page size={size} style={[isThermal ? s.thermalPage : s.page, { fontFamily: font }]}>
        {stampType && (
          <View
            style={[
              s.stamp,
              POSITION_STYLE[stampPosition] || POSITION_STYLE['bottom-right'],
              { borderColor: stampColor || primary },
            ]}
          >
            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: stampColor || primary, textAlign: 'center' }}>
              {stampLabel || 'PAID'}
            </Text>
          </View>
        )}
        {stampType === 'uploaded' && stampUrl && (
          <Image src={stampUrl} style={[s.qr, { width: 90, height: 90 }, POSITION_STYLE[stampPosition] || POSITION_STYLE['bottom-right']]} />
        )}
        {qrCodeDataUrl && (
          <Image src={qrCodeDataUrl} style={[s.qr, POSITION_STYLE[qrCodePosition] || POSITION_STYLE['bottom-left']]} />
        )}

        {/* Header */}
        {layout.headerStyle === 'band' ? (
          <View style={[s.band, { backgroundColor: primary }]}>
            <View style={s.row}>
              <View>
                <Text style={[s.bandText, { fontSize: 15, fontFamily: 'Helvetica-Bold' }]}>{receipt?.vendorName || 'Your Business'}</Text>
                <Text style={[s.bandText, { fontSize: 8, marginTop: 2 }]}>{receipt?.vendorAddress}</Text>
              </View>
              {logoUrl && <Image src={logoUrl} style={s.logo} />}
            </View>
          </View>
        ) : layout.headerStyle === 'banner' ? (
          <View style={[s.band, { backgroundColor: primary, alignItems: 'center', paddingVertical: 28 }]}>
            {logoUrl && <Image src={logoUrl} style={[s.logo, { width: 56, height: 56, marginBottom: 8 }]} />}
            <Text style={[s.bandText, { fontSize: 17, fontFamily: 'Helvetica-Bold' }]}>{receipt?.vendorName || 'Your Business'}</Text>
            <Text style={[s.bandText, { fontSize: 8, marginTop: 2 }]}>{receipt?.vendorAddress}</Text>
          </View>
        ) : layout.headerStyle === 'twoColumn' ? (
          <View>
            <View style={s.row}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {logoUrl && <Image src={logoUrl} style={[s.logo, { marginRight: 8 }]} />}
                <View>
                  <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold' }}>{receipt?.vendorName || 'Your Business'}</Text>
                  <Text style={[s.muted, { fontSize: 8 }]}>{receipt?.vendorAddress}</Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[s.muted, { fontSize: 7 }]}>OFFICIAL RECEIPT</Text>
                <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: primary }}>{receipt?.receiptNumber}</Text>
              </View>
            </View>
            <View style={{ borderBottomWidth: 2, borderBottomColor: primary, marginTop: 10, marginBottom: 4 }} />
          </View>
        ) : layout.headerStyle === 'stacked' ? (
          <View style={{ alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#d1d5db', borderStyle: 'dashed', paddingBottom: 8, marginBottom: 8 }}>
            {logoUrl && <Image src={logoUrl} style={[s.logo, { width: 32, height: 32, marginBottom: 4 }]} />}
            <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold' }}>{(receipt?.vendorName || 'Your Business').toUpperCase()}</Text>
            <Text style={[s.muted, { fontSize: 7, marginTop: 1 }]}>{receipt?.vendorAddress}</Text>
          </View>
        ) : (
          // minimal / asymmetric — same simplified treatment in PDF
          <View>
            <View style={s.row}>
              <View>
                <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', color: layout.headerStyle === 'asymmetric' ? primary : '#111827' }}>{receipt?.vendorName || 'Your Business'}</Text>
                <Text style={[s.muted, { fontSize: 8, marginTop: 2 }]}>{receipt?.vendorAddress}</Text>
              </View>
              {logoUrl && <Image src={logoUrl} style={s.logo} />}
            </View>
            <View style={{ borderBottomWidth: 1, borderBottomColor: primary, marginTop: 10 }} />
          </View>
        )}

        {layout.headerStyle !== 'twoColumn' && (
          <View style={[s.row, { marginTop: 10 }]}>
            <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: primary }}>{receipt?.receiptNumber || 'RCP-DRAFT'}</Text>
            <Text style={[s.muted, { fontSize: 9 }]}>{formatDate(receipt?.date)}</Text>
          </View>
        )}

        {/* Bill to */}
        <View style={{ marginTop: 12 }}>
          <Text style={[s.muted, { fontSize: 7, fontFamily: 'Helvetica-Bold' }]}>RECEIVED FROM</Text>
          <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', marginTop: 2 }}>{receipt?.customerName || 'Customer Name'}</Text>
          {receipt?.customerPhone ? <Text style={[s.muted, { fontSize: 9 }]}>{receipt.customerPhone}</Text> : null}
          {receipt?.customerEmail ? <Text style={[s.muted, { fontSize: 9 }]}>{receipt.customerEmail}</Text> : null}
        </View>

        <View style={s.rule} />

        {/* Items */}
        <View style={[s.row, { marginBottom: 4 }]}>
          <Text style={[s.th, { width: '55%' }]}>ITEM</Text>
          <Text style={[s.th, { width: '15%', textAlign: 'center' }]}>QTY</Text>
          <Text style={[s.th, { width: '30%', textAlign: 'right' }]}>AMOUNT</Text>
        </View>
        {items.map((item, idx) => (
          <View key={idx} style={[s.row, { marginBottom: 4 }]}>
            <Text style={[s.td, { width: '55%' }]}>{item.label}</Text>
            <Text style={[s.td, { width: '15%', textAlign: 'center', color: '#6b7280' }]}>{item.qty}</Text>
            <Text style={[s.td, s.bold, { width: '30%', textAlign: 'right' }]}>{formatNGN(item.qty * item.unitPrice)}</Text>
          </View>
        ))}

        {/* Totals */}
        <View style={s.totalsBox}>
          <View style={s.row}><Text style={[s.muted, { fontSize: 9 }]}>Subtotal</Text><Text style={{ fontSize: 9 }}>{formatNGN(receipt?.subtotal)}</Text></View>
          {Number(receipt?.discount) > 0 && (
            <View style={s.row}><Text style={[s.muted, { fontSize: 9 }]}>Discount</Text><Text style={{ fontSize: 9 }}>-{formatNGN(receipt.discount)}</Text></View>
          )}
          {Number(receipt?.tax) > 0 && (
            <View style={s.row}><Text style={[s.muted, { fontSize: 9 }]}>Tax</Text><Text style={{ fontSize: 9 }}>{formatNGN(receipt.tax)}</Text></View>
          )}
          <View style={{ borderTopWidth: 1, borderTopColor: '#e5e7eb', marginTop: 4, paddingTop: 4 }}>
            <View style={s.row}>
              <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold' }}>Total</Text>
              <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: primary }}>{formatNGN(receipt?.total)}</Text>
            </View>
          </View>
          <View style={s.row}><Text style={[s.muted, { fontSize: 9 }]}>Amount Paid</Text><Text style={{ fontSize: 9 }}>{formatNGN(receipt?.amountPaid)}</Text></View>
          {Number(receipt?.balanceDue) > 0 && (
            <View style={s.row}><Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#ef4444' }}>Balance Due</Text><Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#ef4444' }}>{formatNGN(receipt.balanceDue)}</Text></View>
          )}
        </View>

        {/* Payment + status */}
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 12 }}>
          <Text style={[s.badge, { backgroundColor: '#6b7280' }]}>{receipt?.paymentMethod || 'Cash'}</Text>
          <Text style={[s.badge, { backgroundColor: StatusColor(receipt?.status) || primary }]}>{receipt?.status || 'Paid'}</Text>
        </View>

        {/* Custom fields */}
        {Array.isArray(receipt?.customFields) && receipt.customFields.filter((f) => f.label).length > 0 && (
          <View style={s.dashedRule}>
            {receipt.customFields.filter((f) => f.label).map((f, idx) => (
              <View key={idx} style={[s.row, { marginTop: 4 }]}>
                <Text style={[s.muted, { fontSize: 8 }]}>{f.label}</Text>
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold' }}>{f.value}</Text>
              </View>
            ))}
          </View>
        )}

        {receipt?.notes ? <Text style={[s.muted, { fontSize: 8, marginTop: 10, lineHeight: 1.4 }]}>{receipt.notes}</Text> : null}

        {layout.showSignatureLine && (
          <View style={{ marginTop: 30, width: 140 }}>
            <View style={{ borderTopWidth: 1, borderTopColor: '#9ca3af' }} />
            <Text style={[s.muted, { fontSize: 7, marginTop: 3 }]}>Authorized Signature</Text>
          </View>
        )}

        <Text style={s.footer}>{whiteLabel ? 'Thank you for your business.' : 'Thank you for your business · Generated via Sellapage'}</Text>
      </Page>
    </Document>
  )
}
