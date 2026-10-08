// src/pages/VsInstagramBio.jsx
//
// Sellapage vs selling from an Instagram bio, on the shared compare layout
// (2026-10-08). Instagram is described as where attention comes from; the
// comparison is about what happens after the customer is interested.
import ComparePage from '../components/marketing/ComparePage'

const PAGE = {
  path: '/compare/vs-instagram-bio',
  them: 'Instagram bio',
  themShort: 'Instagram',
  brand: 'instagram',
  kind: 'post',
  title: ['Instagram gets you noticed.', 'Sellapage gets you paid.'],
  intro: 'Selling from posts means "DM for price", comments asking the same question and sales lost in the inbox. Put your Sellapage link in your bio and every interested follower can see the price, pay and get a receipt.',
  alongside: 'Keep posting on Instagram. Put your Sellapage link in your bio so the attention turns into orders.',
  rows: [
    ['Photos, reels and stories', true, 'Works alongside'],
    ['Price and stock on every product, always', 'In captions', true],
    ['Everything you sell in one place to browse', 'Your grid', true],
    ['Checkout in naira (card, transfer, USSD)', false, true],
    ['Orders, receipts and customer records', false, true],
    ['Delivery booking and tracking', false, true],
    ['Found on Google, not only in the feed', false, true],
    ['Free to start', true, true],
  ],
  day: {
    them: 'You post a new item with "DM for price". The comments fill with "HM?" and "Price please", the DMs pile up, and by the time you reply some people have moved on. The post sinks in the feed by tomorrow.',
    us: 'You post the same item and point to the link in your bio. Followers tap it, see the price and stock, pay, and get a receipt. The order is in your dashboard, and the store is still there next week.',
  },
  fit: {
    them: [
      'You are building an audience and not selling yet',
      'You sell a handful of items to people who already know you',
    ],
    us: [
      'You sell on Instagram and lose sales in the DMs',
      'You want followers to buy without asking the price',
      'You want orders, payments and customers recorded',
    ],
  },
}

export default function VsInstagramBio() {
  return <ComparePage page={PAGE} />
}
