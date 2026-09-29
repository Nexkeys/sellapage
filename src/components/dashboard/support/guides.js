// src/components/dashboard/support/guides.js
//
// The built-in help guide for the Support tab. Every step here describes what
// the dashboard actually does today; when a feature changes, change its guide
// too. `tab` is the dashboard tab a step can jump to.

export const QUICK_TOPICS = [
  { id: 'payments', title: 'Payment Issues', sub: 'Failed payments, missing transactions', icon: 'shield' },
  { id: 'orders', title: 'Orders', sub: 'Order status, fulfilment, tracking', icon: 'cart' },
  { id: 'setup', title: 'Store Setup', sub: 'Logo, cover, themes, domain', icon: 'store' },
  { id: 'delivery', title: 'Delivery', sub: 'Zones, rates, booking riders', icon: 'truck' },
  { id: 'products', title: 'Products', sub: 'Listings, stock, photos', icon: 'box' },
  { id: 'billing', title: 'Billing & Plans', sub: 'Upgrades, renewals, receipts', icon: 'card' },
]

export const GUIDES = {
  payments: {
    title: 'Payment issues',
    steps: [
      { t: 'In-app checkout is on Pro and Premium', d: 'Customers pay by card, transfer or USSD through Paystack, and an order is created for you automatically once the payment lands.', tab: 'billing', cta: 'See plans' },
      { t: 'A customer paid but you can’t see the order', d: 'Open Orders and refresh. Paystack can take a few minutes to confirm. If it is still missing after 15 minutes, send us the Paystack reference from the customer’s receipt.', tab: 'orders', cta: 'Open Orders' },
      { t: 'Who pays the checkout fee', d: 'The customer. Sellapage adds 1.5% + ₦100 (never more than ₦2,000) on top of your price, so you receive your full price.' },
      { t: 'Where your money goes', d: 'Add your bank in Payouts. Paystack settles your sales straight to that account.', tab: 'payouts', cta: 'Open Payouts' },
    ],
  },
  orders: {
    title: 'Orders & fulfilment',
    steps: [
      { t: 'Every paid checkout becomes an order', d: 'You will find it in Orders with the customer’s name, items, options and delivery address.', tab: 'orders', cta: 'Open Orders' },
      { t: 'Keep customers in the loop', d: 'Change an order’s status as you pack and ship it. Customers can follow along on your store’s tracking page.' },
      { t: 'Sold on WhatsApp or in person?', d: 'Record it in the Ledger so every sale, paid or owed, is in one place.', tab: 'ledger', cta: 'Open Ledger' },
      { t: 'Send a receipt', d: 'Make a branded receipt in Receipts, then download it or send it to your customer.', tab: 'receipts', cta: 'Open Receipts' },
    ],
  },
  setup: {
    title: 'Store setup',
    steps: [
      { t: 'Add your logo and cover', d: 'Both are free on every plan. They show on your store, your receipts and every link you share.', tab: 'online-store', cta: 'Open Business Page' },
      { t: 'Pick a look', d: 'Growth lets you choose your colour and layout. Pro and Premium add ready-made themes and full colour control.', tab: 'online-store', cta: 'Theme & Design' },
      { t: 'Use your own domain', d: 'On Pro and Premium you can connect yourbrand.com instead of a Sellapage link.', tab: 'custom-domain', cta: 'Custom Domain' },
      { t: 'Print your QR code', d: 'Generate it once on the Business Page and it stays saved. There is a ready-made "Scan to shop" poster too.', tab: 'online-store', cta: 'Get my QR code' },
    ],
  },
  delivery: {
    title: 'Delivery',
    steps: [
      { t: 'Set your pickup address and zones', d: 'On Pro and Premium, add where orders leave from in Delivery, with your own prices for the areas you cover.', tab: 'delivery', cta: 'Open Delivery' },
      { t: 'Live courier rates', d: 'On Pro and Premium, Sendbox and Topship rates show at checkout and you can book a rider from an order.' },
      { t: 'Track a shipment', d: 'Booked shipments show their tracking status on the order.' },
    ],
  },
  products: {
    title: 'Products',
    steps: [
      { t: 'Add a product', d: 'A name and a price are all you need. A clear photo and a short description help it sell.', tab: 'products', cta: 'Add a product' },
      { t: 'Sizes, colours and extras', d: 'Use Options & extras on the product form. Extras can carry their own price and stock.' },
      { t: 'Stock', d: 'Switch on Track inventory and the count goes down with every paid order. You get an alert when it runs low.' },
      { t: 'Photos per listing', d: 'Starter allows 3, Growth 10, Pro and Premium 50.' },
      { t: 'Hide without deleting', d: 'On Growth and up you can hide a listing from your store and bring it back later.', tab: 'products', cta: 'Open Products' },
    ],
  },
  billing: {
    title: 'Billing & plans',
    steps: [
      { t: 'Plans', d: 'Growth is ₦5,000, Pro ₦12,000 and Premium ₦25,000 a month. Longer periods cost less per month.', tab: 'billing', cta: 'Compare plans' },
      { t: 'Renew early, lose nothing', d: 'Paying before your plan ends adds the new time on top of the days you have left.' },
      { t: 'No surprise charges', d: 'Plans never renew by themselves. You pay only when you choose to.' },
      { t: 'If a plan ends', d: 'You get a 2-day grace period, then your store moves to the free plan. Everything you set up is kept for when you come back.' },
      { t: 'Receipts', d: 'Every payment is in Billing History with a receipt you can print or save.', tab: 'billing', cta: 'Billing History' },
    ],
  },
  start: {
    title: 'Getting started',
    steps: [
      { t: 'Add your first product or service', d: 'It takes about a minute, and your store is ready to share straight away.', tab: 'products', cta: 'Add a product' },
      { t: 'Dress up your Business Page', d: 'Logo, cover and colours make your store look like a brand people can trust.', tab: 'online-store', cta: 'Business Page' },
      { t: 'Share your link', d: 'Put it on your WhatsApp status, your Instagram bio and in every customer chat.' },
      { t: 'Earn while you sell', d: 'Invite other business owners with your referral link and earn when they upgrade.', tab: 'referral-program', cta: 'Referral Program' },
    ],
  },
  account: {
    title: 'Account & security',
    steps: [
      { t: 'New device, new code', d: 'When you sign in from a device we don’t recognise, we email you a 6-digit code first. Nobody at Sellapage will ever ask you for it.' },
      { t: 'Too many wrong passwords', d: 'Your account locks to protect you. Use account recovery to get back in.' },
      { t: 'Give your team access', d: 'On Premium, add staff with their own login and only the tabs they need.', tab: 'team', cta: 'Open Team' },
      { t: 'Business details', d: 'Your name, WhatsApp number and email live in Settings.', tab: 'settings', cta: 'Open Settings' },
    ],
  },
}

export const GUIDE_LIST = [
  { id: 'start', title: 'Getting Started', sub: 'Set up your store and start selling' },
  { id: 'orders', title: 'Orders & Fulfilment', sub: 'Manage orders and delivery' },
  { id: 'payments', title: 'Payments & Payouts', sub: 'Paystack, transactions, settlement' },
  { id: 'setup', title: 'Store Customization', sub: 'Themes, domains, branding' },
  { id: 'account', title: 'Account & Security', sub: 'Sign-in codes, recovery, team' },
]

/** Every step, flattened, for the search box. */
export const SEARCH_INDEX = Object.entries(GUIDES).flatMap(([gid, g]) =>
  g.steps.map((s, i) => ({ id: `${gid}-${i}`, guide: gid, guideTitle: g.title, ...s, hay: `${g.title} ${s.t} ${s.d}`.toLowerCase() })),
)
