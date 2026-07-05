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
  return `₦${Number(amount || 0).toLocaleString('en-NG')}`
}

function formatDate(date) {
  const d = date ? new Date(date) : new Date()
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function ReceiptDocument({ order, store }) {
  const items = order.cartItems || order.items || []

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {store.logoUrl ? (
          <Image src={store.logoUrl} style={styles.logo} />
        ) : null}

        <Text style={styles.heading}>{store.businessName}</Text>
        <Text style={styles.subtitle}>Order Receipt</Text>

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
          <Text>{order.reference || order.id || '—'}</Text>
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

        <Text style={styles.footer}>
          Thank you for shopping{'\n'}
          WhatsApp: {store.whatsappNumber || '—'}
        </Text>
      </Page>
    </Document>
  )
}

export async function generateOrderReceipt(order, store) {
  const blob = await pdf(<ReceiptDocument order={order} store={store} />).toBlob()
  return URL.createObjectURL(blob)
}
