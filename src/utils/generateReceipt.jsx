//src/utils/generateReceipt.jsx/
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  pdf,
} from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
    color: '#111827',
  },
  logo: {
    width: 64,
    height: 64,
    objectFit: 'contain',
    marginBottom: 12,
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
  },
  rule: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginVertical: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    color: '#6b7280',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 6,
    marginBottom: 6,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  colName: { flex: 3 },
  colQty: { flex: 1, textAlign: 'center' },
  colPrice: { flex: 2, textAlign: 'right' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    fontWeight: 'bold',
    fontSize: 13,
  },
  footer: {
    marginTop: 24,
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 10,
  },
})

function formatNaira(amount) {
  return `NGN ${Number(amount || 0).toLocaleString('en-NG')}`
}

function formatDate(date) {
  if (!date) return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  const d = date?.toDate ? date.toDate() : new Date(date)
  if (isNaN(d.getTime())) return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function ReceiptHeader({ store, subtitle }) {
  return (
    <>
      {store.logoUrl ? (
        <Image src={store.logoUrl} style={styles.logo} />
      ) : null}

      <Text style={styles.heading}>{store.businessName}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </>
  )
}

function ReceiptFooter({ store }) {
  return (
    <Text style={styles.footer}>
      Thank you for shopping{'\n'}
      WhatsApp: {store.whatsappNumber || '-'}
    </Text>
  )
}

function ReceiptDocument({ order, store }) {
  const items = order.cartItems || order.items || []

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <ReceiptHeader store={store} subtitle="Order Receipt" />

        <View style={styles.rule} />

        <View style={styles.row}>
          <Text style={styles.label}>Customer</Text>
          <Text>{order.customerName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Email</Text>
          <Text>{order.customerEmail}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Order ID</Text>
          <Text>{order.reference || order.id || '-'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Date</Text>
          <Text>{formatDate(order.createdAt)}</Text>
        </View>

        <View style={[styles.rule, { marginTop: 16 }]} />

        <View style={styles.tableHeader}>
          <Text style={styles.colName}>Item</Text>
          <Text style={styles.colQty}>Qty</Text>
          <Text style={styles.colPrice}>Amount</Text>
        </View>

        {items.map((item, idx) => (
          <View key={item.id || idx} style={styles.tableRow}>
            <Text style={styles.colName}>{item.name}</Text>
            <Text style={styles.colQty}>{item.quantity}</Text>
            <Text style={styles.colPrice}>
              {formatNaira(Number(item.price) * Number(item.quantity))}
            </Text>
          </View>
        ))}

        <View style={styles.row}>
          <Text style={styles.label}>Delivery fee</Text>
          <Text>{formatNaira(order.deliveryFee)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Processing fee</Text>
          <Text>{formatNaira(order.processingFee)}</Text>
        </View>

        <View style={styles.totalRow}>
          <Text>Grand total</Text>
          <Text>{formatNaira(order.grandTotal)}</Text>
        </View>

        <ReceiptFooter store={store} />
      </Page>
    </Document>
  )
}

function BookingReceiptDocument({ booking, store }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <ReceiptHeader store={store} subtitle="Booking Receipt" />

        <View style={styles.rule} />

        <View style={styles.row}>
          <Text style={styles.label}>Customer</Text>
          <Text>{booking.customerName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Email</Text>
          <Text>{booking.customerEmail}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Booking ID</Text>
          <Text>{booking.paystackReference || booking.reference || booking.id || '-'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Date</Text>
          <Text>{formatDate(booking.createdAt)}</Text>
        </View>

        <View style={[styles.rule, { marginTop: 16 }]} />

        <View style={styles.row}>
          <Text style={styles.label}>Service</Text>
          <Text>{booking.serviceName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Scheduled for</Text>
          <Text>{booking.bookingDate} {booking.bookingTime}</Text>
        </View>
        {booking.locationPref ? (
          <View style={styles.row}>
            <Text style={styles.label}>Location</Text>
            <Text>{booking.locationPref}</Text>
          </View>
        ) : null}

        <View style={[styles.rule, { marginTop: 16 }]} />

        <View style={styles.row}>
          <Text style={styles.label}>Service fee</Text>
          <Text>{formatNaira(booking.servicePrice)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Processing fee</Text>
          <Text>{formatNaira(booking.processingFee)}</Text>
        </View>

        <View style={styles.totalRow}>
          <Text>Grand total</Text>
          <Text>{formatNaira(booking.grandTotal)}</Text>
        </View>

        <ReceiptFooter store={store} />
      </Page>
    </Document>
  )
}

export async function generateOrderReceipt(order, store) {
  const blob = await pdf(<ReceiptDocument order={order} store={store} />).toBlob()
  return URL.createObjectURL(blob)
}

export async function generateBookingReceipt(booking, store) {
  const blob = await pdf(<BookingReceiptDocument booking={booking} store={store} />).toBlob()
  return URL.createObjectURL(blob)
}
