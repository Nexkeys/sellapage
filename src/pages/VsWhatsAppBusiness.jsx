// src/pages/VsWhatsAppBusiness.jsx
//
// Sellapage vs WhatsApp Business, on the shared compare layout (2026-10-08).
// The old page said a WhatsApp catalogue cannot show prices or be shared by
// link; both are wrong (catalogues have photos, prices and a share link), so
// the comparison now rests on what WhatsApp does not do: take payment, record
// orders and customers, book delivery, or be found on Google.
import ComparePage from '../components/marketing/ComparePage'

const PAGE = {
  path: '/compare/vs-whatsapp-business',
  them: 'WhatsApp Business',
  themShort: 'WhatsApp',
  brand: 'whatsapp',
  kind: 'chat',
  title: ['WhatsApp is where you chat.', 'Sellapage is where the business runs.'],
  intro: 'Keep WhatsApp for conversations. Sellapage handles everything around them: a store that takes payment, orders that record themselves, delivery, receipts and customer records, all in one dashboard.',
  alongside: 'You do not have to choose. Keep WhatsApp for chatting, and send customers your Sellapage link when they are ready to buy.',
  rows: [
    ['Chat with customers, quick replies', true, 'Works alongside'],
    ['Product catalogue with photos and prices', true, true],
    ['A store that opens in any browser', false, true],
    ['Customers pay on the page (card, transfer, USSD)', false, true],
    ['Orders created when customers pay', false, true],
    ['A receipt for every paid order', false, true],
    ['Delivery booking and tracking', false, true],
    ['Customer records with spend and history', 'Labels only', true],
    ['Sales analytics', 'Message stats', true],
    ['Show up on Google', false, true],
    ['Free to start', true, true],
  ],
  day: {
    them: 'How much? Is it available? Send account details. I have paid, please confirm. Every sale is a long chat, every payment is a bank alert you match by hand, and at the end of the month nobody knows exactly what sold.',
    us: 'You send your Sellapage link. The customer picks, pays by card, transfer or USSD, and gets a receipt. The order lands in your dashboard, ready to deliver, and your sales and customers are recorded for you.',
  },
  fit: {
    them: [
      'You mostly talk to customers you already know',
      'You sell a few items and confirm payments by hand',
      'You do not need records, delivery or a store page',
    ],
    us: [
      'You want customers to pay without the back and forth',
      'You want every order, payment and customer recorded',
      'You want new customers to find you on Google, not only your contacts',
    ],
  },
}

export default function VsWhatsAppBusiness() {
  return <ComparePage page={PAGE} />
}
