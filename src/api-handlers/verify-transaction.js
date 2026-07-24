import { getAdminDb } from './_lib/firebase-admin.js'

// Public, read-only lookup used by the storefront success modal (StorePage.jsx,
// ServiceStorePage.jsx) as a fallback when the client-side sessionStorage snapshot
// written before the Paystack redirect didn't survive the round trip (common in
// WhatsApp/Instagram/Facebook in-app browsers, which can spin up a fresh WebView
// on external redirects). Scoped to an exact storeId + paystackReference match —
// a Paystack reference is an unguessable per-transaction token, so this is safe
// to expose without auth, same trust model as the Paystack-hosted receipt page.
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { storeId, reference } = req.query
  if (!storeId || !reference) {
    return res.status(400).json({ error: 'Missing storeId or reference' })
  }

  try {
    const db = getAdminDb()
    const storeRef = db.collection('stores').doc(storeId)

    const orderSnap = await storeRef
      .collection('orders')
      .where('paystackReference', '==', reference)
      .limit(1)
      .get()

    if (!orderSnap.empty) {
      const doc = orderSnap.docs[0]
      const d = doc.data()
      return res.status(200).json({
        type: 'order',
        order: {
          id: doc.id,
          reference: d.paystackReference,
          customerName: d.customerName || '',
          customerEmail: d.customerEmail || '',
          cartItems: d.cartItems || [],
          items: d.items || '',
          deliveryFee: d.deliveryFee || 0,
          processingFee: d.processingFee || 0,
          grandTotal: d.grandTotal || 0,
          createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : null,
        },
      })
    }

    const bookingSnap = await storeRef
      .collection('bookings')
      .where('paystackReference', '==', reference)
      .limit(1)
      .get()

    if (!bookingSnap.empty) {
      const doc = bookingSnap.docs[0]
      const d = doc.data()
      return res.status(200).json({
        type: 'booking',
        booking: {
          id: doc.id,
          reference: d.paystackReference,
          paystackReference: d.paystackReference,
          customerName: d.customerName || '',
          customerEmail: d.customerEmail || '',
          serviceName: d.serviceName || '',
          bookingDate: d.bookingDate || '',
          bookingTime: d.bookingTime || '',
          locationPref: d.locationPref || '',
          servicePrice: d.servicePrice || 0,
          processingFee: d.processingFee || 0,
          grandTotal: d.grandTotal || 0,
          createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : null,
        },
      })
    }

    // Not found yet is expected right after redirect — the webhook may still be
    // in flight (Paystack fires it async, sometimes a second or two behind the
    // browser redirect). The frontend polls this endpoint briefly before giving up.
    return res.status(404).json({ error: 'Transaction not found yet' })
  } catch (err) {
    console.error('[verify-transaction] error', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
