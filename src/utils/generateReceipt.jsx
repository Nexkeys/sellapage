// src/utils/generateReceipt.jsx
//
// Customer receipts for storefront orders and bookings, used at checkout
// (StorePage, ServiceStorePage) and in the vendor's Orders and Bookings tabs.
// Same signatures as before: each returns an object URL for the PDF.
// The design and the data shape live in src/receipts (one design for every
// receipt Sellapage produces).
//
// The receipt prints the order or booking id, the only value the tracking
// page accepts (its QR code opens tracking straight on it), and the Paystack
// reference on its own line, which is what a bank recognises in a dispute.
// When the id is not written yet (a download in the first seconds after
// payment), it says "Sent to your email" rather than a bare dash.
import { orderReceipt, bookingReceipt } from '../receipts/receiptModel'
import { receiptUrl } from '../receipts/download'

export async function generateOrderReceipt(order, store) {
  return receiptUrl(orderReceipt(order, store))
}

export async function generateBookingReceipt(booking, store) {
  return receiptUrl(bookingReceipt(booking, store))
}
