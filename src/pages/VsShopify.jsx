// src/pages/VsShopify.jsx
//
// Sellapage vs Shopify, on the shared compare layout (2026-10-08).
// Shopify facts used here were checked on shopify.com/pricing in October 2026:
// a short trial rather than a free plan, plans billed in US dollars, and a
// fee on each sale taken through a third-party provider (2% on Basic). No
// dollar price is quoted, because it varies by country and changes often.
import ComparePage from '../components/marketing/ComparePage'

const PAGE = {
  path: '/compare/vs-shopify',
  them: 'Shopify',
  themShort: 'Shopify',
  kind: 'setup',
  title: ['Shopify is built for global brands.', 'Sellapage is built for your business, here.'],
  intro: 'Shopify is powerful and made for companies with a budget in dollars and someone to set it up. Sellapage gives a Nigerian business everything it needs to sell, get paid, deliver and grow, priced in naira, ready the same day.',
  rows: [
    ['Free plan you can stay on', 'Short trial', true],
    ['Priced in naira', false, true],
    ['Platform fee on each sale paid with Paystack', '2% on Basic', 'None'],
    ['Paystack checkout (card, transfer, USSD)', 'Through an app', 'Built in'],
    ['Sendbox and Topship delivery', 'Through apps', 'Built in'],
    ['Bookings for services', 'Through apps', 'Built in'],
    ['Online store, orders, customers and reviews', true, true],
    ['Discount codes and analytics', true, true],
    ['AI assistant for your business', true, true],
    ['Large app and theme marketplace', true, 'Essentials built in'],
    ['Selling in many currencies at scale', true, 'Naira first'],
  ],
  day: {
    them: 'You sign up and start a checklist: choose and set up a theme, buy and connect a domain, find apps for Paystack and for local delivery, set shipping zones. The plan bills in dollars, and each Paystack sale carries an extra fee on the Basic plan.',
    us: 'You sign up with your phone number, add your products with photos and prices, and share your link the same day. Paystack checkout, delivery, receipts and customer records are already there. Sellapage takes no cut of your sales.',
  },
  fit: {
    them: [
      'You sell internationally in many currencies',
      'You have a budget in dollars for the plan and apps',
      'You have a developer or agency to set things up',
      'You need a very large app and theme marketplace',
    ],
    us: [
      'You run a Nigerian business and want to start today',
      'You want naira pricing and no cut of your sales',
      'You sell products, services, or both, from one dashboard',
      'You want payments, delivery and records built in, not bolted on',
    ],
  },
}

export default function VsShopify() {
  return <ComparePage page={PAGE} />
}
