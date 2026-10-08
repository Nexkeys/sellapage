// src/pages/VsLinktree.jsx
//
// Sellapage vs Linktree, on the shared compare layout (2026-10-08). Linktree
// is described by what it is built for (a page of links, with some selling
// add-ons), so the comparison stays true as it adds features.
import ComparePage from '../components/marketing/ComparePage'

const PAGE = {
  path: '/compare/vs-linktree',
  them: 'Linktree',
  themShort: 'Linktree',
  kind: 'links',
  title: ['Linktree shows links.', 'Sellapage runs the business behind them.'],
  intro: 'A page of links sends customers somewhere else to ask, pay and wait. Sellapage puts your products, prices, checkout, delivery and records behind one link, and runs the rest of the business from one dashboard.',
  rows: [
    ['One link for your bio', true, true],
    ['Click analytics', true, true],
    ['Every product with photos, prices and stock', 'Limited', true],
    ['Paystack checkout in naira (card, transfer, USSD)', false, true],
    ['Orders created when customers pay', false, true],
    ['Delivery booking and tracking', false, true],
    ['Bookings for services', 'Through other apps', true],
    ['Customer records, receipts and a sales ledger', false, true],
    ['Show up on Google with your products', false, true],
    ['Free to start', true, true],
  ],
  day: {
    them: 'A customer taps your bio link and sees a list: DM to order, price list, chat on WhatsApp. They tap one, ask how much, ask if it is available, then wait. Many leave before you reply, and nothing they did is recorded.',
    us: 'A customer taps your link and sees what you sell, with photos, prices and stock. They pay on the page, the order appears in your dashboard with a receipt, and you book delivery from the same screen.',
  },
  fit: {
    them: [
      'You mainly want to point people to your social profiles',
      'You share content more than you sell',
      'You do not need payments, delivery or records',
    ],
    us: [
      'You sell from your bio and want customers to buy without a DM',
      'You want orders, payments and customers in one place',
      'You sell products, services, or both',
    ],
  },
}

export default function VsLinktree() {
  return <ComparePage page={PAGE} />
}
